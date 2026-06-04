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
import { verifyGeometry, type VerifyReport } from './verify';
import {
  selectProvider,
  type AIProvider,
  type ProviderTokenUsage,
  type SelectProviderOptions,
} from './providers';

const DEFAULT_MAX_TOKENS = 4096;

export interface GenerateIntentOptions extends SelectProviderOptions {
  model?: string;
  maxTokens?: number;
  signal?: AbortSignal;
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
  reason: 'refused' | 'parse_error' | 'builder_error' | 'transpile_error' | 'verify_error' | 'provider_error';
  message: string;
  intents?: readonly IntentT[];
  usage?: IntentTokenUsage;
  provider?: string;
}

export type IntentGenerateResult = IntentSuccessResult | IntentFailureResult;

export async function generateFigureIntent(
  problem: string,
  opts: GenerateIntentOptions = {},
): Promise<IntentGenerateResult> {
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
  const processedIntents = resolveCircleNameCollisions(intents);

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

  // Stage 3: transpile
  const tResult = transpile(dsl);
  if (!tResult.ok) {
    return {
      ok: false,
      reason: 'transpile_error',
      message: tResult.errors.map((e) => `${e.code}: ${e.message}`).join('; '),
      intents,
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
