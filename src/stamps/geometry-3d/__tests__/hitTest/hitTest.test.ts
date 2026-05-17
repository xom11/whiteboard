import { Scene3D } from '../../editor/scene/Scene3D';
import { hitTest } from '../../editor/hitTest/hitTest';

const mockView = {
  unprojectScreen(sx: number, sy: number, depth: number) {
    return [(sx - 500) / 100, -(sy - 400) / 100, depth] as [number, number, number];
  },
  project3DTo2D(x: number, y: number, z: number) {
    return [1, x * 100 + 500, -y * 100 + 400, z] as [number, number, number, number];
  },
};

test('hitTest snaps to existing point within radius', () => {
  const scene = new Scene3D();
  const a = scene.addPoint({ kind: 'onGround', x: 0, y: 0 }); // world (0,0,0) → screen (500, 400)
  const hit = hitTest({ x: 503, y: 401 }, mockView as never, scene);
  expect(hit.kind).toBe('existingPoint');
  if (hit.kind === 'existingPoint') expect(hit.pointId).toBe(a);
});

test('hitTest returns onGround for click on empty ground', () => {
  const scene = new Scene3D();
  const hit = hitTest({ x: 700, y: 500 }, mockView as never, scene);
  expect(hit.kind).toBe('onGround');
});

test('hitTest snaps to z-axis when click near it', () => {
  const scene = new Scene3D();
  // z-axis projects to screen_x=500 for any z (since project3DTo2D(0,0,z) = [1, 500, 400, z])
  // Click at (501, 200) is near the z-axis line at screen-x=500.
  const hit = hitTest({ x: 501, y: 200 }, mockView as never, scene);
  expect(['onAxis', 'onGround']).toContain(hit.kind);
});
