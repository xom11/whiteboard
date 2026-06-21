import { angleLinePlaneRule } from '../angleLinePlane';
import { segmentClauses3D } from '../../deterministic/coverage3d';

const run = (p: string) => angleLinePlaneRule.match({ problem: p, clauses: segmentClauses3D(p) });
const flat = (p: string) => run(p).flatMap((m) => m.intents) as any[];

describe('angleLinePlaneRule', () => {
  it('"góc giữa SC và đáy" → apex-foot + projection triangle', () => {
    const I = flat('Cho hình chóp S.ABCD. Góc giữa SC và mặt đáy bằng 60°.');
    const pt = I.find((i) => i.op === 'add-point-3d');
    expect(pt).toMatchObject({ name: 'H_S', constraint: { kind: 'perpFootPlane', from: 'S', plane: 'mp_ABC' } });
    const connects = I.filter((i) => i.op === 'connect').map((i) => [i.from, i.to].sort().join(''));
    expect(connects).toEqual(expect.arrayContaining([['S', 'H_S'].sort().join(''), ['H_S', 'C'].sort().join(''), ['S', 'C'].sort().join('')]));
  });

  it('"SC tạo với đáy một góc" also matches', () => {
    const I = flat('Cho hình chóp S.ABC. SC tạo với mặt đáy một góc 45°.');
    expect(I.find((i) => i.op === 'add-point-3d')).toMatchObject({ constraint: { from: 'S', kind: 'perpFootPlane' } });
  });

  it('does NOT fire for two base vertices (no apex endpoint)', () => {
    expect(run('Cho hình chóp S.ABCD. Góc giữa AB và đáy.')).toEqual([]);
  });

  it('does NOT fire for dihedral "góc giữa hai mặt phẳng"', () => {
    expect(run('Cho hình chóp S.ABCD. Góc giữa hai mặt phẳng (SBC) và (ABCD).')).toEqual([]);
  });
});

import { intentToScene3d } from '../../intentToScene3d';
import { solid } from '../../intent';

it('projection triangle builds: apex-foot point + 3 segments, no throw', () => {
  const prob = 'Cho hình chóp S.ABCD. Góc giữa SC và mặt đáy bằng 60°.';
  const solidIntent = solid({
    flavor: 'pyramid', baseLabels: ['A', 'B', 'C', 'D'], baseVariant: 'square',
    apex: 'S', apexVariant: 'regular',
  });
  const I = [solidIntent, ...flat(prob)];
  const st: any = intentToScene3d(I as any);
  expect(Object.values(st.objects).some((o: any) => o.kind === 'point3d' && o.label === 'H_S')).toBe(true);
  expect(Object.values(st.objects).filter((o: any) => o.kind === 'segment3d').length).toBeGreaterThanOrEqual(3);
});
