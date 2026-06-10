// point-constraints/arcMidpoint.ts
import { arcMidpoint } from '../pointConstructions';
import { definePointConstraint } from './_types';

export const arcMidpointConstraint = definePointConstraint({
  kind: 'arcMidpoint',
  validate: (c) => {
    if (!c.circle || !c.a || !c.b) {
      throw new Error('point.arcMidpoint: circle, a, b bắt buộc');
    }
    // TỐI ĐA 1 trong notContaining / containing. Cho phép KHÔNG có (cung không
    // mơ hồ — vd nửa đường tròn đường kính AB → điểm chính giữa duy nhất).
    if (c.notContaining && c.containing) {
      throw new Error('point.arcMidpoint: không thể vừa notContaining vừa containing');
    }
  },
  describe: (obj, state, c) => {
    const al = state?.objects[c.a]?.label ?? c.a;
    const bl = state?.objects[c.b]?.label ?? c.b;
    const ref = c.containing ?? c.notContaining;
    if (!ref) return `${obj.label} = trung điểm cung ${al}${bl}`;
    const rl = state?.objects[ref]?.label ?? ref;
    const rel = c.containing ? 'chứa' : 'không chứa';
    return `${obj.label} = trung điểm cung ${al}${bl} (${rel} ${rl})`;
  },
  render: (obj, ctx, c, opts) => {
    const board = ctx.jxg as any;
    const circle: any = ctx.resolveRef(c.circle);
    const A: any = ctx.resolveRef(c.a);
    const B: any = ctx.resolveRef(c.b);
    const refName = c.containing ?? c.notContaining;
    const ref: any = refName ? ctx.resolveRef(refName) : undefined;
    const sameSide = !!c.containing;
    const O = circle?.center ?? circle?.midpoint ?? circle;
    const am = () => arcMidpoint(
      [O.X(), O.Y()], circle.Radius(),
      [A.X(), A.Y()], [B.X(), B.Y()], ref ? [ref.X(), ref.Y()] : undefined, sameSide,
    );
    return board.create('point', [() => am()[0], () => am()[1]], opts);
  },
});
