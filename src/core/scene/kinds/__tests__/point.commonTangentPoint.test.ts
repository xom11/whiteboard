// src/core/scene/kinds/__tests__/point.commonTangentPoint.test.ts
//
// Render-dispatch test cho commonTangentPoint. Mock board cấp center/X()/Y()/
// Radius() cho circle → evaluate functional coords → verify tiếp điểm trên đúng
// đtròn + bán kính ⊥ tiếp tuyến (KHÔNG rơi fallback [0,0]).
import { createStore } from '../../store';
import { createEmptyState } from '../../types';
import { JxgRenderer } from '../../render/JxgRenderer';
import '../../kinds';
import type { SceneObject } from '../../types';

function mockBoard() {
  const created: any[] = [];
  const board = {
    create: jest.fn((type: string, parents: any, attrs: any) => {
      const el: any = { type, parents, attrs, _id: `${type}_${created.length}` };
      if (type === 'point') {
        el.X = () => (typeof parents[0] === 'function' ? parents[0]() : parents[0]);
        el.Y = () => (typeof parents[1] === 'function' ? parents[1]() : parents[1]);
      }
      if (type === 'circle' && Array.isArray(parents)) {
        el.center = parents[0];
        el.Radius = () => (typeof parents[1] === 'function' ? parents[1]() : parents[1]);
      }
      created.push(el);
      return el;
    }),
    removeObject: jest.fn(),
  };
  return { board, created };
}

const mkFree = (id: string, x: number, y: number): SceneObject => ({
  id, kind: 'point', label: id, visible: true, locked: false, layer: 'default',
  schemaVersion: 1, attrs: { constraint: { kind: 'free', x, y } },
});

const mkCircleCR = (id: string, center: string, radius: number): SceneObject => ({
  id, kind: 'circle', label: id, visible: true, locked: false, layer: 'default',
  schemaVersion: 1, attrs: { center, radius },
});

const mkPointC = (id: string, constraint: unknown): SceneObject => ({
  id, kind: 'point', label: id, visible: true, locked: false, layer: 'default',
  schemaVersion: 1, attrs: { constraint: constraint as never },
});

function findByName(created: any[], name: string) {
  return created.find((e) => e.attrs?.name === name);
}

const dot = (ux: number, uy: number, vx: number, vy: number) => ux * vx + uy * vy;

describe('render commonTangentPoint', () => {
  it('external: T1 trên (O), T2 trên (O\'), bán kính ⊥ tiếp tuyến, KHÔNG (0,0)', () => {
    const store = createStore(createEmptyState('2d'));
    const { board, created } = mockBoard();
    new JxgRenderer(store, board as never);
    // O1=(0,0) r1=3, O2=(10,0) r2=1
    store.dispatch({ type: 'ADD', payload: { obj: mkFree('o1', 0, 0) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkFree('o2', 10, 0) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkCircleCR('k1', 'o1', 3) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkCircleCR('k2', 'o2', 1) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkPointC('T1', { kind: 'commonTangentPoint', circles: ['k1', 'k2'], on: 0, variant: 'external', side: 0 }) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkPointC('T2', { kind: 'commonTangentPoint', circles: ['k1', 'k2'], on: 1, variant: 'external', side: 0 }) } });
    const T1 = findByName(created, 'T1');
    const T2 = findByName(created, 'T2');
    expect(T1).toBeDefined();
    expect(T2).toBeDefined();
    const t1x = T1.X(), t1y = T1.Y(), t2x = T2.X(), t2y = T2.Y();
    // tiếp điểm trên đúng đường tròn
    expect(Math.hypot(t1x - 0, t1y - 0)).toBeCloseTo(3, 6);
    expect(Math.hypot(t2x - 10, t2y - 0)).toBeCloseTo(1, 6);
    // bán kính ⊥ tiếp tuyến (T2 - T1)
    const tx = t2x - t1x, ty = t2y - t1y;
    expect(dot(t1x - 0, t1y - 0, tx, ty)).toBeCloseTo(0, 6);
    expect(dot(t2x - 10, t2y - 0, tx, ty)).toBeCloseTo(0, 6);
    // không fallback (0,0)
    expect(t1x === 0 && t1y === 0).toBe(false);
  });

  it('internal: T1 trên (O), T2 trên (O\') với d > r1+r2', () => {
    const store = createStore(createEmptyState('2d'));
    const { board, created } = mockBoard();
    new JxgRenderer(store, board as never);
    // O1=(0,0) r1=2, O2=(10,0) r2=2, d=10 > 4
    store.dispatch({ type: 'ADD', payload: { obj: mkFree('o1', 0, 0) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkFree('o2', 10, 0) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkCircleCR('k1', 'o1', 2) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkCircleCR('k2', 'o2', 2) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkPointC('T1', { kind: 'commonTangentPoint', circles: ['k1', 'k2'], on: 0, variant: 'internal', side: 0 }) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkPointC('T2', { kind: 'commonTangentPoint', circles: ['k1', 'k2'], on: 1, variant: 'internal', side: 0 }) } });
    const T1 = findByName(created, 'T1');
    const T2 = findByName(created, 'T2');
    const t1x = T1.X(), t1y = T1.Y(), t2x = T2.X(), t2y = T2.Y();
    expect(Math.hypot(t1x, t1y)).toBeCloseTo(2, 6);
    expect(Math.hypot(t2x - 10, t2y)).toBeCloseTo(2, 6);
    const tx = t2x - t1x, ty = t2y - t1y;
    expect(dot(t1x, t1y, tx, ty)).toBeCloseTo(0, 6);
  });

  it('lồng nhau (|ratio|>1) → fallback (0,0) an toàn (không crash)', () => {
    const store = createStore(createEmptyState('2d'));
    const { board, created } = mockBoard();
    new JxgRenderer(store, board as never);
    // O1=(0,0) r1=5, O2=(2,0) r2=1 → external |(5-1)/2|=2>1
    store.dispatch({ type: 'ADD', payload: { obj: mkFree('o1', 0, 0) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkFree('o2', 2, 0) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkCircleCR('k1', 'o1', 5) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkCircleCR('k2', 'o2', 1) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkPointC('T1', { kind: 'commonTangentPoint', circles: ['k1', 'k2'], on: 0, variant: 'external', side: 0 }) } });
    const T1 = findByName(created, 'T1');
    expect(T1).toBeDefined();
    expect(T1.X()).toBe(0);
    expect(T1.Y()).toBe(0);
  });
});
