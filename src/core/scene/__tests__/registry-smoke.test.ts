// src/core/scene/__tests__/registry-smoke.test.ts
import '../kinds';
import { listKinds } from '../registry';

describe('registry smoke (sau khi import barrel kinds)', () => {
  test('có đủ 19 kind (11 3D + 8 2D) đã đăng ký', () => {
    const types = listKinds().map(k => k.type).sort();
    expect(types).toEqual([
      'circle',
      'cone3d',
      'cylinder3d',
      'intersection',
      'line',
      'line3d',
      'plane3d',
      'point',
      'point3d',
      'polygon',
      'polygon3d',
      'polyhedron3d',
      'ray',
      'ray3d',
      'segment',
      'segment3d',
      'sphere3d',
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
