// scripts/diag-t02.ts — chạy tryDeterministicFigure trên từng bài
// docs/datasets/T02_problems.txt (olympiad). Header: "Ví dụ N." | "Bài toán N".
//   npx tsx scripts/diag-t02.ts          (toàn bộ đề, 1 dòng/bài)
import { readFileSync } from 'node:fs';
import { tryDeterministicFigure } from '../src/stamps/geometry-2d/ai/deterministic/tryDeterministicFigure';
import { tryPartialDeterministic } from '../src/stamps/geometry-2d/ai/deterministic/runDeterministicIntents';

const FILE = 'docs/datasets/T02_problems.txt';
const raw = readFileSync(FILE, 'utf8');
const headRe = /^(Ví dụ|Bài toán)\s+(\d+)/;

interface Bai { id: string; text: string }
const bai: Bai[] = [];
for (const line of raw.split('\n')) {
  const m = line.match(headRe);
  if (m) bai.push({ id: `${m[1] === 'Ví dụ' ? 'VD' : 'BT'}${m[2]}`, text: line });
}

let det = 0;
const hits: string[] = [];
const misses: string[] = [];
const reasons: Record<string, number> = {};
const verbose = process.argv.includes('-v');
for (const b of bai) {
  // bỏ tiền tố header để rule không vướng "Ví dụ 1." / "(APMO 2013)".
  const text = b.text.replace(headRe, '').replace(/^\s*[.):]?\s*(\([^)]*\)\.?)?\s*/, '').trim();
  const r = tryDeterministicFigure(text);
  if (r.ok) {
    det++;
    hits.push(b.id);
    if (verbose) console.log(`HIT ${b.id}`);
    continue;
  }
  misses.push(b.id);
  reasons[r.reason] = (reasons[r.reason] ?? 0) + 1;
  if (verbose) {
    const part = tryPartialDeterministic(text);
    console.log(`\nMISS ${b.id} [${r.reason}]${r.detail ? ' ' + r.detail.slice(0, 160) : ''}`);
    console.log('  uncovered:', part.uncovered.map((c: any) => c.text).join(' | ').slice(0, 300));
  }
}

console.log(`\n===== T02 (${bai.length} bài) =====`);
console.log(`HIT (${det}/${bai.length}): ${hits.join(', ')}`);
console.log(`MISS (${misses.length}): ${misses.join(', ')}`);
console.log('reasons:', JSON.stringify(reasons));
