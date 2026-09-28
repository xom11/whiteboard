// point-constraints/affine.ts
//
// Điểm = Σ wᵢ·Pᵢ (Σ wᵢ = 1) [+ Σ rotᵢ·J(Pᵢ), J = quay +90°, Σ rotᵢ = 0]. Render
// FUNCTIONAL (như pointAtDistance): đọc toạ độ sống của các điểm nguồn ⇒ kéo đỉnh,
// điểm vẫn thoả đẳng thức vectơ / vẫn là đỉnh hình vuông, tam giác đều dựng trên cạnh.
// awayFrom: chọn chiều quay sao cho điểm nằm KHÁC phía đường P₀P₁ so với awayFrom.
import { definePointConstraint } from './_types';

export const affineConstraint = definePointConstraint({
  kind: 'affine',
  describe: (obj, state, c) => {
    const lb = (p: string) => state?.objects[p]?.label ?? p;
    const terms = c.points.map((p, i) => `${+c.weights[i].toFixed(4)}·${lb(p)}`);
    const rot = c.rot ? ` + J(${c.points.map((p, i) => `${+c.rot![i].toFixed(4)}·${lb(p)}`).join(' + ')})` : '';
    return `${obj.label} = ${terms.join(' + ')}${rot}`;
  },
  render: (obj, ctx, c, opts) => {
    const board = ctx.jxg as any;
    const P: any[] = c.points.map((p) => ctx.resolveRef(p));
    const T: any = c.awayFrom ? ctx.resolveRef(c.awayFrom) : null;
    const tinh = (): [number, number] => {
      let x = 0;
      let y = 0;
      P.forEach((q, i) => { x += c.weights[i] * q.X(); y += c.weights[i] * q.Y(); });
      if (!c.rot) return [x, y];
      let rx = 0;
      let ry = 0;
      P.forEach((q, i) => { rx += -c.rot![i] * q.Y(); ry += c.rot![i] * q.X(); });
      let s = 1;
      if (T && P.length >= 2) {
        const [ax, ay, bx, by] = [P[0].X(), P[0].Y(), P[1].X(), P[1].Y()];
        const phia = (px: number, py: number) => (bx - ax) * (py - ay) - (by - ay) * (px - ax);
        if (Math.sign(phia(x + rx, y + ry)) === Math.sign(phia(T.X(), T.Y()))) s = -1;
      }
      return [x + s * rx, y + s * ry];
    };
    return board.create('point', [() => tinh()[0], () => tinh()[1]], opts);
  },
});
