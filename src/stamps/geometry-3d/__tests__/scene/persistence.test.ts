import { Scene3D } from '../../editor/scene/Scene3D';
import { sceneToBoard, boardToScene } from '../../editor/scene/persistence';
import { parseSerializedBoard3D, serializeBoard3D } from '../../serialize';

const view = {
  azimuth: 0,
  elevation: 0,
  bbox3D: [-5, -5, -5, 5, 5, 5] as [number, number, number, number, number, number],
};
const bbox: [number, number, number, number] = [-6, -6, 6, 6];

test('round-trip: single onGround point', () => {
  const scene = new Scene3D();
  const id = scene.addPoint({ kind: 'onGround', x: 1.5, y: 2.5 });
  const board = sceneToBoard(scene, view, bbox);
  const json = serializeBoard3D(board);
  const parsed = parseSerializedBoard3D(json);
  expect(parsed.version).toBe(2);
  const restored = boardToScene(parsed);
  const restoredObj = restored.get(id);
  expect(restoredObj?.kind).toBe('point');
  if (restoredObj?.kind === 'point') {
    expect(restoredObj.constraint).toEqual({ kind: 'onGround', x: 1.5, y: 2.5 });
  }
});

test('round-trip: segment between two free points', () => {
  const scene = new Scene3D();
  const a = scene.addPoint({ kind: 'free', x: 0, y: 0, z: 0 });
  const b = scene.addPoint({ kind: 'free', x: 1, y: 0, z: 0 });
  const segId = scene.addObject('segment', { p1: a, p2: b });
  const board = sceneToBoard(scene, view, bbox);
  const restored = boardToScene(parseSerializedBoard3D(serializeBoard3D(board)));
  const segRestored = restored.get(segId);
  expect(segRestored?.kind).toBe('segment');
  if (segRestored?.kind === 'segment') {
    expect(segRestored.p1).toBe(a);
    expect(segRestored.p2).toBe(b);
  }
});

test('boardToScene legacy v1: points become free, derived skipped', () => {
  const v1Board = {
    version: 1 as const,
    bbox,
    view,
    showAxes: true,
    showMesh: true,
    elements: [
      {
        type: 'point3d' as const,
        parents: [1, 2, 3],
        attributes: { id: 'p1' },
        id: 'p1',
        label: 'A',
      },
      // Legacy derived without sceneSpec — should be skipped silently
      {
        type: 'line3d' as const,
        parents: ['@id:p1', '@id:p1'],
        attributes: { id: 's1' },
        id: 's1',
      },
    ],
  };
  const restored = boardToScene(v1Board);
  const p1 = restored.get('p1');
  expect(p1?.kind).toBe('point');
  if (p1?.kind === 'point') {
    expect(p1.constraint).toEqual({ kind: 'free', x: 1, y: 2, z: 3 });
  }
  expect(restored.get('s1')).toBeUndefined();
});

test('round-trip: sphere references its two point ids', () => {
  const scene = new Scene3D();
  const center = scene.addPoint({ kind: 'free', x: 0, y: 0, z: 0 });
  const surface = scene.addPoint({ kind: 'free', x: 1, y: 0, z: 0 });
  const sphId = scene.addObject('sphere', { center, surfacePoint: surface });
  const restored = boardToScene(
    parseSerializedBoard3D(serializeBoard3D(sceneToBoard(scene, view, bbox))),
  );
  const sph = restored.get(sphId);
  expect(sph?.kind).toBe('sphere');
  if (sph?.kind === 'sphere') {
    expect(sph.center).toBe(center);
    expect(sph.surfacePoint).toBe(surface);
  }
});
