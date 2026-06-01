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
      // Ollama v0.5+ structured outputs: model bị constrain emit JSON đúng schema.
      format: req.schema,
      stream: false,
      options: {
        // num_predict ≈ max_tokens
        num_predict: req.maxTokens,
        // temperature thấp cho output deterministic hơn (DSL cần consistent).
        temperature: 0.2,
      },
    };

    let resp: Response;
    let doFetch: typeof fetch;
    try {
      doFetch = this.resolveFetch();
    } catch (e) {
      const err = e as { message?: string };
      return { kind: 'error', message: err.message ?? 'fetch không khả dụng' };
    }
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

    if (!resp.ok) {
      let detail = '';
      try {
        detail = await resp.text();
      } catch {
        /* ignore */
      }
      return {
        kind: 'error',
        message: `Ollama HTTP ${resp.status}: ${detail || resp.statusText}`,
        status: resp.status,
      };
    }

    let json: OllamaChatResponse;
    try {
      json = (await resp.json()) as OllamaChatResponse;
    } catch (e) {
      const err = e as { message?: string };
      return { kind: 'error', message: 'Ollama response không phải JSON: ' + (err.message ?? '?') };
    }

    const content = json.message?.content?.trim();
    if (!content) {
      return { kind: 'error', message: 'Ollama trả message.content rỗng' };
    }

    let data: unknown;
    try {
      data = JSON.parse(content);
    } catch (e) {
      const err = e as { message?: string };
      return {
        kind: 'error',
        message: 'Ollama content không parse được JSON: ' + (err.message ?? '?'),
      };
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
