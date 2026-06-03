// src/stamps/geometry-2d/ai/providers/ollama.ts
//
// AIProvider impl cho Ollama local. Dùng /api/chat với `format: <jsonSchema>`
// (Ollama v0.5+ — structured outputs). Model emit JSON đúng schema, parse +
// trả về envelope.
//
// Setup local:
//   $ ollama pull gemma3:4b      # ~3.3GB Q4
//   $ ollama serve               # mặc định port 11434
//
// Override base URL qua env `OLLAMA_BASE_URL` (test env / remote ollama).

import type {
  AIProvider,
  ProviderOutput,
  ProviderRequest,
  ProviderTokenUsage,
  VisionRequest,
} from './types';

const DEFAULT_BASE_URL = 'http://localhost:11434';
const DEFAULT_MODEL = 'gemma3:4b';

export interface OllamaProviderOptions {
  /** Endpoint base URL, default http://localhost:11434. */
  baseUrl?: string;
  /** Default model id nếu request không truyền. */
  defaultModel?: string;
  /** Custom fetch impl (dùng cho test mock). */
  fetchImpl?: typeof fetch;
}

interface OllamaChatResponse {
  model: string;
  message: { role: 'assistant'; content: string };
  done: boolean;
  prompt_eval_count?: number;
  eval_count?: number;
  total_duration?: number;
}

export class OllamaProvider implements AIProvider {
  readonly name = 'ollama';
  readonly defaultModel: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch | null;

  constructor(opts: OllamaProviderOptions = {}) {
    this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
    this.defaultModel = opts.defaultModel ?? DEFAULT_MODEL;
    // Lazy resolve: jsdom test env không có global fetch; consumer chỉ cần
    // fetch ở runtime khi gọi .call(). Custom impl ưu tiên (test mock).
    this.fetchImpl = opts.fetchImpl ?? null;
  }

  private resolveFetch(): typeof fetch {
    if (this.fetchImpl) return this.fetchImpl;
    if (typeof fetch === 'undefined') {
      throw new Error(
        'OllamaProvider: global `fetch` không khả dụng. Truyền `fetchImpl` qua constructor hoặc chạy ở Node 18+ / browser.',
      );
    }
    return fetch;
  }

  async call(req: ProviderRequest): Promise<ProviderOutput> {
    const body = {
      model: req.model,
      messages: [
        { role: 'system', content: req.systemPrompt },
        { role: 'user', content: req.userPrompt },
      ],
      format: req.schema,
      stream: true,
      options: { num_predict: req.maxTokens, temperature: 0.2 },
    };

    let doFetch: typeof fetch;
    try {
      doFetch = this.resolveFetch();
    } catch (e) {
      const err = e as { message?: string };
      return { kind: 'error', message: err.message ?? 'fetch không khả dụng' };
    }

    let resp: Response;
    try {
      resp = await doFetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: req.signal,
      });
    } catch (e) {
      const err = e as { message?: string };
      return {
        kind: 'error',
        message: err.message ?? `Không kết nối được Ollama ở ${this.baseUrl}`,
      };
    }

    if (!resp.ok || !resp.body) {
      let detail = '';
      try { detail = await resp.text(); } catch { /* ignore */ }
      return {
        kind: 'error',
        message: `Ollama HTTP ${resp.status}: ${detail || resp.statusText}`,
        status: resp.status,
      };
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let content = '';
    let promptEvalCount = 0;
    let evalCount = 0;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl;
      while ((nl = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line) continue;
        try {
          const chunk = JSON.parse(line) as {
            message?: { content?: string };
            done?: boolean;
            prompt_eval_count?: number;
            eval_count?: number;
          };
          if (chunk.message?.content) {
            content += chunk.message.content;
            if (req.onToken) {
              try { req.onToken(chunk.message.content); } catch { /* swallow */ }
            }
          }
          if (chunk.done) {
            promptEvalCount = chunk.prompt_eval_count ?? promptEvalCount;
            evalCount = chunk.eval_count ?? evalCount;
          }
        } catch { /* skip malformed line */ }
      }
    }

    const trimmed = content.trim();
    if (!trimmed) return { kind: 'error', message: 'Ollama trả message.content rỗng' };

    let data: unknown;
    try {
      data = JSON.parse(trimmed);
    } catch (e) {
      const err = e as { message?: string };
      return {
        kind: 'error',
        message: 'Ollama content không parse được JSON: ' + (err.message ?? '?'),
      };
    }

    return {
      kind: 'json',
      data,
      usage: {
        inputTokens: promptEvalCount,
        outputTokens: evalCount,
        cacheReadTokens: 0,
        cacheCreationTokens: 0,
      },
    };
  }

  // Vision: gửi ảnh qua images[] field trong message (Ollama multimodal API).
  // Model cần hỗ trợ vision (gemma3, llava, ...). Output vẫn là JSON envelope.
  async extractText(req: VisionRequest): Promise<ProviderOutput> {
    const model = req.model ?? this.defaultModel;
    const body = {
      model,
      messages: [
        { role: 'system', content: req.systemPrompt },
        {
          role: 'user',
          content: req.userPrompt,
          images: req.images.map((i) => i.base64),
        },
      ],
      format: req.schema,
      stream: false,
      options: { num_predict: req.maxTokens, temperature: 0.2 },
    };

    let doFetch: typeof fetch;
    try {
      doFetch = this.resolveFetch();
    } catch (e) {
      return { kind: 'error', message: (e as { message?: string }).message ?? 'fetch không khả dụng' };
    }

    let resp: Response;
    try {
      resp = await doFetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: req.signal,
      });
    } catch (e) {
      return {
        kind: 'error',
        message: (e as { message?: string }).message ?? `Không kết nối được Ollama ở ${this.baseUrl}`,
      };
    }

    if (!resp.ok) {
      let detail = '';
      try { detail = await resp.text(); } catch { /* ignore */ }
      return {
        kind: 'error',
        message: `Ollama Vision HTTP ${resp.status}: ${detail || resp.statusText}`,
        status: resp.status,
      };
    }

    let json: OllamaChatResponse;
    try {
      json = (await resp.json()) as OllamaChatResponse;
    } catch (e) {
      return { kind: 'error', message: 'Ollama vision response không phải JSON: ' + ((e as { message?: string }).message ?? '?') };
    }

    const content = json.message?.content?.trim();
    if (!content) return { kind: 'error', message: 'Ollama vision trả content rỗng' };

    let data: unknown;
    try {
      data = JSON.parse(content);
    } catch (e) {
      return { kind: 'error', message: 'Ollama vision content không parse JSON: ' + ((e as { message?: string }).message ?? '?') };
    }

    const usage: ProviderTokenUsage = {
      inputTokens: json.prompt_eval_count ?? 0,
      outputTokens: json.eval_count ?? 0,
      cacheReadTokens: 0,
      cacheCreationTokens: 0,
    };
    return { kind: 'json', data, usage };
  }
}
