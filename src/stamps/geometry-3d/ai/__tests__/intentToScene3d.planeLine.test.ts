import { intentToScene3d } from '../intentToScene3d';
import { solid, plane3d, line3dIntent } from '../intent';

const base = solid({
  flavor: 'pyramid',
  baseLabels: ['A', 'B', 'C', 'D'],
  baseVariant: 'square',
  apex: 'S',
  apexVariant: 'regular',
});

describe('plane + line builders', () => {
  it('threePoints plane resolves p1/p2/p3 → ids', () => {
    const st = intentToScene3d([base, plane3d('mpSBC', { kind: 'threePoints', p1: 'S', p2: 'B', p3: 'C' })]);
    const pl = Object.values(st.objects).find((o) => o.kind === 'plane3d') as any;
    expect(pl).toBeTruthy();
    expect(st.objects[pl.attrs.p1].label).toBe('S');
  });

  it('giao tuyến → line3d with planePlaneIntersection construction', () => {
    const st = intentToScene3d([
      base,
      plane3d('mp1', { kind: 'threePoints', p1: 'S', p2: 'B', p3: 'C' }),
      plane3d('mp2', { kind: 'threePoints', p1: 'S', p2: 'A', p3: 'D' }),
      line3dIntent({ name: 'd', kind: 'planePlaneIntersection', plane1: 'mp1', plane2: 'mp2' }),
    ]);
    const ln = Object.values(st.objects).find((o) => o.kind === 'line3d' && (o.attrs as any).construction) as any;
    expect(ln.attrs.construction.kind).toBe('planePlaneIntersection');
    expect(st.objects[ln.attrs.construction.plane1].label).toBe('mp1');
  });
});
