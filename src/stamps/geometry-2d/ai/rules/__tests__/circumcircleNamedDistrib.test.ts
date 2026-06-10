import { circumcircleNamedDistribRule } from '../circumcircleNamedDistrib';
import { segmentClauses } from '../../deterministic/coverage';

const run = (p: string) => circumcircleNamedDistribRule.match({ problem: p, clauses: segmentClauses(p) });

describe('circumcircleNamedDistribRule', () => {
  it('"K, L lần lượt là đường tròn ngoại tiếp các tam giác BQF, CQE"', () => {
    const it = run('Gọi K, L lần lượt là đường tròn ngoại tiếp các tam giác BQF, CQE').flatMap((m) => m.intents) as any[];
    expect(it).toEqual([
      { op: 'draw-circle', name: 'K', spec: 'through3', points: ['B', 'Q', 'F'] },
      { op: 'draw-circle', name: 'L', spec: 'through3', points: ['C', 'Q', 'E'] },
    ]);
  });
});
