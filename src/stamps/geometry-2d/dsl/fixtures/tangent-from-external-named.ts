// src/stamps/geometry-2d/dsl/fixtures/tangent-from-external-named.ts
//
// Đường tròn cho bởi tâm + bán kính số, điểm ngoài, 2 tiếp tuyến với tiếp
// điểm được đặt tên. Khác `tangent-from-point.ts` ở chỗ tiếp điểm có name.
import type { DslInputT } from '../schema';

export const fixture: { problem: string; dsl: DslInputT } = {
  problem: 'Cho (O; R=3) và điểm A ngoài (O). Vẽ 2 tiếp tuyến AB, AC tới (O) (B, C là tiếp điểm).',
  dsl: {
    version: 1,
    points: [
      { name: 'O', kind: 'free', x: 0, y: 0 },
      { name: 'A', kind: 'free', x: 5, y: 0 },
      { name: 'B', kind: 'tangentPointExt', from: 'A', circle: 'k', which: 0 },
      { name: 'C', kind: 'tangentPointExt', from: 'A', circle: 'k', which: 1 },
    ],
    shapes: [
      { name: 'k', kind: 'circleCR', center: 'O', radius: 3 },
      { name: 'tAB', kind: 'tangent', throughPoint: 'A', toCircle: 'k', branch: 0 },
      { name: 'tAC', kind: 'tangent', throughPoint: 'A', toCircle: 'k', branch: 1 },
      { name: 'BC', kind: 'segment', p1: 'B', p2: 'C' },
    ],
  },
};
