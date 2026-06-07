// point-constraints/arcMidpoint.ts
import { arcMidpoint } from '../pointConstructions';
import { definePointConstraint } from './_types';

export const arcMidpointConstraint = definePointConstraint({
  kind: 'arcMidpoint',
  validate: (c) => {
    if (!c.circle || !c.a || !c.b || !c.notContaining) {
      throw new Error('point.arcMidpoint: circle, a, b, notContaining bắt buộc');
    }
  },
  describe: (obj, state, c) => {
    const al = state?.objects[c.a]?.label ?? c.a;
    const bl = state?.objects[c.b]?.label ?? c.b;
    const nl = state?.objects[c.notContaining]?.label ?? c.notContaining;
    return `${obj.label} = trung điểm cung ${al}${bl} (không chứa ${nl})`;
  },
  render: (obj, ctx, c, opts) => {
    const board = ctx.jxg as any;
    const circle: any = ctx.resolveRef(c.circle);
    const A: any = ctx.resolveRef(c.a);
    const B: any = ctx.resolveRef(c.b);
    const N: any = ctx.resolveRef(c.notContaining);
    const O = circle?.center ?? circle?.midpoint ?? circle;
    const am = () => arcMidpoint(
      [O.X(), O.Y()], circle.Radius(),
      [A.X(), A.Y()], [B.X(), B.Y()], [N.X(), N.Y()],
    );
    return board.create('point', [() => am()[0], () => am()[1]], opts);
  },
});
