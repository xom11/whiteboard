import { buildRefineSystemPrompt } from '../refinePrompt';
import type { DslInputT } from '../../dsl/schema';

describe('buildRefineSystemPrompt', () => {
  const triangleDsl: DslInputT = {
    version: 1,
    points: [
      { name: 'A', kind: 'free', x: 0, y: 3 },
      { name: 'B', kind: 'free', x: -2, y: 0 },
      { name: 'C', kind: 'free', x: 3, y: 0 },
    ],
    shapes: [{ name: 'ABC', kind: 'polygon', vertices: ['A', 'B', 'C'] }],
  };

  it('embeds currentDsl JSON in the prompt', () => {
    const prompt = buildRefineSystemPrompt(triangleDsl);
    expect(prompt).toContain('"name": "A"');
    expect(prompt).toContain('"kind": "polygon"');
    expect(prompt).toContain('"vertices": [');
  });

  it('lists existing names (points + shapes) explicitly', () => {
    const prompt = buildRefineSystemPrompt(triangleDsl);
    expect(prompt).toMatch(/points:.*A.*B.*C/s);
    expect(prompt).toMatch(/shapes:.*ABC/s);
  });

  it('mentions all three decisions explicitly', () => {
    const prompt = buildRefineSystemPrompt(triangleDsl);
    expect(prompt).toContain('"add"');
    expect(prompt).toContain('"replace"');
    expect(prompt).toContain('"refuse"');
  });

  it('includes anti-pattern guidance (no redefine, no unresolved ref)', () => {
    const prompt = buildRefineSystemPrompt(triangleDsl);
    expect(prompt.toLowerCase()).toMatch(/không.*redefine|không.*trùng|không.*tham chiếu/i);
  });

  it('handles empty currentDsl gracefully', () => {
    const empty: DslInputT = { version: 1, points: [], shapes: [] };
    const prompt = buildRefineSystemPrompt(empty);
    expect(prompt).toBeTruthy();
    expect(prompt.length).toBeGreaterThan(100);
  });

  it('includes at least 6 few-shot refine examples', () => {
    const prompt = buildRefineSystemPrompt(triangleDsl);
    const matches = prompt.match(/### Ví dụ \d+/g);
    expect(matches).toBeTruthy();
    expect((matches ?? []).length).toBeGreaterThanOrEqual(6);
  });
});
