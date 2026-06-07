// point-constraints/secondIntersection.ts
import { definePointConstraint } from './_types';

export const secondIntersectionConstraint = definePointConstraint({
  kind: 'secondIntersection',
  // Không có describe-arm riêng trong point.ts → giữ fallback `Điểm ${label}`.
  describe: (obj) => `Điểm ${obj.label}`,
  render: (obj, ctx, c, opts) => {
    const board = ctx.jxg as any;
    // Giao điểm thứ hai của line ∩ circle, biết giao điểm thứ nhất `other`.
    // JSXGraph 'otherintersection' nhận [curve, line, knownPoint].

    const line: any = ctx.resolveRef(c.line);

    const circle: any = ctx.resolveRef(c.circle);

    const other: any = ctx.resolveRef(c.other);
    return board.create('otherintersection', [circle, line, other], opts);
  },
});
