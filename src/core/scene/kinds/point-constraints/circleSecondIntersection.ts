// point-constraints/circleSecondIntersection.ts
import { definePointConstraint } from './_types';

export const circleSecondIntersectionConstraint = definePointConstraint({
  kind: 'circleSecondIntersection',
  // Không có describe-arm riêng trong point.ts → giữ fallback `Điểm ${label}`.
  describe: (obj) => `Điểm ${obj.label}`,
  render: (obj, ctx, c, opts) => {
    const board = ctx.jxg as any;
    // Giao điểm THỨ HAI của 2 đường tròn (c1 ∩ c2), biết điểm chung `exclude`.
    // JSXGraph 'otherintersection' nhận [curve1, curve2, knownPoint] → nghiệm còn lại.

    const k1: any = ctx.resolveRef(c.c1);

    const k2: any = ctx.resolveRef(c.c2);

    const ex: any = ctx.resolveRef(c.exclude);
    return board.create('otherintersection', [k1, k2, ex], opts);
  },
});
