// src/stamps/geometry-2d/ai/normalizeIntent.ts
//
// Post-LLM variant normalizer cho Intent pipeline.
//
// Mục đích: fix 2 nhóm bias quan sát được trong eval gemma3:12b:
//   1. LLM emit isoceles variant SAI position (vd "cân tại A" → 'isoceles-AB'
//      thay vì 'isoceles-BC') vì naming rule canonical không trực giác.
//   2. LLM follow prompt "rectangle: wide | tall" → emit 'wide' trong khi
//      eval + đa số sản phẩm muốn 'standard' (rendering identical với 'wide').
//
// Pure function, không mutate input.

import type { IntentT, DrawShapeIntentT } from './intent';

const CAN_TAI_RE = /c[aâ]n\s+t[aạ]i\s+([A-Z])/i;
const ISOCELES_AT_RE = /isoceles\s+(?:at|with\s+apex)\s+([A-Z])/i;

/**
 * Apply variant normalization. Returns new array; input unmodified.
 *
 * Rules áp dụng (chỉ override khi MATCH chắc; otherwise pass-through):
 *   - triangle + "cân tại X" → variant theo position của X trong labels
 */
export function normalizeIntents(
  intents: readonly IntentT[],
  problem: string,
): IntentT[] {
  return intents.map((intent) => {
    if (intent.op !== 'draw-shape') return intent;
    return normalizeShape(intent, problem);
  });
}

function normalizeShape(intent: DrawShapeIntentT, problem: string): IntentT {
  switch (intent.shape) {
    case 'triangle':
      return normalizeTriangle(intent, problem);
    default:
      return intent;
  }
}

function normalizeTriangle(
  intent: DrawShapeIntentT,
  problem: string,
): DrawShapeIntentT {
  const m = problem.match(CAN_TAI_RE) ?? problem.match(ISOCELES_AT_RE);
  if (!m) return intent;
  const apex = m[1].toUpperCase();
  const i = intent.labels.indexOf(apex);
  if (i < 0) return intent;
  const variantByPos: Record<number, DrawShapeIntentT['variant']> = {
    0: 'isoceles-BC',
    1: 'isoceles-CA',
    2: 'isoceles-AB',
  };
  const target = variantByPos[i];
  if (!target || intent.variant === target) return intent;
  return { ...intent, variant: target };
}
