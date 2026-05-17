import { constraintToWorld, worldToConstraint } from '../../editor/scene/constraintMath';
import { Scene3D } from '../../editor/scene/Scene3D';

test('free constraint round-trips', () => {
  const scene = new Scene3D();
  expect(constraintToWorld({ kind: 'free', x: 1, y: 2, z: 3 }, scene)).toEqual([1, 2, 3]);
});

test('onGround: param (x, y) ↔ world (x, y, 0)', () => {
  const scene = new Scene3D();
  expect(constraintToWorld({ kind: 'onGround', x: 1.5, y: -2 }, scene)).toEqual([1.5, -2, 0]);
});

test('onAxis: z-axis param t ↔ world (0, 0, t)', () => {
  const scene = new Scene3D();
  expect(constraintToWorld({ kind: 'onAxis', axis: 'z', t: 1.5 }, scene)).toEqual([0, 0, 1.5]);
  expect(constraintToWorld({ kind: 'onAxis', axis: 'x', t: 2 }, scene)).toEqual([2, 0, 0]);
  expect(constraintToWorld({ kind: 'onAxis', axis: 'y', t: -1 }, scene)).toEqual([0, -1, 0]);
});

test('onPlane: u, v ↔ origin + u*basis1 + v*basis2', () => {
  const scene = new Scene3D();
  const a = scene.addPoint({ kind: 'free', x: 0, y: 0, z: 0 });
  const b = scene.addPoint({ kind: 'free', x: 1, y: 0, z: 0 });
  const c = scene.addPoint({ kind: 'free', x: 0, y: 1, z: 0 });
  const planeId = scene.addObject('plane', { p1: a, p2: b, p3: c });

  const world = constraintToWorld({ kind: 'onPlane', planeId, u: 0.5, v: 0.5 }, scene);
  expect(world[0]).toBeCloseTo(0.5, 5);
  expect(world[1]).toBeCloseTo(0.5, 5);
  expect(world[2]).toBeCloseTo(0, 5);
});

test('worldToConstraint(onGround) extracts x, y, ignores z', () => {
  const scene = new Scene3D();
  const updated = worldToConstraint({ kind: 'onGround', x: 0, y: 0 }, [2, 3, 5], scene);
  expect(updated).toEqual({ kind: 'onGround', x: 2, y: 3 });
});

test('worldToConstraint(onAxis z) only varies t', () => {
  const scene = new Scene3D();
  const updated = worldToConstraint({ kind: 'onAxis', axis: 'z', t: 0 }, [99, 99, 4], scene);
  expect(updated).toEqual({ kind: 'onAxis', axis: 'z', t: 4 });
});
