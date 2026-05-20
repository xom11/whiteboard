// src/core/scene/kinds/cone3d.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';

export type Cone3DAttrs = { baseCenter: string; apex: string; radius: number; color?: string };

registerKind<Cone3DAttrs>({
  type: 'cone3d',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    if (!a?.baseCenter || !a?.apex) throw new Error('cone3d: baseCenter/apex required');
    if (!(a.radius > 0)) throw new Error('cone3d: radius > 0');
  },
  dependsOn: (a) => [a.baseCenter, a.apex],
  describe: (obj) => `Nón ${obj.label} R=${obj.attrs.radius.toFixed(2)}`,
  render: () => null,
});
