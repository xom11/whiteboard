// src/stamps/geometry-2d/dsl/fixtures/tangent-from-point.ts
//
// Từ điểm M ngoài đường tròn (O), kẻ 2 tiếp tuyến tới (O). Dùng
// `tangent` shape với branch 0/1 để emit 2 đường tiếp tuyến đối xứng.
import type { DslInputT } from '../schema';

export const fixture: { problem: string; dsl: DslInputT } = {
  problem: 'Từ điểm M ngoài đường tròn (O), kẻ hai tiếp tuyến tới (O).',
  dsl: {
    version: 1,
    points: [
      { name: 'O', kind: 'free', x: 0, y: 0 },
      // P là điểm trên đường tròn dùng để định bán kính.
      { name: 'P', kind: 'free', x: 2, y: 0 },
      { name: 'M', kind: 'free', x: 5, y: 0 },
    ],
    shapes: [
      { name: 'k', kind: 'circleCP', center: 'O', surfacePoint: 'P' },
      { name: 't1', kind: 'tangent', throughPoint: 'M', toCircle: 'k', branch: 0 },
      { name: 't2', kind: 'tangent', throughPoint: 'M', toCircle: 'k', branch: 1 },
    ],
  },
};
