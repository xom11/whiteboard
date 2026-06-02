// src/stamps/geometry-2d/dsl/fixtures/triangle-incircle-tangency.ts
//
// Tam giác ABC + đường tròn nội tiếp (I) + 3 tiếp điểm D, E, F trên 3 cạnh.
// Dùng `incircle` (kind mới) thay vì compute incenter thủ công.
import type { DslInputT } from '../schema';

export const fixture: { problem: string; dsl: DslInputT } = {
  problem: 'Cho tam giác ABC. Đường tròn (I) nội tiếp tiếp xúc BC, CA, AB lần lượt tại D, E, F.',
  dsl: {
    version: 1,
    points: [
      { name: 'A', kind: 'free', x: 0, y: 3 },
      { name: 'B', kind: 'free', x: -2, y: 0 },
      { name: 'C', kind: 'free', x: 2, y: 0 },
      { name: 'D', kind: 'tangencyPoint', circle: 'I', onLine: 'BC' },
      { name: 'E', kind: 'tangencyPoint', circle: 'I', onLine: 'CA' },
      { name: 'F', kind: 'tangencyPoint', circle: 'I', onLine: 'AB' },
    ],
    shapes: [
      { name: 'BC', kind: 'segment', p1: 'B', p2: 'C' },
      { name: 'CA', kind: 'segment', p1: 'C', p2: 'A' },
      { name: 'AB', kind: 'segment', p1: 'A', p2: 'B' },
      { name: 'I', kind: 'incircle', vertices: ['A', 'B', 'C'] },
    ],
  },
};
