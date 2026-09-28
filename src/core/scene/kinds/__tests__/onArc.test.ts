// Cung AB định hướng (cho glider onArc): cung nhỏ/lớn/không chứa/chứa ref.
import { orientedArc, pointOnOrientedArc } from '../pointConstructions';

const TAU = 2 * Math.PI;
const goc = (p: readonly [number, number]) => ((Math.atan2(p[1], p[0]) % TAU) + TAU) % TAU;
/** Góc quét ngược chiều kim đồng hồ từ s tới e (tâm gốc toạ độ). */
const quet = (s: readonly [number, number], e: readonly [number, number]) => (((goc(e) - goc(s)) % TAU) + TAU) % TAU;

describe('orientedArc', () => {
  const A: [number, number] = [1, 0];
  const B: [number, number] = [0, 1]; // cung nhỏ A→B ngược chiều kim đồng hồ = 90°

  it('minor: góc quét ≤ 180° dù truyền A,B theo thứ tự nào', () => {
    expect(quet(...orientedArc([0, 0], A, B, 'minor'))).toBeCloseTo(Math.PI / 2, 9);
    expect(quet(...orientedArc([0, 0], B, A, 'minor'))).toBeCloseTo(Math.PI / 2, 9);
  });
  it('major: góc quét > 180°', () => {
    expect(quet(...orientedArc([0, 0], A, B, 'major'))).toBeCloseTo((3 * Math.PI) / 2, 9);
  });
  it('notContaining / containing ref', () => {
    const ref: [number, number] = [-1, 0];
    const [s, e] = orientedArc([0, 0], A, B, 'notContaining', ref);
    const giua = pointOnOrientedArc([0, 0], 1, s, e, 0.5);
    expect(giua[0]).toBeCloseTo(Math.SQRT1_2, 9); // cung nhỏ 45°
    const [s2, e2] = orientedArc([0, 0], A, B, 'containing', ref);
    const giua2 = pointOnOrientedArc([0, 0], 1, s2, e2, 0.5);
    expect(giua2[0]).toBeCloseTo(-Math.SQRT1_2, 9); // cung lớn 225°
  });
});
