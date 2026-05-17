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
