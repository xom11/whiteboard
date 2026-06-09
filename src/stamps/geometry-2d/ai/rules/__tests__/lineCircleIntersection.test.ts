import { lineCircleIntersectionRule } from '../lineCircleIntersection';
import { segmentClauses } from '../../deterministic/coverage';

function run(problem: string) {
  return lineCircleIntersectionRule.match({ problem, clauses: segmentClauses(problem) });
}

describe('lineCircleIntersectionRule', () => {
  it('Bài 1: AD, BE, CF cắt đường tròn (O) lần lượt tại M,N,P', () => {
    const m = run(
      'Các đường cao AD, BE, CF cắt nhau tại H và cắt đường tròn (O) lần lượt tại M, N, P',
    );
    const intents = m.flatMap((x) => x.intents) as any[];
    expect(intents).toEqual([
      { op: 'add-point', name: 'M', constraint: { kind: 'secondIntersection', line: 'AD', circle: 'O', other: 'A' } },
      { op: 'add-point', name: 'N', constraint: { kind: 'secondIntersection', line: 'BE', circle: 'O', other: 'B' } },
      { op: 'add-point', name: 'P', constraint: { kind: 'secondIntersection', line: 'CF', circle: 'O', other: 'C' } },
    ]);
  });

  it('single: CM cắt (O) tại N → secondIntersection line CM circle O other C', () => {
    const m = run('CM cắt (O) tại N');
    expect(m.flatMap((x) => x.intents)).toEqual([
      { op: 'add-point', name: 'N', constraint: { kind: 'secondIntersection', line: 'CM', circle: 'O', other: 'C' } },
    ]);
  });

  it('không nhận nếu điểm giao trùng đầu mút line', () => {
    expect(run('AB cắt (O) tại A')).toEqual([]);
  });
}
