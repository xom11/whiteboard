import { parallelCutsTangentAtRule } from '../parallelCutsTangentAt';
import { interiorPointRule } from '../interiorPoint';
import { segmentClauses } from '../../deterministic/coverage';

describe('parallelCutsTangentAtRule', () => {
  it('"qua E song song với AC cắt tiếp tuyến tại C của (O) tại M"', () => {
    const P = 'Cho (O). Đường thẳng qua E song song với AC cắt tiếp tuyến tại C của (O) tại M';
    const it = parallelCutsTangentAtRule.match({ problem: P, clauses: segmentClauses(P) }).flatMap((m) => m.intents) as any[];
    expect(it.find((i) => i.kind === 'parallelThrough')).toMatchObject({ through: 'E', to: 'AC' });
    expect(it.find((i) => i.kind === 'tangentAt')).toMatchObject({ through: 'C', circle: 'O' });
    expect(it.find((i) => i.name === 'M').constraint).toEqual({ kind: 'intersection', of: ['parE', 'tC'] });
  });
});

describe('interiorPointRule', () => {
  const run = (p: string) => interiorPointRule.match({ problem: p, clauses: segmentClauses(p) }).flatMap((m) => m.intents) as any[];
  it('"P là một điểm nằm trong tam giác ABC" → free P', () => {
    expect(run('P là một điểm nằm trong tam giác ABC')[0]).toMatchObject({ op: 'add-point', name: 'P', constraint: { kind: 'free' } });
  });
  it('không claim khi "trên đường tròn" (onCircle giữ)', () => {
    expect(run('P là điểm nằm trên đường tròn ngoại tiếp tam giác HBC và nằm trong tam giác ABC')).toHaveLength(0);
  });
});
