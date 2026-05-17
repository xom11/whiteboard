import { Scene3D, type SceneSnapshot } from '../../editor/scene/Scene3D';

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

test('addObject creates segment with auto-label', () => {
  const scene = new Scene3D();
  const p1 = scene.addPoint({ kind: 'free', x: 0, y: 0, z: 0 });
  const p2 = scene.addPoint({ kind: 'free', x: 1, y: 0, z: 0 });
  const s = scene.addObject('segment', { p1, p2 });
  const seg = scene.get(s);
  expect(seg?.kind).toBe('segment');
  expect(seg?.label).toBe('a');
});

test('point labels are auto-assigned A, B, C', () => {
  const scene = new Scene3D();
  const a = scene.get(scene.addPoint({ kind: 'free', x: 0, y: 0, z: 0 }));
  const b = scene.get(scene.addPoint({ kind: 'free', x: 1, y: 0, z: 0 }));
  const c = scene.get(scene.addPoint({ kind: 'free', x: 2, y: 0, z: 0 }));
  expect([a?.label, b?.label, c?.label]).toEqual(['A', 'B', 'C']);
});

test('delete cascades to objects referencing the deleted id', () => {
  const scene = new Scene3D();
  const a = scene.addPoint({ kind: 'free', x: 0, y: 0, z: 0 });
  const b = scene.addPoint({ kind: 'free', x: 1, y: 0, z: 0 });
  const c = scene.addPoint({ kind: 'free', x: 0, y: 1, z: 0 });
  const seg = scene.addObject('segment', { p1: a, p2: b });
  const pg = scene.addObject('polygon', { vertices: [a, b, c] });

  scene.delete(a);

  expect(scene.get(a)).toBeUndefined();
  expect(scene.get(seg)).toBeUndefined();
  expect(scene.get(pg)).toBeUndefined();
  expect(scene.get(b)).toBeDefined();
});

test('delete emits delete event for each cascaded id', () => {
  const scene = new Scene3D();
  const a = scene.addPoint({ kind: 'free', x: 0, y: 0, z: 0 });
  const b = scene.addPoint({ kind: 'free', x: 1, y: 0, z: 0 });
  const seg = scene.addObject('segment', { p1: a, p2: b });
  const deletes: string[] = [];
  scene.on('delete', (id) => deletes.push(id));
  scene.delete(a);
  expect(deletes.sort()).toEqual([a, seg].sort());
});

describe('Scene3D — history', () => {
  it('snapshot() capture toàn bộ state hiện tại (immutable)', () => {
    const scene = new Scene3D();
    const id1 = scene.addPoint({ kind: 'free', x: 0, y: 0, z: 0 });
    const snap = scene.snapshot();
    scene.addPoint({ kind: 'free', x: 1, y: 1, z: 1 });
    expect(snap.objects.size).toBe(1);
    expect(snap.objects.has(id1)).toBe(true);
    expect(snap.order).toEqual([id1]);
    expect(scene.list().length).toBe(2);
  });

  it('restore() khôi phục đúng state từ snapshot + emit reset+add', () => {
    const scene = new Scene3D();
    const events: string[] = [];
    scene.on('reset', () => events.push('reset'));
    scene.on('add', (o) => events.push(`add:${o.id}`));
    const id1 = scene.addPoint({ kind: 'free', x: 0, y: 0, z: 0 });
    const snap = scene.snapshot();
    scene.addPoint({ kind: 'free', x: 5, y: 5, z: 5 });
    events.length = 0;
    (scene as unknown as { restore: (s: SceneSnapshot) => void }).restore(snap);
    expect(scene.list().length).toBe(1);
    expect(scene.get(id1)).toBeDefined();
    expect(events[0]).toBe('reset');
    expect(events.some((e) => e === `add:${id1}`)).toBe(true);
  });

  it('addPoint → undo → state rỗng + canUndo=false', () => {
    const scene = new Scene3D();
    expect(scene.canUndo()).toBe(false);
    scene.addPoint({ kind: 'free', x: 0, y: 0, z: 0 });
    expect(scene.canUndo()).toBe(true);
    expect(scene.canRedo()).toBe(false);
    scene.undo();
    expect(scene.list().length).toBe(0);
    expect(scene.canUndo()).toBe(false);
    expect(scene.canRedo()).toBe(true);
  });

  it('undo → redo → trở lại state cũ', () => {
    const scene = new Scene3D();
    const id1 = scene.addPoint({ kind: 'free', x: 1, y: 2, z: 3 });
    scene.undo();
    scene.redo();
    expect(scene.list().length).toBe(1);
    expect(scene.get(id1)).toBeDefined();
    expect(scene.canUndo()).toBe(true);
    expect(scene.canRedo()).toBe(false);
  });

  it('mutation mới sau undo clears redo future', () => {
    const scene = new Scene3D();
    scene.addPoint({ kind: 'free', x: 0, y: 0, z: 0 });
    scene.undo();
    expect(scene.canRedo()).toBe(true);
    scene.addPoint({ kind: 'free', x: 5, y: 5, z: 5 });
    expect(scene.canRedo()).toBe(false);
  });
});
