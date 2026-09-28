/** @jest-environment jsdom */
// Điểm chia đoạn theo tỉ số / xác định bởi đẳng thức vectơ (Toán 10). Mọi ca ĐO toạ
// độ hình dựng bằng JSXGraph thật: tỉ số, hướng (chia trong/chia ngoài), thẳng hàng.
import { toaDoHinh, dist, thuocDoan, type XY } from '../../__tests__/helpers/toaDoHinh';
import { tryDeterministicFigure } from '../../deterministic/tryDeterministicFigure';
import { pointRatioRule } from '../pointRatio';
import { segmentClauses } from '../../deterministic/coverage';
import {
  moiDangThucVecto, giaiDiem, docChuoiDoDai, viTriTrenDoan, chiaDeu, quySoDo,
} from '../vectorEquation';

beforeAll(() => {
  window.matchMedia ??= (() => ({ matches: false, addListener() {}, removeListener() {} })) as never;
});

/** P = X + t·(Y − X)? trả t (kiểm tra thẳng hàng). */
function thamSo(p: XY, x: XY, y: XY): number {
  const d = [y[0] - x[0], y[1] - x[1]];
  const v = [p[0] - x[0], p[1] - x[1]];
  const cross = d[0] * v[1] - d[1] * v[0];
  expect(Math.abs(cross)).toBeLessThan(1e-9);
  return (d[0] * v[0] + d[1] * v[1]) / (d[0] * d[0] + d[1] * d[1]);
}

describe('đọc đẳng thức vectơ / hệ thức độ dài (thuần)', () => {
  it('vectơ MA + 2 vectơ MB = vectơ 0 ⇒ M = (A + 2B)/3', () => {
    const [lin] = moiDangThucVecto('Gọi M là điểm thỏa mãn vectơ MA + 2 vectơ MB = vectơ 0.');
    const sol = giaiDiem(lin, 'M')!;
    expect(sol.get('A')).toBeCloseTo(1 / 3, 12);
    expect(sol.get('B')).toBeCloseTo(2 / 3, 12);
  });
  it('vectơ MA = 2 vectơ MB ⇒ M = 2B − A (chia ngoài)', () => {
    const sol = giaiDiem(moiDangThucVecto('vectơ MA = 2 vectơ MB')[0], 'M')!;
    expect(sol.get('A')).toBeCloseTo(-1, 12);
    expect(sol.get('B')).toBeCloseTo(2, 12);
  });
  it('hệ số âm, phân số, ngoặc, "véc tơ", dấu trừ Unicode', () => {
    expect([...giaiDiem(moiDangThucVecto('vectơ IA = −2 vectơ IB')[0], 'I')!]).toEqual([['A', 1 / 3], ['B', 2 / 3]]);
    const s = giaiDiem(moiDangThucVecto('véc tơ AM = 1/2(véc tơ AB + vectơ AC)')[0], 'M')!;
    expect(s.get('B')).toBeCloseTo(0.5, 12);
    expect(s.get('C')).toBeCloseTo(0.5, 12);
    expect(s.has('A')).toBe(false);
  });
  it('hai đẳng thức trong một mệnh đề', () => {
    expect(moiDangThucVecto('vectơ MA = 2 vectơ MB, vectơ NA + 3 vectơ NC = vectơ 0')).toHaveLength(2);
  });
  it('độ dài: BD = 2DC ⇒ t = 2/3; 3MA = 2MB ⇒ 2/5; BD = BC/3 ⇒ 1/3; AM = 2AB ⇒ ngoài đoạn', () => {
    expect(viTriTrenDoan(docChuoiDoDai('BD = 2DC')!, 'D', 'B', 'C')).toBeCloseTo(2 / 3, 12);
    expect(viTriTrenDoan(docChuoiDoDai('3MA = 2MB')!, 'M', 'A', 'B')).toBeCloseTo(0.4, 12);
    expect(viTriTrenDoan(docChuoiDoDai('BD = BC/3')!, 'D', 'B', 'C')).toBeCloseTo(1 / 3, 12);
    expect(viTriTrenDoan(docChuoiDoDai('AM = 2AB')!, 'M', 'A', 'B')).toBeUndefined();
    expect(viTriTrenDoan(docChuoiDoDai('AE = AD')!, 'E', 'A', 'B')).toBeUndefined(); // D không thuộc {E,A,B}
  });
  it('chia đều BM = MN = NC; số đo "BD = 2 cm" quy theo BC = 8', () => {
    expect([...chiaDeu(docChuoiDoDai('BM = MN = NC')!, ['M', 'N'], 'B', 'C')!]).toEqual([['M', 1 / 3], ['N', 2 / 3]]);
    const ch = quySoDo(docChuoiDoDai('BD = 2 cm')!, 'B', 'C', 8)!;
    expect(viTriTrenDoan(ch, 'D', 'B', 'C')).toBeCloseTo(0.25, 12);
    expect(quySoDo(docChuoiDoDai('BD = 2 cm')!, 'B', 'C', undefined)).toBeNull();
  });
});

