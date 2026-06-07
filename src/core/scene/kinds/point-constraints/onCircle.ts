// point-constraints/onCircle.ts
import { definePointConstraint } from './_types';

export const onCircleConstraint = definePointConstraint({
  kind: 'onCircle',
  describe: (obj, state, c) => `${obj.label} trên đường tròn ${state?.objects[c.circleId]?.label ?? c.circleId}`,
  render: (obj, ctx, c, opts) => {
    const board = ctx.jxg as any;
    const circle = ctx.resolveRef(c.circleId) as any;
    const O = circle.center ?? circle.midpoint;
    const ox = O ? O.X() : 0; const oy = O ? O.Y() : 0;
    return board.create('glider', [ox + Math.cos(c.theta), oy + Math.sin(c.theta), circle], opts);
  },
});
