import { inExCircleTangentBCRule } from '../inExCircleTangentBC';
import { segmentClauses } from '../../deterministic/coverage';

const run = (p: string) => inExCircleTangentBCRule.match({ problem: p, clauses: segmentClauses(p) }).flatMap((m) => m.intents) as any[];

describe('inExCircleTangentBCRule', () => {
  it('"Đường tròn nội tiếp tam giác ABC có tâm I tiếp xúc với BC tại D"', () => {
    const it = run('Đường tròn nội tiếp tam giác ABC có tâm I tiếp xúc với BC tại D');
    expect(it.find((i) => i.name === 'I').constraint).toEqual({ kind: 'incenter', of: ['A', 'B', 'C'] });
    expect(it.find((i) => i.name === 'D').constraint).toEqual({ kind: 'perpFoot', from: 'I', onLine: 'BC' });
  });
  it('"Đường tròn bàng tiếp góc A ... có tâm J, tiếp xúc với BC tại E"', () => {
    const it = run('Đường tròn bàng tiếp góc A của tam giác ABC có tâm J, tiếp xúc với BC tại E');
    expect(it.find((i) => i.name === 'J').constraint).toEqual({ kind: 'excenter', of: ['A', 'B', 'C'], opposite: 'A' });
    expect(it.find((i) => i.name === 'E').constraint).toEqual({ kind: 'perpFoot', from: 'J', onLine: 'BC' });
  });
});
