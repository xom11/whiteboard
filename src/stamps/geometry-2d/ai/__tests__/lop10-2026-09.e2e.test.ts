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
});
