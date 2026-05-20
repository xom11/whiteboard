// src/core/scene/kinds/cylinder3d.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';

export type Cylinder3DAttrs = { baseCenter: string; topCenter: string; radius: number; color?: string };

registerKind<Cylinder3DAttrs>({
  type: 'cylinder3d',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    if (!a?.baseCenter || !a?.topCenter) throw new Error('cylinder3d: baseCenter/topCenter required');
    if (!(a.radius > 0)) throw new Error('cylinder3d: radius > 0');
  },
  dependsOn: (a) => [a.baseCenter, a.topCenter],
  describe: (obj) => `Trụ ${obj.label} R=${obj.attrs.radius.toFixed(2)}`,
  render: () => null,
});
