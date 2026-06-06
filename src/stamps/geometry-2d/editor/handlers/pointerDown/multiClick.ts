import { objKind, type ToolDef } from '../../tools';
import type { HandlerCtx } from '../ctx';
import { dispatchAddFreePoint } from '../utils';
import { finalizeShape } from '../finalizeShape';
import { finalizeTransform } from '../transform';

 
type JxgObj = any;

export function handleMultiClickTool(
  ctx: HandlerCtx,
  toolDef: ToolDef,
   
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
    const remaining: Array<'point' | 'line' | 'circle' | 'any' | 'lineOrCircle' | 'pointOrLine'> = [...toolDef.accepts];
    for (const u of usedKinds) {
      if (u === 'other') continue;
      // 'lineOrCircle' slot có thể được lấp bởi line hoặc circle.
      // 'pointOrLine' slot có thể được lấp bởi point hoặc line.
      let i = remaining.indexOf(u);
      if (i < 0 && (u === 'line' || u === 'circle')) i = remaining.indexOf('lineOrCircle');
      if (i < 0 && (u === 'point' || u === 'line')) i = remaining.indexOf('pointOrLine');
      if (i >= 0) remaining.splice(i, 1);
    }
    const strictPoint = hits.find((o) => objKind(o) === 'point') ?? null;
    const lineHit = hits.find((o) => objKind(o) === 'line') ?? null;
    const circleHit = hits.find((o) => objKind(o) === 'circle') ?? null;
    if (remaining.includes('point') && strictPoint) pick = strictPoint;
    else if (remaining.includes('line') && lineHit) pick = lineHit;
    else if (remaining.includes('circle') && circleHit) pick = circleHit;
    else if (remaining.includes('lineOrCircle') && (lineHit || circleHit)) {
      pick = lineHit ?? circleHit;
    }
    else if (remaining.includes('pointOrLine') && (strictPoint || lineHit)) {
      pick = strictPoint ?? lineHit;
    }
    else if (remaining.includes('any') && (strictPoint || lineHit || circleHit)) {
      pick = strictPoint ?? lineHit ?? circleHit;
    } else if (remaining.includes('point') || remaining.includes('pointOrLine')) {
      const near = ctx.findNearestPointJxg(e, 12);
      if (near) {
        pick = near;
      } else {
        // Mode A tool nhận 'point' / 'pointOrLine' + click khu vực rỗng → tự tạo
        // free point tại vị trí click. Đỡ cho user phải đổi sang tool 'point'
        // rồi quay lại (tangent / perpendicular / parallel / angleBisector ...).
        // Các slot khác (line/circle) vẫn yêu cầu hit object có sẵn.
        //
        // angleBisector: nếu lần click đầu đã là line thì cấm tạo free-point
        // (mode 2-line đã chốt) — handled by mode-consistency check phía dưới.
        //
        // pickId set trực tiếp từ return value của dispatchAddFreePoint vì
        // reverse-map (jxgIdToSceneRef) được rebuild qua store subscribe →
        // chưa sync xong tại thời điểm này; gọi jxgIdToSceneId(pick) sẽ ra null.
        if (toolDef.key === 'angleBisector' && ctx.pendingRef.current.length > 0
            && objKind(ctx.pendingRef.current[0]) === 'line') {
          ctx.flashWarn('Đã chọn đường — click thêm 1 đường/đoạn nữa để tạo 2 tia phân giác');
          return;
        }
        pickId = dispatchAddFreePoint(ctx, x, y);
        pick = ctx.jxgFromSceneId(pickId);
      }
    }
    if (!pick) {
      const needs = remaining.map((k) =>
        k === 'point' ? 'một điểm'
        : k === 'line' ? 'một đường/đoạn'
        : k === 'circle' ? 'một đường tròn'
        : k === 'lineOrCircle' ? 'một đường hoặc đường tròn'
        : k === 'pointOrLine' ? 'một điểm hoặc đường/đoạn'
        : 'một đối tượng',
      );
      ctx.flashWarn(`Còn cần click vào ${needs.join(' + ')} có sẵn`);
      return;
    }
    if (ctx.pendingRef.current.includes(pick)) {
      ctx.flashWarn('Đã chọn đối tượng này — chọn đối tượng khác');
      return;
    }
    // angleBisector: ép tính nhất quán mode (3-point ↔ 2-line) — không trộn lẫn.
    if (toolDef.key === 'angleBisector' && ctx.pendingRef.current.length > 0) {
      const firstKind = objKind(ctx.pendingRef.current[0]);
      const newKind = objKind(pick);
      if (firstKind === 'line' && newKind !== 'line') {
        ctx.flashWarn('Đã chọn đường — chỉ click thêm 1 đường/đoạn nữa');
        return;
      }
      if (firstKind === 'point' && newKind !== 'point') {
        ctx.flashWarn('Đã chọn điểm — click thêm điểm (đỉnh ở giữa)');
        return;
      }
    }
    if (!pickId) pickId = ctx.jxgIdToSceneId(pick);
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

  // angleBisector 2-line mode: finalize ngay khi đủ 2 đường (không chờ 3 picks).
  if (toolDef.key === 'angleBisector'
      && ctx.pendingIdsRef.current.length === 2
      && objKind(ctx.pendingRef.current[0]) === 'line') {
    finalizeShape(ctx, toolDef);
    ctx.clearPending();
    return;
  }

  if (ctx.pendingIdsRef.current.length >= toolDef.needs) {
    const tk = toolDef.key;
    // 3 popover transform tools cần numeric input (góc / tỷ số / số cạnh) trước
    // khi finalize → emit info để MiniBoard show TransformParamPopover.
    if (tk === 'rotate' || tk === 'dilate' || tk === 'regularPolygon' || tk === 'circleCR') {
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
    // Truyền toạ độ click (board coords) để pointOn tính theta/t bám vị trí.
    finalizeShape(ctx, toolDef, { x, y });
    ctx.clearPending();
  } else {
    ctx.refreshPreview();
  }
}
