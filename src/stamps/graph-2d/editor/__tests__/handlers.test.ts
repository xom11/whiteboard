// src/stamps/graph-2d/editor/__tests__/handlers.test.ts
import { handleDown, type HandlerCtx } from '../handlers';
import { createStore } from '../../../../core/scene/store';
import { createEmptyState } from '../../../../core/scene/types';
import '../../../../core/scene/kinds';

function makeCtx(tool: HandlerCtx['toolRef']['current']): HandlerCtx {
  const store = createStore(createEmptyState('graph2d'));
  return {
    store,
    toolRef:              { current: tool },
    pendingIdsRef:        { current: [] },
    pushPending:          jest.fn(),
    clearPending:         jest.fn(),
    setTool:              jest.fn(),
    nextLabel:            (k) => `${k}1`,
    getNearestFunctionId: () => null,
    getHitObjectId:       () => null,
  };
}

describe('handleDown', () => {
  it('tool=point click empty → ADD point free', () => {
    const ctx = makeCtx('point');
    handleDown(ctx, { x: 1.5, y: 2.5 });
    const state = ctx.store.getState();
    const objs = Object.values(state.objects);
    expect(objs.length).toBe(1);
    expect(objs[0].kind).toBe('point');
    const attrs = objs[0].attrs as { constraint: { kind: string; x: number; y: number } };
    expect(attrs.constraint.kind).toBe('free');
    expect(attrs.constraint.x).toBeCloseTo(1.5);
    expect(attrs.constraint.y).toBeCloseTo(2.5);
    expect(ctx.setTool).toHaveBeenCalledWith('move');
  });

  it('tool=move → no dispatch', () => {
    const ctx = makeCtx('move');
    handleDown(ctx, { x: 0, y: 0 });
    expect(ctx.store.getState().order.length).toBe(0);
  });

  it('tool=pointOnCurve click trên curve → ADD pointOnCurve', () => {
    const ctx = makeCtx('pointOnCurve');
    ctx.getNearestFunctionId = () => 'f1';
    handleDown(ctx, { x: 2, y: 4 });
    const state = ctx.store.getState();
    const objs = Object.values(state.objects);
    expect(objs.length).toBe(1);
    expect(objs[0].kind).toBe('pointOnCurve');
    const attrs = objs[0].attrs as { functionId: string; x: number };
    expect(attrs.functionId).toBe('f1');
    expect(attrs.x).toBeCloseTo(2);
    expect(ctx.setTool).toHaveBeenCalledWith('move');
  });

  it('tool=pointOnCurve no nearby curve → no dispatch', () => {
    const ctx = makeCtx('pointOnCurve');
    ctx.getNearestFunctionId = () => null;
    handleDown(ctx, { x: 2, y: 4 });
    expect(ctx.store.getState().order.length).toBe(0);
  });

  it('tool=intersect first click → pushPending with function id', () => {
    const ctx = makeCtx('intersect');
    ctx.getNearestFunctionId = () => 'f1';
    handleDown(ctx, { x: 1, y: 1 });
    expect(ctx.pushPending).toHaveBeenCalledWith('f1');
    expect(ctx.store.getState().order.length).toBe(0);
  });

  it('tool=intersect second click different curve → ADD intersection', () => {
    const ctx = makeCtx('intersect');
    ctx.getNearestFunctionId = () => 'f2';
    ctx.pendingIdsRef.current = ['f1'];
    handleDown(ctx, { x: 2, y: 2 });
    const state = ctx.store.getState();
    const objs = Object.values(state.objects);
    expect(objs.length).toBe(1);
    expect(objs[0].kind).toBe('intersection');
    const attrs = objs[0].attrs as { kind: string; ref1: string; ref2: string };
    expect(attrs.ref1).toBe('f1');
    expect(attrs.ref2).toBe('f2');
    expect(ctx.clearPending).toHaveBeenCalled();
    expect(ctx.setTool).toHaveBeenCalledWith('move');
  });

  it('tool=intersect second click same curve → no ADD', () => {
    const ctx = makeCtx('intersect');
    ctx.getNearestFunctionId = () => 'f1';
    ctx.pendingIdsRef.current = ['f1'];
    handleDown(ctx, { x: 1, y: 1 });
    expect(ctx.store.getState().order.length).toBe(0);
  });

  it('tool=slider → setTool(move) immediately', () => {
    const ctx = makeCtx('slider');
    handleDown(ctx, { x: 0, y: 0 });
    expect(ctx.setTool).toHaveBeenCalledWith('move');
    expect(ctx.store.getState().order.length).toBe(0);
  });

  it('tool=segment first click → pushPending with new point id', () => {
    const ctx = makeCtx('segment');
    ctx.getHitObjectId = () => null;
    handleDown(ctx, { x: 1, y: 1 });
    // A free point should have been created
    const state = ctx.store.getState();
    expect(state.order.length).toBe(1);
    expect(state.objects[state.order[0]].kind).toBe('point');
    expect(ctx.pushPending).toHaveBeenCalledWith('point1');
  });

  it('tool=segment second click → ADD segment + clearPending + setTool(move)', () => {
    const ctx = makeCtx('segment');
    // Use a counter so second auto-point gets a different id from the pending one
    let counter = 2;
    ctx.nextLabel = (k) => `${k}${counter++}`;
    ctx.getHitObjectId = () => null;
    ctx.pendingIdsRef.current = ['point1'];
    handleDown(ctx, { x: 3, y: 3 });
    const state = ctx.store.getState();
    const seg = Object.values(state.objects).find((o) => o.kind === 'segment');
    expect(seg).toBeTruthy();
    const attrs = seg!.attrs as { p1: string; p2: string };
    expect(attrs.p1).toBe('point1');
    expect(ctx.clearPending).toHaveBeenCalled();
    expect(ctx.setTool).toHaveBeenCalledWith('move');
  });

  it('tool=extremum on function → ADD extremum2d', () => {
    const ctx = makeCtx('extremum');
    ctx.getNearestFunctionId = () => 'f1';
    handleDown(ctx, { x: 0, y: 0 });
    const state = ctx.store.getState();
    expect(state.order.length).toBe(1);
    expect(state.objects[state.order[0]].kind).toBe('extremum2d');
    expect(ctx.setTool).toHaveBeenCalledWith('move');
  });

  it('tool=root on function → ADD root2d', () => {
    const ctx = makeCtx('root');
    ctx.getNearestFunctionId = () => 'f1';
    handleDown(ctx, { x: 0, y: 0 });
    const state = ctx.store.getState();
    expect(state.order.length).toBe(1);
    expect(state.objects[state.order[0]].kind).toBe('root2d');
    expect(ctx.setTool).toHaveBeenCalledWith('move');
  });
});
