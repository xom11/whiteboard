/** @jest-environment jsdom */
// "Tiếp tuyến tại điểm A … cắt BC tại điểm S", "Qua một điểm M … tiếp tuyến thứ ba cắt Ax, By".
import { toaDoHinh, dist, thuocDoan } from './helpers/toaDoHinh';
import { thangHang, vuong, songSong, trenDuongTron, cungPhia, khac } from './helpers/doHinh';

beforeAll(() => {
  window.matchMedia ??= (() => ({ matches: false, addListener() {}, removeListener() {} })) as never;
});

describe('tiếp tuyến tại một điểm cắt đường thẳng — "tại điểm A", "ở điểm D", "Qua một điểm M"', () => {
  it('hsg #163 (Hà Nội 2023): tiếp tuyến tại điểm A cắt BC tại điểm S — SA ⊥ OA, S phía B (AB < AC)', () => {
    const p = toaDoHinh(`Cho tam giác ABC có ba góc nhọn (AB < AC), nội tiếp đường tròn (O). Tiếp tuyến tại điểm A của đường tròn (O) cắt đường thẳng BC tại điểm S. Gọi I là chân đường vuông góc kẻ từ điểm O đến đường thẳng BC.
a) Chứng minh tứ giác SAOI là tứ giác nội tiếp.`);
    expect(vuong(p.S, p.A, p.O, p.A)).toBe(true);
    expect(thangHang(p.S, p.B, p.C)).toBe(true);
    // AB < AC ⇒ tiếp tuyến tại A cắt tia CB kéo dài về phía B: B nằm giữa S và C.
    expect(thuocDoan(p.B, p.S, p.C, 1e-7)).toBe(true);
  });

  it('hsg #153: tiếp tuyến tại A cắt tia BC ở điểm D — D trên tia BC, AD ⊥ AB', () => {
    const p = toaDoHinh('Cho đường tròn tâm (O), đường kính AB = 2R. Trên đường tròn (O) lấy điểm C bất kì (C không trùng với A và B). Tiếp tuyến của đường tròn (O) tại A cắt tia BC ở điểm D. Gọi H là hình chiếu của A trên đường thẳng DO. Tia AH cắt đường tròn (O) tại điểm F (không trùng với A).');
    expect(vuong(p.A, p.D, p.A, p.B)).toBe(true);
    expect(thuocDoan(p.C, p.B, p.D, 1e-7)).toBe(true);
    expect(trenDuongTron(p.F, p.O, dist(p.O, p.A)) && thangHang(p.F, p.A, p.H) && khac(p.F, p.A)).toBe(true);
  });

  it('hsg #137: "Qua một điểm M thuộc nửa đường tròn, kẻ tiếp tuyến thứ ba cắt Ax, By ở C và D"', () => {
    const p = toaDoHinh(`Cho nửa đường tròn (O) đường kính AB. Từ A và B kẻ hai tiếp tuyến Ax và By. Qua một điểm M thuộc nửa đường tròn này, kẻ tiếp tuyến thứ ba cắt các tiếp tuyến Ax và By lần lượt ở C và D. Các đường thẳng AD và BC cắt nhau ở N.
a) Chứng minh rằng: MN // AC.
c) Gọi H là giao điểm của MN và AB. Chứng minh: MN = HN.`);
    expect(vuong(p.O, p.M, p.C, p.D)).toBe(true);
    expect(thangHang(p.M, p.C, p.D) && thuocDoan(p.M, p.C, p.D, 1e-7)).toBe(true);
    expect(vuong(p.A, p.C, p.A, p.B) && vuong(p.B, p.D, p.A, p.B)).toBe(true);
    // C, D, M cùng phía AB (nửa đường tròn chứa M)
    expect(cungPhia(p.A, p.B, p.C, p.M) && cungPhia(p.A, p.B, p.D, p.M)).toBe(true);
    expect(songSong(p.M, p.N, p.A, p.C)).toBe(true); // điều đề bắt chứng minh
  });
});
