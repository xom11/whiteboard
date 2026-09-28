/** @jest-environment jsdom */
import { perpFeetFromTwoRule } from '../perpFeetFromTwo';
import { segmentClauses } from '../../deterministic/coverage';
import { toaDoHinh, thuocDoan, type XY } from '../../__tests__/helpers/toaDoHinh';

beforeAll(() => {
  window.matchMedia ??= (() => ({ matches: false, addListener() {}, removeListener() {} })) as never;
});

const dot = (a: XY, b: XY, c: XY, d: XY) => (b[0] - a[0]) * (d[0] - c[0]) + (b[1] - a[1]) * (d[1] - c[1]);
const intentsOf = (de: string) => perpFeetFromTwoRule.match({ problem: de, clauses: segmentClauses(de) }).flatMap((m) => m.intents);

describe('perpFeetFromTwo — "Kẻ BD, CE lần lượt vuông góc với AC, AB"', () => {
  it('chân đường cao nằm trên cạnh đối (tam giác nhọn), BD ⊥ AC, CE ⊥ AB', () => {
    const p = toaDoHinh('Cho tam giác nhọn ABC. Vẽ BD, CE lần lượt vuông góc với AC, AB.');
    expect(thuocDoan(p.D, p.A, p.C)).toBe(true);
    expect(thuocDoan(p.E, p.A, p.B)).toBe(true);
    expect(dot(p.B, p.D, p.A, p.C)).toBeCloseTo(0, 9);
    expect(dot(p.C, p.E, p.A, p.B)).toBeCloseTo(0, 9);
  });

  it.each([
    ['cùng một gốc (việc của parallelPerp)', 'Cho tam giác ABC. Từ C kẻ CE, CF lần lượt vuông góc với AD, AB.'],
    ['"Từ X và Y" không khớp gốc đoạn', 'Cho tam giác ABC. Từ B và C kẻ CH, BK theo thứ tự vuông góc với AD và AE.'],
    ['chân nằm trong tên đường đích', 'Cho tam giác ABC. Kẻ BA, CE lần lượt vuông góc với AC, AB.'],
  ])('bỏ qua (%s)', (_ly, de) => {
    expect(intentsOf(de)).toEqual([]);
  });
});
