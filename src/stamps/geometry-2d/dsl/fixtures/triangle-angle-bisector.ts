// src/stamps/geometry-2d/dsl/fixtures/triangle-angle-bisector.ts
import type { DslInputT } from '../schema';

export const fixture: { problem: string; dsl: DslInputT } = {
  problem: 'Tam giác ABC, AD là phân giác góc A (D thuộc BC).',
  dsl: {
    version: 1,
    points: [
      { name: 'A', kind: 'free', x: 0, y: 3 },
      { name: 'B', kind: 'free', x: -2, y: 0 },
      { name: 'C', kind: 'free', x: 3, y: 0 },
      // D = giao của đường phân giác góc A với BC. KHÔNG dùng segment AD
      // vì AD lại tham chiếu D → cycle.
      { name: 'D', kind: 'intersection', ref1: 'bisA', ref2: 'BC' },
    ],
    shapes: [
      { name: 'ABC', kind: 'polygon', vertices: ['A', 'B', 'C'] },
      { name: 'BC', kind: 'segment', p1: 'B', p2: 'C' },
      // Đường phân giác (line construction), chứ không phải segment.
      { name: 'bisA', kind: 'angleBisector', p1: 'B', vertex: 'A', p2: 'C' },
      // Sau khi đã có D, mới dựng được segment AD.
      { name: 'AD', kind: 'segment', p1: 'A', p2: 'D' },
    ],
  },
};
