// src/stamps/geometry-2d/dsl/fixtures/bisector-meets-circumcircle.ts
//
// Tam giác ABC nội tiếp (O). Phân giác AD của góc A (D ∈ BC) cắt (O) tại
// điểm thứ hai E. Demo `secondIntersection` kind cho line ∩ circle với
// điểm thứ nhất đã biết (A).
import type { DslInputT } from '../schema';

export const fixture: { problem: string; dsl: DslInputT } = {
  problem: 'Cho tam giác ABC nội tiếp đường tròn (O). Phân giác AD của góc A (D ∈ BC) cắt (O) tại điểm thứ hai E.',
  dsl: {
    version: 1,
    points: [
      { name: 'A', kind: 'free', x: 0, y: 3 },
      { name: 'B', kind: 'free', x: -2, y: 0 },
      { name: 'C', kind: 'free', x: 2, y: 0 },
      { name: 'D', kind: 'intersection', ref1: 'ab', ref2: 'BC' },
      { name: 'E', kind: 'secondIntersection', line: 'AD', circle: 'O', other: 'A' },
    ],
    shapes: [
      { name: 'BC', kind: 'segment', p1: 'B', p2: 'C' },
      { name: 'O', kind: 'circle3', p1: 'A', p2: 'B', p3: 'C' },
      { name: 'ab', kind: 'angleBisector', p1: 'B', vertex: 'A', p2: 'C' },
      { name: 'AD', kind: 'segment', p1: 'A', p2: 'D' },
    ],
  },
};
