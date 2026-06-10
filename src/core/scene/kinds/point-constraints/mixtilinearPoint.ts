// point-constraints/mixtilinearPoint.ts
import { mixtilinearPoint } from '../pointConstructions';
import { definePointConstraint } from './_types';

export const mixtilinearPointConstraint = definePointConstraint({
  kind: 'mixtilinearPoint',
  validate: (c) => {
    if (!Array.isArray(c.vertices) || c.vertices.length !== 3 || !c.vertices.every(Boolean)) {
      throw new Error('point.mixtilinearPoint: vertices phải là tuple 3 id non-empty');
    }
    if (c.which !== 'center' && c.which !== 'touch') {
      throw new Error("point.mixtilinearPoint: which phải 'center' | 'touch'");
    }
  },
  describe: (obj, state, c) => {
    const labels = c.vertices.map((id) => state?.objects[id]?.label ?? id).join('');
    return c.which === 'center'
      ? `${obj.label} = tâm đường tròn mixtilinear Δ${labels}`
      : `${obj.label} = tiếp điểm mixtilinear Δ${labels} với (O)`;
  },
  render: (obj, ctx, c, opts) => {
    const board = ctx.jxg as any;
    const a: any = ctx.resolveRef(c.vertices[0]);
    const b: any = ctx.resolveRef(c.vertices[1]);
    const d: any = ctx.resolveRef(c.vertices[2]);
    const mp = () => mixtilinearPoint(
      [a.X(), a.Y()], [b.X(), b.Y()], [d.X(), d.Y()], c.which,
    );
    return board.create('point', [() => mp()[0], () => mp()[1]], opts);
  },
});
