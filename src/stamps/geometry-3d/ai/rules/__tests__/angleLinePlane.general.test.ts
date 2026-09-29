// Góc đường–mặt: hình chiếu dựng đúng đầu mút NGOÀI mặt (lăng trụ; mặt chứa đỉnh chóp) — đo toạ độ.
import { tryDeterministicFigure3d } from '../../deterministic/tryDeterministicFigure3d';
import { toaDo3d } from '../../deterministic/factAudit3d';
import { sub, perpToPlane, dot, normal } from '../../__tests__/helpers/toaDo3d';

const build = (de: string) => {
  const r = tryDeterministicFigure3d(de);
  if (!r.ok) throw new Error(`${r.reason} ${r.detail ?? ''}`);
  return toaDo3d(r.state);
};

describe('angleLinePlane — tổng quát', () => {
  it("lăng trụ đứng: góc giữa AC' và (ABCD) ⇒ chiếu C' xuống đáy = C", () => {
    const P = build("Cho hình lăng trụ đứng ABCD.A'B'C'D' có đáy ABCD là hình vuông cạnh a. Góc giữa đường thẳng AC' và mặt phẳng (ABCD) bằng 60°.");
    const H = P["HC"];
    expect(H).toBeDefined();
    expect(Math.hypot(...sub(H, P.C))).toBeLessThan(1e-9);
    expect(perpToPlane(sub(P["C'"], H), P.A, P.B, P.C)).toBe(true);
  });

  it('chóp: góc giữa SC và (SAB) ⇒ chiếu C (không phải S) lên (SAB)', () => {
    const P = build('Cho hình chóp S.ABCD có đáy là hình vuông cạnh a, SA ⊥ (ABCD). Góc giữa SC và mặt phẳng (SAB) bằng 30°.');
    const H = P.HC;
    expect(H).toBeDefined();
    expect(perpToPlane(sub(P.C, H), P.S, P.A, P.B)).toBe(true);
    expect(Math.abs(dot(sub(H, P.S), normal(P.S, P.A, P.B)))).toBeLessThan(1e-9);
  });
});
