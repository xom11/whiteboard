// src/stamps/geometry-2d/__tests__/finalizeTransform.test.ts
//
// Smoke test cho `finalizeTransform` — entry point của 6 transform tool. Chỉ
// kiểm tra dispatch action vào store đúng kind + đúng refs; render output
// (JSXGraph) thuộc về tests của point/polygon kind.

import { finalizeTransform } from '../editor/handlers';
import { createStore, createEmptyState } from '../../../core/scene';
import '../../../core/scene/kinds';
import type { HandlerCtx } from '../editor/handlers';

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

function makeCtx(): HandlerCtx & { _flashes: string[] } {
  const store = createStore(createEmptyState('2d'));
  const flashes: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const noop = (): any => undefined;
  const ctx: Partial<Mutable<HandlerCtx>> = {
    store,
    jxgFromSceneId: (id: string) => {
      // Trả mock JxgObj cho point — đủ cho translate vector compute.
      const obj = store.getState().objects[id];
      if (!obj || obj.kind !== 'point') return null;
      const c = obj.attrs as { constraint?: { kind?: string; x?: number; y?: number } };
      if (c.constraint?.kind === 'free') {
        return { X: () => c.constraint!.x ?? 0, Y: () => c.constraint!.y ?? 0 };
      }
      return null;
    },
    jxgIdToSceneId: noop,
    nextLabel: (kind: string) => `${kind[0].toUpperCase()}`,
    flashWarn: (msg: string) => { flashes.push(msg); },
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (ctx as any)._flashes = flashes;
  return ctx as HandlerCtx & { _flashes: string[] };
}

function addPoint(ctx: HandlerCtx, id: string, x: number, y: number): void {
  ctx.store.dispatch({
    type: 'ADD',
    payload: { obj: {
      id, kind: 'point', label: id, visible: true, locked: false, layer: 'default',
      schemaVersion: 1,
      attrs: { constraint: { kind: 'free', x, y } },
    } },
  });
}

function addSegment(ctx: HandlerCtx, id: string, p1: string, p2: string): void {
  ctx.store.dispatch({
    type: 'ADD',
    payload: { obj: {
      id, kind: 'segment', label: id, visible: true, locked: false, layer: 'default',
      schemaVersion: 1,
      attrs: { p1, p2 },
    } },
  });
}

describe('finalizeTransform', () => {
  test('translate segment: tạo 2 transformed point + 1 segment mới', () => {
    const ctx = makeCtx();
    addPoint(ctx, 'A', 0, 0);
    addPoint(ctx, 'B', 1, 1);
    addSegment(ctx, 's1', 'A', 'B');
    addPoint(ctx, 'P', 0, 0);
    addPoint(ctx, 'Q', 3, 4);  // vector PQ = (3, 4)
    const before = Object.keys(ctx.store.getState().objects).length;
    finalizeTransform(ctx, 'translate', ['s1', 'P', 'Q'], 0);
    const after = ctx.store.getState().objects;
    expect(Object.keys(after).length).toBe(before + 3);  // 2 point + 1 segment
    // Tìm transformed point đầu tiên
    const newPoints = Object.values(after).filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (o: any) => o.kind === 'point' && o.attrs.constraint?.kind === 'transformed',
    );
    expect(newPoints).toHaveLength(2);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tx = (newPoints[0] as any).attrs.constraint.transform;
    expect(tx.kind).toBe('translate');
    expect(tx.dx).toBeCloseTo(3, 6);
    expect(tx.dy).toBeCloseTo(4, 6);
  });

  test('rotate segment 90° quanh O: 2 transformed point với rotate constraint', () => {
    const ctx = makeCtx();
    addPoint(ctx, 'A', 0, 0);
    addPoint(ctx, 'B', 1, 0);
    addSegment(ctx, 's1', 'A', 'B');
    addPoint(ctx, 'O', 0, 0);
    finalizeTransform(ctx, 'rotate', ['s1', 'O'], 90);
    const objs = ctx.store.getState().objects;
    const transformedPts = Object.values(objs).filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (o: any) => o.kind === 'point' && o.attrs.constraint?.kind === 'transformed',
    );
    expect(transformedPts).toHaveLength(2);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tx = (transformedPts[0] as any).attrs.constraint.transform;
    expect(tx.kind).toBe('rotate');
    expect(tx.angleRad).toBeCloseTo(Math.PI / 2, 6);
    expect(tx.center).toBe('O');
  });

  test('reflectLine: 2 transformed point + 1 segment với constraint reflectLine', () => {
    const ctx = makeCtx();
    addPoint(ctx, 'A', 0, 1);
    addPoint(ctx, 'B', 1, 2);
    addSegment(ctx, 's1', 'A', 'B');
    // Mock line object — không thực sự render, chỉ refer.
    ctx.store.dispatch({
      type: 'ADD',
      payload: { obj: {
        id: 'l1', kind: 'line', label: 'l', visible: true, locked: false, layer: 'default',
        schemaVersion: 1,
        attrs: { p1: 'A', p2: 'B' },
      } },
    });
    finalizeTransform(ctx, 'reflectLine', ['s1', 'l1'], 0);
    const objs = ctx.store.getState().objects;
    const tps = Object.values(objs).filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (o: any) => o.kind === 'point' && o.attrs.constraint?.kind === 'transformed',
    );
    expect(tps).toHaveLength(2);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tx = (tps[0] as any).attrs.constraint.transform;
    expect(tx.kind).toBe('reflectLine');
    expect(tx.line).toBe('l1');
  });

  test('dilate: transform.k + center đúng', () => {
    const ctx = makeCtx();
    addPoint(ctx, 'A', 2, 0);
    addPoint(ctx, 'B', 0, 2);
    addSegment(ctx, 's1', 'A', 'B');
    addPoint(ctx, 'O', 0, 0);
    finalizeTransform(ctx, 'dilate', ['s1', 'O'], 1.5);
    const tps = Object.values(ctx.store.getState().objects).filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (o: any) => o.kind === 'point' && o.attrs.constraint?.kind === 'transformed',
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tx = (tps[0] as any).attrs.constraint.transform;
    expect(tx.kind).toBe('dilate');
    expect(tx.k).toBe(1.5);
    expect(tx.center).toBe('O');
  });

  test('regularPolygon: tạo polygon với construction regular n cạnh', () => {
    const ctx = makeCtx();
    addPoint(ctx, 'A', 0, 0);
    addPoint(ctx, 'B', 1, 0);
    finalizeTransform(ctx, 'regularPolygon', ['A', 'B'], 6);
    const polys = Object.values(ctx.store.getState().objects).filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (o: any) => o.kind === 'polygon',
    );
    expect(polys).toHaveLength(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = (polys[0] as any).attrs.construction;
    expect(c).toEqual({ kind: 'regular', p1: 'A', p2: 'B', n: 6 });
  });

  test('regularPolygon: n < 3 bị clamp về 3', () => {
    const ctx = makeCtx();
    addPoint(ctx, 'A', 0, 0);
    addPoint(ctx, 'B', 1, 0);
    finalizeTransform(ctx, 'regularPolygon', ['A', 'B'], 2);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const polys = Object.values(ctx.store.getState().objects).filter((o: any) => o.kind === 'polygon');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((polys[0] as any).attrs.construction.n).toBe(3);
  });

  test('source không có defining points → flashWarn + no change', () => {
    const ctx = makeCtx();
    // Add một intersection-like object không có defining points (per
    // getDefiningPoints, intersection returns [self id] so it has defining).
    // Use unknown kind để force [] path.
    ctx.store.dispatch({
      type: 'ADD',
      payload: { obj: {
        id: 'A', kind: 'point', label: 'A', visible: true, locked: false, layer: 'default',
        schemaVersion: 1,
        attrs: { constraint: { kind: 'free', x: 0, y: 0 } },
      } },
    });
    // Inject unknown kind manually (bypass validate via direct state mutate via
    // LOAD).
    const cur = ctx.store.getState();
    ctx.store.dispatch({ type: 'LOAD', payload: { state: {
      ...cur,
      objects: { ...cur.objects, weird: {
        id: 'weird', kind: 'weirdKind', label: 'W', visible: true, locked: false, layer: 'default',
        schemaVersion: 1, attrs: {},
      } },
      order: [...cur.order, 'weird'],
    } } });
    const before = Object.keys(ctx.store.getState().objects).length;
    finalizeTransform(ctx, 'translate', ['weird', 'A', 'A'], 0);
    const after = Object.keys(ctx.store.getState().objects).length;
    expect(after).toBe(before);
    expect(ctx._flashes.length).toBeGreaterThan(0);
  });
});
