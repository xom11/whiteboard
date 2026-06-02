import { KIND_REGISTRY, POINT_KINDS, CIRCLE_KINDS } from '../registry';

describe('registry — Tier 4+5 kinds', () => {
  const POINT_NEW = ['secondIntersection', 'circleIntersection', 'tangencyPoint', 'tangentPointExt'];
  const CIRCLE_NEW = ['circleCR', 'incircle'];

  it.each(POINT_NEW)('registers point kind %s', (k) => {
    expect(KIND_REGISTRY.has(k)).toBe(true);
    expect(POINT_KINDS.has(k)).toBe(true);
  });

  it.each(CIRCLE_NEW)('registers circle kind %s', (k) => {
    expect(KIND_REGISTRY.has(k)).toBe(true);
    expect(CIRCLE_KINDS.has(k)).toBe(true);
  });
});
