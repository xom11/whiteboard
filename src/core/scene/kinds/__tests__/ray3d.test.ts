// src/core/scene/kinds/__tests__/ray3d.test.ts
import '../ray3d';
import { getKind } from '../../registry';

describe('kinds/ray3d', () => {
  test('registered', () => { expect(getKind('ray3d').schemaVersion).toBe(1); });
  test('dependsOn = [origin, through]', () => {
    expect(getKind('ray3d').dependsOn({ origin: 'O', through: 'T' } as never)).toEqual(['O', 'T']);
  });
  test('validate', () => {
    expect(() => getKind('ray3d').validate?.({ origin: '', through: 'T' } as never)).toThrow();
  });
});
