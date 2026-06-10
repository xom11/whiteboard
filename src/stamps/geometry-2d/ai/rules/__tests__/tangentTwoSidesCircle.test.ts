import { tangentTwoSidesCircleRule } from '../tangentTwoSidesCircle';
import { mixtilinearPoint } from '../../../../../core/scene/kinds/pointConstructions';
import { segmentClauses } from '../../deterministic/coverage';

const run = (p: string) => tangentTwoSidesCircleRule.match({ problem: p, clauses: segmentClauses(p) });

describe('tangentTwoSidesCircleRule (mixtilinear)', () => {
  it('"Đường tròn K tiếp xúc với CA, AB tại E, F và tiếp xúc trong với (O) tại S"', () => {
    const it = run('Đường tròn K tiếp xúc với CA, AB lần lượt tại E, F và tiếp xúc trong với (O) tại S').flatMap((m) => m.intents) as any[];
    const center = it.find((i) => i.constraint?.kind === 'mixtilinearPoint' && i.constraint.which === 'center');
    expect(center.name).toBe('K');
    expect(center.constraint.of).toEqual(['A', 'C', 'B']); // apex A (chung của CA,AB)
    expect(it.find((i) => i.name === 'S').constraint).toMatchObject({ kind: 'mixtilinearPoint', which: 'touch' });
    expect(it.find((i) => i.name === 'E').constraint).toEqual({ kind: 'perpFoot', from: 'K', onLine: 'CA' });
    expect(it.find((i) => i.op === 'draw-circle')).toMatchObject({ name: 'K_c', spec: 'centerThrough' });
  });
});

describe('mixtilinearPoint math', () => {
  it('tâm cách đều 2 cạnh + tiếp xúc trong (|OK|=R-r)', () => {
    const A: [number, number] = [0, 5], B: [number, number] = [-4, -3], C: [number, number] = [3, -4];
    const K = mixtilinearPoint(A, B, C, 'center');
    const dl = (P: number[], U: number[], V: number[]) => {
      const dx = V[0] - U[0], dy = V[1] - U[1];
      return Math.abs((dx * (U[1] - P[1]) - (U[0] - P[0]) * dy) / Math.hypot(dx, dy));
    };
    expect(dl(K, A, B)).toBeCloseTo(dl(K, A, C), 6); // tiếp xúc cả 2 cạnh
  });
});
