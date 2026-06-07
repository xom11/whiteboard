import type { GeometryToolModule } from './_types';
import { objKind } from '../../tools';
import { dispatchAddIntersection, freshId, mkSceneObj } from '../utils';

export const angleTool: GeometryToolModule = {
  key: 'angle',
  finalize(ctx) {
    const ids = ctx.pendingIdsRef.current;
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
  },
};

export const distanceTool: GeometryToolModule = {
  key: 'distance',
  finalize(ctx) {
    const ids = ctx.pendingIdsRef.current;
    const id = freshId(ctx, 'd');
    const label = ctx.nextLabel('distance');
    ctx.store.dispatch({
      type: 'ADD',
      payload: { obj: mkSceneObj(id, 'distance', label, { p1: ids[0], p2: ids[1] }) },
    });
  },
};

export const intersectTool: GeometryToolModule = {
  key: 'intersect',
  finalize(ctx) {
    const ids = ctx.pendingIdsRef.current;
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
  },
};
