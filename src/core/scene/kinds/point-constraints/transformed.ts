// point-constraints/transformed.ts
import { definePointConstraint } from './_types';
import { buildJxgTransforms } from './shared';

export const transformedConstraint = definePointConstraint({
  kind: 'transformed',
  describe: (obj, state, c) => {
    const t = c.transform;
    const labelRef = (id: string) => state?.objects[id]?.label ?? id;
    const op =
      t.kind === 'translate' ? `tịnh tiến (${t.dx.toFixed(2)}, ${t.dy.toFixed(2)})`
      : t.kind === 'rotate' ? `quay ${((t.angleRad * 180) / Math.PI).toFixed(0)}° quanh ${labelRef(t.center)}`
      : t.kind === 'reflectLine' ? `đối xứng qua ${labelRef(t.line)}`
      : t.kind === 'reflectPoint' ? `đối xứng qua điểm ${labelRef(t.center)}`
      : t.kind === 'dilate' ? `vị tự k=${t.k} quanh ${labelRef(t.center)}`
      : '';
    return `${obj.label} = ảnh của ${labelRef(c.source)} (${op})`;
  },
  render: (obj, ctx, c, opts) => {
    const board = ctx.jxg as any;

    const src: any = ctx.resolveRef(c.source);
    const transforms = buildJxgTransforms(board, ctx, c.transform);
    const parent = transforms.length === 1 ? transforms[0] : transforms;
    // JSXGraph: create('point', [src, transformParent]) — src first.

    const pt: any = board.create('point', [src, parent], opts);
    // Renderer dọn _helpers khi remove element (xem JxgRenderer.remove).
    pt._helpers = transforms;
    return pt;
  },
});
