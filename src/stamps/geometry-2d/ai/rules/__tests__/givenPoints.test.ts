/** @jest-environment jsdom */
// Đề chỉ có điểm/đoạn trần (chương Vectơ lớp 10): điểm phải được dựng, và các
// construct phía sau (trung điểm…) phải đúng trên hình thật.
import { toaDoHinh, dist, type XY } from '../../__tests__/helpers/toaDoHinh';
import { givenPointsRule } from '../givenPoints';
import { segmentClauses } from '../../deterministic/coverage';

beforeAll(() => {
  window.matchMedia ??= (() => ({ matches: false, addListener() {}, removeListener() {} })) as never;
});

const cheo = (a: XY, b: XY, p: XY) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
const names = (de: string) =>
  givenPointsRule.match({ problem: de, clauses: segmentClauses(de) }).flatMap((m) => m.intents).map((i: any) => i.name).filter(Boolean);

describe('givenPoints', () => {
  it('"Cho đoạn thẳng AB" + trung điểm I: I cách đều A, B', () => {
    const p = toaDoHinh('Cho đoạn thẳng AB. Gọi I là trung điểm của AB.');
    expect(dist(p.A, p.B)).toBeGreaterThan(1);
    expect(dist(p.I, p.A)).toBeCloseTo(dist(p.I, p.B), 9);
  });

  it('"Cho ba điểm A, B, C phân biệt": ba điểm KHÔNG thẳng hàng', () => {
    const p = toaDoHinh('Cho ba điểm A, B, C phân biệt. Gọi M là trung điểm AB.');
    expect(Math.abs(cheo(p.A, p.B, p.C))).toBeGreaterThan(1);
    expect(dist(p.M, p.A)).toBeCloseTo(dist(p.M, p.B), 9);
  });

  it('"Cho bốn điểm A, B, C, D" + trung điểm AB, CD', () => {
    const p = toaDoHinh('Cho bốn điểm A, B, C, D. Gọi I, J lần lượt là trung điểm của AB và CD.');
    expect(dist(p.I, p.A)).toBeCloseTo(dist(p.I, p.B), 9);
    expect(dist(p.J, p.C)).toBeCloseTo(dist(p.J, p.D), 9);
  });

  it('không nhận điểm có ràng buộc: "Cho 2 điểm A và B thuộc đường tròn (O)"', () => {
    expect(names('Cho 2 điểm A và B thuộc đường tròn (O).')).toEqual([]);
  });

  it('không nhận "thẳng hàng" (collinearPoints lo), số lượng lệch danh sách', () => {
    expect(names('Cho ba điểm A, B, C thẳng hàng.')).toEqual([]);
    expect(names('Cho ba điểm A, B.')).toEqual([]);
  });

  it('"không thẳng hàng" vẫn nhận', () => {
    expect(names('Cho ba điểm A, B, C không thẳng hàng.')).toEqual(['A', 'B', 'C']);
  });
});
