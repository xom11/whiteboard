/** @jest-environment jsdom */
// Đề THẬT trong docs/datasets/lop10-2026-09.txt (SGK Toán 10 + chuyên đề + HSG 10).
// Mỗi ca đo hình dựng bằng JSXGraph thật: điểm đúng đẳng thức vectơ / tỉ số / tâm,
// không suy biến — không chỉ "đủ tên điểm".
import { tryDeterministicFigure } from '../deterministic/tryDeterministicFigure';
import { toaDoHinh, dist, type XY } from './helpers/toaDoHinh';

beforeAll(() => {
  window.matchMedia ??= (() => ({ matches: false, addListener() {}, removeListener() {} })) as never;
});

const tong = (ws: [number, XY][]): XY => [
  ws.reduce((s, [w, p]) => s + w * p[0], 0),
  ws.reduce((s, [w, p]) => s + w * p[1], 0),
];
function khop(p: XY, q: XY) {
  expect(p[0]).toBeCloseTo(q[0], 9);
  expect(p[1]).toBeCloseTo(q[1], 9);
}

describe('lop10 — đề thật, đo hình', () => {
  it('#64 "Vẽ điểm E sao cho vectơ CE = vectơ AN" (N là trung điểm AD, dựng SAU) ⇒ E = C + N − A', () => {
    const p = toaDoHinh('Cho hình bình hành ABCD. Hai điểm M và N lần lượt là trung điểm của BC và AD. Vẽ điểm E sao cho vectơ CE = vectơ AN.');
    khop(p.N, tong([[0.5, p.A], [0.5, p.D]]));
    khop(p.E, tong([[1, p.C], [1, p.N], [-1, p.A]]));
  });

  it('#44 "Gọi O là tâm hình lục giác đều ABCDEF" ⇒ O cách đều 6 đỉnh', () => {
    const p = toaDoHinh('Gọi O là tâm hình lục giác đều ABCDEF. a) Tìm các vectơ khác vectơ 0 và cùng hướng với vectơ OA.');
    for (const v of ['B', 'C', 'D', 'E', 'F']) expect(dist(p.O, p[v])).toBeCloseTo(dist(p.O, p.A), 4);
  });

  it('#11 "M, N tương ứng là trung điểm của các cạnh AB, CD"', () => {
    const p = toaDoHinh('Cho tứ giác ABCD. Gọi M, N tương ứng là trung điểm của các cạnh AB, CD. Chứng minh rằng vectơ BC + vectơ AD = 2 vectơ MN = vectơ AC + vectơ BD.');
    khop(p.M, tong([[0.5, p.A], [0.5, p.B]]));
    khop(p.N, tong([[0.5, p.C], [0.5, p.D]]));
  });

  it('#34 tứ giác + "trọng tâm của tam giác BCD": KHÔNG suy biến (A ≠ B), G thuộc AE, AG = 3/4 AE', () => {
    const p = toaDoHinh('Cho tứ giác ABCD có M, N lần lượt là trung điểm của hai cạnh AB và CD. Gọi G là trung điểm của đoạn thẳng MN, E là trọng tâm của tam giác BCD. Chứng minh: a) vectơ EA + vectơ EB + vectơ EC + vectơ ED = 4 vectơ EG.');
    for (const [x, y] of [['A', 'B'], ['A', 'C'], ['A', 'D'], ['B', 'C'], ['B', 'D'], ['C', 'D']]) {
      expect(dist(p[x], p[y])).toBeGreaterThan(1);
    }
    khop(p.E, tong([[1 / 3, p.B], [1 / 3, p.C], [1 / 3, p.D]]));
    // Đúng điều đề bắt chứng minh (ý c): vectơ AG = 3/4 vectơ AE.
    khop(p.G, tong([[0.25, p.A], [0.75, p.E]]));
  });

  it('#51 "Với M là điểm tùy ý, chứng minh …" KHÔNG thành việc dựng hình', () => {
    const r = tryDeterministicFigure('Cho hình bình hành ABCD có O là giao điểm hai đường chéo. Với M là điểm tùy ý, chứng minh rằng: a) vectơ MA + vectơ MB + vectơ MC + vectơ MD = 4 vectơ MO; b) vectơ AB + vectơ AC + vectơ AD = 2 vectơ AC.');
    expect(r.ok).toBe(true);
  });

  it('#81 (Olympic 30/4 2026): tứ giác nội tiếp (O) + "J, K, L tương ứng là tâm đường tròn ngoại tiếp tam giác ADX, BCX, PAB"', () => {
    const p = toaDoHinh('Cho tứ giác ABCD nội tiếp đường tròn (O), có tia DA cắt tia CB tại điểm P. Lấy điểm X bất kỳ trên cạnh CD. Gọi J, K, L tương ứng là tâm đường tròn ngoại tiếp tam giác ADX, BCX, PAB.');
    // Bốn đỉnh trên (O) — trước đây nhánh nội tiếp bị tam giác ADX (nhắc SAU) chặn.
    for (const v of ['B', 'C', 'D']) expect(dist(p.O, p[v])).toBeCloseTo(dist(p.O, p.A), 9);
    // P hữu hạn, nằm trên tia DA quá A và tia CB quá B (tứ giác mẫu cũ là hình vuông ⇒ AD ∥ BC).
    expect(p.P).toBeDefined();
    const trenTiaQua = (q: XY, goc: XY, qua: XY) => {
      const t = ((q[0] - goc[0]) * (qua[0] - goc[0]) + (q[1] - goc[1]) * (qua[1] - goc[1])) / dist(goc, qua) ** 2;
      return t > 1;
    };
    expect(trenTiaQua(p.P, p.D, p.A)).toBe(true);
    expect(trenTiaQua(p.P, p.C, p.B)).toBe(true);
    // Tâm ngoại tiếp đúng tam giác của mình (zip 1-1).
    const cachDeu = (o: XY, a: XY, b: XY, c: XY) => {
      expect(dist(o, a)).toBeCloseTo(dist(o, b), 9);
      expect(dist(o, a)).toBeCloseTo(dist(o, c), 9);
    };
    cachDeu(p.J, p.A, p.D, p.X);
    cachDeu(p.K, p.B, p.C, p.X);
    cachDeu(p.L, p.P, p.A, p.B);
  });

  it('#33 "Các điểm D, E thuộc cạnh BC thỏa mãn BD = DE = EC" ⇒ chia ba đều (trước: D, E đặt tự do)', () => {
    const p = toaDoHinh('Cho tam giác ABC. Các điểm D, E thuộc cạnh BC thỏa mãn BD = DE = EC. Giả sử vectơ AB = vectơ a, vectơ AC = vectơ b. Biểu diễn các vectơ BC, BD, BE, AD, AE theo vectơ a, vectơ b.');
    khop(p.D, tong([[2 / 3, p.B], [1 / 3, p.C]]));
    khop(p.E, tong([[1 / 3, p.B], [2 / 3, p.C]]));
  });

  it('#15 "Trên cạnh BC của tam giác ABC lấy điểm M sao cho MB = 3MC"', () => {
    const p = toaDoHinh('Trên cạnh BC của tam giác ABC lấy điểm M sao cho MB = 3MC. a) Tìm mối liên hệ giữa hai vectơ MB và MC. b) Biểu thị vectơ AM theo hai vectơ AB và AC.');
    expect(dist(p.M, p.B)).toBeCloseTo(3 * dist(p.M, p.C), 9);
    expect(dist(p.M, p.B) + dist(p.M, p.C)).toBeCloseTo(dist(p.B, p.C), 9);
  });

  it('#47 "độ dài ba cạnh AB, BC, CA lần lượt là 15, 18, 27" ⇒ đúng tỉ lệ', () => {
    const p = toaDoHinh('Cho tam giác ABC có trọng tâm G và độ dài ba cạnh AB, BC, CA lần lượt là 15, 18, 27. a) Tính diện tích và bán kính đường tròn nội tiếp tam giác ABC.');
    const k = dist(p.A, p.B) / 15;
    expect(dist(p.B, p.C) / k).toBeCloseTo(18, 6);
    expect(dist(p.C, p.A) / k).toBeCloseTo(27, 6);
    khop(p.G, tong([[1 / 3, p.A], [1 / 3, p.B], [1 / 3, p.C]]));
  });

  it('#57 "Cho đoạn thẳng AB có O là trung điểm và cho điểm M tùy ý": O trung điểm, M không trùng/không thẳng hàng', () => {
    const p = toaDoHinh('Cho đoạn thẳng AB có O là trung điểm và cho điểm M tùy ý. Chứng minh rằng: vectơ MA . vectơ MB = MO² − OA².');
    khop(p.O, tong([[0.5, p.A], [0.5, p.B]]));
    const cheo = (p.B[0] - p.A[0]) * (p.M[1] - p.A[1]) - (p.B[1] - p.A[1]) * (p.M[0] - p.A[0]);
    expect(Math.abs(cheo)).toBeGreaterThan(1);
  });

  it('#49 "… và một điểm M tùy ý": M được dựng, khác mọi đỉnh', () => {
    const p = toaDoHinh('Cho hình bình hành ABCD có O là giao điểm của hai đường chéo và một điểm M tùy ý. Chứng minh rằng: a) vectơ BA + vectơ DC = vectơ 0.');
    for (const v of ['A', 'B', 'C', 'D', 'O']) expect(dist(p.M, p[v])).toBeGreaterThan(0.5);
  });

  it('#50 "ba điểm G, H, K thỏa mãn: …; …; …" — đẳng thức sau dấu ";" vẫn định nghĩa G, H', () => {
    const p = toaDoHinh('Cho hình vuông ABCD có cạnh bằng a và ba điểm G, H, K thỏa mãn: vectơ KA + vectơ KC = vectơ 0; vectơ GA + vectơ GB + vectơ GC = vectơ 0; vectơ HA + vectơ HD + vectơ HC = vectơ 0. Tính độ dài các vectơ KA, GH, AG.');
    khop(p.K, tong([[0.5, p.A], [0.5, p.C]]));
    khop(p.G, tong([[1 / 3, p.A], [1 / 3, p.B], [1 / 3, p.C]]));
    khop(p.H, tong([[1 / 3, p.A], [1 / 3, p.D], [1 / 3, p.C]]));
  });

  it('#24 "Cho A, B, C là ba điểm thẳng hàng, B nằm giữa A và C" ⇒ B trong đoạn AC', () => {
    const p = toaDoHinh('Cho A, B, C là ba điểm thẳng hàng, B nằm giữa A và C. Viết các cặp vectơ cùng hướng, ngược hướng trong những vectơ sau: vectơ AB, vectơ AC, vectơ BA, vectơ BC, vectơ CA, vectơ CB.');
    expect(dist(p.A, p.B) + dist(p.B, p.C)).toBeCloseTo(dist(p.A, p.C), 9);
    expect(dist(p.A, p.B)).toBeGreaterThan(0.5);
    expect(dist(p.B, p.C)).toBeGreaterThan(0.5);
  });

  it('#29 "Cho đường tròn tâm O. Giả sử A, B là hai điểm nằm trên đường tròn" ⇒ OA = OB', () => {
    const p = toaDoHinh('Cho đường tròn tâm O. Giả sử A, B là hai điểm nằm trên đường tròn. Tìm điều kiện cần và đủ để hai vectơ OA và OB đối nhau.');
    expect(dist(p.O, p.A)).toBeCloseTo(dist(p.O, p.B), 9);
    expect(dist(p.A, p.B)).toBeGreaterThan(0.5);
  });

  it('#6 câu hỏi "Hãy chỉ ra … / Hãy chia …" không phải việc dựng hình; O là giao hai đường chéo', () => {
    const de = 'Cho hình vuông ABCD có hai đường chéo cắt nhau tại O. Hãy chỉ ra tập S gồm tất cả các vectơ khác vectơ 0, có điểm đầu và điểm cuối thuộc tập hợp {A; B; C; D; O}. Hãy chia tập S thành các nhóm sao cho hai vectơ thuộc cùng một nhóm khi và chỉ khi chúng bằng nhau.';
    expect(tryDeterministicFigure(de).ok).toBe(true);
    const p = toaDoHinh(de);
    khop(p.O, tong([[0.5, p.A], [0.5, p.C]]));
  });
});
