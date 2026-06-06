// src/stamps/geometry-2d/ai/deterministic/runDeterministicIntents.ts
//
// Track A orchestrator: rule engine → IntentT[] + coverage gate.
// Chỉ lo NLU; gate transpile/verify do router (buildFigureIntent) áp dụng sau.
import type { IntentT } from '../intent';
import { segmentClauses, computeCoverage, type CoverageReport } from './coverage';
import { runRules } from '../rules/registry';

export type DetIntentResult =
  | { ok: true; intents: IntentT[]; coverage: CoverageReport }
  | {
      ok: false;
      reason: 'incomplete-coverage' | 'no-match';
      coverage: CoverageReport;
    };

export function runDeterministicIntents(problem: string): DetIntentResult {
  const clauses = segmentClauses(problem);
  const matches = runRules({ problem, clauses });
  const coverage = computeCoverage(clauses, matches);

  if (matches.length === 0) return { ok: false, reason: 'no-match', coverage };
  if (!coverage.complete) return { ok: false, reason: 'incomplete-coverage', coverage };

  // Dedupe intent y hệt nhau: nhiều rule cùng tham chiếu 1 hình (vd "tam giác ABC"
  // xuất hiện ở nhiều clause → triangle rule emit lặp; centers/cevian cũng cần nó).
  const seen = new Set<string>();
  const intents = matches
    .flatMap((m) => m.intents)
    .filter((i) => {
      const key = JSON.stringify(i);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  return { ok: true, intents, coverage };
}
