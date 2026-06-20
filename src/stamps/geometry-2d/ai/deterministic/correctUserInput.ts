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
const CORRECTION_VOCAB: readonly string[] = [
  // circle / line core
  'đường', 'tròn', 'thẳng', 'tâm', 'bán', 'kính', 'vòng',
  // polygon / triangle
  'tam', 'giác', 'tứ', 'góc', 'cạnh', 'đoạn', 'hình', 'chữ', 'nhật',
  'vuông', 'cân', 'nhọn', 'đều', 'thoi', 'thang', 'bình', 'hành',
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
export const FOLDED_VOCAB: Map<string, string> = (() => {
  const m = new Map<string, string>();
  for (const w of CORRECTION_VOCAB) {
    const f = foldVietnamese(w);
    if (!m.has(f)) m.set(f, w);
  }
  return m;
})();
