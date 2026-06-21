import { pointOnEdgeRule } from '../pointOnEdge';
import { segmentClauses3D } from '../../deterministic/coverage3d';

const run = (p: string) => pointOnEdgeRule.match({ problem: p, clauses: segmentClauses3D(p) });

describe('pointOnEdgeRule', () => {
  it('Lấy M trên AB → onSegmentEdge a=A b=B', () => {
    const i = run('Lấy điểm M trên AB.')[0].intents[0] as any;
    expect(i.name).toBe('M');
    expect(i.constraint).toMatchObject({ kind: 'onSegmentEdge', a: 'A', b: 'B' });
  });

  it('M ∈ SC → onSegmentEdge a=S b=C', () => {
    const i = run('M ∈ SC.')[0].intents[0] as any;
    expect(i.name).toBe('M');
    expect(i.constraint).toMatchObject({ a: 'S', b: 'C' });
  });

  it('distributive M, N lần lượt thuộc AB, AC', () => {
    const intents = run('M, N lần lượt thuộc AB, AC.').flatMap((m) => m.intents) as any[];
    expect(intents.map((i) => i.name).sort()).toEqual(['M', 'N']);
  });
});
