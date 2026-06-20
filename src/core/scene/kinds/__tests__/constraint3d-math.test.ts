// src/core/scene/kinds/__tests__/constraint3d-math.test.ts
// Unit test toán THUẦN cho điểm phái sinh 3D (constraintToWorld) + deps/cascade.
// Test rẻ-mạnh nhất cho v1: toạ độ biết trước. Grows theo từng construct.
import '../../kinds'; // side-effect: đăng ký mọi kind 3D (point3d/line3d/plane3d…) cho cascade
import { produce } from 'immer';
import { constraintToWorld } from '../constraint3d-math';
import { constraintRefs, type Constraint3D } from '../3d-constraint';
import { getKind } from '../../registry';
import { reduce } from '../../reducer';
import { createEmptyState, type State, type SceneObject } from '../../types';
import { mkObj } from './helpers';

// điểm free tại (x,y,z)
function pt(id: string, x: number, y: number, z: number): SceneObject {
  return mkObj('point3d', id, { constraint: { kind: 'free', x, y, z } });
}
// mặt phẳng qua 3 điểm
function plane(id: string, p1: string, p2: string, p3: string): SceneObject {
  return mkObj('plane3d', id, { p1, p2, p3 });
}
// State từ danh sách object (order theo thứ tự truyền vào)
function mkState(objs: SceneObject[]): State {
  const objects: Record<string, SceneObject> = {};
  const order: string[] = [];
  for (const o of objs) { objects[o.id] = o; order.push(o.id); }
  return { ...createEmptyState('3d'), objects, order, counter: objs.length };
}

