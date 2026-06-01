// src/stamps/geometry-2d/ai/__tests__/prompt.test.ts
import { buildSystemPrompt } from '../prompt';

describe('buildSystemPrompt', () => {
  it('returns non-empty string', () => {
    const p = buildSystemPrompt();
    expect(typeof p).toBe('string');
    expect(p.length).toBeGreaterThan(1000);
  });

  it('contains 9 fixture problem statements', () => {
    const p = buildSystemPrompt();
    const problems = [
      'Cho tam giác đều ABC cạnh 4',
      'trung điểm BC',
      'đường cao xuống BC',
      'trọng tâm',
      'trực tâm',
      'nội tiếp đường tròn tâm O',
      'tâm nội tiếp',
      'Hình bình hành ABCD',
      'Hai đường tròn',
    ];
    for (const needle of problems) {
      expect(p).toContain(needle);
    }
  });

  it('lists all primitive kinds', () => {
    const p = buildSystemPrompt();
    const kinds = [
      'free', 'midpoint', 'onSegment', 'onLine', 'onCircle',
      'perpFoot', 'circumcenter', 'incenter', 'centroid', 'orthocenter',
      'intersection',
      'segment', 'line', 'ray', 'polygon',
      'perpendicular', 'parallel', 'perpBisector', 'angleBisector', 'tangent',
      'circleCP', 'circle3',
    ];
    for (const k of kinds) {
      expect(p).toContain(k);
    }
  });

  it('mentions envelope shape build / refuse', () => {
    const p = buildSystemPrompt();
    expect(p).toContain('"decision": "build"');
    expect(p).toContain('"decision": "refuse"');
  });

  it('is deterministic — 2 calls return identical string', () => {
    expect(buildSystemPrompt()).toBe(buildSystemPrompt());
  });
});
