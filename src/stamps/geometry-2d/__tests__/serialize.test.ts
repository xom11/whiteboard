import { serializeBoard, deserializeBoard } from '../serialize';
import { createEmptyState, DEFAULT_VIEW_2D } from '../../../core/scene';

describe('2d/serialize', () => {
  test('round-trip empty state với view info bake vào state.meta.view', () => {
    const state = createEmptyState('2d');
    const view = { bbox: [-5, 5, 5, -5] as const, showAxis: true, showGrid: false };
    const raw = serializeBoard(state, view);
    expect(typeof raw).toBe('string');
    const back = deserializeBoard(raw);
    expect(back.meta.domain).toBe('2d');
    if (back.meta.domain === '2d') {
      expect(back.meta.view.bbox).toEqual([-5, 5, 5, -5]);
      expect(back.meta.view.showAxis).toBe(true);
      expect(back.meta.view.showGrid).toBe(false);
    }
  });

  test('deserialize garbage → empty state với default view', () => {
    const back = deserializeBoard('not json');
    expect(back.meta.domain).toBe('2d');
    if (back.meta.domain === '2d') {
      expect(back.meta.view).toEqual(DEFAULT_VIEW_2D);
    }
    expect(back.objects).toEqual({});
  });

  test('deserialize empty string → empty state', () => {
    const back = deserializeBoard('');
    expect(back.meta.domain).toBe('2d');
    expect(back.objects).toEqual({});
  });
});
