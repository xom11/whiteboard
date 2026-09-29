/** @jest-environment jsdom */
import { namedLinesMeetRule } from '../namedLinesMeet';
import { segmentClauses } from '../../deterministic/coverage';
import { toaDoHinh, type XY } from '../../__tests__/helpers/toaDoHinh';

beforeAll(() => {
  window.matchMedia ??= (() => ({ matches: false, addListener() {}, removeListener() {} })) as never;
});

const cross = (a: XY, b: XY, c: XY, d: XY) => (b[0] - a[0]) * (d[1] - c[1]) - (b[1] - a[1]) * (d[0] - c[0]);
const dot = (a: XY, b: XY, c: XY, d: XY) => (b[0] - a[0]) * (d[0] - c[0]) + (b[1] - a[1]) * (d[1] - c[1]);

describe('namedLinesMeet — giao hai đường thẳng đặt tên (d, d\')', () => {
  it('hinh-phang #42: P = d ∩ d\' với d // AC qua B, d\' // AB qua C ⇒ BP // AC, CP // AB, BM ⊥ BP', () => {
    const p = toaDoHinh("Cho tam giác đều ABC. Qua B kẻ đường thẳng d // AC và hạ BM ⊥ AC (M ∈ AC). Qua C kẻ đường thẳng d' // AB và hạ CN ⊥ AB (N ∈ AB). Hai đường thẳng d và d' cắt nhau tại P.");
    expect(Math.abs(cross(p.B, p.P, p.A, p.C))).toBeLessThan(1e-9);
    expect(Math.abs(cross(p.C, p.P, p.A, p.B))).toBeLessThan(1e-9);
    expect(dot(p.B, p.M, p.B, p.P)).toBeCloseTo(0, 9);
  });

  it('bỏ qua cùng một tên đường', () => {
    const de = 'Hai đường thẳng d và d cắt nhau tại P.';
    expect(namedLinesMeetRule.match({ problem: de, clauses: segmentClauses(de) })).toEqual([]);
  });
});
