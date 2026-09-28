/** @jest-environment jsdom */
// Toán 9 + câu hình vào 10 (2026-09): mỗi ca ĐO hình thật (JSXGraph headless) —
// tiếp xúc, điểm trên đường tròn, thứ tự trên cát tuyến, cung nhỏ/lớn, điểm trong
// đoạn — không chỉ kiểm "có tên điểm". Đề lấy nguyên văn từ
// docs/datasets/lop9-2026-09.txt và hinh-phang-tong-hop-2026-09.txt.
import { tryDeterministicFigure } from '../deterministic/tryDeterministicFigure';
import { segmentClauses } from '../deterministic/coverage';
import { toaDoHinh, dist, thuocDoan, type XY } from './helpers/toaDoHinh';

beforeAll(() => {
  window.matchMedia ??= (() => ({ matches: false, addListener() {}, removeListener() {} })) as never;
});

const cheo = (a: XY, b: XY, p: XY) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
const thangHang = (p: XY, a: XY, b: XY) => Math.abs(cheo(a, b, p)) < 1e-7 * Math.max(1, dist(a, b));
const tich = (a: XY, b: XY, c: XY, d: XY) => (b[0] - a[0]) * (d[0] - c[0]) + (b[1] - a[1]) * (d[1] - c[1]);
/** AB ⊥ CD */
const vuong = (a: XY, b: XY, c: XY, d: XY) => Math.abs(tich(a, b, c, d)) < 1e-7 * dist(a, b) * dist(c, d);
const songSong = (a: XY, b: XY, c: XY, d: XY) =>
  Math.abs((b[0] - a[0]) * (d[1] - c[1]) - (b[1] - a[1]) * (d[0] - c[0])) < 1e-7 * dist(a, b) * dist(c, d);
/** P trên đường tròn tâm O bán kính OR. */
const trenDuongTron = (p: XY, o: XY, r: number) => Math.abs(dist(p, o) - r) < 1e-7 * Math.max(1, r);
/** P, Q cùng phía đường thẳng AB. */
const cungPhia = (a: XY, b: XY, p: XY, q: XY) => Math.sign(cheo(a, b, p)) === Math.sign(cheo(a, b, q));
const khac = (p: XY, q: XY) => dist(p, q) > 1e-3;

describe('coverage — mệnh đề dựng hình nằm giữa phần chứng minh', () => {
  it('"b) Đường thẳng qua E … cắt tia AF tại G" là mệnh đề hình; "Chứng minh … cắt … tại" thì không', () => {
    const cl = segmentClauses(
      'Cho tam giác ABC. a) Chứng minh AB = AC. b) Đường thẳng qua E vuông góc với BC cắt tia AF tại G. Chứng minh đường thẳng MN cắt AB tại trung điểm I. c) Tia FE cắt (O) tại P và cắt BC tại M. Hai đoạn thẳng CM và HN cắt nhau tại T.',
    );
    const geo = (s: string) => cl.find((c) => c.text.includes(s))!.hasGeometry;
    expect(geo('qua E vuông góc')).toBe(true);
    expect(geo('Tia FE cắt')).toBe(true);
    expect(geo('Hai đoạn thẳng CM')).toBe(true);
    expect(geo('MN cắt AB tại trung điểm')).toBe(false);
  });

  it('hsg #176 (vào 10): G = giao của đường qua F ⊥ FB với AH — không phải giao FB với AH', () => {
    const de = `Cho tam giác nhọn ABC (AB < AC), đường cao AH. Kẻ HD, HE lần lượt vuông góc với AB, AC (D ∈ AB, E ∈ AC).
a) Chứng minh ADHE là tứ giác nội tiếp.
b) Trên tia đối của tia DH lấy điểm F (F ≠ D). Đường thẳng qua F vuông góc với FB cắt đường thẳng AH tại G. Kẻ GI vuông góc với HF (I ∈ HF). Chứng minh tam giác IFG đồng dạng với tam giác HBG và IF = DH.
c) Tia phân giác của góc HEC cắt CH tại K. Kẻ KM, KN lần lượt vuông góc với EH, EC (M ∈ EH, N ∈ EC). Hai đoạn thẳng CM và HN cắt nhau tại T. Gọi P là giao điểm của HN và KM, Q là giao điểm của CM và KN. Chứng minh ET vuông góc với PQ.`;
    const p = toaDoHinh(de);
    expect(dist(p.A, p.B)).toBeLessThan(dist(p.A, p.C));
    expect(vuong(p.F, p.G, p.F, p.B)).toBe(true);
    expect(thangHang(p.G, p.A, p.H)).toBe(true);
    expect(khac(p.G, p.A)).toBe(true);
    expect(thangHang(p.T, p.C, p.M) && thangHang(p.T, p.H, p.N)).toBe(true);
    expect(thuocDoan(p.T, p.C, p.M, 1e-7) && thuocDoan(p.T, p.H, p.N, 1e-7)).toBe(true);
  });
});

describe('hsg #152 — "(O) đường kính BC" không bị nhận nhầm là đường tròn đường kính đôi một cắt nhau', () => {
  it('E trên AB và (O); D trên cung nhỏ BE; G = CD ∩ AH; M = EG ∩ (O)', () => {
    const de = `Cho tam giác nhọn ABC (AB > AC). Gọi AH là đường cao của tam giác ABC (H ∈ BC). Vẽ đường tròn (O) đường kính BC, đường tròn (O) cắt AB tại E. Trên cung nhỏ BE lấy điểm D, CD cắt AH tại G.
a) Chứng minh tứ giác BDGH nội tiếp trong một đường tròn.
b) Đường thẳng EG cắt đường tròn (O) tại điểm M. Hai đường thẳng AH và BM cắt nhau tại I. Chứng minh GA.GI = GE.GM.
c) Hai đường thẳng AD và CB cắt nhau tại N, DB và CI cắt nhau tại K. Chứng minh NK // AH.`;
    const r = tryDeterministicFigure(de);
    expect(r.ok).toBe(true);
    const p = toaDoHinh(de);
    const R = dist(p.O, p.B);
    expect(dist(p.O, p.C)).toBeCloseTo(R, 9);
    expect(thuocDoan(p.O, p.B, p.C, 1e-7)).toBe(true);
    expect(trenDuongTron(p.E, p.O, R) && thuocDoan(p.E, p.A, p.B, 1e-7)).toBe(true);
    // D trên cung NHỎ BE: khác phía C so với dây BE.
    expect(trenDuongTron(p.D, p.O, R)).toBe(true);
    expect(cungPhia(p.B, p.E, p.D, p.C)).toBe(false);
    expect(thangHang(p.G, p.C, p.D) && thangHang(p.G, p.A, p.H)).toBe(true);
    expect(trenDuongTron(p.M, p.O, R) && thangHang(p.M, p.E, p.G) && khac(p.M, p.E)).toBe(true);
    expect(thangHang(p.N, p.A, p.D) && thangHang(p.N, p.B, p.C)).toBe(true);
    expect(songSong(p.N, p.K, p.A, p.H)).toBe(true); // điều đề bắt chứng minh
  });
});
