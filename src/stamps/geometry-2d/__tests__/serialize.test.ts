import { serializeBoard, deserializeIntoBoard, type SerializedElement, type SerializedBoard } from '../serialize';

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
    // idMap resolves string refs to actual objects created in step 1
    const firstCallReturn = (board2.create as jest.Mock).mock.results[0].value;
    expect(board2.create).toHaveBeenNthCalledWith(2, 'segment', [firstCallReturn, firstCallReturn], expect.objectContaining({}));
  });

  test('deserialize resolves "<polyId>:border:<i>" to polygon.borders[i]', () => {
    // Mock board where 'polygon' creates an object with a .borders array
    // (3 child segments) — matches JSXGraph's polygon shape.
    const created: Array<{ type: string; args: unknown[]; attrs: Record<string, unknown> }> = [];
    const board = {
      getBoundingBox: () => [-10, 10, 10, -10] as [number, number, number, number],
      create: jest.fn((type: string, args: unknown[], attrs: Record<string, unknown>) => {
        const obj: Record<string, unknown> = { __mock: type, args, attrs };
        if (type === 'polygon' || type === 'regularpolygon') {
          obj.borders = args.map((_, i) => ({ __mock: 'segment', __parentIdx: i }));
        }
        created.push({ type, args, attrs });
        return obj;
      }),
    };
    const serialized: SerializedBoard = {
      bbox: [-10, 10, 10, -10],
      elements: [
        { id: 'j0', type: 'point', args: [0, 0], attrs: { name: 'A' } },
        { id: 'j1', type: 'point', args: [2, 0], attrs: { name: 'B' } },
        { id: 'j2', type: 'point', args: [2, 2], attrs: { name: 'C' } },
        { id: 'j3', type: 'polygon', args: ['j0', 'j1', 'j2'], attrs: {} },
        { id: 'j4', type: 'point', args: [5, 5], attrs: { name: 'P' } },
        // Perpendicular from point P to the FIRST edge of the polygon.
        { id: 'j5', type: 'perpendicular', args: ['j3:border:0', 'j4'], attrs: {} },
      ],
    };
    deserializeIntoBoard(board, serialized);
    expect(created).toHaveLength(6);
    const perpCall = created[5];
    expect(perpCall.type).toBe('perpendicular');
    // First arg is resolved to the polygon's borders[0] (a segment object), NOT a string.
    expect(typeof perpCall.args[0]).toBe('object');
    expect((perpCall.args[0] as { __parentIdx: number }).__parentIdx).toBe(0);
    // Second arg resolved to the point object too.
    expect(typeof perpCall.args[1]).toBe('object');
  });

  test('deserialize with transform entry replays through idMap like other elements', () => {
    const created: Array<{ type: string; args: unknown[]; attrs: Record<string, unknown> }> = [];
    const board = {
      getBoundingBox: () => [-10, 10, 10, -10] as [number, number, number, number],
      create: jest.fn((type: string, args: unknown[], attrs: Record<string, unknown>) => {
        const obj = { __mock: type, args, attrs };
        created.push({ type, args, attrs });
        return obj;
      }),
    };
    const serialized: SerializedBoard = {
      bbox: [-10, 10, 10, -10],
      elements: [
        { id: 'j0', type: 'point', args: [0, 0], attrs: { name: 'A' } },
        { id: 'j1', type: 'transform', args: ['j0'], attrs: { type: 'rotate' } },
        { id: 'j2', type: 'point', args: ['j1', 'j0'], attrs: { name: "A'" } },
      ],
    };
    deserializeIntoBoard(board, serialized);
    expect(created).toHaveLength(3);
    expect(created[1].type).toBe('transform');
    // point j2 args resolved to objects (no longer string refs)
    expect(typeof created[2].args[0]).toBe('object');
    expect(typeof created[2].args[1]).toBe('object');
  });
});
