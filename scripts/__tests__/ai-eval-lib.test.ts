import { createEmptyState, type SceneObject, type State } from '../../src/core/scene';
import type { GenerateResult } from '../../src/stamps/geometry-2d/ai';
import { EVAL_CASES, evaluateResult, sumUsage } from '../ai-eval-lib';

function object(id: string, kind: string, label: string): SceneObject {
  return {
    id,
    kind,
    label,
    visible: true,
    locked: false,
    layer: 'default',
    schemaVersion: 1,
    attrs: {},
  };
}

function okResult(objects: SceneObject[]): GenerateResult {
  const empty = createEmptyState('2d');
  const state: State = {
    ...empty,
    objects: Object.fromEntries(objects.map((entry) => [entry.id, entry])),
    order: objects.map((entry) => entry.id),
    counter: objects.length,
  };
  return {
    ok: true,
    state,
    dsl: { version: 1, points: [], shapes: [] },
    usage: {
      inputTokens: 100,
      outputTokens: 25,
      cacheReadTokens: 50,
      cacheCreationTokens: 5,
    },
  };
}

describe('AI eval corpus', () => {
  it('contains 20-30 distinct textbook problems across several categories', () => {
    expect(EVAL_CASES.length).toBeGreaterThanOrEqual(20);
    expect(EVAL_CASES.length).toBeLessThanOrEqual(30);
    expect(new Set(EVAL_CASES.map((entry) => entry.id)).size).toBe(EVAL_CASES.length);
    expect(new Set(EVAL_CASES.map((entry) => entry.problem)).size).toBe(EVAL_CASES.length);
    expect(new Set(EVAL_CASES.map((entry) => entry.category)).size).toBeGreaterThanOrEqual(5);
  });
});

describe('evaluateResult', () => {
  const evalCase = {
    id: 'triangle',
    category: 'triangle',
    problem: 'Cho tam giác ABC.',
    requiredLabels: ['A', 'B', 'C'],
    requiredKinds: ['point', 'polygon'],
  } as const;

  it('passes when all expected labels and kinds exist', () => {
    const outcome = evaluateResult(evalCase, okResult([
      object('p1', 'point', 'A'),
      object('p2', 'point', 'B'),
      object('p3', 'point', 'C'),
      object('poly1', 'polygon', 'ABC'),
    ]));

    expect(outcome.passed).toBe(true);
    expect(outcome.missingLabels).toEqual([]);
    expect(outcome.missingKinds).toEqual([]);
  });

  it('reports missing labels and kinds from a successful response', () => {
    const outcome = evaluateResult(evalCase, okResult([object('p1', 'point', 'A')]));

    expect(outcome.passed).toBe(false);
    expect(outcome.missingLabels).toEqual(['B', 'C']);
    expect(outcome.missingKinds).toEqual(['polygon']);
  });

  it('reports generation failures without attempting state scoring', () => {
    const outcome = evaluateResult(evalCase, {
      ok: false,
      reason: 'refused',
      message: 'Ngoài phạm vi.',
    });

    expect(outcome.passed).toBe(false);
    expect(outcome.error).toContain('Ngoài phạm vi.');
  });

  it('sums token usage from successful or measured failed calls', () => {
    expect(sumUsage([
      evaluateResult(evalCase, okResult([
        object('p1', 'point', 'A'),
        object('p2', 'point', 'B'),
        object('p3', 'point', 'C'),
        object('poly', 'polygon', 'ABC'),
      ])),
      evaluateResult(evalCase, {
        ok: false,
        reason: 'refused',
        message: 'Không dựng.',
        usage: { inputTokens: 4, outputTokens: 2, cacheReadTokens: 1, cacheCreationTokens: 0 },
      }),
    ])).toEqual({
      inputTokens: 104,
      outputTokens: 27,
      cacheReadTokens: 51,
      cacheCreationTokens: 5,
    });
  });
});
