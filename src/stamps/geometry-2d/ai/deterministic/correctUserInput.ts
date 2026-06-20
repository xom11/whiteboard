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
