// Test: Track A deterministic-first trong generateFigureIntent.
// Đề dễ→trung bình dựng deterministic, KHÔNG gọi LLM (provider.call không chạy).
// Đề khó / phủ thiếu → fall through Track B (provider.call chạy).
import { generateFigureIntent } from '../buildFigureIntent';
import type { AIProvider, ProviderOutput } from '../providers';

function spyProvider(out: ProviderOutput) {
  const call = jest.fn(async () => out);
  const provider: AIProvider = { name: 'mock-llm', defaultModel: 'mock-default', call };
  return { provider, call };
}

const LLM_OUT: ProviderOutput = {
  kind: 'json',
  data: {
    decision: 'build',
    intents: [{ op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' }],
  },
  usage: { inputTokens: 50, outputTokens: 20 },
};

describe('generateFigureIntent — Track A deterministic-first', () => {
  it('đề deterministic-hit → provider:"deterministic", KHÔNG gọi LLM', async () => {
    const { provider, call } = spyProvider(LLM_OUT);
    const r = await generateFigureIntent('Cho tam giác ABC. Gọi M là trung điểm BC', { provider });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.provider).toBe('deterministic');
    expect(call).not.toHaveBeenCalled();
  });

  it('useDeterministic:false → ép gọi LLM (Track B)', async () => {
    const { provider, call } = spyProvider(LLM_OUT);
    const r = await generateFigureIntent('Cho tam giác ABC. Gọi M là trung điểm BC', {
      provider,
      useDeterministic: false,
    });
    expect(call).toHaveBeenCalledTimes(1);
    if (r.ok) expect(r.provider).toBe('mock-llm');
  });

  it('đề named-missing → fall through Track B (gọi LLM)', async () => {
    const { provider, call } = spyProvider(LLM_OUT);
    await generateFigureIntent('Cho tam giác ABC. Đường trung trực của BC cắt AB tại D', {
      provider,
    });
    expect(call).toHaveBeenCalledTimes(1);
  });
});
