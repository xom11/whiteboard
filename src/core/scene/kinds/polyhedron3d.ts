// src/core/scene/kinds/polyhedron3d.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';

export type PolyhedronFlavor = 'pyramid' | 'prism' | 'tetrahedron' | 'cube';

export type Polyhedron3DAttrs = {
  flavor: PolyhedronFlavor;
  vertices: string[];
  faces: number[][];
  color?: string;
};

const FLAVOR_LABEL: Record<PolyhedronFlavor, string> = {
  pyramid: 'chóp',
  prism: 'lăng trụ',
  tetrahedron: 'tứ diện',
  cube: 'lập phương',
};

registerKind<Polyhedron3DAttrs>({
  type: 'polyhedron3d',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    if (!a?.vertices || a.vertices.length < 4) throw new Error('polyhedron3d: cần ≥4 vertices');
    if (!a?.faces || a.faces.length < 4) throw new Error('polyhedron3d: cần ≥4 faces');
  },
  dependsOn: (a) => [...a.vertices],
  describe: (obj) => `Khối ${FLAVOR_LABEL[obj.attrs.flavor]} ${obj.label}`,
  render: () => null,
});
