// src/core/scene/kinds/__tests__/distance.test.ts
import '../distance';
import { getKind } from '../../registry';
import { mkObj } from './helpers';

describe('kinds/distance (2D)', () => {
  test('registered', () => {
    expect(getKind('distance').schemaVersion).toBe(1);
  });

  test('validate throw nếu thiếu p1/p2', () => {
    const def = getKind('distance');
    expect(() => def.validate?.({ p1: 'A' } as never)).toThrow();
    expect(() => def.validate?.({} as never)).toThrow();
  });

  test('validate OK với p1+p2', () => {
    const def = getKind('distance');
    expect(() => def.validate?.({ p1: 'A', p2: 'B' } as never)).not.toThrow();
  });

  test('dependsOn = [p1, p2]', () => {
    expect(getKind('distance').dependsOn({ p1: 'A', p2: 'B' } as never)).toEqual(['A', 'B']);
  });

  test('describe', () => {
    const obj = mkObj('distance', 'd1', { p1: 'A', p2: 'B' });
    expect(getKind('distance').describe(obj)).toMatch(/A.*B|khoảng cách|distance/i);
  });
});
