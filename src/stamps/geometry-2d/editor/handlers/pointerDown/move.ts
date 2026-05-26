import { objKind } from '../../tools';
import type { HandlerCtx } from '../ctx';

 
export function handleMoveTool(ctx: HandlerCtx, e: any): void {
  const sc = ctx.screenCoordsOf(e);
  if (!sc) return;
  const [sx, sy] = sc;
  ctx.moveDownRef.current = { sx, sy };
  const cx = (e.clientX ?? e.touches?.[0]?.clientX ?? 0) as number;
  const cy = (e.clientY ?? e.touches?.[0]?.clientY ?? 0) as number;
  ctx.lastClickClientRef.current = { x: cx, y: cy };

  // Click-select trong move tool (chế độ cơ bản): cho phép chọn 1 / shift-add
  // mà không cần switch sang tool 'select'. Hành vi drag điểm + pan nền của
  // JSXGraph vẫn nguyên (selection chỉ là side-effect, không stopPropagation).
  const hits = ctx.objectsAt(e)
    .map(ctx.promoteLabel)
    .filter((o) => o !== ctx.axisObjsRef.current.x && o !== ctx.axisObjsRef.current.y)
    .filter((o) => ctx.jxgIdToSceneId(o) != null);
  const obj = hits.find((o) => objKind(o) === 'point') ?? ctx.findNearestPointJxg(e, 12) ?? hits[0];
  if (obj) {
    const sid = ctx.jxgIdToSceneId(obj);
    if (sid) {
      const shift = !!(e.shiftKey || e.altKey);
      ctx.toggleSelect(sid, shift);
    }
    return;
  }
  // Empty space + không additive: clear selection (popover sẽ tự đóng qua
  // selectionTick effect ở MiniBoard).
  if (!(e.shiftKey || e.altKey)) ctx.clearSelection();
}
