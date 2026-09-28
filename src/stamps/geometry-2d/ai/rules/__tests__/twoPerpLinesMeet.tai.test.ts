/** @jest-environment jsdom */
import { toaDoHinh, type XY } from '../../__tests__/helpers/toaDoHinh';

beforeAll(() => {
  window.matchMedia ??= (() => ({ matches: false, addListener() {}, removeListener() {} })) as never;
});

/** Tích vô hướng (p−q)·(a−b): 0 ⇔ pq ⊥ ab. */
const vuong = (p: XY, q: XY, a: XY, b: XY) =>
  Math.abs((p[0] - q[0]) * (a[0] - b[0]) + (p[1] - q[1]) * (a[1] - b[1])) < 1e-9;

/** Dạng "vuông góc với AB TẠI B" — đề thật trong hinh-phang-tong-hop-2026-09.txt. */
describe('twoPerpLinesMeet — "vuông góc với AB tại M"', () => {
  it('#52 "Các đường thẳng vuông góc với AB, AC tại M, N cắt nhau ở O"', () => {
    const p = toaDoHinh('Cho tam giác ABC có AB = AC. Trên cạnh AB, AC lần lượt lấy các điểm M, N sao cho AM = AN. Các đường thẳng vuông góc với AB, AC tại M, N cắt nhau ở O.');
    expect(vuong(p.O, p.M, p.A, p.B)).toBe(true);
    expect(vuong(p.O, p.N, p.A, p.C)).toBe(true);
  });

  it('#53 "Đường thẳng vuông góc với AB tại B cắt đường thẳng vuông góc với AC tại C ở D"', () => {
    const p = toaDoHinh('Cho tam giác ABC có AB = AC. Đường thẳng vuông góc với AB tại B cắt đường thẳng vuông góc với AC tại C ở D.');
    expect(vuong(p.D, p.B, p.A, p.B)).toBe(true);
    expect(vuong(p.D, p.C, p.A, p.C)).toBe(true);
  });

  it('#60 "Các đường thẳng vuông góc với AB tại B, vuông góc với AC tại C cắt nhau tại D"', () => {
    const p = toaDoHinh('Cho tam giác ABC, trực tâm H. Các đường thẳng vuông góc với AB tại B, vuông góc với AC tại C cắt nhau tại D.');
    expect(vuong(p.D, p.B, p.A, p.B)).toBe(true);
    expect(vuong(p.D, p.C, p.A, p.C)).toBe(true);
  });
});
