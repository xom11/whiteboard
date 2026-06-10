import { perpAtPointCutsLineRule } from '../perpAtPointCutsLine';
import { segmentClauses } from '../../deterministic/coverage';

const run = (p: string) => perpAtPointCutsLineRule.match({ problem: p, clauses: segmentClauses(p) });

describe('perpAtPointCutsLineRule', () => {
  it('"Đường vuông góc với AB tại B cắt CD ở I" → perpThrough(B,AB) + I=giao', () => {
    const intents = run('Đường vuông góc với AB tại B cắt CD ở I').flatMap((m) => m.intents) as any[];
    const line = intents.find((i) => i.op === 'draw-line');
    expect(line).toMatchObject({ kind: 'perpThrough', through: 'B', to: 'AB' });
    const pt = intents.find((i) => i.op === 'add-point');
    expect(pt.name).toBe('I');
    expect(pt.constraint.kind).toBe('intersection');
    expect(pt.constraint.of).toEqual([line.name, 'CD']);
  });

  it('"Đường thẳng song song với MN tại P cắt AC tại Q" → parallelThrough', () => {
    const intents = run('Đường thẳng song song với MN tại P cắt AC tại Q').flatMap((m) => m.intents) as any[];
    expect(intents.find((i) => i.op === 'draw-line')).toMatchObject({ kind: 'parallelThrough', through: 'P', to: 'MN' });
  });

  it('không có "cắt" → không claim', () => {
    expect(run('Đường vuông góc với AB tại B').length).toBe(0);
  });
});
