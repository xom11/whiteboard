import { hexagonRule } from '../hexagon';
import { segmentClauses } from '../../deterministic/coverage';
import { normalizeProblemText } from '../../deterministic/normalizeText';

// Harness giống pipeline: normalize → lọc clause hasGeometry → chạy rule.
function ints(text: string): any[] {
  const problem = normalizeProblemText(text);
  const clauses = segmentClauses(problem).filter((c) => c.hasGeometry);
  return hexagonRule.match({ problem, clauses }).flatMap((m) => m.intents);
}

function summary(text: string) {
  const all = ints(text);
  return {
    all,
    free: all.filter((i) => i.op === 'add-point' && i.constraint.kind === 'free'),
    circle: all.find((i) => i.op === 'draw-circle'),
    poly: all.find((i) => i.op === 'mark-shape'),
  };
}

describe('hexagonRule', () => {
  it('"Cho lục giác ABCDEF" (không đường tròn) → 6 đỉnh free + polygon, KHÔNG circle', () => {
    const { free, circle, poly } = summary('Cho lục giác ABCDEF.');
    expect(free.map((i) => i.name).sort()).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
    // 6 đỉnh phải ở 6 toạ độ phân biệt (không chồng).
    const coords = free.map((i) => JSON.stringify(i.constraint.at));
    expect(new Set(coords).size).toBe(6);
    expect(circle).toBeUndefined();
    expect(poly).toBeDefined();
    expect(poly.shape).toBe('polygon');
    expect(poly.labels).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
  });

  it('"lục giác ABCDEF ngoại tiếp (O)" → 6 đỉnh + đường tròn nội tiếp (O) + polygon', () => {
    const { all, free, circle, poly } = summary('Cho lục giác ABCDEF ngoại tiếp (O).');
    // 6 đỉnh là free; O là điểm PHÁI SINH (circumcenter), không free.
    expect(free.map((i) => i.name).sort()).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
    // Tâm O = circumcenter 3 đỉnh xen kẽ (A,C,E) → tâm lục giác đều ⟹ đồng tâm
    // với đường tròn nội tiếp + cùng component layout (không bị tách rời).
    const O = all.find((i) => i.op === 'add-point' && i.name === 'O');
    expect(O).toBeDefined();
    expect(O.constraint.kind).toBe('circumcenter');
    expect(O.constraint.of).toEqual(['A', 'C', 'E']);
    // Đường tròn (O) = NỘI tiếp: centerRadius, tâm O, bán kính = apothem < bán
    // kính ngoại tiếp các đỉnh (R·cos30°).
    expect(circle).toBeDefined();
    expect(circle.spec).toBe('centerRadius');
    expect(circle.center).toBe('O');
    const R = Math.hypot(free.find((i) => i.name === 'A').constraint.at[0], free.find((i) => i.name === 'A').constraint.at[1]);
    expect(circle.radius).toBeGreaterThan(0);
    expect(circle.radius).toBeLessThan(R); // apothem < circumradius
    expect(poly.labels).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
  });

  it('"đường tròn (O) nội tiếp lục giác ABCDEF" (Pattern B) → vẫn vẽ circle nội tiếp', () => {
    const { circle, poly } = summary('Cho đường tròn (O) nội tiếp lục giác ABCDEF.');
    expect(circle).toBeDefined();
    expect(circle.center).toBe('O');
    expect(poly.labels).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
  });

  it('KHÔNG match khi không phải 6 đỉnh HOA liền (vd 5 đỉnh "ABCDE")', () => {
    const { all } = summary('Cho lục giác ABCDE.');
    expect(all.length).toBe(0);
  });

  it('KHÔNG match "tứ giác ABCD" / "tam giác ABC" (để rule khác xử)', () => {
    expect(ints('Cho tứ giác ABCD nội tiếp (O).')).toEqual([]);
    expect(ints('Cho tam giác ABC.')).toEqual([]);
  });

  it('emit theo thứ tự: tâm O + 6 đỉnh free TRƯỚC circle, polygon CUỐI', () => {
    const { all } = summary('Cho lục giác ABCDEF ngoại tiếp (O).');
    const circleIdx = all.findIndex((i) => i.op === 'draw-circle');
    const polyIdx = all.findIndex((i) => i.op === 'mark-shape');
    const lastFree = all.map((i) => i.op).lastIndexOf('add-point');
    expect(circleIdx).toBeGreaterThan(0);
    expect(polyIdx).toBe(all.length - 1);
    expect(lastFree).toBeLessThan(polyIdx);
  });
});
