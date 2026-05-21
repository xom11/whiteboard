// src/core/scene/kinds/plane3d.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';
import { labelOf } from './labelOf';

export type Plane3DAttrs = { p1: string; p2: string; p3: string; color?: string };

registerKind<Plane3DAttrs>({
  type: 'plane3d',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => { if (!a?.p1 || !a?.p2 || !a?.p3) throw new Error('plane3d: cần 3 điểm'); },
  dependsOn: (a) => [a.p1, a.p2, a.p3],
  describe: (obj, state) => `Mặt ${obj.label} qua ${labelOf(obj.attrs.p1, state)}, ${labelOf(obj.attrs.p2, state)}, ${labelOf(obj.attrs.p3, state)}`,
  render: (obj, ctx) => {
    const view = ctx.jxg as any;
    return view.create('plane3d', [
      ctx.resolveRef(obj.attrs.p1),
      ctx.resolveRef(obj.attrs.p2),
      ctx.resolveRef(obj.attrs.p3),
    ], {
      fillOpacity: 0.15,
      fillColor: obj.attrs.color ?? '#60a5fa',
      strokeColor: obj.attrs.color ?? '#60a5fa',
      visible: obj.visible,
    });
  },
});
