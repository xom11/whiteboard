// src/stamps/geometry-2d/dsl/fixtures/right-triangle-altitude.ts
//
// Tam giác ABC vuông tại A, AH là đường cao xuống cạnh huyền BC.
// Coord: A ở gốc, AB trục y, AC trục x → góc vuông tại A.
import type { DslInputT } from '../schema';

export const fixture: { problem: string; dsl: DslInputT } = {
  problem: 'Tam giác ABC vuông tại A, AH là đường cao xuống cạnh huyền BC.',
  dsl: {
    version: 1,
    points: [
      { name: 'A', kind: 'free', x: 0, y: 0 },
      { name: 'B', kind: 'free', x: 0, y: 3 },
      { name: 'C', kind: 'free', x: 4, y: 0 },
      { name: 'H', kind: 'perpFoot', from: 'A', onLine: 'BC' },
    ],
    shapes: [
      { name: 'ABC', kind: 'polygon', vertices: ['A', 'B', 'C'] },
      { name: 'BC', kind: 'segment', p1: 'B', p2: 'C' },
      { name: 'AH', kind: 'segment', p1: 'A', p2: 'H' },
    ],
  },
};