describe('constraint3d-math: điểm phái sinh', () => {
  describe('midpoint', () => {
    test('trung điểm trên trục: (0,0,0) & (2,0,0) → (1,0,0)', () => {
      const s = mkState([pt('A', 0, 0, 0), pt('B', 2, 0, 0)]);
      const c: Constraint3D = { kind: 'midpoint', p1: 'A', p2: 'B' };
      expect(constraintToWorld(c, s)).toEqual([1, 0, 0]);
    });

    test('trung điểm trong không gian: (0,0,0) & (2,4,6) → (1,2,3)', () => {
      const s = mkState([pt('A', 0, 0, 0), pt('B', 2, 4, 6)]);
      const c: Constraint3D = { kind: 'midpoint', p1: 'A', p2: 'B' };
      expect(constraintToWorld(c, s)).toEqual([1, 2, 3]);
    });

    test('constraintRefs midpoint → [p1, p2]', () => {
      const c: Constraint3D = { kind: 'midpoint', p1: 'A', p2: 'B' };
      expect(constraintRefs(c)).toEqual(['A', 'B']);
    });

    test('point3d.dependsOn midpoint → [p1, p2]', () => {
      const def = getKind('point3d');
      expect(def.dependsOn({ constraint: { kind: 'midpoint', p1: 'A', p2: 'B' } } as never))
        .toEqual(['A', 'B']);
    });

    test('cascade-delete: xoá điểm gốc A → xoá trung điểm phái sinh M', () => {
      let s = mkState([pt('A', 0, 0, 0), pt('B', 2, 0, 0)]);
      const M = mkObj('point3d', 'M', { constraint: { kind: 'midpoint', p1: 'A', p2: 'B' } });
      s = produce(s, d => reduce(d, { type: 'ADD', payload: { obj: M } }));
      expect(s.objects.M).toBeDefined();
      s = produce(s, d => reduce(d, { type: 'DELETE', payload: { id: 'A' } }));
      expect(s.objects.A).toBeUndefined();
      expect(s.objects.M).toBeUndefined(); // M phái sinh từ A → cascade
      expect(s.objects.B).toBeDefined();
    });

    test('serialize roundtrip giữ nguyên constraint midpoint (JSON thuần)', () => {
      const c: Constraint3D = { kind: 'midpoint', p1: 'A', p2: 'B' };
      expect(JSON.parse(JSON.stringify(c))).toEqual(c);
    });
  });

  describe('centroid', () => {
    test('trọng tâm tam giác: (0,0,0),(3,0,0),(0,3,0) → (1,1,0)', () => {
      const s = mkState([pt('A', 0, 0, 0), pt('B', 3, 0, 0), pt('C', 0, 3, 0)]);
      const c: Constraint3D = { kind: 'centroid', vertices: ['A', 'B', 'C'] };
      expect(constraintToWorld(c, s)).toEqual([1, 1, 0]);
    });

    test('trọng tâm tứ diện: (0,0,0),(4,0,0),(0,4,0),(0,0,4) → (1,1,1)', () => {
      const s = mkState([pt('A', 0, 0, 0), pt('B', 4, 0, 0), pt('C', 0, 4, 0), pt('D', 0, 0, 4)]);
      const c: Constraint3D = { kind: 'centroid', vertices: ['A', 'B', 'C', 'D'] };
      expect(constraintToWorld(c, s)).toEqual([1, 1, 1]);
    });

    test('constraintRefs centroid → vertices', () => {
      const c: Constraint3D = { kind: 'centroid', vertices: ['A', 'B', 'C'] };
      expect(constraintRefs(c)).toEqual(['A', 'B', 'C']);
    });

    test('cascade-delete: xoá 1 đỉnh → xoá trọng tâm', () => {
      let s = mkState([pt('A', 0, 0, 0), pt('B', 3, 0, 0), pt('C', 0, 3, 0)]);
      const G = mkObj('point3d', 'G', { constraint: { kind: 'centroid', vertices: ['A', 'B', 'C'] } });
      s = produce(s, d => reduce(d, { type: 'ADD', payload: { obj: G } }));
      s = produce(s, d => reduce(d, { type: 'DELETE', payload: { id: 'C' } }));
      expect(s.objects.G).toBeUndefined();
      expect(s.objects.A).toBeDefined();
    });
  });

  describe('intersectionLines (4 điểm: 2 đường)', () => {
    test('2 đường đồng phẳng cắt nhau → giao điểm (1,0,0)', () => {
      // đường (A,B) = trục x; đường (C,D) = x=1 trong mp xy.
      const s = mkState([pt('A', 0, 0, 0), pt('B', 2, 0, 0), pt('C', 1, -1, 0), pt('D', 1, 1, 0)]);
      const c: Constraint3D = { kind: 'intersectionLines', a1: 'A', b1: 'B', a2: 'C', b2: 'D' };
      expect(constraintToWorld(c, s)).toEqual([1, 0, 0]);
    });

    test('2 đường chéo nhau → trung điểm đoạn ⊥ chung (0,0,0.5)', () => {
      const s = mkState([pt('A', 0, 0, 0), pt('B', 1, 0, 0), pt('C', 0, -1, 1), pt('D', 0, 1, 1)]);
      const c: Constraint3D = { kind: 'intersectionLines', a1: 'A', b1: 'B', a2: 'C', b2: 'D' };
      const r = constraintToWorld(c, s);
      expect(r[0]).toBeCloseTo(0, 9);
      expect(r[1]).toBeCloseTo(0, 9);
      expect(r[2]).toBeCloseTo(0.5, 9);
    });

    test('constraintRefs → [a1, b1, a2, b2]', () => {
      const c: Constraint3D = { kind: 'intersectionLines', a1: 'A', b1: 'B', a2: 'C', b2: 'D' };
      expect(constraintRefs(c)).toEqual(['A', 'B', 'C', 'D']);
    });

    test('cascade: xoá 1 điểm gốc → giao điểm mất', () => {
      let s = mkState([pt('A', 0, 0, 0), pt('B', 2, 0, 0), pt('C', 1, -1, 0), pt('D', 1, 1, 0)]);
      const I = mkObj('point3d', 'I', { constraint: { kind: 'intersectionLines', a1: 'A', b1: 'B', a2: 'C', b2: 'D' } });
      s = produce(s, d => reduce(d, { type: 'ADD', payload: { obj: I } }));
      s = produce(s, d => reduce(d, { type: 'DELETE', payload: { id: 'A' } }));
      expect(s.objects.I).toBeUndefined();
      expect(s.objects.B).toBeDefined();
    });
  });

  describe('intersectionLinePlane', () => {
    test('trục z ∩ mp xy → (0,0,0)', () => {
      const s = mkState([
        pt('A', 0, 0, -1), pt('B', 0, 0, 1),
        pt('P', 0, 0, 0), pt('Q', 1, 0, 0), pt('R', 0, 1, 0), plane('pl', 'P', 'Q', 'R'),
      ]);
      const c: Constraint3D = { kind: 'intersectionLinePlane', a: 'A', b: 'B', plane: 'pl' };
      const r = constraintToWorld(c, s);
      expect(r[0]).toBeCloseTo(0, 9);
      expect(r[1]).toBeCloseTo(0, 9);
      expect(r[2]).toBeCloseTo(0, 9);
    });

    test('đường xiên ∩ mp z=2 → (1,0,2)', () => {
      // đường (0,0,0)→(2,0,4); mp z=2. t: 4t=2 → t=0.5 → (1,0,2).
      const s = mkState([
        pt('A', 0, 0, 0), pt('B', 2, 0, 4),
        pt('P', 0, 0, 2), pt('Q', 1, 0, 2), pt('R', 0, 1, 2), plane('pl', 'P', 'Q', 'R'),
      ]);
      const c: Constraint3D = { kind: 'intersectionLinePlane', a: 'A', b: 'B', plane: 'pl' };
      const r = constraintToWorld(c, s);
      expect(r[0]).toBeCloseTo(1, 9);
      expect(r[1]).toBeCloseTo(0, 9);
      expect(r[2]).toBeCloseTo(2, 9);
    });

    test('constraintRefs → [a, b, plane]', () => {
      const c: Constraint3D = { kind: 'intersectionLinePlane', a: 'A', b: 'B', plane: 'pl' };
      expect(constraintRefs(c)).toEqual(['A', 'B', 'pl']);
    });
  });

  describe('perpFootLine', () => {
    test('chân ⊥ P(0,2,0) xuống đường (trục x) → (0,0,0)', () => {
      const s = mkState([pt('A', 0, 0, 0), pt('B', 1, 0, 0), pt('P', 0, 2, 0)]);
      const c: Constraint3D = { kind: 'perpFootLine', from: 'P', a: 'A', b: 'B' };
      const r = constraintToWorld(c, s);
      expect(r[0]).toBeCloseTo(0, 9);
      expect(r[1]).toBeCloseTo(0, 9);
      expect(r[2]).toBeCloseTo(0, 9);
    });

    test('constraintRefs → [from, a, b]', () => {
      const c: Constraint3D = { kind: 'perpFootLine', from: 'P', a: 'A', b: 'B' };
      expect(constraintRefs(c)).toEqual(['P', 'A', 'B']);
    });
  });

  describe('perpFootPlane', () => {
    test('chân ⊥ P(1,2,3) xuống mp xy → (1,2,0)', () => {
      const s = mkState([
        pt('Q', 0, 0, 0), pt('R', 1, 0, 0), pt('S', 0, 1, 0), plane('pl', 'Q', 'R', 'S'),
        pt('P', 1, 2, 3),
      ]);
      const c: Constraint3D = { kind: 'perpFootPlane', from: 'P', plane: 'pl' };
      const r = constraintToWorld(c, s);
      expect(r[0]).toBeCloseTo(1, 9);
      expect(r[1]).toBeCloseTo(2, 9);
      expect(r[2]).toBeCloseTo(0, 9);
    });

    test('mặt phẳng suy biến (3 điểm thẳng hàng) → trả P không đổi, hữu hạn', () => {
      const s = mkState([
        pt('Q', 0, 0, 0), pt('R', 1, 0, 0), pt('S', 2, 0, 0), plane('pl', 'Q', 'R', 'S'), // thẳng hàng
        pt('P', 1, 2, 3),
      ]);
      const r = constraintToWorld({ kind: 'perpFootPlane', from: 'P', plane: 'pl' }, s);
      expect(r.every(Number.isFinite)).toBe(true);
      expect(r).toEqual([1, 2, 3]); // normal=0 → không chiếu được → P không đổi (fallback ghi nhận)
    });

    test('cascade: xoá mặt phẳng → chân ⊥ mất', () => {
      let s = mkState([
        pt('Q', 0, 0, 0), pt('R', 1, 0, 0), pt('S', 0, 1, 0), plane('pl', 'Q', 'R', 'S'),
        pt('P', 1, 2, 3),
      ]);
      const F = mkObj('point3d', 'F', { constraint: { kind: 'perpFootPlane', from: 'P', plane: 'pl' } });
      s = produce(s, d => reduce(d, { type: 'ADD', payload: { obj: F } }));
      s = produce(s, d => reduce(d, { type: 'DELETE', payload: { id: 'pl' } }));
      expect(s.objects.F).toBeUndefined();
      expect(s.objects.P).toBeDefined();
    });

    test('constraintRefs → [from, plane]', () => {
      const c: Constraint3D = { kind: 'perpFootPlane', from: 'P', plane: 'pl' };
      expect(constraintRefs(c)).toEqual(['P', 'pl']);
    });
  });
});

