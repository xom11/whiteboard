import { render } from '@testing-library/react';
import { createRef } from 'react';
import { EditorPanel, type EditorPanelHandle } from '../editor/EditorPanel';

jest.mock('../editor/MiniBoard3D', () => ({
  MiniBoard3D: jest.fn(() => null),
}));

describe('Geometry3D EditorPanel', () => {
  it('mount + ref handle', () => {
    const ref = createRef<EditorPanelHandle>();
    render(
      <EditorPanel
        ref={ref}
        isDark={false}
        initial={null}
        onInsert={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(ref.current).toBeTruthy();
    expect(typeof ref.current?.tryInsert).toBe('function');
    expect(typeof ref.current?.hasContent).toBe('function');
  });

  it('hasContent trả false khi chưa có element', () => {
    const ref = createRef<EditorPanelHandle>();
    render(
      <EditorPanel
        ref={ref}
        isDark={false}
        initial={null}
        onInsert={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(ref.current!.hasContent()).toBe(false);
  });

  it('tryInsert trả false khi chưa có element', () => {
    const ref = createRef<EditorPanelHandle>();
    const onInsert = jest.fn();
    render(
      <EditorPanel
        ref={ref}
        isDark={false}
        initial={null}
        onInsert={onInsert}
        onClose={jest.fn()}
      />,
    );
    expect(ref.current!.tryInsert()).toBe(false);
    expect(onInsert).not.toHaveBeenCalled();
  });
});
