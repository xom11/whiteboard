// JSXGraph không có built-in getJSON. Component giữ MỘT LOG riêng của các create() call
// do user trigger, pass log đó vào serializeBoard. Replay = gọi board.create() theo thứ tự log.

export interface SerializedElement {
  type: string;
  args: unknown[];
  attrs: Record<string, unknown>;
  id: string;
}

export interface SerializedBoard {
  bbox: [number, number, number, number];
  elements: SerializedElement[];
}

interface BoardLike {
  getBoundingBox(): [number, number, number, number];
  create(type: string, args: unknown[], attrs: Record<string, unknown>): unknown;
}

export function serializeBoard(board: BoardLike, log: SerializedElement[]): SerializedBoard {
  return {
    bbox: board.getBoundingBox(),
    elements: log.map(e => ({ type: e.type, args: e.args, attrs: e.attrs, id: e.id })),
  };
}

export function deserializeIntoBoard(board: BoardLike, serialized: SerializedBoard): void {
  for (const el of serialized.elements) {
    board.create(el.type, el.args, { ...el.attrs });
  }
}
