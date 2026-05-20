// src/core/scene/kinds/__tests__/polygon.test.ts
import '../polygon';
import { getKind } from '../../registry';
import { mkObj } from './helpers';

describe('kinds/polygon (2D)', () => {
  test('registered', () => {
    expect(getKind('polygon').schemaVersion).toBe(1);
  });

  test('validate throw nếu < 3 đỉnh', () => {
    const def = getKind('polygon');
    expect(() => def.validate?.({ vertices: ['A', 'B'] } as never)).toThrow(/3/);
    expect(() => def.validate?.({ vertices: [] } as never)).toThrow();
  });

  test('validate OK với 3+ đỉnh', () => {
    const def = getKind('polygon');
    expect(() => def.validate?.({ vertices: ['A', 'B', 'C'] } as never)).not.toThrow();
  });

  test('dependsOn = vertices', () => {
    expect(getKind('polygon').dependsOn({ vertices: ['A', 'B', 'C', 'D'] } as never))
      .toEqual(['A', 'B', 'C', 'D']);
  });

  test('describe in danh sách đỉnh', () => {
    const obj = mkObj('polygon', 'p1', { vertices: ['A', 'B', 'C'] });
    expect(getKind('polygon').describe(obj)).toContain('A');
    expect(getKind('polygon').describe(obj)).toContain('B');
    expect(getKind('polygon').describe(obj)).toContain('C');
  });

  describe('construction regular', () => {
    const def = getKind('polygon');

    test('validate cho phép omit vertices khi có construction regular', () => {
      expect(() => def.validate?.({
        construction: { kind: 'regular', p1: 'A', p2: 'B', n: 5 },
      } as never)).not.toThrow();
    });

    test('validate throw nếu n < 3', () => {
      expect(() => def.validate?.({
        construction: { kind: 'regular', p1: 'A', p2: 'B', n: 2 },
      } as never)).toThrow(/3/);
    });

    test('dependsOn regular → [p1, p2]', () => {
      expect(def.dependsOn({
        construction: { kind: 'regular', p1: 'A', p2: 'B', n: 6 },
      } as never)).toEqual(['A', 'B']);
    });

    test('describe regular ghi rõ số cạnh', () => {
      const obj = mkObj('polygon', 'rp1', { construction: { kind: 'regular', p1: 'A', p2: 'B', n: 5 } });
      expect(def.describe(obj)).toMatch(/5.*cạnh|đều/i);
    });
  });
});
