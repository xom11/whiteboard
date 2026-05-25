// src/stamps/geometry-2d/dsl/fixtures/parallelogram.ts
import type { DslInputT } from '../schema';

export const fixture: { problem: string; dsl: DslInputT } = {
  problem: 'Hình bình hành ABCD, hai đường chéo AC, BD cắt nhau tại O.',
  dsl: {
    version: 1,
    points: [
      { name: 'A', kind: 'free', x: 0, y: 0 },
      { name: 'B', kind: 'free', x: 4, y: 0 },
      { name: 'C', kind: 'free', x: 5, y: 2 },
      { name: 'D', kind: 'free', x: 1, y: 2 },
      { name: 'O', kind: 'intersection', ref1: 'AC', ref2: 'BD' },
    ],
    shapes: [
      { name: 'ABCD', kind: 'polygon', vertices: ['A', 'B', 'C', 'D'] },
      { name: 'AC', kind: 'segment', p1: 'A', p2: 'C' },
      { name: 'BD', kind: 'segment', p1: 'B', p2: 'D' },
    ],
  },
};
