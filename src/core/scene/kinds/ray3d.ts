// src/core/scene/kinds/ray3d.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';
import { labelOf } from './labelOf';

export type Ray3DAttrs = { origin: string; through: string; color?: string };

registerKind<Ray3DAttrs>({
  type: 'ray3d',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => { if (!a?.origin || !a?.through) throw new Error('ray3d: origin/through required'); },
  dependsOn: (a) => [a.origin, a.through],
  describe: (obj, state) => `Tia ${obj.label} từ ${labelOf(obj.attrs.origin, state)} qua ${labelOf(obj.attrs.through, state)}`,
  render: (obj, ctx) => {
    const view = ctx.jxg as any;
    const pOrigin = ctx.resolveRef(obj.attrs.origin);
    const pThrough = ctx.resolveRef(obj.attrs.through);
    return view.create('line3d', [pOrigin, pThrough], {
      straightFirst: false,
      straightLast: true,
      strokeColor: obj.attrs.color ?? '#0f172a',
      strokeWidth: 2,
      visible: obj.visible,
    });
  },
});
