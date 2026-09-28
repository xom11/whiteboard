/** @jest-environment jsdom */
// "Cho tam giác ABC nhọn (AB < AC) …" — tam giác mẫu cũ có AB > AC nên hình NGƯỢC đề.
import { toaDoHinh, dist, thuocDoan } from './helpers/toaDoHinh';

beforeAll(() => {
  window.matchMedia ??= (() => ({ matches: false, addListener() {}, removeListener() {} })) as never;
});

describe('tam giác "(AB < AC)" — hình phải đúng bất đẳng thức đề cho', () => {
  it('AB < AC ⇒ AB ngắn hơn AC trên hình, tam giác nhọn', () => {
    const p = toaDoHinh('Cho tam giác ABC có ba góc nhọn (AB < AC), nội tiếp đường tròn (O). Gọi AH là đường cao của tam giác ABC.');
    expect(dist(p.A, p.B)).toBeLessThan(dist(p.A, p.C));
    // nhọn: chân đường cao H nằm TRONG đoạn BC
    expect(thuocDoan(p.H, p.B, p.C, 1e-7)).toBe(true);
    expect(dist(p.O, p.A)).toBeCloseTo(dist(p.O, p.B), 9);
  });
  it('AB > AC và AC < BC (cạnh chung C) đều được tôn trọng', () => {
    const p = toaDoHinh('Cho tam giác nhọn ABC (AB > AC). Vẽ đường cao AD.');
    expect(dist(p.A, p.B)).toBeGreaterThan(dist(p.A, p.C));
    const q = toaDoHinh('Cho tam giác ABC (AC < BC). Gọi M là trung điểm của AB.');
    expect(dist(q.A, q.C)).toBeLessThan(dist(q.B, q.C));
  });
});

describe('tam giác vuông / chuỗi bất đẳng thức', () => {
  it('"vuông tại A có AB < AC": hai cạnh góc vuông đúng thứ tự, góc A vuông', () => {
    const p = toaDoHinh('Cho tam giác ABC vuông tại A có AB < AC. Gọi M là trung điểm của BC.');
    expect(dist(p.A, p.B)).toBeLessThan(dist(p.A, p.C));
    const tich = (p.B[0] - p.A[0]) * (p.C[0] - p.A[0]) + (p.B[1] - p.A[1]) * (p.C[1] - p.A[1]);
    expect(Math.abs(tich)).toBeLessThan(1e-9);
  });
  it('"AB < AC < BC": cả ba cạnh đúng thứ tự', () => {
    const p = toaDoHinh('Cho tam giác ABC có AB < AC < BC và nội tiếp (O). Gọi M là trung điểm của BC.');
    expect(dist(p.A, p.B)).toBeLessThan(dist(p.A, p.C));
    expect(dist(p.A, p.C)).toBeLessThan(dist(p.B, p.C));
  });
});
