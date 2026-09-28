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
});
