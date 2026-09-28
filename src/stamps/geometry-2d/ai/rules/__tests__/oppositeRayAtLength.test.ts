/** @jest-environment jsdom */
import { toaDoHinh, dist, type XY } from '../../__tests__/helpers/toaDoHinh';
import { oppositeRayAtLengthRule } from '../oppositeRayAtLength';
import { segmentClauses } from '../../deterministic/coverage';

beforeAll(() => {
  window.matchMedia ??= (() => ({ matches: false, addListener() {}, removeListener() {} })) as never;
});

/** P trên tia đối của tia XY: X nằm giữa Y và P. */
const tiaDoi = (p: XY, x: XY, y: XY) => Math.abs(dist(y, x) + dist(x, p) - dist(y, p)) < 1e-9;

// Trước đây oppositeRayPoint đặt điểm cách gốc 2,5 đơn vị cố định — đúng đề chỉ khi tình cờ.
describe('oppositeRayAtLength — điểm trên tia đối ĐÚNG độ dài đề cho (đề thật)', () => {
  it('lop8 #22: "Trên tia đối của tia FH lấy điểm M sao cho FH = FM" (vế đảo)', () => {
    const p = toaDoHinh('Cho tam giác ABC vuông tại A, đường cao AH. Kẻ HE vuông góc với AB tại E và HF vuông góc với AC tại F. Trên tia đối của tia FH lấy điểm M sao cho FH = FM. Trên tia đối của tia EH lấy điểm N sao cho EH = EN.');
    expect(tiaDoi(p.M, p.F, p.H)).toBe(true);
    expect(dist(p.F, p.M)).toBeCloseTo(dist(p.F, p.H), 9);
    expect(tiaDoi(p.N, p.E, p.H)).toBe(true);
    expect(dist(p.E, p.N)).toBeCloseTo(dist(p.E, p.H), 9);
  });

  it('hinh-phang #98: hệ số "AD = 2AB", "AE = 2AC"', () => {
    const p = toaDoHinh('Cho tam giác ABC. Trên tia đối của tia AB lấy điểm D sao cho AD = 2AB. Trên tia đối của tia AC lấy điểm E sao cho AE = 2AC.');
    expect(tiaDoi(p.D, p.A, p.B)).toBe(true);
    expect(dist(p.A, p.D)).toBeCloseTo(2 * dist(p.A, p.B), 9);
    expect(dist(p.A, p.E)).toBeCloseTo(2 * dist(p.A, p.C), 9);
  });

  it('hinh-phang #25: mốc là đoạn khác "BM = CN" (N trên tia đối tia CB)', () => {
    const p = toaDoHinh('Cho tam giác ABC cân tại A. Lấy điểm M trên cạnh BC. Trên tia đối của tia CB lấy điểm N sao cho BM = CN.');
    expect(tiaDoi(p.N, p.C, p.B)).toBe(true);
    expect(dist(p.C, p.N)).toBeCloseTo(dist(p.B, p.M), 9);
  });

  it.each([
    ['tổng hai đoạn', 'Cho tam giác ABC. Trên tia đối của tia AB lấy điểm D sao cho AD = AB + AC.'],
    ['vế không chứa gốc tia', 'Cho tam giác ABC. Trên tia đối của tia AB lấy điểm D sao cho BD = AC.'],
  ])('bỏ qua (%s)', (_l, de) => {
    expect(oppositeRayAtLengthRule.match({ problem: de, clauses: segmentClauses(de) })).toEqual([]);
  });
});
