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

  describe('construction discriminator', () => {
    const def = getKind('circle');

    test('validate cho phép omit center/surfacePoint khi có construction', () => {
      expect(() => def.validate?.({
        construction: { kind: 'circumscribed', p1: 'A', p2: 'B', p3: 'C' },
      } as never)).not.toThrow();
    });

    test('dependsOn circumscribed = [p1, p2, p3]', () => {
      expect(def.dependsOn({
        construction: { kind: 'circumscribed', p1: 'A', p2: 'B', p3: 'C' },
      } as never)).toEqual(['A', 'B', 'C']);
    });

    test('describe circumscribed', () => {
      const obj = mkObj('circle', 'cc1', {
        construction: { kind: 'circumscribed', p1: 'A', p2: 'B', p3: 'C' },
      });
      expect(def.describe(obj)).toMatch(/qua ABC/);
    });
  });
});
