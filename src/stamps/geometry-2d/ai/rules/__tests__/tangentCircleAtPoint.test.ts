import { tangentCircleAtPointRule } from '../tangentCircleAtPoint';
import { segmentClauses } from '../../deterministic/coverage';

const run = (p: string) => tangentCircleAtPointRule.match({ problem: p, clauses: segmentClauses(p) });

describe('tangentCircleAtPointRule', () => {
  it('"Đường tròn (K) qua A và tiếp xúc với BC tại D ... cắt AC, AB tại E, F"', () => {
    const it = run('Đường tròn (K) qua A và tiếp xúc với BC tại D lần lượt cắt AC, AB tại E, F khác điểm A').flatMap((m) => m.intents) as any[];
    expect(it.find((i) => i.kind === 'perpThrough')).toMatchObject({ through: 'D', to: 'BC' });
    expect(it.find((i) => i.kind === 'perpBisector')).toMatchObject({ p1: 'A', p2: 'D' });
    expect(it.find((i) => i.name === 'K').constraint).toEqual({ kind: 'intersection', of: ['K_perp', 'K_pb'] });
    expect(it.find((i) => i.op === 'draw-circle')).toMatchObject({ name: 'K_c', spec: 'centerThrough', center: 'K', through: 'D' });
    const E = it.find((i) => i.name === 'E');
    const F = it.find((i) => i.name === 'F');
    expect(E.constraint).toEqual({ kind: 'secondIntersection', line: 'AC', circle: 'K_c', other: 'A' });
    expect(F.constraint).toEqual({ kind: 'secondIntersection', line: 'AB', circle: 'K_c', other: 'A' });
  });
});
