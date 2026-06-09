// scripts/diag-dataset-80.ts — chạy tryDeterministicFigure trên từng bài của
// docs/datasets/80-bai-toan-hinh-hoc-lop-9.txt.
//   npx tsx scripts/diag-dataset-80.ts            (full block per Bài)
//   npx tsx scripts/diag-dataset-80.ts intro      (chỉ đoạn "Cho ..." trước câu 1)
import { readFileSync } from 'node:fs';
import { tryDeterministicFigure } from '../src/stamps/geometry-2d/ai/deterministic/tryDeterministicFigure';
import { tryPartialDeterministic } from '../src/stamps/geometry-2d/ai/deterministic/runDeterministicIntents';

const FILE = 'docs/datasets/80-bai-toan-hinh-hoc-lop-9.txt';
const mode = process.argv[2] === 'intro' ? 'intro' : 'full';

const raw = readFileSync(FILE, 'utf8');
const lines = raw.split('\n');

interface Bai {
  id: string;
  text: string;
}

const bai: Bai[] = [];
let cur: Bai | null = null;
const headRe = /^Bài\s+(\d+)[\.:]/;
for (const line of lines) {
  const m = line.match(headRe);
  if (m) {
    if (cur) bai.push(cur);
    cur = { id: m[1], text: line };
  } else if (cur) {
    if (line.includes('Các bài từ')) continue;
    cur.text += '\n' + line;
  }
}
if (cur) bai.push(cur);

function introOf(text: string): string {
  // lấy phần trước câu hỏi đánh số đầu tiên ("1." ở đầu dòng hoặc "Chứng minh:")
  const idx = text.search(/\n\s*1[\.\)]/);
  let head = idx >= 0 ? text.slice(0, idx) : text;
  // bỏ "Chứng minh:" cuối
  head = head.replace(/Chứng minh\s*:?\s*$/i, '').trim();
  return head;
}

let det = 0;
let escalate = 0;
const escReasons: Record<string, number> = {};
for (const b of bai) {
  const text = mode === 'intro' ? introOf(b.text) : b.text.replace(/^Bài\s+\d+[\.:]\s*/, '');
  const r = tryDeterministicFigure(text);
  if (!r.ok) {
    escalate++;
    escReasons[r.reason] = (escReasons[r.reason] ?? 0) + 1;
    console.log(`\nESCALATE Bài ${b.id}  [${r.reason}]${r.detail ? '\n   detail: ' + r.detail.slice(0, 300) : ''}`);
    if (process.env.VERBOSE) {
      const part = tryPartialDeterministic(text);
      const kinds = part.detIntents
        .map((i: any) => i.op + (i.constraint ? `/${i.constraint.kind}` : i.shape ? `/${i.shape}:${i.variant}` : i.spec ? `/${i.spec}` : i.kind ? `/${i.kind}` : ''))
        .join(', ');
      console.log('   intents:', kinds || '(none)');
      console.log('   uncovered:', part.uncovered.map((c: any) => c.text).join(' | ').slice(0, 400));
    }
    continue;
  }
  det++;
  const kinds = r.figure.intents
    .map((i: any) =>
      i.op +
      (i.constraint ? `/${i.constraint.kind}` : i.shape ? `/${i.shape}:${i.variant}` : i.spec ? `/${i.spec}` : i.style ? `/${i.style}` : i.kind ? `/${i.kind}` : ''),
    )
    .join(', ');
  console.log(`\nDET OK Bài ${b.id}\n   ${kinds}`);
}
console.log(`\n=== ${det}/${bai.length} deterministic, ${escalate} escalate (mode=${mode}) ===`);
console.log('reasons:', JSON.stringify(escReasons));
