// src/stamps/geometry-2d/dsl/fixtures/nine-point-circle.ts
//
// Đường tròn chín điểm / đường tròn Euler (issue #47, construct 4): đường tròn đi
// qua 3 trung điểm cạnh + 3 chân đường cao + 3 trung điểm đỉnh-trực tâm; bán kính
// = R/2. Dựng = circle3 qua 3 TRUNG ĐIỂM CẠNH (đủ xác định đường tròn; 6 điểm còn
// lại tự nằm trên — định lý nine-point) → TRÁNH hạ tầng radius-scaling (decision B).
// Compose midpoint×3 + circle3 — KHÔNG kind DSL mới. Geometric assert (qua 3 chân
// đường cao + R/2) ở `ai/__tests__/ninePointCircle-e2e.test.ts`.
import type { DslInputT } from '../schema';

export const fixture: { problem: string; dsl: DslInputT } = {
  problem: 'Cho tam giác ABC. Vẽ đường tròn chín điểm của tam giác ABC.',
  dsl: {
    version: 1,
    points: [
      { name: 'A', kind: 'free', x: 0, y: 0 },
      { name: 'B', kind: 'free', x: 6, y: 0 },
      { name: 'C', kind: 'free', x: 2, y: 5 },
      // 3 trung điểm cạnh — xác định đường tròn chín điểm.
      { name: 'Mab', kind: 'midpoint', p1: 'A', p2: 'B' },
      { name: 'Mbc', kind: 'midpoint', p1: 'B', p2: 'C' },
      { name: 'Mca', kind: 'midpoint', p1: 'C', p2: 'A' },
    ],
    shapes: [
      { name: 'ABC', kind: 'polygon', vertices: ['A', 'B', 'C'] },
      { name: 'N9', kind: 'circle3', p1: 'Mab', p2: 'Mbc', p3: 'Mca' },
    ],
  },
};
