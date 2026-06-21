import { orderIntents3dByDependency } from '../intentTopo3d';
import { solid, addPoint3d } from '../intent';

describe('orderIntents3dByDependency', () => {
  it('moves a midpoint after the solid that defines its refs', () => {
    const mid = addPoint3d('M', { kind: 'midpoint', p1: 'B', p2: 'C' });
    const sol = solid({
      flavor: 'pyramid',
      baseLabels: ['A', 'B', 'C', 'D'],
      baseVariant: 'square',
      apex: 'S',
      apexVariant: 'regular',
    });
    const out = orderIntents3dByDependency([mid, sol]);
    expect(out.indexOf(sol)).toBeLessThan(out.indexOf(mid));
  });

  it('keeps already-valid order stable', () => {
    const sol = solid({
      flavor: 'tetrahedron',
      baseLabels: ['A', 'B', 'C'],
      baseVariant: 'triangle',
      apex: 'D',
      apexVariant: 'regular',
    });
    const mid = addPoint3d('M', { kind: 'midpoint', p1: 'A', p2: 'B' });
    expect(orderIntents3dByDependency([sol, mid])).toEqual([sol, mid]);
  });
});
