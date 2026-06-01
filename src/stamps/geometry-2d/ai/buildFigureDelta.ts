// src/stamps/geometry-2d/ai/buildFigureDelta.ts
//
// Orchestrator cho multi-step refine. Mirror buildFigure.ts với differences:
//   - Schema: FigureRefineEnvelopeZ (3 decision: add/replace/refuse)
//   - Prompt: buildRefineSystemPrompt(currentDsl)
//   - Merge: decision=add concat currentDsl + delta → transpile()
//             decision=replace transpile envelope.figure alone
//   - Errors: lift DUPLICATE_NAME → name_collision, UNKNOWN_REF → unresolved_ref

import type { State as SceneState } from '../../../core/scene/types';
import type { DslInputT, TranspileError } from '../dsl';
import { transpile } from '../dsl';
import {
  FigureRefineEnvelopeZ,
  refineEnvelopeJsonSchema,
} from './refineEnvelope';
import { buildRefineSystemPrompt } from './refinePrompt';
import {
  selectProvider,
  type AIProvider,
  type ProviderTokenUsage,
  type SelectProviderOptions,
} from './providers';

const DEFAULT_MAX_TOKENS = 8192;

export interface GenerateDeltaOptions extends SelectProviderOptions {
  model?: string;
  maxTokens?: number;
  signal?: AbortSignal;
  maxAttempts?: number;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
}

export type GenerateDeltaResult =
  | {
      ok: true;
      state: SceneState;
      mergedDsl: DslInputT;
      mode: 'add' | 'replace';
      usage: TokenUsage;
      provider: string;
    }
  | { ok: false; reason: 'refused'; message: string; usage?: TokenUsage; provider?: string }
  | { ok: false; reason: 'parse_error'; message: string; raw?: unknown; usage?: TokenUsage; provider?: string }
  | {
      ok: false;
      reason: 'transpile_error';
      message: string;
      errors: TranspileError[];
      dsl: unknown;
      usage?: TokenUsage;
      provider?: string;
    }
  | {
      ok: false;
      reason: 'name_collision';
      message: string;
      collisions: string[];
      errors: TranspileError[];
      dsl: unknown;
      usage?: TokenUsage;
      provider?: string;
    }
  | {
      ok: false;
      reason: 'unresolved_ref';
      message: string;
      refs: string[];
      errors: TranspileError[];
      dsl: unknown;
      usage?: TokenUsage;
      provider?: string;
    }
  | { ok: false; reason: 'api_error'; message: string; status?: number; provider?: string };

export interface GenerateFigureDeltaInput {
  problem: string;
  currentDsl: DslInputT;
}

export async function generateFigureDelta(
  input: GenerateFigureDeltaInput,
  opts: GenerateDeltaOptions = {},
): Promise<GenerateDeltaResult> {
  const { problem, currentDsl } = input;

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

  const systemPrompt = buildRefineSystemPrompt(currentDsl);
  const schema = refineEnvelopeJsonSchema();

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

  const parsed = FigureRefineEnvelopeZ.safeParse(out.data);
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

  if (env.decision === 'replace') {
    const figure = env.figure! as unknown as DslInputT;
    const tResult = transpile(figure);
    if (!tResult.ok) {
      return liftTranspileError(tResult.errors, figure, usage, provider.name);
    }
    return {
      ok: true,
      state: tResult.state,
      mergedDsl: figure,
      mode: 'replace',
      usage,
      provider: provider.name,
    };
  }

  // decision === 'add'
  const delta = env.figure! as unknown as DslInputT;
  const merged: DslInputT = {
    version: 1,
    points: [...currentDsl.points, ...delta.points],
    shapes: [...currentDsl.shapes, ...delta.shapes],
  };

  const tResult = transpile(merged);
  if (!tResult.ok) {
    return liftTranspileError(tResult.errors, merged, usage, provider.name);
  }

  return {
    ok: true,
    state: tResult.state,
    mergedDsl: merged,
    mode: 'add',
    usage,
    provider: provider.name,
  };
}

function liftTranspileError(
  errors: TranspileError[],
  dsl: DslInputT,
  usage: TokenUsage,
  providerName: string,
): GenerateDeltaResult {
  const dupes = errors.filter((e) => e.code === 'DUPLICATE_NAME');
  if (dupes.length > 0) {
    const collisions = Array.from(new Set(dupes.flatMap((e) => e.path ?? []).filter(Boolean)));
    return {
      ok: false,
      reason: 'name_collision',
      message:
        'AI tạo entity trùng tên với hình hiện tại: ' +
        (collisions.length > 0 ? collisions.join(', ') : 'không xác định'),
      collisions,
      errors,
      dsl,
      usage,
      provider: providerName,
    };
  }

  const unresolved = errors.filter((e) => e.code === 'UNKNOWN_REF');
  if (unresolved.length > 0) {
    const refs = Array.from(new Set(unresolved.flatMap((e) => e.path ?? []).filter(Boolean)));
    return {
      ok: false,
      reason: 'unresolved_ref',
      message:
        'AI tham chiếu tên không có: ' +
        (refs.length > 0 ? refs.join(', ') : 'không xác định'),
      refs,
      errors,
      dsl,
      usage,
      provider: providerName,
    };
  }

  return {
    ok: false,
    reason: 'transpile_error',
    message: 'DSL từ AI không hợp lệ',
    errors,
    dsl,
    usage,
    provider: providerName,
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
