// scripts/dbg-bai-3d.ts — trace một bài từ escalations-3d.json.
//   npx tsx scripts/dbg-bai-3d.ts <dataset> <id>
//   Ví dụ: npx tsx scripts/dbg-bai-3d.ts ss-thietdien 1
import { readFileSync } from 'node:fs';
import { segmentClauses3D } from '../src/stamps/geometry-3d/ai/deterministic/coverage3d';
import { runRules3D } from '../src/stamps/geometry-3d/ai/rules/registry';
import { tryDeterministicFigure3d } from '../src/stamps/geometry-3d/ai/deterministic/tryDeterministicFigure3d';

const [ds, id] = [process.argv[2], process.argv[3]];
if (!ds || !id) {
  console.error('Usage: npx tsx scripts/dbg-bai-3d.ts <dataset> <id>');
  process.exit(1);
}

let rows: any[];
try {
  rows = JSON.parse(readFileSync('.work/escalations-3d.json', 'utf8'));
} catch {
  console.error('Chạy diag-all-3d.ts trước để tạo .work/escalations-3d.json');
  process.exit(1);
}

const row = rows.find((r: any) => r.dataset === ds && String(r.id) === String(id));
if (!row) {
  console.log(`Không tìm thấy: dataset=${ds} id=${id}`);
  process.exit(1);
}

const intro = row.intro as string;
console.log('─'.repeat(60));
console.log('DATASET:', ds, '  ID:', id, '  TIER:', row.tier);
console.log('INTRO:', intro);
console.log('─'.repeat(60));

const clauses = segmentClauses3D(intro);
const geo = clauses.filter((c) => c.hasGeometry);
const matches = runRules3D({ problem: intro, clauses: geo });

for (const c of clauses) {
  const claimed = matches.filter((m) => m.clauseIds.includes(c.id));
  const tag = !c.hasGeometry ? '[no-geo]' : claimed.length ? '✓' : '✗MISS';
  console.log(tag, `[${c.id}]`, c.text);
  for (const m of claimed) {
    for (const i of m.intents) {
      console.log('    →', JSON.stringify(i));
    }
  }
}

console.log('─'.repeat(60));
const r = tryDeterministicFigure3d(intro);
if (r.ok) {
  const labels = Object.values(r.state.objects as Record<string, any>)
    .map((o) => o.label)
    .filter(Boolean)
    .join(', ');
  console.log('RESULT: OK  objects:', labels);
} else {
  console.log('RESULT: FAIL', r.reason, '::', r.detail ?? '');
}
