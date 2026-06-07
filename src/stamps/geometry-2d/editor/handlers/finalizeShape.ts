import type { ToolDef } from '../tools';
import type { HandlerCtx } from './ctx';
import { TOOL_MODULES } from './finalize/registry';

// ─── Finalize shape (dispatch ADD per tool) ──────────────────────────────────

export function finalizeShape(ctx: HandlerCtx, toolDef: ToolDef, clickXY?: { x: number; y: number }): void {
  TOOL_MODULES.get(toolDef.key)?.finalize(ctx, toolDef, clickXY);
}
