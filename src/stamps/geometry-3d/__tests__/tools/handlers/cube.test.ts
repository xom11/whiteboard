import { buildCube } from '../../../editor/tools/handlers/cube';
import { Scene3D } from '../../../editor/scene/Scene3D';
import type { ToolStep } from '../../../editor/tools/spec';

const ps: ToolStep = { type: 'point', allowExisting: true, allowNewOn: ['ground'], hint: '' };

test('buildCube creates polyhedron with 8 vertices and 6 faces', () => {
  const scene = new Scene3D();
  const id = buildCube(
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
    expect(obj.flavor).toBe('cube');
    expect(obj.vertices.length).toBe(8);
    expect(obj.faces.length).toBe(6);
  }
});

test('buildCube returns null when either point is not on ground', () => {
  const scene = new Scene3D();
  const a = scene.addPoint({ kind: 'free', x: 0, y: 0, z: 0 });
  const b = scene.addPoint({ kind: 'free', x: 1, y: 0, z: 0.5 });
  const id = buildCube(
    [
      { step: ps, hit: { kind: 'existingPoint', pointId: a } },
      { step: ps, hit: { kind: 'existingPoint', pointId: b } },
    ],
    scene,
  );
  expect(id).toBeNull();
});
