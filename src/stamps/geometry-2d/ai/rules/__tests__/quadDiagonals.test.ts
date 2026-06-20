import { quadDiagonalsRule } from '../quadDiagonals';
import { segmentClauses } from '../../deterministic/coverage';
import { tryDeterministicFigure } from '../../deterministic/tryDeterministicFigure';

function intents(problem: string) {
  return quadDiagonalsRule
    .match({ problem, clauses: segmentClauses(problem) })
    .flatMap((m) => m.intents as any[]);
}

describe('quadDiagonalsRule', () => {
  it('"ABCD là tứ giác với các đường chéo AC và BD … cắt nhau tại E" → quad + 2 chéo + E', () => {
    const all = intents('Cho ABCD là tứ giác với các đường chéo AC và BD vuông góc và cắt nhau tại E.');
    expect(all).toContainEqual({ op: 'draw-shape', shape: 'quadrilateral', labels: ['A', 'B', 'C', 'D'], variant: 'any' });
    expect(all.find((i) => i.name === 'E')?.constraint).toEqual({ kind: 'intersection', of: ['AC', 'BD'] });
    expect(all.filter((i) => i.op === 'connect')).toHaveLength(2);
  });

  it('không có đường chéo vẫn vẽ tứ giác', () => {
    const all = intents('Cho ABCD là một tứ giác.');
    expect(all).toContainEqual({ op: 'draw-shape', shape: 'quadrilateral', labels: ['A', 'B', 'C', 'D'], variant: 'any' });
    expect(all.find((i) => i.op === 'add-point')).toBeUndefined();
  });

  it('end-to-end: hình hợp lệ A,B,C,D,E', () => {
    const r = tryDeterministicFigure('Cho ABCD là tứ giác với các đường chéo AC và BD vuông góc và cắt nhau tại E.');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const names = (r as any).figure.dsl.points.map((p: any) => p.name);
    expect(names).toEqual(expect.arrayContaining(['A', 'B', 'C', 'D', 'E']));
  });
});
