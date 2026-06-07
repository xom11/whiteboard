// point-constraints/circleIntersection.ts
import { definePointConstraint } from './_types';

export const circleIntersectionConstraint = definePointConstraint({
  kind: 'circleIntersection',
  // Không có describe-arm riêng trong point.ts → giữ fallback `Điểm ${label}`.
  describe: (obj) => `Điểm ${obj.label}`,
  render: (obj, ctx, c, opts) => {
    const board = ctx.jxg as any;
    // Giao 2 đường tròn — JSXGraph 'intersection' nhận branch 0/1.

    const k1: any = ctx.resolveRef(c.c1);

    const k2: any = ctx.resolveRef(c.c2);
    return board.create('intersection', [k1, k2, c.which], opts);
  },
});
