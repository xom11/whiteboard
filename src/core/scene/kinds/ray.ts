// src/core/scene/kinds/ray.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';
import { labelOf } from './labelOf';

export type RayAttrs = {
  origin: string;
  through: string;
  color?: string;
  width?: number;
  dash?: number;
};

const def: KindDef<RayAttrs> = {
  type: 'ray',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    if (!a?.origin || !a?.through) throw new Error('ray: origin và through bắt buộc');
  },
  dependsOn: (a) => [a.origin, a.through],
  describe: (obj, state) => `Tia ${labelOf(obj.attrs.origin, state)}${labelOf(obj.attrs.through, state)}`,
  render: (obj, ctx) => {
    const board = ctx.jxg as any;
    const o = ctx.resolveRef(obj.attrs.origin);
    const t = ctx.resolveRef(obj.attrs.through);
    return board.create('line', [o, t], {
      name: obj.label,
      straightFirst: false,
      straightLast: true,
      strokeColor: obj.attrs.color ?? '#0f172a',
      strokeWidth: obj.attrs.width ?? 2,
      dash: obj.attrs.dash ?? 0,
      visible: obj.visible,
      fixed: obj.locked,
    });
  },
};

registerKind(def);
