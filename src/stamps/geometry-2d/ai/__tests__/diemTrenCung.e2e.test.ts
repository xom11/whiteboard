/** @jest-environment jsdom */
// "Lấy M thuộc cung nhỏ BC" — điểm phải nằm ĐÚNG cung (onArc), kể cả khi kéo hình.
import { toaDoHinh, dungHinh, dist, thuocDoan, type XY } from './helpers/toaDoHinh';
import { vuong, trenDuongTron, cungPhia } from './helpers/doHinh';

beforeAll(() => {
  window.matchMedia ??= (() => ({ matches: false, addListener() {}, removeListener() {} })) as never;
});

describe('điểm trên CUNG (onArc) — cung nhỏ/lớn/không chứa, kể cả khi kéo hình', () => {
  /** P trên cung nhỏ XY ⇔ P khác phía tâm O so với dây XY. */
  const cungNho = (p: Record<string, XY>, P: string, X: string, Y: string) =>
    !cungPhia(p[X], p[Y], p[P], p.O);

  it('hsg #150: M trên cung nhỏ CB của hai đường kính vuông góc', () => {
    const de = `Cho đường tròn tâm O có hai đường kính AB và CD vuông góc với nhau. Lấy điểm M bất kì trên cung nhỏ CB (M khác B và C), kẻ AM cắt CD tại N.
a) Tính góc AMB và chứng minh: tứ giác MNOB nội tiếp.
b) Đoạn thẳng MD cắt BC ở H. Tính góc NCH và chứng minh: tứ giác CNHM nội tiếp.`;
    const p = toaDoHinh(de);
    const R = dist(p.O, p.A);
    expect(trenDuongTron(p.M, p.O, R)).toBe(true);
    expect(cungNho(p, 'M', 'C', 'B')).toBe(true);
    // N = AM ∩ CD nằm TRONG đoạn OC (M trên cung nhỏ CB)
    expect(thuocDoan(p.N, p.O, p.C, 1e-7)).toBe(true);
  });

  it('hsg #170: M trên cung nhỏ DE (hai tiếp điểm) và MD > ME', () => {
    const de = `Cho đường tròn tâm O bán kính R và điểm A nằm ngoài đường tròn sao cho OA > 2R. Từ A kẻ hai tiếp tuyến AD, AE đến đường tròn (O) (D, E là hai tiếp điểm). Lấy điểm M nằm trên cung nhỏ DE sao cho MD > ME. Tiếp tuyến của đường tròn (O) tại M cắt AD, AE lần lượt tại I, J. Đường thẳng DE cắt OJ tại F.`;
    const p = toaDoHinh(de);
    const R = dist(p.O, p.D);
    expect(trenDuongTron(p.M, p.O, R) && cungNho(p, 'M', 'D', 'E')).toBe(true);
    expect(dist(p.M, p.D)).toBeGreaterThan(dist(p.M, p.E));
    // tiếp tuyến tại M: OM ⊥ IJ, I trong đoạn AD, J trong đoạn AE
    expect(vuong(p.O, p.M, p.I, p.J)).toBe(true);
    expect(thuocDoan(p.I, p.A, p.D, 1e-7) && thuocDoan(p.J, p.A, p.E, 1e-7)).toBe(true);
  });

  it('"cung BC không chứa A" và "cung lớn BC"', () => {
    const p = toaDoHinh('Cho tam giác ABC nhọn nội tiếp đường tròn (O). Lấy điểm D thuộc cung BC không chứa A. Lấy điểm E thuộc cung lớn AB.');
    expect(cungPhia(p.B, p.C, p.D, p.A)).toBe(false);
    expect(cungPhia(p.A, p.B, p.E, p.O)).toBe(true);
    expect(trenDuongTron(p.D, p.O, dist(p.O, p.A)) && trenDuongTron(p.E, p.O, dist(p.O, p.A))).toBe(true);
  });
});

describe('onArc khi KÉO hình: điểm vẫn ở đúng cung', () => {
  it('kéo đỉnh A/B, D vẫn thuộc cung nhỏ BC', () => {
    const h = dungHinh('Cho tam giác ABC nhọn (AB < AC) nội tiếp đường tròn (O). Lấy điểm D thuộc cung nhỏ BC.');
    try {
      for (const [x, y] of [[2.5, 4], [4, 3.2], [0.8, 3]] as const) {
        h.keo('A', x, y);
        const p = h.toaDo();
        expect(trenDuongTron(p.D, p.O, dist(p.O, p.A))).toBe(true);
        expect(cungPhia(p.B, p.C, p.D, p.A)).toBe(false);
      }
      // Kéo B tới mức góc A thành TÙ: cung nhỏ BC giờ là cung CHỨA A — D vẫn phải ở
      // cung nhỏ (khác phía tâm O), cung tự đổi chiều theo hình.
      h.keo('B', -1, 1);
      const p = h.toaDo();
      expect(trenDuongTron(p.D, p.O, dist(p.O, p.A))).toBe(true);
      expect(cungPhia(p.B, p.C, p.D, p.O)).toBe(false);
    } finally {
      h.huy();
    }
  });
});
