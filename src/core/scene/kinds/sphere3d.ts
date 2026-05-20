// src/core/scene/kinds/sphere3d.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';

export type Sphere3DAttrs = { center: string; surfacePoint: string; color?: string };

registerKind<Sphere3DAttrs>({
  type: 'sphere3d',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => { if (!a?.center || !a?.surfacePoint) throw new Error('sphere3d: center/surfacePoint required'); },
  dependsOn: (a) => [a.center, a.surfacePoint],
  describe: (obj) => `Mặt cầu ${obj.label} tâm ${obj.attrs.center}`,
  render: () => null,
});
