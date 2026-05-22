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

  describe('construction discriminator', () => {
    const def = getKind('line');

    test('validate cho phép omit p1/p2 khi có construction', () => {
      expect(() => def.validate?.({
        construction: { kind: 'perpendicular', throughPoint: 'P', toLine: 'L' },
      } as never)).not.toThrow();
    });

    test('dependsOn perpendicular = [throughPoint, toLine]', () => {
      expect(def.dependsOn({
        construction: { kind: 'perpendicular', throughPoint: 'P', toLine: 'L' },
      } as never)).toEqual(['P', 'L']);
    });

    test('dependsOn parallel = [throughPoint, toLine]', () => {
      expect(def.dependsOn({
        construction: { kind: 'parallel', throughPoint: 'P', toLine: 'L' },
      } as never)).toEqual(['P', 'L']);
    });

    test('dependsOn perpBisector = [p1, p2]', () => {
      expect(def.dependsOn({
        construction: { kind: 'perpBisector', p1: 'A', p2: 'B' },
      } as never)).toEqual(['A', 'B']);
    });

    test('dependsOn angleBisector = [p1, vertex, p2]', () => {
      expect(def.dependsOn({
        construction: { kind: 'angleBisector', p1: 'A', vertex: 'V', p2: 'B' },
      } as never)).toEqual(['A', 'V', 'B']);
    });

    test('dependsOn tangent = [throughPoint, toCircle]', () => {
      expect(def.dependsOn({
        construction: { kind: 'tangent', throughPoint: 'P', toCircle: 'C' },
      } as never)).toEqual(['P', 'C']);
    });

    test('dependsOn tangent ignores branch field', () => {
      expect(def.dependsOn({
        construction: { kind: 'tangent', throughPoint: 'P', toCircle: 'C', branch: 0 },
      } as never)).toEqual(['P', 'C']);
      expect(def.dependsOn({
        construction: { kind: 'tangent', throughPoint: 'P', toCircle: 'C', branch: 1 },
      } as never)).toEqual(['P', 'C']);
      expect(def.dependsOn({
        construction: { kind: 'tangent', throughPoint: 'P', toCircle: 'C', branch: 'on' },
      } as never)).toEqual(['P', 'C']);
    });

    // Polygon edges (sub-segments do JSXGraph auto-tạo) không có scene id riêng.
    // Synthetic id "<polyId>:border:<i>" cho phép construct tools tham chiếu
    // cạnh đa giác như một line; nhưng dependency graph cần biết line phụ thuộc
    // vào polygon (để DELETE polygon cascade xoá line).
    test('dependsOn perpendicular strip ":border:N" → polyId', () => {
      expect(def.dependsOn({
        construction: { kind: 'perpendicular', throughPoint: 'P', toLine: 'poly1:border:0' },
      } as never)).toEqual(['P', 'poly1']);
    });

    test('dependsOn parallel strip ":border:N" → polyId', () => {
      expect(def.dependsOn({
        construction: { kind: 'parallel', throughPoint: 'P', toLine: 'poly1:border:2' },
      } as never)).toEqual(['P', 'poly1']);
    });
  });
});
