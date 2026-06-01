// src/stamps/geometry-2d/ai/refineFixtures.ts
//
// Refine fixtures: { name, currentDsl, instruction, expectedEnvelope }
// Dùng cho:
//   - 6-8 đầu: few-shot trong refinePrompt
//   - Tất cả 10: integration smoke test (gated)
//
// Pattern: currentDsl đại diện state đã có (sau build trước), instruction là
// chỉ thị bổ sung. expectedEnvelope là ground truth AI nên emit.

import type { DslInputT } from '../dsl/schema';
import type { FigureRefineEnvelopeT } from './refineEnvelope';

export interface RefineFixture {
  name: string;
  currentDsl: DslInputT;
  instruction: string;
  expectedEnvelope: FigureRefineEnvelopeT;
}

const triangleABC: DslInputT = {
  version: 1,
  points: [
    { name: 'A', kind: 'free', x: 0, y: 3 },
    { name: 'B', kind: 'free', x: -2, y: 0 },
    { name: 'C', kind: 'free', x: 3, y: 0 },
  ],
  shapes: [{ name: 'ABC', kind: 'polygon', vertices: ['A', 'B', 'C'] }],
};

const rightTriangleAtA: DslInputT = {
  version: 1,
  points: [
    { name: 'A', kind: 'free', x: 0, y: 0 },
    { name: 'B', kind: 'free', x: 4, y: 0 },
    { name: 'C', kind: 'free', x: 0, y: 3 },
  ],
  shapes: [{ name: 'ABC', kind: 'polygon', vertices: ['A', 'B', 'C'] }],
};

const parallelogramABCD: DslInputT = {
  version: 1,
  points: [
    { name: 'A', kind: 'free', x: -2, y: 0 },
    { name: 'B', kind: 'free', x: 3, y: 0 },
    { name: 'C', kind: 'free', x: 4, y: 2 },
    { name: 'D', kind: 'free', x: -1, y: 2 },
  ],
  shapes: [{ name: 'ABCD', kind: 'polygon', vertices: ['A', 'B', 'C', 'D'] }],
};

const circleOnA: DslInputT = {
  version: 1,
  points: [
    { name: 'O', kind: 'free', x: 0, y: 0 },
    { name: 'A', kind: 'free', x: 3, y: 0 },
  ],
  shapes: [{ name: 'omega', kind: 'circleCP', center: 'O', surfacePoint: 'A' }],
};

export const REFINE_FIXTURES: RefineFixture[] = [
  {
    name: 'triangle-add-midpoint',
    currentDsl: triangleABC,
    instruction: 'Thêm trung điểm M của BC',
    expectedEnvelope: {
      decision: 'add',
      figure: {
        version: 1,
        points: [{ name: 'M', kind: 'midpoint', p1: 'B', p2: 'C' }],
        shapes: [{ name: 'AM', kind: 'segment', p1: 'A', p2: 'M' }],
      },
    },
  },
  {
    name: 'triangle-add-altitude',
    currentDsl: triangleABC,
    instruction: 'Dựng đường cao AH xuống BC',
    expectedEnvelope: {
      decision: 'add',
      figure: {
        version: 1,
        points: [{ name: 'H', kind: 'perpFoot', from: 'A', onLine: 'BC_line' }],
        shapes: [
          { name: 'BC_line', kind: 'line', p1: 'B', p2: 'C' },
          { name: 'AH', kind: 'segment', p1: 'A', p2: 'H' },
        ],
      },
    },
  },
  {
    name: 'triangle-add-circumcircle',
    currentDsl: triangleABC,
    instruction: 'Vẽ đường tròn ngoại tiếp tam giác ABC',
    expectedEnvelope: {
      decision: 'add',
      figure: {
        version: 1,
        points: [{ name: 'O', kind: 'circumcenter', vertices: ['A', 'B', 'C'] }],
        shapes: [{ name: 'omega', kind: 'circle3', p1: 'A', p2: 'B', p3: 'C' }],
      },
    },
  },
  {
    name: 'right-triangle-add-centroid',
    currentDsl: rightTriangleAtA,
    instruction: 'Thêm trọng tâm G của tam giác',
    expectedEnvelope: {
      decision: 'add',
      figure: {
        version: 1,
        points: [{ name: 'G', kind: 'centroid', vertices: ['A', 'B', 'C'] }],
        shapes: [],
      },
    },
  },
  {
    name: 'parallelogram-add-diagonals',
    currentDsl: parallelogramABCD,
    instruction: 'Vẽ hai đường chéo AC, BD và giao điểm O',
    expectedEnvelope: {
      decision: 'add',
      figure: {
        version: 1,
        points: [{ name: 'O', kind: 'intersection', ref1: 'AC', ref2: 'BD' }],
        shapes: [
          { name: 'AC', kind: 'segment', p1: 'A', p2: 'C' },
          { name: 'BD', kind: 'segment', p1: 'B', p2: 'D' },
        ],
      },
    },
  },
  {
    name: 'circle-add-tangent',
    currentDsl: circleOnA,
    instruction: 'Kẻ tiếp tuyến tại A của đường tròn',
    expectedEnvelope: {
      decision: 'add',
      figure: {
        version: 1,
        points: [],
        shapes: [{ name: 't', kind: 'tangent', throughPoint: 'A', toCircle: 'omega' }],
      },
    },
  },
  {
    name: 'triangle-replace-equilateral',
    currentDsl: triangleABC,
    instruction: 'Bỏ tam giác này, vẽ tam giác đều ABC thay vào',
    expectedEnvelope: {
      decision: 'replace',
      figure: {
        version: 1,
        points: [
          { name: 'A', kind: 'free', x: 0, y: 2 },
          { name: 'B', kind: 'free', x: -1.732, y: -1 },
          { name: 'C', kind: 'free', x: 1.732, y: -1 },
        ],
        shapes: [{ name: 'ABC', kind: 'polygon', vertices: ['A', 'B', 'C'] }],
      },
    },
  },
  {
    name: 'triangle-replace-rhombus',
    currentDsl: triangleABC,
    instruction: 'Đổi sang hình thoi ABCD',
    expectedEnvelope: {
      decision: 'replace',
      figure: {
        version: 1,
        points: [
          { name: 'A', kind: 'free', x: -2, y: 0 },
          { name: 'B', kind: 'free', x: 0, y: 1.5 },
          { name: 'C', kind: 'free', x: 2, y: 0 },
          { name: 'D', kind: 'free', x: 0, y: -1.5 },
        ],
        shapes: [{ name: 'ABCD', kind: 'polygon', vertices: ['A', 'B', 'C', 'D'] }],
      },
    },
  },
  {
    name: 'refuse-calculation',
    currentDsl: triangleABC,
    instruction: 'Tính diện tích tam giác ABC',
    expectedEnvelope: {
      decision: 'refuse',
      reason: 'Yêu cầu tính toán, không phải vẽ hình.',
    },
  },
  {
    name: 'refuse-3d',
    currentDsl: triangleABC,
    instruction: 'Vẽ hình chóp SABC với S nằm trên tam giác',
    expectedEnvelope: {
      decision: 'refuse',
      reason: 'Hình 3D ngoài phạm vi geometry-2d.',
    },
  },
];

/** 8 fixture đầu dùng cho few-shot prompt (bỏ 2 refuse cuối để prompt không bias refuse). */
export const REFINE_PROMPT_FIXTURES = REFINE_FIXTURES.slice(0, 8);
