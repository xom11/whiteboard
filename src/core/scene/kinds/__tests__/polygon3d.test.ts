// src/core/scene/kinds/__tests__/polygon3d.test.ts
import '../polygon3d';
import { getKind } from '../../registry';

describe('kinds/polygon3d', () => {
  test('registered', () => { expect(getKind('polygon3d').schemaVersion).toBe(1); });
  test('dependsOn trả về toàn bộ vertices', () => {
    expect(getKind('polygon3d').dependsOn({ vertices: ['a', 'b', 'c', 'd'] } as never))
      .toEqual(['a', 'b', 'c', 'd']);
  });
  test('validate throw nếu < 3 vertices', () => {
    expect(() => getKind('polygon3d').validate?.({ vertices: ['a', 'b'] } as never)).toThrow(/3/);
  });
});
