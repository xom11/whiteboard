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

  const intents = matches.flatMap((m) => m.intents);
  return { ok: true, intents, coverage };
}
