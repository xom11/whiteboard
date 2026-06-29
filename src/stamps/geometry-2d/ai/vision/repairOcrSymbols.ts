// src/stamps/geometry-2d/ai/vision/repairOcrSymbols.ts
//
// Vá các lỗi NHẬN DẠNG SYMBOL đặc thù của Tesseract trên đề toán hình học VN.
// Chạy Ở TẦNG OCR (extractProblem.postProcess) — KHÔNG nhét vào normalizeText
// dùng chung, vì "L" gõ tay = điểm L, "ABCD" = tứ giác thật; luật dưới đây chỉ
// đúng trên TOKEN ĐÃ HỎNG do OCR. Xem spec:
//   docs/superpowers/specs/2026-06-29-ocr-symbol-repair-design.md
//
// Failure modes đo thực nghiệm (tesseract.js 7 vie+eng, PDF rasterize @200dpi):
//   ⊥ → 1 | L   ·   △/∆ → A dính đầu (AABC)   ·   (O) → (0)   ·   ∈ → e dính cuối list
// Triết lý: PRECISION-FIRST — thà bỏ sót còn hơn vá sai (vá sai đổi luôn hình).
// Lưới an toàn: user review textarea + rule engine chịu nhiễu. Hàm thuần, idempotent.

// Tên điểm/đoạn: 2-3 chữ HOA, prime optional. (1 chữ quá mơ hồ → bỏ.)
const PT = `[A-Z]{2,3}['′]?`;

// R1 — ⊥ : token đơn 1/|/L kẹp giữa hai nhóm-hoa.  "IH 1 CE" → "IH ⊥ CE"
const PERP_RE = new RegExp(
  `(?<![\\p{L}\\d])(${PT})\\s+([1|L])\\s+(${PT})(?![\\p{L}\\d])`,
  'gu',
);

// R2 — △/∆ : glyph tam giác bị đọc thành "A" dính đầu tên. CHỈ câu đề: cần
// tiền tố Cho/Xét + hậu tố mô tả-tam-giác (né tứ giác thật "Cho ABCD có…").
const TRI_RE =
  /(Cho|Xét)\s+A([A-Z]{3})(?=\s+(?:đều|cân|nhọn|vuông|nội tiếp|ngoại tiếp))/gu;

// R3 — (O) : tâm đường tròn O bị đọc thành số 0. Chỉ dạng bare "(0)" (né "(0;…)" toạ độ).
const CIRCLE_O_RE = /\(0\)/gu;

// R4 — ∈ : "A,B,C,De (O)" — ∈ đọc thành e dính cuối list điểm phẩy.
const ELEM_RE =
  /(?<![\p{L}\d])([A-Z](?:\s*,\s*[A-Z])+)\s*e\s*\((?:O|0)\)/gu;

export function repairOcrSymbols(text: string): string {
  let t = text;
  t = t.replace(PERP_RE, '$1 ⊥ $3');
  t = t.replace(TRI_RE, '$1 tam giác $2');
  t = t.replace(CIRCLE_O_RE, '(O)');
  t = t.replace(ELEM_RE, '$1 ∈ (O)');
  return t;
}
