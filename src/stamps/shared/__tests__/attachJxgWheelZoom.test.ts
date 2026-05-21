import { attachJxgWheelZoom, type JxgBoardZoomable } from '../attachJxgWheelZoom';

function makeBoard(overrides: Partial<JxgBoardZoomable> = {}): JxgBoardZoomable & {
  calls: { zoom: 'in' | 'out'; cx?: number; cy?: number }[];
} {
  const calls: { zoom: 'in' | 'out'; cx?: number; cy?: number }[] = [];
  return {
    zoomIn: (cx, cy) => calls.push({ zoom: 'in', cx, cy }),
    zoomOut: (cx, cy) => calls.push({ zoom: 'out', cx, cy }),
    calls,
    ...overrides,
  };
}

function wheel(opts: WheelEventInit): WheelEvent {
  return new WheelEvent('wheel', { bubbles: true, cancelable: true, ...opts });
}

describe('attachJxgWheelZoom', () => {
  let target: HTMLDivElement;

  beforeEach(() => {
    target = document.createElement('div');
    document.body.appendChild(target);
  });
  afterEach(() => {
    target.remove();
  });

  test('không có modifier → bỏ qua, không zoom + không preventDefault', () => {
    const board = makeBoard();
    const cleanup = attachJxgWheelZoom(target, board);
    const e = wheel({ deltaY: -100 });
    target.dispatchEvent(e);
    expect(board.calls).toEqual([]);
    expect(e.defaultPrevented).toBe(false);
    cleanup();
  });

  test('Ctrl + wheel up → zoomIn + preventDefault', () => {
    const board = makeBoard();
    const cleanup = attachJxgWheelZoom(target, board);
    const e = wheel({ deltaY: -100, ctrlKey: true });
    target.dispatchEvent(e);
    expect(board.calls).toHaveLength(1);
    expect(board.calls[0].zoom).toBe('in');
    expect(e.defaultPrevented).toBe(true);
    cleanup();
  });

  test('Cmd (meta) + wheel down → zoomOut', () => {
    const board = makeBoard();
    const cleanup = attachJxgWheelZoom(target, board);
    target.dispatchEvent(wheel({ deltaY: 100, metaKey: true }));
    expect(board.calls).toHaveLength(1);
    expect(board.calls[0].zoom).toBe('out');
    cleanup();
  });

  test('cursor-anchored zoom: getUsrCoordsOfMouse cung cấp cx/cy', () => {
    const board = makeBoard({
      getUsrCoordsOfMouse: () => [3.5, -1.25],
    });
    const cleanup = attachJxgWheelZoom(target, board);
    target.dispatchEvent(wheel({ deltaY: -1, ctrlKey: true }));
    expect(board.calls[0]).toEqual({ zoom: 'in', cx: 3.5, cy: -1.25 });
    cleanup();
  });

  test('NaN trả về từ getUsrCoordsOfMouse → fallback undefined cx/cy', () => {
    const board = makeBoard({
      getUsrCoordsOfMouse: () => [NaN, 2],
    });
    const cleanup = attachJxgWheelZoom(target, board);
    target.dispatchEvent(wheel({ deltaY: -1, ctrlKey: true }));
    expect(board.calls[0]).toEqual({ zoom: 'in', cx: undefined, cy: undefined });
    cleanup();
  });

  test('board.zoomIn throw → swallow (không bubble lỗi)', () => {
    const board: JxgBoardZoomable = {
      zoomIn: () => { throw new Error('boom'); },
      zoomOut: () => { /* noop */ },
    };
    const cleanup = attachJxgWheelZoom(target, board);
    expect(() => {
      target.dispatchEvent(wheel({ deltaY: -1, ctrlKey: true }));
    }).not.toThrow();
    cleanup();
  });

  test('cleanup gỡ listener', () => {
    const board = makeBoard();
    const cleanup = attachJxgWheelZoom(target, board);
    cleanup();
    target.dispatchEvent(wheel({ deltaY: -1, ctrlKey: true }));
    expect(board.calls).toEqual([]);
  });

  test('deltaY = 0 → không zoom', () => {
    const board = makeBoard();
    const cleanup = attachJxgWheelZoom(target, board);
    target.dispatchEvent(wheel({ deltaY: 0, ctrlKey: true }));
    expect(board.calls).toEqual([]);
    cleanup();
  });
});
