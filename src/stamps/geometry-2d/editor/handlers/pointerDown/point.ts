import { objKind } from '../../tools';
import { safeJsx } from '../../../../shared/safeJsx';
import type { HandlerCtx } from '../ctx';
import { dispatchAddFreePoint, dispatchAddIntersection } from '../utils';

 
type JxgObj = any;

export function handlePointTool(
  ctx: HandlerCtx,
   
  _e: any,
  x: number,
  y: number,
  hits: JxgObj[],
): void {
  const curves = hits.filter((o) => objKind(o) === 'line' || objKind(o) === 'circle');
  if (curves.length >= 2) {
    const a = curves[0];
    const b = curves[1];
    const aId = ctx.jxgIdToSceneId(a);
    const bId = ctx.jxgIdToSceneId(b);
    if (aId && bId) {
      try {
        const aKind = objKind(a);
        const bKind = objKind(b);
        if (aKind === 'line' && bKind === 'line') {
          dispatchAddIntersection(ctx, { kind: 'lineLine', ref1: aId, ref2: bId });
          return;
        }
        // line-circle / circle-circle: pick branch nearest click.
        const tmp0 = ctx.boardRef.current.create('intersection', [a, b, 0], { visible: false, withLabel: false });
        const tmp1 = ctx.boardRef.current.create('intersection', [a, b, 1], { visible: false, withLabel: false });
        const d0 = Math.hypot((tmp0.X?.() ?? 0) - x, (tmp0.Y?.() ?? 0) - y);
        const d1 = Math.hypot((tmp1.X?.() ?? 0) - x, (tmp1.Y?.() ?? 0) - y);
        safeJsx('handlers.removeObject(intersect.tmp0)', () => ctx.boardRef.current.removeObject(tmp0));
        safeJsx('handlers.removeObject(intersect.tmp1)', () => ctx.boardRef.current.removeObject(tmp1));
        const branch: 0 | 1 = d0 <= d1 ? 0 : 1;
        const isLineCircle = (aKind === 'line' && bKind === 'circle') || (aKind === 'circle' && bKind === 'line');
        if (isLineCircle) {
          dispatchAddIntersection(ctx, { kind: 'lineCircle', ref1: aId, ref2: bId, branch });
        } else {
          dispatchAddIntersection(ctx, { kind: 'circleCircle', ref1: aId, ref2: bId, branch });
        }
        return;
      } catch {
        // fallback: tạo điểm tự do
      }
    }
  }
  dispatchAddFreePoint(ctx, x, y);
}
