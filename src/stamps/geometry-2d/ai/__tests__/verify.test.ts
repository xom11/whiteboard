import { compareIntents, verifyGeometry } from '../verify';
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
