// point-constraints/onLine.ts
import { definePointConstraint } from './_types';

export const onLineConstraint = definePointConstraint({
  kind: 'onLine',
  describe: (obj, state, c) => `${obj.label} trên đường ${state?.objects[c.lineId]?.label ?? c.lineId}`,
  render: (obj, ctx, c, opts) => {
    const board = ctx.jxg as any;
    const line = ctx.resolveRef(c.lineId) as any;
    const p1 = line.point1; const p2 = line.point2;
    const sx = (p1 && p2) ? p1.X() + c.t * (p2.X() - p1.X()) : c.t;
    const sy = (p1 && p2) ? p1.Y() + c.t * (p2.Y() - p1.Y()) : c.t;
    return board.create('glider', [sx, sy, line], opts);
  },
});
