import * as React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { EditorPanel, type EditorPanelHandle } from '../editor/EditorPanel';
import { Scene3D } from '../editor/scene/Scene3D';

jest.mock('../editor/MiniBoard3D', () => ({
  MiniBoard3D: React.forwardRef<unknown, { isDark: boolean }>(function MockBoard(_, ref) {
    React.useImperativeHandle(ref, () => ({
      getBoard: () => null,
      getView3D: () => null,
      getSvgElement: () => null,
    }));
    return <div data-testid="mini-board-3d-mock" />;
  }),
}));

afterEach(() => {
  cleanup();
});

describe('EditorPanel (new Scene3D-based)', () => {
  test('renders without crashing', () => {
    const { getByTestId } = render(<EditorPanel isDark={false} />);
    expect(getByTestId('editor-panel-3d')).toBeInTheDocument();
  });

  test('exposes hasContent imperative handle', () => {
    const ref = React.createRef<EditorPanelHandle>();
    render(<EditorPanel ref={ref} isDark={false} />);
    expect(ref.current?.hasContent()).toBe(false);
  });

  test('serialize returns SerializedBoard3D shape', () => {
    const ref = React.createRef<EditorPanelHandle>();
    render(<EditorPanel ref={ref} isDark={false} />);
    const board = ref.current!.serialize();
    expect([1, 2]).toContain(board.version);
    expect(Array.isArray(board.elements)).toBe(true);
    expect(Array.isArray(board.bbox)).toBe(true);
    expect(typeof board.view.azimuth).toBe('number');
    expect(typeof board.view.elevation).toBe('number');
  });
});

describe('EditorPanel — keyboard shortcuts', () => {
  it('Ctrl+Z gọi scene.undo()', () => {
    const undoPrototypeSpy = jest.spyOn(Scene3D.prototype, 'undo');
    render(<EditorPanel isDark={false} />);
    undoPrototypeSpy.mockClear();
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(undoPrototypeSpy).toHaveBeenCalledTimes(1);
    undoPrototypeSpy.mockRestore();
  });

  it('Ctrl+Shift+Z gọi scene.redo()', () => {
    const redoPrototypeSpy = jest.spyOn(Scene3D.prototype, 'redo');
    render(<EditorPanel isDark={false} />);
    redoPrototypeSpy.mockClear();
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true });
    expect(redoPrototypeSpy).toHaveBeenCalledTimes(1);
    redoPrototypeSpy.mockRestore();
  });

  it('Ctrl+Y gọi scene.redo()', () => {
    const redoPrototypeSpy = jest.spyOn(Scene3D.prototype, 'redo');
    render(<EditorPanel isDark={false} />);
    redoPrototypeSpy.mockClear();
    fireEvent.keyDown(window, { key: 'y', ctrlKey: true });
    expect(redoPrototypeSpy).toHaveBeenCalledTimes(1);
    redoPrototypeSpy.mockRestore();
  });

  it('Ctrl+Z trong INPUT bị skip', () => {
    render(
      <>
        <input data-testid="text-input" />
        <EditorPanel isDark={false} />
      </>,
    );
    const undoPrototypeSpy = jest.spyOn(Scene3D.prototype, 'undo');
    const input = screen.getByTestId('text-input');
    input.focus();
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(undoPrototypeSpy).not.toHaveBeenCalled();
    undoPrototypeSpy.mockRestore();
  });
});
