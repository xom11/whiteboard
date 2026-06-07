// point-constraints/onCircleAroundPoint.ts
import { definePointConstraint } from './_types';

export const onCircleAroundPointConstraint = definePointConstraint({
  kind: 'onCircleAroundPoint',
  describe: (obj) => `Điểm ${obj.label}`,
  render: (obj, ctx, c, opts) => {
    const board = ctx.jxg as any;
    // Glider trên vòng tròn tâm `center`, qua `radiusPoint`.

    const C: any = ctx.resolveRef(c.center);

    const R: any = ctx.resolveRef(c.radiusPoint);
    const hide = { visible: false, withLabel: false, fixed: true, name: '' };
    const auxCircle = board.create('circle', [C, R], hide);
    const r = Math.hypot(R.X() - C.X(), R.Y() - C.Y());
    const x0 = C.X() + r * Math.cos(c.theta);
    const y0 = C.Y() + r * Math.sin(c.theta);

    const gl: any = board.create('glider', [x0, y0, auxCircle], opts);
    gl._helpers = [auxCircle];
    return gl;
  },
});
