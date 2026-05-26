import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { GeometryEditorPanel, type GeometryEditorPanelHandle } from '../editor/EditorPanel';
import { createStore, createEmptyState } from '../../../core/scene';

const makeStore = () => createStore(createEmptyState('2d'));
const mockClearSelection = jest.fn();

// Mock state có 1 point để hasContent() = true (object count > 0).
const mockState = (() => {
  const s = createEmptyState('2d');
  return {
    ...s,
    objects: {
      p1: {
        id: 'p1',
        kind: 'point',
        label: 'A',
        visible: true,
        locked: false,
        layer: 'default',
        schemaVersion: 1,
        attrs: { x: 1, y: 2, color: '#0f172a' },
      },
    },
    order: ['p1'],
    counter: 1,
  };
})();

jest.mock('../editor/MiniBoard', () => {
   
  const mockHandle: any = {
    getContainer: () => {
      const d = document.createElement('div');
      d.innerHTML = '<svg width="100" height="100"><circle/></svg>';
      return d;
    },
    getState: () => mockState,
    getStore: () => ({ getState: () => mockState, subscribe: () => () => {}, dispatch: () => {} }),
    highlight: () => {},
    getBbox: () => [-10, 10, 10, -10],
    onSelect: () => () => {},
    onTransformParam: () => () => {},
    onSelectionState: () => () => {},
    confirmTransformParam: () => {},
    cancelTransformParam: () => {},
    mutateObject: () => {},
    snapshotObject: () => null,
    getAllPointNames: () => [],
    getSelectionSize: () => 0,
    clearSelection: () => mockClearSelection(),
    deleteSelection: () => {},
  };
  return {
    __esModule: true,
    TOOLS: [],
    GROUP_LABELS: {},
     
    MiniBoard2D: React.forwardRef<any, { onReady?: () => void }>(function MiniBoard2DMock({ onReady }, ref) {
      React.useImperativeHandle(ref, () => mockHandle, []);
      React.useEffect(() => {
        const t = setTimeout(() => onReady?.(), 0);
        return () => clearTimeout(t);
      }, [onReady]);
      return <div data-testid="mock-jxg" />;
    }),
  };
});

jest.mock('../renderInline', () => ({
  renderGeometryToSvg: jest.fn(() => '<svg>fake</svg>'),
}));

jest.mock('../render', () => ({
  renderGeometrySvgFromState: jest.fn(async () => '<svg>fake</svg>'),
}));

describe('GeometryEditorPanel', () => {
  beforeEach(() => {
    mockClearSelection.mockClear();
  });

  test('renders panel header + Insert/Cancel buttons', () => {
    render(<GeometryEditorPanel store={makeStore()} onInsert={() => {}} onClose={() => {}} />);
    expect(screen.getByText(/dựng hình học/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chèn' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Huỷ' })).toBeInTheDocument();
  });

  test('Insert calls onInsert với (jsonState, svgString) — jsonState format v2', async () => {
    const onInsert = jest.fn();
    const ref = React.createRef<GeometryEditorPanelHandle>();
    render(
      <GeometryEditorPanel
        ref={ref}
        store={makeStore()}
        onInsert={onInsert}
        onClose={jest.fn()}
        selectedTool="move"
        showAxis={false}
        showGrid={false}
      />,
    );
    // Wait for MiniBoard onReady → handleRef populated.
    await act(async () => { await new Promise(r => setTimeout(r, 20)); });
    // Trigger insert; renderGeometrySvgFromState là async mock → await tiếp.
    await act(async () => { ref.current?.insert(); });
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });
    expect(onInsert).toHaveBeenCalledTimes(1);
    const [jsonState, svg] = onInsert.mock.calls[0];
    const parsed = JSON.parse(jsonState);
    expect(parsed.meta.domain).toBe('2d');
    expect(parsed.meta.view).toBeDefined();
    expect(typeof svg).toBe('string');
  });

  test('Cancel calls onClose', () => {
    const onClose = jest.fn();
    render(<GeometryEditorPanel store={makeStore()} onInsert={() => {}} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Huỷ' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('mobile header có undo/redo buttons', () => {
    const onUndo = jest.fn();
    const onRedo = jest.fn();
    render(
      <GeometryEditorPanel
        store={makeStore()}
        onInsert={() => {}}
        onClose={() => {}}
        isMobile
        canUndo
        canRedo
        onUndo={onUndo}
        onRedo={onRedo}
      />,
    );
    const u = screen.getByTestId('undo-btn-mobile');
    const r = screen.getByTestId('redo-btn-mobile');
    expect(u).not.toBeDisabled();
    expect(r).not.toBeDisabled();
    fireEvent.click(u);
    fireEvent.click(r);
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onRedo).toHaveBeenCalledTimes(1);
  });

  it('mobile header undo/redo disabled khi canUndo/canRedo=false', () => {
    render(
      <GeometryEditorPanel
        store={makeStore()}
        onInsert={() => {}}
        onClose={() => {}}
        isMobile
        canUndo={false}
        canRedo={false}
      />,
    );
    expect(screen.getByTestId('undo-btn-mobile')).toBeDisabled();
    expect(screen.getByTestId('redo-btn-mobile')).toBeDisabled();
  });

  it('khong hien AI prompt khi consumer chua cau hinh generator', () => {
    render(<GeometryEditorPanel store={makeStore()} onInsert={() => {}} onClose={() => {}} />);
    expect(screen.queryByLabelText('Đề bài cho AI')).not.toBeInTheDocument();
  });

  it('AI prompt nap state sinh ra va giu view dang mo', async () => {
    const store = makeStore();
    const metaBefore = store.getState().meta;
    const aiState = {
      ...mockState,
      meta: {
        domain: '2d' as const,
        version: 1,
        view: { bbox: [-2, 2, 2, -2] as const, showAxis: true, showGrid: true },
      },
    };
    const generateGeometryFigure = jest.fn(async () => ({ ok: true as const, state: aiState }));
    render(
      <GeometryEditorPanel
        store={store}
        onInsert={() => {}}
        onClose={() => {}}
        generateGeometryFigure={generateGeometryFigure}
      />,
    );

    fireEvent.change(screen.getByLabelText('Đề bài cho AI'), {
      target: { value: '  Cho tam giác ABC  ' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Dựng bằng AI' }));
      await Promise.resolve();
    });

    expect(generateGeometryFigure).toHaveBeenCalledWith(
      'Cho tam giác ABC',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(store.getState().objects).toEqual(aiState.objects);
    expect(store.getState().meta).toEqual(metaBefore);
    expect(mockClearSelection).toHaveBeenCalledTimes(1);
  });

  it('AI prompt hien loading va loi tra ve tu generator', async () => {
    let resolve: ((value: { ok: false; message: string }) => void) | undefined;
    const generateGeometryFigure = jest.fn(
      () => new Promise<{ ok: false; message: string }>((done) => { resolve = done; }),
    );
    render(
      <GeometryEditorPanel
        store={makeStore()}
        onInsert={() => {}}
        onClose={() => {}}
        generateGeometryFigure={generateGeometryFigure}
      />,
    );

    fireEvent.change(screen.getByLabelText('Đề bài cho AI'), {
      target: { value: 'Vẽ hình ngoài phạm vi' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Dựng bằng AI' }));
    expect(screen.getByRole('button', { name: 'Đang dựng...' })).toBeDisabled();

    await act(async () => {
      resolve?.({ ok: false, message: 'Không dựng được hình này.' });
      await Promise.resolve();
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Không dựng được hình này.');
  });
});
