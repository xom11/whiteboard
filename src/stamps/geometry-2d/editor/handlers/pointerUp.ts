 
type JxgObj = any;

import { objKind } from '../tools';
import { safeJsx } from '../../../shared/safeJsx';
import type { HandlerCtx } from './ctx';

// ─── board.on('up') ───────────────────────────────────────────────────────────

 
export function handleUp(ctx: HandlerCtx, e: any): void {
  const t = ctx.toolRef.current;
  if (t === 'select') {
    const mq = ctx.marqueeRef.current;
    ctx.marqueeRef.current = null;
    ctx.moveDownRef.current = null;
    if (!mq) return;
    const sc = ctx.screenCoordsOf(e);
    if (!sc) return;
    const [ex, ey] = sc;
    if (mq.rect) { safeJsx('handlers.removeObject(marquee.rect)', () => ctx.boardRef.current?.removeObject(mq.rect)); }
    if (Math.hypot(ex - mq.startSx, ey - mq.startSy) < 4) return;  // not a real drag
    const x1 = Math.min(mq.startSx, ex), x2 = Math.max(mq.startSx, ex);
    const y1 = Math.min(mq.startSy, ey), y2 = Math.max(mq.startSy, ey);
    const board = ctx.boardRef.current;
    if (!board) return;
    const list = (board.objectsList || []) as JxgObj[];
    for (const o of list) {
      if (o === ctx.axisObjsRef.current.x || o === ctx.axisObjsRef.current.y) continue;
      const kind = objKind(o);
      if (kind === 'point') {
        const pc = o.coords?.scrCoords;
        if (!pc) continue;
        if (pc[1] >= x1 && pc[1] <= x2 && pc[2] >= y1 && pc[2] <= y2) {
          const sid = ctx.jxgIdToSceneId(o);
          if (sid && !ctx.selectedSetRef.current.has(sid)) {
            ctx.selectedSetRef.current.add(sid);
          }
        }
      } else if (kind === 'line' || kind === 'circle') {
         
        const defs: any[] = [o.point1, o.point2, o.center, o.midpoint, o.point3].filter(Boolean);
        const anyInside = defs.some((p) => {
          const pc = p?.coords?.scrCoords;
          return pc && pc[1] >= x1 && pc[1] <= x2 && pc[2] >= y1 && pc[2] <= y2;
        });
        if (anyInside) {
          const sid = ctx.jxgIdToSceneId(o);
          if (sid && !ctx.selectedSetRef.current.has(sid)) {
            ctx.selectedSetRef.current.add(sid);
          }
        }
      }
    }
    ctx.setSelectionTick((tt) => tt + 1);
    safeJsx('handlers.board.update(marquee)', () => board.update());
    return;
  }
  if (t !== 'move') return;
  const start = ctx.moveDownRef.current;
  ctx.moveDownRef.current = null;
  if (!start) return;
  const sc = ctx.screenCoordsOf(e);
  if (!sc) return;
  const [sx, sy] = sc;
  const moved = Math.hypot(sx - start.sx, sy - start.sy);
  if (moved > 4) return;  // drag, không phải click
  const hits = ctx.objectsAt(e)
    .map(ctx.promoteLabel)
    .filter((o) => o !== ctx.axisObjsRef.current.x && o !== ctx.axisObjsRef.current.y)
    .filter((o) => ctx.jxgIdToSceneId(o) != null);
  const best: JxgObj | null =
    hits.find((o) => objKind(o) === 'point') ?? ctx.findNearestPointJxg(e, 12) ?? hits[0] ?? null;
  if (!best) {
    ctx.lastMoveClickRef.current = { id: null, time: 0 };
    return;
  }
  const bestId = ctx.jxgIdToSceneId(best);
  const now = Date.now();
  const isDouble =
    bestId !== null && ctx.lastMoveClickRef.current.id === bestId && (now - ctx.lastMoveClickRef.current.time) < 400;
  ctx.lastMoveClickRef.current = { id: bestId, time: now };
  if (!isDouble) return;
  const cx = (e.clientX ?? e.touches?.[0]?.clientX ?? 0) as number;
  const cy = (e.clientY ?? e.touches?.[0]?.clientY ?? 0) as number;
  if (!bestId) return;
  ctx.emitSelect({ id: bestId, anchorScreen: { x: cx + 8, y: cy + 8 } });
}
