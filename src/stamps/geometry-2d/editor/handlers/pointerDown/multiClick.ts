import { objKind, type ToolDef } from '../../tools';
import type { HandlerCtx } from '../ctx';
import { dispatchAddFreePoint } from '../utils';
import { finalizeShape } from '../finalizeShape';
import { finalizeTransform } from '../transform';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JxgObj = any;

export function handleMultiClickTool(
  ctx: HandlerCtx,
  toolDef: ToolDef,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  e: any,
  x: number,
  y: number,
  hits: JxgObj[],
  bestHit: JxgObj | null,
): void {
  let pick: JxgObj | null = null;
  let pickId: string | null = null;

  if (toolDef.accepts) {
    // --- Mode A: strict, order-flexible ---
    const usedKinds = ctx.pendingRef.current.map((p) => objKind(p));
    const remaining: Array<'point' | 'line' | 'circle' | 'any'> = [...toolDef.accepts];
    for (const u of usedKinds) {
      if (u === 'other') continue;
      const i = remaining.indexOf(u);
      if (i >= 0) remaining.splice(i, 1);
    }
    const strictPoint = hits.find((o) => objKind(o) === 'point') ?? null;
    const lineHit = hits.find((o) => objKind(o) === 'line') ?? null;
    const circleHit = hits.find((o) => objKind(o) === 'circle') ?? null;
    if (remaining.includes('point') && strictPoint) pick = strictPoint;
    else if (remaining.includes('line') && lineHit) pick = lineHit;
    else if (remaining.includes('circle') && circleHit) pick = circleHit;
    else if (remaining.includes('any') && (strictPoint || lineHit || circleHit)) {
      pick = strictPoint ?? lineHit ?? circleHit;
    } else if (remaining.includes('point')) {
      const near = ctx.findNearestPointJxg(e, 12);
      if (near) pick = near;
    }
    if (!pick) {
      const needs = remaining.map((k) =>
        k === 'point' ? 'một điểm' : k === 'line' ? 'một đường/đoạn' : k === 'circle' ? 'một đường tròn' : 'một đối tượng',
      );
      ctx.flashWarn(`Còn cần click vào ${needs.join(' + ')} có sẵn`);
      return;
    }
    if (ctx.pendingRef.current.includes(pick)) {
      ctx.flashWarn('Đã chọn đối tượng này — chọn đối tượng khác');
      return;
    }
    pickId = ctx.jxgIdToSceneId(pick);
  } else {
    // --- Mode B: lenient, all slots want a point ---
    const snapped = bestHit && objKind(bestHit) === 'point' ? bestHit : ctx.findNearestPointJxg(e, 12);
    if (snapped && ctx.pendingRef.current.includes(snapped)) {
      ctx.flashWarn('Đã chọn điểm này — chọn điểm khác hoặc click chỗ trống');
      return;
    }
    if (snapped) {
      pick = snapped;
      pickId = ctx.jxgIdToSceneId(snapped);
    } else {
      pickId = dispatchAddFreePoint(ctx, x, y);
      pick = ctx.jxgFromSceneId(pickId);
    }
  }

  if (!pick) return;
  ctx.pendingRef.current.push(pick);
  if (pickId) ctx.pendingIdsRef.current.push(pickId);
  ctx.setPendingCount(ctx.pendingIdsRef.current.length);

  if (ctx.pendingIdsRef.current.length >= toolDef.needs) {
    const tk = toolDef.key;
    // 3 popover transform tools cần numeric input (góc / tỷ số / số cạnh) trước
    // khi finalize → emit info để MiniBoard show TransformParamPopover.
    if (tk === 'rotate' || tk === 'dilate' || tk === 'regularPolygon') {
      const cx = ((e.clientX ?? 0) as number) + 8;
      const cy = ((e.clientY ?? 0) as number) + 8;
      ctx.pendingTransformRef.current = {
        tool: tk,
        pendingIds: ctx.pendingIdsRef.current.slice(),
        anchorScreen: { x: cx, y: cy },
      };
      ctx.emitTransform({ tool: tk, anchor: { x: cx, y: cy } });
      // Don't clearPending — wait for confirm/cancel from MiniBoard.
      return;
    }
    // 3 no-popover transform tools (translate/reflectLine/reflectPoint):
    // finalize ngay khi đủ pick — không cần numeric param.
    if (tk === 'translate' || tk === 'reflectLine' || tk === 'reflectPoint') {
      finalizeTransform(ctx, tk, ctx.pendingIdsRef.current.slice(), 0);
      ctx.clearPending();
      return;
    }

    // Non-transform multi-click tools: dispatch ADD for the shape directly.
    finalizeShape(ctx, toolDef);
    ctx.clearPending();
  } else {
    ctx.refreshPreview();
  }
}
