// src/core/scene/kinds/__tests__/intersection.test.ts
import '../intersection';
import { getKind } from '../../registry';
import { mkObj } from './helpers';

describe('kinds/intersection (2D)', () => {
  test('registered', () => {
    expect(getKind('intersection').schemaVersion).toBe(1);
  });

  test('validate throw thiếu kind/ref1/ref2', () => {
    const def = getKind('intersection');
    expect(() => def.validate?.({ ref1: 'a', ref2: 'b' } as never)).toThrow();
    expect(() => def.validate?.({ kind: 'lineLine', ref1: '', ref2: 'b' } as never)).toThrow();
    expect(() => def.validate?.({ kind: 'lineLine', ref1: 'a', ref2: '' } as never)).toThrow();
  });

  test('validate OK với kind lineLine', () => {
    const def = getKind('intersection');
    expect(() => def.validate?.({ kind: 'lineLine', ref1: 'l1', ref2: 'l2' } as never)).not.toThrow();
  });

  test('validate OK với lineCircle + branch', () => {
    const def = getKind('intersection');
    expect(() => def.validate?.({ kind: 'lineCircle', ref1: 'l1', ref2: 'c1', branch: 0 } as never)).not.toThrow();
    expect(() => def.validate?.({ kind: 'lineCircle', ref1: 'l1', ref2: 'c1', branch: 1 } as never)).not.toThrow();
  });

  test('validate reject branch không phải 0/1', () => {
    const def = getKind('intersection');
    expect(() => def.validate?.({ kind: 'lineCircle', ref1: 'l1', ref2: 'c1', branch: 2 } as never)).toThrow();
  });

  test('dependsOn = [ref1, ref2]', () => {
    const def = getKind('intersection');
    expect(def.dependsOn({ kind: 'lineLine', ref1: 'l1', ref2: 'l2' } as never))
      .toEqual(['l1', 'l2']);
    expect(def.dependsOn({ kind: 'circleCircle', ref1: 'c1', ref2: 'c2', branch: 1 } as never))
      .toEqual(['c1', 'c2']);
  });

  test('describe in giao 2 ref', () => {
    const obj = mkObj('intersection', 'I1', { kind: 'lineLine' as const, ref1: 'l1', ref2: 'l2' });
    expect(getKind('intersection').describe(obj)).toMatch(/I1.*l1.*l2|giao/i);
  });
});
