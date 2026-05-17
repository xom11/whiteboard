import { buildCone } from '../../../editor/tools/handlers/cone';
import { Scene3D } from '../../../editor/scene/Scene3D';
import type { ToolStep } from '../../../editor/tools/spec';

const ps: ToolStep = { type: 'point', allowExisting: true, allowNewOn: ['ground'], hint: '' };
const ns: ToolStep = { type: 'number', prompt: 'r', min: 0.0001 };

test('buildCone creates cone with radius', () => {
  const scene = new Scene3D();
  const id = buildCone(
    [
      { step: ps, hit: { kind: 'onGround', world: [0, 0, 0] } },
      { step: ps, hit: { kind: 'onGround', world: [0, 0, 2] } },
      { step: ns, value: 0.5 },
    ],
    scene,
  );
  expect(id).not.toBeNull();
  const obj = scene.get(id!);
  expect(obj?.kind).toBe('cone');
  if (obj?.kind === 'cone') {
    expect(obj.radius).toBe(0.5);
  }
});
