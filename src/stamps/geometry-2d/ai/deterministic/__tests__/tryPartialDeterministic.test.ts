// tryPartialDeterministic (hybrid partial-coverage Phase 1, deterministic-only):
// thu intent phần đã phủ + clause còn thiếu, KỂ CẢ khi coverage incomplete.
// Nền cho Phase 2 (LLM bù `uncovered` + mergeIntents). KHÔNG gọi LLM.
import { tryPartialDeterministic, runDeterministicIntents } from '../runDeterministicIntents';

describe('tryPartialDeterministic', () => {
  it('đề COMPLETE (tam giác + trung điểm) → hasPartial=false (Track A lo), detIntents đủ', () => {
    const r = tryPartialDeterministic('Cho tam giác ABC. Gọi M là trung điểm BC');
    expect(r.coverage.complete).toBe(true);
    expect(r.hasPartial).toBe(false);
    expect(r.detIntents.length).toBeGreaterThan(0);
    expect(r.uncovered).toHaveLength(0);
  });

  it('đề PARTIAL (tam giác phủ + construct lạ chưa có rule) → hasPartial=true', () => {
    const r = tryPartialDeterministic('Cho tam giác ABC. Vẽ đường tròn mixtilinear.');
    expect(r.coverage.complete).toBe(false);
    expect(r.hasPartial).toBe(true);
    // detIntents có tam giác (draw-shape).
    expect(r.detIntents.some((i: any) => i.op === 'draw-shape')).toBe(true);
    // uncovered chứa clause "đường tròn mixtilinear".
    expect(r.uncovered.length).toBeGreaterThan(0);
    expect(r.uncovered.some((c) => /mixtilinear/.test(c.text))).toBe(true);
  });

  it('đề NO-MATCH (không construct nào) → hasPartial=false, detIntents rỗng', () => {
    const r = tryPartialDeterministic('Chứng minh định lý Pytago');
    expect(r.hasPartial).toBe(false);
    expect(r.detIntents).toHaveLength(0);
  });

  it('runDeterministicIntents (gate đầy đủ) KHÔNG đổi: complete → ok, partial → incomplete-coverage', () => {
    const full = runDeterministicIntents('Cho tam giác ABC. Gọi M là trung điểm BC');
    expect(full.ok).toBe(true);
    const partial = runDeterministicIntents('Cho tam giác ABC. Vẽ đường tròn mixtilinear.');
    expect(partial.ok).toBe(false);
    if (!partial.ok) expect(partial.reason).toBe('incomplete-coverage');
  });
});
