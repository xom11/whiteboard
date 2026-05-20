// src/core/scene/kinds/__tests__/line.test.ts
import '../line';
import { getKind } from '../../registry';
import { mkObj } from './helpers';

describe('kinds/line (2D)', () => {
  test('registered', () => {
    expect(getKind('line').schemaVersion).toBe(1);
  });

  test('validate throw nếu thiếu p1/p2', () => {
    const def = getKind('line');
    expect(() => def.validate?.({ p1: 'a' } as never)).toThrow();
  });

  test('dependsOn = [p1, p2]', () => {
    expect(getKind('line').dependsOn({ p1: 'a', p2: 'b' } as never)).toEqual(['a', 'b']);
  });

  test('describe', () => {
    const obj = mkObj('line', 'l1', { p1: 'A', p2: 'B' });
    expect(getKind('line').describe(obj)).toMatch(/Đường|AB/);
  });
});
