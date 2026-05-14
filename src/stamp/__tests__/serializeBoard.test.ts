import { serializeBoard, deserializeIntoBoard, type SerializedElement } from '../serializeBoard';

function makeMockBoard() {
  const objectsList: unknown[] = [];
  const create = jest.fn((type: string, args: unknown[], attrs: Record<string, unknown>) => {
    const id = 'j' + objectsList.length;
    const obj = { elType: type, id, attrs };
    objectsList.push(obj);
    return obj;
  });
  return {
    objectsList,
    create,
    getBoundingBox: (): [number, number, number, number] => [-10, 10, 10, -10],
  };
}

describe('serializeBoard', () => {
  test('captures bbox + element list in creation order', () => {
    const board = makeMockBoard();
    const log: SerializedElement[] = [
      { type: 'point', args: [[1, 2]], attrs: { name: 'A', color: '#000' }, id: 'j0' },
      { type: 'point', args: [[3, 4]], attrs: { name: 'B', color: '#000' }, id: 'j1' },
      { type: 'segment', args: ['j0', 'j1'], attrs: { name: 'a' }, id: 'j2' },
    ];

    const serialized = serializeBoard(board, log);

    expect(serialized.bbox).toEqual([-10, 10, 10, -10]);
    expect(serialized.elements).toHaveLength(3);
    expect(serialized.elements[0].type).toBe('point');
    expect(serialized.elements[2].args).toEqual(['j0', 'j1']);
  });

  test('roundtrip: serialize → deserialize calls board.create in same order', () => {
    const sourceLog: SerializedElement[] = [
      { type: 'point', args: [[1, 2]], attrs: { name: 'A' }, id: 'j0' },
      { type: 'segment', args: ['j0', 'j0'], attrs: {}, id: 'j1' },
    ];
    const board1 = makeMockBoard();
    const serialized = serializeBoard(board1, sourceLog);

    const board2 = makeMockBoard();
    deserializeIntoBoard(board2, serialized);

    expect(board2.create).toHaveBeenCalledTimes(2);
    expect(board2.create).toHaveBeenNthCalledWith(1, 'point', [[1, 2]], expect.objectContaining({ name: 'A' }));
    expect(board2.create).toHaveBeenNthCalledWith(2, 'segment', ['j0', 'j0'], expect.objectContaining({}));
  });
});
