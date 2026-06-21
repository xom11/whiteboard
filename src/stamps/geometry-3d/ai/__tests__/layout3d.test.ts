// __tests__/layout3d.test.ts
import { solidLayout } from '../layout3d';

const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;

describe('solidLayout', () => {
  it('square pyramid: 4 coplanar base verts at z=0 + apex above centroid', () => {
    const L = solidLayout({ flavor:'pyramid', baseLabels:['A','B','C','D'], baseVariant:'square', apex:'S', apexVariant:'regular' });
    expect(L.vertexOrder).toEqual(['A','B','C','D','S']);
    for (const v of ['A','B','C','D']) expect(near(L.coords[v][2], 0)).toBe(true);
    expect(L.coords['S'][2]).toBeGreaterThan(0.5);
    // centroid of square base ~ origin → apex x,y ~ 0
    expect(near(L.coords['S'][0], 0)).toBe(true);
    expect(near(L.coords['S'][1], 0)).toBe(true);
    // base ring face present
    expect(L.faces).toContainEqual([0,1,2,3]);
  });
  it('over-vertex apex sits directly above the named vertex', () => {
    const L = solidLayout({ flavor:'pyramid', baseLabels:['A','B','C','D'], baseVariant:'square', apex:'S', apexVariant:'over-vertex', apexAnchor:'A' });
    expect(near(L.coords['S'][0], L.coords['A'][0])).toBe(true);
    expect(near(L.coords['S'][1], L.coords['A'][1])).toBe(true);
    expect(L.coords['S'][2]).toBeGreaterThan(0.5);
  });
  it('tetrahedron: 4 vertices, 4 triangular faces', () => {
    const L = solidLayout({ flavor:'tetrahedron', baseLabels:['A','B','C'], baseVariant:'equilateral-triangle', apex:'D', apexVariant:'regular' });
    expect(L.vertexOrder.length).toBe(4);
    expect(L.faces.length).toBe(4);
    L.faces.forEach((f) => expect(f.length).toBe(3));
  });
  it('triangular prism: 6 vertices, top face translated +z', () => {
    const L = solidLayout({ flavor:'prism', baseLabels:['A','B','C'], baseVariant:'triangle', apexVariant:'free', topLabels:['A1','B1','C1'] });
    expect(L.vertexOrder.length).toBe(6);
    expect(near(L.coords['A'][2], 0)).toBe(true);
    expect(L.coords['A1'][2]).toBeGreaterThan(0.5);
  });
});
