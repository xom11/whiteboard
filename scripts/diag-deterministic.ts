// scripts/diag-deterministic.ts — chẩn đoán deterministic-first qua CHÍNH gate thật.
//   npx tsx scripts/diag-deterministic.ts                 (đề mặc định)
//   npx tsx scripts/diag-deterministic.ts probes.txt      (1 đề / dòng, # = comment)
import { readFileSync } from 'node:fs';
import { tryDeterministicFigure } from '../src/stamps/geometry-2d/ai/deterministic/tryDeterministicFigure';

const PROBLEMS: string[] = [
  'Cho tam giác ABC. Gọi M là trung điểm BC',
  'Cho tam giác ABC. Gọi G là trọng tâm tam giác ABC',
  'Cho tam giác ABC. Kẻ đường cao AH',
  'Cho hình vuông ABCD',
  'Cho đường tròn (O; 3)',
  'Cho tam giác ABC. Trên cạnh AB lấy điểm D sao cho AD = 2DB',
];

const fileArg = process.argv[2];
const problems: string[] = fileArg
  ? readFileSync(fileArg, 'utf8')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('#'))
  : PROBLEMS;

let det = 0;
let escalate = 0;
for (const p of problems) {
  const r = tryDeterministicFigure(p);
  if (!r.ok) {
    escalate++;
    console.log(`ESCALATE  [${r.reason}${r.detail ? ' ' + r.detail : ''}]  ${p}`);
    continue;
  }
  det++;
  const kinds = r.figure.intents
    .map((i: any) =>
      i.op +
      (i.constraint ? `/${i.constraint.kind}` : i.shape ? `/${i.shape}:${i.variant}` : i.spec ? `/${i.spec}` : i.style ? `/${i.style}` : i.kind ? `/${i.kind}` : ''),
    )
    .join(', ');
  console.log(`DET ${r.figure.verify.ok ? 'OK ' : 'VERIFY?'}  ${p}\n   ${kinds}`);
}
console.log(`\n=== ${det} deterministic-render, ${escalate} escalate ===`);
