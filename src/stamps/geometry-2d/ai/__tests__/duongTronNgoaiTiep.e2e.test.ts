/** @jest-environment jsdom */
// Đường tròn ngoại tiếp "tam giác ABC nội tiếp đường tròn tâm O" không được bị một
// rule khác thay bằng đường tròn tự do; đường thẳng qua điểm KHÔNG nằm trên đường
// tròn cắt đường tròn đúng điểm đề nói.
import { toaDoHinh, dist, thuocDoan } from './helpers/toaDoHinh';
import { thangHang, vuong, trenDuongTron, cungPhia, khac } from './helpers/doHinh';

beforeAll(() => {
  window.matchMedia ??= (() => ({ matches: false, addListener() {}, removeListener() {} })) as never;
});

describe('(O) ngoại tiếp giữ nguyên', () => {
  it('lop9 #59 (vào 10): "nội tiếp đường tròn tâm O" + "Tiếp tuyến tại A của (O)" — O là tâm ngoại tiếp, KA ⊥ OA', () => {
    const p = toaDoHinh(`Cho tam giác ABC (AB < AC) có ba góc nhọn, nội tiếp đường tròn tâm O. Tiếp tuyến tại A của đường tròn (O) cắt đường thẳng BC tại K. Từ O kẻ OD vuông góc với BC tại D, tia OD cắt đường tròn (O) tại E.
b) Đường thẳng AE cắt BC tại N. Chứng minh tam giác KNA cân và KN² = KB.KC.`);
    const R = dist(p.O, p.A);
    expect(trenDuongTron(p.B, p.O, R) && trenDuongTron(p.C, p.O, R)).toBe(true);
    expect(vuong(p.K, p.A, p.O, p.A)).toBe(true);
    // E = giao của TIA OD với (O): trên cung BC không chứa A
    expect(trenDuongTron(p.E, p.O, R) && thuocDoan(p.D, p.O, p.E, 1e-7)).toBe(true);
    expect(cungPhia(p.B, p.C, p.E, p.A)).toBe(false);
    expect(Math.abs(dist(p.K, p.N) - dist(p.K, p.A))).toBeLessThan(1e-7); // KNA cân tại K
  });

  it('hsg #128: "nội tiếp đường tròn (O) đường kính AD" — D đối tâm của A, O vẫn là tâm ngoại tiếp', () => {
    const p = toaDoHinh('Cho tam giác ABC có trực tâm H và nội tiếp đường tròn (O) đường kính AD. Gọi I là chân đường vuông góc kẻ từ O đến BC. Chứng minh AH = 2OI.');
    const R = dist(p.O, p.A);
    expect(trenDuongTron(p.B, p.O, R) && trenDuongTron(p.C, p.O, R) && trenDuongTron(p.D, p.O, R)).toBe(true);
    expect(thuocDoan(p.O, p.A, p.D, 1e-7)).toBe(true);
    expect(dist(p.A, p.H)).toBeCloseTo(2 * dist(p.O, p.I), 7);
  });
});

describe('đường thẳng cắt một đường thẳng rồi cắt đường tròn', () => {
  it('lop9 #42 (vào 10): "AH cắt BC tại D và cắt (O, R) tại điểm thứ hai tại P" — P đối xứng H qua BC', () => {
    const p = toaDoHinh(`Cho tam giác ABC có ba góc nhọn và nội tiếp đường tròn (O, R). Hai đường cao BM, CN của tam giác ABC cắt nhau tại H.
b) Đường thẳng AH cắt BC tại D và cắt đường tròn (O, R) tại điểm thứ hai tại P. Chứng minh BC là tia phân giác của góc MBP.`);
    const R = dist(p.O, p.A);
    expect(trenDuongTron(p.P, p.O, R) && khac(p.P, p.A) && thangHang(p.P, p.A, p.H)).toBe(true);
    expect(thangHang(p.D, p.B, p.C) && thangHang(p.D, p.A, p.H)).toBe(true);
    expect(dist(p.D, p.P)).toBeCloseTo(dist(p.D, p.H), 7); // tính chất đề dùng
  });

  it('lop9 #29 (vào 10): A ngoài (O) đường kính BC — "AH cắt (O) tại P (P nằm giữa A và H)"', () => {
    const p = toaDoHinh(`Cho tam giác ABC nhọn. Đường tròn (O) đường kính BC cắt các cạnh AB, AC lần lượt tại D và E (D khác B và E khác C). Gọi H là giao điểm của hai đường thẳng BE và CD.
b) Đường thẳng AH cắt BC tại F và cắt đường tròn (O) tại điểm P (P nằm giữa A và H).`);
    const R = dist(p.O, p.B);
    expect(trenDuongTron(p.P, p.O, R)).toBe(true);
    expect(thuocDoan(p.P, p.A, p.H, 1e-7)).toBe(true);
    expect(vuong(p.A, p.F, p.B, p.C)).toBe(true);
  });
});
