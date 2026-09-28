// Đề THẬT (bộ vuonggoc / bosung lớp 11) → dựng bằng engine deterministic → ĐO toạ độ 3D.
// Mỗi case kiểm đúng điều kiện đề đặt lên khối (không chỉ đủ tên điểm).
import { toaDoDe3d, viPhamDe3d, sub, dot, dist, mid, normal, perpToPlane, cosAbs, len, type Vec3 } from './helpers/toaDo3d';

const EPS = 1e-9;
const vuongGoc = (u: Vec3, v: Vec3) => cosAbs(u, v) < 1e-9;
const bangNhau = (x: number, y: number) => Math.abs(x - y) < 1e-9;

describe('solidRefine3d — đáy + chân đường cao đúng đề (đo toạ độ)', () => {
  it('đáy tam giác vuông tại B + "SA⊥(ABC)" (không có chữ "đáy")', () => {
    const de = 'Cho hình chóp S.ABC có đáy là tam giác vuông tại B có AB=a,BC =a 3. Biết SA=2a và SA⊥(ABC).';
    const P = toaDoDe3d(de);
    expect(vuongGoc(sub(P.A, P.B), sub(P.C, P.B))).toBe(true);
    expect(perpToPlane(sub(P.S, P.A), P.A, P.B, P.C)).toBe(true);
    expect(viPhamDe3d(de)).toEqual([]);
  });

  it('hình chiếu của S lên (ABCD) trùng trọng tâm H của tam giác ABD', () => {
    const de = 'Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh 5a. Hình chiếu vuông góc của đỉnh S trên mặt phẳng (ABCD) trùng với trọng tâm H của tam giác ABD.';
    const P = toaDoDe3d(de);
    const G: Vec3 = [0, 1, 2].map((k) => (P.A[k] + P.B[k] + P.D[k]) / 3) as Vec3;
    // S − G ∥ pháp tuyến đáy ⇒ G là chân đường cao
    expect(perpToPlane(sub(P.S, G), P.A, P.B, P.C)).toBe(true);
    expect(Math.abs(dot(sub(G, P.A), normal(P.A, P.B, P.C)))).toBeLessThan(EPS);
  });

  it('(SAB) ⊥ đáy, SAB đều ⇒ S trên trung điểm AB và SA = SB = AB', () => {
    const de = 'Cho hình chóp S.ABCD có đáy là hình vuông cạnh a, mặt bên SAB là tam giác đều và nằm trong mặt phẳng vuông góc với mặt phẳng đáy.';
    const P = toaDoDe3d(de);
    expect(perpToPlane(sub(P.S, mid(P.A, P.B)), P.A, P.B, P.C)).toBe(true);
    expect(bangNhau(dist(P.S, P.A), dist(P.A, P.B))).toBe(true);
    expect(bangNhau(dist(P.S, P.B), dist(P.A, P.B))).toBe(true);
    expect(vuongGoc(normal(P.S, P.A, P.B), normal(P.A, P.B, P.C))).toBe(true);
  });

  it('SH ⊥ đáy với H là trung điểm AB (định nghĩa ở câu khác)', () => {
    const de = 'Cho hình chóp S.ABCD có đáy ABCD là hình thoi có tam giác ABC đều cạnh a. Gọi H là trung điểm của AB. Biết SH vuông góc với mặt đáy, mặt phẳng (SCD) tạo với đáy một góc 60°.';
    const P = toaDoDe3d(de);
    expect(perpToPlane(sub(P.S, mid(P.A, P.B)), P.A, P.B, P.C)).toBe(true);
    // hình thoi có ABC đều: AB = BC = CA
    expect(bangNhau(dist(P.A, P.B), dist(P.B, P.C))).toBe(true);
    expect(bangNhau(dist(P.A, P.C), dist(P.A, P.B))).toBe(true);
  });

  it('tứ diện OABC có OA, OB, OC đôi một vuông góc', () => {
    const P = toaDoDe3d('Cho tứ diện OABC có OA, OB, OC đôi một vuông góc với nhau. Biết OA=a,OB=b,OC =c.');
    const [a, b, c] = [sub(P.A, P.O), sub(P.B, P.O), sub(P.C, P.O)];
    expect(vuongGoc(a, b) && vuongGoc(b, c) && vuongGoc(a, c)).toBe(true);
  });

  it('hình thang vuông tại A và B ⇒ góc A, B vuông, AD ∥ BC, AD là đáy lớn', () => {
    const P = toaDoDe3d('Cho hình chóp S.ABCD có đáy ABCD là hình thang vuông tại A và B, SA⊥(ABCD). Biết AD = 2a, AB = BC = a và SD tạo với đáy một góc 30.');
    expect(vuongGoc(sub(P.B, P.A), sub(P.D, P.A))).toBe(true);
    expect(vuongGoc(sub(P.A, P.B), sub(P.C, P.B))).toBe(true);
    expect(dist(P.A, P.D)).toBeGreaterThan(dist(P.B, P.C));
    expect(perpToPlane(sub(P.S, P.A), P.A, P.B, P.C)).toBe(true);
  });

  it('nửa lục giác đều, AB = 2a ⇒ AB là đường kính, 3 cạnh còn lại bằng nhau = AB/2', () => {
    const P = toaDoDe3d('Cho hình chóp S.ABCD có đáy ABCD nửa lục giác đều cạnh a, với AB=2a. Biết SA⊥(ABCD) và mặt phẳng (SBC) tạo với đáy một góc 60°.');
    const e = dist(P.B, P.C);
    expect(bangNhau(dist(P.C, P.D), e) && bangNhau(dist(P.D, P.A), e)).toBe(true);
    expect(bangNhau(dist(P.A, P.B), 2 * e)).toBe(true);
  });

  it('hai mặt (SAB), (SAD) cùng ⊥ đáy ⇒ SA ⊥ đáy', () => {
    const P = toaDoDe3d('Cho hình chóp S.ABCD có đáy là hình chữ nhật, AB=a,AD=a 3, hai mặt phẳng (SAB) và (SAD) cùng vuông góc với mặt phẳng đáy.');
    expect(perpToPlane(sub(P.S, P.A), P.A, P.B, P.C)).toBe(true);
  });

  it('hai mặt (SBD), (SAM) cùng ⊥ đáy ⇒ chân đường cao = BD ∩ AM', () => {
    const de = 'Cho hình chóp S.ABCD có đáy ABCD là hình bình hành có diện tích bằng 2, AB= 2,BC =2. Gọi M là trung điểm của CD, hai mặt phẳng (SBD) và SAM cùng vuông góc với đáy.';
    const P = toaDoDe3d(de);
    const n = normal(P.A, P.B, P.C);
    // chân F = hình chiếu S lên đáy; F thuộc BD và AM (tích có hướng với chỉ phương = 0)
    const F = sub(P.S, [0, 0, P.S[2]] as Vec3);
    expect(len(normal(P.B, P.D, F))).toBeLessThan(1e-9);
    expect(len(normal(P.A, P.M, F))).toBeLessThan(1e-9);
    expect(perpToPlane(sub(P.S, F), P.A, P.B, P.C)).toBe(true);
    void n;
  });

  it('H ∈ AB sao cho HB = 2HA là hình chiếu của S ⇒ HB = 2HA và SH ⊥ đáy (một điểm H duy nhất)', () => {
    const de = 'Cho hình chóp S.ABCD có đáy ABCD là hình chữ nhật, AB=3AD=3. Hình chiếu vuông góc của đỉnh S lên mặt phẳng (ABCD) là điểm H∈AB sao cho HB=2HA. Biết SH= 3';
    const P = toaDoDe3d(de);
    expect(bangNhau(dist(P.H, P.B), 2 * dist(P.H, P.A))).toBe(true);
    expect(bangNhau(dist(P.A, P.H) + dist(P.H, P.B), dist(P.A, P.B))).toBe(true);
    expect(perpToPlane(sub(P.S, P.H), P.A, P.B, P.C)).toBe(true);
  });

  it('chóp tứ giác đều S.ABCD (qualifier giữa "chóp" và nhãn) ⇒ vẽ được, đáy vuông, cạnh bên bằng nhau', () => {
    const P = toaDoDe3d('Cho hình chóp tứ giác đều S.ABCD có cạnh đáy bằng a.');
    const l = dist(P.S, P.A);
    for (const v of ['B', 'C', 'D']) expect(bangNhau(dist(P.S, P[v]), l)).toBe(true);
    expect(bangNhau(dist(P.A, P.B), dist(P.B, P.C))).toBe(true);
    expect(vuongGoc(sub(P.B, P.A), sub(P.D, P.A))).toBe(true);
  });

  it('tứ diện đều ⇒ 6 cạnh bằng nhau', () => {
    const P = toaDoDe3d('Cho tứ diện đều ABCD có cạnh bằng a.');
    const V = ['A', 'B', 'C', 'D'];
    const d0 = dist(P.A, P.B);
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) expect(bangNhau(dist(P[V[i]], P[V[j]]), d0)).toBe(true);
  });

  it("lập phương ⇒ đáy vuông, cạnh bên ⊥ đáy và bằng cạnh đáy", () => {
    const P = toaDoDe3d("Cho hình lập phương ABCD.A'B'C'D' có cạnh bằng a.");
    const a = dist(P.A, P.B);
    expect(bangNhau(dist(P.B, P.C), a) && bangNhau(dist(P.A, P["A'"]), a)).toBe(true);
    expect(perpToPlane(sub(P["A'"], P.A), P.A, P.B, P.C)).toBe(true);
    expect(vuongGoc(sub(P.B, P.A), sub(P.D, P.A))).toBe(true);
  });

  it("lăng trụ xiên: hình chiếu của A' lên (ABC) là trung điểm BC", () => {
    const P = toaDoDe3d("Cho hình lăng trụ ABC.A'B'C' có đáy ABC là tam giác đều cạnh a. Hình chiếu vuông góc của A' lên (ABC) trùng với trung điểm của BC.");
    expect(perpToPlane(sub(P["A'"], mid(P.B, P.C)), P.A, P.B, P.C)).toBe(true);
    // vẫn là lăng trụ: AA' = BB' = CC' (cùng vector)
    expect(dist(sub(P["B'"], P.B), sub(P["A'"], P.A))).toBeLessThan(EPS);
    expect(bangNhau(dist(P.A, P.B), dist(P.B, P.C))).toBe(true);
  });

  it("tứ diện OABC đổi vai: đáy OBC vuông tại O, cạnh OA ⊥ (OBC)", () => {
    const de = 'Cho hình tứ diện OABC có đáy OBC là tam giác vuông tại O, OB=a, OC=a 3. Cạnh OA vuông góc với mặt phẳng (OBC), OA=a 3, gọi M là trung điểm của BC.';
    const P = toaDoDe3d(de);
    expect(perpToPlane(sub(P.A, P.O), P.O, P.B, P.C)).toBe(true);
    expect(vuongGoc(sub(P.B, P.O), sub(P.C, P.O))).toBe(true);
    expect(viPhamDe3d(de)).toEqual([]);
  });

  it('"(SAB) ⊥ (ABCD), (SAD) ⊥ (ABCD)" viết tách ⇒ SA ⊥ đáy', () => {
    const de = 'Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh a, biết (SAB) ⊥ (ABCD), (SAD) ⊥ (ABCD) và SA = a.';
    const P = toaDoDe3d(de);
    expect(perpToPlane(sub(P.S, P.A), P.A, P.B, P.C)).toBe(true);
    expect(viPhamDe3d(de)).toEqual([]);
  });

  it('chỉ biết "tam giác SAD đều" ⇒ SA = SD = AD thật (chân trên trung trực AD)', () => {
    const P = toaDoDe3d('Cho hình chóp S.ABCD có đáy ABCD là hình bình hành, tam giác SAD là tam giác đều và M là trung điểm của cạnh AD.');
    expect(bangNhau(dist(P.S, P.A), dist(P.A, P.D)) && bangNhau(dist(P.S, P.D), dist(P.A, P.D))).toBe(true);
  });

  it('SAD vuông cân tại S, (SAD) ⊥ đáy ⇒ góc ASD vuông, SA = SD', () => {
    const P = toaDoDe3d('Cho hình chóp S.ABCD có đáy ABCD là hình chữ nhật, tam giác SAD là tam giác vuông cân tại S và thuộc mặt phẳng vuông góc với đáy. Gọi H là trung điểm của AD.');
    expect(vuongGoc(sub(P.A, P.S), sub(P.D, P.S))).toBe(true);
    expect(bangNhau(dist(P.S, P.A), dist(P.S, P.D))).toBe(true);
    expect(perpToPlane(sub(P.S, P.H), P.A, P.B, P.C)).toBe(true);
  });

  it("SO ⊥ (ABCD) với \"AC và BD cắt nhau tại O\", SAC đều ⇒ SA = SC = AC", () => {
    const P = toaDoDe3d('Cho hình chóp S.ABCD có đáy ABCD là hình vuông, hai đường thẳng AC và BD cắt nhau tại O, SO ⊥ (ABCD), tam giác SAC là tam giác đều.');
    expect(bangNhau(dist(P.S, P.A), dist(P.A, P.C)) && bangNhau(dist(P.S, P.C), dist(P.A, P.C))).toBe(true);
  });

  it("I là trung điểm của CC' (nhãn có prime) ⇒ đúng trung điểm C–C', không phải C", () => {
    const P = toaDoDe3d("Cho lăng trụ đứng ABC.A'B'C' có AC = a, BC = 2a, ACB = 120◦. Gọi M là trung điểm của BB'.");
    expect(dist(P.M, mid(P.B, P["B'"]))).toBeLessThan(EPS);
    expect(dist(P.M, P.B)).toBeGreaterThan(0.5);
  });

  it('không có điều kiện ⇒ layout cũ giữ nguyên (tương thích ngược)', () => {
    const P = toaDoDe3d('Cho hình chóp S.ABCD có đáy ABCD là hình bình hành.');
    expect(P.A).toEqual([-1.4, -1, 0]);
    expect(P.S[2]).toBeCloseTo(2.4);
  });
});
