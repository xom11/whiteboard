// src/core/scene/kinds/__tests__/circle.test.ts
import '../circle';
import { getKind } from '../../registry';
import { mkObj } from './helpers';

describe('kinds/circle (2D)', () => {
  test('registered', () => {
    expect(getKind('circle').schemaVersion).toBe(1);
  });

  test('validate throw thiếu center/surfacePoint', () => {
    const def = getKind('circle');
    expect(() => def.validate?.({ center: '', surfacePoint: 'b' } as never)).toThrow();
    expect(() => def.validate?.({ center: 'a', surfacePoint: '' } as never)).toThrow();
  });

  test('dependsOn = [center, surfacePoint]', () => {
    expect(getKind('circle').dependsOn({ center: 'O', surfacePoint: 'A' } as never))
      .toEqual(['O', 'A']);
  });

  test('describe', () => {
    const obj = mkObj('circle', 'c1', { center: 'O', surfacePoint: 'A' });
    expect(getKind('circle').describe(obj)).toMatch(/đường tròn|O.*A/i);
  });
});
