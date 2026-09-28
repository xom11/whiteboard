/** @jest-environment jsdom */
// Đề THẬT trong docs/datasets/lop8-2026-09.txt (và bài liên quan của
// hinh-phang-tong-hop-2026-09.txt). Mỗi ca ĐO hình dựng ra bằng JSXGraph thật —
// song song, vuông góc, tỉ lệ độ dài, điểm trong đoạn — không chỉ "đủ tên điểm".
import { toaDoHinh, dist, thuocDoan, type XY } from './helpers/toaDoHinh';

beforeAll(() => {
  window.matchMedia ??= (() => ({ matches: false, addListener() {}, removeListener() {} })) as never;
});

const tich = (a: XY, b: XY, c: XY, d: XY) => (b[0] - a[0]) * (d[0] - c[0]) + (b[1] - a[1]) * (d[1] - c[1]);
const vuongGoc = (a: XY, b: XY, c: XY, d: XY) => Math.abs(tich(a, b, c, d)) < 1e-9 * dist(a, b) * dist(c, d);

describe('lớp 8 — hình đúng dữ kiện đề', () => {
  it('lop8 #35: tam giác "cân tại ĐỈNH A", chiều cao AH = 3 cm, đáy BC = 10 cm', () => {
    const p = toaDoHinh('Cho tam giác ABC cân tại đỉnh A, chiều cao AH = 3 cm và cạnh đáy BC = 10 cm. Hãy tính độ dài các cạnh bên AB, AC.');
    expect(dist(p.A, p.B)).toBeCloseTo(dist(p.A, p.C), 9);
    expect(thuocDoan(p.H, p.B, p.C)).toBe(true);
    expect(vuongGoc(p.A, p.H, p.B, p.C)).toBe(true);
    expect(dist(p.A, p.H) / dist(p.B, p.C)).toBeCloseTo(3 / 10, 9);
  });

  it('hinh-phang #125: hai dây AB, CD VUÔNG GÓC nhau tại M, AB = 18, CD = 14, MC = 4', () => {
    const p = toaDoHinh('Cho đường tròn tâm O, hai dây AB và CD vuông góc với nhau ở M. Biết AB = 18 cm, CD = 14 cm, MC = 4 cm. Hãy tính khoảng cách từ tâm O đến mỗi dây AB và CD.');
    expect(vuongGoc(p.A, p.B, p.C, p.D)).toBe(true);
    expect(thuocDoan(p.M, p.A, p.B)).toBe(true);
    expect(thuocDoan(p.M, p.C, p.D)).toBe(true);
    expect(dist(p.A, p.B) / dist(p.C, p.D)).toBeCloseTo(18 / 14, 9);
    expect(dist(p.M, p.C) / dist(p.C, p.D)).toBeCloseTo(4 / 14, 9);
    for (const x of 'ABCD') expect(dist(p.O, p[x])).toBeCloseTo(dist(p.O, p.A), 9);
  });

  it('hai dây vuông góc nhau KHÔNG số đo: vẫn ⊥ và cắt nhau trong đường tròn', () => {
    const p = toaDoHinh('Cho đường tròn (O;R). Vẽ hai dây AB và CD vuông góc với nhau tại M.');
    expect(vuongGoc(p.A, p.B, p.C, p.D)).toBe(true);
    expect(thuocDoan(p.M, p.A, p.B)).toBe(true);
    expect(thuocDoan(p.M, p.C, p.D)).toBe(true);
  });
});
