import { initJxgBoard } from '../initJxgBoard';

type MockJXG = {
  Options: Record<string, unknown>;
  JSXGraph: {
    initBoard: jest.Mock;
    freeBoard: jest.Mock;
  };
};

const mockBoard = { id: 'mock-board' };

let mockJXG: MockJXG;

jest.mock('jsxgraph', () => ({
  __esModule: true,
  get default() { return mockJXG; },
}));

beforeEach(() => {
  mockJXG = {
    Options: {},
    JSXGraph: {
      initBoard: jest.fn(() => mockBoard),
      freeBoard: jest.fn(),
    },
  };
});

describe('initJxgBoard', () => {
  test('mặc định apply text/label/disableEngines, KHÔNG disable element highlight', async () => {
    const { board, cleanup } = await initJxgBoard('container', {
      boardOptions: { boundingbox: [-5, 5, 5, -5] },
    });
    expect(board).toBe(mockBoard);
    const opts = mockJXG.Options as {
      text?: Record<string, unknown>;
      label?: Record<string, unknown>;
      elements?: Record<string, unknown>;
    };
    expect(opts.text?.display).toBe('internal');
    expect(opts.text?.useKatex).toBe(false);
    expect(opts.text?.useMathJax).toBe(false);
    expect(opts.text?.useASCIIMathML).toBe(false);
    expect(opts.label?.display).toBe('internal');
    expect(opts.elements).toBeUndefined();
    cleanup();
    expect(mockJXG.JSXGraph.freeBoard).toHaveBeenCalledWith(mockBoard);
  });

  test('disableElementHighlight opt-in', async () => {
    await initJxgBoard('container', {
      defaults: { disableElementHighlight: true },
      boardOptions: {},
    });
    const opts = mockJXG.Options as { elements?: Record<string, unknown> };
    expect(opts.elements?.highlight).toBe(false);
  });

  test('disable text engine toggle off → không set useKatex flags', async () => {
    await initJxgBoard('container', {
      defaults: { disableTextEngines: false },
      boardOptions: {},
    });
    const opts = mockJXG.Options as { text?: Record<string, unknown> };
    expect(opts.text?.display).toBe('internal');
    expect(opts.text?.useKatex).toBeUndefined();
  });

  test('extraOptionTweaks chạy sau defaults', async () => {
    const tweakSpy = jest.fn((opts: { text?: Record<string, unknown> }) => {
      if (opts.text) opts.text.strokeColor = '#ff0000';
    });
    await initJxgBoard('container', {
      boardOptions: {},
      extraOptionTweaks: tweakSpy,
    });
    expect(tweakSpy).toHaveBeenCalledTimes(1);
    const opts = mockJXG.Options as { text?: Record<string, unknown> };
    expect(opts.text?.strokeColor).toBe('#ff0000');
    expect(opts.text?.display).toBe('internal');
  });

  test('initBoard được gọi với target + boardOptions', async () => {
    const div = document.createElement('div');
    await initJxgBoard(div, {
      boardOptions: { boundingbox: [-10, 10, 10, -10], axis: true },
    });
    expect(mockJXG.JSXGraph.initBoard).toHaveBeenCalledWith(
      div,
      { boundingbox: [-10, 10, 10, -10], axis: true },
    );
  });

  test('cleanup swallow lỗi từ freeBoard', async () => {
    mockJXG.JSXGraph.freeBoard.mockImplementation(() => { throw new Error('boom'); });
    const { cleanup } = await initJxgBoard('container', { boardOptions: {} });
    expect(() => cleanup()).not.toThrow();
  });

  test('apply options swallow lỗi (Options null trong mock)', async () => {
    mockJXG.Options = null as unknown as Record<string, unknown>;
    await expect(initJxgBoard('container', { boardOptions: {} })).resolves.toBeDefined();
  });

  test('label tag truyền vào safeJsx (smoke — không crash)', async () => {
    const { cleanup } = await initJxgBoard('c', {
      label: 'MiniBoard.custom',
      boardOptions: {},
    });
    cleanup();
    expect(mockJXG.JSXGraph.freeBoard).toHaveBeenCalled();
  });
});
