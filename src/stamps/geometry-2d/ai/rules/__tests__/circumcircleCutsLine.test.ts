import { circumcircleCutsLineRule } from '../circumcircleCutsLine';
import { segmentClauses } from '../../deterministic/coverage';

const run = (p: string) => circumcircleCutsLineRule.match({ problem: p, clauses: segmentClauses(p) });

describe('circumcircleCutsLineRule', () => {
  it('Bài 92: "Đường tròn ngoại tiếp tam giác HBC cắt BI tại K khác B"', () => {
    const it = run('Đường tròn ngoại tiếp tam giác HBC cắt BI tại K khác B').flatMap((m) => m.intents) as any[];
    expect(it.find((i) => i.op === 'draw-circle')).toMatchObject({ name: 'wHBC', spec: 'through3', points: ['H', 'B', 'C'] });
    const k = it.find((i) => i.op === 'add-point');
    expect(k.name).toBe('K');
    expect(k.constraint).toEqual({ kind: 'secondIntersection', line: 'BI', circle: 'wHBC', other: 'B' });
  });

  it('điểm chung suy từ đầu mút line ∈ tam giác (không "khác")', () => {
    const it = run('Đường tròn ngoại tiếp tam giác ABE cắt AC tại P').flatMap((m) => m.intents) as any[];
    expect((it.find((i) => i.op === 'add-point') as any).constraint.other).toBe('A');
  });

  it('fail-safe: K trùng đầu mút line → 0 match', () => {
    expect(run('Đường tròn ngoại tiếp tam giác ABE cắt AC tại A')).toEqual([]);
  });
});
