// src/stamps/geometry-2d/dsl/fixtures/circle-cr-chord-midpoint.ts
//
// Đường tròn (O; R=3) với dây AB. M là trung điểm AB.
// Simple anchor cho `circleCR` (center + numeric radius).
import type { DslInputT } from '../schema';

export const fixture: { problem: string; dsl: DslInputT } = {
  problem: 'Cho đường tròn (O; R=3) và dây AB. Gọi M là trung điểm AB.',
  dsl: {
    version: 1,
    points: [
      { name: 'O', kind: 'free', x: 0, y: 0 },
      { name: 'A', kind: 'free', x: 3, y: 0 },
      { name: 'B', kind: 'free', x: 0, y: 3 },
      { name: 'M', kind: 'midpoint', p1: 'A', p2: 'B' },
    ],
    shapes: [
      { name: 'k', kind: 'circleCR', center: 'O', radius: 3 },
      { name: 'AB', kind: 'segment', p1: 'A', p2: 'B' },
    ],
  },
};
