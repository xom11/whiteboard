import { planeNamedRule } from '../planeNamed';
import { segmentClauses3D } from '../../deterministic/coverage3d';

const run = (p: string) => planeNamedRule.match({ problem: p, clauses: segmentClauses3D(p) });

describe('planeNamedRule', () => {
  it('mặt phẳng (MNP) → threePoints plane', () => {
    const i = run('Xét mặt phẳng (MNP).')[0].intents[0] as any;
    expect(i.op).toBe('plane');
    expect(i.name).toBe('mp_MNP');
    expect(i.spec).toMatchObject({ kind: 'threePoints', p1: 'M', p2: 'N', p3: 'P' });
  });

  it('giao tuyến của (SBC) và (SBD) → two planes', () => {
    const intents = run('Tìm giao tuyến của (SBC) và (SBD).').flatMap((m) => m.intents) as any[];
    expect(intents.length).toBe(2);
    const names = intents.map((i) => i.name);
    expect(names).toContain('mp_SBC');
    expect(names).toContain('mp_SBD');
  });

  it('deduplicates same plane token', () => {
    const intents = run('Tìm giao tuyến của (SBC) và (SBC).').flatMap((m) => m.intents);
    const names = intents.map((i: any) => i.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
