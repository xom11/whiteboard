import { collinearPointsRule } from '../collinearPoints';
import { segmentClauses } from '../../deterministic/coverage';
import { tryDeterministicFigure } from '../../deterministic/tryDeterministicFigure';

function intents(problem: string) {
  return collinearPointsRule
    .match({ problem, clauses: segmentClauses(problem) })
    .flatMap((m) => m.intents as any[]);
}

describe('collinearPointsRule', () => {
  it('"Cho 4 điểm A, B, C, D cùng thuộc một đường thẳng" → đầu/cuối free, giữa onSegment', () => {
    const all = intents('Cho 4 điểm A, B, C, D cùng thuộc một đường thẳng.');
    expect(all.find((i) => i.name === 'A')?.constraint.kind).toBe('free');
    expect(all.find((i) => i.name === 'D')?.constraint.kind).toBe('free');
    expect(all.find((i) => i.name === 'B')?.constraint).toMatchObject({ kind: 'onSegment', of: 'AD' });
    expect(all.find((i) => i.name === 'C')?.constraint).toMatchObject({ kind: 'onSegment', of: 'AD' });
  });

  it('"Cho ba điểm A, B, C thẳng hàng" → 3 điểm', () => {
    const all = intents('Cho ba điểm A, B, C thẳng hàng.');
    expect(all.filter((i) => i.op === 'add-point').map((i) => i.name).sort()).toEqual(['A', 'B', 'C']);
  });

  it('end-to-end: hình hợp lệ với 4 điểm', () => {
    const r = tryDeterministicFigure('Cho 4 điểm A, B, C, D cùng thuộc một đường thẳng.');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const names = (r as any).figure.dsl.points.map((p: any) => p.name);
    expect(names).toEqual(expect.arrayContaining(['A', 'B', 'C', 'D']));
  });

  it('bỏ qua khi <3 điểm', () => {
    expect(intents('Cho 2 điểm A, B thuộc một đường thẳng.')).toHaveLength(0);
  });
});
