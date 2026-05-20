// src/core/scene/__tests__/selectors.test.ts
import { produce } from 'immer';
import { reduce } from '../reducer';
import { listObjects, byKind, dependentsOf, nextLabel } from '../selectors';
import { registerKind, __clearRegistryForTests } from '../registry';
import { createEmptyState } from '../types';
import type { SceneObject, KindDef } from '../types';

const pointDef: KindDef = {
  type: 'point', schemaVersion: 1, migrate: {},
  dependsOn: () => [], describe: () => '', render: () => null,
};
const lineDef: KindDef = {
  type: 'line', schemaVersion: 1, migrate: {},
  dependsOn: (a: any) => [a.p1, a.p2], describe: () => '', render: () => null,
};

const mkPoint = (id: string, label = id): SceneObject => ({
  id, kind: 'point', label, visible: true, locked: false, layer: 'default',
  schemaVersion: 1, attrs: { x: 0, y: 0 },
});

const mkLine = (id: string, p1: string, p2: string): SceneObject => ({
  id, kind: 'line', label: id, visible: true, locked: false, layer: 'default',
  schemaVersion: 1, attrs: { p1, p2 },
});

function build(...objs: SceneObject[]) {
  let s = createEmptyState('3d');
  for (const o of objs) s = produce(s, d => reduce(d, { type: 'ADD', payload: { obj: o } }));
  return s;
}

describe('selectors', () => {
  beforeEach(() => {
    __clearRegistryForTests();
    registerKind(pointDef);
    registerKind(lineDef);
  });

  test('listObjects giữ thứ tự insert', () => {
    const s = build(mkPoint('p2'), mkPoint('p1'));
    expect(listObjects(s).map(o => o.id)).toEqual(['p2', 'p1']);
  });

  test('byKind lọc đúng', () => {
    const s = build(mkPoint('p1'), mkPoint('p2'), mkLine('l1', 'p1', 'p2'));
    expect(byKind(s, 'point').map(o => o.id)).toEqual(['p1', 'p2']);
    expect(byKind(s, 'line').map(o => o.id)).toEqual(['l1']);
  });

  test('dependentsOf BFS qua nhiều cấp', () => {
    // p1 → l1, l1 không có dep ngược; nhưng test cascade: xoá p1 phải kéo l1.
    const s = build(mkPoint('p1'), mkPoint('p2'), mkLine('l1', 'p1', 'p2'));
    expect([...dependentsOf(s, 'p1')].sort()).toEqual(['l1', 'p1']);
  });

  test('nextLabel A→Z rồi A1, A2…', () => {
    // scan-fill: nếu thiếu 'B', dùng 'B'.
    const s = build(mkPoint('p1', 'A'), mkPoint('p2', 'C'));
    expect(nextLabel(s, 'point')).toBe('B');
  });

  test('nextLabel khi đã dùng hết A-Z → A1', () => {
    const objs: SceneObject[] = [];
    for (let i = 0; i < 26; i++) {
      objs.push(mkPoint(`p${i}`, String.fromCharCode(65 + i)));
    }
    const s = build(...objs);
    expect(nextLabel(s, 'point')).toBe('A1');
  });
});
