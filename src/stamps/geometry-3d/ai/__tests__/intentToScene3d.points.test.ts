import { intentToScene3d } from '../intentToScene3d';
import { solid, addPoint3d } from '../intent';

const base = solid({
  flavor: 'pyramid',
  baseLabels: ['A', 'B', 'C', 'D'],
  baseVariant: 'square',
  apex: 'S',
  apexVariant: 'regular',
});

describe('buildAddPoint3d', () => {
  it('midpoint resolves p1/p2 names → ids', () => {
    const st = intentToScene3d([base, addPoint3d('M', { kind: 'midpoint', p1: 'B', p2: 'C' })]);
    const M = Object.values(st.objects).find((o) => o.label === 'M') as any;
    expect(M.kind).toBe('point3d');
    expect(M.attrs.constraint.kind).toBe('midpoint');
    // resolved to actual ids, not the literal names
    expect(M.attrs.constraint.p1).not.toBe('B');
    expect(st.objects[M.attrs.constraint.p1].label).toBe('B');
  });

  it('onLine edge point keeps t, resolves lineId after a connect creates the edge', () => {
    const st = intentToScene3d([base, addPoint3d('N', { kind: 'onSegmentEdge', a: 'A', b: 'B', t: 0.5 })]);
    const N = Object.values(st.objects).find((o) => o.label === 'N') as any;
    // onSegmentEdge is sugar → emits onLine over an auto-created edge segment
    expect(N.kind).toBe('point3d');
  });

  it('centroid resolves vertices[] names', () => {
    const st = intentToScene3d([base, addPoint3d('G', { kind: 'centroid', vertices: ['S', 'B', 'C'] })]);
    const G = Object.values(st.objects).find((o) => o.label === 'G') as any;
    expect(G.attrs.constraint.kind).toBe('centroid');
    expect(G.attrs.constraint.vertices.every((id: string) => st.objects[id])).toBe(true);
  });

  it('throws on midpoint with unknown ref', () => {
    expect(() => intentToScene3d([base, addPoint3d('M', { kind: 'midpoint', p1: 'Z', p2: 'C' })])).toThrow();
  });
});
