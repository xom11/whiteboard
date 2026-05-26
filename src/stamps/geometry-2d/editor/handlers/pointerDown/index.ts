import { objKind, TOOLS } from '../../tools';
import type { HandlerCtx } from '../ctx';
import { handleMoveTool } from './move';
import { handleSelectTool } from './select';
import { handlePointTool } from './point';
import { handleSingleTargetTool } from './singleTarget';
import { handlePolygonTool } from './polygon';
import { handleMultiClickTool } from './multiClick';

 
export function handleDown(ctx: HandlerCtx, e: any): void {
  if (!ctx.boardRef.current) return;
  const t = ctx.toolRef.current;

  if (t === 'move') return handleMoveTool(ctx, e);
  if (t === 'select') return handleSelectTool(ctx, e);

  const toolDef = TOOLS.find((td) => td.key === t);
  if (!toolDef) return;

  const coords = ctx.boardRef.current.getUsrCoordsOfMouse(e);
  const x = coords[0], y = coords[1];

  // Detect if click hits any existing object (snap target).
  // Filter hits không có scene id (vd auxiliary points của 'regularpolygon' do
  // JSXGraph tự sinh — không có id trong renderer.elements, không thể dùng làm
  // pick cho tool). Nếu không filter, aux point sẽ cướp click khỏi border/edge
  // bên cạnh, làm tool perp/parallel/... đứng yên không tiến tới needs.
  const hits = ctx.objectsAt(e)
    .map(ctx.promoteLabel)
    .filter((o) => o !== ctx.axisObjsRef.current.x && o !== ctx.axisObjsRef.current.y)
    .filter((o) => ctx.jxgIdToSceneId(o) != null);
  const bestHit = hits.find((o) => objKind(o) === 'point') ?? hits[0] ?? null;

  if (t === 'point') return handlePointTool(ctx, e, x, y, hits);
  if (handleSingleTargetTool(ctx, t, toolDef, e, bestHit)) return;
  if (handlePolygonTool(ctx, t, toolDef, e, x, y, bestHit)) return;

  handleMultiClickTool(ctx, toolDef, e, x, y, hits, bestHit);
}
