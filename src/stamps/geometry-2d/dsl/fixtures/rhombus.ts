// src/stamps/geometry-2d/dsl/fixtures/rhombus.ts
//
// Hình thoi ABCD: 4 cạnh bằng nhau, 2 đường chéo cắt nhau tại tâm O.
// Coord chọn sao cho ABCD đối xứng qua O và độ dài 4 cạnh bằng nhau.
import type { DslInputT } from '../schema';

export const fixture: { problem: string; dsl: DslInputT } = {
  problem: 'Hình thoi ABCD, hai đường chéo AC, BD cắt nhau tại O.',
  dsl: {
    version: 1,
    points: [
      { name: 'A', kind: 'free', x: 0, y: 2 },
      { name: 'B', kind: 'free', x: 3, y: 0 },
      { name: 'C', kind: 'free', x: 0, y: -2 },
      { name: 'D', kind: 'free', x: -3, y: 0 },
      { name: 'O', kind: 'intersection', ref1: 'AC', ref2: 'BD' },
    ],
    shapes: [
      { name: 'ABCD', kind: 'polygon', vertices: ['A', 'B', 'C', 'D'] },
      { name: 'AC', kind: 'segment', p1: 'A', p2: 'C' },
      { name: 'BD', kind: 'segment', p1: 'B', p2: 'D' },
    ],
  },
};
