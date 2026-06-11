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
import { normalizeProblemText } from './normalizeText';
import { resolveCircleNameCollisions } from '../resolveCircleNames';
import { intentsToDsl } from '../intentToDsl';
import { orderIntentsByDependency } from '../intentTopo';
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

// ── Build + transpile với ORDER-RETRY ────────────────────────────────────────
// Attempt 1 theo đúng thứ tự intent (giữ defaultFreeCoord spread/uniqueShapeName
// của mọi case đang pass → byte-identical). CHỈ khi fail vì-thứ-tự (build-throw
// hoặc transpile UNKNOWN_REF) mới retry với thứ tự topo (intentTopo). Retry vẫn
// fail → giữ lỗi attempt 1 cho chẩn đoán ổn định.
// Gỡ coupling "rule priority quyết định thứ tự build" — rule mới không còn phải
// canh priority thấp hơn mọi rule tạo điểm như intersection (priority 45).

export type BuildAndTranspileResult =
  | { ok: true; intents: readonly IntentT[]; dsl: DslInputT; tResult: Extract<TranspileResult, { ok: true }> }
  | { ok: false; reason: 'build-throw' | 'transpile-throw' | 'transpile-fail'; detail: string; orderSensitive: boolean };

function attemptBuild(intents: readonly IntentT[]): BuildAndTranspileResult {
  let dsl: DslInputT;
  try {
    dsl = intentsToDsl(intents);
  } catch (e) {
    return { ok: false, reason: 'build-throw', detail: errMsg(e), orderSensitive: true };
  }
  let tResult: TranspileResult;
  try {
    tResult = transpile(dsl);
  } catch (e) {
    return { ok: false, reason: 'transpile-throw', detail: errMsg(e), orderSensitive: false };
  }
  if (!tResult.ok) {
    return {
      ok: false,
      reason: 'transpile-fail',
      detail: tResult.errors.map((x) => `${x.code}:${x.message}`).join('; '),
      // UNKNOWN_REF có thể do consumer đứng trước producer (segment optimistic
      // trỏ tên điểm dựng-sau) — đáng thử lại với thứ tự topo.
      orderSensitive: tResult.errors.some((x) => x.code === 'UNKNOWN_REF'),
    };
  }
  return { ok: true, intents, dsl, tResult };
}

export function buildAndTranspile(intents: readonly IntentT[]): BuildAndTranspileResult {
  const first = attemptBuild(intents);
  if (first.ok || !first.orderSensitive) return first;
  const reordered = orderIntentsByDependency(intents);
  const sameOrder = reordered.every((it, i) => it === intents[i]);
  if (sameOrder) return first;
  const second = attemptBuild(reordered);
  return second.ok ? second : first;
}

export function tryDeterministicFigure(rawProblem: string): TryDeterministicResult {
  // Chuẩn hoá ký hiệu (Δ→tam giác, vòng tròn→đường tròn) MỘT lần để mọi stage
  // (rule, normalizeIntents, named-entity guard) thấy text nhất quán.
  const problem = normalizeProblemText(rawProblem);
  const det = runDeterministicIntents(problem);
  if (!det.ok) return { ok: false, reason: det.reason, coverage: det.coverage };

  // Cùng các stage chuẩn hoá như Track B (LLM) để 2 path hội tụ.
  const built = buildAndTranspile(
    resolveCircleNameCollisions(normalizeIntents(det.intents, problem)),
  );
  if (!built.ok) {
    return { ok: false, reason: built.reason, detail: built.detail, coverage: det.coverage };
  }
  const { intents, dsl, tResult } = built;

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
    figure: { intents: [...intents], dsl, transpile: tResult, verify: vReport, coverage: det.coverage },
  };
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
