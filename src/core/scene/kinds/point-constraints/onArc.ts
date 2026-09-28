// point-constraints/onArc.ts
//
// Điểm CHẠY trên một CUNG AB của đường tròn — "Lấy M thuộc cung nhỏ BC", "E trên
// cung lớn AB", "D thuộc cung BC không chứa A". Glider trên cung ẩn: kéo được
// nhưng không bao giờ rời cung đề chỉ định (onCircle cho glider chạy cả vòng, đặt
// theo góc cố định nên hay rơi nhầm sang cung kia).
//
// Hai đầu mút cung ẩn là điểm hàm: tự đảo (A,B) ↔ (B,A) khi hình bị kéo khiến cung
// nhỏ/cung không chứa ref đổi chiều.
import { orientedArc, pointOnOrientedArc, type XY } from '../pointConstructions';
import { definePointConstraint } from './_types';

export const onArcConstraint = definePointConstraint({
  kind: 'onArc',
  validate: (c) => {
    if (!c.circle || !c.a || !c.b) throw new Error('point.onArc: circle, a, b bắt buộc');
    if ((c.mode === 'notContaining' || c.mode === 'containing') && !c.ref) {
      throw new Error('point.onArc: mode chứa/không chứa cần ref');
    }
  },
  describe: (obj, state, c) => {
    const l = (id: string) => state?.objects[id]?.label ?? id;
    const cung = c.mode === 'minor' ? 'cung nhỏ ' : c.mode === 'major' ? 'cung lớn ' : 'cung ';
    const them = c.mode === 'notContaining' ? ` không chứa ${l(c.ref!)}` : c.mode === 'containing' ? ` chứa ${l(c.ref!)}` : '';
    return `${obj.label} thuộc ${cung}${l(c.a)}${l(c.b)}${them}`;
  },
  render: (obj, ctx, c, opts) => {
    const board = ctx.jxg as any;
    const circle: any = ctx.resolveRef(c.circle);
    const A: any = ctx.resolveRef(c.a);
    const B: any = ctx.resolveRef(c.b);
    const R: any = c.ref ? ctx.resolveRef(c.ref) : undefined;
    const O: any = circle?.center ?? circle?.midpoint ?? circle;
    const xy = (p: any): XY => [p.X(), p.Y()];
    const ends = () => orientedArc(xy(O), xy(A), xy(B), c.mode, R ? xy(R) : undefined);
    const hide = { visible: false, withLabel: false, fixed: true, name: '' };
    const S = board.create('point', [() => ends()[0][0], () => ends()[0][1]], hide);
    const E = board.create('point', [() => ends()[1][0], () => ends()[1][1]], hide);
    const arc = board.create('arc', [O, S, E], hide);
    const [s0, e0] = ends();
    // t tính từ a về phía b: cung bị đảo chiều (bắt đầu từ b) ⇒ lấy 1 − t.
    const tu = s0[0] === A.X() && s0[1] === A.Y() ? c.t : 1 - c.t;
    const p0 = pointOnOrientedArc(xy(O), circle.Radius(), s0, e0, tu);
    const gl: any = board.create('glider', [p0[0], p0[1], arc], opts);
    gl._helpers = [arc, S, E];
    return gl;
  },
});
