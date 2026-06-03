// Test Façade handleGenerateFigure → AiFigureUiResult mapping.
// Mock AIProvider để tránh hit Anthropic/Ollama thật.

import { handleGenerateFigure } from '../handleGenerateFigure';
import type { AIProvider, ProviderOutput, ProviderRequest } from '../providers';
import { fixture as equilateral } from '../../dsl/fixtures/triangle-equilateral';
import { parseDeterministic } from '../deterministic';

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

// DSL không hợp lệ → transpile_error. Tham chiếu tới point chưa định nghĩa.
const INVALID_DSL = {
  version: 1,
  points: [{ name: 'A', kind: 'midpoint', p1: 'B', p2: 'C' }], // B,C không tồn tại
  shapes: [],
};

describe('handleGenerateFigure — Façade', () => {
  it('ok=true: trả về { ok: true, state } (drop dsl/usage/provider)', async () => {
    const provider = mockProvider({
      kind: 'json',
      data: { decision: 'build', figure: equilateral.dsl },
      usage: { inputTokens: 100, outputTokens: 20 },
    });

    // Bypass deterministic fast path để test mock provider envelope mapping.
    const r = await handleGenerateFigure(
      { problem: 'Tam giác đều ABC' },
      { provider, useDeterministic: false },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error();
    expect(r.state.order).toEqual(['p1', 'p2', 'p3', 'poly1']);
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

    const r = await handleGenerateFigure({ problem: 'Biến đổi affine' }, { provider });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error();
    expect(r.message).toBe('Đề ngoài phạm vi (lớp 11)');
  });

  it('parse_error: trả message Việt friendly (không leak technical)', async () => {
    const provider = mockProvider({
      kind: 'json',
      data: { figure: equilateral.dsl }, // thiếu decision → parse_error
      usage: { inputTokens: 50, outputTokens: 10 },
    });

    const r = await handleGenerateFigure({ problem: 'test' }, { provider });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error();
    expect(r.message).toMatch(/không hợp lệ/i);
    expect(r.message).not.toMatch(/decision/i); // không leak field name
  });

  it('api_error: pass message gốc (đề bài rỗng / key thiếu)', async () => {
    const provider = mockProvider({ kind: 'error', message: 'should not call' });

    const r = await handleGenerateFigure({ problem: '' }, { provider });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error();
    expect(r.message).toBe('Đề bài rỗng');
  });

  it('onResult callback: nhận GenerateResult đầy đủ (telemetry hook)', async () => {
    const provider = mockProvider({
      kind: 'json',
      data: { decision: 'build', figure: equilateral.dsl },
      usage: { inputTokens: 100, outputTokens: 20 },
    });

    const calls: unknown[] = [];
    await handleGenerateFigure(
      { problem: 'Tam giác đều' },
      { provider, onResult: (raw) => calls.push(raw) },
    );

    expect(calls).toHaveLength(1);
    const captured = calls[0] as { ok: boolean; provider?: string; usage?: unknown };
    expect(captured.ok).toBe(true);
    expect(captured.provider).toBe('mock');
    expect(captured.usage).toBeDefined();
  });

  it('onResult throw không vỡ response', async () => {
    const provider = mockProvider({
      kind: 'json',
      data: { decision: 'build', figure: equilateral.dsl },
      usage: { inputTokens: 100, outputTokens: 20 },
    });

    const r = await handleGenerateFigure(
      { problem: 'Tam giác đều' },
      {
        provider,
        onResult: () => {
          throw new Error('telemetry boom');
        },
      },
    );

    expect(r.ok).toBe(true);
  });

  describe('auto-retry', () => {
    it('transpile_error → retry → ok (attempt 2 success)', async () => {
      const provider = sequenceProvider([
        // Attempt 1: transpile_error
        { kind: 'json', data: { decision: 'build', figure: INVALID_DSL }, usage: { inputTokens: 100, outputTokens: 20 } },
        // Attempt 2: ok
        { kind: 'json', data: { decision: 'build', figure: equilateral.dsl }, usage: { inputTokens: 100, outputTokens: 20 } },
      ]);

      const attempts: number[] = [];
      const r = await handleGenerateFigure(
        { problem: 'Tam giác đều' },
        { provider, onResult: (_, attempt) => attempts.push(attempt) },
      );

      expect(provider.calls).toHaveLength(2);
      expect(attempts).toEqual([1, 2]);
      expect(r.ok).toBe(true);
    });

    it('transpile_error 2 lần liên tiếp → fail với message đã thử lại', async () => {
      const provider = sequenceProvider([
        { kind: 'json', data: { decision: 'build', figure: INVALID_DSL }, usage: { inputTokens: 100, outputTokens: 20 } },
      ]);

      const r = await handleGenerateFigure({ problem: 'test' }, { provider });

      expect(provider.calls).toHaveLength(2); // default maxAttempts=2
      expect(r.ok).toBe(false);
      if (r.ok) throw new Error();
      expect(r.message).toMatch(/đã thử lại/i);
    });

    it('refused KHÔNG retry (AI cố ý từ chối)', async () => {
      const provider = sequenceProvider([
        { kind: 'json', data: { decision: 'refuse', reason: 'Đề lớp 11' }, usage: { inputTokens: 50, outputTokens: 10 } },
      ]);

      await handleGenerateFigure({ problem: 'affine' }, { provider });

      expect(provider.calls).toHaveLength(1); // không retry
    });

    it('parse_error KHÔNG retry (envelope sai schema → chắc chắn sai mọi lần)', async () => {
      const provider = sequenceProvider([
        { kind: 'json', data: { figure: equilateral.dsl }, usage: { inputTokens: 50, outputTokens: 10 } },
      ]);

      await handleGenerateFigure({ problem: 'test' }, { provider });

      expect(provider.calls).toHaveLength(1);
    });

    it('api_error KHÔNG retry (network/config, không phải model)', async () => {
      const provider = sequenceProvider([{ kind: 'error', message: 'connection refused' }]);

      await handleGenerateFigure({ problem: 'test' }, { provider });

      expect(provider.calls).toHaveLength(1);
    });

    it('maxAttempts=3 → thử tối đa 3 lần với transpile_error', async () => {
      const provider = sequenceProvider([
        { kind: 'json', data: { decision: 'build', figure: INVALID_DSL }, usage: { inputTokens: 50, outputTokens: 10 } },
      ]);

      await handleGenerateFigure({ problem: 'test' }, { provider, maxAttempts: 3 });

      expect(provider.calls).toHaveLength(3);
    });

    it('maxAttempts=1 → không retry', async () => {
      const provider = sequenceProvider([
        { kind: 'json', data: { decision: 'build', figure: INVALID_DSL }, usage: { inputTokens: 50, outputTokens: 10 } },
      ]);

      await handleGenerateFigure({ problem: 'test' }, { provider, maxAttempts: 1 });

      expect(provider.calls).toHaveLength(1);
    });

    it('maxAttempts ngoài range → clamp [1,5]', async () => {
      const provider = sequenceProvider([
        { kind: 'json', data: { decision: 'build', figure: INVALID_DSL }, usage: { inputTokens: 50, outputTokens: 10 } },
      ]);

      await handleGenerateFigure({ problem: 'test' }, { provider, maxAttempts: 99 });

      expect(provider.calls).toHaveLength(5); // clamp tối đa 5
    });
  });
});

describe('handleGenerateFigure — deterministic fast path', () => {
  test('high-confidence problem skips LLM provider entirely', async () => {
    const providerCallSpy = jest.fn();
    const mockProvider = {
      name: 'mock', defaultModel: 'mock', call: providerCallSpy,
    };
    const r = await handleGenerateFigure(
      { problem: 'Cho tam giác ABC, đường cao AH' },
      { provider: mockProvider },
    );
    expect(r.ok).toBe(true);
    expect(providerCallSpy).not.toHaveBeenCalled();
  });

  test('low-confidence problem falls back to LLM', async () => {
    const providerCallSpy = jest.fn().mockResolvedValue({
      kind: 'error', message: 'mock-not-real-call',
    });
    const mockProvider = {
      name: 'mock', defaultModel: 'mock', call: providerCallSpy,
    };
    await handleGenerateFigure(
      { problem: 'vẽ đường tròn Euler của tam giác ABC' },
      { provider: mockProvider },
    );
    expect(providerCallSpy).toHaveBeenCalled();
  });

  test('useDeterministic=false always uses LLM', async () => {
    const providerCallSpy = jest.fn().mockResolvedValue({
      kind: 'error', message: 'mock',
    });
    await handleGenerateFigure(
      { problem: 'Cho tam giác ABC, đường cao AH' },
      { provider: { name: 'mock', defaultModel: 'mock', call: providerCallSpy }, useDeterministic: false },
    );
    expect(providerCallSpy).toHaveBeenCalled();
  });
});
