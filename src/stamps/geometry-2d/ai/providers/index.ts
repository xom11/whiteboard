// src/stamps/geometry-2d/ai/providers/index.ts
//
// Public exports + selectProvider() factory dựa trên env hoặc explicit opts.
//
// Quy tắc chọn provider (high → low priority):
//   1. opts.provider — instance đã build sẵn (test/custom)
//   2. opts.apiKey   — auto-route Anthropic (backward-compat caller cũ)
//   3. env WHITEBOARD_AI_PROVIDER
//      - "anthropic": cần env ANTHROPIC_API_KEY
//      - "ollama" (default): không cần key, đọc OLLAMA_BASE_URL tùy chọn

import { AnthropicProvider } from './anthropic';
import { OllamaProvider } from './ollama';
import type { AIProvider } from './types';

export type { AIProvider, ProviderOutput, ProviderRequest, ProviderTokenUsage } from './types';
export { AnthropicProvider } from './anthropic';
export { OllamaProvider } from './ollama';

export interface SelectProviderOptions {
  /** Provider instance dùng trực tiếp (override mọi env). */
  provider?: AIProvider;
  /** Anthropic API key. Khi truyền → auto chọn AnthropicProvider. */
  apiKey?: string;
  /** Anthropic prompt-caching, default true (chỉ áp dụng provider Anthropic). */
  enableCaching?: boolean;
  /** Ollama endpoint override. */
  ollamaBaseUrl?: string;
  /** Ollama model override (vd "gemma3:1b"). */
  ollamaDefaultModel?: string;
  /** Test env: env vars getter (default process.env). */
  env?: Record<string, string | undefined>;
}

export function selectProvider(opts: SelectProviderOptions = {}): AIProvider {
  if (opts.provider) return opts.provider;
  if (opts.apiKey) {
    return new AnthropicProvider({
      apiKey: opts.apiKey,
      enableCaching: opts.enableCaching,
    });
  }

  const env = opts.env ?? readEnv();
  const wanted = (env.WHITEBOARD_AI_PROVIDER ?? 'ollama').toLowerCase();

  if (wanted === 'anthropic') {
    const key = env.ANTHROPIC_API_KEY;
    if (!key) {
      throw new Error(
        'selectProvider: WHITEBOARD_AI_PROVIDER=anthropic nhưng thiếu env ANTHROPIC_API_KEY',
      );
    }
    return new AnthropicProvider({ apiKey: key, enableCaching: opts.enableCaching });
  }

  if (wanted === 'ollama') {
    return new OllamaProvider({
      baseUrl: opts.ollamaBaseUrl ?? env.OLLAMA_BASE_URL,
      defaultModel: opts.ollamaDefaultModel ?? env.OLLAMA_DEFAULT_MODEL,
    });
  }

  throw new Error(`selectProvider: WHITEBOARD_AI_PROVIDER="${wanted}" không hợp lệ (anthropic|ollama)`);
}

function readEnv(): Record<string, string | undefined> {
  // process.env không tồn tại ở pure browser; ở Node/Next.js server route thì OK.
  if (typeof process !== 'undefined' && process.env) {
    return process.env as Record<string, string | undefined>;
  }
  return {};
}
