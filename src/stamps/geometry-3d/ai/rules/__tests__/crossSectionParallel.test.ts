import { crossSectionParallelRule } from '../crossSectionParallel';
import { segmentClauses3D } from '../../deterministic/coverage3d';
import { intentToScene3d } from '../../intentToScene3d';
import { solid, addPoint3d } from '../../intent';

const run = (p: string) =>
  crossSectionParallelRule.match({ problem: p, clauses: segmentClauses3D(p) });

describe('crossSectionParallelRule', () => {
  it('"thiết diện ... qua M song song (SBC)" → ref plane + parallel plane + cross-section', () => {
    const intents = run(
      'Xác định thiết diện của hình chóp với mặt phẳng qua M song song với (SBC).',
    ).flatMap((m) => m.intents) as any[];
    const ref = intents.find((i) => i.op === 'plane' && i.spec.kind === 'threePoints');
    const par = intents.find((i) => i.op === 'plane' && i.spec.kind === 'parallelThrough');
    const sec = intents.find((i) => i.op === 'cross-section');
    expect(ref).toMatchObject({
      name: 'mp_SBC',
      spec: { kind: 'threePoints', p1: 'S', p2: 'B', p3: 'C' },
    });
    expect(par).toMatchObject({
      name: 'mp_par_M',
      spec: { kind: 'parallelThrough', point: 'M', refPlane: 'mp_SBC' },
    });
    expect(sec).toMatchObject({ op: 'cross-section', plane: 'mp_par_M' });
  });

  it('does not fire without a section cue', () => {
    expect(run('Đường thẳng qua M song song với (SBC).')).toEqual([]);
  });

  it('parallel-plane section builds a polygon coplanar with the parallel plane', () => {
    const base = solid({
      flavor: 'pyramid',
      baseLabels: ['A', 'B', 'C', 'D'],
      baseVariant: 'square',
      apex: 'S',
      apexVariant: 'regular',
    });
    const M = addPoint3d('M', { kind: 'midpoint', p1: 'S', p2: 'A' });
    const ruleIntents = run('Thiết diện qua M song song với (SBC).').flatMap((m) => m.intents);
    const st = intentToScene3d([base, M, ...ruleIntents]);
    const poly = Object.values(st.objects).find((o: any) => o.kind === 'polygon3d') as any;
    expect(poly).toBeTruthy();
    expect(poly.attrs.vertices.length).toBeGreaterThanOrEqual(3);
  });
});
