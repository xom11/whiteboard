import { buildPlane } from '../../../editor/tools/handlers/plane';
import { Scene3D } from '../../../editor/scene/Scene3D';
import type { ToolStep } from '../../../editor/tools/spec';

const ps: ToolStep = { type: 'point', allowExisting: true, allowNewOn: ['ground'], hint: '' };

test('buildPlane creates plane with 3 non-collinear points', () => {
  const scene = new Scene3D();
  const id = buildPlane(
    [
      { step: ps, hit: { kind: 'onGround', world: [0, 0, 0] } },
      { step: ps, hit: { kind: 'onGround', world: [1, 0, 0] } },
      { step: ps, hit: { kind: 'onGround', world: [0, 1, 0] } },
    ],
    scene,
  );
  expect(id).not.toBeNull();
  expect(scene.get(id!)?.kind).toBe('plane');
});

test('buildPlane returns null for collinear points', () => {
  const scene = new Scene3D();
  const id = buildPlane(
    [
      { step: ps, hit: { kind: 'onGround', world: [0, 0, 0] } },
      { step: ps, hit: { kind: 'onGround', world: [1, 0, 0] } },
      { step: ps, hit: { kind: 'onGround', world: [2, 0, 0] } },
    ],
    scene,
  );
  expect(id).toBeNull();
});
