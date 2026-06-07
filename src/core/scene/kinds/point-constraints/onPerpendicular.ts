// point-constraints/onPerpendicular.ts
import { definePointConstraint } from './_types';

export const onPerpendicularConstraint = definePointConstraint({
  kind: 'onPerpendicular',
  describe: (obj) => `Điểm ${obj.label}`,
  render: (obj, ctx, c, opts) => {
    const board = ctx.jxg as any;
    // Glider trên đường vuông góc qua `through`, vuông góc với line(perpToA, perpToB).
    // Aux line + perp line hidden; glider parent = perp line.

    const T: any = ctx.resolveRef(c.through);

    const A: any = ctx.resolveRef(c.perpToA);

    const B: any = ctx.resolveRef(c.perpToB);
    const hide = { visible: false, withLabel: false, fixed: true, name: '' };
    const refLine = board.create('line', [A, B], hide);
    const perpLine = board.create('perpendicular', [refLine, T], hide);
    // Initial coords: T + t * unit(perp(A→B))
    const dx = B.X() - A.X();
    const dy = B.Y() - A.Y();
    const len = Math.hypot(dx, dy) || 1;
    const ux = -dy / len;
    const uy = dx / len;
    const x0 = T.X() + c.t * ux;
    const y0 = T.Y() + c.t * uy;

    const gl: any = board.create('glider', [x0, y0, perpLine], opts);
    gl._helpers = [refLine, perpLine];
    return gl;
  },
});
