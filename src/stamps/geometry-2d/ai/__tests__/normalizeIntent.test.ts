import { normalizeIntents } from '../normalizeIntent';
import type { IntentT } from '../intent';

describe('normalizeIntents — triangle isoceles label position', () => {
  const tri = (labels: [string, string, string], variant: string): IntentT => ({
    op: 'draw-shape',
    shape: 'triangle',
    labels,
    variant: variant as never,
  });

  it('"cân tại A" (apex pos 0) → isoceles-BC bất kể LLM emit gì', () => {
    const out = normalizeIntents(
      [tri(['A', 'B', 'C'], 'isoceles-AB')],
      'Tam giác ABC cân tại A.',
    );
    expect((out[0] as { variant: string }).variant).toBe('isoceles-BC');
  });

  it('"cân tại N" (apex pos 1 trong MNP) → isoceles-CA', () => {
    const out = normalizeIntents(
      [tri(['M', 'N', 'P'], 'isoceles-AB')],
      'Tam giác MNP cân tại N.',
    );
    expect((out[0] as { variant: string }).variant).toBe('isoceles-CA');
  });

  it('"cân tại P" (apex pos 2 trong MNP) → isoceles-AB', () => {
    const out = normalizeIntents(
      [tri(['M', 'N', 'P'], 'isoceles-BC')],
      'Tam giác MNP cân tại P.',
    );
    expect((out[0] as { variant: string }).variant).toBe('isoceles-AB');
  });

  it('không có "cân tại" → giữ nguyên variant LLM emit', () => {
    const out = normalizeIntents(
      [tri(['A', 'B', 'C'], 'equilateral')],
      'Tam giác đều ABC.',
    );
    expect((out[0] as { variant: string }).variant).toBe('equilateral');
  });
});
