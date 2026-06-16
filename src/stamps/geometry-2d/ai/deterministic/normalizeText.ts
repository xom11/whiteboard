// src/stamps/geometry-2d/ai/deterministic/normalizeText.ts
//
// Chuẩn hoá văn bản đề TRƯỚC khi segment + chạy rule. Quy các biến thể ký hiệu
// về dạng canonical mà rule engine đã hiểu — tránh phải nhân đôi regex ở mọi rule.
//
//   "ΔABC" / "∆ABC"      → "tam giác ABC"   (Δ U+0394 Greek, ∆ U+2206 increment)
//   "vòng tròn"          → "đường tròn"     (đồng nghĩa)
//
// Idempotent + thuần (không side-effect). KHÔNG đổi độ dài cách-từ ngoài các thay
// thế trên để giữ ổn định coverage/clause-split.

const TRIANGLE_SYMBOL = /[Δ∆]\s*(?=[A-Z])/gu;
const CIRCLE_SYNONYM = /vòng\s+tròn/giu;
// "◊ABCD" (U+25CA lozenge) / "▱" / "□" → "tứ giác ABCD" (đề toán 8 hay dùng).
const QUAD_SYMBOL = /[◊▱□]\s*(?=[A-Z])/gu;
// Ký hiệu căn "√" (nhiễu OCR chèn giữa câu, vd "hình chiếu của H lên √ √ √ AB,AC")
// → khoảng trắng. KHÔNG mang nghĩa hình học khi dựng hình (chỉ trong biểu thức độ
// dài). Thay bằng ' ' (không '') để không dính chữ ("lên√AB"→"lên AB"); rule dùng
// \s+ nên khoảng trắng dư vô hại; không tạo/huỷ ranh giới câu.
const SQRT_NOISE = /√/gu;
// Prime cong ’ (U+2019) / ′ (U+2032) / ´ (U+00B4) SAU chữ-cái-số → ASCII ' —
// canonical hoá nhãn phái sinh (O'/A'/d') để mọi rule dùng `['′]` (hoặc ') khớp
// đồng nhất. Chỉ thay khi đứng sau [A-Za-z0-9] (ngữ cảnh prime), không nuốt dấu
// nháy mở đầu cụm.
const PRIME_VARIANT = /([A-Za-z0-9])[’′´]/gu;

// OCR glue (mất space): tách ở ranh giới TIN CẬY để không phá chữ thường.
//  (a) từ-vựng-hình-học THƯỜNG dính nhãn HOA: "cắtBC"→"cắt BC", "tâmF"→"tâm F".
//      Từ phải lowercase (không khớp "Cho"/"Trên" HOA đầu câu) + theo NGAY bởi HOA.
//  (b) nhãn HOA dính TỪ-KHOÁ lowercase: "Asao"→"A sao", "Qlần"→"Q lần", "Bvà"→"B và".
//      Danh sách từ-khoá cụ thể nên KHÔNG tách "Cho"(C+ho)/"Đường"(Đ+ường).
// "và"/"là" CỐ Ý loại: quá phổ biến + tách "Evà"→"E và" làm xê dịch parse rule
// khác (regress vao10:119). Chỉ giữ từ-vựng hình học đặc thù (an toàn).
const GLUE_WORD_LABEL = /(cắt|tâm|điểm|cạnh|tia|dây|cung|qua|của|tại|trên|đến)([A-Z])/gu;
const GLUE_LABEL_WORD = /([A-Z])(sao|nằm|lần|thuộc|cắt|của|đến|trên|tại)/gu;

export function normalizeProblemText(problem: string): string {
  return problem
    .replace(TRIANGLE_SYMBOL, 'tam giác ')
    .replace(QUAD_SYMBOL, 'tứ giác ')
    .replace(CIRCLE_SYNONYM, 'đường tròn')
    .replace(SQRT_NOISE, ' ')
    .replace(PRIME_VARIANT, "$1'")
    .replace(GLUE_WORD_LABEL, '$1 $2')
    .replace(GLUE_LABEL_WORD, '$1 $2');
}
