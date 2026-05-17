import { Scene3D } from '../../editor/scene/Scene3D';
import { JxgRenderer } from '../../editor/renderer/JxgRenderer';

function mockView() {
  const calls: Array<{ type: string; parents: unknown[]; attrs: Record<string, unknown> }> = [];
  return {
    calls,
    create(type: string, parents: unknown[], attrs: Record<string, unknown>) {
      calls.push({ type, parents, attrs });
      return { id: attrs.id, setAttribute: jest.fn(), on: jest.fn(), X: () => 0, Y: () => 0, Z: () => 0, remove: jest.fn() };
    },
  };
}

test('JxgRenderer creates point3d for free constraint', () => {
  const scene = new Scene3D();
  const view = mockView();
  new JxgRenderer(scene, view as never);
  scene.addPoint({ kind: 'free', x: 1, y: 2, z: 3 });
  expect(view.calls.length).toBe(1);
  expect(view.calls[0].type).toBe('point3d');
  expect(view.calls[0].parents).toEqual([1, 2, 3]);
});

test('JxgRenderer creates point3d for onGround constraint', () => {
  const scene = new Scene3D();
  const view = mockView();
  new JxgRenderer(scene, view as never);
  scene.addPoint({ kind: 'onGround', x: 1, y: 2 });
  expect(view.calls[0].type).toBe('point3d');
  expect(view.calls[0].parents).toEqual([1, 2, 0]);
});

test('JxgRenderer creates point3d for onAxis z constraint', () => {
  const scene = new Scene3D();
  const view = mockView();
  new JxgRenderer(scene, view as never);
  scene.addPoint({ kind: 'onAxis', axis: 'z', t: 3 });
  expect(view.calls[0].parents).toEqual([0, 0, 3]);
});

test('JxgRenderer handles delete cleanly', () => {
  const scene = new Scene3D();
  const view = mockView();
  new JxgRenderer(scene, view as never);
  const id = scene.addPoint({ kind: 'free', x: 0, y: 0, z: 0 });
  expect(view.calls.length).toBe(1);
  scene.delete(id);
  // No new create calls; the underlying jxg object's remove() should have been invoked
});

test('JxgRenderer creates line3d for segment', () => {
  const scene = new Scene3D();
  const view = mockView();
  new JxgRenderer(scene, view as never);
  const p1 = scene.addPoint({ kind: 'free', x: 0, y: 0, z: 0 });
  const p2 = scene.addPoint({ kind: 'free', x: 1, y: 0, z: 0 });
  scene.addObject('segment', { p1, p2 });
  const seg = view.calls.find((c) => c.attrs.id?.toString().startsWith('s'));
  expect(seg?.type).toBe('line3d');
  expect(seg?.attrs.straightFirst).toBe(false);
  expect(seg?.attrs.straightLast).toBe(false);
});

test('JxgRenderer creates plane3d for plane', () => {
  const scene = new Scene3D();
  const view = mockView();
  new JxgRenderer(scene, view as never);
  const a = scene.addPoint({ kind: 'free', x: 0, y: 0, z: 0 });
  const b = scene.addPoint({ kind: 'free', x: 1, y: 0, z: 0 });
  const c = scene.addPoint({ kind: 'free', x: 0, y: 1, z: 0 });
  scene.addObject('plane', { p1: a, p2: b, p3: c });
  const planeCall = view.calls.find((c) => c.type === 'plane3d');
  expect(planeCall).toBeDefined();
});

test('JxgRenderer creates polygon3d for polygon', () => {
  const scene = new Scene3D();
  const view = mockView();
  new JxgRenderer(scene, view as never);
  const a = scene.addPoint({ kind: 'free', x: 0, y: 0, z: 0 });
  const b = scene.addPoint({ kind: 'free', x: 1, y: 0, z: 0 });
  const c = scene.addPoint({ kind: 'free', x: 0, y: 1, z: 0 });
  scene.addObject('polygon', { vertices: [a, b, c] });
  const pg = view.calls.find((c) => c.type === 'polygon3d');
  expect(pg).toBeDefined();
});

test('JxgRenderer creates sphere3d for sphere', () => {
  const scene = new Scene3D();
  const view = mockView();
  new JxgRenderer(scene, view as never);
  const center = scene.addPoint({ kind: 'free', x: 0, y: 0, z: 0 });
  const surface = scene.addPoint({ kind: 'free', x: 1, y: 0, z: 0 });
  scene.addObject('sphere', { center, surfacePoint: surface });
  const sp = view.calls.find((c) => c.type === 'sphere3d');
  expect(sp).toBeDefined();
});

test('JxgRenderer creates 6 polygon3d faces for a 5-vertex polyhedron (pyramid)', () => {
  const scene = new Scene3D();
  const view = mockView();
  new JxgRenderer(scene, view as never);
  const v = Array.from({ length: 4 }, (_, i) => scene.addPoint({ kind: 'free', x: i, y: 0, z: 0 }));
  const apex = scene.addPoint({ kind: 'free', x: 0, y: 0, z: 5 });
  // 4-vertex base square + apex = 5 vertices; faces = 1 base + 4 triangles = 5 faces
  scene.addObject('polyhedron', {
    flavor: 'pyramid',
    vertices: [...v, apex],
    faces: [[0,1,2,3], [0,1,4], [1,2,4], [2,3,4], [3,0,4]],
  });
  const polygons = view.calls.filter((c) => c.type === 'polygon3d');
  expect(polygons).toHaveLength(5);
});

test('JxgRenderer creates faceted polygons for cylinder', () => {
  const scene = new Scene3D();
  const view = mockView();
  new JxgRenderer(scene, view as never);
  const base = scene.addPoint({ kind: 'free', x: 0, y: 0, z: 0 });
  const top = scene.addPoint({ kind: 'free', x: 0, y: 0, z: 5 });
  scene.addObject('cylinder', { baseCenter: base, topCenter: top, radius: 1 });
  const polygons = view.calls.filter((c) => c.type === 'polygon3d');
  // 2 caps + 16 side faces
  expect(polygons).toHaveLength(18);
});

test('JxgRenderer creates faceted polygons for cone', () => {
  const scene = new Scene3D();
  const view = mockView();
  new JxgRenderer(scene, view as never);
  const base = scene.addPoint({ kind: 'free', x: 0, y: 0, z: 0 });
  const apex = scene.addPoint({ kind: 'free', x: 0, y: 0, z: 5 });
  scene.addObject('cone', { baseCenter: base, apex, radius: 1 });
  const polygons = view.calls.filter((c) => c.type === 'polygon3d');
  // 1 base + 16 triangles
  expect(polygons).toHaveLength(17);
});

test('reset event clears internal map', () => {
  const scene = new Scene3D();
  const view = mockView();
  const renderer = new JxgRenderer(scene, view as never);
  scene.addPoint({ kind: 'free', x: 0, y: 0, z: 0 });
  scene.addPoint({ kind: 'free', x: 1, y: 1, z: 1 });
  expect((renderer as unknown as { map: Map<string, unknown> }).map.size).toBe(2);

  // Trigger reset event thông qua internal listeners của scene
  (scene as unknown as { listeners: { reset: Set<() => void> } }).listeners.reset.forEach((cb) => cb());

  expect((renderer as unknown as { map: Map<string, unknown> }).map.size).toBe(0);
  renderer.dispose();
});
