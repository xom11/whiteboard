// src/core/scene/kinds/ray.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';

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
  describe: (obj) => `Tia ${obj.attrs.origin}${obj.attrs.through}`,
  render: () => null,
};

registerKind(def);
