// src/stamps/geometry-2d/dsl/fixtures/triangle-median.ts
import type { DslInputT } from '../schema';

export const fixture: { problem: string; dsl: DslInputT } = {
  problem: 'Tam giác ABC, M là trung điểm BC. Vẽ AM.',
  dsl: {
    version: 1,
    points: [
      { name: 'A', kind: 'free', x: 0, y: 3 },
      { name: 'B', kind: 'free', x: -2, y: 0 },
      { name: 'C', kind: 'free', x: 3, y: 0 },
      { name: 'M', kind: 'midpoint', p1: 'B', p2: 'C' },
    ],
    shapes: [
      { name: 'ABC', kind: 'polygon', vertices: ['A', 'B', 'C'] },
      { name: 'AM', kind: 'segment', p1: 'A', p2: 'M' },
    ],
  },
};
