// src/stamps/geometry-2d/ai/buildFigure.ts
import type { State as SceneState } from '../../../core/scene/types';
import type { DslInputT, TranspileError } from '../dsl';
import { transpile } from '../dsl';
import { callProvider, type ProviderResponse } from './provider';
import { buildSystemPrompt } from './prompt';
import { TOOLS } from './tools';

const DEFAULT_MODEL = 'claude-opus-4-7';
const DEFAULT_MAX_TOKENS = 8192;

export interface GenerateOptions {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  enableCaching?: boolean;
  signal?: AbortSignal;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
}

export type GenerateResult =
  | { ok: true; state: SceneState; dsl: DslInputT; usage: TokenUsage }
  | { ok: false; reason: 'refused'; message: string; usage?: TokenUsage }
  | { ok: false; reason: 'parse_error'; message: string; raw?: unknown; usage?: TokenUsage }
  | { ok: false; reason: 'transpile_error'; message: string; errors: TranspileError[]; dsl: unknown; usage?: TokenUsage }
  | { ok: false; reason: 'api_error'; message: string; status?: number };

function toUsage(u: ProviderResponse['usage']): TokenUsage {
  return {
    inputTokens: u.input_tokens,
    outputTokens: u.output_tokens,
    cacheReadTokens: u.cache_read_input_tokens ?? 0,
    cacheCreationTokens: u.cache_creation_input_tokens ?? 0,
  };
}

export async function generateFigure(
  problem: string,
  opts: GenerateOptions,
): Promise<GenerateResult> {
  if (!opts.apiKey) {
    return { ok: false, reason: 'api_error', message: 'apiKey bắt buộc' };
  }
  if (!problem || !problem.trim()) {
    return { ok: false, reason: 'api_error', message: 'Đề bài rỗng' };
  }

  const systemText = buildSystemPrompt();
  const enableCaching = opts.enableCaching !== false;
  const systemBlock = enableCaching
    ? { type: 'text' as const, text: systemText, cache_control: { type: 'ephemeral' as const } }
    : { type: 'text' as const, text: systemText };

  let response: ProviderResponse;
  try {
    response = await callProvider({
      apiKey: opts.apiKey,
      model: opts.model ?? DEFAULT_MODEL,
      maxTokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS,
      system: [systemBlock],
      tools: TOOLS as never,
      toolChoice: { type: 'any' },
      messages: [{ role: 'user', content: problem }],
      signal: opts.signal,
    });
  } catch (e) {
    const err = e as { message?: string; status?: number };
    return {
      ok: false,
      reason: 'api_error',
      message: err.message ?? 'Lỗi gọi Claude API',
      ...(err.status !== undefined ? { status: err.status } : {}),
    };
  }

  const usage = toUsage(response.usage);

  const toolUse = response.content.find((c) => c.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    const text = response.content.find((c) => c.type === 'text');
    const textStr = text?.type === 'text' ? text.text : '(empty)';
    return {
      ok: false,
      reason: 'parse_error',
      message: 'AI không gọi tool nào. Response: ' + textStr,
      raw: response.content,
      usage,
    };
  }

  if (toolUse.name === 'refuse') {
    const input = toolUse.input as { reason?: string };
    return {
      ok: false,
      reason: 'refused',
      message: input.reason ?? 'AI từ chối không nêu lý do',
      usage,
    };
  }

  if (toolUse.name !== 'build_figure') {
    return {
      ok: false,
      reason: 'parse_error',
      message: `Tool không xác định: "${toolUse.name}"`,
      raw: toolUse,
      usage,
    };
  }

  const tResult = transpile(toolUse.input);
  if (!tResult.ok) {
    return {
      ok: false,
      reason: 'transpile_error',
      message: 'DSL từ AI không hợp lệ',
      errors: tResult.errors,
      dsl: toolUse.input,
      usage,
    };
  }

  return {
    ok: true,
    state: tResult.state,
    dsl: toolUse.input as DslInputT,
    usage,
  };
}
