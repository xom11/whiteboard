// src/stamps/geometry-2d/ai/deterministic/runDeterministicIntents.ts
//
// Track A orchestrator: rule engine → IntentT[] + coverage gate.
// Chỉ lo NLU; gate transpile/verify do router (buildFigureIntent) áp dụng sau.
import type { IntentT } from '../intent';
import { segmentClauses, computeCoverage, type Clause, type CoverageReport } from './coverage';
import { runRules } from '../rules/registry';
import { normalizeProblemText } from './normalizeText';
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
  const problem = normalizeProblemText(rawProblem);
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
  return { intents, coverage, matchCount: matches.length };
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
