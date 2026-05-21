import { objKind, TOOLS } from '../../tools';
import type { HandlerCtx } from '../ctx';
import { handleMoveTool } from './move';
import { handleSelectTool } from './select';
import { handlePointTool } from './point';
import { handleSingleTargetTool } from './singleTarget';
import { handlePolygonTool } from './polygon';
import { handleMultiClickTool } from './multiClick';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  const hits = ctx.objectsAt(e)
    .map(ctx.promoteLabel)
    .filter((o) => o !== ctx.axisObjsRef.current.x && o !== ctx.axisObjsRef.current.y);
  const bestHit = hits.find((o) => objKind(o) === 'point') ?? hits[0] ?? null;

  if (t === 'point') return handlePointTool(ctx, e, x, y, hits);
  if (handleSingleTargetTool(ctx, t, toolDef, e, bestHit)) return;
  if (handlePolygonTool(ctx, t, toolDef, e, x, y, bestHit)) return;

  handleMultiClickTool(ctx, toolDef, e, x, y, hits, bestHit);
}
