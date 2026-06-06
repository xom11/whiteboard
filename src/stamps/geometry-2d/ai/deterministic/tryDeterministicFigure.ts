// src/stamps/geometry-2d/ai/deterministic/tryDeterministicFigure.ts
//
// Track A đầy đủ: rule NLU → coverage gate → normalize → resolve circle collisions
// → build DSL → transpile → verifyGeometry → named-entity guard. Trả figure SẴN
// RENDER nếu qua HẾT 4 lớp gate; ngược lại { ok:false } để router escalate AI.
//
// Tách khỏi buildFigureIntent để test độc lập toàn bộ logic quyết định.
import type { IntentT } from '../intent';
import type { DslInputT } from '../../dsl/schema';
import type { TranspileResult } from '../../dsl/transpile/errors';
import type { VerifyReport } from '../verify';
import type { CoverageReport } from './coverage';
import { runDeterministicIntents } from './runDeterministicIntents';
import { allNamedEntitiesPresent, verifyIntentFidelity } from './guards';
import { normalizeIntents } from '../normalizeIntent';
import { resolveCircleNameCollisions } from '../resolveCircleNames';
import { intentsToDsl } from '../intentToDsl';
import { transpile } from '../../dsl';
import { verifyGeometry } from '../verify';

export type DeterministicReason =
  | 'no-match'
  | 'incomplete-coverage'
  | 'build-throw'
  | 'transpile-throw'
  | 'transpile-fail'
  | 'verify-fail'
  | 'named-missing'
  | 'intent-dropped';

export interface DeterministicFigure {
  intents: IntentT[];
  dsl: DslInputT;
  transpile: Extract<TranspileResult, { ok: true }>;
  verify: VerifyReport;
  coverage: CoverageReport;
}

export type TryDeterministicResult =
  | { ok: true; figure: DeterministicFigure }
  | { ok: false; reason: DeterministicReason; detail?: string; coverage?: CoverageReport };

export function tryDeterministicFigure(problem: string): TryDeterministicResult {
  const det = runDeterministicIntents(problem);
  if (!det.ok) return { ok: false, reason: det.reason, coverage: det.coverage };

  // Cùng các stage chuẩn hoá như Track B (LLM) để 2 path hội tụ.
  const intents = resolveCircleNameCollisions(normalizeIntents(det.intents, problem));

  let dsl: DslInputT;
  try {
    dsl = intentsToDsl(intents);
  } catch (e) {
    return { ok: false, reason: 'build-throw', detail: errMsg(e), coverage: det.coverage };
  }

  let tResult: TranspileResult;
  try {
    tResult = transpile(dsl);
  } catch (e) {
    return { ok: false, reason: 'transpile-throw', detail: errMsg(e), coverage: det.coverage };
  }
  if (!tResult.ok) {
    return {
      ok: false,
      reason: 'transpile-fail',
      detail: tResult.errors.map((x) => `${x.code}:${x.message}`).join('; '),
      coverage: det.coverage,
    };
  }

  const vReport = verifyGeometry(intents, dsl);
  if (!vReport.ok) {
    return { ok: false, reason: 'verify-fail', coverage: det.coverage };
  }

  // Guard 1: tên xuất hiện/khai báo trong đề phải có trong DSL (chống drop construct).
  const named = allNamedEntitiesPresent(problem, dsl);
  if (!named.ok) {
    return { ok: false, reason: 'named-missing', detail: named.missing.join(','), coverage: det.coverage };
  }

  // Guard 2: add-point phái sinh phải dựng trung thành (không bị builder drop vì
  // trùng tên đỉnh sẵn có → điểm thực tế là 'free' thay vì construct).
  const fidelity = verifyIntentFidelity(intents, dsl);
  if (!fidelity.ok) {
    return { ok: false, reason: 'intent-dropped', detail: fidelity.dropped.join(','), coverage: det.coverage };
  }

  return {
    ok: true,
    figure: { intents, dsl, transpile: tResult, verify: vReport, coverage: det.coverage },
  };
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
