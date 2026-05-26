import { objKind } from '../../tools';
import { safeJsx } from '../../../../shared/safeJsx';
import type { GeomTool, ToolDef } from '../../tools';
import type { HandlerCtx } from '../ctx';
import { dispatchAddFreePoint, freshId, mkSceneObj } from '../utils';

 
type JxgObj = any;

export function handlePolygonTool(
  ctx: HandlerCtx,
  t: GeomTool,
  toolDef: ToolDef,
   
  e: any,
  x: number,
  y: number,
  bestHit: JxgObj | null,
): boolean {
  if (toolDef.needs !== -1) return false;
  const snappedPoint: JxgObj | null =
    bestHit && objKind(bestHit) === 'point' ? bestHit : ctx.findNearestPointJxg(e, 12);
  const snappedId = snappedPoint ? ctx.jxgIdToSceneId(snappedPoint) : null;
  // Close ring: click back on first pending point.
  if (
    ctx.pendingIdsRef.current.length >= 3 &&
    snappedId &&
    snappedId === ctx.pendingIdsRef.current[0]
  ) {
    ctx.clearPreviewSegs();
    const vertices = ctx.pendingIdsRef.current.slice();
    const isArea = t === 'area';
    const id = freshId(ctx, isArea ? 'area' : 'poly');
    const label = ctx.nextLabel('polygon');
    // Tool 'area' = polygon + showValue + fill phân biệt visual với polygon
    // thường. JSXGraph polygon.Area() live-update khi đỉnh di chuyển.
    const attrs: Record<string, unknown> = { vertices };
    if (isArea) {
      attrs.showValue = true;
      attrs.fillOpacity = 0.18;
      attrs.color = '#1d4ed8';
    }
    ctx.store.dispatch({
      type: 'ADD',
      payload: { obj: mkSceneObj(id, 'polygon', label, attrs) },
    });
    ctx.clearPending();
    return true;
  }
  if (snappedId && ctx.pendingIdsRef.current.includes(snappedId)) {
    ctx.flashWarn('Đỉnh này đã có — click điểm khác hoặc click lại điểm đầu để đóng');
    return true;
  }
  // Otherwise pick (snap-to-existing or create) a new vertex.
  let pickId: string | null = snappedId;
  let pickJxg: JxgObj | null = snappedPoint;
  if (!pickId) {
    pickId = dispatchAddFreePoint(ctx, x, y);
    pickJxg = ctx.jxgFromSceneId(pickId);
  }
  // Live preview segment from previous vertex to new pick.
  if (ctx.pendingRef.current.length > 0 && ctx.boardRef.current && pickJxg) {
    const prev = ctx.pendingRef.current[ctx.pendingRef.current.length - 1];
    safeJsx('handlers.createPreviewSegment', () => {
      const seg = ctx.boardRef.current.create('segment', [prev, pickJxg], {
        strokeColor: '#3b82f6',
        strokeWidth: 1.5,
        strokeOpacity: 0.75,
        fixed: true,
        highlight: false,
        withLabel: false,
      });
      ctx.previewSegRef.current.push(seg);
    });
  }
  if (pickJxg) ctx.pendingRef.current.push(pickJxg);
  if (pickId) ctx.pendingIdsRef.current.push(pickId);
  ctx.setPendingCount(ctx.pendingIdsRef.current.length);
  return true;
}
