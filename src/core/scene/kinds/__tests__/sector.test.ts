// src/core/scene/kinds/__tests__/sector.test.ts
import '../sector';
import { getKind } from '../../registry';
import { mkObj } from './helpers';

describe('kinds/sector (2D)', () => {
  test('registered', () => {
    expect(getKind('sector').schemaVersion).toBe(1);
  });

  test('validate ok byCenter', () => {
    const def = getKind('sector');
    expect(() => def.validate?.({
      construction: { kind: 'byCenter', center: 'O', p1: 'A', p2: 'B' },
    } as never)).not.toThrow();
  });

  test('validate throw khi thiếu refs', () => {
    const def = getKind('sector');
    expect(() => def.validate?.({
      construction: { kind: 'byCenter', center: '', p1: 'A', p2: 'B' },
    } as never)).toThrow();
  });

  test('dependsOn = [center, p1, p2]', () => {
    expect(getKind('sector').dependsOn({
      construction: { kind: 'byCenter', center: 'O', p1: 'A', p2: 'B' },
    } as never)).toEqual(['O', 'A', 'B']);
  });

  test('describe hình quạt', () => {
    const obj = mkObj('sector', 's1', {
      construction: { kind: 'byCenter', center: 'O', p1: 'A', p2: 'B' },
    });
    expect(getKind('sector').describe(obj)).toMatch(/quạt|hình quạt/i);
  });
});
