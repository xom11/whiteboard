import { linePlanePointRule } from '../linePlanePoint';
import { segmentClauses3D } from '../../deterministic/coverage3d';

const run = (p: string) => linePlanePointRule.match({ problem: p, clauses: segmentClauses3D(p) });

describe('linePlanePointRule', () => {
  it('"giao điểm I của MN với (BCD)" → named intersectionLinePlane point + plane', () => {
    const intents = run('Tìm giao điểm I của MN với (BCD).').flatMap((m) => m.intents) as any[];
    const pt = intents.find((i) => i.op === 'add-point-3d');
    expect(pt).toMatchObject({ name: 'I', constraint: { kind: 'intersectionLinePlane', a: 'M', b: 'N', plane: 'mp_BCD' } });
    expect(intents.find((i) => i.op === 'plane')).toMatchObject({ name: 'mp_BCD', spec: { kind: 'threePoints', p1: 'B', p2: 'C', p3: 'D' } });
  });

  it('unnamed "giao điểm của MN với (BCD)" → synth name gp_MN', () => {
    const pt = run('giao điểm của MN với (BCD)').flatMap((m) => m.intents).find((i: any) => i.op === 'add-point-3d') as any;
    expect(pt.name).toBe('gp_MN');
  });

  it('sentence-initial capital "Giao điểm của MN với (BCD)" is matched ([Gg]iao fix)', () => {
    const intents = run('Giao điểm của MN với (BCD).').flatMap((m) => m.intents) as any[];
    const pt = intents.find((i) => i.op === 'add-point-3d');
    expect(pt).toMatchObject({ name: 'gp_MN', constraint: { kind: 'intersectionLinePlane', a: 'M', b: 'N', plane: 'mp_BCD' } });
  });

  it('lowercase line labels "giao điểm của mn với (BCD)" do NOT match — [A-Z] stays strict', () => {
    expect(run('giao điểm của mn với (BCD)')).toEqual([]);
  });
});
