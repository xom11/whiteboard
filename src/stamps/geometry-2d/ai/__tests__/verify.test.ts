import { compareIntents, verifyGeometry, verifyGeometric, computeIntentMetrics } from '../verify';
import { intentsToDsl } from '../intentToDsl';
import type { IntentT } from '../intent';

describe('compareIntents — eval mode', () => {
  it('exact match → ok', () => {
    const intents: IntentT[] = [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'equilateral' },
    ];
    const r = compareIntents(intents, intents);
    expect(r.ok).toBe(true);
    expect(r.missing).toHaveLength(0);
    expect(r.extra).toHaveLength(0);
    expect(r.wrong).toHaveLength(0);
  });

  it('missing intent detected', () => {
    const expected: IntentT[] = [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
      { op: 'add-point', name: 'M', constraint: { kind: 'midpoint', of: 'BC' } },
    ];
    const actual: IntentT[] = [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
    ];
    const r = compareIntents(expected, actual);
    expect(r.missing).toHaveLength(1);
    expect(r.extra).toHaveLength(0);
  });

  it('extra intent detected', () => {
    const expected: IntentT[] = [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
    ];
    const actual: IntentT[] = [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
      { op: 'add-point', name: 'H', constraint: { kind: 'centroid', of: ['A', 'B', 'C'] } },
    ];
    const r = compareIntents(expected, actual);
    expect(r.extra).toHaveLength(1);
    expect(r.missing).toHaveLength(0);
  });

  it('wrong variant detected as wrong (not missing+extra)', () => {
    const expected: IntentT[] = [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'right-at-A' },
    ];
    const actual: IntentT[] = [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'equilateral' },
    ];
    const r = compareIntents(expected, actual);
    expect(r.wrong).toHaveLength(1);
    expect(r.missing).toHaveLength(0);
    expect(r.extra).toHaveLength(0);
  });
});

describe('verifyGeometry — runtime mode', () => {
  it('right-at-A actually has 90° at A', () => {
    const intents: IntentT[] = [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'right-at-A' },
    ];
    const dsl = intentsToDsl(intents);
    const r = verifyGeometry(intents, dsl);
    expect(r.ok).toBe(true);
  });

  it('right-at-C variant has 90° at C', () => {
    const intents: IntentT[] = [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'right-at-C' },
    ];
    const dsl = intentsToDsl(intents);
    const r = verifyGeometry(intents, dsl);
    expect(r.ok).toBe(true);
  });

  it('catches manually corrupted coord (negative test)', () => {
    const intents: IntentT[] = [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'right-at-A' },
    ];
    const dsl = intentsToDsl(intents);
    // Corrupt: move C off the perpendicular
    const C = dsl.points.find((p) => p.name === 'C')!;
    if (C.kind === 'free') (C as { x: number }).x = 2; // moved off (0,3)
    const r = verifyGeometry(intents, dsl);
    expect(r.ok).toBe(false);
    expect(r.wrong[0].detail).toMatch(/không vuông/);
  });
});

// === Tier 4+5 verify additions ===

describe('verifyGeometric — on-circle', () => {
  it('passes when point with on-circle constraint is consistent with circleCR', () => {
    const dsl = {
      version: 1 as const,
      points: [
        { name: 'O', kind: 'free' as const, x: 0, y: 0 },
        { name: 'P', kind: 'onCircle' as const, circleId: 'c', theta: 0 },
      ],
      shapes: [
        { name: 'c', kind: 'circleCR' as const, center: 'O', radius: 3 },
      ],
    };
    const r = verifyGeometric(dsl as never);
    expect(r.ok).toBe(true);
    expect(r.geometric ?? []).toHaveLength(0);
  });

  it('returns ok=true when no relevant shapes/points (no false positives)', () => {
    const dsl = {
      version: 1 as const,
      points: [
        { name: 'A', kind: 'free' as const, x: 0, y: 0 },
        { name: 'B', kind: 'free' as const, x: 4, y: 0 },
      ],
      shapes: [
        { name: 's', kind: 'segment' as const, p1: 'A', p2: 'B' },
      ],
    };
    const r = verifyGeometric(dsl as never);
    expect(r.ok).toBe(true);
  });
});

describe('computeIntentMetrics — recall/precision/F1', () => {
  it('exact match → P=R=F=1', () => {
    const expected = [
      { op: 'draw-shape' as const, shape: 'triangle' as const, labels: ['A','B','C'], variant: 'any' as const },
      { op: 'add-point' as const, name: 'M', constraint: { kind: 'midpoint' as const, of: 'BC' } },
    ];
    const actual = [...expected];
    const m = computeIntentMetrics(expected as never, actual as never);
    expect(m.recall).toBe(1);
    expect(m.precision).toBe(1);
    expect(m.f1).toBe(1);
  });

  it('missing 1/4 → recall=0.75 precision=1', () => {
    const expected = [
      { op: 'draw-shape' as const, shape: 'triangle' as const, labels: ['A','B','C'], variant: 'any' as const },
      { op: 'add-point' as const, name: 'M', constraint: { kind: 'midpoint' as const, of: 'BC' } },
      { op: 'add-point' as const, name: 'N', constraint: { kind: 'midpoint' as const, of: 'AC' } },
      { op: 'connect' as const, from: 'M', to: 'N', style: 'segment' as const },
    ];
    const actual = expected.slice(0, 3);
    const m = computeIntentMetrics(expected as never, actual as never);
    expect(m.recall).toBeCloseTo(0.75);
    expect(m.precision).toBe(1);
  });

  it('extra 1 → recall=1 precision=0.5', () => {
    const expected = [
      { op: 'draw-shape' as const, shape: 'triangle' as const, labels: ['A','B','C'], variant: 'any' as const },
    ];
    const actual = [
      ...expected,
      { op: 'add-point' as const, name: 'M', constraint: { kind: 'midpoint' as const, of: 'BC' } },
    ];
    const m = computeIntentMetrics(expected as never, actual as never);
    expect(m.recall).toBe(1);
    expect(m.precision).toBe(0.5);
  });

  it('both empty → P=R=F=1', () => {
    const m = computeIntentMetrics([] as never, [] as never);
    expect(m.f1).toBe(1);
  });
});
