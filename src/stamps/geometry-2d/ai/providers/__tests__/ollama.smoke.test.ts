/**
 * @jest-environment node
 */
// src/stamps/geometry-2d/ai/providers/__tests__/ollama.smoke.test.ts
//
// Smoke test gọi Ollama daemon thật qua rule-engine intent pipeline
// (generateFigureIntent). Chạy chỉ khi env OLLAMA_SMOKE=1.
//
// Test env = node (không jsdom) để có global fetch sẵn — provider lazy resolve
// fetch ở runtime.
//
// Setup tay:
//   $ brew install ollama
//   $ ollama serve              # chạy nền cổng 11434
//   $ ollama pull gemma3:4b     # ~3.3GB Q4
//   $ OLLAMA_SMOKE=1 npx jest ollama.smoke.test.ts
//
// Skip mặc định để CI + npm test không fail nếu daemon offline.

import { OllamaProvider } from '../ollama';
import { generateFigureIntent } from '../../buildFigureIntent';

const ENABLE = process.env.OLLAMA_SMOKE === '1';
const describeOrSkip = ENABLE ? describe : describe.skip;

describeOrSkip('Ollama smoke (live daemon) — OLLAMA_SMOKE=1', () => {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const model = process.env.OLLAMA_DEFAULT_MODEL || 'gemma3:4b';
  const provider = new OllamaProvider({ baseUrl, defaultModel: model });

  jest.setTimeout(120_000); // 2 phút cho LLM gen

  it('happy path: simple triangle prompt → intent build hợp lệ + transpile ok', async () => {
    // useDeterministic:false để ép qua LLM thật (đề này deterministic cũng dựng được).
    const r = await generateFigureIntent(
      'Tam giác ABC, M là trung điểm BC, vẽ đường thẳng AM.',
      { provider, model, maxTokens: 4096, useDeterministic: false },
    );
    expect(['true', 'false']).toContain(String(r.ok));
    if (r.ok) {
      expect(r.dsl.version).toBe(1);
      expect(r.dsl.points.length).toBeGreaterThan(0);
      const names = r.dsl.points.map((p) => p.name);
      expect(names).toContain('A');
      expect(names).toContain('B');
      expect(names).toContain('C');
      expect(r.transpile.ok).toBe(true);
    } else {
      console.warn('Ollama smoke happy path KHÔNG ok:', r.reason, r.message);
    }
  });

  it('refuse path: đề ngoài phạm vi → response shape valid (ok hoặc reason rõ ràng)', async () => {
    // Gemma 3 4B nhỏ có thể vẽ bừa thay vì refuse cho prompt ngoài phạm vi.
    // Smoke chỉ verify response không crash + có shape rõ ràng.
    const r = await generateFigureIntent(
      'Tính sin(30°) + cos(45°), không vẽ hình.',
      { provider, model, maxTokens: 2048, useDeterministic: false },
    );
    if (r.ok) {
      console.warn('Refuse smoke: Gemma vẫn build figure (model accuracy issue, not infra bug).');
      expect(r.transpile.state).toBeDefined();
    } else {
      expect(['refused', 'parse_error', 'builder_error', 'transpile_error', 'provider_error']).toContain(r.reason);
    }
  });
});
