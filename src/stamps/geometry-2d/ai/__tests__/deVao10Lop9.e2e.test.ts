/** @jest-environment jsdom */
// Đề thật trong docs/datasets/lop9-2026-09.txt (câu hình vào 10 các tỉnh): mỗi ca ĐO
// hình dựng được — không chỉ "có tên điểm".
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { docBoDe } from '../../../../../scripts/diag-hinh-phang';
import { toaDoHinh, dist, thuocDoan, type XY } from './helpers/toaDoHinh';
import { thangHang, vuong, trenDuongTron, cungPhia, khac } from './helpers/doHinh';

beforeAll(() => {
  window.matchMedia ??= (() => ({ matches: false, addListener() {}, removeListener() {} })) as never;
});

const BO = docBoDe(readFileSync(join(__dirname, '../../../../../docs/datasets/lop9-2026-09.txt'), 'utf8'));
const hinh = (so: number): Record<string, XY> => toaDoHinh(BO.find((b) => b.so === so)!.text);
const tiepXuc = (p: Record<string, XY>, T: string, X: string) => vuong(p.O, p[T], p[T], p[X]);

describe('điểm trên đường tròn: "hai điểm phân biệt cố định", "đã cho lấy điểm A … và lấy điểm D"', () => {
  it('#3 (Bắc Giang 2020): A, B trên (O); M trên tia đối BA; MC, MD tiếp tuyến; P, Q trên tia MC, MD', () => {
    const p = hinh(3);
    const R = dist(p.O, p.C);
    expect(trenDuongTron(p.A, p.O, R) && trenDuongTron(p.B, p.O, R)).toBe(true);
    expect(thuocDoan(p.B, p.A, p.M, 1e-7)).toBe(true);
    expect(tiepXuc(p, 'C', 'M') && tiepXuc(p, 'D', 'M')).toBe(true);
    expect(trenDuongTron(p.E, p.O, R) && thuocDoan(p.E, p.O, p.M, 1e-7)).toBe(true);
    expect(vuong(p.O, p.P, p.M, p.N) && thangHang(p.P, p.M, p.C) && thangHang(p.Q, p.M, p.D)).toBe(true);
  });

  it('#5 (Bắc Ninh 2023): A trên (O) đường kính BC, D trên cung nhỏ AC', () => {
    const p = hinh(5);
    const R = dist(p.O, p.B);
    expect(trenDuongTron(p.A, p.O, R) && trenDuongTron(p.D, p.O, R)).toBe(true);
    expect(cungPhia(p.A, p.C, p.D, p.O)).toBe(false);
    expect(thangHang(p.I, p.B, p.D) && thangHang(p.I, p.A, p.H)).toBe(true);
  });

  it('#24 (Tuyên Quang 2021): B, C trên nửa đường tròn đường kính AD, B ở giữa A và C', () => {
    const p = hinh(24);
    const O: XY = [(p.A[0] + p.D[0]) / 2, (p.A[1] + p.D[1]) / 2];
    const R = dist(O, p.A);
    expect(trenDuongTron(p.B, O, R) && trenDuongTron(p.C, O, R)).toBe(true);
    expect(cungPhia(p.A, p.D, p.B, p.C)).toBe(true); // cùng nửa đường tròn
    // B ở giữa A và C trên cung: B khác phía D so với dây AC
    expect(cungPhia(p.A, p.C, p.B, p.D)).toBe(false);
    expect(vuong(p.E, p.F, p.A, p.D)).toBe(true);
  });
});

describe('tiếp tuyến', () => {
  it('#20 (Thái Nguyên 2024): "Các tiếp tuyến của (O) tại hai điểm B, C cắt nhau tại điểm D"; A chính giữa cung nhỏ BC', () => {
    const p = hinh(20);
    expect(tiepXuc(p, 'B', 'D') && tiepXuc(p, 'C', 'D')).toBe(true);
    expect(dist(p.A, p.B)).toBeCloseTo(dist(p.A, p.C), 9);
    expect(cungPhia(p.B, p.C, p.A, p.O)).toBe(false);
  });

  it('#21 (Hòa Bình 2022): K trên cung nhỏ MN, tiếp tuyến tại K cắt AM, AN "theo thứ tự" tại E, F', () => {
    const p = hinh(21);
    expect(cungPhia(p.M, p.N, p.K, p.O)).toBe(false);
    expect(tiepXuc(p, 'K', 'E') && tiepXuc(p, 'K', 'F')).toBe(true);
    expect(thuocDoan(p.E, p.A, p.M, 1e-7) && thuocDoan(p.F, p.A, p.N, 1e-7)).toBe(true);
    expect(thangHang(p.P, p.O, p.E) && thangHang(p.P, p.M, p.N)).toBe(true);
  });

  it('#22 (Lào Cai 2022): "hai tiếp tuyến phân biệt MA, MB"; MO cắt (O) tại C, D với MC < MD; BO cắt (O) tại E', () => {
    const p = hinh(22);
    const R = dist(p.O, p.A);
    expect(tiepXuc(p, 'A', 'M') && tiepXuc(p, 'B', 'M')).toBe(true);
    expect(dist(p.M, p.C)).toBeLessThan(dist(p.M, p.D));
    expect(trenDuongTron(p.C, p.O, R) && trenDuongTron(p.D, p.O, R)).toBe(true);
    expect(trenDuongTron(p.E, p.O, R) && thuocDoan(p.O, p.B, p.E, 1e-7)).toBe(true);
    expect(vuong(p.A, p.I, p.B, p.E)).toBe(true);
  });

  it('#71 (Kỳ Anh HK1 2024): AO cắt đường tròn tại B, C (B nằm giữa A và C)', () => {
    const p = hinh(71);
    const R = dist(p.O, p.M);
    expect(trenDuongTron(p.B, p.O, R) && trenDuongTron(p.C, p.O, R)).toBe(true);
    expect(thuocDoan(p.B, p.A, p.C, 1e-7) && khac(p.B, p.C)).toBe(true);
  });
});

describe('"các đường cao AH, BK và CP" — đủ ba đường cao', () => {
  it('#60 (Hậu Giang 2021): P chân đường cao từ C; PK cắt (O) tại E, F', () => {
    const p = hinh(60);
    expect(vuong(p.C, p.P, p.A, p.B) && thuocDoan(p.P, p.A, p.B, 1e-7)).toBe(true);
    const R = dist(p.O, p.A);
    expect(trenDuongTron(p.E, p.O, R) && trenDuongTron(p.F, p.O, R) && khac(p.E, p.F)).toBe(true);
    expect(thangHang(p.E, p.P, p.K) && thangHang(p.F, p.P, p.K)).toBe(true);
    expect(dist(p.A, p.E)).toBeCloseTo(dist(p.A, p.F), 7); // OA ⊥ EF ⇒ AE = AF
  });
});
