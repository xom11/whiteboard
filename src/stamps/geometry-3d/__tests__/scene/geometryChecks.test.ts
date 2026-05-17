import { areCollinear3, apexCoplanarWithBase } from '../../editor/scene/geometryChecks';
import { Scene3D } from '../../editor/scene/Scene3D';

test('collinear points return true', () => {
  const scene = new Scene3D();
  const a = scene.addPoint({ kind: 'free', x: 0, y: 0, z: 0 });
  const b = scene.addPoint({ kind: 'free', x: 1, y: 0, z: 0 });
  const c = scene.addPoint({ kind: 'free', x: 2, y: 0, z: 0 });
  expect(areCollinear3(a, b, c, scene)).toBe(true);
});

test('non-collinear points return false', () => {
  const scene = new Scene3D();
  const a = scene.addPoint({ kind: 'free', x: 0, y: 0, z: 0 });
  const b = scene.addPoint({ kind: 'free', x: 1, y: 0, z: 0 });
  const c = scene.addPoint({ kind: 'free', x: 0, y: 1, z: 0 });
  expect(areCollinear3(a, b, c, scene)).toBe(false);
});

test('apex on base plane returns true', () => {
  const scene = new Scene3D();
  const a = scene.addPoint({ kind: 'free', x: 0, y: 0, z: 0 });
  const b = scene.addPoint({ kind: 'free', x: 1, y: 0, z: 0 });
  const c = scene.addPoint({ kind: 'free', x: 0, y: 1, z: 0 });
  const apex = scene.addPoint({ kind: 'free', x: 0.5, y: 0.5, z: 0 });
  expect(apexCoplanarWithBase([a, b, c], apex, scene)).toBe(true);
});

test('apex above base plane returns false', () => {
  const scene = new Scene3D();
  const a = scene.addPoint({ kind: 'free', x: 0, y: 0, z: 0 });
  const b = scene.addPoint({ kind: 'free', x: 1, y: 0, z: 0 });
  const c = scene.addPoint({ kind: 'free', x: 0, y: 1, z: 0 });
  const apex = scene.addPoint({ kind: 'free', x: 0, y: 0, z: 1 });
  expect(apexCoplanarWithBase([a, b, c], apex, scene)).toBe(false);
});
