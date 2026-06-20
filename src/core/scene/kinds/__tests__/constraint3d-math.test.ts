// src/core/scene/kinds/__tests__/constraint3d-math.test.ts
// Unit test toán THUẦN cho điểm phái sinh 3D (constraintToWorld) + deps/cascade.
// Test rẻ-mạnh nhất cho v1: toạ độ biết trước. Grows theo từng construct.
import '../point3d'; // side-effect: đăng ký kind point3d (dependsOn = constraintRefs)
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
});
