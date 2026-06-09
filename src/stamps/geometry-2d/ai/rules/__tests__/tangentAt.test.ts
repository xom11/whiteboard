import { tangentAtRule } from '../tangentAt';
import { segmentClauses } from '../../deterministic/coverage';

function intents(problem: string) {
  return tangentAtRule
    .match({ problem, clauses: segmentClauses(problem) })
    .flatMap((m) => m.intents as any[]);
}

describe('tangentAtRule', () => {
  it('distributed tangents at M intersect tangents at A/B at C/D', () => {
    const all = intents(
      'Cho nửa đường tròn (O) đường kính AB. Tiếp tuyến tại M cắt tiếp tuyến tại A và B của đường tròn (O) lần lượt tại C và D',
    );
    expect(all).toEqual([
      { op: 'draw-line', name: 'tM', kind: 'tangentAt', through: 'M', circle: 'O_c' },
      { op: 'draw-line', name: 'tA', kind: 'tangentAt', through: 'A', circle: 'O_c' },
      { op: 'draw-line', name: 'tB', kind: 'tangentAt', through: 'B', circle: 'O_c' },
      { op: 'add-point', name: 'C', constraint: { kind: 'intersection', of: ['tM', 'tA'] } },
      { op: 'add-point', name: 'D', constraint: { kind: 'intersection', of: ['tM', 'tB'] } },
    ]);
  });

  it('single tangent at B of circle (O)', () => {
    const all = intents('Cho đường tròn (O) đường kính AB. Tiếp tuyến tại B của đường tròn (O)');
    expect(all).toContainEqual({
      op: 'draw-line',
      name: 'tB',
      kind: 'tangentAt',
      through: 'B',
      circle: 'O_c',
    });
  });

  it('không có circle rõ ràng → không claim', () => {
    expect(intents('Tiếp tuyến tại B cắt AB tại C')).toEqual([]);
  });
});
