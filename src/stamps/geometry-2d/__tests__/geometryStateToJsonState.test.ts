import { geometryStateToJsonState } from '../studio/geometryStateToJsonState';
import { deserializeBoard } from '../serialize';
import { createEmptyState, DEFAULT_VIEW_2D, type State } from '../../../core/scene';

describe('geometryStateToJsonState', () => {
  test('roundtrip: state → jsonState → state', () => {
    const state = createEmptyState('2d');
    const json = geometryStateToJsonState(state);
    const back = deserializeBoard(json);
    expect(back.objects).toEqual(state.objects);
    expect(back.order).toEqual(state.order);
    expect(back.meta.domain).toBe('2d');
  });

  test('giữ nguyên view có sẵn trong state.meta', () => {
    const base = createEmptyState('2d');
    const custom = { ...DEFAULT_VIEW_2D, showAxis: !DEFAULT_VIEW_2D.showAxis };
    const state: State = { ...base, meta: { domain: '2d', version: base.meta.version, view: custom } };

    const back = deserializeBoard(geometryStateToJsonState(state));
    expect(back.meta.domain).toBe('2d');
    if (back.meta.domain === '2d') {
      expect(back.meta.view.showAxis).toBe(custom.showAxis);
    }
  });

  test('dùng DEFAULT_VIEW_2D khi state không phải domain 2d', () => {
    const state = createEmptyState('graph2d');
    const back = deserializeBoard(geometryStateToJsonState(state));
    expect(back.meta.domain).toBe('2d');
    if (back.meta.domain === '2d') {
      expect(back.meta.view).toEqual(DEFAULT_VIEW_2D);
    }
  });
});
