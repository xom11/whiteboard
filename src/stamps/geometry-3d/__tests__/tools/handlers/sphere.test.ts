import { buildSphere } from '../../../editor/tools/handlers/sphere';
import { Scene3D } from '../../../editor/scene/Scene3D';
import type { ToolStep } from '../../../editor/tools/spec';

const ps: ToolStep = { type: 'point', allowExisting: true, allowNewOn: ['ground'], hint: '' };

test('buildSphere creates sphere from 2 distinct points', () => {
  const scene = new Scene3D();
  const id = buildSphere(
    [
      { step: ps, hit: { kind: 'onGround', world: [0, 0, 0] } },
      { step: ps, hit: { kind: 'onGround', world: [1, 0, 0] } },
    ],
    scene,
  );
  expect(id).not.toBeNull();
  expect(scene.get(id!)?.kind).toBe('sphere');
});

test('buildSphere returns null for same point', () => {
  const scene = new Scene3D();
  const p = scene.addPoint({ kind: 'free', x: 0, y: 0, z: 0 });
  const id = buildSphere(
    [
      { step: ps, hit: { kind: 'existingPoint', pointId: p } },
      { step: ps, hit: { kind: 'existingPoint', pointId: p } },
    ],
    scene,
  );
  expect(id).toBeNull();
});
