// point-constraints/tangencyPoint.ts
import { definePointConstraint } from './_types';

export const tangencyPointConstraint = definePointConstraint({
  kind: 'tangencyPoint',
  // Không có describe-arm riêng trong point.ts → giữ fallback `Điểm ${label}`.
  describe: (obj) => `Điểm ${obj.label}`,
  render: (obj, ctx, c, opts) => {
    const board = ctx.jxg as any;
    // Tiếp điểm = chân vuông góc hạ từ tâm đường tròn xuống đường tiếp tuyến.

    const circle: any = ctx.resolveRef(c.circle);

    const line: any = ctx.resolveRef(c.onLine);
    const O = circle?.center ?? circle?.midpoint ?? circle;
    return board.create('perpendicularpoint', [line, O], opts);
  },
});
