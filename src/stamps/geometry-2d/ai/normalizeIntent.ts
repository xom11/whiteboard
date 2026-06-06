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

import type { IntentT, DrawShapeIntentT, DrawLineIntentT } from './intent';

const CAN_TAI_RE = /c[aâ]n\s+t[aạ]i\s+([A-Z])/i;
const ISOCELES_AT_RE = /isoceles\s+(?:at|with\s+apex)\s+([A-Z])/i;
const TALL_RECT_RE = /(cao|hẹp|thin|tall|portrait)/i;

/**
 * Apply variant normalization. Returns new array; input unmodified.
 *
 * Rules áp dụng (chỉ override khi MATCH chắc; otherwise pass-through):
 *   - triangle + "cân tại X" → variant theo position của X trong labels
 *   - rectangle: default 'standard' (giữ 'tall' khi đề có "cao"/"hẹp")
 *   - square|rhombus|parallelogram: ép 'standard' (chỉ 1 variant hợp lệ)
 */
export function normalizeIntents(
  intents: readonly IntentT[],
  problem: string,
): IntentT[] {
  // Đếm tam giác: chỉ normalize "cân tại X" khi đề có ĐÚNG 1 tam giác — đa tam
  // giác thì không thể bind "cân tại X" toàn-problem cho đúng tam giác, mà rule
  // deterministic (window) / LLM đã set variant per-intent → tin theo đó.
  const triangleCount = intents.filter(
    (i) => i.op === 'draw-shape' && i.shape === 'triangle',
  ).length;
  return intents.map((intent) => {
    if (intent.op === 'draw-shape') return normalizeShape(intent, problem, triangleCount);
    if (intent.op === 'draw-line') return normalizeLine(intent);
    return intent;
  });
}

// Builder enforce strict field per kind. LLM nhầm field giữa các kind cùng
// schema (through/from/to/circle/which đều optional). Fix: swap field khi
// pattern rõ ràng (no ambiguity).
//
// Rules:
//   - tangentAt cần `through` (điểm trên đường tròn). Nếu LLM dùng `from` → swap.
//   - tangentFromExt cần `from` (điểm ngoài). Nếu LLM dùng `through` → swap.
//   - perpThrough / parallelThrough cần `through` (điểm) + `to` (line).
//     Nếu LLM dùng `from` thay `through` → swap.
function normalizeLine(intent: DrawLineIntentT): DrawLineIntentT {
  if (intent.kind === 'tangentAt' && intent.from && !intent.through) {
    const { from, ...rest } = intent;
    return { ...rest, through: from };
  }
  if (intent.kind === 'tangentFromExt' && intent.through && !intent.from) {
    const { through, ...rest } = intent;
    return { ...rest, from: through };
  }
  if (
    (intent.kind === 'perpThrough' || intent.kind === 'parallelThrough') &&
    intent.from &&
    !intent.through
  ) {
    const { from, ...rest } = intent;
    return { ...rest, through: from };
  }
  return intent;
}

function normalizeShape(
  intent: DrawShapeIntentT,
  problem: string,
  triangleCount: number,
): IntentT {
  switch (intent.shape) {
    case 'triangle':
      return normalizeTriangle(intent, problem, triangleCount);
    case 'rectangle':
      return normalizeRectangle(intent, problem);
    case 'square':
    case 'rhombus':
    case 'parallelogram':
      return forceStandard(intent);
    default:
      return intent;
  }
}

function normalizeRectangle(
  intent: DrawShapeIntentT,
  problem: string,
): DrawShapeIntentT {
  if (intent.variant === 'tall' && TALL_RECT_RE.test(problem)) return intent;
  if (intent.variant === 'standard') return intent;
  return { ...intent, variant: 'standard' };
}

function forceStandard(intent: DrawShapeIntentT): DrawShapeIntentT {
  if (intent.variant === 'standard') return intent;
  return { ...intent, variant: 'standard' };
}

function normalizeTriangle(
  intent: DrawShapeIntentT,
  problem: string,
  triangleCount: number,
): DrawShapeIntentT {
  // Đa tam giác: không clobber — variant đã được set đúng per-intent ở nguồn.
  if (triangleCount !== 1) return intent;
  const m = problem.match(CAN_TAI_RE) ?? problem.match(ISOCELES_AT_RE);
  if (!m) return intent;
  const apex = m[1].toUpperCase();
  const i = intent.labels.indexOf(apex);
  if (i < 0) return intent;
  // Variant POSITIONAL theo INDEX apex (builder: isoceles-BC ⇒ apex=vertex[0]).
  // KHÔNG dùng chữ-cái-nhãn để đúng cho nhãn ≠ ABC.
  const variantByPos: Record<number, DrawShapeIntentT['variant']> = {
    0: 'isoceles-BC',
    1: 'isoceles-CA',
    2: 'isoceles-AB',
  };
  const target = variantByPos[i];
  if (!target || intent.variant === target) return intent;
  return { ...intent, variant: target };
}
