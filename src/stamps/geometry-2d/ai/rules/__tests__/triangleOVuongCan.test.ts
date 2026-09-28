/** @jest-environment jsdom */
// "cân đỉnh A", "vuông ở A", "vuông cân tại A" — trước đây rơi về tam giác thường
// (hình SAI mà vẫn "full"). Đo góc/cạnh trên hình JSXGraph thật.
import { toaDoHinh, dist, type XY } from '../../__tests__/helpers/toaDoHinh';

beforeAll(() => {
  window.matchMedia ??= (() => ({ matches: false, addListener() {}, removeListener() {} })) as never;
});

const goc = (a: XY, o: XY, b: XY) => {
  const u = [a[0] - o[0], a[1] - o[1]];
  const v = [b[0] - o[0], b[1] - o[1]];
  return (Math.acos((u[0] * v[0] + u[1] * v[1]) / (Math.hypot(u[0], u[1]) * Math.hypot(v[0], v[1]))) * 180) / Math.PI;
};

describe('triangle — "ở"/"đỉnh" và "vuông cân"', () => {
  it('hinh-phang #1 "tam giác ABC cân đỉnh A": AB = AC', () => {
    const p = toaDoHinh('Cho tam giác ABC cân đỉnh A. Gọi BD, CE lần lượt là phân giác trong góc B, C của tam giác ABC.');
    expect(dist(p.A, p.B)).toBeCloseTo(dist(p.A, p.C), 9);
  });

  it('"cân ở A": AB = AC', () => {
    const p = toaDoHinh('Cho tam giác ABC cân ở A. Gọi M là trung điểm của BC.');
    expect(dist(p.A, p.B)).toBeCloseTo(dist(p.A, p.C), 9);
  });

  it('hinh-phang #48 "tam giác ABC vuông ở A": góc A = 90°', () => {
    const p = toaDoHinh('Cho tam giác ABC vuông ở A, đường cao AH, phân giác AD.');
    expect(goc(p.B, p.A, p.C)).toBeCloseTo(90, 9);
  });

  it.each([
    ['A', 'tại'],
    ['A', 'ở'],
    ['B', 'tại'],
    ['C', 'tại'],
  ])('"vuông cân %s %s": góc đỉnh 90°, hai cạnh góc vuông bằng nhau', (dinh, gioi) => {
    const p = toaDoHinh(`Cho tam giác ABC vuông cân ${gioi} ${dinh}.`);
    const [u, v] = ['A', 'B', 'C'].filter((x) => x !== dinh);
    expect(goc(p[u], p[dinh], p[v])).toBeCloseTo(90, 9);
    expect(dist(p[dinh], p[u])).toBeCloseTo(dist(p[dinh], p[v]), 9);
  });
});
