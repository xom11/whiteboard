// src/core/scene/kinds/__tests__/plane3d.test.ts
import '../plane3d';
import { getKind } from '../../registry';

describe('kinds/plane3d', () => {
  test('registered', () => { expect(getKind('plane3d').schemaVersion).toBe(1); });
  test('dependsOn = [p1, p2, p3]', () => {
    expect(getKind('plane3d').dependsOn({ p1: 'a', p2: 'b', p3: 'c' } as never)).toEqual(['a', 'b', 'c']);
  });
  test('validate throw nếu thiếu', () => {
    expect(() => getKind('plane3d').validate?.({ p1: 'a', p2: 'b' } as never)).toThrow();
  });
});
