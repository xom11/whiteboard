// point-constraints/free.ts
import { definePointConstraint } from './_types';

export const freeConstraint = definePointConstraint({
  kind: 'free',
  describe: (obj) => `Điểm ${obj.label}`,
  render: (obj, ctx, c, opts) => {
    const board = ctx.jxg as any;
    return board.create('point', [c.x, c.y], opts);
  },
});
