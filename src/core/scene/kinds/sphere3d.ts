// src/core/scene/kinds/sphere3d.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';
import { labelOf } from './labelOf';

export type Sphere3DAttrs = { center: string; surfacePoint: string; color?: string };

registerKind<Sphere3DAttrs>({
  type: 'sphere3d',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => { if (!a?.center || !a?.surfacePoint) throw new Error('sphere3d: center/surfacePoint required'); },
  dependsOn: (a) => [a.center, a.surfacePoint],
  describe: (obj, state) => `Mặt cầu ${obj.label} tâm ${labelOf(obj.attrs.center, state)}`,
  render: (obj, ctx) => {
    const view = ctx.jxg as any;
    return view.create('sphere3d', [
      ctx.resolveRef(obj.attrs.center),
      ctx.resolveRef(obj.attrs.surfacePoint),
    ], {
      fillOpacity: 0.25,
      fillColor: obj.attrs.color ?? '#60a5fa',
      visible: obj.visible,
    });
  },
});
