// point-constraints/circumcenter.ts
import { definePointConstraint } from './_types';

export const circumcenterConstraint = definePointConstraint({
  kind: 'circumcenter',
  validate: (c) => {
    if (!Array.isArray(c.vertices) || c.vertices.length !== 3) {
      throw new Error('point.circumcenter: vertices phải là tuple 3 id');
    }
    if (!c.vertices[0] || !c.vertices[1] || !c.vertices[2]) {
      throw new Error('point.circumcenter: 3 vertex id phải non-empty');
    }
  },
  describe: (obj, state, c) => {
    const labels = c.vertices.map((id) => state?.objects[id]?.label ?? id).join('');
    return `${obj.label} = tâm ngoại tiếp Δ${labels}`;
  },
  render: (obj, ctx, c, opts) => {
    const board = ctx.jxg as any;

    const a: any = ctx.resolveRef(c.vertices[0]);

    const b: any = ctx.resolveRef(c.vertices[1]);

    const c3: any = ctx.resolveRef(c.vertices[2]);
    // JSXGraph 'circumcenter': create('circumcenter', [A, B, C])
    return board.create('circumcenter', [a, b, c3], opts);
  },
});