describe('pointRatio — hình dựng đúng tỉ số (JSXGraph thật)', () => {
  it('"M thuộc đoạn AB sao cho MA = 2MB" ⇒ M trong đoạn, MA = 2·MB', () => {
    const p = toaDoHinh('Cho tam giác ABC. Gọi M là điểm thuộc đoạn AB sao cho MA = 2MB.');
    expect(thuocDoan(p.M, p.A, p.B)).toBe(true);
    expect(dist(p.M, p.A)).toBeCloseTo(2 * dist(p.M, p.B), 9);
  });

  it('"Trên cạnh BC lấy điểm D sao cho BD = 1/3 BC"', () => {
    const p = toaDoHinh('Cho tam giác ABC. Trên cạnh BC lấy điểm D sao cho BD = 1/3 BC. Tính AD.');
    expect(thamSo(p.D, p.B, p.C)).toBeCloseTo(1 / 3, 9);
  });

  it('phân phối: "lấy M, N lần lượt thuộc AB, AC sao cho AM = 1/3 AB, AN = 2/3 AC"', () => {
    const p = toaDoHinh('Cho tam giác ABC, lấy M, N lần lượt thuộc AB, AC sao cho AM = 1/3 AB, AN = 2/3 AC.');
    expect(thamSo(p.M, p.A, p.B)).toBeCloseTo(1 / 3, 9);
    expect(thamSo(p.N, p.A, p.C)).toBeCloseTo(2 / 3, 9);
  });

  it('chia ba đều: "trên đoạn thẳng AD lấy hai điểm E, G sao cho AE = EG = GD" (#31)', () => {
    const p = toaDoHinh('Cho tam giác ABC có đường trung tuyến AD, trên đoạn thẳng AD lấy hai điểm E, G sao cho AE = EG = GD. Chứng minh G là trọng tâm tam giác ABC.');
    expect(thamSo(p.E, p.A, p.D)).toBeCloseTo(1 / 3, 9);
    expect(thamSo(p.G, p.A, p.D)).toBeCloseTo(2 / 3, 9);
    // Đúng điều phải chứng minh: G là trọng tâm.
    expect(p.G[0]).toBeCloseTo((p.A[0] + p.B[0] + p.C[0]) / 3, 9);
    expect(p.G[1]).toBeCloseTo((p.A[1] + p.B[1] + p.C[1]) / 3, 9);
  });

  it('"Điểm D nằm trên cạnh BC sao cho BD = 2 cm" với BC = 8 cm (#101) ⇒ BD = BC/4', () => {
    const p = toaDoHinh('Cho tam giác ABC có AB = 5 cm, BC = 8 cm, AC = 7 cm. Điểm D nằm trên cạnh BC sao cho BD = 2 cm.');
    expect(thamSo(p.D, p.B, p.C)).toBeCloseTo(0.25, 9);
  });

  it('vectơ, chia trong: "vectơ IA + 2 vectơ IB = vectơ 0" ⇒ I = (A + 2B)/3', () => {
    const p = toaDoHinh('Cho tam giác ABC. Gọi I là điểm thỏa mãn vectơ IA + 2 vectơ IB = vectơ 0.');
    expect(thamSo(p.I, p.A, p.B)).toBeCloseTo(2 / 3, 9);
  });

  it('vectơ, chia NGOÀI: "vectơ MA = 2 vectơ MB" ⇒ B là trung điểm AM (M vượt qua B)', () => {
    const p = toaDoHinh('Cho đoạn thẳng AB. Gọi M là điểm thỏa mãn vectơ MA = 2 vectơ MB.');
    expect(thamSo(p.M, p.A, p.B)).toBeCloseTo(2, 9);
    expect(thuocDoan(p.B, p.A, p.M)).toBe(true);
  });

  it('vectơ, chia ngoài phía A: "vectơ MB = 3 vectơ MA" ⇒ M = A − (B − A)/2', () => {
    const p = toaDoHinh('Cho đoạn thẳng AB. Gọi M là điểm thỏa mãn vectơ MB = 3 vectơ MA.');
    // MB = 3MA ⇒ B − M = 3A − 3M ⇒ M = (3A − B)/2 = A + (−1/2)(B − A).
    expect(thamSo(p.M, p.A, p.B)).toBeCloseTo(-0.5, 9);
    expect(thuocDoan(p.A, p.M, p.B)).toBe(true);
  });

  it('vectơ theo đỉnh: "vectơ AM = 1/3 vectơ AC" trong hình bình hành', () => {
    const p = toaDoHinh('Cho hình bình hành ABCD. Gọi M là điểm thỏa vectơ AM = 1/3 vectơ AC.');
    expect(thamSo(p.M, p.A, p.C)).toBeCloseTo(1 / 3, 9);
  });

  it('ba điểm trở lên ("… + 2 vectơ MC = vectơ 0") ⇒ KHÔNG dựng bừa: mệnh đề chưa phủ', () => {
    const de = 'Cho tam giác ABC. Gọi M là điểm thỏa mãn vectơ MA + vectơ MB + 2 vectơ MC = vectơ 0.';
    expect(pointRatioRule.match({ problem: de, clauses: segmentClauses(de) })).toHaveLength(0);
    const r = tryDeterministicFigure(de);
    expect(r.ok).toBe(false); // không còn "đủ hình" mà thiếu M
  });

  it('chỗ chứa là đoạn nhưng vectơ cho điểm ngoài đoạn ⇒ bỏ qua (mâu thuẫn cách hiểu)', () => {
    const de = 'Cho tam giác ABC. Gọi M là điểm thuộc đoạn AB sao cho vectơ MA = 2 vectơ MB.';
    expect(pointRatioRule.match({ problem: de, clauses: segmentClauses(de) })).toHaveLength(0);
  });

  it('độ dài trên đường thẳng (không nói đoạn) ⇒ nhập nhằng, bỏ qua', () => {
    const de = 'Cho tam giác ABC. Gọi M là điểm sao cho MA = 2MB.';
    expect(pointRatioRule.match({ problem: de, clauses: segmentClauses(de) })).toHaveLength(0);
  });
});
