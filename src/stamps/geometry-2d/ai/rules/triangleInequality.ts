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
// Tam giác vuông: chỉ khi so hai cạnh góc vuông ("vuông tại A (AB < AC)").
// Chỉ áp cho biến thể 'any'/vuông và đúng MỘT bất đẳng thức (chuỗi "AB < AC < BC" hay
// hai bất đẳng thức ⇒ undefined, giữ tam giác mẫu — thà không đoán).
import { toaDoTamGiacTheoCanh } from './triangleLengths';

type Pt = readonly [number, number];

// Chuỗi đủ ba cạnh "AB < AC < BC" (cùng chiều) ⇒ dựng theo độ dài 4 · 5 · 6 (nhọn).
const CHUOI = /(?<![A-Z])([A-Z]{2})\s*([<>])\s*([A-Z]{2})\s*([<>])\s*([A-Z]{2})(?![A-Z])/u;

const INEQ = /(?<![A-Z])([A-Z])([A-Z])\s*([<>])\s*([A-Z])([A-Z])(?![A-Z])/gu;
const DINH: Pt = [1.8, 3.6];
const NGAN: Pt = [0, 0];
const DAI: Pt = [5.5, 0];

export function toaDoTamGiacTheoBatDangThuc(
  labels: readonly [string, string, string],
  window: string,
  variant = 'any',
): Record<string, Pt> | undefined {
  const vuong = /^right-at-([ABC])$/u.exec(variant);
  if (variant !== 'any' && !vuong) return undefined;
  const chuoi = CHUOI.exec(window);
  if (chuoi) {
    const canh = [chuoi[1], chuoi[3], chuoi[5]];
    const khoa = canh.map((c) => [...c].sort().join(''));
    const tap = new Set(labels);
    if (variant !== 'any' || chuoi[2] !== chuoi[4] || new Set(khoa).size !== 3) return undefined;
    if (!canh.every((c) => tap.has(c[0]) && tap.has(c[1]) && c[0] !== c[1])) return undefined;
    const doDai = chuoi[2] === '<' ? [4, 5, 6] : [6, 5, 4];
    return toaDoTamGiacTheoCanh(labels, 'any', new Map(khoa.map((k, i) => [k, doDai[i]])));
  }
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
  if (vuong) {
    // Vuông tại V: chỉ so hai CẠNH GÓC VUÔNG mới cần đặt lại (so với cạnh huyền
    // thì luôn đúng). Đỉnh vuông ở gốc, cạnh ngắn dựng đứng, cạnh dài nằm ngang.
    const V = labels['ABC'.indexOf(vuong[1])];
    if (chung !== V) return undefined;
    return { [V]: [0, 0], [ngan]: [0, 3], [dai]: [4.5, 0] };
  }
  return { [chung]: DINH, [ngan]: NGAN, [dai]: DAI };
}
