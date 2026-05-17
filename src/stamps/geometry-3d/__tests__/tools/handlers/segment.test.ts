import { buildSegment, buildLine, buildRay, buildVector } from '../../../editor/tools/handlers/segment';
import { Scene3D } from '../../../editor/scene/Scene3D';
import type { ToolStep } from '../../../editor/tools/spec';

const ps: ToolStep = { type: 'point', allowExisting: true, allowNewOn: ['ground'], hint: '' };

test('buildSegment creates segment between two new ground points', () => {
  const scene = new Scene3D();
  const id = buildSegment(
    [
      { step: ps, hit: { kind: 'onGround', world: [0, 0, 0] } },
      { step: ps, hit: { kind: 'onGround', world: [1, 0, 0] } },
    ],
    scene,
  );
  expect(id).not.toBeNull();
  const seg = scene.get(id!);
  expect(seg?.kind).toBe('segment');
});

test('buildSegment rejects identical points', () => {
  const scene = new Scene3D();
  const p = scene.addPoint({ kind: 'free', x: 0, y: 0, z: 0 });
  const id = buildSegment(
    [
      { step: ps, hit: { kind: 'existingPoint', pointId: p } },
      { step: ps, hit: { kind: 'existingPoint', pointId: p } },
    ],
    scene,
  );
  expect(id).toBeNull();
});

test('buildLine creates line; buildRay creates ray; buildVector creates vector', () => {
  const scene = new Scene3D();
  const a: Parameters<typeof buildLine>[0] = [
    { step: ps, hit: { kind: 'onGround', world: [0, 0, 0] } },
    { step: ps, hit: { kind: 'onGround', world: [1, 0, 0] } },
  ];
  const line = buildLine([...a], scene);
  const ray = buildRay([
    { step: ps, hit: { kind: 'onGround', world: [0, 1, 0] } },
    { step: ps, hit: { kind: 'onGround', world: [1, 1, 0] } },
  ], scene);
  const vec = buildVector([
    { step: ps, hit: { kind: 'onGround', world: [0, 2, 0] } },
    { step: ps, hit: { kind: 'onGround', world: [1, 2, 0] } },
  ], scene);
  expect(scene.get(line!)?.kind).toBe('line');
  expect(scene.get(ray!)?.kind).toBe('ray');
  expect(scene.get(vec!)?.kind).toBe('vector');
});
