// Test Façade handleGenerateFigure → AiFigureUiResult.
// Từ 2026-06-09 façade chạy DETERMINISTIC-ONLY trên rule-engine intent pipeline
// (generateFigureIntent). Không LLM, không provider — đề miss → deterministic_miss.

import { handleGenerateFigure } from '../handleGenerateFigure';

describe('handleGenerateFigure — Façade (deterministic rule engine)', () => {
  it('ok=true: trả { ok: true, state } (drop dsl/usage/provider)', async () => {
    const r = await handleGenerateFigure({ problem: 'Cho tam giác ABC. Gọi M là trung điểm BC' });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error();
    expect(r.state.order.length).toBeGreaterThan(0);
    expect(Object.keys(r.state.objects).length).toBeGreaterThanOrEqual(3); // 3 đỉnh + polygon
    // Không leak usage/dsl/provider ra client.
    expect((r as Record<string, unknown>).usage).toBeUndefined();
    expect((r as Record<string, unknown>).dsl).toBeUndefined();
    expect((r as Record<string, unknown>).provider).toBeUndefined();
  });

  it('đề rỗng → { ok:false, "Đề bài rỗng" }', async () => {
    const r = await handleGenerateFigure({ problem: '   ' });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error();
    expect(r.message).toBe('Đề bài rỗng');
  });

  it('onResult callback: nhận IntentGenerateResult đầy đủ (telemetry hook)', async () => {
    const calls: unknown[] = [];
    await handleGenerateFigure(
      { problem: 'Cho tam giác ABC. Gọi M là trung điểm BC' },
      { onResult: (raw) => calls.push(raw) },
    );
    expect(calls).toHaveLength(1);
    const captured = calls[0] as { ok: boolean; provider?: string; usage?: unknown };
    expect(captured.ok).toBe(true);
    expect(captured.provider).toBe('deterministic');
    expect(captured.usage).toBeDefined();
  });

  it('onResult throw không vỡ response', async () => {
    const r = await handleGenerateFigure(
      { problem: 'Cho tam giác ABC. Gọi M là trung điểm BC' },
      {
        onResult: () => {
          throw new Error('telemetry boom');
        },
      },
    );
    expect(r.ok).toBe(true);
  });
});

describe('handleGenerateFigure — deterministic miss', () => {
  test('đề dễ (tam giác + đường cao) dựng được hoàn toàn deterministic', async () => {
    const r = await handleGenerateFigure({ problem: 'Cho tam giác ABC, đường cao AH' });
    expect(r.ok).toBe(true);
  });

  test('đề FULL MISS (không dựng được hình) → ok:false message dễ hiểu (KHÔNG LLM)', async () => {
    const r = await handleGenerateFigure({ problem: 'Chứng minh định lý Pytago.' });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      // message dễ hiểu: nêu hướng xử lý (thêm/sửa rule), không leak jargon cũ.
      expect(r.message).toMatch(/bổ sung rule|lỗi rule|chưa nhận ra/i);
      expect(r.message).not.toMatch(/LLM fallback/i);
    }
  });

  test('đề PARTIAL (điểm Fermat) → ok:true + partial.message to-do (render phần ABC)', async () => {
    const r = await handleGenerateFigure({
      problem: 'Cho tam giác ABC, P là điểm Fermat của tam giác.',
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.partial).toBeDefined();
      expect(r.partial?.message).toContain('P');
      expect(r.partial?.message).toContain('tự dựng nốt');
    }
  });
});
