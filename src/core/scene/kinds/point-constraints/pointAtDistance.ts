// point-constraints/pointAtDistance.ts
import { pointAtDistanceCoord } from '../pointConstructions';
import { definePointConstraint } from './_types';
import { makeDistanceFn } from './shared';

export const pointAtDistanceConstraint = definePointConstraint({
  kind: 'pointAtDistance',
  describe: (obj, state, c) => {
    const fromL = state?.objects[c.from]?.label ?? c.from;
    const thrL = state?.objects[c.through]?.label ?? c.through;
    const d = c.distance;
    const dLabel = d.kind === 'literal' ? `${d.value}`
      : d.kind === 'segmentLength'
        ? `${state?.objects[d.p1]?.label ?? d.p1}${state?.objects[d.p2]?.label ?? d.p2}`
        : `bán kính (${state?.objects[d.circle]?.label ?? d.circle})`;
    return `${obj.label} = trên tia ${fromL}${thrL} kéo dài, cách ${thrL} khoảng ${dLabel}`;
  },
  render: (obj, ctx, c, opts) => {
    const board = ctx.jxg as any;
    const A: any = ctx.resolveRef(c.from);
    const B: any = ctx.resolveRef(c.through);
    const dFn = makeDistanceFn(ctx, c.distance);
    const pc = () => pointAtDistanceCoord([A.X(), A.Y()], [B.X(), B.Y()], dFn());
    return board.create('point', [() => pc()[0], () => pc()[1]], opts);
  },
});
