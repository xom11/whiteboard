// src/core/scene/kinds/__tests__/vector3d.test.ts
import '../vector3d';
import { getKind } from '../../registry';

describe('kinds/vector3d', () => {
  test('registered', () => { expect(getKind('vector3d').schemaVersion).toBe(1); });
  test('dependsOn = [from, to]', () => {
    expect(getKind('vector3d').dependsOn({ from: 'A', to: 'B' } as never)).toEqual(['A', 'B']);
  });
});
