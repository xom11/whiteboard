#!/usr/bin/env node
// Trích bài toán "vẽ hình" từ docs/datasets/tuyen-tap-400-bai-toan-hinh-hoc-vao-10.md
// (markitdown của PDF "Tuyển tập 400 bài toán hình học trong các đề thi vào lớp 10")
// → ghi docs/datasets/tuyen-tap-400-hinh-vao-10.txt (dataset mới, format "Câu N: ...").
// Chạy: node scripts/extract-vao10.mjs [--write]
//   không --write: in preview ra stdout (review trước)
//   --write     : ghi đè dataset
//
// Nhiễu OCR đặc thù cuốn này (khác hinh9):
//   - glyph Symbol-font PUA vô hình: U+F044=∆ (2771 chỗ), U+F0B0=°, U+F0CE=∈…
//   - math run tách chữ: "A B = 2 R = 1 0 c m" → "AB = 2R = 10cm"
//   - glue không-space: "đường kínhAC", "BCkhông", "Anằm"
//   - paren tách chữ: "( O )" → "(O)"; paren rơi vào ô bảng: "Cho O; R" → "Cho (O;R)"
//   - bảng pipe chèn giữa câu (một số ref toán RƠI vào ô bảng → câu mất ref;
//     lọc bằng heuristic DROPOUT vì là hư hỏng văn bản, không phải gap rule)
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const MD = path.join(ROOT, 'docs/datasets/tuyen-tap-400-bai-toan-hinh-hoc-vao-10.md');
const DATASET = path.join(ROOT, 'docs/datasets/tuyen-tap-400-hinh-vao-10.txt');
const PHANG = path.join(ROOT, 'docs/datasets/mot-so-bai-tap-chon-loc-hinh-hoc-phang.txt');
const WRITE = process.argv.includes('--write');

const md = fs.readFileSync(MD, 'utf8');
const phang = fs.existsSync(PHANG) ? fs.readFileSync(PHANG, 'utf8') : '';

const headRe = /^Câu\s+(\d+)\s*\./;

// ký tự thường có diacritic tiếng Việt (nhận diện từ Việt khi tách glue)
const VIET =
  'àáạảãâấầậẩẫăắằặẳẵèéẹẻẽêếềệểễìíịỉĩòóọỏõôốồộổỗơớờợởỡùúụủũưứừựửữỳýỵỷỹđ';
const LOWER = 'a-z' + VIET;

// nối math run tách chữ: RUN ≥2 token alnum ĐƠN liên tiếp ("A B", "1 0 c m") → bỏ
// space trong run. Lookbehind/lookahead Unicode chặn dính vào từ Việt cạnh run
// ("đường kính A B" → "đường kính AB", KHÔNG "kínhAB"; "A và B" giữ nguyên vì
// "và" là token đa-ký-tự).
function joinSpacedRuns(s) {
  return s.replace(/(?<![\p{L}\d])(?:[A-Za-z0-9] )+[A-Za-z0-9](?![\p{L}\d])/gu, (m) =>
    m.replace(/ /g, '')
  );
}

