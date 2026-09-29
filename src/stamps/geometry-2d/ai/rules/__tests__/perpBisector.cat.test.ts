/** @jest-environment jsdom */
import { toaDoHinh, dist, thuocDoan, type XY } from '../../__tests__/helpers/toaDoHinh';

beforeAll(() => {
  window.matchMedia ??= (() => ({ matches: false, addListener() {}, removeListener() {} })) as never;
});

const thangHang = (p: XY, a: XY, b: XY) =>
  Math.abs((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) < 1e-9;

/** "Trung trực … cắt …" — đề thật trong hinh-phang-tong-hop-2026-09.txt, đo toạ độ. */
describe('perpBisector — cắt liên tiếp / "ở" / phân phối "và"', () => {
  it('#15 "trung trực của AC cắt AC tại H, cắt BC tại D": H trung điểm AC, D ∈ BC, DA = DC', () => {
    const p = toaDoHinh('Cho tam giác ABC vuông tại A. Đường trung trực của đoạn thẳng AC cắt AC tại H, cắt BC tại D. Nối A và D.');
    expect(dist(p.H, p.A)).toBeCloseTo(dist(p.H, p.C), 9);
    expect(thuocDoan(p.H, p.A, p.C)).toBe(true);
    expect(thangHang(p.D, p.B, p.C)).toBe(true);
    expect(dist(p.D, p.A)).toBeCloseTo(dist(p.D, p.C), 9);
  });

  it('#16 "trung trực của AB và AC cắt cạnh BC theo thứ tự ở M và N"', () => {
    const p = toaDoHinh('Cho tam giác ABC. Các đường trung trực của AB và AC cắt cạnh BC theo thứ tự ở M và N.');
    expect(thangHang(p.M, p.B, p.C) && thangHang(p.N, p.B, p.C)).toBe(true);
    expect(dist(p.M, p.A)).toBeCloseTo(dist(p.M, p.B), 9);
    expect(dist(p.N, p.A)).toBeCloseTo(dist(p.N, p.C), 9);
  });

  it('#22 "trung trực của cạnh AC cắt tia CB tại điểm D"', () => {
    const p = toaDoHinh('Cho tam giác ABC cân tại A (góc A < 90°). Đường trung trực của cạnh AC cắt tia CB tại điểm D.');
    expect(thangHang(p.D, p.B, p.C)).toBe(true);
    expect(dist(p.D, p.A)).toBeCloseTo(dist(p.D, p.C), 9);
  });
});
