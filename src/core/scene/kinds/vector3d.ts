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
  render: () => null,
});
