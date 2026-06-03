// src/stamps/geometry-2d/ai/providers/index.ts
//
// Public exports + selectProvider() factory dựa trên env hoặc explicit opts.
//
// Quy tắc chọn provider (high → low priority):
//   1. opts.provider — instance đã build sẵn (test/custom)
//   2. opts.apiKey   — auto-route Anthropic (backward-compat caller cũ)
//   3. env WHITEBOARD_AI_PROVIDER
//      - "anthropic": cần env ANTHROPIC_API_KEY (production pay-per-token)
//      - "claude-agent-sdk": @anthropic-ai/claude-agent-sdk + OAuth subscription
//      - "claude-cli": spawn `claude -p` subprocess (legacy, chậm hơn)
//      - "ollama" (default): không cần key, đọc OLLAMA_BASE_URL tùy chọn

import { AnthropicProvider } from './anthropic';
import { ClaudeAgentSdkProvider } from './claude-agent-sdk';
import { ClaudeCliProvider } from './claude-cli';
import { OllamaProvider } from './ollama';
import type { AIProvider } from './types';

export type { AIProvider, ProviderOutput, ProviderRequest, ProviderTokenUsage } from './types';
export { AnthropicProvider } from './anthropic';
export { ClaudeAgentSdkProvider } from './claude-agent-sdk';
export { ClaudeCliProvider } from './claude-cli';
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
  /** Claude CLI binary path override (default 'claude'). */
  claudeCliBin?: string;
  /** Claude CLI default model override. */
  claudeCliDefaultModel?: string;
  /** Claude CLI max budget USD per call override. */
  claudeCliMaxBudgetUsd?: number;
  /** Claude Agent SDK OAuth token (subscription path). Fallback env CLAUDE_CODE_OAUTH_TOKEN. */
  claudeAgentSdkOauthToken?: string;
  /** Claude Agent SDK default model. */
  claudeAgentSdkDefaultModel?: string;
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

  if (wanted === 'claude-cli') {
    const budgetEnv = env.CLAUDE_CLI_MAX_BUDGET_USD;
    const budgetNum = budgetEnv !== undefined ? Number(budgetEnv) : undefined;
    return new ClaudeCliProvider({
      bin: opts.claudeCliBin ?? env.CLAUDE_CLI_BIN,
      defaultModel: opts.claudeCliDefaultModel ?? env.CLAUDE_CLI_MODEL,
      maxBudgetUsd:
        opts.claudeCliMaxBudgetUsd ??
        (budgetNum !== undefined && Number.isFinite(budgetNum) ? budgetNum : undefined),
    });
  }

  if (wanted === 'claude-agent-sdk') {
    return new ClaudeAgentSdkProvider({
      oauthToken: opts.claudeAgentSdkOauthToken ?? env.CLAUDE_CODE_OAUTH_TOKEN,
      defaultModel:
        opts.claudeAgentSdkDefaultModel ?? env.CLAUDE_AGENT_SDK_MODEL,
    });
  }

  if (wanted === 'ollama') {
    return new OllamaProvider({
      baseUrl: opts.ollamaBaseUrl ?? env.OLLAMA_BASE_URL,
      defaultModel: opts.ollamaDefaultModel ?? env.OLLAMA_DEFAULT_MODEL,
    });
  }

  throw new Error(
    `selectProvider: WHITEBOARD_AI_PROVIDER="${wanted}" không hợp lệ (anthropic|claude-cli|claude-agent-sdk|ollama)`,
  );
}

function readEnv(): Record<string, string | undefined> {
  // process.env không tồn tại ở pure browser; ở Node/Next.js server route thì OK.
  if (typeof process !== 'undefined' && process.env) {
    return process.env as Record<string, string | undefined>;
  }
  return {};
}
