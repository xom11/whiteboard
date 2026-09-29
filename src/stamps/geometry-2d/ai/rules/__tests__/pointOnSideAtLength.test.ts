/** @jest-environment jsdom */
import { pointOnSideAtLengthRule } from '../pointOnSideAtLength';
import { segmentClauses } from '../../deterministic/coverage';
import { toaDoHinh, dist, thuocDoan, thuocTia } from '../../__tests__/helpers/toaDoHinh';

// jsdom thiếu matchMedia — JSXGraph thật gọi nó lúc initBoard (chỉ để in log).
beforeAll(() => {
  window.matchMedia ??= (() => ({ matches: false, addListener() {}, removeListener() {} })) as never;
});

function intentsOf(problem: string) {
  return pointOnSideAtLengthRule
    .match({ problem, clauses: segmentClauses(problem) })
    .flatMap((m) => m.intents) as any[];
}

/**
 * Đề thật trong docs/datasets/hinh-phang-tong-hop-2026-09.txt. Test đo TOẠ ĐỘ hình
 * dựng ra (JSXGraph thật): điểm phải nằm đúng cạnh/tia VÀ đúng độ dài đề cho —
 * không chỉ "có tên điểm".
 */
describe('pointOnSideAtLength — dựng đúng điều kiện độ dài', () => {
  it('#13 "Trên cạnh AB lấy điểm E sao cho AE = AD": E ∈ AB, AE = AD', () => {
    const p = toaDoHinh('Cho tam giác ABC cân tại A có góc A < 90°, kẻ BD vuông góc với AC. Trên cạnh AB lấy điểm E sao cho AE = AD.');
    expect(thuocDoan(p.E, p.A, p.B)).toBe(true);
    expect(dist(p.A, p.E)).toBeCloseTo(dist(p.A, p.D), 9);
  });

  it('#18 trên TIA: "Trên tia AC lấy điểm E sao cho AE = AB"', () => {
    const p = toaDoHinh('Cho tam giác ABC, đường phân giác AD. Trên tia AC lấy điểm E sao cho AE = AB.');
    expect(thuocTia(p.E, p.A, p.C)).toBe(true);
    expect(dist(p.A, p.E)).toBeCloseTo(dist(p.A, p.B), 9);
  });

  it('#39 mốc là đầu CUỐI cạnh: "Trên cạnh BC lấy điểm D sao cho CD = FE"', () => {
    const p = toaDoHinh('Cho tam giác ABC có CF là đường phân giác của góc C (F ∈ AB). Qua F kẻ đường thẳng song song với BC cắt AC ở E. Trên cạnh BC lấy điểm D sao cho CD = FE.');
    expect(thuocDoan(p.D, p.B, p.C)).toBe(true);
    expect(dist(p.C, p.D)).toBeCloseTo(dist(p.F, p.E), 9);
  });

  it('#2 điểm mốc ở mệnh đề trước: "lấy điểm I, trên cạnh AC lấy điểm H sao cho AI = AH"', () => {
    const p = toaDoHinh('Cho tam giác ABC có AD là đường phân giác trong góc A (D ∈ BC). Trên cạnh AB lấy điểm I, trên cạnh AC lấy điểm H sao cho AI = AH.');
    expect(thuocDoan(p.I, p.A, p.B)).toBe(true);
    expect(thuocDoan(p.H, p.A, p.C)).toBe(true);
    expect(dist(p.A, p.H)).toBeCloseTo(dist(p.A, p.I), 9);
  });

  it('#66 phân phối: "Trên các cạnh bên AB, AC lấy theo thứ tự các điểm D và E sao cho AD = AE"', () => {
    const p = toaDoHinh('Cho tam giác ABC cân tại A. Trên các cạnh bên AB, AC lấy theo thứ tự các điểm D và E sao cho AD = AE.');
    expect(thuocDoan(p.D, p.A, p.B)).toBe(true);
    expect(thuocDoan(p.E, p.A, p.C)).toBe(true);
    expect(dist(p.A, p.E)).toBeCloseTo(dist(p.A, p.D), 9);
  });

  it('#106 số đo cm quy về tỉ lệ cạnh đề cho: AC = 8 cm, AD = 2 cm ⇒ AD = ¼·AC', () => {
    const p = toaDoHinh('Cho tam giác ABC có AB = 4 cm, AC = 8 cm. Trên cạnh AC lấy D sao cho AD = 2 cm.');
    expect(thuocDoan(p.D, p.A, p.C)).toBe(true);
    expect(dist(p.A, p.D) / dist(p.A, p.C)).toBeCloseTo(0.25, 9);
  });

  it('chuỗi 4 vế "AM = CN = CP = AQ": M tự do, N/P/Q đo theo AM từ đúng mốc', () => {
    const ints = intentsOf('Trên cạnh AB, BC, CD, DA lấy theo thứ tự các điểm M, N, P, Q sao cho AM = CN = CP = AQ.');
    const by = Object.fromEntries(ints.map((i) => [i.name, i.constraint]));
    expect(by.M).toEqual({ kind: 'onSegment', of: 'AB' });
    expect(by.N).toMatchObject({ kind: 'pointAtDistance', from: 'C', through: 'B', origin: 'from', distance: { p1: 'A', p2: 'M' } });
    expect(by.P).toMatchObject({ from: 'C', through: 'D' });
    expect(by.Q).toMatchObject({ from: 'A', through: 'D' });
  });

  it('lop7 #22 vế nối "Lấy điểm D thuộc cạnh AC và điểm E thuộc cạnh AB sao cho AD = AE": D ∈ AC, E ∈ AB, AD = AE', () => {
    const p = toaDoHinh('Cho tam giác ABC cân ở A. Lấy điểm D thuộc cạnh AC và điểm E thuộc cạnh AB sao cho AD = AE. Gọi I là giao điểm của BD và CE.');
    expect(thuocDoan(p.D, p.A, p.C)).toBe(true);
    expect(thuocDoan(p.E, p.A, p.B)).toBe(true);
    expect(dist(p.A, p.D)).toBeCloseTo(dist(p.A, p.E), 9);
  });

  it.each([
    ['tỉ số — không đoán', 'Cho tam giác ABC, điểm M thuộc đoạn thẳng BC sao cho BM = 2MC.'],
    ['tổng hai đoạn — không đoán', 'Trên tia phân giác của góc A lấy điểm D sao cho AD = AB + AC.'],
    ['số đo mà không biết độ dài cạnh', 'Cho tam giác ABC. Trên cạnh AC lấy D sao cho AD = 2 cm.'],
    ['số đo lớn hơn cả cạnh', 'Cho tam giác ABC có AC = 3 cm. Trên cạnh AC lấy D sao cho AD = 5 cm.'],
    ['vế không neo vào đầu cạnh', 'Cho tam giác ABC. Trên cạnh AB lấy điểm E sao cho CE = AB.'],
  ])('bỏ qua (%s)', (_ly, de) => {
    expect(intentsOf(de)).toEqual([]);
  });
});
