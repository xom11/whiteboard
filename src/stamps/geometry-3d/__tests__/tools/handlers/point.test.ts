import { buildPoint } from '../../../editor/tools/handlers/point';
import { Scene3D } from '../../../editor/scene/Scene3D';
import type { ToolStep } from '../../../editor/tools/spec';

const dummyStep: ToolStep = { type: 'point', allowExisting: false, allowNewOn: ['ground'], hint: '' };

test('buildPoint on ground creates onGround point', () => {
  const scene = new Scene3D();
  const id = buildPoint([{ step: dummyStep, hit: { kind: 'onGround', world: [1, 2, 0] } }], scene);
  expect(id).not.toBeNull();
  const obj = scene.get(id!);
  expect(obj?.kind).toBe('point');
  if (obj?.kind === 'point') {
    expect(obj.constraint).toEqual({ kind: 'onGround', x: 1, y: 2 });
  }
});

test('buildPoint on existingPoint returns existing id', () => {
  const scene = new Scene3D();
  const existing = scene.addPoint({ kind: 'free', x: 0, y: 0, z: 0 });
  const id = buildPoint([{ step: dummyStep, hit: { kind: 'existingPoint', pointId: existing } }], scene);
  expect(id).toBe(existing);
});

test('buildPoint on empty returns null', () => {
  const scene = new Scene3D();
  const id = buildPoint([{ step: dummyStep, hit: { kind: 'empty' } }], scene);
  expect(id).toBeNull();
});
