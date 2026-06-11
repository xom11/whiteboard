// scripts/dbg-bai.ts — trace 1 bài theo dataset+id từ .work/escalations.json.
//   npx tsx scripts/dbg-bai.ts son123 4
import { readFileSync } from 'node:fs';
import { segmentClauses } from '../src/stamps/geometry-2d/ai/deterministic/coverage';
import { runRules } from '../src/stamps/geometry-2d/ai/rules/registry';
import { normalizeProblemText } from '../src/stamps/geometry-2d/ai/deterministic/normalizeText';
import { countGeometryKeywords } from '../src/stamps/geometry-2d/ai/deterministic/vocabulary';
import { tryDeterministicFigure } from '../src/stamps/geometry-2d/ai/deterministic/tryDeterministicFigure';

const [ds, id] = [process.argv[2], process.argv[3]];
const rows = JSON.parse(readFileSync('.work/escalations.json', 'utf8'));
const row = rows.find((r: any) => r.dataset === ds && r.id === id);
if (!row) { console.log('not found'); process.exit(1); }
const raw = row.intro as string;
console.log('INTRO:', raw, '\n');

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
for (const m of matches) for (const cid of m.clauseIds) claimed.add(cid);

for (const c of clauses) {
  const ms = matches.filter((m) => m.clauseIds.includes(c.id));
  const tag = !c.hasGeometry ? '[no-geo]' : claimed.has(c.id) ? '✓' : '✗MISS';
  console.log(`${tag} [${c.id}] ${c.text.slice(0, 95)}`);
  for (const m of ms) console.log(`      ← ${m.ruleId}: ${m.intents.map((i: any) => i.op + '/' + (i.constraint?.kind ?? i.shape ?? i.spec ?? i.kind ?? '?') + (i.name ? '=' + i.name : '')).join(', ')}`);
}
const r = tryDeterministicFigure(raw);
console.log('\nRESULT:', r.ok ? 'OK ' + (r as any).figure.dsl.points.map((p: any) => p.name).join(',') : r.reason + ' :: ' + ((r as any).detail ?? ''));
