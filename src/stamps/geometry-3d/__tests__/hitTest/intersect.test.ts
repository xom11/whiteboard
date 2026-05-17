import { rayPlane, rayGround, raySphere, rayLineSegment } from '../../editor/hitTest/intersect';

test('rayPlane: ray pointing -z from (0,0,5) hits z=0 plane at (0,0,0)', () => {
  const hit = rayPlane(
    { origin: [0, 0, 5], dir: [0, 0, -1] },
    { point: [0, 0, 0], normal: [0, 0, 1] },
  );
  expect(hit).not.toBeNull();
  expect(hit!.point).toEqual([0, 0, 0]);
  expect(hit!.t).toBeCloseTo(5, 5);
});

test('rayPlane: parallel ray misses', () => {
  const hit = rayPlane(
    { origin: [0, 0, 5], dir: [1, 0, 0] },
    { point: [0, 0, 0], normal: [0, 0, 1] },
  );
  expect(hit).toBeNull();
});

test('rayGround returns z=0 hit', () => {
  const hit = rayGround({ origin: [1, 1, 5], dir: [0, 0, -1] });
  expect(hit).not.toBeNull();
  expect(hit!.point).toEqual([1, 1, 0]);
});

test('raySphere: ray through center hits closer intersection', () => {
  const hit = raySphere(
    { origin: [0, 0, 5], dir: [0, 0, -1] },
    { center: [0, 0, 0], radius: 1 },
  );
  expect(hit).not.toBeNull();
  expect(hit!.point[2]).toBeCloseTo(1, 5);
});

test('rayLineSegment: closest point with distance threshold', () => {
  const hit = rayLineSegment(
    { origin: [0, 0, 5], dir: [0, 0, -1] },
    { a: [0, 0, 0], b: [1, 0, 0] },
    0.5,
  );
  expect(hit).not.toBeNull();
  expect(hit!.point[0]).toBeCloseTo(0, 5);
});
