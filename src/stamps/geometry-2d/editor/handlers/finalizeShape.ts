import { objKind, type ToolDef } from '../tools';
import type { HandlerCtx } from './ctx';
import { dispatchAddIntersection, freshId, mkSceneObj } from './utils';
import { classifyPointVsCircle } from './classifyPointVsCircle';

// ─── Finalize shape (dispatch ADD per tool) ──────────────────────────────────

/**
 * Tìm scene id của pending pick theo `objKind`. Dùng cho tool order-flexible
 * (perpendicular, parallel, tangent): user có thể click điểm trước hay đường
 * trước, finalizeShape dò pendingRef theo kind để biết role.
 */
function findPickIdByKind(ctx: HandlerCtx, kind: 'point' | 'line' | 'circle'): string | null {
  const picks = ctx.pendingRef.current;
  const ids = ctx.pendingIdsRef.current;
  for (let i = 0; i < picks.length; i += 1) {
    if (objKind(picks[i]) === kind && ids[i]) return ids[i];
  }
  return null;
}

export function finalizeShape(ctx: HandlerCtx, toolDef: ToolDef): void {
  const ids = ctx.pendingIdsRef.current;
  const key = toolDef.key;
  switch (key) {
    case 'segment': {
      const id = freshId(ctx, 's');
      const label = ctx.nextLabel('segment');
      ctx.store.dispatch({
        type: 'ADD',
        payload: { obj: mkSceneObj(id, 'segment', label, { p1: ids[0], p2: ids[1] }) },
      });
      return;
    }
    case 'line': {
      const id = freshId(ctx, 'l');
      const label = ctx.nextLabel('line');
      ctx.store.dispatch({
        type: 'ADD',
        payload: { obj: mkSceneObj(id, 'line', label, { p1: ids[0], p2: ids[1] }) },
      });
      return;
    }
    case 'perpendicular':
    case 'parallel': {
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
      return;
    }
    case 'perpBisector': {
      const id = freshId(ctx, 'pb');
      const label = ctx.nextLabel('line');
      ctx.store.dispatch({
        type: 'ADD',
        payload: { obj: mkSceneObj(id, 'line', label, {
          construction: { kind: 'perpBisector', p1: ids[0], p2: ids[1] },
        }) },
      });
      return;
    }
    case 'angleBisector': {
      const id = freshId(ctx, 'ab');
      const label = ctx.nextLabel('line');
      ctx.store.dispatch({
        type: 'ADD',
        payload: { obj: mkSceneObj(id, 'line', label, {
          construction: { kind: 'angleBisector', p1: ids[0], vertex: ids[1], p2: ids[2] },
        }) },
      });
      return;
    }
    case 'tangent': {
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
      return;
    }
    case 'ray': {
      const id = freshId(ctx, 'r');
      const label = ctx.nextLabel('ray');
      ctx.store.dispatch({
        type: 'ADD',
        payload: { obj: mkSceneObj(id, 'ray', label, { origin: ids[0], through: ids[1] }) },
      });
      return;
    }
    case 'vector': {
      const id = freshId(ctx, 'v');
      const label = ctx.nextLabel('vector');
      ctx.store.dispatch({
        type: 'ADD',
        payload: { obj: mkSceneObj(id, 'vector', label, { from: ids[0], to: ids[1] }) },
      });
      return;
    }
    case 'circleCenter': {
      const id = freshId(ctx, 'c');
      const label = ctx.nextLabel('circle');
      ctx.store.dispatch({
        type: 'ADD',
        payload: {
          obj: mkSceneObj(id, 'circle', label, {
            center: ids[0],
            surfacePoint: ids[1],
          }),
        },
      });
      return;
    }
    case 'circle3': {
      const id = freshId(ctx, 'cc');
      const label = ctx.nextLabel('circle');
      ctx.store.dispatch({
        type: 'ADD',
        payload: {
          obj: mkSceneObj(id, 'circle', label, {
            construction: { kind: 'circumscribed', p1: ids[0], p2: ids[1], p3: ids[2] },
          }),
        },
      });
      return;
    }
    case 'semicircle': {
      const id = freshId(ctx, 'arc');
      const label = ctx.nextLabel('arc');
      ctx.store.dispatch({
        type: 'ADD',
        payload: {
          obj: mkSceneObj(id, 'arc', label, {
            construction: { kind: 'semicircle', p1: ids[0], p2: ids[1] },
          }),
        },
      });
      return;
    }
    case 'arcCenter': {
      const id = freshId(ctx, 'arc');
      const label = ctx.nextLabel('arc');
      ctx.store.dispatch({
        type: 'ADD',
        payload: {
          obj: mkSceneObj(id, 'arc', label, {
            construction: { kind: 'byCenter', center: ids[0], p1: ids[1], p2: ids[2] },
          }),
        },
      });
      return;
    }
    case 'arc3': {
      const id = freshId(ctx, 'arc');
      const label = ctx.nextLabel('arc');
      ctx.store.dispatch({
        type: 'ADD',
        payload: {
          obj: mkSceneObj(id, 'arc', label, {
            construction: { kind: 'by3Points', p1: ids[0], p2: ids[1], p3: ids[2] },
          }),
        },
      });
      return;
    }
    case 'sectorCenter': {
      const id = freshId(ctx, 'sec');
      const label = ctx.nextLabel('sector');
      ctx.store.dispatch({
        type: 'ADD',
        payload: {
          obj: mkSceneObj(id, 'sector', label, {
            construction: { kind: 'byCenter', center: ids[0], p1: ids[1], p2: ids[2] },
          }),
        },
      });
      return;
    }
    case 'midpoint': {
      const id = freshId(ctx, 'mp');
      const label = ctx.nextLabel('point');
      ctx.store.dispatch({
        type: 'ADD',
        payload: { obj: mkSceneObj(id, 'point', label, {
          constraint: { kind: 'midpoint', p1: ids[0], p2: ids[1] },
        }) },
      });
      return;
    }
    case 'angle': {
      // ids = [p1, vertex, p2] — tool def 'accepts: ["point", "point", "point"]'
      // và LeftPanel hint "Click 3 điểm có sẵn (đỉnh ở giữa)". User click theo
      // thứ tự: cạnh-A, đỉnh, cạnh-B.
      const id = freshId(ctx, 'ang');
      const label = ctx.nextLabel('angle');
      ctx.store.dispatch({
        type: 'ADD',
        payload: { obj: mkSceneObj(id, 'angle', label, {
          p1: ids[0], vertex: ids[1], p2: ids[2],
        }) },
      });
      return;
    }
    case 'distance': {
      const id = freshId(ctx, 'd');
      const label = ctx.nextLabel('distance');
      ctx.store.dispatch({
        type: 'ADD',
        payload: { obj: mkSceneObj(id, 'distance', label, { p1: ids[0], p2: ids[1] }) },
      });
      return;
    }
    case 'intersect': {
      // ids[0], ids[1] là line hoặc circle theo accept 'lineOrCircle'.
      // Resolve kind từ pendingRef để biết lineLine / lineCircle / circleCircle.
      const picks = ctx.pendingRef.current;
      const pendIds = ctx.pendingIdsRef.current;
      const aIdx = pendIds.indexOf(ids[0]);
      const bIdx = pendIds.indexOf(ids[1]);
      if (aIdx < 0 || bIdx < 0) return;
      const aKind = objKind(picks[aIdx]);
      const bKind = objKind(picks[bIdx]);
      if (aKind === 'line' && bKind === 'line') {
        dispatchAddIntersection(ctx, { kind: 'lineLine', ref1: ids[0], ref2: ids[1] });
        return;
      }
      const isLineCircle =
        (aKind === 'line' && bKind === 'circle') || (aKind === 'circle' && bKind === 'line');
      const isCircleCircle = aKind === 'circle' && bKind === 'circle';
      if (!isLineCircle && !isCircleCircle) return;
      // 2 nhánh → tạo 2 scene intersection (giống GeoGebra "Intersect Two Objects").
      for (const branch of [0, 1] as const) {
        dispatchAddIntersection(ctx, {
          kind: isLineCircle ? 'lineCircle' : 'circleCircle',
          ref1: ids[0],
          ref2: ids[1],
          branch,
        });
      }
      return;
    }
    default:
      return;
  }
}
