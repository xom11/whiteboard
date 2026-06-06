// Smoke test: prompt vocab + validator hint cho pointAtDistance.

import { buildIntentSystemPrompt } from '../intentPrompt';

describe('intentPrompt pointAtDistance vocab', () => {
  const prompt = buildIntentSystemPrompt();

  it('mentions pointAtDistance in constraint kinds list', () => {
    expect(prompt).toContain('pointAtDistance');
  });

  it('contains kéo dài keyword guidance', () => {
    expect(prompt.toLowerCase()).toContain('kéo dài');
  });

  it('explains distance sub-kinds (circleRadius / segmentLength / literal)', () => {
    expect(prompt).toContain('circleRadius');
    expect(prompt).toContain('segmentLength');
  });
});
