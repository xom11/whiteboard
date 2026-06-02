// Tests for handleGenerateFigureIntent Façade.
// Mock AIProvider để tránh hit Anthropic/Ollama thật.

import { handleGenerateFigureIntent } from '../handleGenerateFigureIntent';
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

describe('handleGenerateFigureIntent', () => {
  it('returns success kind with dsl + intents', async () => {
    const provider = mockProvider({
      kind: 'json',
      data: {
        decision: 'build',
        intents: [
          { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
        ],
      },
      usage: { inputTokens: 100, outputTokens: 50 },
    });

    const r = await handleGenerateFigureIntent('Tam giác ABC.', { provider });
    expect(r.kind).toBe('success');
    if (r.kind === 'success') {
      expect(r.dsl).toBeDefined();
      expect(r.intents).toHaveLength(1);
    }
  });

  it('returns error kind on provider error', async () => {
    const provider = mockProvider({
      kind: 'error',
      message: 'network timeout',
    });

    const r = await handleGenerateFigureIntent('test', { provider });
    expect(r.kind).toBe('error');
    if (r.kind === 'error') {
      expect(r.code).toBe('provider_error');
    }
  });

  it('returns refused kind when AI refuses', async () => {
    const provider = mockProvider({
      kind: 'json',
      data: {
        decision: 'refuse',
        reason: 'Đề bài không liên quan đến hình học',
      },
      usage: { inputTokens: 10, outputTokens: 5 },
    });

    const r = await handleGenerateFigureIntent('2 + 2 = ?', { provider });
    expect(r.kind).toBe('refused');
  });
});
