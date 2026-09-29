/** @jest-environment jsdom */
// Tứ giác đặt theo SỐ ĐO đề cho — đo trên hình dựng bằng JSXGraph thật.
import { toaDoHinh, dist, type XY } from '../../__tests__/helpers/toaDoHinh';
import { gocTuGiac, toaDoTuGiacTheoSoDo } from '../quadLengths';

beforeAll(() => {
  window.matchMedia ??= (() => ({ matches: false, addListener() {}, removeListener() {} })) as never;
});

function goc(p: XY, q: XY, r: XY): number {
  const a = [p[0] - q[0], p[1] - q[1]];
  const b = [r[0] - q[0], r[1] - q[1]];
  return (Math.acos((a[0] * b[0] + a[1] * b[1]) / (Math.hypot(a[0], a[1]) * Math.hypot(b[0], b[1]))) * 180) / Math.PI;
}
const L = ['A', 'B', 'C', 'D'] as const;

describe('tứ giác theo số đo', () => {
  it('hình chữ nhật AB = 3, AD = 4: vuông góc, AD : AB = 4 : 3; trung điểm M vẫn đúng', () => {
    const p = toaDoHinh('Cho hình chữ nhật ABCD có AB = 3, AD = 4. Gọi M là trung điểm BC.');
    expect(dist(p.A, p.D) / dist(p.A, p.B)).toBeCloseTo(4 / 3, 9);
    expect(goc(p.B, p.A, p.D)).toBeCloseTo(90, 9);
    expect(dist(p.M, p.B)).toBeCloseTo(dist(p.M, p.C), 9);
  });

  it('hình chữ nhật AB = a, AC = 2a (đường chéo) ⇒ AD = a√3', () => {
    const p = toaDoHinh('Cho hình chữ nhật ABCD có AB = a, AC = 2a.');
    expect(dist(p.A, p.C) / dist(p.A, p.B)).toBeCloseTo(2, 9);
    expect(dist(p.A, p.D) / dist(p.A, p.B)).toBeCloseTo(Math.sqrt(3), 9);
  });

  it('hình bình hành AB = 4, AD = 2, góc BAD = 60°: đối song song, góc, tỉ lệ', () => {
    const p = toaDoHinh('Cho hình bình hành ABCD có AB = 4, AD = 2, góc BAD = 60°.');
    expect(goc(p.B, p.A, p.D)).toBeCloseTo(60, 9);
    expect(dist(p.A, p.B) / dist(p.A, p.D)).toBeCloseTo(2, 9);
    expect(p.C[0] - p.B[0]).toBeCloseTo(p.D[0] - p.A[0], 9); // vectơ BC = vectơ AD
    expect(p.C[1] - p.B[1]).toBeCloseTo(p.D[1] - p.A[1], 9);
  });

  it('tỉ số cạnh "MN = 2MQ" + "góc M = 120°"', () => {
    const p = toaDoHinh('Cho hình bình hành MNPQ có MN = 2MQ và góc M = 120°.');
    expect(dist(p.M, p.N) / dist(p.M, p.Q)).toBeCloseTo(2, 9);
    expect(goc(p.N, p.M, p.Q)).toBeCloseTo(120, 9);
  });

  it('hình thoi cạnh a, góc BAD = 60° ⇒ BD = cạnh (tam giác ABD đều)', () => {
    const p = toaDoHinh('Cho hình thoi ABCD cạnh a, góc BAD = 60°.');
    expect(goc(p.B, p.A, p.D)).toBeCloseTo(60, 9);
    expect(dist(p.B, p.D)).toBeCloseTo(dist(p.A, p.B), 9);
    expect(dist(p.B, p.C)).toBeCloseTo(dist(p.A, p.B), 9);
  });

  it('hình thoi "góc ABC = 120°" ⇒ góc A = 60°; "AC = 6, BD = 8" ⇒ chéo 3 : 4', () => {
    const p = toaDoHinh('Cho hình thoi ABCD có góc ABC = 120°.');
    expect(goc(p.A, p.B, p.C)).toBeCloseTo(120, 9);
    const q = toaDoHinh('Cho hình thoi ABCD có AC = 6, BD = 8.');
    expect(dist(q.A, q.C) / dist(q.B, q.D)).toBeCloseTo(0.75, 9);
    expect(dist(q.A, q.B)).toBeCloseTo(dist(q.B, q.C), 9);
  });

  it('hình thang vuông tại A và D, AB = 2a, AD = DC = a', () => {
    const p = toaDoHinh('Cho hình thang ABCD vuông tại A và D có AB = 2a, AD = DC = a.');
    expect(goc(p.B, p.A, p.D)).toBeCloseTo(90, 9);
    expect(goc(p.A, p.D, p.C)).toBeCloseTo(90, 9);
    expect(dist(p.A, p.B) / dist(p.A, p.D)).toBeCloseTo(2, 9);
    expect(dist(p.D, p.C)).toBeCloseTo(dist(p.A, p.D), 9);
  });

  it('không đoán: "góc BAC" (góc với đường chéo) không phải góc của tứ giác; góc mâu thuẫn', () => {
    expect(gocTuGiac('hình thoi ABCD có góc BAC = 30°', L).size).toBe(0);
    expect(toaDoTuGiacTheoSoDo('parallelogram', 'standard', L, 'góc A = 60°, góc C = 70°')).toBeUndefined();
    expect(toaDoTuGiacTheoSoDo('rectangle', 'wide', L, 'hình chữ nhật ABCD có AB = 3')).toBeUndefined();
  });
});
