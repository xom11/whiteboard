// src/stamps/geometry-2d/ai/buildFigureIntent.ts
//
// 4-stage pipeline orchestrator (new path, parallel to buildFigure.ts):
//   Stage 1: AI extract Intent[]   (provider.call with intent prompt + schema)
//   Stage 2: intentsToDsl()        (deterministic)
//   Stage 3: transpile(DSL)        (existing)
//   Stage 4: verifyGeometry()      (deterministic geometric check)
//
// Trả về GenerateResult tương tự buildFigure.ts để consumer dùng được cả 2 path.

import { transpile } from '../dsl';
import type { TranspileResult } from '../dsl';
import { intentsToDsl, IntentBuilderError } from './intentToDsl';
import { buildIntentSystemPrompt } from './intentPrompt';
import { IntentEnvelopeZ, type IntentEnvelopeT, type IntentT } from './intent';
import { intentEnvelopeJsonSchema } from './intentEnvelope';
import { normalizeIntents } from './normalizeIntent';
import { resolveCircleNameCollisions } from './resolveCircleNames';
import { completeRightAngle } from './completeRightAngle';
import { verifyGeometry, type VerifyReport } from './verify';
import { tryDeterministicFigure } from './deterministic/tryDeterministicFigure';
import { describeDeterministicMiss } from './deterministic/describeMiss';
import {
  selectProvider,
  type AIProvider,
  type ProviderTokenUsage,
  type SelectProviderOptions,
} from './providers';

const DEFAULT_MAX_TOKENS = 4096;
const ZERO_USAGE: IntentTokenUsage = {
  inputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheCreationTokens: 0,
};

export interface GenerateIntentOptions extends SelectProviderOptions {
  model?: string;
  maxTokens?: number;
  signal?: AbortSignal;
  /**
   * Track A deterministic-first (mặc định bật). Thử rule engine trước; chỉ gọi
   * LLM (Track B) khi deterministic không phủ đủ / không dựng được. Đặt false để
   * ép luôn dùng LLM (vd so sánh eval, debug).
   */
  useDeterministic?: boolean;
  /**
   * CHỈ deterministic — KHÔNG fallback LLM. Track A miss → trả failure
   * `deterministic_miss` (kèm lý do) thay vì gọi Track B. Dùng khi tối ưu rule
   * base: muốn THẤY đề nào rule chưa phủ (không tốn token, không che lấp gap).
   * Ưu tiên hơn `useDeterministic` (true ⇒ luôn chạy Track A, không bao giờ LLM).
   */
  deterministicOnly?: boolean;
}

export interface IntentTokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheCreationTokens?: number;
}

export interface IntentSuccessResult {
  ok: true;
  intents: readonly IntentT[];
  dsl: ReturnType<typeof intentsToDsl>;
  transpile: Extract<TranspileResult, { ok: true }>;
  verify: VerifyReport;
  usage: IntentTokenUsage;
  provider: string;
}

export interface IntentFailureResult {
  ok: false;
  reason:
    | 'refused'
    | 'parse_error'
    | 'builder_error'
    | 'transpile_error'
    | 'verify_error'
    | 'provider_error'
    | 'deterministic_miss';
  message: string;
  intents?: readonly IntentT[];
  dsl?: ReturnType<typeof intentsToDsl>;
  usage?: IntentTokenUsage;
  provider?: string;
}

export type IntentGenerateResult = IntentSuccessResult | IntentFailureResult;

