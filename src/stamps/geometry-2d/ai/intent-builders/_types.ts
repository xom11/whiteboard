// src/stamps/geometry-2d/ai/intent-builders/_types.ts
//
// Shared types cho intent-builders: BuildState (mutable build context),
// newState() factory, IntentBuilderError, và IntentBuilder signature.
// Tách ra từ intentToDsl.ts (Phase 2a, #45) — không đổi logic.

import type { DslPointT, DslShapeT } from '../../dsl/schema';
import type { IntentT } from '../intent';

export interface BuildState {
  points: DslPointT[];
  shapes: DslShapeT[];
  /** Map label → ensures uniqueness. */
  pointNames: Set<string>;
  shapeNames: Set<string>;
  /** Map "AB"/"BA" → segment shape name, dùng cho lookup of='BC'. */
  segmentByEnds: Map<string, string>;
}

export function newState(): BuildState {
  return {
    points: [],
    shapes: [],
    pointNames: new Set(),
    shapeNames: new Set(),
    segmentByEnds: new Map(),
  };
}

export class IntentBuilderError extends Error {
  constructor(
    message: string,
    public readonly intent: IntentT,
    public readonly cause?: string,
  ) {
    super(message);
    this.name = 'IntentBuilderError';
  }
}

/** Builder mutate BuildState theo 1 intent op (idempotent, giữ thứ tự gọi). */
export type IntentBuilder<T extends IntentT = IntentT> = (s: BuildState, intent: T) => void;
