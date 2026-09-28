// src/stamps/geometry-2d/ai/rules/triangleInequality.ts
//
// "Cho tam giác ABC nhọn (AB < AC) nội tiếp (O)" — mở đầu kinh điển của câu hình
// vào 10. Tam giác mẫu ([0,0],[5,0],[2,3]) có AB > AC ⇒ với "(AB < AC)" hình vẽ
// NGƯỢC đề ngay từ bước đầu (và mọi điểm dựng sau — tiếp tuyến tại A cắt BC phía
// nào, chân đường cao nằm gần B hay C — lệch theo).
//
// Hai cạnh bất kỳ của tam giác luôn chung đúng một đỉnh V: "VX < VY" ⇒ đặt V ở
// trên, X (cạnh ngắn) ở đáy trái, Y ở đáy phải. Tam giác mẫu nhọn, ba cạnh khác
// nhau rõ (≈4.0 · 5.2 · 5.5) để không gợi tính chất đề không cho (cân/vuông).
// Chỉ áp cho biến thể 'any' và đúng MỘT bất đẳng thức (chuỗi "AB < AC < BC" hay
// hai bất đẳng thức ⇒ undefined, giữ tam giác mẫu — thà không đoán).
type Pt = readonly [number, number];

const INEQ = /(?<![A-Z])([A-Z])([A-Z])\s*([<>])\s*([A-Z])([A-Z])(?![A-Z])/gu;
const DINH: Pt = [1.8, 3.6];
const NGAN: Pt = [0, 0];
const DAI: Pt = [5.5, 0];

export function toaDoTamGiacTheoBatDangThuc(
  labels: readonly [string, string, string],
  window: string,
): Record<string, Pt> | undefined {
  const tap = new Set(labels);
  const hits = [...window.matchAll(INEQ)].filter((m) =>
    [m[1], m[2], m[4], m[5]].every((ch) => tap.has(ch)) && m[1] !== m[2] && m[4] !== m[5],
  );
  if (hits.length !== 1) return undefined;
  const m = hits[0];
  // Chuỗi "AB < AC < BC": ký tự so sánh ngay sau cặp thứ hai ⇒ bỏ.
  const sau = window.slice(m.index! + m[0].length);
  if (/^\s*[<>=]/u.test(sau)) return undefined;
  const c1 = [m[1], m[2]];
  const c2 = [m[4], m[5]];
  const chung = c1.find((x) => c2.includes(x));
  if (!chung || (c1.includes(c2[0]) && c1.includes(c2[1]))) return undefined;
  const x = c1.find((p) => p !== chung)!;
  const y = c2.find((p) => p !== chung)!;
  const [ngan, dai] = m[3] === '<' ? [x, y] : [y, x];
  return { [chung]: DINH, [ngan]: NGAN, [dai]: DAI };
}
