/** @jest-environment jsdom */
// Tam giác cho bởi SỐ ĐO GÓC (và cạnh) — hệ thức lượng lớp 10. Test đo toạ độ hình
// dựng bằng JSXGraph thật: góc phải đúng số độ đề cho, cạnh đúng tỉ lệ.
import { toaDoHinh, dist, type XY } from '../../__tests__/helpers/toaDoHinh';
import { doGocDeCho, doCanhDeCho, toaDoTamGiacTheoCanh } from '../triangleLengths';
import { normalizeProblemText } from '../../deterministic/normalizeText';

beforeAll(() => {
  window.matchMedia ??= (() => ({ matches: false, addListener() {}, removeListener() {} })) as never;
});

/** Số đo góc PQR (đỉnh Q), độ. */
function goc(p: XY, q: XY, r: XY): number {
  const a = [p[0] - q[0], p[1] - q[1]];
  const b = [r[0] - q[0], r[1] - q[1]];
  return (Math.acos((a[0] * b[0] + a[1] * b[1]) / (Math.hypot(a[0], a[1]) * Math.hypot(b[0], b[1]))) * 180) / Math.PI;
}

describe('tam giác theo số đo góc — đo trên hình thật', () => {
  it('c.g.c: AB = 5, AC = 8, góc A = 60° ⇒ góc A = 60°, AC : AB = 8 : 5', () => {
    const p = toaDoHinh('Cho tam giác ABC có AB = 5, AC = 8, góc A = 60°. Tính BC.');
    expect(goc(p.B, p.A, p.C)).toBeCloseTo(60, 6);
    expect(dist(p.A, p.C) / dist(p.A, p.B)).toBeCloseTo(8 / 5, 6);
  });

  it('"góc BAC = 120°" (ba chữ, đỉnh ở giữa) + trung điểm M vẫn dựng', () => {
    const p = toaDoHinh('Cho tam giác ABC có AB = 4, AC = 6, góc BAC = 120°. Gọi M là trung điểm BC. Tính AM.');
    expect(goc(p.B, p.A, p.C)).toBeCloseTo(120, 6);
    expect(dist(p.A, p.C) / dist(p.A, p.B)).toBeCloseTo(1.5, 6);
    expect(dist(p.M, p.B)).toBeCloseTo(dist(p.M, p.C), 9);
  });

  it('g.c.g: BC = 6, góc B = 45°, góc C = 60° ⇒ góc A = 75°', () => {
    const p = toaDoHinh('Cho tam giác ABC có BC = 6, góc B = 45°, góc C = 60°. Tính AB, AC.');
    expect(goc(p.A, p.B, p.C)).toBeCloseTo(45, 6);
    expect(goc(p.A, p.C, p.B)).toBeCloseTo(60, 6);
    expect(goc(p.B, p.A, p.C)).toBeCloseTo(75, 6);
  });

  it('ký hiệu a, b, c: a = 7, b = 8, c = 5 ⇒ BC : CA : AB = 7 : 8 : 5 (góc A = 60°)', () => {
    const p = toaDoHinh('Cho tam giác ABC có a = 7, b = 8, c = 5. Tính góc A.');
    const ab = dist(p.A, p.B);
    expect(dist(p.B, p.C) / ab).toBeCloseTo(7 / 5, 6);
    expect(dist(p.C, p.A) / ab).toBeCloseTo(8 / 5, 6);
    expect(goc(p.B, p.A, p.C)).toBeCloseTo(60, 6);
  });

  it('căn thức: AB = a, AC = a√3, góc A = 30° ⇒ AC = √3·AB (không bị cắt thành "a 3")', () => {
    const p = toaDoHinh('Cho tam giác ABC có AB = a, AC = a√3, góc A = 30°.');
    expect(dist(p.A, p.C) / dist(p.A, p.B)).toBeCloseTo(Math.sqrt(3), 6);
    expect(goc(p.B, p.A, p.C)).toBeCloseTo(30, 6);
    expect(dist(p.B, p.C)).toBeCloseTo(dist(p.A, p.B), 6); // tam giác cân tại B
  });

  it('chỉ một góc: góc A = 120° đúng, không cân (hai cạnh kề khác nhau)', () => {
    const p = toaDoHinh('Cho tam giác ABC có góc A = 120°. Gọi M là trung điểm của BC.');
    expect(goc(p.B, p.A, p.C)).toBeCloseTo(120, 6);
    expect(Math.abs(dist(p.A, p.B) - dist(p.A, p.C))).toBeGreaterThan(0.3);
  });

  it('cân tại A có góc A = 36° ⇒ hai góc đáy 72°', () => {
    const p = toaDoHinh('Cho tam giác ABC cân tại A có góc A = 36°. Tia phân giác góc B cắt cạnh AC tại điểm D.');
    expect(goc(p.B, p.A, p.C)).toBeCloseTo(36, 6);
    expect(goc(p.A, p.B, p.C)).toBeCloseTo(72, 6);
    expect(dist(p.A, p.B)).toBeCloseTo(dist(p.A, p.C), 6);
  });

  it('vuông tại A có góc B = 60° ⇒ góc C = 30°', () => {
    const p = toaDoHinh('Cho tam giác ABC vuông tại A có góc B = 60°, AB = a.');
    expect(goc(p.B, p.A, p.C)).toBeCloseTo(90, 6);
    expect(goc(p.A, p.B, p.C)).toBeCloseTo(60, 6);
  });

  it('c.c.g (góc không xen giữa): BC = 10, AC = 8, góc A = 60° ⇒ đúng định lý sin', () => {
    const p = toaDoHinh('Cho tam giác ABC có BC = 10, AC = 8, góc A = 60°.');
    expect(goc(p.B, p.A, p.C)).toBeCloseTo(60, 6);
    expect(dist(p.B, p.C) / dist(p.A, p.C)).toBeCloseTo(10 / 8, 6);
  });

  it('"vuông cân tại A" ⇒ góc A = 90°, AB = AC (trước đây vẽ tam giác cân NHỌN)', () => {
    const p = toaDoHinh('Cho tam giác ABC vuông cân tại A có AB = a.');
    expect(goc(p.B, p.A, p.C)).toBeCloseTo(90, 6);
    expect(dist(p.A, p.B)).toBeCloseTo(dist(p.A, p.C), 6);
  });

  it('trung tuyến: BC = 12, CA = 13, "trung tuyến AM = 8" ⇒ AB = √31 (4m² = 2b² + 2c² − a²)', () => {
    const p = toaDoHinh('Cho tam giác ABC có BC = 12, CA = 13, trung tuyến AM = 8.');
    const k = dist(p.B, p.C) / 12;
    expect(dist(p.A, p.B) / k).toBeCloseTo(Math.sqrt(31), 6);
    expect(dist(p.A, p.M) / k).toBeCloseTo(8, 6);
  });

  it('"M là trung điểm BC" + "AM = 4" cũng là trung tuyến', () => {
    const p = toaDoHinh('Cho tam giác ABC có AB = 5, AC = 7. Gọi M là trung điểm BC, biết AM = 4.');
    const k = dist(p.A, p.B) / 5;
    expect(dist(p.A, p.M) / k).toBeCloseTo(4, 6);
  });

  it('"Â = 60°" (chữ có mũ) cũng là góc A', () => {
    const p = toaDoHinh('Cho tam giác ABC có Â = 60°, AB = 2, AC = 3.');
    expect(goc(p.B, p.A, p.C)).toBeCloseTo(60, 6);
  });
});

