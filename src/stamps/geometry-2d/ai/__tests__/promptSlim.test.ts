import { buildSystemPromptSlim } from '../promptSlim';

describe('buildSystemPromptSlim', () => {
  test('produces prompt under 8000 chars (~2k tok)', () => {
    const p = buildSystemPromptSlim();
    expect(p.length).toBeLessThan(8000);
  });

  test('includes core mandatory rules', () => {
    const p = buildSystemPromptSlim();
    expect(p).toContain('BẮT BUỘC');
    expect(p).toContain('midpoint');
    expect(p).toContain('perpFoot');
    expect(p).toContain('circle3');
  });

  test('includes exactly 5 fixtures', () => {
    const p = buildSystemPromptSlim();
    const exampleCount = (p.match(/### Ví dụ \d+/g) ?? []).length;
    expect(exampleCount).toBe(5);
  });
});
