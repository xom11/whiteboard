// src/core/scene/kinds/__tests__/polyhedron3d.test.ts
import '../polyhedron3d';
import { getKind } from '../../registry';

describe('kinds/polyhedron3d', () => {
  test('registered', () => { expect(getKind('polyhedron3d').schemaVersion).toBe(1); });
  test('dependsOn trả về vertices', () => {
    expect(getKind('polyhedron3d').dependsOn({
      flavor: 'pyramid', vertices: ['a', 'b', 'c', 'd'], faces: [],
    } as never)).toEqual(['a', 'b', 'c', 'd']);
  });
  test('describe ghi flavor', () => {
    const obj: any = {
      id: 'h', kind: 'polyhedron3d', label: 'H', visible: true, locked: false, layer: 'default',
      schemaVersion: 1,
      attrs: { flavor: 'cube', vertices: ['a','b','c','d','e','f','g','h'], faces: [] },
    };
    expect(getKind('polyhedron3d').describe(obj)).toMatch(/Khối/);
  });
});
