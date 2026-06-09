// Test Façade handleGenerateFigure → AiFigureUiResult.
// Từ 2026-06-09 façade chạy TRÊN rule-engine intent pipeline (generateFigureIntent):
// deterministic-first (rules) → LLM fallback. Mock AIProvider để khỏi hit LLM thật.
// Provider trả INTENT ENVELOPE ({ decision, intents }) — không phải free-form DSL.

import { handleGenerateFigure } from '../handleGenerateFigure';
import type { AIProvider, ProviderOutput, ProviderRequest } from '../providers';

function mockProvider(out: ProviderOutput): AIProvider {
  return {
    name: 'mock',
    defaultModel: 'mock-default',
    async call() {
      return out;
    },
  };
}

/** Provider lặp queue output (mỗi call lấy 1 item, hết thì trả item cuối). */
function sequenceProvider(outputs: ProviderOutput[]): AIProvider & { calls: ProviderRequest[] } {
  const calls: ProviderRequest[] = [];
  let i = 0;
  return {
    name: 'mock-seq',
    defaultModel: 'mock-default',
    async call(req) {
      calls.push(req);
      const out = outputs[i] ?? outputs[outputs.length - 1];
      i++;
      return out;
    },
    calls,
  };
}

// Intent envelope build hợp lệ: tam giác ABC → transpile OK.
const BUILD_TRI: ProviderOutput = {
  kind: 'json',
  data: {
    decision: 'build',
    intents: [{ op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' }],
  },
  usage: { inputTokens: 100, outputTokens: 20 },
};

// Intent envelope build nhưng transpile/builder FAIL: midpoint của điểm không tồn tại.
const BUILD_BAD: ProviderOutput = {
  kind: 'json',
  data: {
    decision: 'build',
    intents: [{ op: 'add-point', name: 'M', constraint: { kind: 'midpoint', of: 'XY' } }],
  },
  usage: { inputTokens: 100, outputTokens: 20 },
};

describe('handleGenerateFigure — Façade (rule-engine intent pipeline)', () => {
  it('ok=true: trả { ok: true, state } (drop dsl/usage/provider)', async () => {
    const provider = mockProvider(BUILD_TRI);
    // useDeterministic:false để ép qua nhánh LLM (test mapping envelope → state).
    const r = await handleGenerateFigure({ problem: 'Tam giác ABC' }, { provider, useDeterministic: false });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error();
    expect(r.state.order.length).toBeGreaterThan(0);
    expect(Object.keys(r.state.objects).length).toBeGreaterThanOrEqual(3); // 3 đỉnh + polygon
    // Không leak usage/dsl/provider ra client.
    expect((r as Record<string, unknown>).usage).toBeUndefined();
    expect((r as Record<string, unknown>).dsl).toBeUndefined();
    expect((r as Record<string, unknown>).provider).toBeUndefined();
  });

  it('refused: dùng message gốc từ AI', async () => {
    const provider = mockProvider({
      kind: 'json',
      data: { decision: 'refuse', reason: 'Đề ngoài phạm vi (lớp 11)' },
      usage: { inputTokens: 50, outputTokens: 10 },
    });
    const r = await handleGenerateFigure({ problem: 'Biến đổi affine' }, { provider, useDeterministic: false });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error();
    expect(r.message).toBe('Đề ngoài phạm vi (lớp 11)');
  });

  it('parse_error: trả message Việt friendly (không leak technical)', async () => {
    const provider = mockProvider({
      kind: 'json',
      data: { intents: [] }, // thiếu decision → envelope parse fail
      usage: { inputTokens: 50, outputTokens: 10 },
    });
    const r = await handleGenerateFigure({ problem: 'test' }, { provider, useDeterministic: false });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error();
    expect(r.message).toMatch(/không hợp lệ/i);
    expect(r.message).not.toMatch(/decision/i); // không leak field name
  });

  it('provider_error: pass message gốc (network/config)', async () => {
    const provider = mockProvider({ kind: 'error', message: 'connection refused' });
    const r = await handleGenerateFigure({ problem: 'test' }, { provider, useDeterministic: false });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error();
    expect(r.message).toBe('connection refused');
  });

  it('đề rỗng → { ok:false, "Đề bài rỗng" } KHÔNG gọi provider', async () => {
    const provider = sequenceProvider([{ kind: 'error', message: 'should not call' }]);
    const r = await handleGenerateFigure({ problem: '   ' }, { provider });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error();
    expect(r.message).toBe('Đề bài rỗng');
    expect(provider.calls).toHaveLength(0);
  });

  it('onResult callback: nhận IntentGenerateResult đầy đủ (telemetry hook)', async () => {
    const provider = mockProvider(BUILD_TRI);
    const calls: unknown[] = [];
    await handleGenerateFigure(
      { problem: 'Tam giác ABC' },
      { provider, useDeterministic: false, onResult: (raw) => calls.push(raw) },
    );
    expect(calls).toHaveLength(1);
    const captured = calls[0] as { ok: boolean; provider?: string; usage?: unknown };
    expect(captured.ok).toBe(true);
    expect(captured.provider).toBe('mock');
    expect(captured.usage).toBeDefined();
  });

  it('onResult throw không vỡ response', async () => {
    const provider = mockProvider(BUILD_TRI);
    const r = await handleGenerateFigure(
      { problem: 'Tam giác ABC' },
      {
        provider,
        useDeterministic: false,
        onResult: () => {
          throw new Error('telemetry boom');
        },
      },
    );
    expect(r.ok).toBe(true);
  });

  describe('auto-retry (transpile/builder error)', () => {
    it('transpile_error → retry → ok (attempt 2 success)', async () => {
      const provider = sequenceProvider([BUILD_BAD, BUILD_TRI]);
      const attempts: number[] = [];
      const r = await handleGenerateFigure(
        { problem: 'Tam giác ABC' },
        { provider, useDeterministic: false, onResult: (_, attempt) => attempts.push(attempt) },
      );
      expect(provider.calls).toHaveLength(2);
      expect(attempts).toEqual([1, 2]);
      expect(r.ok).toBe(true);
    });

    it('lỗi build 2 lần liên tiếp → fail với message đã thử lại', async () => {
      const provider = sequenceProvider([BUILD_BAD]);
      const r = await handleGenerateFigure({ problem: 'test' }, { provider, useDeterministic: false });
      expect(provider.calls).toHaveLength(2); // default maxAttempts=2
      expect(r.ok).toBe(false);
      if (r.ok) throw new Error();
      expect(r.message).toMatch(/đã thử lại/i);
    });

    it('refused KHÔNG retry (AI cố ý từ chối)', async () => {
      const provider = sequenceProvider([
        { kind: 'json', data: { decision: 'refuse', reason: 'Đề lớp 11' }, usage: { inputTokens: 50, outputTokens: 10 } },
      ]);
      await handleGenerateFigure({ problem: 'affine' }, { provider, useDeterministic: false });
      expect(provider.calls).toHaveLength(1);
    });

    it('parse_error KHÔNG retry (envelope sai schema)', async () => {
      const provider = sequenceProvider([
        { kind: 'json', data: { intents: [] }, usage: { inputTokens: 50, outputTokens: 10 } },
      ]);
      await handleGenerateFigure({ problem: 'test' }, { provider, useDeterministic: false });
      expect(provider.calls).toHaveLength(1);
    });

    it('provider_error KHÔNG retry (network/config)', async () => {
      const provider = sequenceProvider([{ kind: 'error', message: 'connection refused' }]);
      await handleGenerateFigure({ problem: 'test' }, { provider, useDeterministic: false });
      expect(provider.calls).toHaveLength(1);
    });

    it('maxAttempts=3 → thử tối đa 3 lần với build error', async () => {
      const provider = sequenceProvider([BUILD_BAD]);
      await handleGenerateFigure({ problem: 'test' }, { provider, useDeterministic: false, maxAttempts: 3 });
      expect(provider.calls).toHaveLength(3);
    });

    it('maxAttempts=1 → không retry', async () => {
      const provider = sequenceProvider([BUILD_BAD]);
      await handleGenerateFigure({ problem: 'test' }, { provider, useDeterministic: false, maxAttempts: 1 });
      expect(provider.calls).toHaveLength(1);
    });

    it('maxAttempts ngoài range → clamp [1,5]', async () => {
      const provider = sequenceProvider([BUILD_BAD]);
      await handleGenerateFigure({ problem: 'test' }, { provider, useDeterministic: false, maxAttempts: 99 });
      expect(provider.calls).toHaveLength(5);
    });
  });
});

describe('handleGenerateFigure — deterministic fast path (rule engine)', () => {
  test('đề dễ (tam giác + đường cao) skip LLM provider hoàn toàn', async () => {
    const providerCallSpy = jest.fn();
    const r = await handleGenerateFigure(
      { problem: 'Cho tam giác ABC, đường cao AH' },
      { provider: { name: 'mock', defaultModel: 'mock', call: providerCallSpy } },
    );
    expect(r.ok).toBe(true);
    expect(providerCallSpy).not.toHaveBeenCalled();
  });

  test('construct không có rule (mixtilinear) → escalate LLM', async () => {
    const providerCallSpy = jest.fn().mockResolvedValue({ kind: 'error', message: 'mock-not-real' });
    await handleGenerateFigure(
      { problem: 'Cho tam giác ABC. Vẽ đường tròn mixtilinear nội tiếp góc A.' },
      { provider: { name: 'mock', defaultModel: 'mock', call: providerCallSpy } },
    );
    expect(providerCallSpy).toHaveBeenCalled();
  });

  test('useDeterministic=false luôn dùng LLM', async () => {
    const providerCallSpy = jest.fn().mockResolvedValue({ kind: 'error', message: 'mock' });
    await handleGenerateFigure(
      { problem: 'Cho tam giác ABC, đường cao AH' },
      { provider: { name: 'mock', defaultModel: 'mock', call: providerCallSpy }, useDeterministic: false },
    );
    expect(providerCallSpy).toHaveBeenCalled();
  });

  test('deterministicOnly + đề miss → ok:false "không vẽ được", KHÔNG gọi LLM', async () => {
    const providerCallSpy = jest.fn().mockResolvedValue({ kind: 'error', message: 'mock' });
    const r = await handleGenerateFigure(
      { problem: 'Cho tam giác ABC, P là điểm Fermat của tam giác.' },
      { provider: { name: 'mock', defaultModel: 'mock', call: providerCallSpy }, deterministicOnly: true },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      // message dễ hiểu: nêu hướng xử lý (thêm/sửa rule), không leak jargon cũ.
      expect(r.message).toMatch(/bổ sung rule|lỗi rule/i);
      expect(r.message).not.toMatch(/LLM fallback/i);
    }
    expect(providerCallSpy).not.toHaveBeenCalled();
  });

  test('deterministicOnly + đề hit → ok, KHÔNG gọi LLM', async () => {
    const providerCallSpy = jest.fn().mockResolvedValue({ kind: 'error', message: 'mock' });
    const r = await handleGenerateFigure(
      { problem: 'Cho tam giác ABC. Gọi M là trung điểm BC' },
      { provider: { name: 'mock', defaultModel: 'mock', call: providerCallSpy }, deterministicOnly: true },
    );
    expect(r.ok).toBe(true);
    expect(providerCallSpy).not.toHaveBeenCalled();
  });
});
