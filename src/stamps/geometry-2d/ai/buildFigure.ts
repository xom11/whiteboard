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
import {
  validateKindCoverage,
  buildRetryHint,
  type ValidatorIssue,
} from './validator';

const DEFAULT_MAX_TOKENS = 8192;

export interface GenerateOptions extends SelectProviderOptions {
  /** Model id override (provider-specific). Mặc định: provider.defaultModel. */
  model?: string;
  maxTokens?: number;
  signal?: AbortSignal;
  /**
   * Nếu true, khi validator phát hiện missing kind (vd đề có "trung điểm" mà
   * output dùng `free`) sẽ retry 1 lần với hint inject vào user prompt.
   * Default: false (chỉ cảnh báo qua `validatorWarnings`). Bật cho eval/CI
   * hoặc khi UX cho phép +1 round trip để đổi accuracy.
   */
  retryOnValidatorMiss?: boolean;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
}

export type GenerateResult =
  | {
      ok: true;
      state: SceneState;
      dsl: DslInputT;
      usage: TokenUsage;
      provider: string;
      /** Validator warnings: missing kind theo đề bài (non-fatal). */
      validatorWarnings?: readonly ValidatorIssue[];
      /** Số lần retry đã thực hiện do validator miss (0 hoặc 1). */
      retries?: number;
    }
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

  // Round 1.
  const round1 = await runOneRound(provider, {
    systemPrompt,
    userPrompt: problem,
    schema,
    model: opts.model ?? provider.defaultModel,
    maxTokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS,
    signal: opts.signal,
  });
  if (!round1.ok && round1.kind === 'api_error') return round1.result;
  if (!round1.ok && round1.kind === 'parse_error') return round1.result;
  if (!round1.ok && round1.kind === 'refused') return round1.result;
  if (!round1.ok && round1.kind === 'transpile_error') {
    // Transpile errors are not retried by validator (validator chạy sau khi
    // transpile ok). Return luôn.
    return round1.result;
  }

  // round1.ok === true → có dsl + state. Chạy validator.
  const success1 = round1.success!;
  const validation = validateKindCoverage(problem, success1.dsl);

  // Nếu pass hoặc caller không bật retry → return luôn (kèm warnings).
  if (validation.ok || !opts.retryOnValidatorMiss) {
    return {
      ok: true,
      state: success1.state,
      dsl: success1.dsl,
      usage: success1.usage,
      provider: provider.name,
      ...(validation.missing.length > 0
        ? { validatorWarnings: validation.missing }
        : {}),
      retries: 0,
    };
  }

  // Validator miss + retry enabled → round 2 với hint.
  const hint = buildRetryHint(validation.missing);
  const round2 = await runOneRound(provider, {
    systemPrompt,
    userPrompt: `${problem}\n\n${hint}`,
    schema,
    model: opts.model ?? provider.defaultModel,
    maxTokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS,
    signal: opts.signal,
  });

  // Nếu round 2 fail bất kỳ lý do nào → fallback về round 1 success (vì
  // round 1 ít nhất đã transpile được, chỉ thiếu kind).
  if (!round2.ok || !round2.success) {
    return {
      ok: true,
      state: success1.state,
      dsl: success1.dsl,
      usage: mergeUsage(success1.usage, getUsageFromRound(round2)),
      provider: provider.name,
      validatorWarnings: validation.missing,
      retries: 1,
    };
  }

  // Round 2 ok → re-validate. Dùng kết quả round 2 dù validation có pass hay
  // không (chấp nhận output mới — closer to user intent).
  const success2 = round2.success;
  const validation2 = validateKindCoverage(problem, success2.dsl);
  return {
    ok: true,
    state: success2.state,
    dsl: success2.dsl,
    usage: mergeUsage(success1.usage, success2.usage),
    provider: provider.name,
    ...(validation2.missing.length > 0
      ? { validatorWarnings: validation2.missing }
      : {}),
    retries: 1,
  };
}

// -----------------------------------------------------------------------------
// runOneRound: gom 1 vòng provider.call + parse envelope + transpile.
// Trả về discriminated union: ok với { success } hoặc !ok với { kind, result }.
// -----------------------------------------------------------------------------

interface RoundSuccess {
  state: SceneState;
  dsl: DslInputT;
  usage: TokenUsage;
}

type RoundResult =
  | { ok: true; success: RoundSuccess; kind?: never; result?: never }
  | {
      ok: false;
      kind: 'api_error' | 'parse_error' | 'refused' | 'transpile_error';
      result: GenerateResult;
      success?: never;
    };

async function runOneRound(
  provider: AIProvider,
  req: {
    systemPrompt: string;
    userPrompt: string;
    schema: unknown;
    model: string;
    maxTokens: number;
    signal?: AbortSignal;
  },
): Promise<RoundResult> {
  const out = await provider.call({
    systemPrompt: req.systemPrompt,
    userPrompt: req.userPrompt,
    schema: req.schema as never,
    model: req.model,
    maxTokens: req.maxTokens,
    signal: req.signal,
  });

  if (out.kind === 'error') {
    return {
      ok: false,
      kind: 'api_error',
      result: {
        ok: false,
        reason: 'api_error',
        message: out.message,
        ...(out.status !== undefined ? { status: out.status } : {}),
        provider: provider.name,
      },
    };
  }

  const usage = toUsage(out.usage);
  const parsed = FigureEnvelopeZ.safeParse(out.data);
  if (!parsed.success) {
    return {
      ok: false,
      kind: 'parse_error',
      result: {
        ok: false,
        reason: 'parse_error',
        message:
          'Envelope không khớp schema: ' +
          parsed.error.issues.map((i) => i.message).join('; '),
        raw: out.data,
        usage,
        provider: provider.name,
      },
    };
  }

  const env = parsed.data;
  if (env.decision === 'refuse') {
    return {
      ok: false,
      kind: 'refused',
      result: {
        ok: false,
        reason: 'refused',
        message: env.reason ?? 'AI từ chối không nêu lý do',
        usage,
        provider: provider.name,
      },
    };
  }

  const dsl = envelopeBuildDsl(env);
  const tResult = transpile(dsl);
  if (!tResult.ok) {
    return {
      ok: false,
      kind: 'transpile_error',
      result: {
        ok: false,
        reason: 'transpile_error',
        message: 'DSL từ AI không hợp lệ',
        errors: tResult.errors,
        dsl,
        usage,
        provider: provider.name,
      },
    };
  }

  return {
    ok: true,
    success: { state: tResult.state, dsl, usage },
  };
}

function mergeUsage(a: TokenUsage, b: TokenUsage | undefined): TokenUsage {
  if (!b) return a;
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cacheReadTokens: a.cacheReadTokens + b.cacheReadTokens,
    cacheCreationTokens: a.cacheCreationTokens + b.cacheCreationTokens,
  };
}

function getUsageFromRound(r: RoundResult): TokenUsage | undefined {
  if (r.ok) return r.success!.usage;
  const res = r.result;
  if (res && 'usage' in res && res.usage) return res.usage;
  return undefined;
}

function toUsage(u: ProviderTokenUsage | undefined): TokenUsage {
  return {
    inputTokens: u?.inputTokens ?? 0,
    outputTokens: u?.outputTokens ?? 0,
    cacheReadTokens: u?.cacheReadTokens ?? 0,
    cacheCreationTokens: u?.cacheCreationTokens ?? 0,
  };
}
