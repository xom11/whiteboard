// src/stamps/geometry-2d/__tests__/hitTest.test.ts
import { findNearestPoint } from '../editor/hitTest';
import { createEmptyState } from '../../../core/scene';
import type { State, SceneObject } from '../../../core/scene';

function mkPoint(id: string, x: number, y: number): SceneObject {
  return {
    id,
    kind: 'point',
    label: id,
    visible: true,
    locked: false,
    layer: 'default',
    schemaVersion: 1,
    attrs: { constraint: { kind: 'free', x, y } } as never,
  };
}

function withObjects(state: State, objs: SceneObject[]): State {
  const objects: Record<string, SceneObject> = { ...state.objects };
  const order: string[] = [...state.order];
  for (const o of objs) {
    objects[o.id] = o;
    order.push(o.id);
  }
  return { ...state, objects, order, counter: state.counter + objs.length };
}

describe('findNearestPoint', () => {
  test('returns the nearest existing point within tolerance', () => {
    const base = createEmptyState('2d');
    const state = withObjects(base, [
      mkPoint('A', 100, 100),
      mkPoint('B', 120, 100),
      mkPoint('C', 200, 200),
    ]);
    const coords: Record<string, [number, number]> = {
      A: [100, 100],
      B: [120, 100],
      C: [200, 200],
    };
    const got = findNearestPoint(state, (id) => coords[id] ?? null, 110, 100, 12);
    expect(got?.id).toBe('A');
  });

  test('returns null when no point falls within tolerance', () => {
    const base = createEmptyState('2d');
    const state = withObjects(base, [mkPoint('A', 0, 0), mkPoint('B', 100, 0)]);
    const coords: Record<string, [number, number]> = { A: [0, 0], B: [100, 0] };
    const got = findNearestPoint(state, (id) => coords[id] ?? null, 50, 50, 10);
    expect(got).toBeNull();
  });

  test('excludes ids in excludeIds set', () => {
    const base = createEmptyState('2d');
    const state = withObjects(base, [mkPoint('A', 100, 100), mkPoint('B', 102, 100)]);
    const coords: Record<string, [number, number]> = { A: [100, 100], B: [102, 100] };
    const got = findNearestPoint(state, (id) => coords[id] ?? null, 101, 100, 12, new Set(['A']));
    expect(got?.id).toBe('B');
  });

  test('skips points without resolved coord (pointCoord returns null)', () => {
    const base = createEmptyState('2d');
    const state = withObjects(base, [mkPoint('A', 0, 0), mkPoint('B', 1, 1)]);
    const got = findNearestPoint(state, () => null, 0, 0, 100);
    expect(got).toBeNull();
  });

  test('ignores non-point and non-intersection kinds', () => {
    const base = createEmptyState('2d');
    const seg: SceneObject = {
      id: 's1',
      kind: 'segment',
      label: 's1',
      visible: true,
      locked: false,
      layer: 'default',
      schemaVersion: 1,
      attrs: { p1: 'A', p2: 'B' } as never,
    };
    const state = withObjects(base, [seg]);
    const got = findNearestPoint(state, () => [0, 0], 0, 0, 100);
    expect(got).toBeNull();
  });

  test('includes intersection kind', () => {
    const base = createEmptyState('2d');
    const inter: SceneObject = {
      id: 'X',
      kind: 'intersection',
      label: 'X',
      visible: true,
      locked: false,
      layer: 'default',
      schemaVersion: 1,
      attrs: { kind: 'lineLine', ref1: 'l1', ref2: 'l2' } as never,
    };
    const state = withObjects(base, [inter]);
    const got = findNearestPoint(state, (id) => (id === 'X' ? [10, 10] : null), 12, 10, 10);
    expect(got?.id).toBe('X');
  });
});
