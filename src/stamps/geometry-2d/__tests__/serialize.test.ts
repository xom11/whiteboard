import { serializeBoard, deserializeBoard, type SerializedBoard } from '../serialize';
import { createEmptyState } from '../../../core/scene';

describe('2d/serialize', () => {
  test('round-trip empty state', () => {
    const state = createEmptyState('2d');
    const raw: SerializedBoard = serializeBoard([-5, 5, 5, -5], state, { showAxis: true, showGrid: false });
    expect(raw.version).toBe(2);
    expect(raw.showAxis).toBe(true);
    expect(raw.showGrid).toBe(false);
    const back = deserializeBoard(raw);
    expect(back.state).toEqual(state);
    expect(back.bbox).toEqual([-5, 5, 5, -5]);
  });

  test('deserialize format v1 cũ (SerializedElement[]) → empty state', () => {
    const v1 = { bbox: [-5, 5, 5, -5], elements: [{ type: 'point', args: [0, 0], attrs: {}, id: 'j0' }] };
    const back = deserializeBoard(v1);
    expect(back.state.objects).toEqual({});
    expect(back.state.order).toEqual([]);
  });

  test('deserialize null hoặc undefined → empty state', () => {
    expect(deserializeBoard(null).state.objects).toEqual({});
    expect(deserializeBoard(undefined).state.objects).toEqual({});
  });
});
