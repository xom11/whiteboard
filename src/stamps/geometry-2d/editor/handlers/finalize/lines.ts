import type { GeometryToolModule } from './_types';
import type { HandlerCtx } from '../ctx';
import { objKind } from '../../tools';
import { freshId, mkSceneObj } from '../utils';
import { classifyPointVsCircle } from '../classifyPointVsCircle';
import { findPickIdByKind } from './shared';

export const segmentTool: GeometryToolModule = {
  key: 'segment',
  finalize(ctx) {
    const ids = ctx.pendingIdsRef.current;
    const id = freshId(ctx, 's');
    const label = ctx.nextLabel('segment');
    ctx.store.dispatch({
      type: 'ADD',
      payload: { obj: mkSceneObj(id, 'segment', label, { p1: ids[0], p2: ids[1] }) },
    });
  },
};

export const lineTool: GeometryToolModule = {
  key: 'line',
  finalize(ctx) {
    const ids = ctx.pendingIdsRef.current;
    const id = freshId(ctx, 'l');
    const label = ctx.nextLabel('line');
    ctx.store.dispatch({
      type: 'ADD',
      payload: { obj: mkSceneObj(id, 'line', label, { p1: ids[0], p2: ids[1] }) },
    });
  },
};

/** Shared body cho perpendicular & parallel (order-flexible point+line). */
function finalizePerpParallel(ctx: HandlerCtx, key: 'perpendicular' | 'parallel'): void {
  const throughPoint = findPickIdByKind(ctx, 'point');
  const toLine = findPickIdByKind(ctx, 'line');
  if (!throughPoint || !toLine) return;
  const id = freshId(ctx, key === 'perpendicular' ? 'perp' : 'par');
  const label = ctx.nextLabel('line');
  ctx.store.dispatch({
    type: 'ADD',
    payload: { obj: mkSceneObj(id, 'line', label, {
      construction: { kind: key, throughPoint, toLine },
    }) },
  });
}

export const perpendicularTool: GeometryToolModule = {
  key: 'perpendicular',
  finalize(ctx) {
    finalizePerpParallel(ctx, 'perpendicular');
  },
};

export const parallelTool: GeometryToolModule = {
  key: 'parallel',
  finalize(ctx) {
    finalizePerpParallel(ctx, 'parallel');
  },
};

export const perpBisectorTool: GeometryToolModule = {
  key: 'perpBisector',
  finalize(ctx) {
    const ids = ctx.pendingIdsRef.current;
    const id = freshId(ctx, 'pb');
    const label = ctx.nextLabel('line');
    ctx.store.dispatch({
      type: 'ADD',
      payload: { obj: mkSceneObj(id, 'line', label, {
        construction: { kind: 'perpBisector', p1: ids[0], p2: ids[1] },
      }) },
    });
  },
};

export const angleBisectorTool: GeometryToolModule = {
  key: 'angleBisector',
  finalize(ctx) {
    const ids = ctx.pendingIdsRef.current;
    const picks = ctx.pendingRef.current;
    // Mode 2-line: 2 picks đều là line/segment → tạo 2 scene line (2 tia
    // phân giác vuông góc với nhau qua giao điểm 2 đường).
    if (picks.length === 2 && objKind(picks[0]) === 'line' && objKind(picks[1]) === 'line') {
      for (const branch of [0, 1] as const) {
        const id = freshId(ctx, 'ab');
        const label = ctx.nextLabel('line');
        ctx.store.dispatch({
          type: 'ADD',
          payload: { obj: mkSceneObj(id, 'line', label, {
            construction: { kind: 'angleBisectorLines', line1: ids[0], line2: ids[1], branch },
          }) },
        });
      }
      return;
    }
    // Mode 3-point: behavior cũ.
    const id = freshId(ctx, 'ab');
    const label = ctx.nextLabel('line');
    ctx.store.dispatch({
      type: 'ADD',
      payload: { obj: mkSceneObj(id, 'line', label, {
        construction: { kind: 'angleBisector', p1: ids[0], vertex: ids[1], p2: ids[2] },
      }) },
    });
  },
};

export const tangentTool: GeometryToolModule = {
  key: 'tangent',
  finalize(ctx) {
    const throughId = findPickIdByKind(ctx, 'point');
    const circleId = findPickIdByKind(ctx, 'circle');
    if (!throughId || !circleId) return;
    // Lấy JXG object tương ứng để classify vị trí P vs đường tròn.
    // pendingRef + pendingIdsRef cùng index → match qua indexOf id.
    const picks = ctx.pendingRef.current;
    const ids = ctx.pendingIdsRef.current;
    const through = picks[ids.indexOf(throughId)];
    const circle = picks[ids.indexOf(circleId)];
    const pos = classifyPointVsCircle(through, circle);
    if (pos === 'inside') {
      ctx.toast?.('Điểm nằm trong đường tròn — không có tiếp tuyến', {
        variant: 'warning',
        id: 'tangent-invalid-inside',
      });
      return;
    }
    if (pos === 'on') {
      const id = freshId(ctx, 't');
      const label = ctx.nextLabel('line');
      ctx.store.dispatch({
        type: 'ADD',
        payload: { obj: mkSceneObj(id, 'line', label, {
          construction: { kind: 'tangent', throughPoint: throughId, toCircle: circleId, branch: 'on' },
        }) },
      });
      return;
    }
    // outside → 2 scene element riêng, mỗi cái 1 nhánh tiếp tuyến.
    for (const branch of [0, 1] as const) {
      const id = freshId(ctx, 't');
      const label = ctx.nextLabel('line');
      ctx.store.dispatch({
        type: 'ADD',
        payload: { obj: mkSceneObj(id, 'line', label, {
          construction: { kind: 'tangent', throughPoint: throughId, toCircle: circleId, branch },
        }) },
      });
    }
  },
};

export const rayTool: GeometryToolModule = {
  key: 'ray',
  finalize(ctx) {
    const ids = ctx.pendingIdsRef.current;
    const id = freshId(ctx, 'r');
    const label = ctx.nextLabel('ray');
    ctx.store.dispatch({
      type: 'ADD',
      payload: { obj: mkSceneObj(id, 'ray', label, { origin: ids[0], through: ids[1] }) },
    });
  },
};

export const vectorTool: GeometryToolModule = {
  key: 'vector',
  finalize(ctx) {
    const ids = ctx.pendingIdsRef.current;
    const id = freshId(ctx, 'v');
    const label = ctx.nextLabel('vector');
    ctx.store.dispatch({
      type: 'ADD',
      payload: { obj: mkSceneObj(id, 'vector', label, { from: ids[0], to: ids[1] }) },
    });
  },
};
