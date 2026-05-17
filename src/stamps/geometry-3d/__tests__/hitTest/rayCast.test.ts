import { screenToRay } from '../../editor/hitTest/rayCast';

// A trivial orthographic mock: world (x, y, z) → screen (x*100 + 500, -y*100 + 400)
function mockOrthoView() {
  return {
    project3DTo2D(x: number, y: number, z: number) {
      return [1, x * 100 + 500, -y * 100 + 400, z];
    },
    // Inverse: given screen (sx, sy), all depths produce world (x, y, *)
    unprojectScreen(sx: number, sy: number, depth: number) {
      return [(sx - 500) / 100, -(sy - 400) / 100, depth];
    },
  };
}

test('screenToRay returns origin + dir consistent with view', () => {
  const view = mockOrthoView();
  const ray = screenToRay({ x: 500, y: 400 }, view as never);
  // Origin at z = +large (camera in +z half), dir pointing -z for orthographic case
  expect(ray.origin[0]).toBeCloseTo(0, 5);
  expect(ray.origin[1]).toBeCloseTo(0, 5);
  expect(ray.dir[2]).toBeLessThan(0);
});
