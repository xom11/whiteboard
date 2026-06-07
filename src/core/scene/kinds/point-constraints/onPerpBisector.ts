// point-constraints/onPerpBisector.ts
import { definePointConstraint } from './_types';

export const onPerpBisectorConstraint = definePointConstraint({
  kind: 'onPerpBisector',
  describe: (obj) => `Điểm ${obj.label}`,
  render: (obj, ctx, c, opts) => {
    const board = ctx.jxg as any;
    // Glider trên trung trực của (p1, p2). Build từ midpoint + perpendicular
    // (cùng pattern với line.ts perpBisector — JSXGraph 'perpendicular' trả
    // về line infinite, dùng làm parent cho glider an toàn hơn so với
    // 'perpendicularsegment').

    const A: any = ctx.resolveRef(c.p1);

    const B: any = ctx.resolveRef(c.p2);
    const hide = { visible: false, withLabel: false, fixed: true, name: '' };
    const refLine = board.create('line', [A, B], hide);
    const mid = board.create('midpoint', [A, B], hide);
    const bisLine = board.create('perpendicular', [refLine, mid], hide);
    const Mx = (A.X() + B.X()) / 2;
    const My = (A.Y() + B.Y()) / 2;
    const dx = B.X() - A.X();
    const dy = B.Y() - A.Y();
    const len = Math.hypot(dx, dy) || 1;
    const ux = -dy / len;
    const uy = dx / len;
    const x0 = Mx + c.t * ux;
    const y0 = My + c.t * uy;

    const gl: any = board.create('glider', [x0, y0, bisLine], opts);
    gl._helpers = [refLine, mid, bisLine];
    return gl;
  },
});
