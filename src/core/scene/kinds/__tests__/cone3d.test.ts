// src/core/scene/kinds/__tests__/cone3d.test.ts
import '../cone3d';
import { getKind } from '../../registry';

describe('kinds/cone3d', () => {
  test('registered', () => { expect(getKind('cone3d').schemaVersion).toBe(1); });
  test('dependsOn = [base, apex]', () => {
    expect(getKind('cone3d').dependsOn({ baseCenter: 'B', apex: 'A', radius: 1 } as never))
      .toEqual(['B', 'A']);
  });
});
