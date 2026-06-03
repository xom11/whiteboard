import { applyDerived } from '../derived';
import type { DslPointT, DslShapeT } from '../../../dsl/schema';

function emptyState(): { points: DslPointT[]; shapes: DslShapeT[]; matched: string[] } {
  return { points: [], shapes: [], matched: [] };
}

describe('applyDerived', () => {
  test('"M là trung điểm BC" injects midpoint point', () => {
    const state = emptyState();
    state.points.push(
      { name: 'A', kind: 'free', x: 0, y: 3 },
      { name: 'B', kind: 'free', x: -2, y: 0 },
      { name: 'C', kind: 'free', x: 3, y: 0 },
    );
    state.shapes.push(
      { name: 'AB', kind: 'segment', p1: 'A', p2: 'B' },
      { name: 'BC', kind: 'segment', p1: 'B', p2: 'C' },
      { name: 'CA', kind: 'segment', p1: 'C', p2: 'A' },
    );

    applyDerived('M là trung điểm BC', state);

    expect(state.points).toContainEqual({
      name: 'M', kind: 'midpoint', p1: 'B', p2: 'C',
    });
    expect(state.matched).toContain('midpoint');
  });

  test('"đường cao AH" injects perpFoot H + segment AH', () => {
    const state = emptyState();
    state.points.push(
      { name: 'A', kind: 'free', x: 0, y: 3 },
      { name: 'B', kind: 'free', x: -2, y: 0 },
      { name: 'C', kind: 'free', x: 3, y: 0 },
    );
    state.shapes.push(
      { name: 'BC', kind: 'segment', p1: 'B', p2: 'C' },
    );

    applyDerived('Cho tam giác ABC, đường cao AH', state);

    expect(state.points).toContainEqual({
      name: 'H', kind: 'perpFoot', from: 'A', onLine: 'BC',
    });
    expect(state.shapes).toContainEqual({
      name: 'AH', kind: 'segment', p1: 'A', p2: 'H',
    });
    expect(state.matched).toContain('altitude');
  });

  test('no derived keyword → no-op', () => {
    const state = emptyState();
    state.points.push({ name: 'A', kind: 'free', x: 0, y: 0 });
    applyDerived('Cho điểm A', state);
    expect(state.points).toHaveLength(1);
    expect(state.matched).toEqual([]);
  });
});
