// point-constraints/orthocenter.ts
import { definePointConstraint } from './_types';

export const orthocenterConstraint = definePointConstraint({
  kind: 'orthocenter',
  validate: (c) => {
    if (!Array.isArray(c.vertices) || c.vertices.length !== 3) {
      throw new Error('point.orthocenter: vertices phải là tuple 3 id');
    }
    if (!c.vertices[0] || !c.vertices[1] || !c.vertices[2]) {
      throw new Error('point.orthocenter: 3 vertex id phải non-empty');
    }
  },
  describe: (obj, state, c) => {
    const labels = c.vertices.map((id) => state?.objects[id]?.label ?? id).join('');
    return `${obj.label} = trực tâm Δ${labels}`;
  },
  render: (obj, ctx, c, opts) => {
    const board = ctx.jxg as any;

    const a: any = ctx.resolveRef(c.vertices[0]);

    const b: any = ctx.resolveRef(c.vertices[1]);

    const c3: any = ctx.resolveRef(c.vertices[2]);
    const hide = { visible: false, withLabel: false, fixed: true, name: '' };
    // Altitude A→BC: line BC + perpendicular từ A xuống BC.
    const lineBC = board.create('line', [b, c3], hide);
    const altA = board.create('perpendicular', [lineBC, a], hide);
    // Altitude B→AC: line AC + perpendicular từ B xuống AC.
    const lineAC = board.create('line', [a, c3], hide);
    const altB = board.create('perpendicular', [lineAC, b], hide);
    // Trực tâm = giao 2 altitude (branch 0 — chỉ có 1 giao điểm).

    const ortho: any = board.create('intersection', [altA, altB, 0], opts);
    ortho._helpers = [lineBC, altA, lineAC, altB];
    return ortho;
  },
});
