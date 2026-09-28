// Phép đo hình dùng chung cho test e2e dựng hình (toạ độ từ toaDoHinh/dungHinh).
import { dist, type XY } from './toaDoHinh';

export const cheo = (a: XY, b: XY, p: XY) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
export const thangHang = (p: XY, a: XY, b: XY) => Math.abs(cheo(a, b, p)) < 1e-7 * Math.max(1, dist(a, b));
export const tich = (a: XY, b: XY, c: XY, d: XY) => (b[0] - a[0]) * (d[0] - c[0]) + (b[1] - a[1]) * (d[1] - c[1]);
/** AB ⊥ CD */
export const vuong = (a: XY, b: XY, c: XY, d: XY) => Math.abs(tich(a, b, c, d)) < 1e-7 * dist(a, b) * dist(c, d);
export const songSong = (a: XY, b: XY, c: XY, d: XY) =>
  Math.abs((b[0] - a[0]) * (d[1] - c[1]) - (b[1] - a[1]) * (d[0] - c[0])) < 1e-7 * dist(a, b) * dist(c, d);
/** P trên đường tròn tâm O bán kính OR. */
export const trenDuongTron = (p: XY, o: XY, r: number) => Math.abs(dist(p, o) - r) < 1e-7 * Math.max(1, r);
/** P, Q cùng phía đường thẳng AB. */
export const cungPhia = (a: XY, b: XY, p: XY, q: XY) => Math.sign(cheo(a, b, p)) === Math.sign(cheo(a, b, q));
export const khac = (p: XY, q: XY) => dist(p, q) > 1e-3;
