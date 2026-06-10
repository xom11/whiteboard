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

export function normalizeProblemText(problem: string): string {
  return problem
    .replace(TRIANGLE_SYMBOL, 'tam giác ')
    .replace(CIRCLE_SYNONYM, 'đường tròn');
}
