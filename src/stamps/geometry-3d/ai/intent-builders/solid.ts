import type { IntentBuilder3D } from './_types';
import { addPoint3dObj, addShape3dObj } from './_types';
import { solidLayout } from '../layout3d';
import { nextLabel } from '../../../../core/scene';

export const buildSolid: IntentBuilder3D = (s, intent) => {
  if (intent.op !== 'solid') return;
  const L = solidLayout(intent);
  const vertexIds: string[] = [];
  for (const label of L.vertexOrder) {
    const [x, y, z] = L.coords[label];
    vertexIds.push(addPoint3dObj(s, label, { kind: 'free', x, y, z }));
  }
  const polyLabel = nextLabel(s.store.getState(), 'polyhedron3d');
  addShape3dObj(s, 'polyhedron3d', 'ph', polyLabel, {
    flavor: intent.flavor,
    vertices: vertexIds,
    faces: L.faces,
  });
};
