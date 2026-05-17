import { buildPolygon } from '../../../editor/tools/handlers/polygon';
import { Scene3D } from '../../../editor/scene/Scene3D';
import type { ToolStep } from '../../../editor/tools/spec';

const ps: ToolStep = { type: 'point', allowExisting: true, allowNewOn: ['ground'], hint: '' };
const cs: ToolStep = { type: 'closingPoint', hint: '' };

test('buildPolygon creates 3-vertex polygon', () => {
  const scene = new Scene3D();
  const id = buildPolygon(
    [
      { step: ps, hit: { kind: 'onGround', world: [0, 0, 0] } },
      { step: ps, hit: { kind: 'onGround', world: [1, 0, 0] } },
      { step: ps, hit: { kind: 'onGround', world: [0, 1, 0] } },
      { step: cs, hit: { kind: 'existingPoint', pointId: 'placeholder' } },
    ],
    scene,
  );
  expect(id).not.toBeNull();
  const obj = scene.get(id!);
  expect(obj?.kind).toBe('polygon');
  if (obj?.kind === 'polygon') {
    expect(obj.vertices.length).toBe(3);
  }
});

test('buildPolygon creates 4-vertex polygon', () => {
  const scene = new Scene3D();
  const id = buildPolygon(
    [
      { step: ps, hit: { kind: 'onGround', world: [0, 0, 0] } },
      { step: ps, hit: { kind: 'onGround', world: [1, 0, 0] } },
      { step: ps, hit: { kind: 'onGround', world: [1, 1, 0] } },
      { step: ps, hit: { kind: 'onGround', world: [0, 1, 0] } },
      { step: cs, hit: { kind: 'existingPoint', pointId: 'placeholder' } },
    ],
    scene,
  );
  expect(id).not.toBeNull();
  const obj = scene.get(id!);
  expect(obj?.kind).toBe('polygon');
  if (obj?.kind === 'polygon') {
    expect(obj.vertices.length).toBe(4);
  }
});
