// point-constraints/onPolygon.ts
import { definePointConstraint } from './_types';

export const onPolygonConstraint = definePointConstraint({
  kind: 'onPolygon',
  describe: (obj, state, c) => `${obj.label} trên đa giác ${state?.objects[c.polygonId]?.label ?? c.polygonId}`,
  render: (obj, ctx, c, opts) => {
    const board = ctx.jxg as any;
    const poly = ctx.resolveRef(c.polygonId) as any;
    return board.create('glider', [c.u, c.v, poly], opts);
  },
});
