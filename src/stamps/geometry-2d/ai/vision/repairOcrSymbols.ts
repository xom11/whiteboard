// src/stamps/geometry-2d/ai/vision/repairOcrSymbols.ts
//
// Vá các lỗi NHẬN DẠNG SYMBOL đặc thù của Tesseract trên đề toán hình học VN.
// Chạy Ở TẦNG OCR (extractProblem.postProcess) — KHÔNG nhét vào normalizeText
// dùng chung, vì "L" gõ tay = điểm L, "ABCD" = tứ giác thật; luật dưới đây chỉ
// đúng trên TOKEN ĐÃ HỎNG do OCR. Xem spec:
//   docs/superpowers/specs/2026-06-29-ocr-symbol-repair-design.md
//
// Failure modes đo thực nghiệm (tesseract.js 7 vie+eng, PDF rasterize @200dpi):
//   ⊥ → 1 | L  ·  △/∆ → A dính đầu (AABC)  ·  (O) → (0)  ·  ∈ → e dính cuối list
//   ∩ → N dính ("ABN CD = {E}")  ·  ² → ? ("EF?")
// Triết lý: PRECISION-FIRST — thà bỏ sót còn hơn vá sai (vá sai đổi luôn hình).
// Lưới an toàn: user review textarea + rule engine chịu nhiễu. Hàm thuần, idempotent.

// Tên điểm/đoạn: 2-3 chữ HOA, prime optional. (1 chữ quá mơ hồ → bỏ.)
const PT = `[A-Z]{2,3}['′]?`;

// R1 — ⊥ : token đơn 1/|/L kẹp giữa hai nhóm-hoa.  "IH 1 CE" → "IH ⊥ CE"
const PERP_RE = new RegExp(
  `(?<![\\p{L}\\d])(${PT})\\s+([1|L])\\s+(${PT})(?![\\p{L}\\d])`,
  'gu',
);

// R2a — △/∆ : glyph tam giác đọc thành "A" dính đầu tên + hậu tố TAM-GIÁC-THUẦN
// (cân/đều/nhọn/vuông) NGAY sau. KHÔNG cần Cho/Xét (bắt cả "Chứng minh: APQE cân").
// Guard `(?<!giác )(?<!thang )` chặn tứ giác/hình thang cân. CỐ Ý bỏ "nội tiếp/
// ngoại tiếp" khỏi hậu tố ở đây vì tứ giác cũng "nội tiếp" → xem R2b.
const TRI_STRICT_RE =
  /(?<!giác )(?<!thang )(?<![\p{L}\d])A([A-Z]{3})\s+(đều|cân|nhọn|vuông)(?![\p{L}])/gu;

// R2b — △ABC "nội/ngoại tiếp": phân biệt với TỨ GIÁC bằng tín hiệu A NHÂN ĐÔI.
// △ABC→"AABC" (AA…); tứ giác "ABCD"→"AB…" (không nhân đôi) → "Cho ABCD nội tiếp"
// KHÔNG bị vá nhầm (trước đây R2a cũ vá sai thành "tam giác BCD").
const TRI_DOUBLE_RE =
  /(?<![\p{L}\d])AA([A-Z]{2})(?=\s+(?:đều|cân|nhọn|vuông|nội tiếp|ngoại tiếp))/gu;

// R3 — (O) : tâm đường tròn O bị đọc thành số 0. Chỉ dạng bare "(0)" (né "(0;…)" toạ độ).
const CIRCLE_O_RE = /\(0\)/gu;

// R4 — ∈ : "A,B,C,De (O)" — ∈ đọc thành e dính cuối list điểm phẩy.
const ELEM_RE =
  /(?<![\p{L}\d])([A-Z](?:\s*,\s*[A-Z])+)\s*e\s*\((?:O|0)\)/gu;

// R5 — ∩ : "AB ∩ CD = {E}" → ∩ đọc thành "N" dính ("ABN CD = {E}"). Gate "= {"
// (ký hiệu tập hợp giao điểm) ⇒ rất hiếm false-positive.
const INTERSECT_RE = /([A-Z]{2,3})N\s+([A-Z]\S{0,2})\s*=\s*\{/gu;

// R6 — mũ ² : "EF²" → "EF?" (chữ HOA + "?" + toán tử). Reconstruction precision cao
// (khác "TÂU"/"<" bất khả thi). Né câu hỏi VN (chữ THƯỜNG trước "?").
const SQUARE_RE = /([A-Z])\?(?=\s*[-=+)])/gu;

export function repairOcrSymbols(text: string): string {
  let t = text;
  t = t.replace(PERP_RE, '$1 ⊥ $3');
  t = t.replace(TRI_STRICT_RE, 'tam giác $1 $2');
  t = t.replace(TRI_DOUBLE_RE, 'tam giác A$1');
  t = t.replace(CIRCLE_O_RE, '(O)');
  t = t.replace(ELEM_RE, '$1 ∈ (O)');
  t = t.replace(INTERSECT_RE, '$1 ∩ $2 = {');
  t = t.replace(SQUARE_RE, '$1²');
  return t;
}
