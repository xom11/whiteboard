// point-constraints/perpFoot.ts
import { definePointConstraint } from './_types';

export const perpFootConstraint = definePointConstraint({
  kind: 'perpFoot',
  describe: (obj, state, c) => {
    const fromLabel = state?.objects[c.from]?.label ?? c.from;
    const lineLabel = state?.objects[c.onLine]?.label ?? c.onLine;
    return `${obj.label} = chân ⟂ từ ${fromLabel} xuống ${lineLabel}`;
  },
  render: (obj, ctx, c, opts) => {
    const board = ctx.jxg as any;

    const from: any = ctx.resolveRef(c.from);

    const onLine: any = ctx.resolveRef(c.onLine);
    // JSXGraph 'perpendicularpoint': create('perpendicularpoint', [line, point])
    //   → trả về chân vuông góc của point xuống line.
    return board.create('perpendicularpoint', [onLine, from], opts);
  },
});
