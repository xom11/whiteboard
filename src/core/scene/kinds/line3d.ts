// src/core/scene/kinds/line3d.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';
import { labelOf } from './labelOf';

export type Line3DAttrs = { p1: string; p2: string; color?: string };

registerKind<Line3DAttrs>({
  type: 'line3d',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => { if (!a?.p1 || !a?.p2) throw new Error('line3d: p1/p2 required'); },
  dependsOn: (a) => [a.p1, a.p2],
  describe: (obj, state) => `Đường ${obj.label} qua ${labelOf(obj.attrs.p1, state)}, ${labelOf(obj.attrs.p2, state)}`,
  render: (obj, ctx) => {
    const view = ctx.jxg as any;
    const pA = ctx.resolveRef(obj.attrs.p1);
    const pB = ctx.resolveRef(obj.attrs.p2);
    return view.create('line3d', [pA, pB], {
      straightFirst: true,
      straightLast: true,
      strokeColor: obj.attrs.color ?? '#0f172a',
      strokeWidth: 2,
      visible: obj.visible,
    });
  },
});
