// src/core/scene/kinds/segment3d.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';

export type Segment3DAttrs = { p1: string; p2: string; color?: string };

const def: KindDef<Segment3DAttrs> = {
  type: 'segment3d',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    if (!a?.p1 || !a?.p2) throw new Error('segment3d: p1 và p2 bắt buộc');
  },
  dependsOn: (a) => [a.p1, a.p2],
  describe: (obj) => `Đoạn ${obj.attrs.p1}${obj.attrs.p2}`,
  render: (obj, ctx) => {
    const view = ctx.jxg as any;
    const pA = ctx.resolveRef(obj.attrs.p1);
    const pB = ctx.resolveRef(obj.attrs.p2);
    return view.create('line3d', [pA, pB], {
      straightFirst: false,
      straightLast: false,
      strokeColor: obj.attrs.color ?? '#0f172a',
      strokeWidth: 2,
      visible: obj.visible,
    });
  },
};

registerKind(def);
