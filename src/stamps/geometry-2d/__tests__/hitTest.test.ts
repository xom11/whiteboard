import { hitObjectsAt, findNearestPointInList } from '../editor/hitTest';

// Helper: build a fake JSXGraph point object with screen coords pc[1], pc[2]
// (JSXGraph's scrCoords[0] is the homogeneous w; indices 1 and 2 are x, y).
function fakePoint(scrX: number, scrY: number, opts: { hasPoint?: boolean } = {}) {
  return {
    elementClass: 1, // OBJECT_CLASS_POINT
    coords: { scrCoords: [1, scrX, scrY] },
    hasPoint: (x: number, y: number) =>
      opts.hasPoint ?? (Math.hypot(x - scrX, y - scrY) < 3),
  };
}

function fakeCircle(testHit: (x: number, y: number) => boolean) {
  return {
    elementClass: 3, // OBJECT_CLASS_CIRCLE
    hasPoint: testHit,
  };
}

describe('findNearestPointInList', () => {
  test('returns the nearest existing point within tolerance', () => {
    const a = fakePoint(100, 100);
    const b = fakePoint(120, 100);
    const c = fakePoint(200, 200);
    const got = findNearestPointInList([a, b, c], 110, 100, 12, new Set());
    expect(got).toBe(a);
  });

  test('returns null when no point falls within tolerance', () => {
    const p = fakePoint(0, 0);
    const got = findNearestPointInList([p], 50, 50, 12, new Set());
    expect(got).toBeNull();
  });

  // BUG regression — circle3 / segment / line… freeze when phantom shadows real hits.
  // Phantom là invisible point JSXGraph kéo theo cursor; nếu không loại trừ,
  // findNearestPoint sẽ trả về phantom (cách click ~0px) thay vì điểm thật / null.
  test('skips phantom in exclude set even if phantom sits exactly at click', () => {
    const phantom = fakePoint(150, 150);
    const real = fakePoint(160, 150);
    const got = findNearestPointInList(
      [phantom, real],
      150, 150,
      12,
      new Set([phantom]),
    );
    expect(got).toBe(real);
  });

  test('returns null when only the phantom would match', () => {
    const phantom = fakePoint(50, 50);
    const got = findNearestPointInList(
      [phantom],
      50, 50,
      12,
      new Set([phantom]),
    );
    expect(got).toBeNull();
  });

  test('ignores non-point elements', () => {
    const circle = fakeCircle(() => true);
    const point = fakePoint(80, 80);
    const got = findNearestPointInList([circle, point], 80, 80, 12, new Set());
    expect(got).toBe(point);
  });
});

describe('hitObjectsAt', () => {
  test('returns objects whose hasPoint matches', () => {
    const a = fakePoint(10, 10);
    const b = fakePoint(100, 100);
    const got = hitObjectsAt([a, b], 10, 10, new Set());
    expect(got).toEqual([a]);
  });

  test('skips objects in exclude set', () => {
    const phantom = fakePoint(10, 10);
    const previewCircle = fakeCircle(() => true);
    const real = fakePoint(11, 10);
    const got = hitObjectsAt(
      [phantom, previewCircle, real],
      10, 10,
      new Set([phantom, previewCircle]),
    );
    expect(got).toEqual([real]);
  });

  test('skips objects without hasPoint', () => {
    const broken = { hasPoint: undefined };
    const ok = fakePoint(5, 5);
    const got = hitObjectsAt([broken, ok], 5, 5, new Set());
    expect(got).toEqual([ok]);
  });

  test('swallows hasPoint exceptions', () => {
    const throwing = { hasPoint: () => { throw new Error('stale'); } };
    const ok = fakePoint(5, 5);
    const got = hitObjectsAt([throwing, ok], 5, 5, new Set());
    expect(got).toEqual([ok]);
  });
});
