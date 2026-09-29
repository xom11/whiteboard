/** @jest-environment jsdom */
import { concurrencyCenterRule } from '../concurrencyCenter';
import { segmentClauses } from '../../deterministic/coverage';
import { toaDoHinh, dist, type XY } from '../../__tests__/helpers/toaDoHinh';

beforeAll(() => {
  window.matchMedia ??= (() => ({ matches: false, addListener() {}, removeListener() {} })) as never;
});

const kc = (p: XY, a: XY, b: XY) =>
  Math.abs((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) / Math.hypot(b[0] - a[0], b[1] - a[1]);
const dot = (a: XY, b: XY, c: XY, d: XY) => (b[0] - a[0]) * (d[0] - c[0]) + (b[1] - a[1]) * (d[1] - c[1]);

function intentsOf(problem: string) {
  return concurrencyCenterRule.match({ problem, clauses: segmentClauses(problem) }).flatMap((m) => m.intents) as any[];
}

describe('concurrencyCenter — "giao điểm của ba đường …" → điểm đặc biệt', () => {
  it('"giao điểm của ba đường phân giác" → cách đều ba cạnh', () => {
    const p = toaDoHinh('Cho tam giác ABC. Gọi I là giao điểm của ba đường phân giác của tam giác ABC.');
    expect(kc(p.I, p.A, p.B)).toBeCloseTo(kc(p.I, p.B, p.C), 9);
    expect(kc(p.I, p.A, p.C)).toBeCloseTo(kc(p.I, p.B, p.C), 9);
  });

  it('"giao điểm các đường trung tuyến" → trọng tâm (trung bình toạ độ)', () => {
    const p = toaDoHinh('Cho tam giác ABC. Gọi G là giao điểm các đường trung tuyến của tam giác.');
    expect(p.G[0]).toBeCloseTo((p.A[0] + p.B[0] + p.C[0]) / 3, 9);
    expect(p.G[1]).toBeCloseTo((p.A[1] + p.B[1] + p.C[1]) / 3, 9);
  });

  it('"giao điểm của ba đường cao" → AH ⊥ BC, BH ⊥ AC', () => {
    const p = toaDoHinh('Cho tam giác ABC nhọn. Gọi H là giao điểm của ba đường cao.');
    expect(dot(p.A, p.H, p.B, p.C)).toBeCloseTo(0, 9);
    expect(dot(p.B, p.H, p.A, p.C)).toBeCloseTo(0, 9);
  });

  it('"giao điểm của ba đường trung trực" → OA = OB = OC', () => {
    const p = toaDoHinh('Cho tam giác ABC. Gọi O là giao điểm của ba đường trung trực của tam giác ABC.');
    expect(dist(p.O, p.A)).toBeCloseTo(dist(p.O, p.B), 9);
    expect(dist(p.O, p.A)).toBeCloseTo(dist(p.O, p.C), 9);
  });

  it('hinh-phang #48 phân phối "I, J lần lượt là giao điểm các đường phân giác trong của tam giác ABH, tam giác ACH"', () => {
    const p = toaDoHinh('Cho tam giác ABC vuông ở A, đường cao AH, phân giác AD. Gọi I, J lần lượt là giao điểm các đường phân giác trong của tam giác ABH, tam giác ACH. E là giao điểm của đường thẳng BI với AJ.');
    expect(kc(p.I, p.A, p.B)).toBeCloseTo(kc(p.I, p.B, p.H), 9);
    expect(kc(p.I, p.A, p.H)).toBeCloseTo(kc(p.I, p.B, p.H), 9);
    expect(kc(p.J, p.A, p.C)).toBeCloseTo(kc(p.J, p.C, p.H), 9);
    // hệ quả đề: tam giác ABE vuông tại E
    expect(dot(p.E, p.A, p.E, p.B)).toBeCloseTo(0, 9);
  });

  it('"I là giao điểm của hai tia phân giác góc B và góc C" → tâm nội tiếp', () => {
    const p = toaDoHinh('Cho tam giác ABC có I là giao điểm của hai tia phân giác góc B và góc C.');
    expect(kc(p.I, p.A, p.B)).toBeCloseTo(kc(p.I, p.A, p.C), 9);
  });

  it.each([
    ['hai loại đường khác nhau', 'Cho tam giác ABC. Gọi K là giao điểm của đường cao AH và trung tuyến BM.'],
    ['một đường, không nêu tam giác', 'Cho tam giác ABC. Gọi K là giao điểm của đường cao AH với BC.'],
    ['trung trực của đoạn không phải cạnh', 'Cho tam giác ABC và điểm D. Gọi O là giao điểm của hai đường trung trực của AB và CD.'],
    ['phân giác ngoài', 'Cho tam giác ABC. Gọi E là giao điểm của hai đường phân giác ngoài của tam giác ABC.'],
  ])('bỏ qua (%s)', (_ly, de) => {
    expect(intentsOf(de)).toEqual([]);
  });
});
