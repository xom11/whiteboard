// src/stamps/geometry-2d/dsl/fixtures/extend-chord-bc-radius.ts
//
// Cho (O; R=3) và dây AB. Kéo dài AB về phía B, lấy C sao cho BC = R.
// Anchor cho pointAtDistance (distance = circleRadius).
import type { DslInputT } from '../schema';

export const fixture: { problem: string; dsl: DslInputT } = {
  problem: 'Cho đường tròn (O; R) và dây AB. Kéo dài AB về phía B, lấy điểm C sao cho BC = R.',
  dsl: {
    version: 1,
    points: [
      { name: 'O', kind: 'free', x: 0, y: 0 },
      { name: 'A', kind: 'free', x: 3, y: 0 },
      { name: 'B', kind: 'free', x: 0, y: 3 },
      { name: 'C', kind: 'pointAtDistance', from: 'A', through: 'B', distance: { kind: 'circleRadius', circle: 'k' } },
    ],
    shapes: [
      { name: 'k', kind: 'circleCR', center: 'O', radius: 3 },
      { name: 'AB', kind: 'segment', p1: 'A', p2: 'B' },
    ],
  },
};
