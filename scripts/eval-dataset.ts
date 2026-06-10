// scripts/eval-dataset.ts
//
// Đo coverage deterministic (KHÔNG LLM) trên dataset bài tập hình học.
//   npx tsx scripts/eval-dataset.ts [path] [--verbose] [--only=3,7,12]
//
// Mỗi "Câu N: …" = 1 problem; chạy tryDeterministicFigure trên TOÀN văn bản
// (coverage gate tự loại clause "Chứng minh/Tính/Tìm"). In HIT/MISS + lý do.
import { readFileSync } from 'node:fs';
import { tryDeterministicFigure } from '../src/stamps/geometry-2d/ai/deterministic/tryDeterministicFigure';

const path = process.argv[2]?.startsWith('--')
  ? 'docs/datasets/mot-so-bai-tap-chon-loc-hinh-hoc-phang.txt'
  : process.argv[2] ?? 'docs/datasets/mot-so-bai-tap-chon-loc-hinh-hoc-phang.txt';
const verbose = process.argv.includes('--verbose');
const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const only = onlyArg ? new Set(onlyArg.slice(7).split(',').map(Number)) : null;

const raw = readFileSync(path, 'utf8');
// Split theo "Câu N:" — giữ số.
const parts = raw.split(/(?=^Câu\s+\d+\s*:)/m).map((s) => s.trim()).filter(Boolean);

interface Row { n: number; ok: boolean; reason?: string; detail?: string; uncovered?: string[]; }
const rows: Row[] = [];

for (const part of parts) {
  const mNum = /^Câu\s+(\d+)\s*:/.exec(part);
  if (!mNum) continue;
  const n = Number(mNum[1]);
  if (only && !only.has(n)) continue;
  const text = part.replace(/^Câu\s+\d+\s*:\s*/, '');
  let res: any;
  try {
    res = tryDeterministicFigure(text);
  } catch (e: any) {
    rows.push({ n, ok: false, reason: 'THROW', detail: String(e?.message ?? e) });
    continue;
  }
  if (res.ok) {
    rows.push({ n, ok: true });
  } else {
    rows.push({
      n, ok: false, reason: res.reason, detail: res.detail,
      uncovered: res.coverage?.uncovered?.map((c: any) => c.text),
    });
  }
}

rows.sort((a, b) => a.n - b.n);
const hit = rows.filter((r) => r.ok).length;
for (const r of rows) {
  if (r.ok) {
    console.log(`✅ Câu ${r.n}`);
  } else {
    console.log(`❌ Câu ${r.n}  [${r.reason}]${r.detail ? ' ' + r.detail : ''}`);
    if (verbose && r.uncovered?.length) {
      for (const u of r.uncovered) console.log(`      ↳ ${u}`);
    }
  }
}
console.log(`\n=== ${hit}/${rows.length} HIT (${(100 * hit / rows.length).toFixed(0)}%) ===`);
