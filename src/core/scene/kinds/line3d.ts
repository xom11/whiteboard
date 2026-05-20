// src/core/scene/kinds/line3d.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';

export type Line3DAttrs = { p1: string; p2: string; color?: string };

registerKind<Line3DAttrs>({
  type: 'line3d',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => { if (!a?.p1 || !a?.p2) throw new Error('line3d: p1/p2 required'); },
  dependsOn: (a) => [a.p1, a.p2],
  describe: (obj) => `Đường ${obj.label} qua ${obj.attrs.p1}, ${obj.attrs.p2}`,
  render: () => null,
});
