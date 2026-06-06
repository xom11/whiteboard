// src/stamps/geometry-2d/dsl/fixtures/excenter-opposite-a.ts
import type { DslInputT } from '../schema';

export const fixture: { problem: string; dsl: DslInputT } = {
  problem: 'Tam giác ABC, J là tâm bàng tiếp góc A.',
  dsl: {
    version: 1,
    points: [
      { name: 'A', kind: 'free', x: 0, y: 0 },
      { name: 'B', kind: 'free', x: 4, y: 0 },
      { name: 'C', kind: 'free', x: 0, y: 3 },
      { name: 'J', kind: 'excenter', vertices: ['A', 'B', 'C'], opposite: 'A' },
    ],
    shapes: [{ name: 'ABC', kind: 'polygon', vertices: ['A', 'B', 'C'] }],
  },
};