export async function generateFigureIntent(
  problem: string,
  opts: GenerateIntentOptions = {},
): Promise<IntentGenerateResult> {
  // === Track A: deterministic-first ===
  // Rule engine + 4 lớp gate (coverage/transpile/verify/named-entity). Đề dễ→trung
  // bình dựng tại đây, KHÔNG gọi LLM. Đề khó / phủ thiếu → fall through Track B
  // (trừ khi deterministicOnly → trả deterministic_miss).
  // deterministicOnly ép chạy Track A kể cả khi useDeterministic=false.
  if (opts.useDeterministic !== false || opts.deterministicOnly) {
    const det = tryDeterministicFigure(problem);
    if (det.ok) {
      return {
        ok: true,
        intents: det.figure.intents,
        dsl: det.figure.dsl,
        transpile: det.figure.transpile,
        verify: det.figure.verify,
        usage: ZERO_USAGE,
        provider: 'deterministic',
      };
    }
    // deterministicOnly: KHÔNG fallback LLM → trả failure kèm lý do (det.reason)
    // để người tối ưu rule base thấy gap. (no-match / incomplete-coverage /
    // transpile-fail / named-missing / verify-fail / …)
    if (opts.deterministicOnly) {
      return {
        ok: false,
        reason: 'deterministic_miss',
        message: describeDeterministicMiss(det),
        usage: ZERO_USAGE,
        provider: 'deterministic',
      };
    }
    // không hit → tiếp tục Track B (LLM)
  }

  // === Track B: LLM ===
  const provider: AIProvider = selectProvider(opts);
  const model = opts.model ?? provider.defaultModel;
  const maxTokens = opts.maxTokens ?? DEFAULT_MAX_TOKENS;
  const systemPrompt = buildIntentSystemPrompt();
  const schema = intentEnvelopeJsonSchema();

  const result = await provider.call({
    systemPrompt,
    userPrompt: problem,
    schema,
    model,
    maxTokens,
    ...(opts.signal ? { signal: opts.signal } : {}),
  });

  if (result.kind === 'error') {
    return {
      ok: false,
      reason: 'provider_error',
      message: result.message,
      provider: provider.name,
    };
  }

  const usage = toUsage(result.usage);

  // Parse envelope
  let envelope: IntentEnvelopeT;
  try {
    envelope = IntentEnvelopeZ.parse(result.data);
  } catch (e) {
    const err = e as { message?: string };
    return {
      ok: false,
      reason: 'parse_error',
      message: `Envelope không parse được: ${err.message ?? '?'}`,
      usage,
      provider: provider.name,
    };
  }

  if (envelope.decision === 'refuse') {
    return {
      ok: false,
      reason: 'refused',
      message: envelope.reason ?? 'AI từ chối không nêu lý do',
      usage,
      provider: provider.name,
    };
  }

  // Stage 1.5a: variant normalization (rule-based — fix common LLM biases về
  // variant naming, vd "cân tại A" → isoceles-BC theo canonical, rectangle
  // "wide" → "standard" mặc định). API contract: caller nhận variant đã chuẩn
  // hoá vì đây là known-canonical correction, không phải semantic change.
  const intents = normalizeIntents(envelope.intents!, problem);

  // Stage 1.5b: preprocess naming collisions (circle name dùng làm point ref).
  // Notation Việt "(O)" thường ám chỉ TÂM (point) chứ không phải tên circle —
  // preprocessor inject add-point center + rename circle để tránh KIND_MISMATCH.
  const collisionFixed = resolveCircleNameCollisions(intents);

  // Stage 1.5c: deterministic inject "góc vuông nhìn đoạn" (∠a-M-b = 90°).
  // LLM hay miss insight dựng đường tròn đường kính — inject từ regex đề.
  const processedIntents = completeRightAngle(collisionFixed, problem);

  // Stage 2: deterministic build
  let dsl: ReturnType<typeof intentsToDsl>;
  try {
    dsl = intentsToDsl(processedIntents);
  } catch (e) {
    const err = e as IntentBuilderError;
    return {
      ok: false,
      reason: 'builder_error',
      message: err.message,
      intents,
      usage,
      provider: provider.name,
    };
  }

  // Stage 3: transpile. `transpile()` thường trả {ok:false} cho known error,
  // nhưng vẫn có throw uncaught (vd "emit: id not assigned for X") khi DSL có
  // shape ref chưa-assigned. Catch để giữ intents + dsl cho debug downstream.
  let tResult: TranspileResult;
  try {
    tResult = transpile(dsl);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      reason: 'transpile_error',
      message: `transpile throw: ${message}`,
      intents,
      dsl,
      usage,
      provider: provider.name,
    };
  }
  if (!tResult.ok) {
    return {
      ok: false,
      reason: 'transpile_error',
      message: tResult.errors.map((e) => `${e.code}: ${e.message}`).join('; '),
      intents,
      dsl,
      usage,
      provider: provider.name,
    };
  }

  // Stage 4: geometric verify
  const vReport = verifyGeometry(intents, dsl);

  return {
    ok: true,
    intents,
    dsl,
    transpile: tResult,
    verify: vReport,
    usage,
    provider: provider.name,
  };
}

function toUsage(u: ProviderTokenUsage | undefined): IntentTokenUsage {
  return {
    inputTokens: u?.inputTokens ?? 0,
    outputTokens: u?.outputTokens ?? 0,
    ...(u?.cacheReadTokens != null ? { cacheReadTokens: u.cacheReadTokens } : {}),
    ...(u?.cacheCreationTokens != null ? { cacheCreationTokens: u.cacheCreationTokens } : {}),
  };
}
