// "hình chiếu của A trên SB" KHÔNG phải "A ∈ SB"; "H ∈ AB sao cho HB = 2HA" đặt đúng tỉ số;
// hai điểm cùng nhãn ⇒ verify từ chối. Đo toạ độ thật.
import { toaDoDe3d, dist } from '../../__tests__/helpers/toaDo3d';
import { tryDeterministicFigure3d } from '../../deterministic/tryDeterministicFigure3d';
import { intentToScene3d } from '../../intentToScene3d';
import { verifyFigure3d } from '../../verify3d';
import { solid, addPoint3d } from '../../intent';

describe('pointOnEdge — hình chiếu / tỉ số / nhãn trùng', () => {
  it('"Gọi H là hình chiếu của A trên SB" không sinh điểm A thứ hai', () => {
    const r = tryDeterministicFigure3d('Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh a, SA vuông góc với đáy. Gọi H là hình chiếu của A trên SB.');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const labels = Object.values(r.state.objects).filter((o) => o.kind === 'point3d').map((o) => o.label);
    expect(labels.filter((l) => l === 'A')).toHaveLength(1);
  });

  it('"M thuộc cạnh SC sao cho SM = 2MC" ⇒ SM = 2·MC trên đoạn SC', () => {
    const P = toaDoDe3d('Cho hình chóp S.ABC có đáy là tam giác đều. Lấy điểm M thuộc cạnh SC sao cho SM = 2MC.');
    expect(Math.abs(dist(P.S, P.M) - 2 * dist(P.M, P.C))).toBeLessThan(1e-9);
    expect(Math.abs(dist(P.S, P.M) + dist(P.M, P.C) - dist(P.S, P.C))).toBeLessThan(1e-9);
  });

  it('không có tỉ số ⇒ vẫn là điểm giữa cạnh như cũ', () => {
    const P = toaDoDe3d('Cho hình chóp S.ABC. Lấy điểm M thuộc cạnh SC.');
    expect(Math.abs(dist(P.S, P.M) - dist(P.M, P.C))).toBeLessThan(1e-9);
  });

  it('verify3d từ chối scene có 2 điểm cùng nhãn', () => {
    const st = intentToScene3d([
      solid({ flavor: 'pyramid', baseLabels: ['A', 'B', 'C'], baseVariant: 'triangle', apex: 'S', apexVariant: 'regular' }),
      addPoint3d('A', { kind: 'midpoint', p1: 'S', p2: 'B' }),
    ]);
    const v = verifyFigure3d(st);
    expect(v.ok).toBe(false);
    expect(v.issues.join()).toMatch(/trùng/);
  });
});
