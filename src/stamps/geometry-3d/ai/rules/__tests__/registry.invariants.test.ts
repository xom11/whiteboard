import { ALL_RULES_3D, runRules3D } from '../registry';

describe('3D rule registry invariants', () => {
  it('no duplicate rule ids', () => {
    const ids = ALL_RULES_3D.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('sorted by priority descending', () => {
    for (let i = 1; i < ALL_RULES_3D.length; i++) {
      expect(ALL_RULES_3D[i - 1].priority).toBeGreaterThanOrEqual(ALL_RULES_3D[i].priority);
    }
  });
  it('every rule has at least one prefilter pattern', () => {
    ALL_RULES_3D.forEach((r) => expect(r.patterns.length).toBeGreaterThan(0));
  });
  it('runRules3D returns an array on empty problem', () => {
    expect(Array.isArray(runRules3D({ problem: '', clauses: [] }))).toBe(true);
  });
});
