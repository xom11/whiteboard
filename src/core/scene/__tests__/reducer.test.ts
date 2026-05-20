// src/core/scene/__tests__/reducer.test.ts
import { produce } from 'immer';
import { reduce } from '../reducer';
import { registerKind, __clearRegistryForTests } from '../registry';
import { createEmptyState } from '../types';
import type { SceneObject, KindDef } from '../types';

const mkPoint = (id: string, x = 0, y = 0): SceneObject => ({
  id, kind: 'point', label: id, visible: true, locked: false, layer: 'default',
  schemaVersion: 1, attrs: { x, y },
});

const mkLine = (id: string, p1: string, p2: string): SceneObject => ({
  id, kind: 'line', label: id, visible: true, locked: false, layer: 'default',
  schemaVersion: 1, attrs: { p1, p2 },
});

const pointDef: KindDef = {
  type: 'point', schemaVersion: 1, migrate: {},
  dependsOn: () => [], describe: () => '', render: () => null,
};
const lineDef: KindDef = {
  type: 'line', schemaVersion: 1, migrate: {},
  dependsOn: (a: any) => [a.p1, a.p2], describe: () => '', render: () => null,
};

describe('reducer', () => {
  beforeEach(() => {
    __clearRegistryForTests();
    registerKind(pointDef);
    registerKind(lineDef);
  });

  test('ADD thêm object + push vào order + tăng counter', () => {
    const s0 = createEmptyState('3d');
    const s1 = produce(s0, d => reduce(d, { type: 'ADD', payload: { obj: mkPoint('p1') } }));
    expect(s1.objects.p1.id).toBe('p1');
    expect(s1.order).toEqual(['p1']);
    expect(s1.counter).toBe(1);
  });

  test('ADD throw nếu id trùng', () => {
    let s = createEmptyState('3d');
    s = produce(s, d => reduce(d, { type: 'ADD', payload: { obj: mkPoint('p1') } }));
    expect(() => produce(s, d => reduce(d, { type: 'ADD', payload: { obj: mkPoint('p1') } })))
      .toThrow(/p1/);
  });

  test('UPDATE patch metadata', () => {
    let s = createEmptyState('3d');
    s = produce(s, d => reduce(d, { type: 'ADD', payload: { obj: mkPoint('p1') } }));
    s = produce(s, d => reduce(d, { type: 'UPDATE', payload: { id: 'p1', patch: { visible: false } } }));
    expect(s.objects.p1.visible).toBe(false);
  });

  test('UPDATE_ATTRS merge attrs', () => {
    let s = createEmptyState('3d');
    s = produce(s, d => reduce(d, { type: 'ADD', payload: { obj: mkPoint('p1', 0, 0) } }));
    s = produce(s, d => reduce(d, { type: 'UPDATE_ATTRS', payload: { id: 'p1', patch: { x: 5 } } }));
    expect(s.objects.p1.attrs).toEqual({ x: 5, y: 0 });
  });

  test('DELETE xoá object + cascade dependents', () => {
    let s = createEmptyState('3d');
    s = produce(s, d => reduce(d, { type: 'ADD', payload: { obj: mkPoint('p1') } }));
    s = produce(s, d => reduce(d, { type: 'ADD', payload: { obj: mkPoint('p2') } }));
    s = produce(s, d => reduce(d, { type: 'ADD', payload: { obj: mkLine('l1', 'p1', 'p2') } }));
    s = produce(s, d => reduce(d, { type: 'DELETE', payload: { id: 'p1' } }));
    expect(s.objects.p1).toBeUndefined();
    expect(s.objects.l1).toBeUndefined();
    expect(s.objects.p2).toBeDefined();
    expect(s.order).toEqual(['p2']);
  });

  test('DELETE no-op nếu id không tồn tại', () => {
    const s = createEmptyState('3d');
    const next = produce(s, d => reduce(d, { type: 'DELETE', payload: { id: 'ghost' } }));
    expect(next).toEqual(s);
  });

  test('RESET đưa về empty (giữ meta)', () => {
    let s = createEmptyState('3d');
    s = produce(s, d => reduce(d, { type: 'ADD', payload: { obj: mkPoint('p1') } }));
    s = produce(s, d => reduce(d, { type: 'RESET' }));
    expect(s.objects).toEqual({});
    expect(s.order).toEqual([]);
    expect(s.counter).toBe(0);
    expect(s.meta.domain).toBe('3d');
  });

  test('LOAD thay state hoàn toàn', () => {
    const initial = createEmptyState('3d');
    const loaded = produce(createEmptyState('3d'), d =>
      reduce(d, { type: 'ADD', payload: { obj: mkPoint('p1') } }));
    const next = produce(initial, d => reduce(d, { type: 'LOAD', payload: { state: loaded } }));
    expect(next.objects.p1).toBeDefined();
  });

  test('TRANSACTION apply nhiều action tuần tự trong 1 lần', () => {
    const s0 = createEmptyState('3d');
    const next = produce(s0, d => reduce(d, {
      type: 'TRANSACTION',
      payload: { actions: [
        { type: 'ADD', payload: { obj: mkPoint('p1') } },
        { type: 'ADD', payload: { obj: mkPoint('p2') } },
        { type: 'UPDATE', payload: { id: 'p1', patch: { locked: true } } },
      ] },
    }));
    expect(next.order).toEqual(['p1', 'p2']);
    expect(next.objects.p1.locked).toBe(true);
    expect(next.counter).toBe(2);
  });
});
