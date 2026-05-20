// src/core/scene/kinds/__tests__/vector.test.ts
import '../vector';
import { getKind } from '../../registry';
import { mkObj } from './helpers';

describe('kinds/vector (2D)', () => {
  test('registered', () => {
    expect(getKind('vector').schemaVersion).toBe(1);
  });

  test('validate throw thiếu from/to', () => {
    const def = getKind('vector');
    expect(() => def.validate?.({ from: '', to: 'b' } as never)).toThrow();
  });

  test('dependsOn = [from, to]', () => {
    expect(getKind('vector').dependsOn({ from: 'A', to: 'B' } as never))
      .toEqual(['A', 'B']);
  });

  test('describe', () => {
    const obj = mkObj('vector', 'v1', { from: 'A', to: 'B' });
    expect(getKind('vector').describe(obj)).toMatch(/AB|vector/i);
  });
});
