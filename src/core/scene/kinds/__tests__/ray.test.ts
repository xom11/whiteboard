// src/core/scene/kinds/__tests__/ray.test.ts
import '../ray';
import { getKind } from '../../registry';
import { mkObj } from './helpers';

describe('kinds/ray (2D)', () => {
  test('registered + schemaVersion 1', () => {
    expect(getKind('ray').schemaVersion).toBe(1);
  });

  test('validate throw thiếu origin/through', () => {
    const def = getKind('ray');
    expect(() => def.validate?.({ origin: '', through: 'b' } as never)).toThrow();
    expect(() => def.validate?.({ origin: 'a', through: '' } as never)).toThrow();
  });

  test('dependsOn = [origin, through]', () => {
    expect(getKind('ray').dependsOn({ origin: 'A', through: 'B' } as never))
      .toEqual(['A', 'B']);
  });

  test('describe', () => {
    const obj = mkObj('ray', 'r1', { origin: 'A', through: 'B' });
    expect(getKind('ray').describe(obj)).toMatch(/Tia|AB/);
  });
});
