// Giao điểm 2 đường đồng phẳng / tâm đáy — đo toạ độ + từ chối khi 2 đường không cắt.
import { toaDoDe3d, dist, mid, len, normal, sub } from '../../__tests__/helpers/toaDo3d';
import { tryDeterministicFigure3d } from '../../deterministic/tryDeterministicFigure3d';

describe('lineIntersection3d', () => {
  it('"O là giao điểm của hai đường chéo" ⇒ O = trung điểm AC = trung điểm BD (hình thoi)', () => {
    const P = toaDoDe3d('Cho hình chóp S.ABCD có đáy ABCD là hình thoi cạnh a có O là giao điểm của hai đường chéo, góc ABC=60°, SO⊥(ABCD), SO=a√3.');
    expect(dist(P.O, mid(P.A, P.C))).toBeLessThan(1e-9);
    expect(dist(P.O, mid(P.B, P.D))).toBeLessThan(1e-9);
    // SO ⊥ đáy: S − O ∥ pháp tuyến
    const n = normal(P.A, P.B, P.C);
    expect(len(normal(P.S, P.O, [P.O[0] + n[0], P.O[1] + n[1], P.O[2] + n[2]]))).toBeLessThan(1e-9);
  });

  it('"O là tâm của đáy" (chóp tứ giác đều) ⇒ O là tâm, SO ⊥ đáy', () => {
    const P = toaDoDe3d('Cho hình chóp tứ giác đều S.ABCD có O là tâm của đáy và có tất cả các cạnh bằng nhau.');
    expect(dist(P.O, mid(P.A, P.C))).toBeLessThan(1e-9);
    expect(Math.abs(P.S[0] - P.O[0]) + Math.abs(P.S[1] - P.O[1])).toBeLessThan(1e-9);
  });

  it('"AD cắt BC tại E" với đáy không nêu hình ⇒ tứ giác thường, E thẳng hàng với A,D và B,C', () => {
    const P = toaDoDe3d('Cho hình chóp S.ABCD có AD cắt BC tại E. Gọi M là trung điểm của SA.');
    expect(len(normal(P.A, P.D, P.E))).toBeLessThan(1e-9);
    expect(len(normal(P.B, P.C, P.E))).toBeLessThan(1e-9);
    expect(len(sub(P.E, P.A))).toBeLessThan(6);
  });

  it('"hình vuông cạnh 2a, tâm O" (chóp tứ giác đều) ⇒ O là tâm đáy', () => {
    const P = toaDoDe3d('Cho hình chóp tứ giác đều S.ABCD có đáy ABCD là hình vuông cạnh 2a, tâm O, SO=a');
    expect(dist(P.O, mid(P.A, P.C))).toBeLessThan(1e-9);
    expect(dist(P.O, mid(P.B, P.D))).toBeLessThan(1e-9);
  });

  it('hai đường chéo nhau ⇒ verify từ chối (không có giao điểm thật)', () => {
    const r = tryDeterministicFigure3d('Cho tứ diện ABCD. Gọi O là giao điểm của AB và CD.');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.detail ?? '').toMatch(/chéo nhau/);
  });
});
