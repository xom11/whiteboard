// src/stamps/geometry-2d/ai/deterministic/normalizeText.ts
//
// Chuẩn hoá văn bản đề TRƯỚC khi segment + chạy rule. Quy các biến thể ký hiệu
// về dạng canonical mà rule engine đã hiểu — tránh phải nhân đôi regex ở mọi rule.
//
//   "ΔABC" / "∆ABC"      → "tam giác ABC"   (Δ U+0394 Greek, ∆ U+2206 increment)
//   "ABC" (U+F044)      → "tam giác ABC"   (OCR Symbol-font 'D'=Δ → PUA U+F044)
//   "vòng tròn"          → "đường tròn"     (đồng nghĩa)
//
// Idempotent + thuần (không side-effect). KHÔNG đổi độ dài cách-từ ngoài các thay
// thế trên để giữ ổn định coverage/clause-split.

// U+F044 = glyph ∆ trong PDF font Symbol (ký tự 'D' = Δ), OCR map vào Private Use
// Area. Giữ lookahead (?=[A-Z]) để CHỈ đổi khi đứng trước bộ-đỉnh tam giác.
const TRIANGLE_SYMBOL = /[Δ∆]\s*(?=[A-Z])/gu;
const CIRCLE_SYNONYM = /vòng\s+tròn/giu;
// "đường tròn O;R" (rớt ngoặc — phrasing hsg9/OCR) → "đường tròn (O;R)" để rule
// circle (cần "(O" / "(O;R)") nhận. Tâm = 1 HOA(+prime), ";", R(+prime). CHỈ dạng
// ";R" rõ ràng (KHÔNG đụng "đường tròn O" trần — quá mơ hồ). Idempotent: sau
// "đường tròn " là "(" thì `([A-Z])` không khớp.
const CIRCLE_PAREN_RESTORE = /(đường\s*tròn\s+)([A-Z])(['′]?)\s*;\s*([Rr])(['′]?)(?![A-Za-z'′])/gu;
// "◊ABCD" (U+25CA lozenge) / "▱" / "□" → "tứ giác ABCD" (đề toán 8 hay dùng).
const QUAD_SYMBOL = /[◊▱□]\s*(?=[A-Z])/gu;
// OCR rớt-dấu "trung điển" → "trung điểm" (n↔m cuối từ — Tesseract hay lẫn; C84
// "Gọi M là trung điển BC"). GATE chặt: CHỈ "điển" đứng NGAY SAU "trung" → không
// đụng "từ điển"/"kinh điển"/"điển hình" (danh từ thật, không có "trung" trước).
// Thiếu fix: clause không có keyword "trung điểm" → hasGeometry=false → midpoint
// rule không thấy clause → M (mốc) không dựng → cascade (D,E,F downstream sụp).
const MIDPOINT_TYPO = /trung\s*điển(?!\p{L})/gu;
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
// Glyph "Ö" (O-diaeresis U+00D6) → "O": OCR đọc nhãn tâm/điểm O thành O-hai-chấm
// (C28: "đường thẳng qua Ö vuông góc BC" = qua O). Mirror R35 trong repairOcrSymbols
// (tầng OCR) để pipeline dựng-hình — vốn KHÔNG chạy repairOcrSymbols — cũng nhận.
// Gate `(?<!\p{Ll})…(?!\p{Ll})` chừa Ö kề chữ THƯỜNG (không phải nhãn); Ö không là
// chữ Việt nên rất an toàn (cùng lớp glyph-O với Ø).
const DIAERESIS_O = /(?<!\p{Ll})Ö(?!\p{Ll})/gu;
// "∩" (giao) đứng RỜI sau ")" đọc thành "N": "(BMC) N AC = {C, N}" → "(BMC) ∩ AC
// = {C, N}" (C40). Mirror R36 trong repairOcrSymbols cho pipeline dựng-hình. Gate
// "= {" (set-notation) ⇒ né "N" làm nhãn điểm thật.
const INTERSECT_PAREN = /(\([A-Z]{3}\))\s+N\s+([A-Z]{2})(\s*=\s*\{)/gu;

// OCR glue (mất space): tách ở ranh giới TIN CẬY để không phá chữ thường.
//  (a) từ-vựng-hình-học THƯỜNG dính nhãn HOA: "cắtBC"→"cắt BC", "tâmF"→"tâm F".
//      Từ phải lowercase (không khớp "Cho"/"Trên" HOA đầu câu) + theo NGAY bởi HOA.
//  (b) nhãn HOA dính TỪ-KHOÁ lowercase: "Asao"→"A sao", "Qlần"→"Q lần", "Bvà"→"B và".
//      Danh sách từ-khoá cụ thể nên KHÔNG tách "Cho"(C+ho)/"Đường"(Đ+ường).
// "và" đã AN TOÀN re-add sau khi perpThroughCutsLines dựng chân "tại E" (trước
// đó tách "Evà"→"E và" làm lộ E thiếu → regress vao10:119, nay đã vá).
const GLUE_WORD_LABEL = /(cắt|tâm|điểm|cạnh|tia|dây|cung|qua|của|và|tại|trên|đến)([A-Z])/gu;
const GLUE_LABEL_WORD = /([A-Z])(sao|nằm|lần|thuộc|cắt|của|đến|trên|tại|và)/gu;
// Token tia ĐẶT TÊN (HOA+thường: Ax, By, Od) dính từ-khoá: "Axtại"→"Ax tại",
// "Bycắt"→"By cắt". Tách khi sau "<HOA><thường>" là MỘT từ-khoá hình-học đầy đủ
// (đa-ký-tự) → KHÔNG phá tên-tia đứng riêng (vd "Ax." không có đuôi từ-khoá).
const GLUE_RAYTOKEN_WORD = /([A-Z][a-z])(tại|cắt|và|của|đến|trên|thuộc)(?![\p{L}])/gu;

// OCR multi-word-glue (mất space HÀNG LOẠT): nhiều từ-vựng hình-học dính liền
// ("Chođườngtròn", "ChotamgiácABC", "vàbadâycung", "điquaA,Cvàcắtlạicáccạnh").
// Tách tại ranh giới TIN CẬY trong WHITELIST từ-khoá hình-học bằng cách chèn dấu
// cách giữa HAI từ-khoá whitelist dính nhau (lặp tới khi ổn định — chuỗi dài có
// nhiều ranh giới). An toàn vì lookahead `(?=word)` chỉ khớp khi MỘT từ-khoá đầy
// đủ theo NGAY bởi một từ-khoá đầy đủ khác — KHÔNG cắt giữa từ ("Cho"→"C ho").
// KHÔNG word-segment đa-từ tuỳ ý ngoài whitelist (rủi ro phá nhãn HOA/đa-từ-dính).
//
// Whitelist sắp theo độ-dài GIẢM dần để alternation ưu tiên khớp từ DÀI trước
// ("đường" trước "đ"-không-có; "trung" trước "tr"-không-có) — tránh khớp tiền tố
// rồi để lại đuôi. Mỗi từ là từ-vựng dựng-hình phổ biến, viết-thường (đầu câu
// "Cho"/"Đường" HOA xử lý riêng bằng nhánh CAP_GLUE bên dưới).
const GLUE_VOCAB = [
  'đường', 'ngoại', 'trung', 'phân', 'điểm', 'giác', 'tròn', 'cạnh', 'kính',
  'nội', 'tiếp', 'cung', 'dây', 'tam', 'tứ', 'góc', 'vuông', 'cân', 'nhọn',
  'nửa', 'đoạn', 'hình', 'qua', 'cắt', 'lại', 'các', 'và', 'tại', 'một',
  'ba', 'bất', 'kì', 'kỳ', 'có', 'đi', 'với', 'lấy', 'của', 'lần', 'lượt',
  'thứ', 'hai', 'gọi', 'kẻ', 'vẽ', 'cho', 'tâm', 'bán',
  // 'là' (hệ từ) + từ-vựng hình-chiếu/⊥ — tách glue "làtrung"/"làhình"/
  // "chiếucủa"/"xuốngđường" (OCR HHP dày). Whitelist↔whitelist nên 'là' chỉ tách
  // khi theo NGAY bởi một từ-khoá hình-học khác (an toàn, regression-gated).
  'là', 'chiếu', 'xuống', 'lên', 'đối', 'xứng', 'song', 'thẳng',
];
// Đặt từ DÀI trước trong alternation (regex alternation = first-match, không
// longest-match) để không khớp tiền tố ngắn rồi bỏ lại đuôi.
const GLUE_VOCAB_SORTED = [...GLUE_VOCAB].sort((a, b) => b.length - a.length);
const GLUE_ALT = GLUE_VOCAB_SORTED.join('|');
// Ranh giới whitelist↔whitelist: chèn cách giữa 2 từ-khoá dính. Lặp tới fixpoint.
const GLUE_VOCAB_RE = new RegExp(`(${GLUE_ALT})(?=${GLUE_ALT})`, 'gu');
// Từ-khoá whitelist (chữ thường) dính NGAY nhãn HOA: "giácABC"→"giác ABC",
// "tròn(O)" xử lý ở nhánh paren. Chỉ các từ-khoá hay đứng trước nhãn.
const GLUE_VOCAB_LABEL = new RegExp(
  `(giác|tròn|tiếp|xúc|kính|điểm|đoạn|cạnh|dây|cung|tại|qua|đi|với|có|tâm|thẳng|lên|xuống)([A-Z])`,
  'gu',
);
// "Cho"/"Đường" HOA-đầu-cụm dính từ-khoá whitelist: "Chođường"→"Cho đường",
// "ChotamgiácABC"→"Cho tamgiác…" (đuôi do GLUE_VOCAB_RE xử lý tiếp). Chỉ 2 động
// từ/danh-từ mở-đầu-câu phổ biến — KHÔNG tách "C ho" vì khớp NGUYÊN từ "Cho".
const CAP_GLUE = /(Cho|Đường|Gọi|Trên|Vẽ|Kẻ|Lấy|Các|Một|Trung|Tâm|Nửa|Hình)(đường|tam|tứ|nửa|hình|điểm|các|cạnh|đoạn|trung|tròn|giác|một|ba|hai|tia|dây|cung)/gu;
// Nhãn HOA dính NGAY từ-khoá whitelist chữ-thường: "ADbất"→"AD bất", "ABnội"→
// "AB nội", "Cvà"→"C và". Chỉ khớp khi sau HOA là MỘT từ-khoá whitelist ĐẦY ĐỦ
// (đa-ký-tự, viết-thường) → KHÔNG cắt cặp đỉnh "AB" (B không mở đầu từ-khoá nào).
const GLUE_LABEL_VOCAB = new RegExp(`([A-Z])(${GLUE_ALT})(?![\\p{L}])`, 'gu');
// Ranh giới chữ-thường↔'(' và ')'↔chữ: "tròn(O)"→"tròn (O)", ")và"→") và".
const GLUE_PAREN_OPEN = /(\p{Ll})\(/gu;
const GLUE_PAREN_CLOSE = /\)(\p{L})/gu;

function deglueMultiWord(s: string): string {
  let out = s.replace(CAP_GLUE, '$1 $2');
  for (let k = 0; k < 8; k++) {
    const next = out.replace(GLUE_VOCAB_RE, '$1 ');
    if (next === out) break;
    out = next;
  }
  out = out
    .replace(GLUE_VOCAB_LABEL, '$1 $2')
    .replace(GLUE_LABEL_VOCAB, '$1 $2')
    .replace(GLUE_PAREN_OPEN, '$1 (')
    .replace(GLUE_PAREN_CLOSE, ') $1');
  return out;
}

export function normalizeProblemText(problem: string): string {
  let s = problem
    .replace(TRIANGLE_SYMBOL, 'tam giác ')
    .replace(QUAD_SYMBOL, 'tứ giác ')
    .replace(MIDPOINT_TYPO, 'trung điểm')
    .replace(DIAERESIS_O, 'O')
    .replace(INTERSECT_PAREN, '$1 ∩ $2$3')
    .replace(CIRCLE_SYNONYM, 'đường tròn');
  // Khôi phục ngoặc circle CHỈ khi đề CHƯA có circle-paren nào "(<HOA>" → tránh
  // NHÂN ĐÔI định nghĩa đường tròn (chuyen13:10/mohinh:12 có "( O;R )" sẵn ở cuối:
  // restore tạo "(O;R)" thứ hai → 2 circle O → named-missing). Guard = đúng
  // predicate đã lọc ra tập bài "đường tròn O;R" trần cần fix.
  if (!/\(\s*[A-Z]/u.test(s)) s = s.replace(CIRCLE_PAREN_RESTORE, '$1($2$3;$4$5)');
  return deglueMultiWord(
    s
      .replace(SQRT_NOISE, ' ')
      .replace(PRIME_VARIANT, "$1'")
      .replace(GLUE_WORD_LABEL, '$1 $2')
      .replace(GLUE_LABEL_WORD, '$1 $2')
      .replace(GLUE_RAYTOKEN_WORD, '$1 $2'),
  );
}
