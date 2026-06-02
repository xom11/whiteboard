// src/stamps/geometry-2d/dsl/fixtures/two-circles-cr-intersect.ts
//
// 2 đường tròn cho bởi tâm + bán kính số, cắt nhau tại 2 điểm có tên.
// Khác `two-circles-intersect.ts` ở chỗ dùng circleCR (R numeric) + named
// giao điểm qua kind circleIntersection.
import type { DslInputT } from '../schema';

export const fixture: { problem: string; dsl: DslInputT } = {
  problem: "Cho (O; R=2) và (O'; R=2) cắt nhau tại A và B (OO' = 3).",
  dsl: {
    version: 1,
    points: [
      { name: 'O', kind: 'free', x: 0, y: 0 },
      { name: 'Op', kind: 'free', x: 3, y: 0 },
      { name: 'A', kind: 'circleIntersection', c1: 'k1', c2: 'k2', which: 0 },
      { name: 'B', kind: 'circleIntersection', c1: 'k1', c2: 'k2', which: 1 },
    ],
    shapes: [
      { name: 'k1', kind: 'circleCR', center: 'O', radius: 2 },
      { name: 'k2', kind: 'circleCR', center: 'Op', radius: 2 },
    ],
  },
};
