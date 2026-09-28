// Mệnh đề điều kiện khối (mặt bên ⊥ đáy, SA ⊥ đáy, chân hình chiếu có tên) được claim KHI hình đã
// tôn trọng nó — đo toạ độ; và KHÔNG claim khi còn nội dung chưa dựng / hình không đúng mô tả.
import { toaDoDe3d, viPhamDe3d, sub, dist, mid, normal, perpToPlane, cosAbs, type Vec3 } from '../../__tests__/helpers/toaDo3d';
import { tryDeterministicFigure3d } from '../../deterministic/tryDeterministicFigure3d';

const bang = (x: number, y: number) => Math.abs(x - y) < 1e-9;

describe('solidFacts3d + chân hình chiếu có tên', () => {
  it('"Tam giác SAB đều và nằm trong mặt phẳng vuông góc với đáy (ABCD)" (viết hoa đầu câu) ⇒ FULL, SAB đều thật, (SAB) ⊥ đáy', () => {
    const de = 'Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh 1. Tam giác SAB đều và nằm trong mặt phẳng vuông góc với đáy (ABCD).';
    const P = toaDoDe3d(de);
    expect(bang(dist(P.S, P.A), dist(P.A, P.B)) && bang(dist(P.S, P.B), dist(P.A, P.B))).toBe(true);
    expect(cosAbs(normal(P.S, P.A, P.B), normal(P.A, P.B, P.C))).toBeLessThan(1e-9);
    expect(viPhamDe3d(de)).toEqual([]);
  });

  it('"Đường thẳng SA vuông góc với mặt phẳng đáy và SA = a" ⇒ FULL, SA ⊥ đáy', () => {
    const P = toaDoDe3d('Cho hình chóp S.ABCD có đáy là hình vuông cạnh a. Đường thẳng SA vuông góc với mặt phẳng đáy và SA = a.');
    expect(perpToPlane(sub(P.S, P.A), P.A, P.B, P.C)).toBe(true);
  });

  it('"hình chiếu … trùng với trung điểm H của cạnh AC" ⇒ có điểm H = trung điểm AC và SH ⊥ đáy', () => {
    const P = toaDoDe3d('Cho hình chóp S.ABC có đáy là tam giác ABC vuông tại B và AB=a,BC =a 3. Hình chiếu vuông góc của đỉnh S trên mặt phẳng đáy là trung điểm H của cạnh AC. Biết SH =a.');
    expect(dist(P.H, mid(P.A, P.C))).toBeLessThan(1e-9);
    expect(perpToPlane(sub(P.S, P.H), P.A, P.B, P.C)).toBe(true);
  });

  it("lăng trụ: hình chiếu của B' lên mặt phẳng đáy trùng với trung điểm H của AB", () => {
    const P = toaDoDe3d("Cho hình lăng trụ ABC.A'B'C' có đáy là tam giác đều cạnh a, hình chiếu vuông góc của B' lên mặt phẳng đáy trùng với trung điểm H của cạnh AB.");
    expect(dist(P.H, mid(P.A, P.B))).toBeLessThan(1e-9);
    expect(perpToPlane(sub(P["B'"], P.H), P.A, P.B, P.C)).toBe(true);
  });

  it('tên nhúng trong mô tả ("trung điểm H của AC") mà hình không có H ⇒ named-missing, không FULL giả', () => {
    const r = tryDeterministicFigure3d('Cho hình chóp S.ABC có đáy là tam giác đều. Biết SA vuông góc với đáy, gọi trung điểm H của AC.');
    if (r.ok) {
      const labels = Object.values(r.state.objects).map((o) => o.label);
      expect(labels).toContain('H');
    } else expect(['named-missing', 'incomplete-coverage']).toContain(r.reason);
  });

  it('đáy "lục giác đều" nhưng nhãn S.ABCD (đề lỗi) ⇒ không FULL', () => {
    expect(tryDeterministicFigure3d('Cho hình chóp S.ABCD có đáy là lục giác đều cạnh a. Tam giác SAD vuông cân tại S và thuộc mặt phẳng vuông góc với đáy ABCD.').ok).toBe(false);
  });

  it('"đáy ABCD là hình bình hành, tâm O" ⇒ O là giao 2 đường chéo', () => {
    const P = toaDoDe3d('Cho hình chóp S.ABCD đáy ABCD là hình bình hành, tâm O. K là trung điểm của SA.');
    expect(dist(P.O, mid(P.A, P.C))).toBeLessThan(1e-9);
    expect(dist(P.K, mid(P.S, P.A))).toBeLessThan(1e-9);
    void ([] as Vec3[]);
  });
});
