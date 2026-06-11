// scripts/dbg-trace.ts — trace clause→rule→intent→transpile cho 1 đề.
//   npx tsx scripts/dbg-trace.ts "<intro text>"
import { segmentClauses } from '../src/stamps/geometry-2d/ai/deterministic/coverage';
import { runRules } from '../src/stamps/geometry-2d/ai/rules/registry';
import { normalizeProblemText } from '../src/stamps/geometry-2d/ai/deterministic/normalizeText';
import { countGeometryKeywords } from '../src/stamps/geometry-2d/ai/deterministic/vocabulary';
import { tryDeterministicFigure } from '../src/stamps/geometry-2d/ai/deterministic/tryDeterministicFigure';

const raw = process.argv[2];
const problem = normalizeProblemText(raw);
const clauses = segmentClauses(problem);

let drawableProblem = problem;
for (const c of clauses) {
  if (c.hasGeometry) continue;
  if (/^\s*(?:\d+(?:[,.]\d+)?|[Rr])\s*\)/u.test(c.text)) continue;
  if (countGeometryKeywords(c.text) === 0) continue;
  drawableProblem = drawableProblem.replace(c.text, ' ');
}
const drawable = clauses.filter((c) => c.hasGeometry);
const matches = runRules({ problem: drawableProblem, clauses: drawable });

const claimed = new Set<string>();
for (const m of matches) for (const id of m.clauseIds) claimed.add(id);

console.log('=== CLAUSES ===');
for (const c of clauses) {
  const ms = matches.filter((m) => m.clauseIds.includes(c.id));
  const tag = !c.hasGeometry ? '[no-geo]' : claimed.has(c.id) ? '✓' : '✗MISS';
  console.log(`${tag} [${c.id}] ${c.text.slice(0, 90)}`);
  for (const m of ms) console.log(`      ← ${m.ruleId}: ${m.intents.map((i: any) => i.op + (i.constraint?.kind ?? i.shape ?? i.spec ?? i.kind ?? '')).join(', ')}`);
}

console.log('\n=== FULL RESULT ===');
const r = tryDeterministicFigure(raw);
if (r.ok) {
  console.log('OK  points:', r.figure.dsl.points.map((p: any) => p.name).join(','));
} else {
  console.log('FAIL', r.reason, '::', (r as any).detail ?? '');
}
