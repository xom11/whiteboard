// scripts/gen-mutation-fixture.ts — chọn ~40 đề đã-FULL, stratified theo dataset,
// ghi fixture committed cho mutation test. Xác định (sort + lấy đều), không RNG.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

interface Esc { dataset: string; id: string; intro: string; ok: boolean }
const OUT = 'src/stamps/geometry-2d/ai/deterministic/__tests__/fixtures/full-problems.json';
const TARGET = 40;

const all: Esc[] = JSON.parse(readFileSync('.work/escalations.json', 'utf8'));
const full = all.filter((e) => e.ok && e.intro && e.intro.trim().length > 20);

// nhóm theo dataset, sort ổn định, lấy round-robin tới TARGET.
const byDs = new Map<string, Esc[]>();
for (const e of full) {
  if (!byDs.has(e.dataset)) byDs.set(e.dataset, []);
  byDs.get(e.dataset)!.push(e);
}
for (const arr of byDs.values()) arr.sort((a, b) => a.id.localeCompare(b.id));
const datasets = [...byDs.keys()].sort();

const picked: Esc[] = [];
let idx = 0;
while (picked.length < TARGET) {
  let progressed = false;
  for (const ds of datasets) {
    const arr = byDs.get(ds)!;
    if (idx < arr.length) {
      picked.push(arr[idx]);
      progressed = true;
      if (picked.length >= TARGET) break;
    }
  }
  if (!progressed) break;
  idx++;
}

const fixture = picked.map((e) => ({ dataset: e.dataset, id: e.id, text: e.intro.trim() }));
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(fixture, null, 2) + '\n');
console.log(`Ghi ${fixture.length} đề FULL vào ${OUT}`);
