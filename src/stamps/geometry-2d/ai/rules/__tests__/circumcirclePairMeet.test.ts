import { circumcirclePairMeetRule } from '../circumcirclePairMeet';
import { segmentClauses } from '../../deterministic/coverage';

const run = (p: string) => circumcirclePairMeetRule.match({ problem: p, clauses: segmentClauses(p) });

describe('circumcirclePairMeetRule', () => {
  it('Bài 25: "...tam giác BEI cắt đường tròn ngoại tiếp tam giác CDI tại K khác I" (dạng X cắt Y)', () => {
    const it = run('Đường tròn ngoại tiếp tam giác BEI cắt đường tròn ngoại tiếp tam giác CDI tại K khác I').flatMap((m) => m.intents) as any[];
    expect(it.filter((i) => i.op === 'draw-circle').map((i) => i.points)).toEqual([['B', 'E', 'I'], ['C', 'D', 'I']]);
    const k = it.find((i) => i.op === 'add-point');
    expect(k.name).toBe('K');
    expect(k.constraint).toEqual({ kind: 'circleSecondIntersection', c1: 'wBEI', c2: 'wCDI', exclude: 'I' });
  });

  it('Bài 24: "...tam giác BCE cắt đường tròn ngoại tiếp tam giác CDF tại M" (điểm chung suy từ đỉnh)', () => {
    const it = run('Đường tròn ngoại tiếp tam giác BCE cắt đường tròn ngoại tiếp tam giác CDF tại M').flatMap((m) => m.intents) as any[];
    const m = it.find((i) => i.op === 'add-point');
    expect(m.name).toBe('M');
    expect(m.constraint.exclude).toBe('C'); // đỉnh chung BCE ∩ CDF = C
  });

  it('"đường tròn ngoại tiếp AME và đường tròn ngoại tiếp ANF cắt nhau tại Q khác A"', () => {
    const it = run('Đường tròn ngoại tiếp tam giác AME và đường tròn ngoại tiếp tam giác ANF cắt nhau tại Q khác A').flatMap((m) => m.intents) as any[];
    expect(it.filter((i) => i.op === 'draw-circle').map((i) => i.points)).toEqual([['A', 'M', 'E'], ['A', 'N', 'F']]);
    const q = it.find((i) => i.op === 'add-point');
    expect(q.name).toBe('Q');
    expect(q.constraint).toEqual({ kind: 'circleSecondIntersection', c1: 'wAME', c2: 'wANF', exclude: 'A' });
  });
});
