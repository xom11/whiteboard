import { buildVisionSystemPrompt, VISION_USER_PROMPT } from '../prompt';

describe('vision prompt', () => {
  it('system prompt instructs reading Vietnamese math text', () => {
    const p = buildVisionSystemPrompt();
    expect(p).toMatch(/tiếng Việt/i);
    expect(p).toMatch(/đề toán|đề bài/i);
  });

  it('system prompt lists key math symbols to preserve', () => {
    const p = buildVisionSystemPrompt();
    expect(p).toContain('Δ');
    expect(p).toContain('⊥');
    expect(p).toContain('°');
  });

  it('system prompt instructs refuse for non-math images', () => {
    const p = buildVisionSystemPrompt();
    expect(p).toMatch(/decision.*refuse|từ chối/i);
  });

  it('system prompt mentions confidence field', () => {
    const p = buildVisionSystemPrompt();
    expect(p).toMatch(/confidence/i);
  });

  it('user prompt is short imperative Vietnamese', () => {
    expect(VISION_USER_PROMPT).toMatch(/đọc.*đề|đề.*ảnh/i);
    expect(VISION_USER_PROMPT.length).toBeLessThan(100);
  });
});
