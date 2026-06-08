// src/stamps/geometry-2d/dsl/fixtures/euler-line.ts
//
// Đường thẳng Euler (issue #47, construct 1): đường thẳng đi qua 3 tâm tam giác
// THẲNG HÀNG — trọng tâm G, trực tâm H, tâm ngoại tiếp O. Dựng bằng kind mới
// `lineThrough` (≥2 điểm, render đường vô hạn qua 2 điểm xa nhau nhất). Tam giác
// scalene cố định (A,B,C) → G/H/O phân biệt, KHÔNG suy biến (khác equilateral
// G≡H≡O). Geometric assert (G,H,O collinear) ở `ai/__tests__/eulerLine-e2e.test.ts`.
import type { DslInputT } from '../schema';

export const fixture: { problem: string; dsl: DslInputT } = {
  problem:
    'Cho tam giác ABC. Đường thẳng Euler đi qua trọng tâm G, trực tâm H và tâm đường tròn ngoại tiếp O.',
  dsl: {
    version: 1,
    points: [
      // Tam giác scalene (AB=6, AC=√17, BC=√41 — 3 cạnh khác nhau) → 3 tâm phân biệt.
      { name: 'A', kind: 'free', x: 0, y: 0 },
      { name: 'B', kind: 'free', x: 6, y: 0 },
      { name: 'C', kind: 'free', x: 1, y: 4 },
      { name: 'G', kind: 'centroid', vertices: ['A', 'B', 'C'] },
      { name: 'H', kind: 'orthocenter', vertices: ['A', 'B', 'C'] },
      { name: 'O', kind: 'circumcenter', vertices: ['A', 'B', 'C'] },
    ],
    shapes: [
      { name: 'ABC', kind: 'polygon', vertices: ['A', 'B', 'C'] },
      { name: 'eulerABC', kind: 'lineThrough', points: ['G', 'H', 'O'] },
    ],
  },
};
