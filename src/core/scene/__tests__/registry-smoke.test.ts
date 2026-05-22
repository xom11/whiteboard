// src/core/scene/__tests__/registry-smoke.test.ts
import '../kinds';
import { listKinds } from '../registry';

describe('registry smoke (sau khi import barrel kinds)', () => {
  test('có đủ 30 kind (11 3D + 12 2D + 7 graph2d) đã đăng ký', () => {
    const types = listKinds().map(k => k.type).sort();
    expect(types).toEqual([
      'angle',
      'arc',
      'circle',
      'cone3d',
      'cylinder3d',
      'distance',
      'extremum2d',
      'function2d',
      'intersection',
      'line',
      'line3d',
      'parameter',
      'plane3d',
      'point',
      'point3d',
      'pointOnCurve',
      'polygon',
      'polygon3d',
      'polyhedron3d',
      'ray',
      'ray3d',
      'root2d',
      'sector',
      'segment',
      'segment3d',
      'slope2d',
      'sphere3d',
      'tangent2d',
      'vector',
      'vector3d',
    ]);
  });

  test('mọi kind có describe và dependsOn', () => {
    for (const def of listKinds()) {
      expect(typeof def.describe).toBe('function');
      expect(typeof def.dependsOn).toBe('function');
    }
  });
});
