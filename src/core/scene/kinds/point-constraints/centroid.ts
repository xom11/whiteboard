// point-constraints/centroid.ts
import { definePointConstraint } from './_types';

export const centroidConstraint = definePointConstraint({
  kind: 'centroid',
  validate: (c) => {
    if (!Array.isArray(c.vertices) || c.vertices.length !== 3) {
      throw new Error('point.centroid: vertices phải là tuple 3 id');
    }
    if (!c.vertices[0] || !c.vertices[1] || !c.vertices[2]) {
      throw new Error('point.centroid: 3 vertex id phải non-empty');
    }
  },
  describe: (obj, state, c) => {
    const labels = c.vertices.map((id) => state?.objects[id]?.label ?? id).join('');
    return `${obj.label} = trọng tâm Δ${labels}`;
  },
  render: (obj, ctx, c, opts) => {
    const board = ctx.jxg as any;

    const a: any = ctx.resolveRef(c.vertices[0]);

    const b: any = ctx.resolveRef(c.vertices[1]);

    const c3: any = ctx.resolveRef(c.vertices[2]);
    // JSXGraph function-based point: parents = [() => x, () => y]
    // Function được gọi lại mỗi frame → live update khi user kéo vertex.
    return board.create('point', [
      () => (a.X() + b.X() + c3.X()) / 3,
      () => (a.Y() + b.Y() + c3.Y()) / 3,
    ], opts);
  },
});
