// src/stamps/geometry-2d/geometry/__tests__/commonTangent.test.ts
import { computeCommonTangentPoint } from '../commonTangent';

type XY = [number, number];

const dist = (p: XY, q: XY): number => Math.hypot(p[0] - q[0], p[1] - q[1]);
const dot = (u: XY, v: XY): number => u[0] * v[0] + u[1] * v[1];
const sub = (p: XY, q: XY): XY => [p[0] - q[0], p[1] - q[1]];

describe('computeCommonTangentPoint', () => {
  test('external: tiếp điểm trên đúng đtròn + bán kính ⊥ tiếp tuyến', () => {
    const O1: XY = [0, 0], r1 = 3;
    const O2: XY = [10, 0], r2 = 1;
    const T1 = computeCommonTangentPoint(O1, r1, O2, r2, 0, 'external', 0);
    const T2 = computeCommonTangentPoint(O1, r1, O2, r2, 1, 'external', 0);
    expect(T1).not.toBeNull();
    expect(T2).not.toBeNull();
    // tiếp điểm trên đúng đường tròn
    expect(dist(T1!, O1)).toBeCloseTo(3, 9);
    expect(dist(T2!, O2)).toBeCloseTo(1, 9);
    // bán kính ⊥ tiếp tuyến tại tiếp điểm
    const tangentVec = sub(T2!, T1!);
    expect(dot(sub(T1!, O1), tangentVec)).toBeCloseTo(0, 9);
    expect(dot(sub(T2!, O2), tangentVec)).toBeCloseTo(0, 9);
  });

  test('internal: tiếp điểm trên đúng đtròn + bán kính ⊥ tiếp tuyến', () => {
    const O1: XY = [0, 0], r1 = 2;
    const O2: XY = [10, 0], r2 = 2; // d=10 > r1+r2=4
    const T1 = computeCommonTangentPoint(O1, r1, O2, r2, 0, 'internal', 0);
    const T2 = computeCommonTangentPoint(O1, r1, O2, r2, 1, 'internal', 0);
    expect(T1).not.toBeNull();
    expect(T2).not.toBeNull();
    expect(dist(T1!, O1)).toBeCloseTo(2, 9);
    expect(dist(T2!, O2)).toBeCloseTo(2, 9);
    const tangentVec = sub(T2!, T1!);
    expect(dot(sub(T1!, O1), tangentVec)).toBeCloseTo(0, 9);
    expect(dot(sub(T2!, O2), tangentVec)).toBeCloseTo(0, 9);
  });

  test('side 0 vs side 1 cho 2 tiếp tuyến KHÁC nhau', () => {
    const O1: XY = [0, 0], r1 = 3;
    const O2: XY = [10, 0], r2 = 1;
    const T1a = computeCommonTangentPoint(O1, r1, O2, r2, 0, 'external', 0);
    const T1b = computeCommonTangentPoint(O1, r1, O2, r2, 0, 'external', 1);
    expect(T1a).not.toBeNull();
    expect(T1b).not.toBeNull();
    expect(dist(T1a!, T1b!)).toBeGreaterThan(1e-6);
  });

  test('|ratio|>1 (external r1=5,r2=1,d=2 → lồng nhau) → null', () => {
    const O1: XY = [0, 0], r1 = 5;
    const O2: XY = [2, 0], r2 = 1; // |(5-1)/2| = 2 > 1
    expect(computeCommonTangentPoint(O1, r1, O2, r2, 0, 'external', 0)).toBeNull();
    expect(computeCommonTangentPoint(O1, r1, O2, r2, 1, 'external', 0)).toBeNull();
  });

  test('d < 1e-9 (2 tâm trùng) → null', () => {
    expect(computeCommonTangentPoint([0, 0], 3, [0, 0], 1, 0, 'external', 0)).toBeNull();
  });

  test('internal khi d < r1+r2 (2 đtròn không đủ tách) → null', () => {
    const O1: XY = [0, 0], r1 = 2;
    const O2: XY = [3, 0], r2 = 2; // d=3 < r1+r2=4 → |(2+2)/3|>1
    expect(computeCommonTangentPoint(O1, r1, O2, r2, 0, 'internal', 0)).toBeNull();
  });
});
