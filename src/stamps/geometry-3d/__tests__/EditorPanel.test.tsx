import * as React from 'react';
import { render } from '@testing-library/react';
import { EditorPanel, type EditorPanelHandle } from '../editor/EditorPanel';

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
    expect(board.version).toBe(1);
    expect(Array.isArray(board.elements)).toBe(true);
    expect(Array.isArray(board.bbox)).toBe(true);
    expect(typeof board.view.azimuth).toBe('number');
    expect(typeof board.view.elevation).toBe('number');
  });
});
