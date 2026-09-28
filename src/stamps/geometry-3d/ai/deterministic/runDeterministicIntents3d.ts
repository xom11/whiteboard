import type { Intent3DT } from '../intent';
import { segmentClauses3D, computeCoverage3D, type CoverageReport3D, type Clause3D } from './coverage3d';
import { runRules3D } from '../rules/registry';
import { normalizeProblem3d } from './normalize3d';

function dedup(intents: Intent3DT[]): Intent3DT[] {
  const seen = new Set<string>();
  return intents.filter((i) => {
    const k = JSON.stringify(i);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export type RunDeterministicResult3D =
  | { ok: true; intents: Intent3DT[]; coverage: CoverageReport3D }
  | { ok: false; reason: 'no-match' | 'incomplete-coverage'; coverage: CoverageReport3D };

/**
 * Chạy toàn bộ rule engine 3D trên `problem`.
 * Trả về intents nếu coverage đầy đủ, ngược lại trả lý do thất bại.
 */
export function runDeterministicIntents3d(problemRaw: string, solidPref?: 'refine' | 'khoi'): RunDeterministicResult3D {
  // Chữ Việt dạng TỔ HỢP (NFD: "i" + dấu huyền rời — gặp khi copy từ PDF/web/macOS) làm MỌI regex
  // rule trượt ("hình" ≠ "hình"). Chuẩn hoá NFC một lần ở cửa vào.
  const problem = normalizeProblem3d(problemRaw);
  const clauses = segmentClauses3D(problem);
  const geo = clauses.filter((c) => c.hasGeometry);

  const matches = runRules3D({ problem, clauses: geo, solidPref });

  if (matches.length === 0) {
    const coverage = computeCoverage3D(clauses, []);
    return { ok: false, reason: 'no-match', coverage };
  }

  const claimedIds = matches.flatMap((m) => m.clauseIds);
  const coverage = computeCoverage3D(clauses, claimedIds);

  if (!coverage.complete) {
    return { ok: false, reason: 'incomplete-coverage', coverage };
  }

  const intents = dedup(matches.flatMap((m) => m.intents));
  return { ok: true, intents, coverage };
}

/**
 * Trả về phần deterministic đã phủ + clause chưa phủ (cho hybrid partial-coverage).
 */
export function tryPartial3d(problemRaw: string): {
  detIntents: Intent3DT[];
  uncovered: Clause3D[];
  coverage: CoverageReport3D;
} {
  const problem = normalizeProblem3d(problemRaw);
  const clauses = segmentClauses3D(problem);
  const geo = clauses.filter((c) => c.hasGeometry);
  const matches = runRules3D({ problem, clauses: geo });
  const claimedIds = matches.flatMap((m) => m.clauseIds);
  const coverage = computeCoverage3D(clauses, claimedIds);
  const detIntents = dedup(matches.flatMap((m) => m.intents));
  return { detIntents, uncovered: coverage.uncovered, coverage };
}
