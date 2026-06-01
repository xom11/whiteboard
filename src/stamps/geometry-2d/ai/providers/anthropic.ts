// src/stamps/geometry-2d/ai/providers/anthropic.ts
//
// AIProvider impl cho Anthropic Claude. Internal: dùng tool_use với single
// tool "emit_figure_envelope" input_schema = envelope JSON Schema → ép Claude
// emit JSON đúng shape. Map response → ProviderOutput envelope.
//
// Khác bản trước (provider.ts): bỏ dual-tool (build_figure + refuse) — Claude
// hoàn toàn xử lý được decision/refuse trong cùng 1 envelope.

import Anthropic from '@anthropic-ai/sdk';
import type {
  AIProvider,
  ProviderOutput,
  ProviderRequest,
  ProviderTokenUsage,
} from './types';

const TOOL_NAME = 'emit_figure_envelope';

export interface AnthropicProviderOptions {
  apiKey: string;
  /** Cache system prompt qua Anthropic prompt-caching (mặc định bật). */
  enableCaching?: boolean;
}

export class AnthropicProvider implements AIProvider {
  readonly name = 'anthropic';
  readonly defaultModel = 'claude-opus-4-7';

  constructor(private readonly opts: AnthropicProviderOptions) {
    if (!opts.apiKey) throw new Error('AnthropicProvider: apiKey bắt buộc');
  }

  async call(req: ProviderRequest): Promise<ProviderOutput> {
    const enableCaching = this.opts.enableCaching !== false;
    const systemBlock = enableCaching
      ? { type: 'text' as const, text: req.systemPrompt, cache_control: { type: 'ephemeral' as const } }
      : { type: 'text' as const, text: req.systemPrompt };

    const tool = {
      name: TOOL_NAME,
      description:
        'Emit envelope JSON cho phép vẽ hình hoặc từ chối. ' +
        'decision="build" kèm figure (DSL hình học); decision="refuse" kèm reason.',
      input_schema: req.schema,
    };

    const client = new Anthropic({ apiKey: this.opts.apiKey });
    let resp: Anthropic.Messages.Message;
    try {
      resp = await client.messages.create(
        {
          model: req.model,
          max_tokens: req.maxTokens,
          system: [systemBlock],
          tools: [tool as never],
          tool_choice: { type: 'tool', name: TOOL_NAME },
          messages: [{ role: 'user', content: req.userPrompt }],
        },
        req.signal ? { signal: req.signal } : undefined,
      );
    } catch (e) {
      const err = e as { message?: string; status?: number };
      return {
        kind: 'error',
        message: err.message ?? 'Lỗi gọi Anthropic API',
        ...(err.status !== undefined ? { status: err.status } : {}),
      };
    }

    const usage = toUsage(resp.usage);
    const toolUse = resp.content.find((c) => c.type === 'tool_use');
    if (!toolUse || toolUse.type !== 'tool_use') {
      return {
        kind: 'error',
        message: 'Claude không gọi tool. stop_reason=' + resp.stop_reason,
      };
    }
    if (toolUse.name !== TOOL_NAME) {
      return {
        kind: 'error',
        message: `Tool không xác định: "${toolUse.name}"`,
      };
    }
    return { kind: 'json', data: toolUse.input, usage };
  }
}

function toUsage(u: Anthropic.Messages.Usage): ProviderTokenUsage {
  return {
    inputTokens: u.input_tokens,
    outputTokens: u.output_tokens,
    cacheReadTokens: u.cache_read_input_tokens ?? 0,
    cacheCreationTokens: u.cache_creation_input_tokens ?? 0,
  };
}
