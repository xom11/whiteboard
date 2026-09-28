// point-constraints/affine.ts
//
// Điểm = Σ wᵢ·Pᵢ (Σ wᵢ = 1). Render FUNCTIONAL (như pointAtDistance): đọc toạ độ
// sống của các điểm nguồn ⇒ kéo đỉnh, điểm vẫn thoả đẳng thức vectơ.
import { definePointConstraint } from './_types';

export const affineConstraint = definePointConstraint({
  kind: 'affine',
  describe: (obj, state, c) => {
    const terms = c.points.map((p, i) => `${+c.weights[i].toFixed(4)}·${state?.objects[p]?.label ?? p}`);
    return `${obj.label} = ${terms.join(' + ')}`;
  },
  render: (obj, ctx, c, opts) => {
    const board = ctx.jxg as any;
    const P: any[] = c.points.map((p) => ctx.resolveRef(p));
    const X = () => P.reduce((s, q, i) => s + c.weights[i] * q.X(), 0);
    const Y = () => P.reduce((s, q, i) => s + c.weights[i] * q.Y(), 0);
    return board.create('point', [X, Y], opts);
  },
});
