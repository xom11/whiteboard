// src/stamps/geometry-2d/dsl/fixtures/trapezoid.ts
//
// Hình thang ABCD với AB // CD. Toạ độ chọn sao cho AB và CD song song
// (cùng đi theo trục y = constant). AI học pattern "polygon với 2 cạnh
// song song bằng cách chọn coord trùng y" — không cần emit `parallel` shape.
import type { DslInputT } from '../schema';

export const fixture: { problem: string; dsl: DslInputT } = {
  problem: 'Hình thang ABCD có AB song song CD.',
  dsl: {
    version: 1,
    points: [
      { name: 'A', kind: 'free', x: 0, y: 0 },
      { name: 'B', kind: 'free', x: 4, y: 0 },
      { name: 'C', kind: 'free', x: 5, y: 3 },
      { name: 'D', kind: 'free', x: -1, y: 3 },
    ],
    shapes: [
      { name: 'ABCD', kind: 'polygon', vertices: ['A', 'B', 'C', 'D'] },
    ],
  },
};
