// scripts/gen-intent-corpus.ts
// Sinh corpus {problem, intents} từ probes render deterministic — đóng băng làm
// golden input cho intentToDsl.golden.test.ts. Chạy 1 lần TRƯỚC refactor, commit JSON.
//   npx tsx scripts/gen-intent-corpus.ts
import { readFileSync, writeFileSync } from 'node:fs';
// Path giống hệt scripts/diag-deterministic.ts (cùng API tryDeterministicFigure).
import { tryDeterministicFigure } from '../src/stamps/geometry-2d/ai/deterministic/tryDeterministicFigure';

const probeFile = 'scripts/probes-adversarial.txt';
const lines = readFileSync(probeFile, 'utf8')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'));

const corpus: { problem: string; intents: unknown[] }[] = [];
for (const problem of lines) {
  const r = tryDeterministicFigure(problem);
  if (r.ok && r.figure?.intents?.length) {
    corpus.push({ problem, intents: r.figure.intents });
  }
}
const out = 'src/stamps/geometry-2d/ai/__tests__/__fixtures__/intent-corpus.generated.json';
writeFileSync(out, JSON.stringify(corpus, null, 2) + '\n');
console.log(`Wrote ${corpus.length} cases → ${out}`);
