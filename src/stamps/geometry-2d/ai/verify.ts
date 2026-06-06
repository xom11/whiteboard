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
import type { IntentT, DrawShapeIntentT, AddPointIntentT } from './intent';

export interface VerifyIssue {
  readonly axis: 'missing' | 'wrong' | 'extra';
  readonly detail: string;
}

export interface VerifyReport {
  readonly ok: boolean;
  readonly missing: readonly VerifyIssue[];
  readonly wrong: readonly VerifyIssue[];
  readonly extra: readonly VerifyIssue[];
  readonly geometric?: readonly VerifyIssue[];
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
    case 'draw-circle': {
      if (intent.spec === 'centerThrough') return `draw-circle/${intent.name}/centerThrough/${intent.center}/${intent.through}`;
      if (intent.spec === 'through3')      return `draw-circle/${intent.name}/through3/${intent.points?.join(',') ?? ''}`;
      if (intent.spec === 'centerRadius')  return `draw-circle/${intent.name}/centerRadius/${intent.center}/${intent.radius}`;
      if (intent.spec === 'inscribedIn')   return `draw-circle/${intent.name}/inscribedIn/${intent.triangle?.join(',') ?? ''}`;
      return `draw-circle/${intent.name}/${(intent as any).spec}`;
    }
    case 'draw-line':
      return [
        'draw-line', intent.name, intent.kind,
        intent.through ?? '', intent.to ?? '', intent.from ?? '', intent.circle ?? '', intent.which ?? '',
      ].join('/');
    case 'mark-shape':
      return ['mark-shape', intent.shape, intent.labels.join(',')].join('/');
  }
}

function constraintKey(c: AddPointIntentT['constraint']): string {
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
    case 'secondIntersection':  return `secondIntersection:${c.line}:${c.circle}:${c.other}`;
    case 'circleIntersection':  return `circleIntersection:${c.c1}:${c.c2}:${c.which}`;
    case 'tangencyPoint':       return `tangencyPoint:${c.circle}:${c.onLine}`;
    case 'tangentPoint':        return `tangentPoint:${c.from}:${c.circle}:${c.which}`;
    case 'angleBisectorFoot':   return `angleBisectorFoot:${c.from}:${c.onLine}`;
    case 'arcMidpoint':         return `arcMidpoint:${c.circle}:${c.a}:${c.b}:${c.notContaining}`;
    case 'reflectPoint':        return `reflectPoint:${c.of}:${c.through}`;
    case 'reflectLine':         return `reflectLine:${c.of}:${c.through}`;
    case 'excenter':            return `excenter:${c.of.join(',')}:${c.opposite}`;
    case 'rightAngleViewing':   return `rightAngleViewing:${c.a}:${c.b}:${c.onLine}:${c.which ?? 0}`;
    case 'pointAtDistance': {
      const d = c.distance;
      const dKey = d.kind === 'circleRadius' ? `r:${d.circle}`
        : d.kind === 'segmentLength' ? `seg:${d.p1}:${d.p2}`
        : `lit:${d.value}`;
      return `pointAtDistance:${c.from}:${c.through}:${dKey}`;
    }
  }
}

function samePrefix(a: string, b: string, depth: number): boolean {
  const aP = a.split('/').slice(0, depth).join('/');
  const bP = b.split('/').slice(0, depth).join('/');
  return aP === bP;
}

// ---------------------------------------------------------------------------
// Intent metric: recall / precision / F1 (for eval)
// ---------------------------------------------------------------------------

export interface IntentMetrics {
  recall: number;
  precision: number;
  f1: number;
  matched: number;
  expected: number;
  actual: number;
}

export function computeIntentMetrics(
  expected: readonly IntentT[],
  actual: readonly IntentT[],
): IntentMetrics {
  const expectedKeys = expected.map(intentKey);
  const actualKeys = actual.map(intentKey);
  const matched = new Set<number>();
  let hit = 0;
  for (const ek of expectedKeys) {
    const idx = actualKeys.findIndex((ak, i) => !matched.has(i) && ak === ek);
    if (idx >= 0) { matched.add(idx); hit++; }
  }
  const recall = expectedKeys.length === 0 ? 1 : hit / expectedKeys.length;
  const precision = actualKeys.length === 0 ? 1 : hit / actualKeys.length;
  const f1 = (recall + precision) === 0 ? 0 : (2 * recall * precision) / (recall + precision);
  return {
    recall, precision, f1,
    matched: hit,
    expected: expectedKeys.length,
    actual: actualKeys.length,
  };
}

// ---------------------------------------------------------------------------
// Geometric verification on DSL with resolved coords (scope: on-circle only;
// tangent-touch / concyclic / collinear deferred until JSXGraph runtime hook).
// ---------------------------------------------------------------------------

const GEOM_TOL = 1e-3;

function resolveCoord(dsl: DslInputT, name: string): [number, number] | null {
  const p = dsl.points.find((x) => x.name === name);
  if (!p) return null;
  if (p.kind === 'free') return [p.x, p.y];
  if (p.kind === 'midpoint') {
    const a = resolveCoord(dsl, p.p1);
    const b = resolveCoord(dsl, p.p2);
    if (!a || !b) return null;
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  }
  // Other kinds: computed by JSXGraph at runtime — skip static check.
  return null;
}

export function verifyGeometric(dsl: DslInputT): VerifyReport {
  const geometric: VerifyIssue[] = [];

  for (const shape of dsl.shapes) {
    if (shape.kind !== 'circleCR') continue;
    // on-circle check: any point with onCircle constraint referencing this circle
    for (const p of dsl.points) {
      if (p.kind !== 'onCircle') continue;
      if (p.circleId !== shape.name) continue;
      const c = resolveCoord(dsl, shape.center);
      const pp = resolveCoord(dsl, p.name);
      if (!c || !pp) continue;
      const d = Math.hypot(pp[0] - c[0], pp[1] - c[1]);
      if (Math.abs(d - shape.radius) > GEOM_TOL) {
        geometric.push({
          axis: 'wrong',
          detail: `on-circle: |${p.name}-${shape.name}|=${d.toFixed(3)} ≠ R=${shape.radius}`,
        });
      }
    }
  }

  return {
    ok: geometric.length === 0,
    missing: [],
    wrong: [],
    extra: [],
    geometric,
  } as VerifyReport;
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
