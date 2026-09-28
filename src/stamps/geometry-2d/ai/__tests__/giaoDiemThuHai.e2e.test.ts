/** @jest-environment jsdom */
// "CB cắt (O) tại D" với C NGOÀI đường tròn: giao thứ hai phải loại đầu mút NẰM TRÊN
// (O) (B), không phải chữ đầu (C) — nếu không D có thể trùng B.
import { toaDoHinh, dist, thuocDoan } from './helpers/toaDoHinh';
import { thangHang, vuong, trenDuongTron, khac } from './helpers/doHinh';

beforeAll(() => {
  window.matchMedia ??= (() => ({ matches: false, addListener() {}, removeListener() {} })) as never;
});

describe('giao điểm thứ hai: loại đúng đầu mút nằm trên đường tròn', () => {
  it('lop9 #56 (vào 10): C trên tiếp tuyến tại A, CB cắt (O) tại D ≠ B, AD ⊥ BC', () => {
    const p = toaDoHinh('Cho đường tròn (O) đường kính AB. Trên tiếp tuyến của (O) tại A, lấy điểm C (với C khác A). Kẻ CB cắt đường tròn (O) tại điểm D, kẻ AH ⊥ CO (với H ∈ CO).');
    const R = dist(p.O, p.A);
    expect(trenDuongTron(p.D, p.O, R) && khac(p.D, p.B)).toBe(true);
    expect(thuocDoan(p.D, p.C, p.B, 1e-7)).toBe(true);
    expect(vuong(p.A, p.D, p.B, p.C)).toBe(true); // góc nội tiếp chắn nửa đường tròn
  });

  it('lop9 #61 (vào 10): BM cắt (O) tại D, AD cắt (O) tại E ≠ D', () => {
    const p = toaDoHinh('Cho tam giác ABC vuông tại A. Gọi M là trung điểm AC và O là trung điểm của MC. Vẽ đường tròn tâm O, bán kính OC. Kẻ BM cắt (O) tại D, đường thẳng AD cắt (O) tại E.');
    const R = dist(p.O, p.C);
    expect(trenDuongTron(p.D, p.O, R) && trenDuongTron(p.E, p.O, R)).toBe(true);
    expect(khac(p.D, p.M) && khac(p.E, p.D)).toBe(true);
    expect(thangHang(p.D, p.B, p.M) && thangHang(p.E, p.A, p.D)).toBe(true);
  });

  it('hsg #152: (O) đường kính BC cắt AB tại E ≠ B', () => {
    const p = toaDoHinh('Cho tam giác nhọn ABC (AB > AC). Vẽ đường tròn (O) đường kính BC, đường tròn (O) cắt AB tại E.');
    expect(khac(p.E, p.B)).toBe(true);
    expect(thuocDoan(p.E, p.A, p.B, 1e-7)).toBe(true);
    expect(vuong(p.C, p.E, p.A, p.B)).toBe(true);
  });
});
