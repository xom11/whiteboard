// src/stamps/geometry-2d/ai/deterministic/runDeterministicIntents.ts
//
// Track A orchestrator: rule engine → IntentT[] + coverage gate.
// Chỉ lo NLU; gate transpile/verify do router (buildFigureIntent) áp dụng sau.
import type { IntentT } from '../intent';
import { segmentClauses, computeCoverage, type Clause, type CoverageReport } from './coverage';
import { runRules } from '../rules/registry';
import { normalizeProblemText } from './normalizeText';
import { correctUserInput } from './correctUserInput';
import { countGeometryKeywords } from './vocabulary';

export type DetIntentResult =
  | { ok: true; intents: IntentT[]; coverage: CoverageReport }
  | {
      ok: false;
      reason: 'incomplete-coverage' | 'no-match';
      coverage: CoverageReport;
    };

interface Collected {
  /** Intent từ MỌI clause có rule claim, deduped theo JSON. */
  intents: IntentT[];
  coverage: CoverageReport;
  matchCount: number;
}

// Segment → rules → coverage → dedup. Dùng chung cho gate đầy đủ
// (runDeterministicIntents) lẫn partial (tryPartialDeterministic).
// Dedupe intent y hệt nhau: nhiều rule cùng tham chiếu 1 hình (vd "tam giác ABC"
// xuất hiện ở nhiều clause → triangle rule emit lặp; centers/cevian cũng cần nó).
function collectDeterministic(rawProblem: string): Collected {
  const problem = normalizeProblemText(correctUserInput(rawProblem));
  const clauses = segmentClauses(problem);
  const drawableClauses = clauses.filter((c) => c.hasGeometry);
  let drawableProblem = problem;
  for (const c of clauses) {
    if (c.hasGeometry) continue;
    // segmentClauses tách "(O; 3)" thành "(O" + "3)"; phần "3)" không tự có
    // keyword hình học nhưng vẫn cần giữ để các rule quét toàn đề parse đủ paren.
    if (/^\s*(?:\d+(?:[,.]\d+)?|[Rr])\s*\)/u.test(c.text)) continue;
    // CHỈ blank proof/locus clause CÓ geometry keyword (câu dài, gần như duy
    // nhất — "Chứng minh tứ giác BCDE nội tiếp"). KHÔNG blank fragment ngắn
    // không keyword ("AB", "AD", "AC = AE" tách từ "Chứng minh AD.AC=AE.AB"):
    // ".replace(c.text,' ')" replace occurrence ĐẦU TIÊN — "AB" sẽ nuốt "tam
    // giác ABC" → "tam giác  C", mất construction. Fragment không keyword vô hại
    // (không rule nào construct từ chúng) nên để nguyên.
    if (countGeometryKeywords(c.text) === 0) continue;
    drawableProblem = drawableProblem.replace(c.text, ' ');
  }
  const matches = runRules({ problem: drawableProblem, clauses: drawableClauses });
  const coverage = computeCoverage(clauses, matches);

  const seen = new Set<string>();
  const intents = matches
    .flatMap((m) => m.intents)
    .filter((i) => {
      const key = JSON.stringify(i);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  return { intents: boDinhNghiaChung(suaGiaoDiemThuHai(intents)), coverage, matchCount: matches.length };
}

// Ràng buộc "chung chung" của một điểm: chỉ nói điểm nằm TRÊN một hình (hoặc tự do).
const RANG_BUOC_CHUNG = new Set(['free', 'onCircle', 'onSegment']);

/**
 * Nhiều rule cùng định nghĩa MỘT điểm: builder lấy định nghĩa ĐẦU TIÊN (theo
 * priority) — rule chung priority cao (chord 71 "dây CD" → C, D onCircle; onCircle
 * 64) từng đè im lặng định nghĩa cụ thể đúng của rule priority thấp (C = giao thứ
 * hai của MD với (O), D thuộc cung lớn AB, tiếp điểm…). Khi một điểm vừa có ràng
 * buộc chung vừa có ràng buộc cụ thể ⇒ bỏ ràng buộc chung (thông tin của nó đã nằm
 * trong ràng buộc cụ thể: giao điểm với (O) thì hiển nhiên trên (O)).
 */
export function boDinhNghiaChung(intents: IntentT[]): IntentT[] {
  const cuThe = new Set<string>();
  for (const i of intents) {
    if (i.op === 'add-point' && !RANG_BUOC_CHUNG.has(i.constraint.kind)) cuThe.add(i.name);
  }
  if (cuThe.size === 0) return intents;
  return intents.filter(
    (i) => !(i.op === 'add-point' && RANG_BUOC_CHUNG.has(i.constraint.kind) && cuThe.has(i.name)),
  );
}

export function runDeterministicIntents(problem: string): DetIntentResult {
  const { intents, coverage, matchCount } = collectDeterministic(problem);

  if (matchCount === 0) return { ok: false, reason: 'no-match', coverage };
  if (!coverage.complete) return { ok: false, reason: 'incomplete-coverage', coverage };
  return { ok: true, intents, coverage };
}

export interface PartialDeterministicResult {
  /** Intent deterministic từ các clause đã được rule claim (deduped). */
  detIntents: IntentT[];
  /** Clause geo CHƯA được phủ — phần LLM cần bù (hybrid Phase 2). */
  uncovered: Clause[];
  coverage: CoverageReport;
  /**
   * true khi deterministic phủ MỘT PHẦN: có rule match + ≥1 intent NHƯNG coverage
   * CHƯA đầy đủ. Đây là điều kiện kích hoạt hybrid (Phase 2 gọi LLM bù `uncovered`
   * rồi mergeIntents). false khi: complete (Track A lo đủ) hoặc no-match/0 intent
   * (full LLM Track B).
   */
  hasPartial: boolean;
}

/**
 * Deterministic-only (KHÔNG LLM): thu intent phần đã phủ + clause còn thiếu, kể
 * cả khi coverage incomplete. Nền cho hybrid partial-coverage — Phase 2 sẽ gọi
 * LLM bù `uncovered` rồi `mergeIntents(detIntents, llmIntents)`.
 */
export function tryPartialDeterministic(problem: string): PartialDeterministicResult {
  const { intents, coverage, matchCount } = collectDeterministic(problem);
  return {
    detIntents: intents,
    uncovered: coverage.uncovered,
    coverage,
    hasPartial: matchCount > 0 && !coverage.complete && intents.length > 0,
  };
}

const goc = (circle: string) => circle.replace(/_c$/u, '');

/** Tên các điểm CHẮC CHẮN nằm trên từng đường tròn (theo tên gốc, bỏ hậu tố _c). */
function diemTrenDuongTron(intents: readonly IntentT[]): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  const them = (circle: string | undefined, ...names: (string | undefined)[]) => {
    if (!circle) return;
    const k = goc(circle);
    const set = out.get(k) ?? new Set<string>();
    for (const n of names) if (n) set.add(n);
    out.set(k, set);
  };
  for (const i of intents) {
    if (i.op === 'add-point') {
      const c = i.constraint;
      if (c.kind === 'onCircle' || c.kind === 'onArc' || c.kind === 'arcMidpoint' || c.kind === 'secondIntersection' || c.kind === 'tangencyPoint') them(c.circle, i.name);
      else if (c.kind === 'tangentPoint') them(c.circle, i.name);
      else if (c.kind === 'circleIntersection') { them(c.c1, i.name); them(c.c2, i.name); }
      else if (c.kind === 'circleSecondIntersection') { them(c.c1, i.name, c.exclude); them(c.c2, i.name, c.exclude); }
    } else if (i.op === 'draw-circle') {
      if (i.spec === 'through3') them(i.name, ...(i.points ?? []));
      else if (i.spec === 'diameter') them(i.name, ...(i.endpoints ?? []));
      else if (i.spec === 'centerThrough') them(i.name, i.through);
    }
  }
  // Tâm là trung điểm PQ và P trên đường tròn ⇒ Q (đối tâm) cũng trên đường tròn:
  // "O là trung điểm MC, vẽ (O) bán kính OC" ⇒ M ∈ (O).
  const trungDiem = new Map<string, [string, string]>();
  for (const i of intents) {
    if (i.op !== 'add-point' || i.constraint.kind !== 'midpoint') continue;
    const m = /^([A-Z])([A-Z])$/u.exec(i.constraint.of);
    if (m) trungDiem.set(i.name, [m[1], m[2]]);
  }
  for (const i of intents) {
    if (i.op !== 'draw-circle' || !i.center) continue;
    const pq = trungDiem.get(i.center);
    const set = out.get(goc(i.name));
    if (pq && set && (set.has(pq[0]) || set.has(pq[1]))) them(i.name, pq[0], pq[1]);
  }
  return out;
}

/**
 * "MC cắt (O) tại P": rule lấy `other` (giao thứ nhất đã biết) = chữ ĐẦU của đường
 * thẳng. Khi chữ đầu là điểm NGOÀI (M giao hai tiếp tuyến) còn chữ sau mới nằm trên
 * (O) thì JSXGraph "giao khác M" trả về một giao bất kỳ — có thể chính là C. Đổi
 * `other` sang đầu mút thực sự nằm trên đường tròn.
 */
export function suaGiaoDiemThuHai(intents: IntentT[]): IntentT[] {
  const tren = diemTrenDuongTron(intents);
  return intents.map((i) => {
    if (i.op !== 'add-point' || i.constraint.kind !== 'secondIntersection') return i;
    const c = i.constraint;
    const m = /^([A-Z])([A-Z])$/u.exec(c.line);
    if (!m) return i;
    const set = tren.get(goc(c.circle)) ?? new Set<string>();
    const khac = m[1] === c.other ? m[2] : m[2] === c.other ? m[1] : undefined;
    if (!khac || set.has(c.other) || !set.has(khac)) return i;
    return { ...i, constraint: { ...c, other: khac } } as IntentT;
  });
}
