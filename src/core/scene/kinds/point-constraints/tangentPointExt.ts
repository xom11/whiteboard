// point-constraints/tangentPointExt.ts
import { definePointConstraint } from './_types';

export const tangentPointExtConstraint = definePointConstraint({
  kind: 'tangentPointExt',
  describe: (obj, state, c) => {
    const fromLabel = state?.objects[c.from]?.label ?? c.from;
    const circleLabel = state?.objects[c.circle]?.label ?? c.circle;
    return `${obj.label} = tiếp điểm của (${circleLabel}) với tiếp tuyến từ ${fromLabel}`;
  },
  render: (obj, ctx, c, opts) => {
    const board = ctx.jxg as any;
    // Tiếp điểm của tiếp tuyến vẽ từ điểm ngoài `from` tới đường tròn `circle`.
    // Construction: lấy O = tâm đường tròn → mid = trung điểm(from, O) → Thales
    // = đường tròn đường kính from-O (do góc nội tiếp 90° = tiếp tuyến vuông
    // góc với bán kính tại tiếp điểm). Tiếp điểm = giao của Thales với circle,
    // nhánh 0/1 chọn 1 trong 2 nghiệm.

    const P: any = ctx.resolveRef(c.from);
    const K: any = ctx.resolveRef(c.circle);
    const O: any = K.center ?? K.midpoint;
    const hide = { visible: false, withLabel: false, fixed: true, name: '' };
    const mid = board.create('midpoint', [P, O], hide);
    const thales = board.create('circle', [mid, P], hide);
    const inter: any = board.create('intersection', [thales, K, c.which], opts);
    inter._helpers = [mid, thales];
    return inter;
  },
});
