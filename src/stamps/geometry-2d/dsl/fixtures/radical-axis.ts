// src/stamps/geometry-2d/dsl/fixtures/radical-axis.ts
//
// Trục đẳng phương 2 đường tròn (issue #47, construct 2): đường ⊥ đường nối tâm
// O₁O₂, tại điểm có lũy thừa (power) bằng nhau với 2 đường tròn. Kind mới
// `radicalAxis` (tham chiếu 2 CIRCLE, không phải 2 điểm — circle-derived line).
// 2 đường tròn KHÔNG đồng tâm, KHÔNG giao nhau (d=6 > r₁+r₂=5) → trục vẫn xác
// định (foot ngoài). Geometric assert (equal-power) ở `ai/__tests__/radicalAxis-e2e.test.ts`.
import type { DslInputT } from '../schema';

export const fixture: { problem: string; dsl: DslInputT } = {
  problem: 'Cho hai đường tròn (O₁; 3) và (O₂; 2). Vẽ trục đẳng phương.',
  dsl: {
    version: 1,
    points: [
      { name: 'O1', kind: 'free', x: 0, y: 0 },
      { name: 'O2', kind: 'free', x: 6, y: 0 },
    ],
    shapes: [
      { name: 'w1', kind: 'circleCR', center: 'O1', radius: 3 },
      { name: 'w2', kind: 'circleCR', center: 'O2', radius: 2 },
      { name: 'rad', kind: 'radicalAxis', circle1: 'w1', circle2: 'w2' },
    ],
  },
};
