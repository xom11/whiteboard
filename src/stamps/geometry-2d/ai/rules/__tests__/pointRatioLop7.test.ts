/** @jest-environment jsdom */
import { pointRatioRule } from '../pointRatio';
import { segmentClauses } from '../../deterministic/coverage';
import { toaDoHinh, dist, thuocDoan } from '../../__tests__/helpers/toaDoHinh';

beforeAll(() => {
  window.matchMedia ??= (() => ({ matches: false, addListener() {}, removeListener() {} })) as never;
});

function intentsOf(problem: string) {
  return pointRatioRule.match({ problem, clauses: segmentClauses(problem) }).flatMap((m) => m.intents) as any[];
}

describe('pointRatio (đề lớp 7) — điểm chia đoạn theo tỉ số', () => {
  it('hinh-phang #32 "M thuộc đoạn thẳng BC sao cho BM = 2MC": M ∈ BC, BM = 2·MC', () => {
    const p = toaDoHinh('Cho tam giác ABC, điểm M thuộc đoạn thẳng BC sao cho BM = 2MC. Trên tia đối của tia CA lấy điểm D sao cho CD = CA. Gọi E là giao điểm của AM và BD.');
    expect(thuocDoan(p.M, p.B, p.C)).toBe(true);
    expect(dist(p.B, p.M)).toBeCloseTo(2 * dist(p.M, p.C), 9);
    // M là trọng tâm tam giác ABD ⇒ E là trung điểm BD
    expect(dist(p.B, p.E)).toBeCloseTo(dist(p.E, p.D), 9);
  });

  it('hinh-phang #31 "trên đoạn thẳng AD lấy hai điểm E, G sao cho AE = EG = GD": chia ba, đúng thứ tự A-E-G-D', () => {
    const p = toaDoHinh('Cho tam giác ABC có đường trung tuyến AD, trên đoạn thẳng AD lấy hai điểm E, G sao cho AE = EG = GD. Chứng minh G là trọng tâm tam giác ABC.');
    expect(thuocDoan(p.E, p.A, p.G)).toBe(true);
    expect(thuocDoan(p.G, p.E, p.D)).toBe(true);
    expect(dist(p.A, p.E)).toBeCloseTo(dist(p.E, p.G), 9);
    expect(dist(p.E, p.G)).toBeCloseTo(dist(p.G, p.D), 9);
  });

  it('"Trên cạnh AB lấy điểm M sao cho AM = 1/3 AB": AM/AB = 1/3', () => {
    const p = toaDoHinh('Cho tam giác ABC. Trên cạnh AB lấy điểm M sao cho AM = 1/3 AB.');
    expect(thuocDoan(p.M, p.A, p.B)).toBe(true);
    expect(dist(p.A, p.M) / dist(p.A, p.B)).toBeCloseTo(1 / 3, 9);
  });

  it.each([
    ['BM = MC/2', 'Cho tam giác ABC. Trên cạnh BC lấy điểm M sao cho BM = MC/2.', 'B', 'M', 'C', 1 / 3],
    ['MC = 2BM', 'Cho tam giác ABC. Trên cạnh BC lấy điểm M sao cho MC = 2BM.', 'B', 'M', 'C', 1 / 3],
    ['AG = 2/3 AM', 'Cho tam giác ABC có trung tuyến AM. Gọi G là điểm trên đoạn AM sao cho AG = 2/3 AM.', 'A', 'G', 'M', 2 / 3],
    ['chuỗi viết từ phía D "GD = EG = AE"', 'Cho tam giác ABC có trung tuyến AD. Trên đoạn thẳng AD lấy hai điểm E, G sao cho GD = EG = AE.', 'A', 'E', 'D', 1 / 3],
  ])('các dạng viết tỉ số (%s): điểm trong đoạn, đúng tỉ lệ', (_l, de, x, p, y, t) => {
    const q = toaDoHinh(de);
    expect(thuocDoan(q[p], q[x], q[y])).toBe(true);
    expect(dist(q[x], q[p]) / dist(q[x], q[y])).toBeCloseTo(t, 9);
  });

  it.each([
    ['trên TIA (hai vị trí)', 'Cho tam giác ABC. Trên tia BC lấy điểm M sao cho BM = 2MC.'],
    ['tổng hai đoạn', 'Cho tam giác ABC. Trên cạnh AB lấy điểm D sao cho AD = AB + AC.'],
    ['tỉ số ≥ cả đoạn', 'Cho tam giác ABC. Trên cạnh AB lấy điểm M sao cho AM = 2AB.'],
    ['bằng đoạn khác (việc của pointOnSideAtLength)', 'Cho tam giác ABC. Trên cạnh AB lấy điểm E sao cho AE = AC.'],
    ['điểm không được nêu trước "sao cho"', 'Cho tam giác ABC. Trên cạnh BC sao cho BM = 2MC.'],
  ])('bỏ qua (%s)', (_ly, de) => {
    expect(intentsOf(de)).toEqual([]);
  });
});
