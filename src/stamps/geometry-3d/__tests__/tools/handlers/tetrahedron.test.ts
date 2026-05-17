import { buildTetrahedron } from '../../../editor/tools/handlers/tetrahedron';
import { Scene3D } from '../../../editor/scene/Scene3D';
import type { ToolStep } from '../../../editor/tools/spec';

const ps: ToolStep = { type: 'point', allowExisting: true, allowNewOn: ['ground'], hint: '' };

test('buildTetrahedron creates polyhedron with 4 vertices and 4 faces', () => {
  const scene = new Scene3D();
  const id = buildTetrahedron(
    [
      { step: ps, hit: { kind: 'onGround', world: [0, 0, 0] } },
      { step: ps, hit: { kind: 'onGround', world: [1, 0, 0] } },
    ],
    scene,
  );
  expect(id).not.toBeNull();
  const obj = scene.get(id!);
  expect(obj?.kind).toBe('polyhedron');
  if (obj?.kind === 'polyhedron') {
    expect(obj.flavor).toBe('tetrahedron');
    expect(obj.vertices.length).toBe(4);
    expect(obj.faces.length).toBe(4);
  }
});

test('buildTetrahedron returns null for coincident points', () => {
  const scene = new Scene3D();
  const p = scene.addPoint({ kind: 'free', x: 0, y: 0, z: 0 });
  const id = buildTetrahedron(
    [
      { step: ps, hit: { kind: 'existingPoint', pointId: p } },
      { step: ps, hit: { kind: 'existingPoint', pointId: p } },
    ],
    scene,
  );
  expect(id).toBeNull();
});
