// src/stamps/geometry-2d/dsl/fixtures/triangle-median-altitude.ts
//
// Compound fixture (2 yêu cầu trong cùng đề): trung điểm + đường cao trên cùng
// cạnh BC. Mục đích dạy AI:
//   - M (midpoint) và H (perpFoot) là 2 điểm RIÊNG, không nhầm nhau.
//   - Có thể tham chiếu chung shape 'BC' (segment) cho cả derivation.
//   - Order points an toàn: A,B,C free → M midpoint → H perpFoot.
import type { DslInputT } from '../schema';

export const fixture: { problem: string; dsl: DslInputT } = {
  problem: 'Tam giác ABC, M là trung điểm BC và AH là đường cao xuống BC.',
  dsl: {
    version: 1,
    points: [
      { name: 'A', kind: 'free', x: 1, y: 3 },
      { name: 'B', kind: 'free', x: -2, y: 0 },
      { name: 'C', kind: 'free', x: 3, y: 0 },
      // M = trung điểm B và C. KHÔNG dùng perpFoot ở đây — đó là H.
      { name: 'M', kind: 'midpoint', p1: 'B', p2: 'C' },
      // H = chân đường vuông góc từ A xuống cạnh BC.
      { name: 'H', kind: 'perpFoot', from: 'A', onLine: 'BC' },
    ],
    shapes: [
      { name: 'ABC', kind: 'polygon', vertices: ['A', 'B', 'C'] },
      { name: 'BC', kind: 'segment', p1: 'B', p2: 'C' },
      { name: 'AM', kind: 'segment', p1: 'A', p2: 'M' },
      { name: 'AH', kind: 'segment', p1: 'A', p2: 'H' },
    ],
  },
};
