// src/stamps/geometry-2d/dsl/fixtures/reflect-over-bc.ts
import type { DslInputT } from '../schema';

export const fixture: { problem: string; dsl: DslInputT } = {
  problem: 'Tam giác ABC trực tâm H. D là điểm đối xứng của H qua BC.',
  dsl: {
    version: 1,
    points: [
      { name: 'A', kind: 'free', x: 0, y: 3 },
      { name: 'B', kind: 'free', x: -2, y: 0 },
      { name: 'C', kind: 'free', x: 3, y: 0 },
      { name: 'H', kind: 'orthocenter', vertices: ['A', 'B', 'C'] },
      { name: 'D', kind: 'reflectLine', of: 'H', through: 'BC' },
    ],
    shapes: [
      { name: 'ABC', kind: 'polygon', vertices: ['A', 'B', 'C'] },
      { name: 'BC', kind: 'segment', p1: 'B', p2: 'C' },
    ],
  },
};
