// src/stamps/geometry-2d/dsl/fixtures/triangle-incircle.ts
import type { DslInputT } from '../schema';

export const fixture: { problem: string; dsl: DslInputT } = {
  problem: 'Tam giác ABC, I là tâm nội tiếp, đường tròn (I) tiếp xúc BC tại D.',
  dsl: {
    version: 1,
    points: [
      { name: 'A', kind: 'free', x: 0, y: 3 },
      { name: 'B', kind: 'free', x: -2, y: 0 },
      { name: 'C', kind: 'free', x: 3, y: 0 },
      { name: 'I', kind: 'incenter', vertices: ['A', 'B', 'C'] },
      { name: 'D', kind: 'perpFoot', from: 'I', onLine: 'BC' },
    ],
    shapes: [
      { name: 'ABC', kind: 'polygon', vertices: ['A', 'B', 'C'] },
      { name: 'BC', kind: 'segment', p1: 'B', p2: 'C' },
      { name: 'incircle', kind: 'circleCP', center: 'I', surfacePoint: 'D' },
    ],
  },
};
