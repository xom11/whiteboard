/** @jest-environment jsdom */
import { toaDoHinh, dist, type XY } from '../../__tests__/helpers/toaDoHinh';
import { toaDoTuGiacTheoDe } from '../quadLayout';

// jsdom thiếu matchMedia — JSXGraph thật gọi nó lúc initBoard.
beforeAll(() => {
  window.matchMedia ??= (() => ({ matches: false, addListener() {}, removeListener() {} })) as never;
});

const cross = (o: XY, a: XY, b: XY) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
/** Hai đoạn PQ, RS song song. */
const songSong = (p: XY, q: XY, r: XY, s: XY) =>
  Math.abs((q[0] - p[0]) * (s[1] - r[1]) - (q[1] - p[1]) * (s[0] - r[0])) < 1e-6 * dist(p, q) * dist(r, s);
/** Góc tại V (độ) giữa VP, VQ. */
const goc = (v: XY, p: XY, q: XY) => {
  const a = Math.atan2(p[1] - v[1], p[0] - v[0]) - Math.atan2(q[1] - v[1], q[0] - v[0]);
  let d = Math.abs((a * 180) / Math.PI);
  if (d > 180) d = 360 - d;
  return d;
};
/** Tứ giác ABCD LỒI, đúng thứ tự đỉnh (không tự cắt). */
function loi(p: Record<string, XY>, ten = 'ABCD') {
  const v = [...ten].map((c) => p[c]);
  const s = v.map((_, i) => Math.sign(cross(v[i], v[(i + 1) % 4], v[(i + 2) % 4])));
  return s.every((x) => x === s[0] && x !== 0);
}

