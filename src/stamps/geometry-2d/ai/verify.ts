// src/stamps/geometry-2d/ai/verify.ts
//
// Stage 4 verifier. Sau khi Intent[] → DSL → render, kiểm tra 3 trục:
//   - đủ (missing): intent expected nhưng DSL không có
//   - đúng (wrong): variant/labels mismatch
//   - không thừa (extra): DSL có entity không tương ứng intent nào
//
// Hai chế độ dùng:
//   1. eval mode: so sánh actualIntents vs expectedIntents (golden)
//   2. runtime mode: tự verify pipeline (intent→DSL, không có golden)

import type { DslInputT } from '../dsl/schema';
import type { IntentT, DrawShapeIntentT } from './intent';

export interface VerifyIssue {
  readonly axis: 'missing' | 'wrong' | 'extra';
  readonly detail: string;
}

export interface VerifyReport {
  readonly ok: boolean;
  readonly missing: readonly VerifyIssue[];
  readonly wrong: readonly VerifyIssue[];
  readonly extra: readonly VerifyIssue[];
}

// ---------------------------------------------------------------------------
// Eval-mode: compare actual intents vs golden expected
// ---------------------------------------------------------------------------

export function compareIntents(
  expected: readonly IntentT[],
  actual: readonly IntentT[],
): VerifyReport {
  const expectedKey = expected.map(intentKey);
  const actualKey = actual.map(intentKey);

  const missing: VerifyIssue[] = [];
  const extra: VerifyIssue[] = [];
  const wrong: VerifyIssue[] = [];

  // Track which expected/actual entries matched.
  const matchedActual = new Set<number>();
  for (let i = 0; i < expectedKey.length; i++) {
    const ek = expectedKey[i];
    // Exact match first
    const exactIdx = actualKey.findIndex((ak, idx) => !matchedActual.has(idx) && ak === ek);
    if (exactIdx >= 0) {
      matchedActual.add(exactIdx);
      continue;
    }
    // Partial match: same op + same shape/name → "wrong"
    const partialIdx = actualKey.findIndex((ak, idx) =>
      !matchedActual.has(idx) && samePrefix(ak, ek, 2),
    );
    if (partialIdx >= 0) {
      matchedActual.add(partialIdx);
      wrong.push({
        axis: 'wrong',
        detail: `expected ${ek}, got ${actualKey[partialIdx]}`,
      });
      continue;
    }
    // No match → missing
    missing.push({ axis: 'missing', detail: ek });
  }
  // Unmatched actual entries → extra
  for (let i = 0; i < actualKey.length; i++) {
    if (!matchedActual.has(i)) {
      extra.push({ axis: 'extra', detail: actualKey[i] });
    }
  }

  return {
    ok: missing.length === 0 && wrong.length === 0 && extra.length === 0,
    missing,
    wrong,
    extra,
  };
}

// "draw-shape/triangle/equilateral/A,B,C" — canonical short string for compare.
function intentKey(intent: IntentT): string {
  switch (intent.op) {
    case 'draw-shape':
      return [
        'draw-shape',
        intent.shape,
        (intent as DrawShapeIntentT).variant,
        intent.labels.join(','),
      ].join('/');
    case 'add-point':
      return ['add-point', intent.name, intent.constraint.kind, constraintKey(intent.constraint)].join('/');
    case 'connect':
      return ['connect', intent.style, intent.from, intent.to].join('/');
    case 'draw-circle':
      return intent.spec === 'centerThrough'
        ? `draw-circle/${intent.name}/centerThrough/${intent.center}/${intent.through}`
        : `draw-circle/${intent.name}/through3/${intent.points.join(',')}`;
  }
}

function constraintKey(c: IntentT extends { op: 'add-point'; constraint: infer C } ? C : never): string {
  switch (c.kind) {
    case 'midpoint': return c.of;
    case 'perpFoot': return `${c.from}->${c.onLine}`;
    case 'centroid':
    case 'circumcenter':
    case 'incenter':
    case 'orthocenter':
      return c.of.join(',');
    case 'intersection': return c.of.join('×');
    case 'onSegment': return `${c.of}@${c.t ?? 'mid'}`;
    case 'free': return c.at ? c.at.join(',') : '*';
  }
}

function samePrefix(a: string, b: string, depth: number): boolean {
  const aP = a.split('/').slice(0, depth).join('/');
  const bP = b.split('/').slice(0, depth).join('/');
  return aP === bP;
}

// ---------------------------------------------------------------------------
// Runtime-mode: verify DSL geometry constraints
// ---------------------------------------------------------------------------

export function verifyGeometry(intents: readonly IntentT[], dsl: DslInputT): VerifyReport {
  const issues: VerifyIssue[] = [];

  // Check right-triangle variant has actual right angle at named vertex.
  for (const intent of intents) {
    if (intent.op !== 'draw-shape' || intent.shape !== 'triangle') continue;
    const variant = intent.variant;
    if (!variant.startsWith('right-at-')) continue;
    const apex = variant.slice('right-at-'.length); // 'A' | 'B' | 'C'
    const [A, B, C] = intent.labels;
    const ptByName = new Map(
      dsl.points.filter((p) => p.kind === 'free').map((p) => [p.name, [p.x, p.y] as [number, number]]),
    );
    const pA = ptByName.get(A);
    const pB = ptByName.get(B);
    const pC = ptByName.get(C);
    if (!pA || !pB || !pC) continue;
    const apexP = apex === 'A' ? pA : apex === 'B' ? pB : pC;
    const other1 = apex === 'A' ? pB : apex === 'B' ? pA : pA;
    const other2 = apex === 'A' ? pC : apex === 'B' ? pC : pB;
    const v1 = [other1[0] - apexP[0], other1[1] - apexP[1]];
    const v2 = [other2[0] - apexP[0], other2[1] - apexP[1]];
    const dot = v1[0] * v2[0] + v1[1] * v2[1];
    if (Math.abs(dot) > 1e-6) {
      issues.push({
        axis: 'wrong',
        detail: `triangle ${A}${B}${C} variant=right-at-${apex} không vuông (dot=${dot.toFixed(3)})`,
      });
    }
  }

  return {
    ok: issues.length === 0,
    missing: [],
    wrong: issues,
    extra: [],
  };
}
