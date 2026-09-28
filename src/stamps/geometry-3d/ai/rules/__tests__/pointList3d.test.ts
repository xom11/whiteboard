// Danh sách "lần lượt là trung điểm / trọng tâm" N điểm — đo toạ độ thật.
import { toaDoDe3d, dist, mid, type Vec3 } from '../../__tests__/helpers/toaDo3d';
import { tryDeterministicFigure3d } from '../../deterministic/tryDeterministicFigure3d';

const tt = (a: Vec3, b: Vec3, c: Vec3): Vec3 => [0, 1, 2].map((k) => (a[k] + b[k] + c[k]) / 3) as Vec3;

describe('pointList3d', () => {
  it("3 trung điểm có prime: M, N, P lần lượt là trung điểm của các cạnh AA', BB', CC'", () => {
    const P = toaDoDe3d("Cho hình lăng trụ tam giác ABC.A'B'C'. Gọi M, N, P lần lượt là trung điểm của các cạnh AA', BB', CC'.");
    expect(dist(P.M, mid(P.A, P["A'"]))).toBeLessThan(1e-9);
    expect(dist(P.N, mid(P.B, P["B'"]))).toBeLessThan(1e-9);
    expect(dist(P.P, mid(P.C, P["C'"]))).toBeLessThan(1e-9);
  });

  it('phân cách "và": M, N, P lần lượt là trung điểm của SB, SC và SD (không lệch cặp)', () => {
    const P = toaDoDe3d('Cho hình chóp S.ABCD có đáy là hình vuông cạnh a, SA ⊥ (ABCD) và SA = a. Gọi M, N, P lần lượt là trung điểm của SB, SC và SD.');
    expect(dist(P.M, mid(P.S, P.B))).toBeLessThan(1e-9);
    expect(dist(P.N, mid(P.S, P.C))).toBeLessThan(1e-9);
    expect(dist(P.P, mid(P.S, P.D))).toBeLessThan(1e-9);
  });

  it("trọng tâm: G và G' lần lượt là trọng tâm của hai tam giác ABC và A'B'C'", () => {
    const P = toaDoDe3d("Cho hình lăng trụ tam giác ABC.A'B'C'. Gọi G và G' lần lượt là trọng tâm của hai tam giác ABC và A'B'C'.");
    expect(dist(P.G, tt(P.A, P.B, P.C))).toBeLessThan(1e-9);
    expect(dist(P["G'"], tt(P["A'"], P["B'"], P["C'"]))).toBeLessThan(1e-9);
  });

  it('mệnh đề còn điểm P chưa hiểu ⇒ không claim (không FULL giả)', () => {
    const r = tryDeterministicFigure3d('Cho tứ diện ABCD. Gọi M,N lần lượt là trung điểm của các cạnh AB và CD, trên cạnh AD lấy điểm P không trùng với trung điểm của AD.');
    expect(r.ok).toBe(false);
  });
});
