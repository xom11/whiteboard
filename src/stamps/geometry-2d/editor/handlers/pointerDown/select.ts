import { objKind } from '../../tools';
import type { HandlerCtx } from '../ctx';

 
export function handleSelectTool(ctx: HandlerCtx, e: any): void {
  const sc = ctx.screenCoordsOf(e);
  if (!sc) return;
  const [sx, sy] = sc;
  const cx = (e.clientX ?? e.touches?.[0]?.clientX ?? 0) as number;
  const cy = (e.clientY ?? e.touches?.[0]?.clientY ?? 0) as number;
  ctx.lastClickClientRef.current = { x: cx, y: cy };
  const hits = ctx.objectsAt(e)
    .map(ctx.promoteLabel)
    .filter((o) => o !== ctx.axisObjsRef.current.x && o !== ctx.axisObjsRef.current.y)
    .filter((o) => ctx.jxgIdToSceneId(o) != null);
  // Ưu tiên điểm: exact hit → nearest-within-12px → mới đến hit khác (line/circle).
  const obj = hits.find((o) => objKind(o) === 'point') ?? ctx.findNearestPointJxg(e, 12) ?? hits[0];
  if (obj) {
    const sid = ctx.jxgIdToSceneId(obj);
    if (sid) {
      const shift = !!(e.shiftKey || e.altKey);
      ctx.toggleSelect(sid, shift);
    }
    ctx.moveDownRef.current = { sx, sy };
    ctx.marqueeRef.current = null;
    return;
  }
  // Empty space: start marquee.
  ctx.marqueeRef.current = { startSx: sx, startSy: sy };
  if (!(e.shiftKey || e.altKey)) ctx.clearSelection();
}
