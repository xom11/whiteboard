import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { GeometryEditorPanel } from '../GeometryEditorPanel';

jest.mock('../JSXGraphMiniBoard', () => ({
  __esModule: true,
  TOOLS: [],
  GROUP_LABELS: {},
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  JSXGraphMiniBoard: ({ onReady }: { onReady: (h: any) => void }) => {
    React.useEffect(() => {
      setTimeout(() => onReady({
        getContainer: () => {
          const d = document.createElement('div');
          d.innerHTML = '<svg width="100" height="100"><circle/></svg>';
          return d;
        },
        getCreationLog: () => [{ type: 'point', args: [1, 2], attrs: { name: 'A' }, id: 'j0' }],
        getBbox: () => [-10, 10, 10, -10],
        getShowAxis: () => false,
        getShowGrid: () => false,
        getTool: () => 'move',
        setTool: () => {},
        setShowAxis: () => {},
        setShowGrid: () => {},
        undo: () => {},
        canUndo: () => true,
        subscribe: () => () => {},
        onSelect: () => () => {},
        onTransformParam: () => () => {},
        confirmTransformParam: () => {},
        cancelTransformParam: () => {},
        mutateObject: () => {},
        snapshotObject: () => null,
      }), 0);
    }, []);
    return <div data-testid="mock-jxg" />;
  },
}));

jest.mock('../serializeBoard', () => ({
  serializeBoard: jest.fn((_b, log) => ({ bbox: [-10, 10, 10, -10], elements: log })),
  deserializeIntoBoard: jest.fn(),
}));

jest.mock('../renderGeometryToSvg', () => ({
  renderGeometryToSvg: jest.fn(() => '<svg>fake</svg>'),
}));

jest.mock('../renderGeometryFromState', () => ({
  renderGeometrySvgFromState: jest.fn(async () => '<svg>fake</svg>'),
}));

describe('GeometryEditorPanel', () => {
  test('renders panel header + Insert/Cancel buttons', () => {
    render(<GeometryEditorPanel initialState={null} onInsert={() => {}} onClose={() => {}} />);
    expect(screen.getByText(/dựng hình học/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chèn' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Huỷ' })).toBeInTheDocument();
  });

  test('Insert calls onInsert with (jsonState, svgString)', async () => {
    const onInsert = jest.fn();
    render(<GeometryEditorPanel initialState={null} onInsert={onInsert} onClose={() => {}} />);
    await act(async () => { await new Promise(r => setTimeout(r, 20)); });
    fireEvent.click(screen.getByRole('button', { name: 'Chèn' }));
    // performInsert tạo SVG async (qua renderGeometrySvgFromState).
    await act(async () => { await new Promise(r => setTimeout(r, 20)); });
    expect(onInsert).toHaveBeenCalledWith(
      expect.stringContaining('"bbox"'),
      '<svg>fake</svg>',
    );
  });

  test('Cancel calls onClose', () => {
    const onClose = jest.fn();
    render(<GeometryEditorPanel initialState={null} onInsert={() => {}} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Huỷ' }));
    expect(onClose).toHaveBeenCalled();
  });
});
