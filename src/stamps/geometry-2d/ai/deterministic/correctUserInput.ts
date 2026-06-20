// Lớp sửa-lỗi input HỌC SINH GÕ (case lộn xộn, xuống dòng/space rác, thiếu dấu
// thanh, typo, ký hiệu) — chạy TRƯỚC normalizeProblemText. Khác normalizeText
// (vốn cho nhiễu OCR). Thuần + idempotent. GUARD: chỉ đụng token chữ-thường
// thuần, bỏ qua mọi token trông như nhãn toán (HOA/prime/số/đơn-vị).

/** Fold tiếng Việt về dạng không-dấu để đối-chiếu vocab: lowercase → đ/Đ→d →
 *  NFD tách dấu → strip combining marks (U+0300–U+036F phủ mọi dấu thanh/mũ/móc
 *  của tiếng Việt). "đường"→"duong", "Giác"→"giac". */
export function foldVietnamese(s: string): string {
  return s
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Edit-distance DP (inline, không dependency). Vocab nhỏ nên O(n·m) thoải mái. */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    const cur = new Array<number>(n + 1);
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[n];
}

// Closed-set từ-ĐƠN hình học (canonical, có dấu). Nguồn: GLUE_VOCAB trong
// normalizeText.ts + từ-đơn tách từ GEOMETRY_KEYWORDS (vocabulary.ts) + vài từ
// cấu trúc phổ biến. CHỈ từ-đơn (corrector chạy token-by-token); cụm nhiều-từ
// tự khớp khi từng token khớp ("vuong goc"→"vuông góc"). Thứ tự = ưu tiên: nếu 2
// canonical fold trùng key thì từ ĐỨNG TRƯỚC thắng (geometry-priority).
//
// ⚠️  Collision-winners (identity-form trước để tránh corrupt từ-đa-nghĩa):
//   - 'tam' TRƯỚC 'tâm': fold('tam')=fold('tâm')='tam' → tam giác (NOT tâm giác)
//   - 'thang' TRƯỚC 'thẳng': fold('thang')=fold('thẳng')='thang' → hình thang (NOT thẳng)
// Các winner này được diag-all gate xác thực 0 regression.
export const CORRECTION_VOCAB: readonly string[] = [
  // circle / line core
  'đường', 'tròn', 'bán', 'kính', 'vòng',
  // polygon / triangle (TAM before TÂM, THANG before THẲNG — see collision-winner warning above)
  'tam', 'tâm', 'thang', 'thẳng', 'giác', 'tứ', 'góc', 'cạnh', 'đoạn', 'hình', 'chữ', 'nhật',
  'vuông', 'cân', 'nhọn', 'đều', 'thoi', 'bình', 'hành',
  // chord / arc / point
  'dây', 'cung', 'điểm', 'tia', 'nửa',
  // tangent / inscribed
  'tiếp', 'tuyến', 'nội', 'ngoại', 'xúc',
  // cevians / projection
  'trung', 'trực', 'cao', 'phân', 'chiếu', 'đối', 'xứng',
  // verbs / connectors phổ biến trong đề
  'cho', 'gọi', 'vẽ', 'kẻ', 'lấy', 'qua', 'cắt', 'trên', 'dưới', 'đến',
  'song', 'với', 'của', 'và', 'là', 'đi', 'có', 'nằm', 'thuộc', 'tại',
  'một', 'hai', 'ba', 'các', 'lần', 'lượt', 'thứ', 'bất', 'kì', 'kỳ',
  'trong', 'ngoài', 'lên', 'xuống',
];

// fold → canonical (first-wins theo thứ tự CORRECTION_VOCAB).
// Exported để test + verify collision-winners.
export const FOLDED_VOCAB: Map<string, string> = (() => {
  const m = new Map<string, string>();
  for (const w of CORRECTION_VOCAB) {
    const f = foldVietnamese(w);
    if (!m.has(f)) m.set(f, w);
  }
  return m;
})();

export type TokenClass = 'protected' | 'upper' | 'lower';

const LETTERS_ONLY = /^\p{L}+$/u; // thuần chữ (gồm tiếng Việt), không digit/ký-hiệu
const UPPER_LABEL = /^\p{Lu}{1,4}$/u; // toàn HOA, 1-4 ký tự (geometric label: A,BC,ABC,MNPQ)
const HAS_UPPER = /\p{Lu}/u; // có ít nhất 1 chữ HOA

/** Phân loại 1 whitespace-token. Token KHÔNG thuần-chữ (có số/prime/ký-hiệu/ngoặc)
 *  → protected (nhãn/đơn-vị). Thuần-chữ toàn HOA 1-4 ký tự → protected (label A,BC,ABC,MNPQ).
 *  Thuần-chữ có HOA khác (Ax,By,DUONG,Cho,Đường) → upper (chỉ exact-fold). Thuần-chữ
 *  toàn-thường → lower (exact + fuzzy). */
export function classifyToken(token: string): TokenClass {
  if (!LETTERS_ONLY.test(token)) return 'protected';
  // Thuần chữ: kiểm tra có phải label (toàn HOA 1-4 ký tự)
  if (UPPER_LABEL.test(token)) return 'protected';
  return HAS_UPPER.test(token) ? 'upper' : 'lower';
}
