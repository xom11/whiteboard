// src/core/scene/kinds/vector.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';

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
  describe: (obj) => `Vector ${obj.attrs.from}${obj.attrs.to}`,
  render: () => null,
};

registerKind(def);
