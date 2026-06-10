// point-constraints/arcMidpoint.ts
import { arcMidpoint } from '../pointConstructions';
import { definePointConstraint } from './_types';

export const arcMidpointConstraint = definePointConstraint({
  kind: 'arcMidpoint',
  validate: (c) => {
    if (!c.circle || !c.a || !c.b) {
      throw new Error('point.arcMidpoint: circle, a, b bắt buộc');
    }
    // Đúng 1 trong notContaining / containing.
    if (!!c.notContaining === !!c.containing) {
      throw new Error('point.arcMidpoint: cần đúng 1 của notContaining | containing');
    }
  },
  describe: (obj, state, c) => {
    const al = state?.objects[c.a]?.label ?? c.a;
    const bl = state?.objects[c.b]?.label ?? c.b;
    const ref = (c.containing ?? c.notContaining)!;
    const rl = state?.objects[ref]?.label ?? ref;
    const rel = c.containing ? 'chứa' : 'không chứa';
    return `${obj.label} = trung điểm cung ${al}${bl} (${rel} ${rl})`;
  },
  render: (obj, ctx, c, opts) => {
    const board = ctx.jxg as any;
    const circle: any = ctx.resolveRef(c.circle);
    const A: any = ctx.resolveRef(c.a);
    const B: any = ctx.resolveRef(c.b);
    const ref: any = ctx.resolveRef((c.containing ?? c.notContaining)!);
    const sameSide = !!c.containing;
    const O = circle?.center ?? circle?.midpoint ?? circle;
    const am = () => arcMidpoint(
      [O.X(), O.Y()], circle.Radius(),
      [A.X(), A.Y()], [B.X(), B.Y()], [ref.X(), ref.Y()], sameSide,
    );
    return board.create('point', [() => am()[0], () => am()[1]], opts);
  },
});
