// Khoảng cách giữa 2 đường chéo nhau → đoạn vuông góc chung: đo 2 chân nằm trên 2 đường và đoạn
// nối ⊥ cả hai; độ dài = công thức |(C−A)·(u×v)|/|u×v|.
import { tryDeterministicFigure3d } from '../../deterministic/tryDeterministicFigure3d';
import { toaDo3d } from '../../deterministic/factAudit3d';
import { sub, cross, dot, len, cosAbs, perpToPlane, mid, dist, type Vec3 } from '../../__tests__/helpers/toaDo3d';

function feet(de: string) {
  const r = tryDeterministicFigure3d(de);
  if (!r.ok) throw new Error(`${r.reason} ${r.detail ?? ''}`);
  const P = toaDo3d(r.state);
  const f = Object.values(r.state.objects).filter((o) => o.kind === 'point3d' && (o.attrs as any).constraint.kind === 'commonPerpFoot');
  return { P, f: f.map((o) => o.label) };
}
const onLine = (X: Vec3, A: Vec3, B: Vec3) => len(cross(sub(X, A), sub(B, A))) < 1e-9;

describe('skewDistance3d', () => {
  it('"Khoảng cách giữa hai đường thẳng SB và CD" (SA ⊥ đáy vuông) ⇒ đoạn ⊥ chung đúng', () => {
    const { P, f } = feet('Cho hình chóp S.ABCD có đáy là hình vuông cạnh a. Đường thẳng SA vuông góc với mặt phẳng đáy và SA=a. Khoảng cách giữa hai đường thẳng SB và CD bằng');
    expect(f).toHaveLength(2);
    const [X, Y] = [P[f[0]], P[f[1]]];
    expect(onLine(X, P.S, P.B)).toBe(true);
    expect(onLine(Y, P.C, P.D)).toBe(true);
    const u = sub(P.B, P.S), v = sub(P.D, P.C);
    expect(cosAbs(sub(Y, X), u)).toBeLessThan(1e-9);
    expect(cosAbs(sub(Y, X), v)).toBeLessThan(1e-9);
    const n = cross(u, v);
    expect(Math.abs(dist(X, Y) - Math.abs(dot(sub(P.C, P.S), n)) / len(n))).toBeLessThan(1e-9);
  });

  it('hai đường cắt nhau (AB, BC chung đỉnh) ⇒ không dựng đoạn ⊥ chung', () => {
    const r = tryDeterministicFigure3d('Cho hình chóp S.ABCD có đáy là hình vuông cạnh a. Khoảng cách giữa hai đường thẳng AB và BC bằng');
    if (r.ok) expect(Object.values(r.state.objects).some((o) => (o.attrs as any).constraint?.kind === 'commonPerpFoot')).toBe(false);
  });

  it('hai đường song song (AB, CD của hình vuông) ⇒ verify từ chối', () => {
    const r = tryDeterministicFigure3d('Cho hình chóp S.ABCD có đáy là hình vuông cạnh a. Khoảng cách giữa hai đường thẳng AB và CD bằng');
    expect(r.ok).toBe(false);
  });

  it('hai mặt (SMN), (SBD) cùng ⊥ đáy với M, N định nghĩa dạng danh sách ⇒ chân = MN ∩ BD', () => {
    const r = tryDeterministicFigure3d('Cho hình chóp S.ABCD có đáy là hình thang vuông tại B và C với AB = 4a, BC = 2a, CD = a. Gọi M, N lần lượt là trung điểm của AB và BC. Hai mặt phẳng (SMN) và (SBD) cùng vuông góc với mặt phẳng đáy.');
    const P = toaDo3d((r as any).state);
    const F: Vec3 = [P.S[0], P.S[1], 0];
    expect(len(cross(sub(F, P.M), sub(P.N, P.M)))).toBeLessThan(1e-9);
    expect(len(cross(sub(F, P.B), sub(P.D, P.B)))).toBeLessThan(1e-9);
    expect(perpToPlane(sub(P.S, F), P.A, P.B, P.C)).toBe(true);
    void mid;
  });
});
