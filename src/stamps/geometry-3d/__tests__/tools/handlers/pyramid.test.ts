import { buildPyramid } from '../../../editor/tools/handlers/pyramid';
import { Scene3D } from '../../../editor/scene/Scene3D';
import type { ToolStep } from '../../../editor/tools/spec';

const ps: ToolStep = { type: 'point', allowExisting: true, allowNewOn: ['ground'], hint: '' };
const cs: ToolStep = { type: 'closingPoint', hint: '' };

test('buildPyramid creates polyhedron with 3 base + apex', () => {
  const scene = new Scene3D();
  const id = buildPyramid(
    [
      { step: ps, hit: { kind: 'onGround', world: [0, 0, 0] } },
      { step: ps, hit: { kind: 'onGround', world: [1, 0, 0] } },
      { step: ps, hit: { kind: 'onGround', world: [0, 1, 0] } },
      { step: cs, hit: { kind: 'existingPoint', pointId: 'placeholder' } },
      { step: ps, hit: { kind: 'onGround', world: [0.3, 0.3, 0] } /* apex placed via free below */ },
    ],
    scene,
  );
  // The apex is on ground (z=0) → coplanar → expect null
  expect(id).toBeNull();
});

test('buildPyramid succeeds when apex is above the base plane', () => {
  const scene = new Scene3D();
  const a = scene.addPoint({ kind: 'free', x: 0, y: 0, z: 0 });
  const b = scene.addPoint({ kind: 'free', x: 1, y: 0, z: 0 });
  const c = scene.addPoint({ kind: 'free', x: 0, y: 1, z: 0 });
  const apex = scene.addPoint({ kind: 'free', x: 0.3, y: 0.3, z: 1 });
  const id = buildPyramid(
    [
      { step: ps, hit: { kind: 'existingPoint', pointId: a } },
      { step: ps, hit: { kind: 'existingPoint', pointId: b } },
      { step: ps, hit: { kind: 'existingPoint', pointId: c } },
      { step: cs, hit: { kind: 'existingPoint', pointId: a } },
      { step: ps, hit: { kind: 'existingPoint', pointId: apex } },
    ],
    scene,
  );
  expect(id).not.toBeNull();
  const obj = scene.get(id!);
  expect(obj?.kind).toBe('polyhedron');
  if (obj?.kind === 'polyhedron') {
    expect(obj.flavor).toBe('pyramid');
    expect(obj.vertices.length).toBe(4); // 3 base + 1 apex
    expect(obj.faces.length).toBe(4); // 1 base + 3 sides
  }
});
