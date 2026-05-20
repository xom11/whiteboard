// src/core/scene/kinds/vector3d.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';

export type Vector3DAttrs = { from: string; to: string; color?: string };

registerKind<Vector3DAttrs>({
  type: 'vector3d',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => { if (!a?.from || !a?.to) throw new Error('vector3d: from/to required'); },
  dependsOn: (a) => [a.from, a.to],
  describe: (obj) => `Véc-tơ ${obj.label}: ${obj.attrs.from} → ${obj.attrs.to}`,
  render: (obj, ctx) => {
    const view = ctx.jxg as any;
    const pFrom = ctx.resolveRef(obj.attrs.from);
    const pTo = ctx.resolveRef(obj.attrs.to);
    return view.create('line3d', [pFrom, pTo], {
      straightFirst: false,
      straightLast: false,
      lastArrow: { type: 1 },
      strokeColor: obj.attrs.color ?? '#0f172a',
      strokeWidth: 2,
      visible: obj.visible,
    });
  },
});
