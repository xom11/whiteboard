import { intentsToDsl } from '../intentToDsl';
import { AddPointIntentZ, type IntentT } from '../intent';

describe('intent schema — commonTangentPoint (production path: LLM JSON → Zod)', () => {
  it('AddPointIntentZ accepts commonTangentPoint', () => {
    const parsed = AddPointIntentZ.safeParse({
      op: 'add-point', name: 'T',
      constraint: { kind: 'commonTangentPoint', circles: ['O', "O'"], on: 0, variant: 'external', side: 0 },
    });
    expect(parsed.success).toBe(true);
  });

  it('AddPointIntentZ rejects on=2 / side=2 / variant lạ', () => {
    expect(AddPointIntentZ.safeParse({
      op: 'add-point', name: 'T',
      constraint: { kind: 'commonTangentPoint', circles: ['O', "O'"], on: 2, variant: 'external', side: 0 },
    }).success).toBe(false);
    expect(AddPointIntentZ.safeParse({
      op: 'add-point', name: 'T',
      constraint: { kind: 'commonTangentPoint', circles: ['O', "O'"], on: 0, variant: 'diagonal', side: 0 },
    }).success).toBe(false);
  });
});

describe('intentsToDsl — add-point commonTangentPoint', () => {
  const baseCircles: IntentT[] = [
    { op: 'add-point', name: 'O', constraint: { kind: 'free', at: [0, 0] } },
    { op: 'add-point', name: "O'", constraint: { kind: 'free', at: [10, 0] } },
    { op: 'draw-circle', name: 'k1', spec: 'centerRadius', center: 'O', radius: 3 },
    { op: 'draw-circle', name: 'k2', spec: 'centerRadius', center: "O'", radius: 1 },
  ] as IntentT[];

  it('emit DSL point commonTangentPoint khi 2 circle ref tồn tại', () => {
    const intents: IntentT[] = [
      ...baseCircles,
      { op: 'add-point', name: 'T1', constraint: { kind: 'commonTangentPoint', circles: ['k1', 'k2'], on: 0, variant: 'external', side: 0 } },
      { op: 'add-point', name: 'T2', constraint: { kind: 'commonTangentPoint', circles: ['k1', 'k2'], on: 1, variant: 'external', side: 0 } },
    ] as IntentT[];
    const dsl = intentsToDsl(intents);
    const t1 = dsl.points.find((p) => p.name === 'T1');
    const t2 = dsl.points.find((p) => p.name === 'T2');
    expect(t1).toMatchObject({ kind: 'commonTangentPoint', circles: ['k1', 'k2'], on: 0, variant: 'external', side: 0 });
    expect(t2).toMatchObject({ kind: 'commonTangentPoint', circles: ['k1', 'k2'], on: 1, variant: 'external', side: 0 });
  });

  it('fail-safe: circle ref không tồn tại → point KHÔNG add (escalate downstream)', () => {
    const intents: IntentT[] = [
      ...baseCircles,
      { op: 'add-point', name: 'T1', constraint: { kind: 'commonTangentPoint', circles: ['k1', 'kX'], on: 0, variant: 'external', side: 0 } },
    ] as IntentT[];
    const dsl = intentsToDsl(intents);
    expect(dsl.points.find((p) => p.name === 'T1')).toBeUndefined();
  });
});
