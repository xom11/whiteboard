// src/stamps/geometry-2d/ai/deterministic/index.ts
//
// Public API: parseDeterministic(problem, opts) → DSL hoàn chỉnh nếu confidence
// ≥ threshold (default 0.85), else miss (caller fallback LLM).

import type { DslInputT, DslPointT, DslShapeT } from '../../dsl/schema';
import { applyDerived } from './derived';
import { parseSkeleton } from './skeleton';
import { scoreConfidence } from './confidence';

export interface ParseOptions {
  /** Confidence threshold để decide hit/miss. Default 0.75. */
  threshold?: number;
}

export type ParseResult =
  | {
      ok: true;
      dsl: DslInputT;
      confidence: number;
      matched: readonly string[];
    }
  | {
      ok: false;
      reason: 'low-confidence' | 'empty';
      confidence: number;
      matched: readonly string[];
    };

const DEFAULT_THRESHOLD = 0.75;

export function parseDeterministic(
  problem: string,
  opts: ParseOptions = {},
): ParseResult {
  const threshold = opts.threshold ?? DEFAULT_THRESHOLD;
  const trimmed = problem.trim();
  if (!trimmed) {
    return { ok: false, reason: 'empty', confidence: 0, matched: [] };
  }

  const skel = parseSkeleton(trimmed);
  const state = {
    points: [...skel.points] as DslPointT[],
    shapes: [...skel.shapes] as DslShapeT[],
    matched: [...skel.matched],
  };
  applyDerived(trimmed, state);

  const confidence = scoreConfidence(trimmed, state.matched);
  if (confidence < threshold) {
    return { ok: false, reason: 'low-confidence', confidence, matched: state.matched };
  }

  const dsl: DslInputT = {
    version: 1,
    points: state.points,
    shapes: state.shapes,
  };
  return { ok: true, dsl, confidence, matched: state.matched };
}

export type { SkeletonResult } from './skeleton';
