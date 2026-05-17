import * as React from 'react';
import { render } from '@testing-library/react';
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

function renderEditor(extra: Partial<React.ComponentProps<typeof EditorPanel>> = {}) {
  const scene = new Scene3D();
  return render(
    <EditorPanel
      isDark={false}
      scene={scene}
      selectedTool="move"
      onSelectedToolChange={() => undefined}
      showAxis
      showGrid
      {...extra}
    />,
  );
}

describe('EditorPanel (new Scene3D-based)', () => {
  test('renders without crashing', () => {
    const { getByTestId } = renderEditor();
    expect(getByTestId('editor-panel-3d')).toBeInTheDocument();
  });

  test('exposes hasContent imperative handle', () => {
    const ref = React.createRef<EditorPanelHandle>();
    renderEditor({ ref });
    expect(ref.current?.hasContent()).toBe(false);
  });

  test('serialize returns SerializedBoard3D shape', () => {
    const ref = React.createRef<EditorPanelHandle>();
    renderEditor({ ref });
    const board = ref.current!.serialize();
    expect([1, 2]).toContain(board.version);
    expect(Array.isArray(board.elements)).toBe(true);
    expect(Array.isArray(board.bbox)).toBe(true);
    expect(typeof board.view.azimuth).toBe('number');
    expect(typeof board.view.elevation).toBe('number');
  });
});