function clean(s) {
  s = s
    // glyph Symbol-font PUA (markitdown giữ nguyên, hiển thị vô hình)
    .replace(/[∆Δ]/g, ' tam giác ')
    .replace(//g, '°') // °
    .replace(//g, ' thuộc ')
    .replace(/[-�]/g, ' ') // PUA còn lại → space
    .replace(/\(cid:\d+\)/g, ' ')
    .replace(/\|/g, ' ') // table pipes
    .replace(/(?:^|\s)[-]{3,}(?=\s|$)/g, ' ') // separator runs của bảng md
    .replace(/\s+/g, ' ')
    .replace(/\(\s*Thầy[^)]*\)/gi, ' ') // attribution "(Thầy Nguyễn Chí Thành)"
    .replace(/LỚP TOÁN THẦY THÀNH.{0,80}?\d{2,}/g, ' ') // footer quảng cáo bleed
    .replace(/NGUYỄN KHÁNH TOÀN.{0,40}?[\d.]{2,}/g, ' ') // footer cắt dở
    .replace(/\.?\d{3}\.\d{3}\.?\d*/g, ' ') // số điện thoại footer sót "0975.705.122"
    .replace(/\)\)/g, ')')
    .replace(/đường trong/gi, 'đường tròn')
    // tách glue không-space: "đường kínhAC"→"kính AC"; "BCkhông"→"BC không"
    // (chỉ tách HOA→từ-Việt khi HOA đứng sau HOA khác — tránh tách nhầm từ hoa
    // đầu câu "Chứng"/"Gọi"; KHÔNG tách tia "Ax"/"Bx" vì x không diacritic).
    .replace(new RegExp(`([${LOWER}])([A-Z])`, 'g'), '$1 $2')
    .replace(new RegExp(`(?<=[A-Z])([A-Z])(?=[a-z]*[${VIET}])`, 'g'), '$1 ');
  s = joinSpacedRuns(s);
  s = s
    // "( O )" / "( O ; R )" / "( O 1 )" → collapse nếu ruột ngắn toàn ký hiệu
    .replace(/\(\s*([A-Za-z0-9'′;,. ]{1,10}?)\s*\)/g, (m, inner) => {
      const c = inner.replace(/\s+/g, '');
      return c.length >= 1 && c.length <= 6 ? `(${c})` : m;
    })
    .replace(/\(\s*\)/g, ' ') // paren rỗng (ruột rơi vào ô bảng)
    .replace(/\s+([’'′])/g, '$1') // prime tách rời: "AA ’" → "AA’"
    // paren của "(O;R)" rơi vào ô bảng: "Cho O; R" → "Cho (O;R)"
    .replace(/\(?\b([OI])\s*;\s*([Rr])\)?(?![\w;])/g, '($1;$2)')
    // restore ∆ bị nuốt hẳn: "Cho ABC vuông/cân/đều/nhọn/tù/có/nội tiếp/ngoại tiếp"
    .replace(
      /\bCho\s+([A-Z]{3})(?=\s+(?:vuông|cân|đều|nhọn|tù|có|nội tiếp|ngoại tiếp))/g,
      'Cho tam giác $1'
    )
    .replace(/\s+([,.;:])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  return s;
}

// cắt phần dựng hình: tới marker câu hỏi/lời giải đầu tiên
const QCUT =
  /(Hướng dẫn|L[ờo]i gi[ảa]i|Ch[ứu]ng minh|Ch[ứu]ng t[ỏo]|CMR|T[íi]nh\b|Xác định vị trí|Tìm vị trí|\b1\s*[\.\)]\s|\ba\s*\)\s)/i;
const DRAW =
  /tam giác|đường tròn|hình (vuông|chữ nhật|thang|bình hành|thoi)|tứ giác|nửa đường tròn|đường kính|dây|tiếp tuyến|đa giác|cung\b/i;

// gom block theo header "Câu N."
const blocks = [];
let cur = null;
for (const raw of md.split('\n')) {
  const m = raw.trim().match(headRe);
  if (m) {
    if (cur) blocks.push(cur);
    cur = { num: +m[1], buf: [raw.trim().replace(headRe, '')] };
  } else if (cur) cur.buf.push(raw);
}
if (cur) blocks.push(cur);

function norm(s) {
  return s.toLowerCase().normalize('NFC').replace(/[^\p{L} ]/gu, '').replace(/\s+/g, ' ').trim();
}
const phangNorm = norm(phang);

// ref toán RƠI vào ô bảng → câu cụt ("giao điểm và MN", "đường tròn tâm,"):
// hư hỏng văn bản không sửa được, loại để không nhiễu danh sách gap rule.
const DROPOUT =
  /\b(?:tại|của|và|với|cắt|kẻ|là|qua|nối|từ|lấy)\s*[.,;:]|\b(?:tâm|đường kính|trung điểm|giao điểm|hình chiếu|đoạn thẳng|nửa đường tròn|dây)\s*[.,;]|giao điểm và |nằm giữa và |tại cắt /i;

const seen = new Set();
const picked = [];
let rejected = { notCho: 0, noDraw: 0, len: 0, glue: 0, dropout: 0, dup: 0, dupPhang: 0 };
for (const b of blocks) {
  let full = clean(b.buf.join(' '));
  const cm = full.match(QCUT);
  let intro = (cm ? full.slice(0, cm.index) : full).trim();
  intro = intro.replace(/\s+\d*[a-z]?\)\.?$/, ''); // đuôi enum sót "2a)." / "a)"
  intro = intro.replace(/[\s,;.]+$/, '').trim();
  if (intro && !/[.?]$/.test(intro)) intro += '.';
  if (!/^(Cho|Trên|Qua|Từ|Dựng|Lấy)\b/.test(intro)) { rejected.notCho++; continue; }
  if (!DRAW.test(intro)) { rejected.noDraw++; continue; }
  if (intro.length < 30 || intro.length > 600) { rejected.len++; continue; }
  if (DROPOUT.test(intro)) { rejected.dropout++; continue; }
  // loại dính chữ nặng / ref rơi vào bảng để lại token dài bất thường
  if (intro.split(/\s+/).some((t) => t.replace(/[^\p{L}\d]/gu, '').length > 22)) { rejected.glue++; continue; }
  const key = norm(intro).slice(0, 60);
  if (key.length < 20) { rejected.len++; continue; }
  if (seen.has(key)) { rejected.dup++; continue; }
  if (phangNorm.includes(norm(intro).slice(0, 45))) { rejected.dupPhang++; continue; }
  seen.add(key);
  picked.push({ num: b.num, intro });
}

// đánh số tuần tự (numbering gốc có restart)
const body = picked.map((p, i) => `Câu ${i + 1}: ${p.intro}`).join('\n\n');
const header =
  '# Trích từ "Tuyển tập 400 bài toán hình học trong các đề thi vào lớp 10" (toanmath.com)\n' +
  '# bởi scripts/extract-vao10.mjs — chỉ giữ bài VẼ HÌNH, intro = phần dựng hình trước câu hỏi.\n\n';

console.error(
  `blocks=${blocks.length} picked=${picked.length} rejected=${JSON.stringify(rejected)}`
);

if (WRITE) {
  fs.writeFileSync(DATASET, header + body + '\n');
  console.error(`WROTE ${picked.length} problems → ${path.relative(ROOT, DATASET)}`);
} else {
  console.log('=== PREVIEW (first 12) ===');
  console.log(body.split('\n\n').slice(0, 12).join('\n\n'));
  console.log('\n=== PREVIEW (middle 6) ===');
  const mid = Math.floor(picked.length / 2);
  console.log(body.split('\n\n').slice(mid, mid + 6).join('\n\n'));
  console.log('\n=== PREVIEW (last 6) ===');
  console.log(body.split('\n\n').slice(-6).join('\n\n'));
}