describe('không đoán khi số liệu mâu thuẫn / nhập nhằng', () => {
  const L = ['A', 'B', 'C'] as const;
  const tinh = (de: string, variant = 'any') => {
    const t = normalizeProblemText(de);
    return toaDoTamGiacTheoCanh(L, variant, doCanhDeCho(t, L), doGocDeCho(t, L));
  };
  it('tổng hai góc ≥ 180° ⇒ undefined', () => {
    expect(tinh('Cho tam giác ABC có góc A = 120°, góc B = 70°.')).toBeUndefined();
  });
  it('vuông tại A nhưng đề cho góc A = 60° ⇒ undefined', () => {
    expect(tinh('Cho tam giác ABC có góc A = 60°.', 'right-at-A')).toBeUndefined();
  });
  it('ba cạnh trái với góc đề cho ⇒ undefined', () => {
    expect(tinh('Cho tam giác ABC có AB = 3, AC = 4, BC = 5, góc A = 60°.')).toBeUndefined();
  });
  it('c.c.g vô nghiệm (sin > 1) ⇒ undefined', () => {
    expect(tinh('Cho tam giác ABC có BC = 2, AC = 8, góc A = 60°.')).toBeUndefined();
  });
  it('"góc A" của hình thoi ABCD không áp cho tam giác', () => {
    expect(doGocDeCho('Cho hình thoi ABCD có góc A = 60°. Tam giác ABD', ['A', 'B', 'D']).size).toBe(0);
  });
  it('"góc A < 90°" không phải số đo', () => {
    expect(doGocDeCho('Cho tam giác ABC có góc A < 90°', L).size).toBe(0);
  });
  it('trộn số thuần với tham số a ⇒ bỏ hết cạnh (không biết tỉ lệ)', () => {
    expect(doCanhDeCho('AB = 3, AC = 2a', L).size).toBe(0);
  });
  it('"BD = 2DC" không phải số đo cạnh', () => {
    expect(doCanhDeCho('AB = 2DC', L).size).toBe(0);
  });
});
