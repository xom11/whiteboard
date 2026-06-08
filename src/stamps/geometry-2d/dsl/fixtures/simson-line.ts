// src/stamps/geometry-2d/dsl/fixtures/simson-line.ts
//
// Đường thẳng Simson (issue #47, construct 3): P trên đường tròn ngoại tiếp tam
// giác ABC → 3 chân vuông góc hạ từ P xuống 3 cạnh (BC, CA, AB) THẲNG HÀNG.
// Compose: onCircle (P) + perpFoot×3 + lineThrough (tái dùng từ Euler) — KHÔNG
// kind DSL mới. Geometric assert (3 chân collinear) ở `ai/__tests__/simsonLine-e2e.test.ts`.
import type { DslInputT } from '../schema';

export const fixture: { problem: string; dsl: DslInputT } = {
  problem:
    'Cho tam giác ABC nội tiếp đường tròn (O). P là điểm trên (O). Vẽ đường thẳng Simson của P.',
  dsl: {
    version: 1,
    points: [
      { name: 'A', kind: 'free', x: 0, y: 0 },
      { name: 'B', kind: 'free', x: 6, y: 0 },
      { name: 'C', kind: 'free', x: 1, y: 5 },
      // P trên đường tròn ngoại tiếp, góc 0.7 rad (không trùng đỉnh).
      { name: 'P', kind: 'onCircle', circleId: 'O', theta: 0.7 },
      // 3 chân vuông góc từ P xuống 3 cạnh (đường vô hạn).
      { name: 'Pbc', kind: 'perpFoot', from: 'P', onLine: 'sBC' },
      { name: 'Pca', kind: 'perpFoot', from: 'P', onLine: 'sCA' },
      { name: 'Pab', kind: 'perpFoot', from: 'P', onLine: 'sAB' },
    ],
    shapes: [
      { name: 'ABC', kind: 'polygon', vertices: ['A', 'B', 'C'] },
      { name: 'O', kind: 'circle3', p1: 'A', p2: 'B', p3: 'C' },
      { name: 'sBC', kind: 'segment', p1: 'B', p2: 'C' },
      { name: 'sCA', kind: 'segment', p1: 'C', p2: 'A' },
      { name: 'sAB', kind: 'segment', p1: 'A', p2: 'B' },
      { name: 'simsonP', kind: 'lineThrough', points: ['Pbc', 'Pca', 'Pab'] },
    ],
  },
};
