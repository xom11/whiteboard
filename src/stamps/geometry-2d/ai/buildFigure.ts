// src/stamps/geometry-2d/ai/buildFigure.ts
//
// Orchestrator: chọn provider → gọi → parse envelope → transpile DSL → State.
// Provider-agnostic; backward-compat với caller cũ truyền `apiKey`.

import type { State as SceneState } from '../../../core/scene/types';
import type { DslInputT, TranspileError } from '../dsl';
import { transpile } from '../dsl';
import {
  FigureEnvelopeZ,
  envelopeBuildDsl,
  envelopeJsonSchema,
} from './envelope';
import { buildSystemPrompt } from './prompt';
import {
  selectProvider,
  type AIProvider,
  type ProviderTokenUsage,
  type SelectProviderOptions,
} from './providers';

const DEFAULT_MAX_TOKENS = 8192;

export interface GenerateOptions extends SelectProviderOptions {
  /** Model id override (provider-specific). Mặc định: provider.defaultModel. */
  model?: string;
  maxTokens?: number;
  signal?: AbortSignal;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
}

export type GenerateResult =
  | { ok: true; state: SceneState; dsl: DslInputT; usage: TokenUsage; provider: string }
  | { ok: false; reason: 'refused'; message: string; usage?: TokenUsage; provider?: string }
  | { ok: false; reason: 'parse_error'; message: string; raw?: unknown; usage?: TokenUsage; provider?: string }
  | { ok: false; reason: 'transpile_error'; message: string; errors: TranspileError[]; dsl: unknown; usage?: TokenUsage; provider?: string }
  | { ok: false; reason: 'api_error'; message: string; status?: number; provider?: string };

export async function generateFigure(
  problem: string,
  opts: GenerateOptions = {},
): Promise<GenerateResult> {
  if (!problem || !problem.trim()) {
    return { ok: false, reason: 'api_error', message: 'Đề bài rỗng' };
  }

  let provider: AIProvider;
  try {
    provider = selectProvider(opts);
  } catch (e) {
    const err = e as { message?: string };
    return { ok: false, reason: 'api_error', message: err.message ?? 'Không chọn được provider' };
  }

  const systemPrompt = buildSystemPrompt();
  const schema = envelopeJsonSchema();

  const out = await provider.call({
    systemPrompt,
    userPrompt: problem,
    schema,
    model: opts.model ?? provider.defaultModel,
    maxTokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS,
    signal: opts.signal,
  });

  if (out.kind === 'error') {
    return {
      ok: false,
      reason: 'api_error',
      message: out.message,
      ...(out.status !== undefined ? { status: out.status } : {}),
      provider: provider.name,
    };
  }

  const usage = toUsage(out.usage);

  // Validate envelope schema (refine: build cần figure, refuse cần reason).
  const parsed = FigureEnvelopeZ.safeParse(out.data);
  if (!parsed.success) {
    return {
      ok: false,
      reason: 'parse_error',
      message: 'Envelope không khớp schema: ' + parsed.error.issues.map((i) => i.message).join('; '),
      raw: out.data,
      usage,
      provider: provider.name,
    };
  }

  const env = parsed.data;
  if (env.decision === 'refuse') {
    return {
      ok: false,
      reason: 'refused',
      message: env.reason ?? 'AI từ chối không nêu lý do',
      usage,
      provider: provider.name,
    };
  }

  // decision === 'build'
  const dsl = envelopeBuildDsl(env);
  const tResult = transpile(dsl);
  if (!tResult.ok) {
    return {
      ok: false,
      reason: 'transpile_error',
      message: 'DSL từ AI không hợp lệ',
      errors: tResult.errors,
      dsl,
      usage,
      provider: provider.name,
    };
  }

  return {
    ok: true,
    state: tResult.state,
    dsl,
    usage,
    provider: provider.name,
  };
}

function toUsage(u: ProviderTokenUsage | undefined): TokenUsage {
  return {
    inputTokens: u?.inputTokens ?? 0,
    outputTokens: u?.outputTokens ?? 0,
    cacheReadTokens: u?.cacheReadTokens ?? 0,
    cacheCreationTokens: u?.cacheCreationTokens ?? 0,
  };
}
