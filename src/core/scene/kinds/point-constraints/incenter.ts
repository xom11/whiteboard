// point-constraints/incenter.ts
import { definePointConstraint } from './_types';

export const incenterConstraint = definePointConstraint({
  kind: 'incenter',
  validate: (c) => {
    if (!Array.isArray(c.vertices) || c.vertices.length !== 3) {
      throw new Error('point.incenter: vertices phải là tuple 3 id');
    }
    if (!c.vertices[0] || !c.vertices[1] || !c.vertices[2]) {
      throw new Error('point.incenter: 3 vertex id phải non-empty');
    }
  },
  describe: (obj, state, c) => {
    const labels = c.vertices.map((id) => state?.objects[id]?.label ?? id).join('');
    return `${obj.label} = tâm nội tiếp Δ${labels}`;
  },
  render: (obj, ctx, c, opts) => {
    const board = ctx.jxg as any;

    const a: any = ctx.resolveRef(c.vertices[0]);

    const b: any = ctx.resolveRef(c.vertices[1]);

    const c3: any = ctx.resolveRef(c.vertices[2]);
    return board.create('incenter', [a, b, c3], opts);
  },
});
