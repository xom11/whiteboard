// finalize/_types.ts
import type { ToolDef } from '../../tools';
import type { HandlerCtx } from '../ctx';

export interface GeometryToolModule {
  key: string;
  finalize(ctx: HandlerCtx, toolDef: ToolDef, clickXY?: { x: number; y: number }): void;
}
