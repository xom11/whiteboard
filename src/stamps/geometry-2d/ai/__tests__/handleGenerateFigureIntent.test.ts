// Tests for handleGenerateFigureIntent Façade (deterministic-only, KHÔNG LLM).

import { handleGenerateFigureIntent } from '../handleGenerateFigureIntent';

describe('handleGenerateFigureIntent', () => {
  it('returns success kind with dsl + intents (deterministic hit)', async () => {
    const r = await handleGenerateFigureIntent('Cho tam giác ABC. Gọi M là trung điểm BC');
    expect(r.kind).toBe('success');
    if (r.kind === 'success') {
      expect(r.dsl).toBeDefined();
      expect(r.intents.length).toBeGreaterThan(0);
    }
  });

  it('returns error kind on deterministic miss', async () => {
    const r = await handleGenerateFigureIntent('Cho tam giác ABC, P là điểm Fermat của tam giác.');
    expect(r.kind).toBe('error');
    if (r.kind === 'error') {
      expect(r.code).toBe('deterministic_miss');
    }
  });
});
