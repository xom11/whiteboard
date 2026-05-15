// JSXGraph không có built-in getJSON. Component giữ MỘT LOG riêng của các create() call
// do user trigger, pass log đó vào serializeBoard. Replay = gọi board.create() theo thứ tự log.
//
// type === 'transform': args là [refs đến điểm/đường/scalar], attrs là { type: 'translate'|'rotate'|'reflect'|'scale', ... }.
// Object trả về (kết quả board.create('transform', ...)) được đăng ký vào idMap như mọi element khác
// để point/line phụ thuộc reference được bằng id ('j5' → JSXGraph transform object).

export interface SerializedElement {
  type: string;
  args: unknown[];
  attrs: Record<string, unknown>;
  id: string;
}

export interface SerializedBoard {
  bbox: [number, number, number, number];
  elements: SerializedElement[];
  showAxis?: boolean;
  showGrid?: boolean;
}

interface BoardLike {
  getBoundingBox(): [number, number, number, number];
  create(type: string, args: unknown[], attrs: Record<string, unknown>): unknown;
}

export function serializeBoard(
  board: BoardLike,
  log: SerializedElement[],
  options: { showAxis?: boolean; showGrid?: boolean } = {},
): SerializedBoard {
  return {
    bbox: board.getBoundingBox(),
    elements: log.map(e => ({ type: e.type, args: e.args, attrs: e.attrs, id: e.id })),
    showAxis: !!options.showAxis,
    showGrid: !!options.showGrid,
  };
}

export function deserializeIntoBoard(board: BoardLike, serialized: SerializedBoard): void {
  // Replay: args may contain references to earlier elements by our serialized id ("j0", "j1"…).
  // We resolve those to actual JSXGraph objects via a local id→object map.
  const idMap = new Map<string, unknown>();
  for (const el of serialized.elements) {
    const resolvedArgs = el.args.map((a) => {
      if (typeof a === 'string' && idMap.has(a)) return idMap.get(a);
      return a;
    });
    const created = board.create(el.type, resolvedArgs, { ...el.attrs });
    idMap.set(el.id, created);
  }
}
