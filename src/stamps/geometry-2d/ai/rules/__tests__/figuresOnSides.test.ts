/** @jest-environment jsdom */
// Hình dựng RA PHÍA NGOÀI trên cạnh đa giác gốc — đo trên JSXGraph thật: đúng là hình
// vuông / tam giác đều / vuông cân / hình bình hành, nằm KHÁC phía đỉnh còn lại, và
// thoả chính điều đề bắt chứng minh.
import { toaDoHinh, dist, type XY } from '../../__tests__/helpers/toaDoHinh';
import { allNamedEntitiesPresent } from '../../deterministic/guards';
import { tryDeterministicFigure } from '../../deterministic/tryDeterministicFigure';

beforeAll(() => {
  window.matchMedia ??= (() => ({ matches: false, addListener() {}, removeListener() {} })) as never;
});

const v = (a: XY, b: XY): XY => [b[0] - a[0], b[1] - a[1]];
const dot = (a: XY, b: XY) => a[0] * b[0] + a[1] * b[1];
const cross = (a: XY, b: XY) => a[0] * b[1] - a[1] * b[0];
/** P và Q khác phía đường XY. */
const khacPhia = (x: XY, y: XY, p: XY, q: XY) => Math.sign(cross(v(x, y), v(x, p))) === -Math.sign(cross(v(x, y), v(x, q)));

function laHinhVuong(a: XY, b: XY, c: XY, d: XY) {
  const s = dist(a, b);
  for (const [p, q] of [[b, c], [c, d], [d, a]] as [XY, XY][]) expect(dist(p, q)).toBeCloseTo(s, 9);
  expect(dot(v(a, b), v(b, c))).toBeCloseTo(0, 9);
  expect(dot(v(b, c), v(c, d))).toBeCloseTo(0, 9);
}

describe('figuresOnSides', () => {
  it('hinh-phang #88: hai hình vuông ABEF, ADGH ngoài hình bình hành ⇒ AC = FH, AC ⊥ FH', () => {
    const p = toaDoHinh('Cho hình bình hành ABCD. Vẽ về phía ngoài hình bình hành hai hình vuông ABEF và ADGH. Chứng minh: a) AC = FH. b) AC ⊥ FH. c) Tam giác CEG là tam giác vuông cân.');
    laHinhVuong(p.A, p.B, p.E, p.F);
    laHinhVuong(p.A, p.D, p.G, p.H);
    expect(khacPhia(p.A, p.B, p.E, p.C)).toBe(true);
    expect(khacPhia(p.A, p.D, p.G, p.C)).toBe(true);
    expect(dist(p.A, p.C)).toBeCloseTo(dist(p.F, p.H), 9);
    expect(dot(v(p.A, p.C), v(p.F, p.H))).toBeCloseTo(0, 9);
    // c) CEG vuông cân tại C.
    expect(dist(p.C, p.E)).toBeCloseTo(dist(p.C, p.G), 9);
    expect(dot(v(p.C, p.E), v(p.C, p.G))).toBeCloseTo(0, 9);
  });

  it('hinh-phang #63: ABD, ACE vuông cân tại A ra phía ngoài ⇒ MA ⊥ BC', () => {
    const p = toaDoHinh('Cho tam giác nhọn ABC. Vẽ ra phía ngoài của tam giác này các tam giác ABD và tam giác ACE vuông cân tại A. Gọi M là trung điểm của DE. Chứng minh rằng hai đường thẳng MA và BC vuông góc với nhau.');
    expect(dist(p.A, p.D)).toBeCloseTo(dist(p.A, p.B), 9);
    expect(dot(v(p.A, p.B), v(p.A, p.D))).toBeCloseTo(0, 9);
    expect(dist(p.A, p.E)).toBeCloseTo(dist(p.A, p.C), 9);
    expect(dot(v(p.A, p.C), v(p.A, p.E))).toBeCloseTo(0, 9);
    expect(khacPhia(p.A, p.B, p.D, p.C)).toBe(true);
    expect(khacPhia(p.A, p.C, p.E, p.B)).toBe(true);
    expect(dot(v(p.M, p.A), v(p.B, p.C))).toBeCloseTo(0, 9);
  });

  it('tam giác đều dựng ra phía ngoài: "Về phía ngoài tam giác ABC dựng các tam giác đều ABM, ACN"', () => {
    const p = toaDoHinh('Cho tam giác ABC. Về phía ngoài tam giác ABC dựng các tam giác đều ABM, ACN.');
    expect(dist(p.A, p.M)).toBeCloseTo(dist(p.A, p.B), 9);
    expect(dist(p.B, p.M)).toBeCloseTo(dist(p.A, p.B), 9);
    expect(dist(p.C, p.N)).toBeCloseTo(dist(p.A, p.C), 9);
    expect(khacPhia(p.A, p.B, p.M, p.C)).toBe(true);
    expect(khacPhia(p.A, p.C, p.N, p.B)).toBe(true);
    // Hệ quả kinh điển: BN = CM.
    expect(dist(p.B, p.N)).toBeCloseTo(dist(p.C, p.M), 9);
  });

  it('lop10 #65: hình bình hành ABIJ, BCPQ, CARS ngoài tam giác ⇒ vectơ RJ + IQ + PS = 0', () => {
    const p = toaDoHinh('Cho tam giác ABC. Bên ngoài tam giác vẽ các hình bình hành ABIJ, BCPQ, CARS. Chứng minh rằng vectơ RJ + vectơ IQ + vectơ PS = vectơ 0.');
    for (const [x, y, z, w, t] of [['A', 'B', 'I', 'J', 'C'], ['B', 'C', 'P', 'Q', 'A'], ['C', 'A', 'R', 'S', 'B']]) {
      // XYZW hình bình hành: vectơ XY = vectơ WZ; Z, W khác phía cạnh XY so với T.
      const xy = v(p[x], p[y]);
      const wz = v(p[w], p[z]);
      expect(xy[0]).toBeCloseTo(wz[0], 9);
      expect(xy[1]).toBeCloseTo(wz[1], 9);
      expect(khacPhia(p[x], p[y], p[z], p[t])).toBe(true);
    }
    const s = [v(p.R, p.J), v(p.I, p.Q), v(p.P, p.S)].reduce((a, b) => [a[0] + b[0], a[1] + b[1]] as XY);
    expect(s[0]).toBeCloseTo(0, 9);
    expect(s[1]).toBeCloseTo(0, 9);
  });

  it('guard: danh sách "hình vuông ABEF và ADGH" — mọi đỉnh là tên được giới thiệu', () => {
    const r = tryDeterministicFigure('Cho hình bình hành ABCD.');
    if (!r.ok) throw new Error(r.reason);
    expect(allNamedEntitiesPresent('Cho hình bình hành ABCD. Vẽ hai hình vuông ABEF và ADGH.', r.figure.dsl).missing.sort()).toEqual(['E', 'F', 'G', 'H']);
  });
});
