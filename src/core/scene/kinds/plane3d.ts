// src/core/scene/kinds/plane3d.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';

export type Plane3DAttrs = { p1: string; p2: string; p3: string; color?: string };

registerKind<Plane3DAttrs>({
  type: 'plane3d',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => { if (!a?.p1 || !a?.p2 || !a?.p3) throw new Error('plane3d: cần 3 điểm'); },
  dependsOn: (a) => [a.p1, a.p2, a.p3],
  describe: (obj) => `Mặt ${obj.label} qua ${obj.attrs.p1}, ${obj.attrs.p2}, ${obj.attrs.p3}`,
  render: () => null,
});
