// src/core/scene/kinds/__tests__/construction3d-math.test.ts
// Unit test toán THUẦN cho ĐƯỜNG/MẶT phái sinh 3D (construction-variant, v1.5).
import '../../kinds'; // side-effect: đăng ký mọi kind 3D
import { produce } from 'immer';
import { lineConstructionWorld } from '../constraint3d-math';
import { reduce } from '../../reducer';
import { createEmptyState, type State, type SceneObject } from '../../types';
import { mkObj } from './helpers';

function pt(id: string, x: number, y: number, z: number): SceneObject {
  return mkObj('point3d', id, { constraint: { kind: 'free', x, y, z } });
}
function plane(id: string, p1: string, p2: string, p3: string): SceneObject {
  return mkObj('plane3d', id, { p1, p2, p3 });
}
function mkState(objs: SceneObject[]): State {
  const objects: Record<string, SceneObject> = {};
  const order: string[] = [];
  for (const o of objs) { objects[o.id] = o; order.push(o.id); }
  return { ...createEmptyState('3d'), objects, order, counter: objs.length };
}

describe('lineConstructionWorld: planePlaneIntersection', () => {
  test('mp xy ∩ mp xz → trục x (a,b có y=z=0, hướng ∥ x)', () => {
    const s = mkState([
      pt('A', 0, 0, 0), pt('B', 1, 0, 0), pt('C', 0, 1, 0), plane('xy', 'A', 'B', 'C'),
      pt('D', 0, 0, 1), plane('xz', 'A', 'B', 'D'),
    ]);
    const { a, b } = lineConstructionWorld({ kind: 'planePlaneIntersection', plane1: 'xy', plane2: 'xz' }, s);
    expect(a[1]).toBeCloseTo(0, 9); expect(a[2]).toBeCloseTo(0, 9);
    expect(b[1]).toBeCloseTo(0, 9); expect(b[2]).toBeCloseTo(0, 9);
    const dir = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    expect(Math.abs(dir[1])).toBeCloseTo(0, 9);
    expect(Math.abs(dir[2])).toBeCloseTo(0, 9);
    expect(Math.abs(dir[0])).toBeGreaterThan(0.5); // hướng thực sự ∥ x
  });

  test('mp z=2 ∩ mp y=0 → đường {y=0, z=2}', () => {
    const s = mkState([
      pt('A', 0, 0, 2), pt('B', 1, 0, 2), pt('C', 0, 1, 2), plane('z2', 'A', 'B', 'C'),
      pt('D', 0, 0, 0), pt('E', 1, 0, 0), pt('F', 0, 0, 1), plane('y0', 'D', 'E', 'F'),
    ]);
    const { a, b } = lineConstructionWorld({ kind: 'planePlaneIntersection', plane1: 'z2', plane2: 'y0' }, s);
    expect(a[1]).toBeCloseTo(0, 9); expect(a[2]).toBeCloseTo(2, 9);
    expect(b[1]).toBeCloseTo(0, 9); expect(b[2]).toBeCloseTo(2, 9);
  });

  test('2 mặt song song → fallback hữu hạn (không NaN)', () => {
    const s = mkState([
      pt('A', 0, 0, 0), pt('B', 1, 0, 0), pt('C', 0, 1, 0), plane('z0', 'A', 'B', 'C'),
      pt('D', 0, 0, 3), pt('E', 1, 0, 3), pt('F', 0, 1, 3), plane('z3', 'D', 'E', 'F'),
    ]);
    const { a, b } = lineConstructionWorld({ kind: 'planePlaneIntersection', plane1: 'z0', plane2: 'z3' }, s);
    expect(a.every(Number.isFinite)).toBe(true);
    expect(b.every(Number.isFinite)).toBe(true);
  });

  test('cascade-delete: xoá 1 mặt → xoá giao tuyến phái sinh', () => {
    let s = mkState([
      pt('A', 0, 0, 0), pt('B', 1, 0, 0), pt('C', 0, 1, 0), plane('xy', 'A', 'B', 'C'),
      pt('D', 0, 0, 1), plane('xz', 'A', 'B', 'D'),
    ]);
    const L = mkObj('line3d', 'g', { construction: { kind: 'planePlaneIntersection', plane1: 'xy', plane2: 'xz' } });
    s = produce(s, (d) => reduce(d, { type: 'ADD', payload: { obj: L } }));
    expect(s.objects.g).toBeDefined();
    s = produce(s, (d) => reduce(d, { type: 'DELETE', payload: { id: 'xy' } }));
    expect(s.objects.g).toBeUndefined(); // giao tuyến phụ thuộc mp xy → cascade
    expect(s.objects.xz).toBeDefined();
  });
});
