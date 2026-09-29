/** @jest-environment jsdom */
// Kịch bản TEST TAY trên trang "Dán đề → ra hình" (2026-09-28): 6 đề thật trong
// docs/datasets/hinh-phang-tong-hop-2026-09.txt, dán vào trình duyệt và soi hình như
// một tester. 4/6 ca lần đầu KHÔNG đạt dù test tự động cũ xanh — vì test cũ chỉ hỏi
// "có tên điểm không" / "điểm có trên ĐƯỜNG thẳng không". Mỗi ca dưới đây khoá đúng
// điều người xem nhìn thấy sai: điểm nằm TRONG đoạn, thứ tự trên cát tuyến, tỉ lệ cạnh
// theo số đo đề cho, đủ đoạn thẳng đề bảo kẻ.
import { tryDeterministicFigure } from '../deterministic/tryDeterministicFigure';
import { toaDoHinh, dist, thuocDoan, type XY } from './helpers/toaDoHinh';

beforeAll(() => {
  window.matchMedia ??= (() => ({ matches: false, addListener() {}, removeListener() {} })) as never;
});

const cheo = (a: XY, b: XY, p: XY) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
const thangHang = (p: XY, a: XY, b: XY) => Math.abs(cheo(a, b, p)) < 1e-9;
const songSong = (a: XY, b: XY, c: XY, d: XY) =>
  Math.abs((b[0] - a[0]) * (d[1] - c[1]) - (b[1] - a[1]) * (d[0] - c[0])) < 1e-9;

function doanThang(de: string): Set<string> {
  const r = tryDeterministicFigure(de);
  if (!r.ok) throw new Error(r.reason);
  return new Set(
    r.figure.dsl.shapes
      .filter((s) => s.kind === 'segment')
      .map((s) => [(s as { p1: string }).p1, (s as { p2: string }).p2].sort().join('')),
  );
}

describe('test tay 2026-09-28 — hình phải ĐÚNG như người xem kiểm', () => {
  it('ca 1 (#13): E trên cạnh AB, AE = AD', () => {
    const p = toaDoHinh('Cho tam giác ABC cân tại A có góc A < 90°, kẻ BD vuông góc với AC. Trên cạnh AB lấy điểm E sao cho AE = AD. Chứng minh rằng: a) DE // BC. b) CE ⊥ AB.');
    expect(thuocDoan(p.E, p.A, p.B)).toBe(true);
    expect(dist(p.A, p.E)).toBeCloseTo(dist(p.A, p.D), 9);
  });

  it('ca 2 (#73): "Kẻ PM ⊥ AB tại M, QN ⊥ CD tại N" — vẽ CẢ đoạn PM lẫn QN', () => {
    const de = 'Cho hình bình hành ABCD, gọi O là giao điểm của hai đường chéo. Gọi P và Q lần lượt là trung điểm của OB, OD. Kẻ PM vuông góc với AB tại M, QN vuông góc với CD tại N. Chứng minh ba điểm M, O, N thẳng hàng.';
    const seg = doanThang(de);
    expect(seg.has('MP')).toBe(true);
    expect(seg.has('NQ')).toBe(true);
    const p = toaDoHinh(de);
    expect(thangHang(p.O, p.M, p.N)).toBe(true); // chính điều đề bắt chứng minh
  });

  it('ca 3 (#75): E trên AC; EF ∥ BC, ED ∥ AB; F trong AB, D trong BC', () => {
    const p = toaDoHinh('Cho tam giác ABC. Từ một điểm E trên cạnh AC vẽ đường thẳng song song với BC cắt AB tại F và đường thẳng song song với AB cắt BC tại D. Chứng minh BFED là hình bình hành.');
    expect(thuocDoan(p.E, p.A, p.C)).toBe(true);
    expect(songSong(p.E, p.F, p.B, p.C)).toBe(true);
    expect(songSong(p.E, p.D, p.A, p.B)).toBe(true);
    expect(thuocDoan(p.F, p.A, p.B)).toBe(true);
    expect(thuocDoan(p.D, p.B, p.C)).toBe(true);
  });

  it('ca 4 (#16): trung trực AB, AC cắt CẠNH BC — M, N nằm TRONG đoạn BC', () => {
    const p = toaDoHinh('Cho tam giác ABC. Các đường trung trực của AB và AC cắt cạnh BC theo thứ tự ở M và N. Chứng minh rằng góc BAM = góc ABC.');
    expect(thuocDoan(p.M, p.B, p.C)).toBe(true);
    expect(thuocDoan(p.N, p.B, p.C)).toBe(true);
    expect(dist(p.M, p.A)).toBeCloseTo(dist(p.M, p.B), 9);
    expect(dist(p.N, p.A)).toBeCloseTo(dist(p.N, p.C), 9);
  });

  it('ca 5 (#151): cát tuyến ABC — B GIỮA A và C (AB < AC), N thuộc cung nhỏ BC', () => {
    const p = toaDoHinh('Cho đường tròn (O) và điểm A cố định nằm ngoài đường tròn (O). Kẻ hai tiếp tuyến AM và AN với đường tròn (M, N là tiếp điểm). Qua A kẻ cát tuyến ABC không đi qua tâm O (AB < AC và N thuộc cung nhỏ BC). Gọi H, K thứ tự là giao điểm của MN với AO và BC. Gọi I là trung điểm của dây BC.');
    expect(thuocDoan(p.B, p.A, p.C)).toBe(true);
    expect(dist(p.A, p.B)).toBeLessThan(dist(p.A, p.C));
    // N trên cung NHỎ BC ⇔ N và tâm O ở hai phía của dây BC.
    expect(Math.sign(cheo(p.B, p.C, p.N))).toBe(-Math.sign(cheo(p.B, p.C, p.O)));
    // Tiếp điểm vẫn là tiếp điểm: OM ⊥ AM, ON ⊥ AN.
    const vuong = (x: XY, o: XY, a: XY) => Math.abs((x[0] - o[0]) * (a[0] - x[0]) + (x[1] - o[1]) * (a[1] - x[1])) < 1e-9;
    expect(vuong(p.M, p.O, p.A) && vuong(p.N, p.O, p.A)).toBe(true);
    expect(thangHang(p.H, p.M, p.N) && thangHang(p.H, p.A, p.O)).toBe(true);
    expect(thangHang(p.K, p.B, p.C)).toBe(true);
  });

  it('ca 6 (#106): AB = 4 cm, AC = 8 cm ⇒ AC = 2·AB trên hình; AD = 2 cm = ¼·AC', () => {
    const p = toaDoHinh('Cho tam giác ABC có AB = 4 cm, AC = 8 cm. Trên cạnh AC lấy D sao cho AD = 2 cm. Chứng minh tam giác ABD đồng dạng với tam giác ACB.');
    expect(dist(p.A, p.C) / dist(p.A, p.B)).toBeCloseTo(2, 9);
    expect(thuocDoan(p.D, p.A, p.C)).toBe(true);
    expect(dist(p.A, p.D) / dist(p.A, p.C)).toBeCloseTo(0.25, 9);
  });

  it('đủ 3 cạnh (6, 8, 10) ⇒ tam giác vuông tại A đúng Pythagore', () => {
    const p = toaDoHinh('Cho tam giác ABC có AB = 6 cm, AC = 8 cm, BC = 10 cm.');
    expect(dist(p.A, p.B) / dist(p.B, p.C)).toBeCloseTo(0.6, 9);
    expect(dist(p.A, p.C) / dist(p.B, p.C)).toBeCloseTo(0.8, 9);
  });
});
