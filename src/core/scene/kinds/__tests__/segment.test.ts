// src/core/scene/kinds/__tests__/segment.test.ts
import '../segment';
import { getKind } from '../../registry';
import { mkObj } from './helpers';

describe('kinds/segment (2D)', () => {
  test('registered', () => {
    expect(getKind('segment').schemaVersion).toBe(1);
  });

  test('validate throw nếu thiếu p1/p2', () => {
    const def = getKind('segment');
    expect(() => def.validate?.({ p1: '', p2: 'x' } as never)).toThrow();
    expect(() => def.validate?.({ p1: 'x', p2: '' } as never)).toThrow();
  });

  test('dependsOn = [p1, p2]', () => {
    const def = getKind('segment');
    expect(def.dependsOn({ p1: 'a', p2: 'b' } as never)).toEqual(['a', 'b']);
  });

  test('describe in nhãn 2 đầu', () => {
    const def = getKind('segment');
    const obj = mkObj('segment', 's1', { p1: 'A', p2: 'B' });
    expect(def.describe(obj)).toContain('A');
    expect(def.describe(obj)).toContain('B');
  });
});
