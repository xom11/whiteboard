// point-constraints/onSegment.ts
import { definePointConstraint } from './_types';

export const onSegmentConstraint = definePointConstraint({
  kind: 'onSegment',
  describe: (obj, state, c) => `${obj.label} trên đoạn ${state?.objects[c.segmentId]?.label ?? c.segmentId}`,
  render: (obj, ctx, c, opts) => {
    const board = ctx.jxg as any;
    const seg = ctx.resolveRef(c.segmentId) as any;
    const p1 = seg.point1; const p2 = seg.point2;
    const sx = (p1 && p2) ? p1.X() + c.t * (p2.X() - p1.X()) : c.t;
    const sy = (p1 && p2) ? p1.Y() + c.t * (p2.Y() - p1.Y()) : c.t;
    return board.create('glider', [sx, sy, seg], opts);
  },
});
