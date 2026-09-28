/** @jest-environment jsdom */
// Điểm affine Σ wᵢ·Pᵢ (đẳng thức vectơ ≥ 3 điểm, đỉnh thứ tư hình bình hành) — đo
// trên hình JSXGraph thật + khứ hồi scene → DSL (serialize) không mất điểm.
import { toaDoHinh, type XY } from '../../__tests__/helpers/toaDoHinh';
import { tryDeterministicFigure } from '../../deterministic/tryDeterministicFigure';
import { serializeState } from '../../../dsl/serialize';

beforeAll(() => {
  window.matchMedia ??= (() => ({ matches: false, addListener() {}, removeListener() {} })) as never;
});

const tong = (ws: [number, XY][]): XY => [
  ws.reduce((s, [w, p]) => s + w * p[0], 0),
  ws.reduce((s, [w, p]) => s + w * p[1], 0),
];
function khop(p: XY, q: XY) {
  expect(p[0]).toBeCloseTo(q[0], 9);
  expect(p[1]).toBeCloseTo(q[1], 9);
}

describe('điểm affine', () => {
  it('"vectơ MA + vectơ MB + 2 vectơ MC = vectơ 0" ⇒ M = (A + B + 2C)/4', () => {
    const p = toaDoHinh('Cho tam giác ABC. Gọi M là điểm thỏa mãn vectơ MA + vectơ MB + 2 vectơ MC = vectơ 0.');
    khop(p.M, tong([[0.25, p.A], [0.25, p.B], [0.5, p.C]]));
  });

  it('"vectơ AD = vectơ BC" ⇒ ABCD là hình bình hành (D = A + C − B)', () => {
    const p = toaDoHinh('Cho tam giác ABC. Gọi D là điểm thỏa mãn vectơ AD = vectơ BC.');
    khop(p.D, tong([[1, p.A], [1, p.C], [-1, p.B]]));
  });

  it('"vectơ AM = vectơ AB + vectơ AC" ⇒ M = B + C − A', () => {
    const p = toaDoHinh('Cho tam giác ABC. Gọi M là điểm thỏa mãn vectơ AM = vectơ AB + vectơ AC.');
    khop(p.M, tong([[1, p.B], [1, p.C], [-1, p.A]]));
  });

  it('"Gọi D là điểm sao cho ABCD là hình bình hành": trung điểm AC ≡ trung điểm BD, có vẽ tứ giác', () => {
    const de = 'Cho tam giác ABC. Gọi D là điểm sao cho ABCD là hình bình hành.';
    const p = toaDoHinh(de);
    khop(tong([[0.5, p.A], [0.5, p.C]]), tong([[0.5, p.B], [0.5, p.D]]));
    const r = tryDeterministicFigure(de);
    if (!r.ok) throw new Error(r.reason);
    expect(r.figure.dsl.shapes.some((s) => s.kind === 'polygon' && (s as { vertices: string[] }).vertices.join('') === 'ABCD')).toBe(true);
  });

  it('đỉnh giữa tên hình: "Dựng điểm E sao cho tứ giác ABEC là hình bình hành" ⇒ E = B + C − A', () => {
    const p = toaDoHinh('Cho tam giác ABC. Dựng điểm E sao cho tứ giác ABEC là hình bình hành.');
    khop(p.E, tong([[1, p.B], [1, p.C], [-1, p.A]]));
  });

  it('khứ hồi scene → DSL giữ điểm affine', () => {
    const r = tryDeterministicFigure('Cho tam giác ABC. Gọi D là điểm thỏa mãn vectơ AD = vectơ BC.');
    if (!r.ok) throw new Error(r.reason);
    const { dsl, unsupported } = serializeState(r.figure.transpile.state);
    expect(unsupported).toEqual([]);
    const d = dsl.points.find((q) => q.name === 'D') as { kind: string; points: string[]; weights: number[] };
    expect(d.kind).toBe('affine');
    expect(d.weights.reduce((s, w) => s + w, 0)).toBeCloseTo(1, 12);
  });
});
