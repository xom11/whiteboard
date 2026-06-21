// __tests__/verify3d.crossSection.test.ts
import { verifyFigure3d } from '../verify3d';
import { intentToScene3d } from '../intentToScene3d';
import { solid, addPoint3d, plane3d, crossSection3d } from '../intent';

it('a valid tetra section passes verify', () => {
  const st = intentToScene3d([
    solid({ flavor:'tetrahedron', baseLabels:['A','B','C'], baseVariant:'equilateral-triangle', apex:'D', apexVariant:'regular' }),
    addPoint3d('P', { kind:'midpoint', p1:'A', p2:'B' }),
    addPoint3d('Q', { kind:'midpoint', p1:'A', p2:'C' }),
    addPoint3d('R', { kind:'midpoint', p1:'A', p2:'D' }),
    plane3d('mp_PQR', { kind:'threePoints', p1:'P', p2:'Q', p3:'R' }),
    crossSection3d({ plane:'mp_PQR' }),
  ]);
  expect(verifyFigure3d(st).ok).toBe(true);
});

it('flags an intersectionLinePlane point fabricated off its plane', () => {
  // hand-build a bad state: an intersectionLinePlane point whose edge does not cross the plane.
  const st = intentToScene3d([
    solid({ flavor:'tetrahedron', baseLabels:['A','B','C'], baseVariant:'equilateral-triangle', apex:'D', apexVariant:'regular' }),
    plane3d('mp_ABC', { kind:'threePoints', p1:'A', p2:'B', p3:'C' }),
    // edge A-B lies IN plane ABC → t degenerate; use D-A which crosses, this should be fine,
    // so instead force an off-edge by referencing a non-crossing same-side pair handled below.
    addPoint3d('Z', { kind:'intersectionLinePlane', a:'A', b:'B', plane:'mp_ABC' }),
  ]);
  // A,B are both ON plane ABC → t = 0/0 → non-finite OR off-plane; verify must flag it.
  expect(verifyFigure3d(st).ok).toBe(false);
});
