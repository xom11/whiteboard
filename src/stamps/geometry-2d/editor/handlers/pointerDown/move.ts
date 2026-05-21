import type { HandlerCtx } from '../ctx';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function handleMoveTool(ctx: HandlerCtx, e: any): void {
  const sc = ctx.screenCoordsOf(e);
  if (!sc) return;
  const [sx, sy] = sc;
  ctx.moveDownRef.current = { sx, sy };
}
