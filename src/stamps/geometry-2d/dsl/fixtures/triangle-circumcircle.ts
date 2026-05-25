// src/stamps/geometry-2d/dsl/fixtures/triangle-circumcircle.ts
import type { DslInputT } from '../schema';

export const fixture: { problem: string; dsl: DslInputT } = {
  problem: 'Tam giác ABC nội tiếp đường tròn tâm O.',
  dsl: {
    version: 1,
    points: [
      { name: 'A', kind: 'free', x: 0, y: 3 },
      { name: 'B', kind: 'free', x: -2, y: 0 },
      { name: 'C', kind: 'free', x: 3, y: 0 },
      { name: 'O', kind: 'circumcenter', vertices: ['A', 'B', 'C'] },
    ],
    shapes: [
      { name: 'ABC', kind: 'polygon', vertices: ['A', 'B', 'C'] },
      { name: 'k', kind: 'circle3', p1: 'A', p2: 'B', p3: 'C' },
    ],
  },
};
