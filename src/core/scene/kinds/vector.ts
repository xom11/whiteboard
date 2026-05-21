// src/core/scene/kinds/vector.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';
import { labelOf } from './labelOf';

export type VectorAttrs = {
  from: string;
  to: string;
  color?: string;
  width?: number;
};

const def: KindDef<VectorAttrs> = {
  type: 'vector',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    if (!a?.from || !a?.to) throw new Error('vector: from và to bắt buộc');
  },
  dependsOn: (a) => [a.from, a.to],
  describe: (obj, state) => `Vector ${labelOf(obj.attrs.from, state)}${labelOf(obj.attrs.to, state)}`,
  render: (obj, ctx) => {
    const board = ctx.jxg as any;
    const f = ctx.resolveRef(obj.attrs.from);
    const t = ctx.resolveRef(obj.attrs.to);
    return board.create('arrow', [f, t], {
      name: obj.label,
      strokeColor: obj.attrs.color ?? '#0f172a',
      strokeWidth: obj.attrs.width ?? 2,
      visible: obj.visible,
      fixed: obj.locked,
    });
  },
};

registerKind(def);
