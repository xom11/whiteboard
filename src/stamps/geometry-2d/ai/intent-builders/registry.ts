// src/stamps/geometry-2d/ai/intent-builders/registry.ts
//
// OP_BUILDERS: map intent.op → builder (Phase 2b, #45).
// Thêm 1 op = 1 builder module + 1 dòng ở đây, không sửa switch trung tâm.

import type { BuildState } from './_types';
import type { IntentT } from '../intent';
import { buildDrawShape } from './draw-shape';
import { buildAddPoint } from './add-point';
import { buildConnect } from './connect';
import { buildDrawCircle } from './draw-circle';
import { buildDrawLine } from './draw-line';
import { buildMarkShape } from './mark-shape';

export const OP_BUILDERS: Record<IntentT['op'], (s: BuildState, intent: any) => void> = {
  'draw-shape': buildDrawShape,
  'add-point': buildAddPoint,
  'connect': buildConnect,
  'draw-circle': buildDrawCircle,
  'draw-line': buildDrawLine,
  'mark-shape': buildMarkShape,
};
