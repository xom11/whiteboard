import { symbolicFor, numericFor } from '../../editor/algebraPanel/symbolic';
import { Scene3D } from '../../editor/scene/Scene3D';

test('symbolicFor onGround point', () => {
  const scene = new Scene3D();
  scene.addPoint({ kind: 'onGround', x: 1, y: 2 });
  const obj = scene.list()[0];
  expect(symbolicFor(obj, scene)).toBe('Point(xyPlane)');
  expect(numericFor(obj, scene)).toBe('(1, 2, 0)');
});

test('symbolicFor onAxis z point', () => {
  const scene = new Scene3D();
  scene.addPoint({ kind: 'onAxis', axis: 'z', t: 3.5 });
  expect(symbolicFor(scene.list()[0], scene)).toBe('Point(zAxis)');
  expect(numericFor(scene.list()[0], scene)).toBe('(0, 0, 3.5)');
});

test('symbolicFor segment uses point labels', () => {
  const scene = new Scene3D();
  const a = scene.addPoint({ kind: 'free', x: 0, y: 0, z: 0 });
  const b = scene.addPoint({ kind: 'free', x: 1, y: 0, z: 0 });
  const segId = scene.addObject('segment', { p1: a, p2: b });
  const seg = scene.get(segId)!;
  // Points get auto-labels A, B (not internal ids p1, p2)
  expect(symbolicFor(seg, scene)).toBe('Segment(A, B)');
});
