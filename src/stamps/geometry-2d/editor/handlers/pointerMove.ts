import { safeJsx } from '../../../shared/safeJsx';
import type { HandlerCtx } from './ctx';

// ─── board.on('move') ────────────────────────────────────────────────────────

 
export function handleMove(ctx: HandlerCtx, e: any): void {
  // Marquee rectangle redraw while user drags with the select tool on empty space.
  if (ctx.toolRef.current === 'select' && ctx.marqueeRef.current) {
    const sc = ctx.screenCoordsOf(e);
    if (sc && ctx.boardRef.current) {
      const [sx, sy] = sc;
      const { startSx, startSy } = ctx.marqueeRef.current;
      const b = ctx.boardRef.current;
      const ux1 = b.screenCoords2userCoords?.([Math.min(startSx, sx), Math.min(startSy, sy)]) ?? null;
      const ux2 = b.screenCoords2userCoords?.([Math.max(startSx, sx), Math.max(startSy, sy)]) ?? null;
      const toUsr = (px: number, py: number): [number, number] => {
        const ox = b.origin?.scrCoords?.[1] ?? 0;
        const oy = b.origin?.scrCoords?.[2] ?? 0;
        const ux = (px - ox) / b.unitX;
        const uy = (oy - py) / b.unitY;
        return [ux, uy];
      };
      const [x1u, y1u] = ux1 && ux1.length >= 2 ? [ux1[0], ux1[1]] : toUsr(Math.min(startSx, sx), Math.min(startSy, sy));
      const [x2u, y2u] = ux2 && ux2.length >= 2 ? [ux2[0], ux2[1]] : toUsr(Math.max(startSx, sx), Math.max(startSy, sy));
      const rect = ctx.marqueeRef.current.rect;
      if (rect) {
        safeJsx('handlers.removeObject(marquee.prevRect)', () => ctx.boardRef.current.removeObject(rect));
      }
      safeJsx('handlers.createMarqueePolygon', () => {
        ctx.marqueeRef.current!.rect = ctx.boardRef.current.create('polygon', [
          [x1u, y1u], [x2u, y1u], [x2u, y2u], [x1u, y2u],
        ], {
          fillColor: '#06b6d4', fillOpacity: 0.08,
          borders: { strokeColor: '#06b6d4', strokeWidth: 1, dash: 2 },
          vertices: { visible: false },
          fixed: true, highlight: false, withLabel: false,
        });
      });
    }
    return;
  }
  const ph = ctx.phantomRef.current;
  if (!ph || !ctx.boardRef.current) return;
  if (ctx.previewRafRef.current != null) return;
  ctx.previewRafRef.current = requestAnimationFrame(() => {
    ctx.previewRafRef.current = null;
    if (!ctx.boardRef.current || !ctx.phantomRef.current) return;
    safeJsx('handlers.phantomMove', () => {
      const coords = ctx.boardRef.current.getUsrCoordsOfMouse(e);
       
      const JXG: any = ctx.jxgRef.current;
      if (!JXG) return;
      ctx.phantomRef.current.setPositionDirectly(JXG.COORDS_BY_USER, [coords[0], coords[1]]);
      ctx.boardRef.current.update();
    });
  });
}
