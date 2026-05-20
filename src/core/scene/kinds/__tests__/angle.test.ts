// src/core/scene/kinds/__tests__/angle.test.ts
import '../angle';
import { getKind } from '../../registry';
import { mkObj } from './helpers';

describe('kinds/angle (2D)', () => {
  test('registered', () => {
    expect(getKind('angle').schemaVersion).toBe(1);
  });

  test('validate throw nếu thiếu refs', () => {
    const def = getKind('angle');
    expect(() => def.validate?.({ p1: 'A', vertex: 'B' } as never)).toThrow();
    expect(() => def.validate?.({ vertex: 'B', p2: 'C' } as never)).toThrow();
    expect(() => def.validate?.({} as never)).toThrow();
  });

  test('validate OK với p1/vertex/p2', () => {
    const def = getKind('angle');
    expect(() => def.validate?.({ p1: 'A', vertex: 'B', p2: 'C' } as never)).not.toThrow();
  });

  test('dependsOn = [p1, vertex, p2]', () => {
    expect(getKind('angle').dependsOn({ p1: 'A', vertex: 'B', p2: 'C' } as never))
      .toEqual(['A', 'B', 'C']);
  });

  test('describe', () => {
    const obj = mkObj('angle', 'a1', { p1: 'A', vertex: 'B', p2: 'C' });
    expect(getKind('angle').describe(obj)).toMatch(/A.*B.*C|góc/i);
  });
});
