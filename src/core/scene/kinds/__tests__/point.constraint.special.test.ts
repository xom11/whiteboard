import { constraintRefs2D } from '../2d-constraint';

describe('Constraint2D — special shape constraints', () => {
  it('onPerpendicular returns through + perpToA + perpToB', () => {
    expect(
      constraintRefs2D({ kind: 'onPerpendicular', through: 'p1', perpToA: 'p2', perpToB: 'p3', t: 0 }),
    ).toEqual(['p1', 'p2', 'p3']);
  });

  it('onPerpBisector returns p1 + p2', () => {
    expect(constraintRefs2D({ kind: 'onPerpBisector', p1: 'a', p2: 'b', t: 0 })).toEqual(['a', 'b']);
  });

  it('onCircleAroundPoint returns center + radiusPoint', () => {
    expect(
      constraintRefs2D({ kind: 'onCircleAroundPoint', center: 'c', radiusPoint: 'r', theta: 0 }),
    ).toEqual(['c', 'r']);
  });

  it('tangentPointExt returns from + circle', () => {
    expect(
      constraintRefs2D({ kind: 'tangentPointExt', from: 'A', circle: 'k', which: 0 }),
    ).toEqual(['A', 'k']);
  });

  it('tangentPointExt with which=1 returns same refs', () => {
    expect(
      constraintRefs2D({ kind: 'tangentPointExt', from: 'A', circle: 'k', which: 1 }),
    ).toEqual(['A', 'k']);
  });

  it('circleIntersection returns c1 + c2', () => {
    expect(
      constraintRefs2D({ kind: 'circleIntersection', c1: 'k1', c2: 'k2', which: 0 }),
    ).toEqual(['k1', 'k2']);
  });

  it('secondIntersection returns line + circle + other', () => {
    expect(
      constraintRefs2D({ kind: 'secondIntersection', line: 'l1', circle: 'k1', other: 'A' }),
    ).toEqual(['l1', 'k1', 'A']);
  });

  it('tangencyPoint returns circle + onLine', () => {
    expect(
      constraintRefs2D({ kind: 'tangencyPoint', circle: 'k1', onLine: 'l1' }),
    ).toEqual(['k1', 'l1']);
  });
});
