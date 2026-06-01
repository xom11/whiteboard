// src/stamps/geometry-2d/dsl/fixtures/internal-external-bisector.ts
//
// Tam giác ABC, tại đỉnh A có 2 tia phân giác: trong (angleBisector) và
// ngoài (vuông góc với phân giác trong tại A). Dùng `perpendicular` shape
// với throughPoint=A, toLine=bisIn.
import type { DslInputT } from '../schema';

export const fixture: { problem: string; dsl: DslInputT } = {
  problem: 'Tam giác ABC, vẽ tia phân giác trong và phân giác ngoài tại đỉnh A.',
  dsl: {
    version: 1,
    points: [
      { name: 'A', kind: 'free', x: 0, y: 3 },
      { name: 'B', kind: 'free', x: -2, y: 0 },
      { name: 'C', kind: 'free', x: 3, y: 0 },
    ],
    shapes: [
      { name: 'ABC', kind: 'polygon', vertices: ['A', 'B', 'C'] },
      { name: 'bisIn', kind: 'angleBisector', p1: 'B', vertex: 'A', p2: 'C' },
      // Phân giác ngoài = vuông góc với phân giác trong tại đỉnh A.
      { name: 'bisExt', kind: 'perpendicular', throughPoint: 'A', toLine: 'bisIn' },
    ],
  },
};
