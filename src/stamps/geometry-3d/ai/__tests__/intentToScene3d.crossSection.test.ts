// __tests__/intentToScene3d.crossSection.test.ts
import { intentToScene3d } from '../intentToScene3d';
import { solid, addPoint3d, plane3d, crossSection3d } from '../intent';
import { constraintToWorld } from '../../../../core/scene/kinds/constraint3d-math';
import { planeFrame, signedDistance, type Vec3 } from '../crossSectionGeometry';

const pyramid = solid({ flavor:'pyramid', baseLabels:['A','B','C','D'], baseVariant:'square', apex:'S', apexVariant:'regular' });
const tetra   = solid({ flavor:'tetrahedron', baseLabels:['A','B','C'], baseVariant:'equilateral-triangle', apex:'D', apexVariant:'regular' });

function polys(state: any) {
  return Object.values(state.objects).filter((o: any) => o.kind === 'polygon3d') as any[];
}
function world(state: any, idOrLabel: string): Vec3 {
  const obj = state.objects[idOrLabel]
    ?? Object.values(state.objects).find((o: any) => o.label === idOrLabel);
  if (!obj) throw new Error(`object not found: ${idOrLabel}`);
  return constraintToWorld((obj as any).attrs.constraint, state) as Vec3;
}

describe('buildCrossSection', () => {
  it('plane (ABC) coincident with square base → section is the 4 base vertices (reused ids)', () => {
    const st = intentToScene3d([
      pyramid,
      plane3d('mp_ABC', { kind:'threePoints', p1:'A', p2:'B', p3:'C' }),
      crossSection3d({ plane:'mp_ABC' }),
    ]);
    const sec = polys(st);
    expect(sec.length).toBe(1);
    expect(sec[0].attrs.vertices.length).toBe(4);
    // every section vertex is an existing solid vertex (A,B,C,D) — no new point3d for these
    const labels = sec[0].attrs.vertices.map((id: string) => st.objects[id].label).sort();
    expect(labels).toEqual(['A','B','C','D']);
  });

  it('tetra cut by plane through 3 edge-midpoints → triangle of derived intersection points, all coplanar', () => {
    const st = intentToScene3d([
      tetra,
      addPoint3d('P', { kind:'midpoint', p1:'A', p2:'B' }),
      addPoint3d('Q', { kind:'midpoint', p1:'A', p2:'C' }),
      addPoint3d('R', { kind:'midpoint', p1:'A', p2:'D' }),
      plane3d('mp_PQR', { kind:'threePoints', p1:'P', p2:'Q', p3:'R' }),
      crossSection3d({ plane:'mp_PQR' }),
    ]);
    const sec = polys(st);
    expect(sec.length).toBe(1);
    expect(sec[0].attrs.vertices.length).toBe(3);
    // section vertices are derived intersectionLinePlane points (not the named midpoints)
    for (const id of sec[0].attrs.vertices) {
      expect(st.objects[id].attrs.constraint.kind).toBe('intersectionLinePlane');
    }
    // all coplanar with plane PQR
    const f = planeFrame(world(st,'P'), world(st,'Q'), world(st,'R'));
    for (const id of sec[0].attrs.vertices) {
      expect(Math.abs(signedDistance(world(st, id), f))).toBeLessThan(1e-6);
    }
  });

  it('fail-soft: plane that misses the solid → no polygon, no throw, figure still builds', () => {
    const st = intentToScene3d([
      pyramid,
      addPoint3d('U', { kind:'free', x:0,  y:0, z:10 }),
      addPoint3d('V', { kind:'free', x:1,  y:0, z:10 }),
      addPoint3d('W', { kind:'free', x:0,  y:1, z:10 }),
      plane3d('mp_far', { kind:'threePoints', p1:'U', p2:'V', p3:'W' }),
      crossSection3d({ plane:'mp_far' }),
    ]);
    expect(polys(st).length).toBe(0);
    expect(Object.values(st.objects).some((o:any)=>o.kind==='polyhedron3d')).toBe(true);
  });

  it('throws on unknown plane ref', () => {
    expect(() => intentToScene3d([pyramid, crossSection3d({ plane:'nope' })])).toThrow();
  });
});
