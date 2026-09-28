/** @jest-environment jsdom */
// Hình "full" nhưng SUY BIẾN (hai điểm khác tên trùng khít) tìm được khi quét toạ độ
// toàn bộ đề hinh-phang + lop7. Mỗi ca khoá đúng điều kiện đề.
import { toaDoHinh, dist, thuocDoan, type XY } from './helpers/toaDoHinh';

beforeAll(() => {
  window.matchMedia ??= (() => ({ matches: false, addListener() {}, removeListener() {} })) as never;
});

const cheo = (a: XY, b: XY, p: XY) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
const songSong = (a: XY, b: XY, c: XY, d: XY) =>
  Math.abs((b[0] - a[0]) * (d[1] - c[1]) - (b[1] - a[1]) * (d[0] - c[0])) < 1e-9;
const dot = (a: XY, b: XY, c: XY, d: XY) => (b[0] - a[0]) * (d[0] - c[0]) + (b[1] - a[1]) * (d[1] - c[1]);

describe('hình suy biến — không còn hai điểm trùng khít', () => {
  it('hinh-phang #25 "Lấy điểm M trên cạnh BC" (tam giác cân): M KHÔNG ở trung điểm ⇒ E ≠ A; EM = FN', () => {
    const p = toaDoHinh('Cho tam giác ABC cân tại A. Lấy điểm M trên cạnh BC. Trên tia đối của tia CB lấy điểm N sao cho BM = CN. Đường thẳng qua M vuông góc với BC cắt AB tại E. Đường thẳng qua N vuông góc với BC cắt AC tại F.');
    expect(thuocDoan(p.M, p.B, p.C)).toBe(true);
    expect(dist(p.E, p.A)).toBeGreaterThan(0.1);
    expect(dist(p.E, p.M)).toBeCloseTo(dist(p.F, p.N), 9);
  });

  it('hinh-phang #83 "qua D kẻ các đường thẳng song song với AB và AC, cắt AC và AB theo thứ tự ở E và F": DE // AB, DF // AC', () => {
    const p = toaDoHinh('Cho tam giác ABC, qua điểm D thuộc cạnh BC, kẻ các đường thẳng song song với AB và AC, cắt AC và AB theo thứ tự ở E và F.');
    expect(thuocDoan(p.E, p.A, p.C)).toBe(true);
    expect(thuocDoan(p.F, p.A, p.B)).toBe(true);
    expect(songSong(p.D, p.E, p.A, p.B)).toBe(true);
    expect(songSong(p.D, p.F, p.A, p.C)).toBe(true);
  });

  it('hinh-phang #162 "Đường cao AD của tam giác ABC cắt đường tròn (O) tại điểm E": E trên đường AD (không phải BC)', () => {
    const p = toaDoHinh('Cho tam giác ABC có ba góc nhọn (AB < AC), nội tiếp đường tròn (O). Đường cao AD của tam giác ABC cắt đường tròn (O) tại điểm E (E khác A). Gọi K là chân đường vuông góc kẻ từ điểm E đến đường thẳng AB.');
    expect(Math.abs(cheo(p.A, p.D, p.E))).toBeLessThan(1e-9);
    expect(dist(p.E, p.C)).toBeGreaterThan(0.1);
    expect(dist(p.O, p.E)).toBeCloseTo(dist(p.O, p.A), 9);
    expect(dot(p.A, p.D, p.B, p.C)).toBeCloseTo(0, 9);
  });
});
