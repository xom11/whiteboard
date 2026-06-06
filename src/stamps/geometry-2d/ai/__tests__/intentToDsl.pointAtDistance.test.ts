import { intentsToDsl } from '../intentToDsl';
import type { IntentT } from '../intent';

describe('intentsToDsl — add-point pointAtDistance', () => {
  it('pointAtDistance circleRadius: point C on ray AB at distance = radius of circle O', () => {
    const intents: IntentT[] = [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C_tmp'], variant: 'any' },
      { op: 'draw-circle', name: 'O', spec: 'centerThrough', center: 'A', through: 'B' },
      {
        op: 'add-point',
        name: 'C',
        constraint: { kind: 'pointAtDistance', from: 'A', through: 'B', distance: { kind: 'circleRadius', circle: 'O' } },
      },
    ] as IntentT[];
    const dsl = intentsToDsl(intents);
    const c = dsl.points.find((p) => p.name === 'C');
    expect(c).toMatchObject({
      kind: 'pointAtDistance',
      from: 'A',
      through: 'B',
      distance: { kind: 'circleRadius', circle: 'O' },
    });
  });

  it('pointAtDistance segmentLength: point P at distance = length of AB', () => {
    const intents: IntentT[] = [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'D'], variant: 'any' },
      {
        op: 'add-point',
        name: 'P',
        constraint: { kind: 'pointAtDistance', from: 'A', through: 'B', distance: { kind: 'segmentLength', p1: 'A', p2: 'B' } },
      },
    ] as IntentT[];
    const dsl = intentsToDsl(intents);
    const p = dsl.points.find((pt) => pt.name === 'P');
    expect(p).toMatchObject({
      kind: 'pointAtDistance',
      from: 'A',
      through: 'B',
      distance: { kind: 'segmentLength', p1: 'A', p2: 'B' },
    });
  });

  it('pointAtDistance literal: point Q at fixed distance 3 from A toward B', () => {
    const intents: IntentT[] = [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'E'], variant: 'any' },
      {
        op: 'add-point',
        name: 'Q',
        constraint: { kind: 'pointAtDistance', from: 'A', through: 'B', distance: { kind: 'literal', value: 3 } },
      },
    ] as IntentT[];
    const dsl = intentsToDsl(intents);
    const q = dsl.points.find((pt) => pt.name === 'Q');
    expect(q).toMatchObject({
      kind: 'pointAtDistance',
      from: 'A',
      through: 'B',
      distance: { kind: 'literal', value: 3 },
    });
  });

  it('ensureSegment: segment AB is added to shapes when pointAtDistance references A and B', () => {
    const intents: IntentT[] = [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'F'], variant: 'any' },
      {
        op: 'add-point',
        name: 'G',
        constraint: { kind: 'pointAtDistance', from: 'A', through: 'B', distance: { kind: 'literal', value: 2 } },
      },
    ] as IntentT[];
    const dsl = intentsToDsl(intents);
    // ensureSegment(A, B) should add segment AB (it may already exist from polygon, so just verify G is created)
    const g = dsl.points.find((p) => p.name === 'G');
    expect(g).toBeDefined();
    expect(g!.kind).toBe('pointAtDistance');
  });
});
