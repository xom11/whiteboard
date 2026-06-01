// Test Façade handleGenerateFigure → AiFigureUiResult mapping.
// Mock AIProvider để tránh hit Anthropic/Ollama thật.

import { handleGenerateFigure } from '../handleGenerateFigure';
import type { AIProvider, ProviderOutput } from '../providers';
import { fixture as equilateral } from '../../dsl/fixtures/triangle-equilateral';

function mockProvider(out: ProviderOutput): AIProvider {
  return {
    name: 'mock',
    defaultModel: 'mock-default',
    async call() {
      return out;
    },
  };
}

describe('handleGenerateFigure — Façade', () => {
  it('ok=true: trả về { ok: true, state } (drop dsl/usage/provider)', async () => {
    const provider = mockProvider({
      kind: 'json',
      data: { decision: 'build', figure: equilateral.dsl },
      usage: { inputTokens: 100, outputTokens: 20 },
    });

    const r = await handleGenerateFigure({ problem: 'Tam giác đều ABC' }, { provider });
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
});