// Biên/suy biến: KHÔNG yêu cầu kết quả đúng-hình-học (cấu hình vô định), chỉ
// PIN hành vi fallback hiện tại + bảo đảm HỮU HẠN (không NaN/Infinity). Nếu sau
// này siết chặt (chặn ở UI / sentinel), các test này lộ ra để cập nhật có chủ đích.
describe('constraint3d-math: biên/suy biến (fallback hữu hạn)', () => {
  test('intersectionLines 2 đường song song → midpoint(A,C), hữu hạn', () => {
    const s = mkState([pt('A', 0, 0, 0), pt('B', 1, 0, 0), pt('C', 0, 1, 0), pt('D', 1, 1, 0)]);
    const r = constraintToWorld({ kind: 'intersectionLines', a1: 'A', b1: 'B', a2: 'C', b2: 'D' }, s);
    expect(r.every(Number.isFinite)).toBe(true);
    expect(r).toEqual([0, 0.5, 0]); // fallback midpoint(A,C) (điểm trên KHÔNG đường nào)
  });

  test('intersectionLines đường suy biến (a1≡b1) → midpoint(A,C), hữu hạn', () => {
    const s = mkState([pt('A', 3, 0, 0), pt('B', 0, 0, 0), pt('E', 10, 0, 0)]);
    // đường 1 = (A,A) zero-length; đường 2 = trục x (B,E). Giao thực = (3,0,0).
    const r = constraintToWorld({ kind: 'intersectionLines', a1: 'A', b1: 'A', a2: 'B', b2: 'E' }, s);
    expect(r.every(Number.isFinite)).toBe(true);
    expect(r).toEqual([1.5, 0, 0]); // fallback midpoint(A,B) — KHÔNG phải giao thực (3,0,0)
  });

  test('intersectionLinePlane đường song song NGOÀI mặt → trả A, hữu hạn', () => {
    const s = mkState([
      pt('A', 0, 0, 5), pt('B', 1, 0, 5),
      pt('P', 0, 0, 0), pt('Q', 1, 0, 0), pt('R', 0, 1, 0), plane('pl', 'P', 'Q', 'R'),
    ]);
    const r = constraintToWorld({ kind: 'intersectionLinePlane', a: 'A', b: 'B', plane: 'pl' }, s);
    expect(r.every(Number.isFinite)).toBe(true);
    expect(r).toEqual([0, 0, 5]); // fallback A (NGOÀI mặt — không có giao)
  });

  test('perpFootLine đường suy biến (a≡b) → trả A, hữu hạn', () => {
    const s = mkState([pt('P', 1, 2, 3), pt('A', 5, 5, 5)]);
    const r = constraintToWorld({ kind: 'perpFootLine', from: 'P', a: 'A', b: 'A' }, s);
    expect(r.every(Number.isFinite)).toBe(true);
    expect(r).toEqual([5, 5, 5]); // t=0 → A
  });
});

