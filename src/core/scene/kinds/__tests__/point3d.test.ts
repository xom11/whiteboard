// src/core/scene/kinds/__tests__/point3d.test.ts
import '../point3d';
import { getKind, __clearRegistryForTests } from '../../registry';
import '../point3d';
import { mkObj } from './helpers';

describe('kinds/point3d', () => {
  test('đã đăng ký với registry', () => {
    const def = getKind('point3d');
    expect(def.schemaVersion).toBe(1);
  });

  test('validate throw nếu thiếu constraint', () => {
    const def = getKind('point3d');
    expect(() => def.validate?.({} as never)).toThrow(/constraint/);
  });

  test('dependsOn free → []', () => {
    const def = getKind('point3d');
    expect(def.dependsOn({ constraint: { kind: 'free', x: 0, y: 0, z: 0 } } as never))
      .toEqual([]);
  });

  test('dependsOn onPlane → [planeId]', () => {
    const def = getKind('point3d');
    expect(def.dependsOn({ constraint: { kind: 'onPlane', planeId: 'pl1', u: 0, v: 0 } } as never))
      .toEqual(['pl1']);
  });

  test('describe in toạ độ', () => {
    const def = getKind('point3d');
    const obj = mkObj('point3d', 'A', { constraint: { kind: 'free', x: 1, y: 2, z: 3 } });
    expect(def.describe(obj)).toMatch(/A.*1.*2.*3/);
  });
});
