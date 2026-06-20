// scripts/extract-chuyen2026.mjs
// Trích bài "vẽ hình" từ md markitdown của bộ "Một số bài toán hình học phẳng thi
// vào lớp 10 chuyên 2026-2027" (toanmath). Mỗi bài bắt đầu bằng "Cho <hình>";
// phần dựng hình = các dòng PROSE (không phải ô bảng | | của lời giải) tới khi
// gặp lời giải / câu hỏi con / bài kế.
//   node scripts/extract-chuyen2026.mjs [--write]
//
// Nguồn PDF (tải về .work/pdf/, KHÔNG track git):
//   https://thcs.toanmath.com/thcs-pdf/mot-so-bai-toan-hinh-hoc-phang-thi-vao-lop-10-chuyen-nam-hoc-2026-2027.pdf
// Regen: curl -sL <pdf> -o .work/pdf/chuyen2026.pdf && .venv/bin/markitdown
//   .work/pdf/chuyen2026.pdf -o .work/pdf/chuyen2026.md && node scripts/extract-chuyen2026.mjs --write
import { readFileSync, writeFileSync } from 'node:fs';

const MD = '.work/pdf/chuyen2026.md';
const OUT = 'docs/datasets/hinh-phang-chuyen-2026.txt';

const raw = readFileSync(MD, 'utf8');

// GLUE-SPLITTER: PDF math-typeset của bộ này nuốt dấu cách hàng loạt
// ("ChotamgiácABC nhọn(AB<AC)cóđườngtrònnộitiếp(I)tiếpxúcBC,CA,AB").
// Tách tại ranh giới TIN CẬY: (1) từ-vựng hình học dính nhau theo whitelist,
// (2) keyword↔nhãn-HOA, (3) chữ-thường↔'(' và ')'↔chữ. KHÔNG word-segment đa từ
// tuỳ ý (tránh phá nhãn). Áp per-line trước khi gom bài.
const GLUE_WORDS = [
  'Cho', 'tam', 'giác', 'đường', 'tròn', 'nội', 'tiếp', 'ngoại', 'xúc', 'có',
  'nhọn', 'cân', 'vuông', 'phân', 'trung', 'điểm', 'cạnh', 'kính', 'dây', 'cung',
  'tứ', 'hình', 'nửa', 'đoạn', 'góc', 'với', 'và', 'tại', 'lấy', 'gọi', 'kẻ', 'vẽ',
];
const GLUE_RE = new RegExp(`(${GLUE_WORDS.join('|')})(?=${GLUE_WORDS.join('|')})`, 'gu');
function deglue(line) {
  let s = line;
  // chèn cách giữa 2 từ-khoá dính (lặp tới khi ổn định — chuỗi dài nhiều ranh giới)
  for (let k = 0; k < 6; k++) {
    const next = s.replace(GLUE_RE, '$1 ');
    if (next === s) break;
    s = next;
  }
  // keyword↔nhãn HOA: "giácABC"→"giác ABC", "xúcBC"→"xúc BC"
  s = s.replace(/(giác|tròn|tiếp|xúc|kính|điểm|đoạn|cạnh|dây|cung|tại|qua)([A-Z])/gu, '$1 $2');
  // chữ-thường↔'(' và ')'↔chữ: "nhọn("→"nhọn (", ")có"→") có"
  s = s.replace(/(\p{Ll})\(/gu, '$1 (').replace(/\)(\p{L})/gu, ') $1');
  return s;
}

const lines = raw.split('\n').map(deglue);

const isTable = (l) => /^\s*\|/.test(l) || /^\s*\|?\s*-{2,}/.test(l);
const isProblemStart = (l) => /^Cho\s+(tam giác|đường tròn|hình|tứ giác|nửa|đoạn|góc|điểm)/.test(l.trim());
// dừng phần dựng hình: lời giải / câu hỏi con (1) hoặc a)/b)/c) / "Chứng minh"/"CMR"/"Tính"/kết luận GTLN
const isStop = (l) =>
  /^\s*(Lời giải|Bài|Câu|Đề|HẾT|Hết)\b/.test(l) ||
  /^\s*\d+[).]\s/.test(l) ||
  /^\s*[a-d][).]\s/.test(l) ||
  /(Chứng minh|Chứng tỏ|CMR|Tìm giá trị|Tính|Vậy giá trị|dấu bằng xảy ra)\b/i.test(l);

const problems = [];
let i = 0;
while (i < lines.length) {
  if (!isProblemStart(lines[i])) { i++; continue; }
  const buf = [lines[i].trim()];
  i++;
  while (i < lines.length) {
    const l = lines[i];
    if (isProblemStart(l)) break;
    if (isStop(l)) break; // CẮT phần dựng ở câu-con/lời giải đầu tiên (chỉ giữ lead "Cho")
    if (isTable(l)) { i++; continue; } // bảng xen giữa lead → bỏ ô, tiếp tục
    if (l.trim()) buf.push(l.trim());
    i++;
  }
  // gộp + dọn: bỏ ký hiệu nhiễu LaTeX nhẹ, prime cong.
  let text = buf
    .join(' ')
    .replace(/\(cid:\d+\)/g, ' ') // glyph PUA OCR junk
    .replace(/\s+/g, ' ')
    .trim();
  // giữ bài có đủ nhãn + danh từ hình học, độ dài hợp lý
  const caps = (text.match(/(?<![A-Za-z])[A-Z](?![A-Za-z])/g) || []).length;
  if (text.length >= 25 && caps >= 3) problems.push(text);
}

console.log(`Trích ${problems.length} bài dựng hình.`);
problems.slice(0, 8).forEach((p, k) => console.log(`\n[${k + 1}] ${p.slice(0, 140)}`));

if (process.argv.includes('--write')) {
  const out = problems.map((p, k) => `Câu ${k + 1}: ${p}`).join('\n\n');
  writeFileSync(OUT, out + '\n', 'utf8');
  console.log(`\n→ wrote ${OUT}`);
}
