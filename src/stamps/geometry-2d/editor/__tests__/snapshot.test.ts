// src/stamps/geometry-2d/editor/__tests__/snapshot.test.ts
//
// buildObjectSnapshot quyết định object nào mở được PropertiesPopover.
// Điểm giao (kind 'intersection') phải vào allowlist và map sang snapshot
// kind 'point' để đổi tên / đổi màu được như mọi điểm khác.
import { buildObjectSnapshot } from '../snapshot';
import { createStore } from '../../../../core/scene/store';
import { createEmptyState } from '../../../../core/scene/types';
import '../../../../core/scene/kinds';
import type { SceneObject } from '../../../../core/scene/types';

const mkFree = (id: string, x = 0, y = 0): SceneObject => ({
  id, kind: 'point', label: id, visible: true, locked: false, layer: 'default',
  schemaVersion: 1, attrs: { constraint: { kind: 'free', x, y } },
});
const mkSegment = (id: string, p1: string, p2: string): SceneObject => ({
  id, kind: 'segment', label: id, visible: true, locked: false, layer: 'default',
  schemaVersion: 1, attrs: { p1, p2 },
});
const mkIntersection = (id: string, ref1: string, ref2: string): SceneObject => ({
  id, kind: 'intersection', label: id, visible: true, locked: false, layer: 'default',
  schemaVersion: 1, attrs: { kind: 'lineLine', ref1, ref2 },
});

function stateWithIntersection() {
  const store = createStore(createEmptyState('2d'));
  store.dispatch({ type: 'ADD', payload: { obj: mkFree('A', 0, 0) } });
  store.dispatch({ type: 'ADD', payload: { obj: mkFree('B', 4, 4) } });
  store.dispatch({ type: 'ADD', payload: { obj: mkFree('C', 0, 4) } });
  store.dispatch({ type: 'ADD', payload: { obj: mkFree('D', 4, 0) } });
  store.dispatch({ type: 'ADD', payload: { obj: mkSegment('s1', 'A', 'B') } });
  store.dispatch({ type: 'ADD', payload: { obj: mkSegment('s2', 'C', 'D') } });
  store.dispatch({ type: 'ADD', payload: { obj: mkIntersection('I', 's1', 's2') } });
  return store.getState();
}

describe('buildObjectSnapshot — điểm giao', () => {
  test('điểm giao trả snapshot kind "point" (mở được popover đổi tên)', () => {
    const snap = buildObjectSnapshot(stateWithIntersection(), 'I', { x: 10, y: 20 });
    expect(snap).not.toBeNull();
    expect(snap?.kind).toBe('point');
    expect(snap?.name).toBe('I');
  });

  test('điểm tự do vẫn trả snapshot kind "point" (không regress)', () => {
    const snap = buildObjectSnapshot(stateWithIntersection(), 'A', { x: 0, y: 0 });
    expect(snap?.kind).toBe('point');
    expect(snap?.name).toBe('A');
  });
});
