// src/stamps/geometry-2d/ai/providers/index.ts
//
// Public exports + selectProvider() factory dựa trên env hoặc explicit opts.
//
// Quy tắc chọn provider (high → low priority):
//   1. opts.provider — instance đã build sẵn (test/custom)
//   2. opts.ollamaBaseUrl / env OLLAMA_BASE_URL — local Ollama
//   3. env WHITEBOARD_AI_PROVIDER="ollama" (default)

import { OllamaProvider } from './ollama';
import type { AIProvider } from './types';

export type { AIProvider, ProviderOutput, ProviderRequest, ProviderTokenUsage } from './types';
export { OllamaProvider } from './ollama';

export interface SelectProviderOptions {
  /** Provider instance dùng trực tiếp (override mọi env). */
  provider?: AIProvider;
  /** Ollama endpoint override. */
  ollamaBaseUrl?: string;
  /** Ollama model override (vd "gemma3:1b"). */
  ollamaDefaultModel?: string;
  /** Test env: env vars getter (default process.env). */
  env?: Record<string, string | undefined>;
}

export function selectProvider(opts: SelectProviderOptions = {}): AIProvider {
  if (opts.provider) return opts.provider;

  const env = opts.env ?? readEnv();

  return new OllamaProvider({
    baseUrl: opts.ollamaBaseUrl ?? env.OLLAMA_BASE_URL,
    defaultModel: opts.ollamaDefaultModel ?? env.OLLAMA_DEFAULT_MODEL,
  });
}

function readEnv(): Record<string, string | undefined> {
  // process.env không tồn tại ở pure browser; ở Node/Next.js server route thì OK.
  if (typeof process !== 'undefined' && process.env) {
    return process.env as Record<string, string | undefined>;
  }
  return {};
}
