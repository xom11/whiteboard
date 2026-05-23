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

  test('describe free → "Điểm <label>"', () => {
    const def = getKind('point');
    const obj = mkObj('point', 'A', { constraint: { kind: 'free', x: 1.5, y: 2.5 } });
    expect(def.describe(obj)).toBe('Điểm A');
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

  describe('constraint transformed', () => {
    const def = getKind('point');

    test('dependsOn translate → [source]', () => {
      expect(def.dependsOn({
        constraint: { kind: 'transformed', source: 'A', transform: { kind: 'translate', dx: 1, dy: 2 } },
      } as never)).toEqual(['A']);
    });

    test('dependsOn rotate → [source, center]', () => {
      expect(def.dependsOn({
        constraint: { kind: 'transformed', source: 'A', transform: { kind: 'rotate', angleRad: Math.PI / 2, center: 'O' } },
      } as never)).toEqual(['A', 'O']);
    });

    test('dependsOn reflectLine → [source, line]', () => {
      expect(def.dependsOn({
        constraint: { kind: 'transformed', source: 'A', transform: { kind: 'reflectLine', line: 'l1' } },
      } as never)).toEqual(['A', 'l1']);
    });

    test('dependsOn reflectPoint → [source, center]', () => {
      expect(def.dependsOn({
        constraint: { kind: 'transformed', source: 'A', transform: { kind: 'reflectPoint', center: 'O' } },
      } as never)).toEqual(['A', 'O']);
    });

    test('dependsOn dilate → [source, center]', () => {
      expect(def.dependsOn({
        constraint: { kind: 'transformed', source: 'A', transform: { kind: 'dilate', k: 2, center: 'O' } },
      } as never)).toEqual(['A', 'O']);
    });

    test('describe translate', () => {
      const obj = mkObj('point', "A'", {
        constraint: { kind: 'transformed', source: 'A', transform: { kind: 'translate', dx: 3, dy: 4 } },
      });
      expect(def.describe(obj)).toMatch(/A.*ảnh.*A.*tịnh tiến/);
    });

    test('describe rotate ghi rõ tâm + góc', () => {
      const obj = mkObj('point', "A'", {
        constraint: { kind: 'transformed', source: 'A', transform: { kind: 'rotate', angleRad: Math.PI, center: 'O' } },
      });
      expect(def.describe(obj)).toMatch(/180.*O|O.*180/);
    });
  });

  describe('constraint perpFoot', () => {
    const def = getKind('point');

    test('dependsOn perpFoot → [from, onLine]', () => {
      expect(def.dependsOn({
        constraint: { kind: 'perpFoot', from: 'A', onLine: 'l1' },
      } as never)).toEqual(['A', 'l1']);
    });

    test('describe perpFoot ghi đúng từ/đến', () => {
      const obj = mkObj('point', 'H', {
        constraint: { kind: 'perpFoot', from: 'A', onLine: 'l1' },
      });
      expect(def.describe(obj)).toMatch(/chân ⟂ từ A xuống l1/);
    });

    test('validate perpFoot throw khi thiếu from', () => {
      expect(() => def.validate?.({
        constraint: { kind: 'perpFoot', onLine: 'l1' },
      } as never)).toThrow(/perpFoot/);
    });

    test('validate perpFoot throw khi thiếu onLine', () => {
      expect(() => def.validate?.({
        constraint: { kind: 'perpFoot', from: 'A' },
      } as never)).toThrow(/perpFoot/);
    });
  });
});
