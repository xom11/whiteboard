// scripts/extract-mohinh.mjs
// Trích bài từ md markitdown của "Chuyên đề các mô hình thường gặp và các bài
// toán tổng hợp hình học ôn thi vào lớp 10" (toanmath). Cấu trúc "Câu N:" — phần
// đề liệt kê trước, lời giải sau → dedupe theo số, GIỮ lần xuất hiện ĐẦU (đề).
//   node scripts/extract-mohinh.mjs [--write]
//
// Nguồn PDF (.work/pdf/, KHÔNG track git):
//   https://thcs.toanmath.com/thcs-pdf/chuyen-de-cac-mo-hinh-thuong-gap-va-cac-bai-toan-tong-hop-hinh-hoc-on-thi-vao-lop-10.pdf
import { readFileSync, writeFileSync } from 'node:fs';

const MD = '.work/pdf/mohinh.md';
const OUT = 'docs/datasets/mo-hinh-hinh-hoc-vao10.txt';

const lines = readFileSync(MD, 'utf8').split('\n');
const stripCell = (l) => l.replace(/^\s*\|/, '').replace(/\|/g, ' ').replace(/\s+/g, ' ').trim();
const isSep = (l) => /^\s*\|?\s*-{2,}/.test(l);
const headRe = /Câu\s+(\d+)\s*:/;

// Gom block theo "Câu N:" (mọi occurrence), text tới "Câu" kế.
const blocks = [];
let cur = null;
for (const raw of lines) {
  if (isSep(raw)) continue;
  const l = stripCell(raw);
  const m = l.match(headRe);
  if (m) {
    if (cur) blocks.push(cur);
    cur = { n: +m[1], text: l.slice(l.indexOf(m[0]) + m[0].length).trim() };
  } else if (cur) cur.text += ' ' + l;
}
if (cur) blocks.push(cur);

// Dedupe theo số — giữ block ĐẦU (đề bài, không phải lời giải).
const byNum = new Map();
for (const b of blocks) if (!byNum.has(b.n)) byNum.set(b.n, b);

// intro = trước "Lời giải"/"Hướng dẫn"/"Chứng minh"/câu hỏi con "a)"/"1)".
function intro(t) {
  const i = t.search(/Lời giải|Hướng dẫn|Chứng minh|Chứng tỏ|CMR|\b[a-d]\)|\b\d+\)/);
  return (i >= 0 ? t.slice(0, i) : t).replace(/\s+/g, ' ').trim();
}

const problems = [];
for (const [n, b] of [...byNum.entries()].sort((a, b2) => a[0] - b2[0])) {
  const s = intro(b.text);
  const caps = (s.match(/(?<![A-Za-z])[A-Z](?![A-Za-z])/g) || []).length;
  const geo = /tam giác|đường tròn|tứ giác|hình|nửa đường tròn/.test(s);
  if (geo && caps >= 3 && s.length >= 25 && s.length < 600) problems.push({ n, s });
}

console.log(`Trích ${problems.length} bài (từ ${byNum.size} số Câu).`);
problems.slice(0, 8).forEach((p) => console.log(`\n[${p.n}] ${p.s.slice(0, 130)}`));

if (process.argv.includes('--write')) {
  writeFileSync(OUT, problems.map((p) => `Câu ${p.n}: ${p.s}`).join('\n\n') + '\n', 'utf8');
  console.log(`\n→ wrote ${OUT}`);
}
