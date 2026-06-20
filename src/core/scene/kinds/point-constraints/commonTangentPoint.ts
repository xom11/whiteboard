// point-constraints/commonTangentPoint.ts
//
// Tiếp điểm của tiếp tuyến CHUNG 2 đường tròn. Render FUNCTIONAL (như
// pointAtDistance): đọc tâm+R sống của 2 đtròn JSXGraph → computeCommonTangentPoint
// → trả [x,y] (cập nhật khi kéo tâm). Đặt TRƯỚC fallback [0,0].
import { computeCommonTangentPoint } from '../../../../stamps/geometry-2d/geometry/commonTangent';
import { definePointConstraint } from './_types';

export const commonTangentPointConstraint = definePointConstraint({
  kind: 'commonTangentPoint',
  describe: (obj, state, c) => {
    const c1 = state?.objects[c.circles[0]]?.label ?? c.circles[0];
    const c2 = state?.objects[c.circles[1]]?.label ?? c.circles[1];
    const v = c.variant === 'internal' ? 'trong' : 'ngoài';
    return `${obj.label} = tiếp điểm tiếp tuyến chung ${v} ${c1},${c2} (trên ${c.on === 0 ? c1 : c2})`;
  },
  render: (obj, ctx, c, opts) => {
    const board = ctx.jxg as any;
    const k1: any = ctx.resolveRef(c.circles[0]);
    const k2: any = ctx.resolveRef(c.circles[1]);
    const O1 = k1?.center ?? k1?.midpoint ?? k1;
    const O2 = k2?.center ?? k2?.midpoint ?? k2;
    const compute = (): [number, number] => {
      const t = computeCommonTangentPoint(
        [O1.X(), O1.Y()], k1.Radius(),
        [O2.X(), O2.Y()], k2.Radius(),
        c.on, c.variant, c.side,
      );
      return t ?? [0, 0];
    };
    return board.create('point', [() => compute()[0], () => compute()[1]], opts);
  },
});
