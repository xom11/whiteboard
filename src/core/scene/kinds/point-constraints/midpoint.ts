// point-constraints/midpoint.ts
import { definePointConstraint } from './_types';

export const midpointConstraint = definePointConstraint({
  kind: 'midpoint',
  describe: (obj, state, c) => {
    const l1 = state?.objects[c.p1]?.label ?? c.p1;
    const l2 = state?.objects[c.p2]?.label ?? c.p2;
    return `${obj.label} = trung điểm ${l1}${l2}`;
  },
  render: (obj, ctx, c, opts) => {
    const board = ctx.jxg as any;
    const p1 = ctx.resolveRef(c.p1) as any;
    const p2 = ctx.resolveRef(c.p2) as any;
    return board.create('midpoint', [p1, p2], opts);
  },
});
