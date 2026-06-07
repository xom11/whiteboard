// point-constraints/excenter.ts
import { excenter } from '../pointConstructions';
import { definePointConstraint } from './_types';

export const excenterConstraint = definePointConstraint({
  kind: 'excenter',
  validate: (c) => {
    if (!Array.isArray(c.vertices) || c.vertices.length !== 3) {
      throw new Error('point.excenter: vertices phải là tuple 3 id');
    }
    if (!c.opposite) throw new Error('point.excenter: opposite bắt buộc');
    if (!c.vertices[0] || !c.vertices[1] || !c.vertices[2]) {
      throw new Error('point.excenter: 3 vertex id phải non-empty');
    }
    if (!c.vertices.includes(c.opposite)) {
      throw new Error('point.excenter: opposite phải là một trong vertices');
    }
  },
  describe: (obj, state, c) => {
    const labels = c.vertices.map((id) => state?.objects[id]?.label ?? id).join('');
    const opp = state?.objects[c.opposite]?.label ?? c.opposite;
    return `${obj.label} = tâm bàng tiếp Δ${labels} đối diện ${opp}`;
  },
  render: (obj, ctx, c, opts) => {
    const board = ctx.jxg as any;
    const a: any = ctx.resolveRef(c.vertices[0]);
    const b: any = ctx.resolveRef(c.vertices[1]);
    const c3: any = ctx.resolveRef(c.vertices[2]);
    const oppIdx = c.vertices.indexOf(c.opposite) as 0 | 1 | 2;
    const idx = (oppIdx < 0 ? 0 : oppIdx) as 0 | 1 | 2;
    const ex = () => excenter(
      [[a.X(), a.Y()], [b.X(), b.Y()], [c3.X(), c3.Y()]], idx,
    );
    return board.create('point', [() => ex()[0], () => ex()[1]], opts);
  },
});
