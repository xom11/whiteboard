// Test: generateFigureIntent phải CATCH transpile() throw (không bubble lên caller).
// Bug source: transpile.ts:31 `throw new Error("emit: id not assigned for X")`
// xảy ra khi DSL có shape ref name chưa registered — trước fix, throw này
// propagate ra ngoài generateFigureIntent → eval-pdf harness mất intents+dsl.

jest.mock('../../dsl', () => {
  const actual = jest.requireActual('../../dsl');
  return {
    ...actual,
    transpile: jest.fn(() => {
      throw new Error('emit: id not assigned for "AO"');
    }),
  };
});

import { generateFigureIntent } from '../buildFigureIntent';
import type { AIProvider, ProviderOutput } from '../providers';

function mockProvider(out: ProviderOutput): AIProvider {
  return {
    name: 'mock',
    defaultModel: 'mock-default',
    async call() {
      return out;
    },
  };
}

describe('generateFigureIntent — transpile throw safety', () => {
  it('khi transpile throw, trả ok:false reason=transpile_error + giữ intents/dsl', async () => {
    const provider = mockProvider({
      kind: 'json',
      data: {
        decision: 'build',
        intents: [
          { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
        ],
      },
      usage: { inputTokens: 50, outputTokens: 20 },
    });

    const r = await generateFigureIntent('Tam giác ABC.', { provider });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected fail');
    expect(r.reason).toBe('transpile_error');
    expect(r.message).toMatch(/transpile throw.*id not assigned.*AO/);
    expect(r.intents).toBeDefined();
    expect(r.intents).toHaveLength(1);
    expect(r.dsl).toBeDefined();
  });
});
