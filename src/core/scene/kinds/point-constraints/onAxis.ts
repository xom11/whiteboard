// point-constraints/onAxis.ts
import { definePointConstraint } from './_types';

export const onAxisConstraint = definePointConstraint({
  kind: 'onAxis',
  describe: (obj, _state, c) => `${obj.label} trên trục ${c.axis}`,
  render: (obj, ctx, c, opts) => {
    const board = ctx.jxg as any;
    const coords: [number, number] = c.axis === 'x' ? [c.t, 0] : [0, c.t];
    return board.create('point', coords, opts);
  },
});
