// point-constraints/secondIntersection.ts
import { rayCircleHit } from '../pointConstructions';
import { definePointConstraint } from './_types';

export const secondIntersectionConstraint = definePointConstraint({
  kind: 'secondIntersection',
  // Không có describe-arm riêng trong point.ts → giữ fallback `Điểm ${label}`.
  describe: (obj) => `Điểm ${obj.label}`,
  render: (obj, ctx, c, opts) => {
    const board = ctx.jxg as any;
    // Giao điểm thứ hai của line ∩ circle, biết giao điểm thứ nhất `other`.
    // JSXGraph 'otherintersection' nhận [curve, line, knownPoint].

    const line: any = ctx.resolveRef(c.line);

    const circle: any = ctx.resolveRef(c.circle);

    const other: any = ctx.resolveRef(c.other);
    const O: any = circle?.center ?? circle?.midpoint;
    const R = typeof circle?.Radius === 'function' ? circle.Radius() : NaN;
    const offCircle =
      O && Number.isFinite(R) && Math.abs(Math.hypot(other.X() - O.X(), other.Y() - O.Y()) - R) > 1e-6 * Math.max(1, R);
    // `other` KHÔNG nằm trên đường tròn (đề "AH cắt (O) tại P" với A ngoài, "Tia FE
    // cắt (O) tại P" với F trong): 'otherintersection' khi đó trả một giao TUỲ Ý
    // (nghiệm đầu). Lấy điểm đầu tiên TIA other → (đầu kia của đường) gặp đường tròn.
    const q: any = line?.point1 === other ? line?.point2 : line?.point1;
    if (offCircle && q) {
      const hit = () => rayCircleHit([O.X(), O.Y()], circle.Radius(), [other.X(), other.Y()], [q.X(), q.Y()]);
      return board.create('point', [() => hit()[0], () => hit()[1]], opts);
    }
    return board.create('otherintersection', [circle, line, other], opts);
  },
});
