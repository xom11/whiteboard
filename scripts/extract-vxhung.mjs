// scripts/extract-vxhung.mjs
// Trích phần DỰNG HÌNH từ md markitdown của "Tài liệu luyện thi vào lớp 10 môn
// Toán phần Hình học - Vũ Xuân Hưng" (toanmath). Mỗi bài: header "Bài N: Đề thi
// vào 10 <tỉnh>" → statement "Cho ..." (nhiều dòng prose) → STOP ở câu hỏi/lời
// giải ("Chứng minh"/"HƯỚNG DẪN GIẢI"/"a)"/bảng "|").
//   node scripts/extract-vxhung.mjs [--write]
//
// Nguồn PDF (.work/pdf/, KHÔNG track git):
//   https://thcs.toanmath.com/thcs-pdf/tai-lieu-luyen-thi-vao-lop-10-mon-toan-phan-hinh-hoc-vu-xuan-hung.pdf
// Regen: tải pdf → .venv/bin/markitdown vxhung.pdf -o vxhung.md → node script --write
import { readFileSync, writeFileSync } from 'node:fs';

const MD = '.work/pdf/vxhung.md';
const OUT = 'docs/datasets/luyen-thi-vao10-hinhhoc-vxhung.txt';
const raw = readFileSync(MD, 'utf8');

// GLUE-SPLITTER (giống chuyen2026): tách ranh giới TIN CẬY.
const GLUE = ['Cho','tam','giác','đường','tròn','nội','tiếp','ngoại','xúc','có',
  'nhọn','cân','vuông','phân','trung','điểm','cạnh','kính','dây','cung','tứ',
  'hình','nửa','đoạn','góc','với','và','tại','lấy','gọi','kẻ','vẽ'];
const GLUE_RE = new RegExp(`(${GLUE.join('|')})(?=${GLUE.join('|')})`, 'gu');
function deglue(s) {
  for (let k = 0; k < 6; k++) { const n = s.replace(GLUE_RE, '$1 '); if (n === s) break; s = n; }
  return s
    .replace(/(giác|tròn|tiếp|xúc|kính|điểm|đoạn|cạnh|dây|cung|tại|qua|nội)([A-Z])/gu, '$1 $2')
    .replace(/(\p{Ll})\(/gu, '$1 (').replace(/\)(\p{L})/gu, ') $1')
    .replace(/\s+/g, ' ').trim();
}

// dòng footer/nhiễu trang → STRIP (không cắt câu, vì statement có thể tiếp trang sau)
const isFooter = (l) => /LUYỆN THI VÀO LỚP 10|^Trang\s*\d+|Vũ Xuân Hưng|^\s*\d+\s*$/.test(l);
const isTable = (l) => /^\s*\|/.test(l);
// bắt đầu 1 bài = câu "Cho <hình>" hoặc "Từ điểm ... đường tròn"
const isStart = (l) =>
  /^Cho\s+(tam giác|đường tròn|tứ giác|hình|nửa|đoạn|góc|điểm|hai|ba|\(|nửa đường)/.test(l) ||
  /^Từ\s+(điểm|một điểm)\s+[A-Z].*(đường tròn|tiếp tuyến)/.test(l);
// kết thúc phần dựng hình
const isStop = (l) =>
  /^(Chứng minh|CMR|C\/m|Tính|Hỏi|Tìm|Hướng dẫn|HƯỚNG DẪN|Lời giải|Giải\b|Gọi ý|Bài\s*\d|Câu\s*\d)/.test(l) ||
  /^(a\)|b\)|c\)|d\)|[1-9]\)|[1-9]\/|[1-9]\.)/.test(l) || isTable(l);

const lines = raw.split('\n').map((l) => l.trim());
const probs = [];
let cur = null;
for (const l of lines) {
  if (isFooter(l)) continue;
  if (isStart(l)) { if (cur) probs.push(cur); cur = [l]; continue; }
  if (cur) {
    if (isStop(l)) { probs.push(cur); cur = null; continue; }
    if (l) cur.push(l);
  }
}
if (cur) probs.push(cur);

// gom + lọc: phải có ≥2 marker hình học, độ dài hợp lý, không phải trùng
const seen = new Set();
const out = [];
for (const p of probs) {
  let text = deglue(p.join(' '));
  if (text.length < 30 || text.length > 600) continue;
  const markers = (text.match(/tam giác|đường tròn|tứ giác|tiếp tuyến|đường kính|dây|cung|trung điểm|tiếp điểm|giao điểm|⊥|vuông góc/gu) || []).length;
  if (markers < 2) continue;
  const key = text.slice(0, 50);
  if (seen.has(key)) continue;
  seen.add(key);
  out.push(text);
}

const body = out.map((t, i) => `Câu ${i + 1}: ${t}`).join('\n\n') + '\n';
console.log('problems extracted:', out.length);
out.slice(0, 6).forEach((t, i) => console.log(`\n[${i + 1}] ${t.slice(0, 120)}`));
if (process.argv.includes('--write')) { writeFileSync(OUT, body); console.log('\nWROTE', OUT); }
