import { produce } from 'immer';
import { reduce } from '../reducer';
import { createEmptyState } from '../types';

describe('reducer UPDATE_VIEW', () => {
  it('cập nhật meta.view với patch', () => {
    const state = createEmptyState('graph2d');
    const next = produce(state, (d) => reduce(d, {
      type: 'UPDATE_VIEW',
      payload: { patch: { xMin: -20, xMax: 20 } },
    }));
    expect(next.meta.view).toEqual({
      xMin: -20, xMax: 20, yMin: -10, yMax: 10,
      showAxis: true, showGrid: true,
    });
  });

  it('giữ nguyên fields không patch', () => {
    const state = createEmptyState('graph2d');
    const next = produce(state, (d) => reduce(d, {
      type: 'UPDATE_VIEW',
      payload: { patch: { showGrid: false } },
    }));
    expect(next.meta.view?.showAxis).toBe(true);
    expect(next.meta.view?.showGrid).toBe(false);
  });

  it('no-op khi domain không có view (2d/3d)', () => {
    const state = createEmptyState('2d');
    const next = produce(state, (d) => reduce(d, {
      type: 'UPDATE_VIEW',
      payload: { patch: { xMin: -20 } },
    }));
    expect(next).toEqual(state);
  });
});
