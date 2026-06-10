import { circumcirclePairMeetRule } from '../circumcirclePairMeet';
import { segmentClauses } from '../../deterministic/coverage';

const run = (p: string) => circumcirclePairMeetRule.match({ problem: p, clauses: segmentClauses(p) });

describe('circumcirclePairMeetRule', () => {
  it('"đường tròn ngoại tiếp AME và đường tròn ngoại tiếp ANF cắt nhau tại Q khác A"', () => {
    const it = run('Đường tròn ngoại tiếp tam giác AME và đường tròn ngoại tiếp tam giác ANF cắt nhau tại Q khác A').flatMap((m) => m.intents) as any[];
    expect(it.filter((i) => i.op === 'draw-circle').map((i) => i.points)).toEqual([['A', 'M', 'E'], ['A', 'N', 'F']]);
    const q = it.find((i) => i.op === 'add-point');
    expect(q.name).toBe('Q');
    expect(q.constraint).toEqual({ kind: 'circleSecondIntersection', c1: 'wAME', c2: 'wANF', exclude: 'A' });
  });
});