describe('point3d.describe: điểm phái sinh có mô tả (không chỉ nhãn trơ)', () => {
  const describe3d = (c: Constraint3D): string => {
    const def = getKind('point3d');
    return def.describe!(mkObj('point3d', 'X', { constraint: c }) as never);
  };
  test('midpoint', () => expect(describe3d({ kind: 'midpoint', p1: 'A', p2: 'B' })).toContain('trung điểm'));
  test('centroid', () => expect(describe3d({ kind: 'centroid', vertices: ['A', 'B', 'C'] })).toContain('trọng tâm'));
  test('intersectionLines', () =>
    expect(describe3d({ kind: 'intersectionLines', a1: 'A', b1: 'B', a2: 'C', b2: 'D' })).toContain('giao 2 đường'));
  test('intersectionLinePlane', () =>
    expect(describe3d({ kind: 'intersectionLinePlane', a: 'A', b: 'B', plane: 'pl' })).toContain('∩'));
  test('perpFootLine', () =>
    expect(describe3d({ kind: 'perpFootLine', from: 'P', a: 'A', b: 'B' })).toContain('chân ⊥'));
  test('perpFootPlane', () =>
    expect(describe3d({ kind: 'perpFootPlane', from: 'P', plane: 'pl' })).toContain('chân ⊥'));
});
