// Smoke test cho buildIntentSystemPrompt + verify FIXTURES parse được qua
// IntentEnvelopeZ schema (catch bad fixture sớm).

import { buildIntentSystemPrompt } from '../intentPrompt';
import { IntentEnvelopeZ } from '../intent';

describe('buildIntentSystemPrompt', () => {
  it('returns non-empty deterministic string', () => {
    const a = buildIntentSystemPrompt();
    const b = buildIntentSystemPrompt();
    expect(a).toBe(b);
    expect(a.length).toBeGreaterThan(1000);
  });

  it('contains draw-line cheat sheet section', () => {
    const prompt = buildIntentSystemPrompt();
    expect(prompt).toContain('draw-line — phân biệt field theo kind');
    expect(prompt).toContain('perpThrough');
    expect(prompt).toContain('parallelThrough');
    expect(prompt).toContain('tangentAt');
    expect(prompt).toContain('tangentFromExt');
    // Explicit warning về 1-letter to
    expect(prompt).toContain('A là 1 chữ → POINT, không phải LINE');
  });

  it('contains LINE naming convention rule', () => {
    const prompt = buildIntentSystemPrompt();
    expect(prompt).toContain('2 ký tự viết liền = SEGMENT/LINE');
    expect(prompt).toContain('1 ký tự = POINT');
  });

  it('all FIXTURES parse through IntentEnvelopeZ', () => {
    // Re-extract envelopes from prompt by parsing JSON blocks.
    const prompt = buildIntentSystemPrompt();
    // Look for "**Output:**\n{...}" blocks
    const blocks = prompt.match(/\*\*Output:\*\*\n(\{[\s\S]*?\n\})/g) ?? [];
    expect(blocks.length).toBeGreaterThan(10);
    for (const block of blocks) {
      const jsonStr = block.replace(/^\*\*Output:\*\*\n/, '');
      const parsed = JSON.parse(jsonStr);
      const result = IntentEnvelopeZ.safeParse(parsed);
      if (!result.success) {
        throw new Error(
          `Fixture không parse: ${result.error.message}\nJSON: ${jsonStr.slice(0, 200)}`,
        );
      }
    }
  });
});
