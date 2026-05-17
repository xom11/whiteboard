import { Scene3D } from '../../editor/scene/Scene3D';

test('addPoint generates unique id and emits add', () => {
  const scene = new Scene3D();
  const events: Array<{ type: string; id: string }> = [];
  scene.on('add', (obj) => events.push({ type: 'add', id: obj.id }));

  const id1 = scene.addPoint({ kind: 'free', x: 1, y: 2, z: 3 });
  const id2 = scene.addPoint({ kind: 'onGround', x: 0, y: 0 });

  expect(id1).not.toBe(id2);
  expect(events).toEqual([
    { type: 'add', id: id1 },
    { type: 'add', id: id2 },
  ]);
  expect(scene.get(id1)?.kind).toBe('point');
});

test('delete removes object and emits delete', () => {
  const scene = new Scene3D();
  const events: string[] = [];
  scene.on('delete', (id) => events.push(id));
  const id = scene.addPoint({ kind: 'free', x: 0, y: 0, z: 0 });
  scene.delete(id);
  expect(scene.get(id)).toBeUndefined();
  expect(events).toEqual([id]);
});

test('list returns objects in insertion order', () => {
  const scene = new Scene3D();
  const a = scene.addPoint({ kind: 'free', x: 0, y: 0, z: 0 });
  const b = scene.addPoint({ kind: 'free', x: 1, y: 0, z: 0 });
  expect(scene.list().map((o) => o.id)).toEqual([a, b]);
});
