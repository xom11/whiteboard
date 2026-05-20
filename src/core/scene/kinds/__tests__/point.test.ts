// src/core/scene/kinds/__tests__/point.test.ts
import '../point';
import { getKind } from '../../registry';
import { mkObj } from './helpers';

describe('kinds/point (2D)', () => {
  test('đã đăng ký với registry', () => {
    const def = getKind('point');
    expect(def.schemaVersion).toBe(1);
  });

  test('validate throw nếu thiếu constraint', () => {
    const def = getKind('point');
    expect(() => def.validate?.({} as never)).toThrow(/constraint/);
  });

  test('dependsOn free → []', () => {
    const def = getKind('point');
    expect(def.dependsOn({ constraint: { kind: 'free', x: 0, y: 0 } } as never))
      .toEqual([]);
  });

  test('dependsOn onLine → [lineId]', () => {
    const def = getKind('point');
    expect(def.dependsOn({ constraint: { kind: 'onLine', lineId: 'l1', t: 0.5 } } as never))
      .toEqual(['l1']);
  });

  test('dependsOn onCircle → [circleId]', () => {
    const def = getKind('point');
    expect(def.dependsOn({ constraint: { kind: 'onCircle', circleId: 'c1', theta: 0 } } as never))
      .toEqual(['c1']);
  });

  test('describe in toạ độ', () => {
    const def = getKind('point');
    const obj = mkObj('point', 'A', { constraint: { kind: 'free', x: 1.5, y: 2.5 } });
    expect(def.describe(obj)).toMatch(/A.*1\.50.*2\.50/);
  });

  test('dependsOn midpoint → [p1, p2]', () => {
    const def = getKind('point');
    expect(def.dependsOn({ constraint: { kind: 'midpoint', p1: 'A', p2: 'B' } } as never))
      .toEqual(['A', 'B']);
  });

  test('describe midpoint', () => {
    const def = getKind('point');
    const obj = mkObj('point', 'M', { constraint: { kind: 'midpoint', p1: 'A', p2: 'B' } });
    expect(def.describe(obj)).toMatch(/trung điểm AB/);
  });
});
