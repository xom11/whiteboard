/** @jest-environment jsdom */
// Đề thật trong docs/datasets/lop7-2026-09.txt — đo hình dựng bằng JSXGraph thật:
// điểm nằm TRONG đoạn, vuông góc, độ dài, và các kết luận đề bắt chứng minh (hình
// đúng thì kết luận đúng trên toạ độ).
import { toaDoHinh, dist, thuocDoan, type XY } from './helpers/toaDoHinh';

beforeAll(() => {
  window.matchMedia ??= (() => ({ matches: false, addListener() {}, removeListener() {} })) as never;
});

const cheo = (a: XY, b: XY, p: XY) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
const thangHang = (p: XY, a: XY, b: XY) => Math.abs(cheo(a, b, p)) < 1e-9;
const dot = (a: XY, b: XY, c: XY, d: XY) => (b[0] - a[0]) * (d[0] - c[0]) + (b[1] - a[1]) * (d[1] - c[1]);
const songSong = (a: XY, b: XY, c: XY, d: XY) =>
  Math.abs((b[0] - a[0]) * (d[1] - c[1]) - (b[1] - a[1]) * (d[0] - c[0])) < 1e-9;
const kc = (p: XY, a: XY, b: XY) => Math.abs(cheo(a, b, p)) / dist(a, b);

describe('lop7-2026-09 — hình đúng điều kiện đề', () => {
  it('#16 ý b) "Tia ED cắt tia AH tại K" (mở đầu bằng giao điểm) được dựng; tam giác KCD cân tại D; A, D, I thẳng hàng', () => {
    const p = toaDoHinh('Cho tam giác ABC vuông tại A (AB < AC), H là chân đường vuông góc hạ từ A xuống BC. Trên cạnh AC, lấy điểm E sao cho AH = AE. Qua E kẻ đường vuông góc với AC, cắt cạnh BC tại D.\na) Chứng minh tam giác AHD = tam giác AED và AD là tia phân giác của góc HAC.\nb) Tia ED cắt tia AH tại K. Chứng minh tam giác KCD cân.\nc) Gọi I là trung điểm của KC. Chứng minh ba điểm A, D, I thẳng hàng.');
    expect(thangHang(p.K, p.E, p.D)).toBe(true);
    expect(thangHang(p.K, p.A, p.H)).toBe(true);
    expect(dist(p.D, p.K)).toBeCloseTo(dist(p.D, p.C), 9);
    expect(thangHang(p.I, p.A, p.D)).toBe(true);
  });

  it('#38 "Gọi M là điểm tùy ý trên đoạn thẳng AH": M trong đoạn AH', () => {
    const p = toaDoHinh('Cho tam giác ABC (AB < AC), đường cao AH. Gọi M là điểm tùy ý trên đoạn thẳng AH. Chứng minh MB < MC.');
    expect(thuocDoan(p.M, p.A, p.H)).toBe(true);
    expect(dist(p.M, p.A)).toBeGreaterThan(1e-3);
    expect(dist(p.M, p.H)).toBeGreaterThan(1e-3);
  });

  it('#41 "H, K lần lượt là chân các đường vuông góc kẻ từ B, C xuống đoạn thẳng AD": BH ⊥ AD, CK ⊥ AD; BH + CK < BC', () => {
    const p = toaDoHinh('Cho tam giác ABC, D là điểm nằm giữa B và C (AD không vuông góc với BC). Gọi H, K lần lượt là chân các đường vuông góc kẻ từ B, C xuống đoạn thẳng AD.');
    expect(thangHang(p.H, p.A, p.D)).toBe(true);
    expect(thangHang(p.K, p.A, p.D)).toBe(true);
    expect(dot(p.B, p.H, p.A, p.D)).toBeCloseTo(0, 9);
    expect(dot(p.C, p.K, p.A, p.D)).toBeCloseTo(0, 9);
    expect(dist(p.B, p.H) + dist(p.C, p.K)).toBeLessThan(dist(p.B, p.C));
  });

  it('#50 "I là điểm đồng quy của ba đường phân giác trong tam giác ABC": cách đều 3 cạnh', () => {
    const p = toaDoHinh('Kí hiệu I là điểm đồng quy của ba đường phân giác trong tam giác ABC. Tính góc BIC khi biết góc BAC bằng 120°.');
    expect(kc(p.I, p.A, p.B)).toBeCloseTo(kc(p.I, p.B, p.C), 9);
    expect(kc(p.I, p.A, p.C)).toBeCloseTo(kc(p.I, p.B, p.C), 9);
  });

  it('#60 "Trên cạnh BC lấy hai điểm D và E sao cho BD = BA và CE = CA": D, E trong BC, đúng độ dài', () => {
    const p = toaDoHinh('Cho tam giác ABC vuông tại A. Trên cạnh BC lấy hai điểm D và E sao cho BD = BA và CE = CA. Chứng minh tâm O của đường tròn ngoại tiếp tam giác ADE là giao điểm của các đường phân giác của tam giác ABC.');
    expect(thuocDoan(p.D, p.B, p.C)).toBe(true);
    expect(thuocDoan(p.E, p.B, p.C)).toBe(true);
    expect(dist(p.B, p.D)).toBeCloseTo(dist(p.B, p.A), 9);
    expect(dist(p.C, p.E)).toBeCloseTo(dist(p.C, p.A), 9);
  });

  it('#14 "Đường thẳng qua A song song với BC cắt đường thẳng qua C song song với AB ở D": AD // BC, CD // AB; M trung điểm AC', () => {
    const p = toaDoHinh('Cho tam giác ABC. Đường thẳng qua A song song với BC cắt đường thẳng qua C song song với AB ở D. Gọi M là giao điểm của BD và AC.');
    expect(songSong(p.A, p.D, p.B, p.C)).toBe(true);
    expect(songSong(p.C, p.D, p.A, p.B)).toBe(true);
    expect(dist(p.A, p.M)).toBeCloseTo(dist(p.M, p.C), 9);
  });

  it('#48 "Qua D kẻ đường thẳng // AB, qua B kẻ đường thẳng // AD, hai đường thẳng này cắt nhau tại E": DE // AB, BE // AD; D trọng tâm ACE', () => {
    const p = toaDoHinh('Cho tam giác ABC, đường trung tuyến AD. Qua D kẻ đường thẳng song song với AB, qua B kẻ đường thẳng song song với AD, hai đường thẳng này cắt nhau tại E.\nd) Gọi K là trung điểm CE. Chứng minh A, D, K thẳng hàng.');
    expect(songSong(p.D, p.E, p.A, p.B)).toBe(true);
    expect(songSong(p.B, p.E, p.A, p.D)).toBe(true);
    expect(thangHang(p.K, p.A, p.D)).toBe(true);
    expect(dist(p.A, p.D) / dist(p.A, p.K)).toBeCloseTo(2 / 3, 9);
  });
});
