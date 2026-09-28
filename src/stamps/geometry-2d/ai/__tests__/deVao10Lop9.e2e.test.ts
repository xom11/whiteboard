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

describe('chân đường cao / hình chiếu viết theo đỉnh, chung một đường', () => {
  it('#1 (Thanh Hóa 2022): "H là chân đường cao hạ từ đỉnh A của tam giác ABC"; E hình chiếu của B lên AO', () => {
    const p = hinh(1);
    expect(vuong(p.A, p.H, p.B, p.C) && thuocDoan(p.H, p.B, p.C, 1e-7)).toBe(true);
    expect(vuong(p.B, p.E, p.A, p.O) && thangHang(p.E, p.A, p.O)).toBe(true);
    expect(dist(p.A, p.B)).toBeLessThan(dist(p.A, p.C));
  });
  it('#40 (Ninh Thuận 2022): "D và E lần lượt là chân đường cao của tam giác ABC hạ từ B và C"', () => {
    const p = hinh(40);
    expect(vuong(p.B, p.D, p.A, p.C) && thangHang(p.D, p.A, p.C)).toBe(true);
    expect(vuong(p.C, p.E, p.A, p.B) && thangHang(p.E, p.A, p.B)).toBe(true);
  });
  it('#10 (Thái Bình 2024): "M, N lần lượt là hình chiếu vuông góc của A và B lên đường thẳng EF"', () => {
    const p = hinh(10);
    expect(vuong(p.A, p.M, p.E, p.F) && thangHang(p.M, p.E, p.F)).toBe(true);
    expect(vuong(p.B, p.N, p.E, p.F) && thangHang(p.N, p.E, p.F)).toBe(true);
    const R = dist(p.O, p.A);
    expect(trenDuongTron(p.C, p.O, R) && trenDuongTron(p.D, p.O, R) && vuong(p.C, p.D, p.A, p.B)).toBe(true);
  });
});

describe('cát tuyến / đường qua điểm cắt đường tròn', () => {
  it('#44 (Lâm Đồng 2019): cát tuyến ACD (C nằm giữa A và D) — không còn vòng phụ thuộc', () => {
    const p = hinh(44);
    const R = dist(p.O, p.B);
    expect(trenDuongTron(p.C, p.O, R) && trenDuongTron(p.D, p.O, R)).toBe(true);
    expect(thuocDoan(p.C, p.A, p.D, 1e-7) && khac(p.C, p.D)).toBe(true);
    expect(tiepXuc(p, 'B', 'A')).toBe(true);
  });
  it('#58 (Cần Thơ 2022): qua K cắt (O) tại E và D "sao cho KD < KE"', () => {
    const p = hinh(58);
    expect(dist(p.K, p.D)).toBeLessThan(dist(p.K, p.E));
    expect(thuocDoan(p.D, p.K, p.E, 1e-7)).toBe(true);
    // A và O khác phía EK
    expect(cungPhia(p.E, p.K, p.A, p.O)).toBe(false);
  });
  it('#31 (Quảng Bình 2023): E thuộc cung AC của NỬA đường tròn — nằm giữa A và C trên cung', () => {
    const p = hinh(31);
    const R = dist(p.O, p.A);
    expect(trenDuongTron(p.E, p.O, R) && cungPhia(p.A, p.B, p.E, p.C)).toBe(true);
    expect(cungPhia(p.A, p.C, p.E, p.O)).toBe(false);
    expect(dist(p.A, p.E)).toBeLessThan(dist(p.B, p.C));
  });
});

describe('rule đơn lẻ', () => {
  it('linesCutDistrib: "BC và AC cắt DE lần lượt tại F và I" / "BC cắt OA, AD lần lượt tại H và K"; bỏ đường tham chiếu sau "với"', async () => {
    const { linesCutDistribRule: r } = await import('../rules/linesCutDistrib');
    const chay = (t: string) => r.match({ problem: t, clauses: [{ id: 0, text: t, hasGeometry: true }] }).flatMap((m) => m.intents as any[]);
    expect(chay('BC và AC cắt DE lần lượt tại F và I').map((i) => `${i.name}=${i.constraint.of.join('∩')}`)).toEqual(['F=BC∩DE', 'I=AC∩DE']);
    expect(chay('Đường thẳng BC cắt OA, AD lần lượt tại H và K').map((i) => `${i.name}=${i.constraint.of.join('∩')}`)).toEqual(['H=BC∩OA', 'K=BC∩AD']);
    expect(chay('Đường thẳng qua D vuông góc với AC cắt AB, BC lần lượt tại M, N')).toEqual([]);
  });
});

describe('đường vuông góc tại một điểm cắt HAI đường; dây vuông góc đường kính', () => {
  it('#41 (Bình Thuận 2020): "Đường thẳng vuông góc với MN tại N cắt các tiếp tuyến Ax, By … lần lượt ở C và D"', () => {
    const p = hinh(41);
    expect(vuong(p.C, p.D, p.M, p.N) && thangHang(p.N, p.C, p.D)).toBe(true);
    expect(vuong(p.A, p.C, p.A, p.B) && vuong(p.B, p.D, p.A, p.B)).toBe(true);
    expect(cungPhia(p.A, p.B, p.C, p.N) && cungPhia(p.A, p.B, p.D, p.N)).toBe(true);
  });
  it('#50 (Tiền Giang 2021): "đường thẳng vuông góc với AB tại H cắt dây CB và tia AC lần lượt tại D và E"', () => {
    const p = hinh(50);
    expect(vuong(p.D, p.E, p.A, p.B) && thangHang(p.H, p.D, p.E)).toBe(true);
    expect(thuocDoan(p.D, p.C, p.B, 1e-7)).toBe(true);
    expect(thangHang(p.E, p.A, p.C)).toBe(true);
    expect(dist(p.C, p.A)).toBeLessThan(dist(p.C, p.B));
  });
  it('#19 (Lạng Sơn 2022): "Dây cung MN vuông góc với AB, (AM < BM)"', () => {
    const p = hinh(19);
    const R = dist(p.O, p.A);
    expect(trenDuongTron(p.M, p.O, R) && trenDuongTron(p.N, p.O, R)).toBe(true);
    expect(vuong(p.M, p.N, p.A, p.B)).toBe(true);
    expect(dist(p.A, p.M)).toBeLessThan(dist(p.B, p.M));
    expect(vuong(p.K, p.H, p.A, p.B)).toBe(true);
  });
});