describe('quadLayout — tứ giác đặc biệt dựng theo dữ kiện đề (đo toạ độ JSXGraph thật)', () => {
  it('hình thang (AD // BC): đáy là AD, BC — KHÔNG phải AB // CD như hình mẫu', () => {
    const p = toaDoHinh('Cho hình thang ABCD (AD // BC). Gọi M, N lần lượt là trung điểm của AB, CD.');
    expect(loi(p)).toBe(true);
    expect(songSong(p.A, p.D, p.B, p.C)).toBe(true);
    expect(songSong(p.A, p.B, p.C, p.D)).toBe(false);
  });

  it('"AB < CD": đáy AB ngắn hơn CD', () => {
    const p = toaDoHinh('Cho hình thang ABCD (AB // CD) có AB < CD.');
    expect(loi(p)).toBe(true);
    expect(songSong(p.A, p.B, p.C, p.D)).toBe(true);
    expect(dist(p.A, p.B)).toBeLessThan(dist(p.C, p.D));
  });

  it('"đáy nhỏ AB, đáy lớn CD" hình thang cân: AD = BC, AB < CD', () => {
    const p = toaDoHinh('Cho hình thang cân ABCD có đáy nhỏ AB, đáy lớn CD.');
    expect(loi(p)).toBe(true);
    expect(songSong(p.A, p.B, p.C, p.D)).toBe(true);
    expect(dist(p.A, p.D)).toBeCloseTo(dist(p.B, p.C), 9);
    expect(dist(p.A, p.B)).toBeLessThan(dist(p.C, p.D));
  });

  it('hình thang cân số đo: AB = 4 cm, CD = 10 cm, AD = 5 cm', () => {
    const p = toaDoHinh('Cho hình thang cân ABCD (AB // CD) có AB = 4 cm, CD = 10 cm, AD = 5 cm.');
    expect(loi(p)).toBe(true);
    expect(songSong(p.A, p.B, p.C, p.D)).toBe(true);
    expect(dist(p.C, p.D) / dist(p.A, p.B)).toBeCloseTo(2.5, 9);
    expect(dist(p.A, p.D) / dist(p.A, p.B)).toBeCloseTo(1.25, 9);
    expect(dist(p.B, p.C)).toBeCloseTo(dist(p.A, p.D), 9);
  });

  it('hình thang vuông "góc A = góc D = 90°, AB = AD = CD/2"', () => {
    const p = toaDoHinh('Cho hình thang vuông ABCD có góc A = góc D = 90°, AB = AD = CD/2.');
    expect(loi(p)).toBe(true);
    expect(goc(p.A, p.B, p.D)).toBeCloseTo(90, 6);
    expect(goc(p.D, p.A, p.C)).toBeCloseTo(90, 6);
    expect(dist(p.A, p.D)).toBeCloseTo(dist(p.A, p.B), 9);
    expect(dist(p.C, p.D)).toBeCloseTo(2 * dist(p.A, p.B), 9);
  });

  it('hình thang vuông tại A và B: cạnh bên AB ⊥ hai đáy AD, BC', () => {
    const p = toaDoHinh('Cho hình thang ABCD vuông tại A và B.');
    expect(loi(p)).toBe(true);
    expect(songSong(p.A, p.D, p.B, p.C)).toBe(true);
    expect(goc(p.A, p.B, p.D)).toBeCloseTo(90, 6);
    expect(goc(p.B, p.A, p.C)).toBeCloseTo(90, 6);
  });

  it('hình thoi góc A = 60°', () => {
    const p = toaDoHinh('Cho hình thoi ABCD có góc A = 60°.');
    expect(loi(p)).toBe(true);
    expect(goc(p.A, p.B, p.D)).toBeCloseTo(60, 6);
    for (const [x, y] of [['A', 'B'], ['B', 'C'], ['C', 'D']]) expect(dist(p[x], p[y])).toBeCloseTo(dist(p.D, p.A), 9);
  });

  it('hình thoi hai đường chéo AC = 6 cm, BD = 8 cm', () => {
    const p = toaDoHinh('Cho hình thoi ABCD có AC = 6 cm, BD = 8 cm.');
    expect(loi(p)).toBe(true);
    expect(dist(p.B, p.D) / dist(p.A, p.C)).toBeCloseTo(8 / 6, 9);
  });

  it('hình bình hành AB = 2AD, góc A = 120°', () => {
    const p = toaDoHinh('Cho hình bình hành ABCD có AB = 2AD và góc A = 120°.');
    expect(loi(p)).toBe(true);
    expect(songSong(p.A, p.B, p.C, p.D)).toBe(true);
    expect(songSong(p.A, p.D, p.B, p.C)).toBe(true);
    expect(dist(p.A, p.B)).toBeCloseTo(2 * dist(p.A, p.D), 9);
    expect(goc(p.A, p.B, p.D)).toBeCloseTo(120, 6);
  });

  it('hình chữ nhật AB = 8 cm, BC = 6 cm (và cạnh + đường chéo)', () => {
    const p = toaDoHinh('Cho hình chữ nhật ABCD có AB = 8 cm, BC = 6 cm.');
    expect(loi(p)).toBe(true);
    expect(dist(p.A, p.B) / dist(p.B, p.C)).toBeCloseTo(8 / 6, 9);
    expect(goc(p.A, p.B, p.D)).toBeCloseTo(90, 6);
    const q = toaDoHinh('Cho hình chữ nhật ABCD có AB = 12 cm, AC = 13 cm.');
    expect(dist(q.A, q.C) / dist(q.A, q.B)).toBeCloseTo(13 / 12, 9);
  });

  it.each([
    ['không có dữ kiện', 'hình bình hành', 'parallelogram', 'standard', 'Cho hình bình hành ABCD.'],
    ['đoạn ngoài tứ giác trong chuỗi', 'hình chữ nhật', 'rectangle', 'wide', 'Cho hình chữ nhật ABCD. Lấy M sao cho AM = 2AB.'],
    ['tích (hệ thức) không phải độ dài', 'hình thoi', 'rhombus', 'standard', 'Cho hình thoi ABCD. Chứng minh AB = AD.AC.'],
    ['hai đáy bằng nhau', 'hình thang', 'trapezoid', 'general', 'Cho hình thang ABCD (AB // CD) có AB = CD.'],
    ['hai cặp song song', 'hình thang', 'trapezoid', 'general', 'Cho hình thang ABCD có AB // CD, AD // BC.'],
    ['đáy lớn mâu thuẫn số đo', 'hình thang', 'trapezoid', 'general', 'Cho hình thang ABCD có đáy lớn AB, AB = 3 cm, CD = 6 cm.'],
    ['hình chữ nhật mà góc ≠ 90°', 'hình chữ nhật', 'rectangle', 'wide', 'Cho hình chữ nhật ABCD có góc A = 60°, AB = 2AD.'],
  ])('giữ hình mẫu (%s)', (_ly, _ten, shape, variant, de) => {
    expect(toaDoTuGiacTheoDe(de, shape, variant, ['A', 'B', 'C', 'D'])).toBeUndefined();
  });
});
