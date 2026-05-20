// src/core/scene/kinds/__tests__/cylinder3d.test.ts
import '../cylinder3d';
import { getKind } from '../../registry';

describe('kinds/cylinder3d', () => {
  test('registered', () => { expect(getKind('cylinder3d').schemaVersion).toBe(1); });
  test('dependsOn = [base, top]', () => {
    expect(getKind('cylinder3d').dependsOn({ baseCenter: 'B', topCenter: 'T', radius: 1 } as never))
      .toEqual(['B', 'T']);
  });
  test('validate throw nếu radius <= 0', () => {
    expect(() => getKind('cylinder3d').validate?.({ baseCenter: 'B', topCenter: 'T', radius: 0 } as never)).toThrow();
  });
});
