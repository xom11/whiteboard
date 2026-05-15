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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createValueLabel(board: any, target: any): unknown {
  if (!board || !target) return null;
  const e = (target.elType ?? target.type ?? '').toString().toLowerCase();
  if (e === 'segment' || e === 'line' || e === 'arrow') {
    const p1 = target.point1, p2 = target.point2;
    if (!p1 || !p2) return null;
    return board.create('text', [
      () => (p1.X() + p2.X()) / 2 + 0.15,
      () => (p1.Y() + p2.Y()) / 2 + 0.25,
      () => {
        const len = Math.hypot(p2.X() - p1.X(), p2.Y() - p1.Y());
        const name = typeof target.name === 'string' && target.name ? target.name : 'd';
        return `${name} = ${len.toFixed(2)}`;
      },
    ], { fontSize: 12, color: '#dc2626', fixed: true, highlight: false });
  }
  if (e === 'circle' || e === 'circumcircle') {
    const center = target.center ?? target.midpoint ?? target.point1;
    if (!center) return null;
    return board.create('text', [
      () => center.X() + 0.3,
      () => center.Y() + 0.3,
      () => {
        const r = typeof target.Radius === 'function' ? target.Radius() : 0;
        const name = typeof target.name === 'string' && target.name ? target.name : 'r';
        return `${name} = ${r.toFixed(2)}`;
      },
    ], { fontSize: 12, color: '#dc2626', fixed: true, highlight: false });
  }
  return null;
}

export function deserializeIntoBoard(board: BoardLike, serialized: SerializedBoard): void {
  // Replay: args may contain references to earlier elements by our serialized id ("j0", "j1"…).
  // We resolve those to actual JSXGraph objects via a local id→object map. Nested
  // arrays are also resolved recursively — needed for dilate, which logs the
  // transform parent of a transformed point as ["j2","j3","j4"] (a chain of 3
  // transforms passed to `board.create('point', [src, [t1,t2,t3]])`).
  const idMap = new Map<string, unknown>();
  const resolve = (a: unknown): unknown => {
    if (typeof a === 'string' && idMap.has(a)) return idMap.get(a);
    if (Array.isArray(a)) return a.map(resolve);
    return a;
  };
  for (const el of serialized.elements) {
    const resolvedArgs = el.args.map(resolve);
    if (el.type === 'valueLabel') {
      const target = resolvedArgs[0];
      const txt = createValueLabel(board, target);
      if (txt) idMap.set(el.id, txt);
      continue;
    }
    const created = board.create(el.type, resolvedArgs, { ...el.attrs });
    idMap.set(el.id, created);
  }
}
