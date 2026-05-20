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
});
