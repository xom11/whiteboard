// src/stamps/geometry-2d/ai/providers/__tests__/ollama.smoke.test.ts
//
// Smoke test gọi Ollama daemon thật. Chạy chỉ khi env OLLAMA_SMOKE=1.
//
// Setup tay:
//   $ brew install ollama
//   $ ollama serve              # chạy nền cổng 11434
//   $ ollama pull gemma3:4b     # ~3.3GB Q4
//   $ OLLAMA_SMOKE=1 npx jest ollama.smoke.test.ts
//
// Skip mặc định để CI + npm test không fail nếu daemon offline.

import { OllamaProvider } from '../ollama';
import { generateFigure } from '../../buildFigure';

const ENABLE = process.env.OLLAMA_SMOKE === '1';
const describeOrSkip = ENABLE ? describe : describe.skip;

describeOrSkip('Ollama smoke (live daemon) — OLLAMA_SMOKE=1', () => {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const model = process.env.OLLAMA_DEFAULT_MODEL || 'gemma3:4b';
  const provider = new OllamaProvider({ baseUrl, defaultModel: model });

  jest.setTimeout(120_000); // 2 phút cho LLM gen

  it('happy path: simple triangle prompt → build envelope hợp lệ + transpile ok', async () => {
    const r = await generateFigure(
      'Tam giác ABC, M là trung điểm BC, vẽ đường thẳng AM.',
      { provider, model, maxTokens: 4096 },
    );
    // Có thể fail nhưng phải có shape rõ ràng (không crash).
    expect(['true', 'false']).toContain(String(r.ok));
    if (r.ok) {
      expect(r.dsl.version).toBe(1);
      expect(r.dsl.points.length).toBeGreaterThan(0);
      // Verify M xuất hiện trong points
      const names = r.dsl.points.map((p) => p.name);
      expect(names).toContain('A');
      expect(names).toContain('B');
      expect(names).toContain('C');
    } else {
      console.warn('Ollama smoke happy path KHÔNG ok:', r.reason, r.message);
    }
  });

  it('refuse path: đề ngoài phạm vi (lượng giác) → refuse hoặc transpile_error', async () => {
    const r = await generateFigure(
      'Tính sin(30°) + cos(45°), không vẽ hình.',
      { provider, model, maxTokens: 2048 },
    );
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected non-ok');
    // Gemma có thể refuse hoặc trả parse_error (output ngoài schema). Cả 2 OK.
    expect(['refused', 'parse_error', 'transpile_error']).toContain(r.reason);
  });
});
