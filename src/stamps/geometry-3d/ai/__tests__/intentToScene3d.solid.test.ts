import { intentToScene3d } from '../intentToScene3d';
import { solid, connect3d } from '../intent';

describe('intentToScene3d — solid', () => {
  it('square pyramid → 5 point3d + 1 polyhedron3d with 5 faces', () => {
    const state = intentToScene3d([
      solid({ flavor: 'pyramid', baseLabels: ['A', 'B', 'C', 'D'], baseVariant: 'square', apex: 'S', apexVariant: 'regular' }),
    ]);
    const objs = Object.values(state.objects);
    expect(objs.filter((o) => o.kind === 'point3d').length).toBe(5);
    const poly = objs.find((o) => o.kind === 'polyhedron3d') as any;
    expect(poly).toBeTruthy();
    expect(poly.attrs.flavor).toBe('pyramid');
    expect(poly.attrs.vertices.length).toBe(5);
    expect(poly.attrs.faces.length).toBe(5); // 1 base + 4 lateral
    expect(state.meta.domain).toBe('3d');
  });

  it('connect adds a segment3d between two existing points', () => {
    const state = intentToScene3d([
      solid({ flavor: 'tetrahedron', baseLabels: ['A', 'B', 'C'], baseVariant: 'equilateral-triangle', apex: 'D', apexVariant: 'regular' }),
      connect3d('A', 'D'),
    ]);
    const seg = Object.values(state.objects).find((o) => o.kind === 'segment3d') as any;
    expect(seg).toBeTruthy();
  });

  it('throws on connect to an unknown point', () => {
    expect(() => intentToScene3d([connect3d('X', 'Y')])).toThrow();
  });
});
