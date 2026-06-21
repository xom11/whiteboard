// __tests__/verify3d.crossSection.test.ts
import { verifyFigure3d } from '../verify3d';
import { intentToScene3d } from '../intentToScene3d';
import { solid, addPoint3d, plane3d, crossSection3d } from '../intent';
import { planeFrame, signedDistance } from '../crossSectionGeometry';
import { constraintToWorld, planeConstructionWorld } from '../../../../core/scene/kinds/constraint3d-math';

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

// FIX M2: polygon planarity uses cutting plane frame (not first-3-vertex heuristic)
it('FIX M2: pyramid quad cross-section planarity check passes using cutting plane frame', () => {
  // A pyramid cut at mid-height produces a 4-vertex polygon (intersectionLinePlane vertices).
  // The planarity check must use the cutting plane frame, not planeFrame(v[0],v[1],v[2]).
  // If first 3 vertices happened to be near-collinear the old code would produce a degenerate
  // normal → signedDistance of v[3] against it may be huge → spurious "đa giác không phẳng".
  // With the fix the well-defined cutting plane frame is used → check is correct.
  const st = intentToScene3d([
    solid({ flavor:'pyramid', baseLabels:['A','B','C','D'], baseVariant:'square', apex:'S', apexVariant:'regular' }),
    addPoint3d('M', { kind:'midpoint', p1:'S', p2:'A' }),
    addPoint3d('N', { kind:'midpoint', p1:'S', p2:'B' }),
    addPoint3d('O', { kind:'midpoint', p1:'S', p2:'C' }),
    plane3d('mp_MNO', { kind:'threePoints', p1:'M', p2:'N', p3:'O' }),
    crossSection3d({ plane:'mp_MNO' }),
  ]);
  // verify must pass: all section polygon vertices lie on the cutting plane
  const result = verifyFigure3d(st);
  expect(result.ok).toBe(true);

  // sanity: confirm at least one polygon3d with intersectionLinePlane vertices was built
  const polys = Object.values(st.objects).filter((o: any) => o.kind === 'polygon3d');
  expect(polys.length).toBeGreaterThanOrEqual(1);
  const polyVids = (polys[0] as any).attrs.vertices as string[];
  const hasILP = polyVids.some(
    (id) => (st.objects[id]?.attrs as any)?.constraint?.kind === 'intersectionLinePlane',
  );
  expect(hasILP).toBe(true);
});
