// src/core/scene/kinds/__tests__/sphere3d.test.ts
import '../sphere3d';
import { getKind } from '../../registry';

describe('kinds/sphere3d', () => {
  test('registered', () => { expect(getKind('sphere3d').schemaVersion).toBe(1); });
  test('dependsOn = [center, surfacePoint]', () => {
    expect(getKind('sphere3d').dependsOn({ center: 'O', surfacePoint: 'P' } as never))
      .toEqual(['O', 'P']);
  });
});
