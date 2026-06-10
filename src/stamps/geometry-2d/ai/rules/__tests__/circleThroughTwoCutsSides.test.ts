import { circleThroughTwoCutsSidesRule } from '../circleThroughTwoCutsSides';
import { segmentClauses } from '../../deterministic/coverage';

const run = (p: string) => circleThroughTwoCutsSidesRule.match({ problem: p, clauses: segmentClauses(p) });

describe('circleThroughTwoCutsSidesRule', () => {
  it('"Đường tròn (I) luôn đi qua B và C cắt AB, AC lần lượt tại M, N"', () => {
    const it = run('Đường tròn (I) luôn đi qua B và C cắt AB, AC lần lượt tại M, N').flatMap((m) => m.intents) as any[];
    expect(it.find((i) => i.constraint?.kind === 'onPerpBisector')).toMatchObject({ name: 'I', constraint: { p1: 'B', p2: 'C' } });
    expect(it.find((i) => i.op === 'draw-circle')).toMatchObject({ name: 'I_c', spec: 'centerThrough', center: 'I', through: 'B' });
    const M = it.find((i) => i.name === 'M');
    const N = it.find((i) => i.name === 'N');
    expect(M.constraint).toEqual({ kind: 'secondIntersection', line: 'AB', circle: 'I_c', other: 'B' });
    expect(N.constraint).toEqual({ kind: 'secondIntersection', line: 'AC', circle: 'I_c', other: 'C' });
  });

  it('cạnh không chứa đúng 1 điểm-qua → bỏ qua (escalate)', () => {
    // "cắt DE, DF" — D,E,F không chứa B/C → other không xác định.
    expect(run('Đường tròn (I) qua B và C cắt DE, DF tại M, N').length).toBe(0);
  });
});
