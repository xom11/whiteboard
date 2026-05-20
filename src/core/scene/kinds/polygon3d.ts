// src/core/scene/kinds/polygon3d.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';

export type Polygon3DAttrs = { vertices: string[]; color?: string };

registerKind<Polygon3DAttrs>({
  type: 'polygon3d',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    if (!a?.vertices || a.vertices.length < 3) throw new Error('polygon3d: cần ≥3 vertices');
  },
  dependsOn: (a) => [...a.vertices],
  describe: (obj) => `Đa giác ${obj.label} (${obj.attrs.vertices.length} đỉnh)`,
  render: () => null,
});
