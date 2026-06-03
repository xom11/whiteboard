// src/stamps/geometry-2d/ai/providers/claude-agent-sdk.ts
//
// AIProvider impl dùng @anthropic-ai/claude-agent-sdk (official Anthropic SDK
// wrap Claude Code binary). OAuth subscription path — bill vào Pro/Max/Team
// thay vì API key console. KHÔNG vi phạm ToS (SDK chính chủ).
//
// Setup:
//   $ npm install -g @anthropic-ai/claude-code
//   $ claude setup-token            # browser auth → sk-ant-oat01-...
//   $ export CLAUDE_CODE_OAUTH_TOKEN=sk-ant-oat01-...
//   $ unset ANTHROPIC_API_KEY       # nếu đã set ở project khác (sẽ shadow OAuth)
//
// So với ClaudeCliProvider (spawn `claude -p` subprocess):
//   - Latency thấp hơn nhiều (~10-30s vs 1-2 phút) — không boot full Claude Code context
//   - Streaming-first (in-process async iterator)
//   - Cùng subscription billing path

import type { AIProvider, ProviderOutput, ProviderRequest } from './types';

const DEFAULT_MODEL = 'claude-sonnet-4-6';

export interface ClaudeAgentSdkProviderOptions {
  /** OAuth token. Fallback: env CLAUDE_CODE_OAUTH_TOKEN. */
  oauthToken?: string;
  defaultModel?: string;
  /** Inject custom query impl cho test mock. */
  queryImpl?: ClaudeAgentSdkQueryFn;
}

/** Shape của `query` từ @anthropic-ai/claude-agent-sdk — cho test mock. */
export type ClaudeAgentSdkQueryFn = (args: {
  prompt: string;
  options: {
    systemPrompt?: string;
    allowedTools?: string[];
    model?: string;
    abortSignal?: AbortSignal;
  };
}) => AsyncIterable<ClaudeAgentSdkMessage>;

export type ClaudeAgentSdkMessage =
  | {
      type: 'assistant';
      message: { content: Array<{ type: 'text'; text: string } | { type: string }> };
    }
  | {
      type: 'result';
      subtype: 'success' | 'error_during_execution' | string;
      duration_ms?: number;
      usage?: {
        input_tokens?: number;
        output_tokens?: number;
        cache_read_input_tokens?: number;
        cache_creation_input_tokens?: number;
      };
    }
  | { type: 'system'; [k: string]: unknown }
  | { type: string; [k: string]: unknown };

export class ClaudeAgentSdkProvider implements AIProvider {
  readonly name = 'claude-agent-sdk';
  readonly defaultModel: string;
  private readonly oauthToken: string | undefined;
  private readonly queryImpl: ClaudeAgentSdkQueryFn | null;

  constructor(opts: ClaudeAgentSdkProviderOptions = {}) {
    this.defaultModel = opts.defaultModel ?? DEFAULT_MODEL;
    this.oauthToken = opts.oauthToken;
    this.queryImpl = opts.queryImpl ?? null;
  }

  private async resolveQuery(): Promise<ClaudeAgentSdkQueryFn> {
    if (this.queryImpl) return this.queryImpl;
    // Lazy import: chỉ load SDK khi thực sự cần. SDK requires Node (spawn).
    const mod = (await import('@anthropic-ai/claude-agent-sdk')) as {
      query: ClaudeAgentSdkQueryFn;
    };
    return mod.query;
  }

  async call(req: ProviderRequest): Promise<ProviderOutput> {
    // Inject OAuth token vào env nếu provider có. SDK đọc CLAUDE_CODE_OAUTH_TOKEN.
    if (this.oauthToken) {
      process.env.CLAUDE_CODE_OAUTH_TOKEN = this.oauthToken;
    }

    let query: ClaudeAgentSdkQueryFn;
    try {
      query = await this.resolveQuery();
    } catch (e) {
      return {
        kind: 'error',
        message:
          'ClaudeAgentSdkProvider: SDK không khả dụng. ' +
          ((e as { message?: string }).message ?? ''),
      };
    }

    // Constraint output qua system prompt — Agent SDK không có --json-schema flag,
    // dùng prompt-instruct + parse JSON post-hoc. Sonnet 4.6 follow format tốt.
    const schemaText = JSON.stringify(req.schema, null, 2);
    const constrainedSystem = `${req.systemPrompt}

QUAN TRỌNG: Output PHẢI là valid JSON đúng schema sau. KHÔNG markdown wrapper, KHÔNG prose giải thích, CHỈ raw JSON:

${schemaText}`;

    let assistantText = '';
    let usageInput = 0;
    let usageOutput = 0;
    let cacheRead = 0;
    let cacheCreation = 0;

    try {
      for await (const msg of query({
        prompt: req.userPrompt,
        options: {
          systemPrompt: constrainedSystem,
          allowedTools: [],
          model: req.model ?? this.defaultModel,
          ...(req.signal ? { abortSignal: req.signal } : {}),
        },
      })) {
        if (msg.type === 'assistant') {
          const message = (msg as { message: { content: Array<unknown> } }).message;
          for (const block of message.content) {
            const b = block as { type?: string; text?: string };
            if (b.type === 'text' && typeof b.text === 'string') {
              assistantText += b.text;
            }
          }
        } else if (msg.type === 'result') {
          const r = msg as {
            subtype?: string;
            usage?: {
              input_tokens?: number;
              output_tokens?: number;
              cache_read_input_tokens?: number;
              cache_creation_input_tokens?: number;
            };
          };
          if (r.subtype && r.subtype !== 'success') {
            return {
              kind: 'error',
              message: `ClaudeAgentSdkProvider: result subtype=${r.subtype}`,
            };
          }
          if (r.usage) {
            usageInput = r.usage.input_tokens ?? 0;
            usageOutput = r.usage.output_tokens ?? 0;
            cacheRead = r.usage.cache_read_input_tokens ?? 0;
            cacheCreation = r.usage.cache_creation_input_tokens ?? 0;
          }
        }
      }
    } catch (e) {
      return {
        kind: 'error',
        message:
          'ClaudeAgentSdkProvider: query() throw: ' +
          ((e as { message?: string }).message ?? '?'),
      };
    }

    if (!assistantText.trim()) {
      return {
        kind: 'error',
        message: 'ClaudeAgentSdkProvider: assistant trả response rỗng.',
      };
    }

    // Strip markdown fence nếu Sonnet vẫn add (defensive).
    let cleaned = assistantText.trim();
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?\s*```\s*$/, '');

    let data: unknown;
    try {
      data = JSON.parse(cleaned);
    } catch (e) {
      return {
        kind: 'error',
        message:
          'ClaudeAgentSdkProvider: output không parse JSON: ' +
          ((e as { message?: string }).message ?? '?') +
          '. Output preview: ' +
          cleaned.slice(0, 200),
      };
    }

    return {
      kind: 'json',
      data,
      usage: {
        inputTokens: usageInput,
        outputTokens: usageOutput,
        cacheReadTokens: cacheRead,
        cacheCreationTokens: cacheCreation,
      },
    };
  }
}
