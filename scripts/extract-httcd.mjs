// scripts/extract-httcd.mjs
// Trích bài DỰNG HÌNH từ md markitdown của "Bài tập Hình học 9 theo chủ đề"
// (toanmath, 130tr). Headers "Bài N." / "Bài N:" lặp theo chương → đánh số tuần
// tự. Lọc bài có đường tròn/tiếp tuyến (dựng hình) — bỏ bài tính toán thuần.
//   node scripts/extract-httcd.mjs [--write]
//
// Nguồn PDF (.work/pdf/, KHÔNG track git):
//   https://thcs.toanmath.com/thcs-pdf/bai-tap-hinh-hoc-9-theo-chu-de.pdf
import { readFileSync, writeFileSync } from 'node:fs';

const MD = '.work/pdf/httcd.md';
const OUT = 'docs/datasets/hinh-hoc-9-chu-de.txt';

const lines = readFileSync(MD, 'utf8').split('\n');
const stripCell = (l) => l.replace(/^\s*\|/, '').replace(/\|/g, ' ').replace(/\s+/g, ' ').trim();
const isSep = (l) => /^\s*\|?\s*-{2,}/.test(l);
const headRe = /^Bài\s+\d+\s*[.:]/;

const blocks = [];
let cur = null;
for (const raw of lines) {
  if (isSep(raw)) continue;
  const l = stripCell(raw);
  if (headRe.test(l)) {
    if (cur) blocks.push(cur);
    cur = { text: l.replace(headRe, '').trim() };
  } else if (cur) cur.text += ' ' + l;
}
if (cur) blocks.push(cur);

// intro = trước lời giải / câu hỏi con / "Tính"/"Chứng minh".
function intro(t) {
  const i = t.search(/Lời giải|Hướng dẫn|Chứng minh|Chứng tỏ|CMR|Tính|\b[a-d]\)|\b\d+\)/);
  return (i >= 0 ? t.slice(0, i) : t).replace(/\s+/g, ' ').trim();
}

// Dựng hình: có đường tròn/tiếp tuyến/cung HOẶC đa giác + ≥4 nhãn; KHÔNG phải bài
// tính thuần (tỉ số/độ dài mở đầu). Lọc chặt để dataset sạch.
const CONSTRUCT = /đường tròn|tiếp tuyến|nửa đường tròn|cung|dây|đường kính/;
const problems = [];
for (const b of blocks) {
  const s = intro(b.text);
  const caps = (s.match(/(?<![A-Za-z])[A-Z](?![A-Za-z])/g) || []).length;
  if (s.length < 25 || s.length > 600) continue;
  if (!CONSTRUCT.test(s)) continue; // chỉ giữ bài có yếu tố đường tròn
  if (caps < 3) continue;
  problems.push(s);
}

console.log(`Trích ${problems.length} bài dựng hình (từ ${blocks.length} block).`);
problems.slice(0, 8).forEach((p, k) => console.log(`\n[${k + 1}] ${p.slice(0, 120)}`));

if (process.argv.includes('--write')) {
  writeFileSync(OUT, problems.map((p, k) => `Câu ${k + 1}: ${p}`).join('\n\n') + '\n', 'utf8');
  console.log(`\n→ wrote ${OUT}`);
}
