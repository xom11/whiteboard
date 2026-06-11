#!/usr/bin/env node
// Trích bài toán "vẽ hình" từ hinh_9_full.md (markitdown của PDF Nguyễn Ngọc Sơn)
// rồi NỐI vào docs/datasets/cac-chuyen-de-va-bai-tap-tong-hop-hinh-hoc-9.txt (Bài 21+).
// Chạy: node scripts/extract-hinh9-full.mjs [--write]
//   không --write: in preview ra stdout (review trước)
//   --write     : append thật vào dataset
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const MD = path.join(ROOT, 'hinh_9_full.md');
const DATASET = path.join(ROOT, 'docs/datasets/cac-chuyen-de-va-bai-tap-tong-hop-hinh-hoc-9.txt');
const WRITE = process.argv.includes('--write');

const md = fs.readFileSync(MD, 'utf8');
const existing = fs.readFileSync(DATASET, 'utf8');

const headRe = /^(Bài toán|Ví dụ)\s+(\d+)\s*[\.\)]?/;

// ký tự thường tiếng Việt (để tách camelCase: lower→Upper)
const LOWER = 'a-zàáạảãâấầậẩẫăắằặẳẵèéẹẻẽêếềệểễìíịỉĩòóọỏõôốồộổỗơớờợởỡùúụủũưứừựửữỳýỵỷỹđ';
const UPPER = 'A-ZÀÁẠẢÃÂẤẦẬẨẪĂẮẰẶẲẴÈÉẸẺẼÊẾỀỆỂỄÌÍỊỈĨÒÓỌỎÕÔỐỒỘỔỖƠỚỜỢỞỠÙÚỤỦŨƯỨỪỰỬỮỲÝỴỶỸĐ';

// header/footer trang lặp lại (markitdown trộn vào giữa câu)
const HF = /\d*\s*Hướng tới kì thi[^.]*?\d{4}\s*[-–—]\s*\d{4}|Các chuyên đề và bài tập hình học 9[^.]*?nâng cao/g;

function clean(s) {
  return s
    .replace(/\(cid:\d+\)/g, '')                              // glyph artifacts
    .replace(/\|/g, ' ')                                       // table pipes
    .replace(/\s+/g, ' ')                                      // collapse SỚM để HF match
    .replace(HF, ' ')                                          // header/footer bleed
    .replace(new RegExp(`(?:^|\\s)[-–—]{2,}(?=\\s|$)`, 'g'), ' ') // separator runs
    .replace(/đường trong/gi, 'đường tròn')                    // OCR typo phổ biến
    .replace(new RegExp(`([${LOWER}])([${UPPER}])`, 'g'), '$1 $2') // tách camelCase: GọiM→Gọi M
    .replace(/\bsaocho\b/gi, 'sao cho')
    .replace(/\bChohình\b/g, 'Cho hình')
    .replace(/\s+/g, ' ')
    .trim();
}

// cắt trailing fragment công thức bị nuốt: chuỗi đuôi gồm chữ-đơn / số / toán tử / "Biết"/"Đặt p="
function trimTail(s) {
  let prev;
  do {
    prev = s;
    s = s
      .replace(/[\s,;.]*(?:Biết|Đặt p)\s*=?[\s,.;]*$/i, '')      // "Biết =", "Đặt p="
      .replace(/[\s,;]*=\s*\.?$/, '')                            // "=" treo
      .replace(/(?:\s+[a-zA-Z](?:\s*\d)?){2,}\s*\.?$/, '')       // "a b c", "h h h"
      .replace(/\s*[√°+\-−×·]\s*\.?$/, '')                       // toán tử treo
      .replace(/\s*\d+(?:\s*\.\s*)?$/, (m) => (/\d{1,3}cm|=/.test(s) ? m : '')) // số treo (giữ nếu là đo lường)
      .trim();
  } while (s !== prev);
  return s.replace(/[\s,;.]+$/, '').trim();
}

// cắt phần dựng hình: tới marker câu hỏi/lời giải đầu tiên (case-insensitive)
const QCUT = /(L[ờo]i gi[ảa]i|Ch[ứu]ng minh|Ch[ứu]ng t[ỏo]|CMR|T[íi]nh\b|Gi[ảa]i\.|1\s*[\.\)]\s|a\s*\)\s)/i;
const DRAW = /tam giác|đường tròn|hình (vuông|chữ nhật|thang|bình hành|thoi)|tứ giác|nửa đường tròn|đường kính|dây|tiếp tuyến|hình vuông|đa giác|cung\b/i;

// gom block
const blocks = [];
let cur = null;
for (const raw of md.split('\n')) {
  const m = raw.trim().match(headRe);
  if (m) { if (cur) blocks.push(cur); cur = { buf: [raw] }; }
  else if (cur) cur.buf.push(raw);
}
if (cur) blocks.push(cur);

function norm(s) {
  return s.toLowerCase().normalize('NFC').replace(/[^\p{L} ]/gu, '').replace(/\s+/g, ' ').trim();
}
const exNorm = norm(existing);

const seen = new Set();
const picked = [];
for (const b of blocks) {
  let full = clean(b.buf.join(' ')).replace(headRe, '').replace(/^\s*\([^)]*\)\.?\s*/, '').trim();
  const cm = full.match(QCUT);
  let intro = (cm ? full.slice(0, cm.index) : full).trim();
  intro = intro.replace(/\s+([,.;:])/g, '$1');                 // bỏ space trước dấu
  intro = trimTail(intro);                                     // bỏ đuôi mảnh công thức
  // chấp nhận: bắt đầu bằng từ dựng hình + có figure + độ dài hợp lý
  if (!/^(Cho|Trên|Dựng|Lấy)\b/.test(intro)) continue;
  if (!DRAW.test(intro)) continue;
  if (intro.length < 25 || intro.length > 500) continue;
  // loại dính chữ nặng: token > 22 ký tự = OCR glue
  if (intro.split(/\s+/).some((t) => t.length > 22)) continue;
  // dedup nội bộ + vs existing 20
  const key = norm(intro).slice(0, 60);
  if (key.length < 20) continue;
  if (seen.has(key)) continue;
  if (exNorm.includes(norm(intro).slice(0, 45))) continue;     // trùng curated
  seen.add(key);
  picked.push(intro);
}

// đánh số tiếp sau Bài cuối của existing
const lastNum = Math.max(0, ...[...existing.matchAll(/^Bài\s+(\d+)[.:]/gm)].map((m) => +m[1]));
const startNum = lastNum + 1;
const appended = picked.map((t, i) => `Bài ${startNum + i}: ${t}`).join('\n\n');

console.error(`blocks=${blocks.length} picked=${picked.length} lastExisting=${lastNum} → Bài ${startNum}..${startNum + picked.length - 1}`);

if (WRITE) {
  const sep = existing.endsWith('\n') ? '\n' : '\n\n';
  fs.appendFileSync(DATASET, sep + appended + '\n');
  console.error(`WROTE ${picked.length} problems → ${path.relative(ROOT, DATASET)}`);
} else {
  // preview: 15 đầu + 10 cuối
  console.log('=== PREVIEW (first 15) ===');
  console.log(appended.split('\n\n').slice(0, 15).join('\n\n'));
  console.log('\n=== PREVIEW (last 10) ===');
  console.log(appended.split('\n\n').slice(-10).join('\n\n'));
}
