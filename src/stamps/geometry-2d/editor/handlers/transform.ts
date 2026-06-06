import type { TransformDef } from '../../../../core/scene/kinds/2d-constraint';
import { getDefiningPoints } from '../transforms';
import type { HandlerCtx, TransformToolKey } from './ctx';
import { freshId, mkSceneObj } from './utils';

export function finalizeTransform(
  ctx: HandlerCtx,
  tool: TransformToolKey,
  pendingIds: string[],
  value: number,
): void {
  if (tool === 'regularPolygon') {
    const n = Math.max(3, Math.round(value));
    const id = freshId(ctx, 'rpoly');
    const label = ctx.nextLabel('polygon');
    ctx.store.dispatch({
      type: 'ADD',
      payload: { obj: mkSceneObj(id, 'polygon', label, {
        construction: { kind: 'regular', p1: pendingIds[0], p2: pendingIds[1], n },
      }) },
    });
    return;
  }

  if (tool === 'circleCR') {
    const r = Math.abs(value);
    if (!(r > 0)) { ctx.flashWarn('Bán kính phải > 0'); return; }
    const id = freshId(ctx, 'c');
    const label = ctx.nextLabel('circle');
    ctx.store.dispatch({
      type: 'ADD',
      payload: { obj: mkSceneObj(id, 'circle', label, { center: pendingIds[0], radius: r }) },
    });
    return;
  }

  // 5 transform tools: pendingIds[0] = source object.
  const sourceId = pendingIds[0];
  const state = ctx.store.getState();
  const source = state.objects[sourceId];
  if (!source) {
    ctx.flashWarn('Đối tượng nguồn không còn');
    return;
  }
  const defining = getDefiningPoints(source, state);
  if (defining.length === 0) {
    ctx.flashWarn('Không thể biến đổi đối tượng này');
    return;
  }

  let transformDef: TransformDef | null = null;
  if (tool === 'translate') {
    // pendingIds = [source, A, B]; vector = B − A. Đọc toạ độ live qua JxgObj.
    const a = ctx.jxgFromSceneId(pendingIds[1]);
    const b = ctx.jxgFromSceneId(pendingIds[2]);
    if (!a || !b || typeof a.X !== 'function' || typeof b.X !== 'function') {
      ctx.flashWarn('Không đọc được toạ độ vector');
      return;
    }
    transformDef = { kind: 'translate', dx: b.X() - a.X(), dy: b.Y() - a.Y() };
  } else if (tool === 'rotate') {
    transformDef = { kind: 'rotate', angleRad: (value * Math.PI) / 180, center: pendingIds[1] };
  } else if (tool === 'reflectLine') {
    transformDef = { kind: 'reflectLine', line: pendingIds[1] };
  } else if (tool === 'reflectPoint') {
    transformDef = { kind: 'reflectPoint', center: pendingIds[1] };
  } else if (tool === 'dilate') {
    transformDef = { kind: 'dilate', k: value, center: pendingIds[1] };
  }
  if (!transformDef) return;

  // Tạo N transformed point + collect ids. Dispatch tuần tự (không gom vào
  // transaction) vì freshId/nextLabel cần đọc state đã commit để cấp id+label
  // không trùng. Trade-off: undo sẽ tách thành N+1 step thay vì 1.
  const newPointIds: string[] = [];
  for (const defId of defining) {
    const newId = freshId(ctx, 'p');
    const newLabel = ctx.nextLabel('point');
    ctx.store.dispatch({
      type: 'ADD',
      payload: { obj: mkSceneObj(newId, 'point', newLabel, {
        constraint: { kind: 'transformed', source: defId, transform: transformDef! },
        color: '#0ea5e9',
      }) },
    });
    newPointIds.push(newId);
  }
  // Tạo wrapper cùng kind từ N point mới (point thì không cần wrapper).
  recreateFromTransformedPoints(ctx, source, newPointIds);
}

/**
 * Dựng object cùng kind với source từ N point đã transform. Tuân thủ schema
 * attrs của kind tương ứng. Không hỗ trợ kind 'point' (đã có sẵn point biến
 * hình), 'intersection' / 'angle' / 'distance' (measurement — không có ý
 * nghĩa biến hình), 'circle' với construction circumscribed.
 */
function recreateFromTransformedPoints(
  ctx: HandlerCtx,
  source: { kind: string; attrs: Record<string, unknown> },
  pointIds: string[],
): void {
  const k = source.kind;
  if (k === 'point' || k === 'intersection') return;  // point đơn đã có sẵn

  if (k === 'segment' && pointIds.length === 2) {
    const id = freshId(ctx, 's');
    const label = ctx.nextLabel('segment');
    ctx.store.dispatch({
      type: 'ADD',
      payload: { obj: mkSceneObj(id, 'segment', label, { p1: pointIds[0], p2: pointIds[1], color: '#0ea5e9' }) },
    });
    return;
  }
  if (k === 'line' && pointIds.length === 2) {
    const id = freshId(ctx, 'l');
    const label = ctx.nextLabel('line');
    ctx.store.dispatch({
      type: 'ADD',
      payload: { obj: mkSceneObj(id, 'line', label, { p1: pointIds[0], p2: pointIds[1], color: '#0ea5e9' }) },
    });
    return;
  }
  if (k === 'ray' && pointIds.length === 2) {
    const id = freshId(ctx, 'r');
    const label = ctx.nextLabel('ray');
    ctx.store.dispatch({
      type: 'ADD',
      payload: { obj: mkSceneObj(id, 'ray', label, { origin: pointIds[0], through: pointIds[1], color: '#0ea5e9' }) },
    });
    return;
  }
  if (k === 'vector' && pointIds.length === 2) {
    const id = freshId(ctx, 'v');
    const label = ctx.nextLabel('vector');
    ctx.store.dispatch({
      type: 'ADD',
      payload: { obj: mkSceneObj(id, 'vector', label, { from: pointIds[0], to: pointIds[1], color: '#0ea5e9' }) },
    });
    return;
  }
  if (k === 'circle' && pointIds.length === 2) {
    const id = freshId(ctx, 'c');
    const label = ctx.nextLabel('circle');
    ctx.store.dispatch({
      type: 'ADD',
      payload: { obj: mkSceneObj(id, 'circle', label, { center: pointIds[0], surfacePoint: pointIds[1], color: '#0ea5e9' }) },
    });
    return;
  }
  if (k === 'polygon' && pointIds.length >= 3) {
    const id = freshId(ctx, 'poly');
    const label = ctx.nextLabel('polygon');
    ctx.store.dispatch({
      type: 'ADD',
      payload: { obj: mkSceneObj(id, 'polygon', label, { vertices: pointIds, color: '#0ea5e9' }) },
    });
    return;
  }
  // Other kinds (angle/distance/derived line constructions) — biến hình không
  // có ý nghĩa định nghĩa. Bỏ qua.
}
