import { getKindUiMeta, KIND_UI_META } from '../kindMeta';

describe('kindMeta', () => {
  it('returns metadata for known kind', () => {
    const meta = getKindUiMeta('point');
    expect(meta.displayName).toBe('Điểm');
    expect(meta.icon).toBe('·');
  });

  it('returns metadata for 3D variant', () => {
    const meta = getKindUiMeta('plane3d');
    expect(meta.displayName).toBe('Mặt phẳng');
  });

  it('returns fallback for unknown kind', () => {
    const meta = getKindUiMeta('unknown-kind');
    expect(meta.displayName).toBe('unknown-kind');
    expect(meta.icon).toBe('?');
  });

  it('has entries for all 26 registered kinds', () => {
    const kinds = [
      'point', 'segment', 'line', 'ray', 'vector', 'circle', 'polygon', 'intersection',
      'point3d', 'segment3d', 'line3d', 'ray3d', 'vector3d', 'plane3d',
      'polygon3d', 'sphere3d', 'polyhedron3d', 'cylinder3d', 'cone3d',
      'function2d', 'parameter', 'pointOnCurve', 'tangent2d', 'extremum2d', 'root2d', 'slope2d',
    ];
    for (const k of kinds) {
      expect(KIND_UI_META[k]).toBeDefined();
      expect(KIND_UI_META[k].displayName.length).toBeGreaterThan(0);
    }
  });
});
