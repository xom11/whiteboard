import { perpLineCutsTangentRule } from '../perpLineCutsTangent';
import { segmentClauses } from '../../deterministic/coverage';

function intents(problem: string) {
  return perpLineCutsTangentRule
    .match({ problem, clauses: segmentClauses(problem) })
    .flatMap((m) => m.intents as any[]);
}

describe('perpLineCutsTangentRule', () => {
  const P =
    'Cho đường tròn (O) bán kính R. Đường thẳng vuông góc với AB tại M cắt tiếp tuyến tại N của đường tròn ở P.';

  it('emits perpThrough M⊥AB + tangent at N + P=intersection', () => {
    const all = intents(P);
    expect(all).toContainEqual({
      op: 'draw-line',
      name: 'prpM',
      kind: 'perpThrough',
      through: 'M',
      to: 'AB',
    });
    expect(all).toContainEqual({
      op: 'draw-line',
      name: 'tN',
      kind: 'tangentAt',
      through: 'N',
      circle: 'O',
    });
    expect(all).toContainEqual({
      op: 'add-point',
      name: 'P',
      constraint: { kind: 'intersection', of: ['prpM', 'tN'] },
    });
  });

  it('fail-safe: không có đường tròn → không khớp', () => {
    expect(
      intents('Đường thẳng vuông góc với AB tại M cắt tiếp tuyến tại N ở P.'),
    ).toEqual([]);
  });
});
