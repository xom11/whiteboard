// src/core/scene/kinds/__tests__/line3d.test.ts
import '../line3d';
import { getKind } from '../../registry';
import { mkObj } from './helpers';

describe('kinds/line3d', () => {
  test('registered', () => { expect(getKind('line3d').schemaVersion).toBe(1); });
  test('dependsOn', () => {
    expect(getKind('line3d').dependsOn({ p1: 'a', p2: 'b' } as never)).toEqual(['a', 'b']);
  });
  test('describe', () => {
    const obj = mkObj('line3d', 'L', { p1: 'A', p2: 'B' });
    expect(getKind('line3d').describe(obj)).toMatch(/L|AB/);
  });
});
