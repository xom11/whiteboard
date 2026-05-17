import { buildPrism } from '../../../editor/tools/handlers/prism';
import { Scene3D } from '../../../editor/scene/Scene3D';
import type { ToolStep } from '../../../editor/tools/spec';

const ps: ToolStep = { type: 'point', allowExisting: true, allowNewOn: ['ground'], hint: '' };
const cs: ToolStep = { type: 'closingPoint', hint: '' };
const ns: ToolStep = { type: 'number', prompt: 'h', min: 0.0001 };

test('buildPrism creates polyhedron with 6 vertices + 5 faces', () => {
  const scene = new Scene3D();
  const id = buildPrism(
    [
      { step: ps, hit: { kind: 'onGround', world: [0, 0, 0] } },
      { step: ps, hit: { kind: 'onGround', world: [1, 0, 0] } },
      { step: ps, hit: { kind: 'onGround', world: [0, 1, 0] } },
      { step: cs, hit: { kind: 'existingPoint', pointId: 'placeholder' } },
      { step: ns, value: 2 },
    ],
    scene,
  );
  expect(id).not.toBeNull();
  const obj = scene.get(id!);
  expect(obj?.kind).toBe('polyhedron');
  if (obj?.kind === 'polyhedron') {
    expect(obj.flavor).toBe('prism');
    expect(obj.vertices.length).toBe(6); // 3 base + 3 top
    expect(obj.faces.length).toBe(5); // 1 bottom + 1 top + 3 sides
  }
});

test('buildPrism returns null for non-positive height', () => {
  const scene = new Scene3D();
  const id = buildPrism(
    [
      { step: ps, hit: { kind: 'onGround', world: [0, 0, 0] } },
      { step: ps, hit: { kind: 'onGround', world: [1, 0, 0] } },
      { step: ps, hit: { kind: 'onGround', world: [0, 1, 0] } },
      { step: cs, hit: { kind: 'existingPoint', pointId: 'placeholder' } },
      { step: ns, value: 0 },
    ],
    scene,
  );
  expect(id).toBeNull();
});
