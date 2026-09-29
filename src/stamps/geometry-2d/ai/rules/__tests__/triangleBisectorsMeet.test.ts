/** @jest-environment jsdom */
import { triangleBisectorsMeetRule } from '../triangleBisectorsMeet';
import { segmentClauses } from '../../deterministic/coverage';
import { toaDoHinh, type XY } from '../../__tests__/helpers/toaDoHinh';

beforeAll(() => {
  window.matchMedia ??= (() => ({ matches: false, addListener() {}, removeListener() {} })) as never;
});

// Khoảng cách từ P tới ĐƯỜNG THẲNG AB.
const kc = (p: XY, a: XY, b: XY) =>
  Math.abs((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) / Math.hypot(b[0] - a[0], b[1] - a[1]);
const cungPhia = (p: XY, q: XY, a: XY, b: XY) => {
  const s = (x: XY) => (b[0] - a[0]) * (x[1] - a[1]) - (b[1] - a[1]) * (x[0] - a[0]);
  return s(p) * s(q) > 0;
};

function intentsOf(problem: string) {
  return triangleBisectorsMeetRule.match({ problem, clauses: segmentClauses(problem) }).flatMap((m) => m.intents) as any[];
}

describe('triangleBisectorsMeet — giao hai phân giác góc tam giác', () => {
  it('hinh-phang #56 "Các tia phân giác của góc B và C cắt nhau ở I": I cách đều 3 cạnh, nằm trong tam giác; ID ⊥ AB', () => {
    const p = toaDoHinh('Cho tam giác ABC. Các tia phân giác của góc B và C cắt nhau ở I. Kẻ ID ⊥ AB, IE ⊥ AC (D ∈ AB, E ∈ AC). Chứng minh rằng AD = AE.');
    const r = kc(p.I, p.A, p.B);
    expect(kc(p.I, p.B, p.C)).toBeCloseTo(r, 9);
    expect(kc(p.I, p.C, p.A)).toBeCloseTo(r, 9);
    expect(cungPhia(p.I, p.A, p.B, p.C)).toBe(true);
    expect(cungPhia(p.I, p.B, p.C, p.A)).toBe(true);
    expect(Math.hypot(p.A[0] - p.D[0], p.A[1] - p.D[1])).toBeCloseTo(Math.hypot(p.A[0] - p.E[0], p.A[1] - p.E[1]), 9);
  });

  it('hinh-phang #35 "phân giác ngoài tại đỉnh B và C cắt nhau ở E": E cách đều 3 đường cạnh, khác phía A so với BC', () => {
    const p = toaDoHinh('Cho tam giác ABC, đường phân giác AD. Các đường phân giác ngoài tại đỉnh B và C cắt nhau ở E. Chứng minh rằng ba điểm A, D, E thẳng hàng.');
    const r = kc(p.E, p.B, p.C);
    expect(kc(p.E, p.A, p.B)).toBeCloseTo(r, 9);
    expect(kc(p.E, p.A, p.C)).toBeCloseTo(r, 9);
    expect(cungPhia(p.E, p.A, p.B, p.C)).toBe(false);
    // A, D, E thẳng hàng (đúng điều đề bắt chứng minh)
    expect(kc(p.D, p.A, p.E)).toBeLessThan(1e-9);
  });

  it('hinh-phang #41 "phân giác các góc ngoài tại đỉnh A và C cắt nhau ở K" + "phân giác của góc A và góc C … cắt nhau ở I": B, I, K thẳng hàng', () => {
    const p = toaDoHinh('Cho tam giác ABC. Các đường phân giác các góc ngoài tại đỉnh A và C cắt nhau ở K. a) Chứng minh rằng BK là phân giác của góc ABC. b) Cho các đường phân giác của góc A và góc C trong tam giác ABC cắt nhau ở I. Chứng minh rằng B, I, K thẳng hàng.');
    expect(kc(p.I, p.B, p.K)).toBeLessThan(1e-9);
    expect(cungPhia(p.K, p.B, p.A, p.C)).toBe(false);
  });

  it.each([
    ['trộn trong/ngoài', 'Cho tam giác ABC. Phân giác trong góc B và phân giác ngoài góc C cắt nhau tại E.'],
    ['đỉnh không thuộc tam giác', 'Cho tam giác ABC. Các tia phân giác của góc M và N cắt nhau ở I.'],
    ['trùng đỉnh', 'Cho tam giác ABC. Phân giác góc B và B cắt nhau tại I.'],
  ])('bỏ qua (%s)', (_ly, de) => {
    expect(intentsOf(de)).toEqual([]);
  });
});
