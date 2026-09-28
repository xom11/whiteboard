/** @jest-environment jsdom */
import { diameterCircleMeetsCircleRule } from '../diameterCircleMeetsCircle';
import { segmentClauses } from '../../deterministic/coverage';
import { toaDoHinh, dist, type XY } from '../../__tests__/helpers/toaDoHinh';

beforeAll(() => {
  window.matchMedia ??= (() => ({ matches: false, addListener() {}, removeListener() {} })) as never;
});

const dot = (a: XY, b: XY, c: XY, d: XY) => (b[0] - a[0]) * (d[0] - c[0]) + (b[1] - a[1]) * (d[1] - c[1]);
const mid = (a: XY, b: XY): XY => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

describe('diameterCircleMeetsCircle — đường tròn đường kính XY cắt (O)', () => {
  it('hinh-phang #158 "Đường tròn đường kính OM cắt (O; R) tại hai điểm E, F": E, F trên cả hai đường tròn ⇒ ME ⊥ OE (tiếp tuyến)', () => {
    const p = toaDoHinh('Cho đường tròn (O; R) và một điểm M nằm ngoài đường tròn. Đường tròn đường kính OM cắt đường tròn (O; R) tại hai điểm E, F.');
    const I = mid(p.O, p.M);
    for (const X of [p.E, p.F]) {
      expect(dist(I, X)).toBeCloseTo(dist(p.O, p.M) / 2, 9);
      expect(dot(X, p.O, X, p.M)).toBeCloseTo(0, 9);
    }
    expect(dist(p.O, p.E)).toBeCloseTo(dist(p.O, p.F), 9);
    expect(dist(p.E, p.F)).toBeGreaterThan(0.1);
  });

  it('vao10 #76 "Đường tròn (O.) đường kính DE cắt (O) tại F" với E ∈ (O): F ≠ E, trên cả hai đường tròn', () => {
    const p = toaDoHinh('Cho tam giác ABC không cân nội tiếp (O), BD là phân giác ABC. BD cắt (O) tại E. Đường tròn (O.) đường kính DE cắt (O) tại F.');
    expect(dist(p.O, p.F)).toBeCloseTo(dist(p.O, p.A), 9);
    expect(dist(mid(p.D, p.E), p.F)).toBeCloseTo(dist(p.D, p.E) / 2, 9);
    expect(dist(p.F, p.E)).toBeGreaterThan(0.1);
  });

  it('một giao điểm mà không rõ đầu mút nào trên (O) → bỏ qua', () => {
    const de = 'Cho đường tròn (O) và hai điểm D, E. Đường tròn đường kính DE cắt (O) tại F.';
    expect(diameterCircleMeetsCircleRule.match({ problem: de, clauses: segmentClauses(de) })).toEqual([]);
  });
});
