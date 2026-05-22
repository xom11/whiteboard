// src/core/scene/kinds/__tests__/arc.test.ts
import '../arc';
import { getKind } from '../../registry';
import { mkObj } from './helpers';

describe('kinds/arc (2D)', () => {
  test('registered', () => {
    expect(getKind('arc').schemaVersion).toBe(1);
  });

  describe('semicircle construction', () => {
    const def = getKind('arc');

    test('validate ok khi có p1, p2', () => {
      expect(() => def.validate?.({
        construction: { kind: 'semicircle', p1: 'A', p2: 'B' },
      } as never)).not.toThrow();
    });

    test('validate throw khi thiếu p1/p2', () => {
      expect(() => def.validate?.({
        construction: { kind: 'semicircle', p1: '', p2: 'B' },
      } as never)).toThrow();
    });

    test('dependsOn = [p1, p2]', () => {
      expect(def.dependsOn({
        construction: { kind: 'semicircle', p1: 'A', p2: 'B' },
      } as never)).toEqual(['A', 'B']);
    });

    test('describe nửa đường tròn', () => {
      const obj = mkObj('arc', 'arc1', {
        construction: { kind: 'semicircle', p1: 'A', p2: 'B' },
      });
      expect(def.describe(obj)).toMatch(/nửa.*đường tròn|bán nguyệt/i);
    });
  });

  describe('byCenter construction', () => {
    const def = getKind('arc');

    test('validate ok khi có center, p1, p2', () => {
      expect(() => def.validate?.({
        construction: { kind: 'byCenter', center: 'O', p1: 'A', p2: 'B' },
      } as never)).not.toThrow();
    });

    test('dependsOn = [center, p1, p2]', () => {
      expect(def.dependsOn({
        construction: { kind: 'byCenter', center: 'O', p1: 'A', p2: 'B' },
      } as never)).toEqual(['O', 'A', 'B']);
    });

    test('describe cung tâm', () => {
      const obj = mkObj('arc', 'arc2', {
        construction: { kind: 'byCenter', center: 'O', p1: 'A', p2: 'B' },
      });
      expect(def.describe(obj)).toMatch(/cung.*tâm|tâm O/i);
    });
  });

  describe('by3Points construction', () => {
    const def = getKind('arc');

    test('dependsOn = [p1, p2, p3]', () => {
      expect(def.dependsOn({
        construction: { kind: 'by3Points', p1: 'A', p2: 'B', p3: 'C' },
      } as never)).toEqual(['A', 'B', 'C']);
    });

    test('describe cung qua 3 điểm', () => {
      const obj = mkObj('arc', 'arc3', {
        construction: { kind: 'by3Points', p1: 'A', p2: 'B', p3: 'C' },
      });
      expect(def.describe(obj)).toMatch(/cung.*qua/i);
    });

    test('validate throw khi thiếu p3', () => {
      expect(() => def.validate?.({
        construction: { kind: 'by3Points', p1: 'A', p2: 'B', p3: '' },
      } as never)).toThrow();
    });
  });
});
