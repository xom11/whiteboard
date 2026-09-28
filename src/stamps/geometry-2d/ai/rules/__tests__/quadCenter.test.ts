/** @jest-environment jsdom */
// "hình bình hành ABCD tâm O" / "lục giác đều ABCDEF tâm O": tâm phải CÓ trên hình và
// đúng là tâm (trung điểm hai đường chéo / cách đều 6 đỉnh) — đo bằng JSXGraph thật.
import { toaDoHinh, dist } from '../../__tests__/helpers/toaDoHinh';
import { tryDeterministicFigure } from '../../deterministic/tryDeterministicFigure';
import { allNamedEntitiesPresent } from '../../deterministic/guards';

beforeAll(() => {
  window.matchMedia ??= (() => ({ matches: false, addListener() {}, removeListener() {} })) as never;
});

describe('tâm hình bình hành / vuông / chữ nhật / thoi / lục giác đều', () => {
  it.each([
    'Cho hình bình hành ABCD tâm O. Chứng minh vectơ OA + vectơ OC = vectơ 0.',
    'Cho hình vuông ABCD có tâm O, cạnh a.',
    'Cho hình chữ nhật ABCD tâm O.',
    'Cho hình thoi ABCD tâm O.',
  ])('%s → O là trung điểm AC và BD', (de) => {
    const p = toaDoHinh(de);
    expect(p.O[0]).toBeCloseTo((p.A[0] + p.C[0]) / 2, 9);
    expect(p.O[1]).toBeCloseTo((p.A[1] + p.C[1]) / 2, 9);
    expect(p.O[0]).toBeCloseTo((p.B[0] + p.D[0]) / 2, 9);
    expect(p.O[1]).toBeCloseTo((p.B[1] + p.D[1]) / 2, 9);
  });

  it('lục giác đều ABCDEF tâm O → O cách đều 6 đỉnh, OA = AB', () => {
    const p = toaDoHinh('Cho lục giác đều ABCDEF tâm O. Chứng minh vectơ OA + vectơ OC + vectơ OE = vectơ 0.');
    // hexagon.ts làm tròn toạ độ đỉnh 4 chữ số ⇒ so tới 1e-4.
    const r = dist(p.O, p.A);
    for (const v of ['B', 'C', 'D', 'E', 'F']) expect(dist(p.O, p[v])).toBeCloseTo(r, 4);
    expect(dist(p.A, p.B)).toBeCloseTo(r, 4);
  });

  it('guard: "tâm O" là tên được giới thiệu — thiếu O thì KHÔNG được coi là đủ hình', () => {
    const r = tryDeterministicFigure('Cho hình vuông ABCD cạnh a.');
    if (!r.ok) throw new Error(r.reason);
    expect(allNamedEntitiesPresent('Cho hình vuông ABCD tâm O cạnh a.', r.figure.dsl).missing).toEqual(['O']);
  });
});
