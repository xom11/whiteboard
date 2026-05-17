import { buildCylinder } from '../../../editor/tools/handlers/cylinder';
import { Scene3D } from '../../../editor/scene/Scene3D';
import type { ToolStep } from '../../../editor/tools/spec';

const ps: ToolStep = { type: 'point', allowExisting: true, allowNewOn: ['ground'], hint: '' };
const ns: ToolStep = { type: 'number', prompt: 'r', min: 0.0001 };

test('buildCylinder creates cylinder with radius', () => {
  const scene = new Scene3D();
  const id = buildCylinder(
    [
      { step: ps, hit: { kind: 'onGround', world: [0, 0, 0] } },
      { step: ps, hit: { kind: 'onGround', world: [0, 0, 2] } },
      { step: ns, value: 1.5 },
    ],
    scene,
  );
  expect(id).not.toBeNull();
  const obj = scene.get(id!);
  expect(obj?.kind).toBe('cylinder');
  if (obj?.kind === 'cylinder') {
    expect(obj.radius).toBe(1.5);
  }
});

test('buildCylinder returns null for non-positive radius', () => {
  const scene = new Scene3D();
  const id = buildCylinder(
    [
      { step: ps, hit: { kind: 'onGround', world: [0, 0, 0] } },
      { step: ps, hit: { kind: 'onGround', world: [0, 0, 2] } },
      { step: ns, value: -1 },
    ],
    scene,
  );
  expect(id).toBeNull();
});
