import { buildIntentSystemPrompt } from '../intentPrompt';

describe('intentPrompt — Tier 4+5 coverage', () => {
  const prompt = buildIntentSystemPrompt();

  it('contains draw-line op example', () => {
    expect(prompt).toContain('draw-line');
  });
  it('contains mark-shape op example', () => {
    expect(prompt).toContain('mark-shape');
  });
  it('contains tangentFromExt example', () => {
    expect(prompt).toContain('tangentFromExt');
  });
  it('contains secondIntersection example', () => {
    expect(prompt).toContain('secondIntersection');
  });
  it('contains inscribedIn example', () => {
    expect(prompt).toContain('inscribedIn');
  });

  it('explains mark-shape vs draw-shape rule', () => {
    expect(prompt.toLowerCase()).toContain('label đã tồn tại');
  });

  // Actual size after Tier 4+5 additions: ~13.9 KB — threshold raised to 16 KB
  it('keeps prompt under reasonable budget (< 16 KB)', () => {
    expect(prompt.length).toBeLessThan(16_000);
  });
});
