// src/core/scene/__tests__/registry-smoke.test.ts
import '../kinds';
import { listKinds } from '../registry';

describe('registry smoke (sau khi import barrel kinds)', () => {
  test('có đủ 11 kind 3D đã đăng ký', () => {
    const types = listKinds().map(k => k.type).sort();
    expect(types).toEqual([
      'cone3d',
      'cylinder3d',
      'line3d',
      'plane3d',
      'point3d',
      'polygon3d',
      'polyhedron3d',
      'ray3d',
      'segment3d',
      'sphere3d',
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
