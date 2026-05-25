// src/stamps/geometry-2d/dsl/fixtures/two-circles-intersect.ts
import type { DslInputT } from '../schema';

export const fixture: { problem: string; dsl: DslInputT } = {
  problem: 'Hai đường tròn (O₁), (O₂) cắt nhau tại P, Q.',
  dsl: {
    version: 1,
    points: [
      { name: 'O1', kind: 'free', x: 0, y: 0 },
      { name: 'A1', kind: 'free', x: 2, y: 0 },
      { name: 'O2', kind: 'free', x: 3, y: 0 },
      { name: 'A2', kind: 'free', x: 5, y: 0 },
      { name: 'P', kind: 'intersection', ref1: 'k1', ref2: 'k2', branch: 0 },
      { name: 'Q', kind: 'intersection', ref1: 'k1', ref2: 'k2', branch: 1 },
    ],
    shapes: [
      { name: 'k1', kind: 'circleCP', center: 'O1', surfacePoint: 'A1' },
      { name: 'k2', kind: 'circleCP', center: 'O2', surfacePoint: 'A2' },
    ],
  },
};
