// src/core/scene/kinds/__tests__/construction3d-math.test.ts
// Unit test toán THUẦN cho ĐƯỜNG/MẶT phái sinh 3D (construction-variant, v1.5).
import '../../kinds'; // side-effect: đăng ký mọi kind 3D
import { produce } from 'immer';
import { lineConstructionWorld, planeConstructionWorld } from '../constraint3d-math';
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

describe('lineConstructionWorld: lineParallelThrough', () => {
  test('qua P(1,1,1) ∥ hướng A(0,0,0)→B(2,0,0) → đường (1,1,1)-(3,1,1)', () => {
    const s = mkState([pt('A', 0, 0, 0), pt('B', 2, 0, 0), pt('P', 1, 1, 1)]);
    const { a, b } = lineConstructionWorld({ kind: 'lineParallelThrough', point: 'P', dirA: 'A', dirB: 'B' }, s);
    expect(a).toEqual([1, 1, 1]);
    expect(b).toEqual([3, 1, 1]); // P + (B-A) = (1,1,1)+(2,0,0)
  });

  test('hướng song song bảo toàn: (b-a) ∥ (dirB-dirA)', () => {
    const s = mkState([pt('A', 1, 1, 0), pt('B', 3, 4, 0), pt('P', 0, 0, 5)]);
    const { a, b } = lineConstructionWorld({ kind: 'lineParallelThrough', point: 'P', dirA: 'A', dirB: 'B' }, s);
    expect([b[0] - a[0], b[1] - a[1], b[2] - a[2]]).toEqual([2, 3, 0]);
  });
});

describe('lineConstructionWorld: linePerpToPlane', () => {
  test('qua P(1,2,3) ⊥ mp xy → hướng = pháp tuyến (0,0,1), a=P', () => {
    const s = mkState([
      pt('Q', 0, 0, 0), pt('R', 1, 0, 0), pt('S', 0, 1, 0), plane('xy', 'Q', 'R', 'S'),
      pt('P', 1, 2, 3),
    ]);
    const { a, b } = lineConstructionWorld({ kind: 'linePerpToPlane', point: 'P', plane: 'xy' }, s);
    expect(a).toEqual([1, 2, 3]);
    const dir = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    expect(Math.abs(dir[0])).toBeCloseTo(0, 9);
    expect(Math.abs(dir[1])).toBeCloseTo(0, 9);
    expect(Math.abs(dir[2])).toBeCloseTo(1, 9); // pháp tuyến đơn vị
  });
});

// Pháp tuyến đơn vị của mặt qua 3 điểm (để kiểm hướng mặt phái sinh).
function unitNormal(p1: number[], p2: number[], p3: number[]): number[] {
  const u = [p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]];
  const v = [p3[0] - p1[0], p3[1] - p1[1], p3[2] - p1[2]];
  const c = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const n = Math.hypot(c[0], c[1], c[2]) || 1;
  return [c[0] / n, c[1] / n, c[2] / n];
}

describe('planeConstructionWorld: planeParallelThrough', () => {
  test('qua P(0,0,5) ∥ mp xy → mặt z=5 (pháp tuyến ∥ z, p1=P)', () => {
    const s = mkState([
      pt('A', 0, 0, 0), pt('B', 1, 0, 0), pt('C', 0, 1, 0), plane('xy', 'A', 'B', 'C'),
      pt('P', 0, 0, 5),
    ]);
    const { p1, p2, p3 } = planeConstructionWorld({ kind: 'planeParallelThrough', point: 'P', refPlane: 'xy' }, s);
    expect(p1).toEqual([0, 0, 5]);
    const n = unitNormal(p1, p2, p3);
    expect(Math.abs(n[0])).toBeCloseTo(0, 9);
    expect(Math.abs(n[1])).toBeCloseTo(0, 9);
    expect(Math.abs(n[2])).toBeCloseTo(1, 9); // song song xy → pháp tuyến ∥ z
    expect(p2[2]).toBeCloseTo(5, 9); // toàn mặt ở z=5
    expect(p3[2]).toBeCloseTo(5, 9);
  });

  test('cascade-delete: xoá mặt tham chiếu → xoá mặt song song', () => {
    let s = mkState([
      pt('A', 0, 0, 0), pt('B', 1, 0, 0), pt('C', 0, 1, 0), plane('xy', 'A', 'B', 'C'),
      pt('P', 0, 0, 5),
    ]);
    const M = mkObj('plane3d', 'mp', { construction: { kind: 'planeParallelThrough', point: 'P', refPlane: 'xy' } });
    s = produce(s, (d) => reduce(d, { type: 'ADD', payload: { obj: M } }));
    expect(s.objects.mp).toBeDefined();
    s = produce(s, (d) => reduce(d, { type: 'DELETE', payload: { id: 'xy' } }));
    expect(s.objects.mp).toBeUndefined();
  });
});

describe('planeConstructionWorld: planePerpToLine', () => {
  test('qua O ⊥ trục z (A(0,0,0)→B(0,0,2)) → mặt xy (pháp tuyến ∥ z)', () => {
    const s = mkState([pt('O', 0, 0, 0), pt('A', 0, 0, 0), pt('B', 0, 0, 2)]);
    const { p1, p2, p3 } = planeConstructionWorld({ kind: 'planePerpToLine', point: 'O', lineA: 'A', lineB: 'B' }, s);
    expect(p1).toEqual([0, 0, 0]);
    const n = unitNormal(p1, p2, p3);
    // pháp tuyến mặt ∥ hướng đường (z) → mặt ⊥ đường
    expect(Math.abs(n[0])).toBeCloseTo(0, 9);
    expect(Math.abs(n[1])).toBeCloseTo(0, 9);
    expect(Math.abs(n[2])).toBeCloseTo(1, 9);
    expect(p2[2]).toBeCloseTo(0, 9); // mặt nằm trong z=0
    expect(p3[2]).toBeCloseTo(0, 9);
  });
});
