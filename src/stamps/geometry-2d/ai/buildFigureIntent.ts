// src/stamps/geometry-2d/ai/buildFigureIntent.ts
//
// Deterministic-only figure builder (rule-base, KHÔNG LLM).
//   Track A: tryDeterministicFigure() — rule engine + 4 gate
//     (coverage / transpile / verify / named-entity).
//   Success → trả figure (intents + dsl + transpile + verify).
//   Miss    → trả failure `deterministic_miss` kèm lý do (describeDeterministicMiss)
//             để người tối ưu rule base thấy phần đề chưa phủ. KHÔNG fallback LLM.
//
// Trả về IntentGenerateResult tương thích shape cũ để consumer dùng được.

import type { TranspileResult } from '../dsl';
import { intentsToDsl } from './intentToDsl';
import type { IntentT } from './intent';
import { type VerifyReport } from './verify';
import { tryDeterministicFigure } from './deterministic/tryDeterministicFigure';
import { describeDeterministicMiss } from './deterministic/describeMiss';

const ZERO_USAGE: IntentTokenUsage = {
  inputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheCreationTokens: 0,
};

export interface GenerateIntentOptions {
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
  reason:
    | 'builder_error'
    | 'transpile_error'
    | 'verify_error'
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
  _opts: GenerateIntentOptions = {},
): Promise<IntentGenerateResult> {
  // === Track A: deterministic ===
  // Rule engine + 4 lớp gate (coverage/transpile/verify/named-entity). Đề dễ→trung
  // bình dựng tại đây, KHÔNG tốn token. Miss → trả deterministic_miss (KHÔNG LLM).
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

  // Miss → trả failure kèm lý do (det.reason) để người tối ưu rule base thấy gap.
  // (no-match / incomplete-coverage / transpile-fail / named-missing / verify-fail / …)
  return {
    ok: false,
    reason: 'deterministic_miss',
    message: describeDeterministicMiss(det),
    usage: ZERO_USAGE,
    provider: 'deterministic',
  };
}
