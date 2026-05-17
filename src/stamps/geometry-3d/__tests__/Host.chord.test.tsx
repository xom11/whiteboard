import { render, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { createRef } from 'react';
import { Geometry3DStampHost } from '../index';
import type { StampHostHandle } from '../../shared/types';
import type { MiniBoard3DHandle } from '../editor/MiniBoard3D';

const mockSetTool3D = jest.fn();

jest.mock('../editor/EditorPanel', () => {
  const React = jest.requireActual('react');
  const MockEditor = React.forwardRef<unknown, {
    onBoardReady?: (h: MiniBoard3DHandle | null) => void;
  }>(function MockEditor(props, ref) {
    React.useImperativeHandle(ref, () => ({
      tryInsert: () => false,
      hasContent: () => false,
    }));
    React.useEffect(() => {
      const handle: Partial<MiniBoard3DHandle> = {
        setTool: mockSetTool3D,
        subscribe: () => () => {},
        getTool: () => 'move',
        getShowAxes: () => true,
        getShowMesh: () => false,
        canUndo: () => false,
      };
      props.onBoardReady?.(handle as MiniBoard3DHandle);
    }, []);
    return null;
  });
  return { EditorPanel: MockEditor };
});

jest.mock('../editor/LeftPanel', () => ({
  LeftPanel: () => null,
}));

describe('Geometry3DStampHost — chord shortcuts', () => {
  beforeEach(() => {
    mockSetTool3D.mockClear();
  });

  function mountHost() {
    const ref = createRef<StampHostHandle>();
    const minimalApi = {
      getSceneElements: () => [],
      addFiles: jest.fn(),
      getAppState: () => ({}),
      updateScene: jest.fn(),
      getFiles: () => ({}),
    };
    return render(
      <Geometry3DStampHost
        ref={ref}
        api={minimalApi as never}
        editingElement={null}
        onClose={jest.fn()}
        isDark={false}
      />,
    );
  }

  test('A → 1 chọn tool "move"', () => {
    mountHost();
    act(() => {
      fireEvent.keyDown(window, { key: 'a' });
      fireEvent.keyDown(window, { key: '1' });
    });
    expect(mockSetTool3D).toHaveBeenCalledWith('move');
  });

  test('B → 1 chọn tool "point" (group primitive đầu tiên)', () => {
    mountHost();
    act(() => {
      fireEvent.keyDown(window, { key: 'b' });
      fireEvent.keyDown(window, { key: '1' });
    });
    expect(mockSetTool3D).toHaveBeenCalledWith('point');
  });

  test('C → 1 chọn tool "tetrahedron" (group solid)', () => {
    mountHost();
    act(() => {
      fireEvent.keyDown(window, { key: 'c' });
      fireEvent.keyDown(window, { key: '1' });
    });
    expect(mockSetTool3D).toHaveBeenCalledWith('tetrahedron');
  });

  test('Esc giữa chord không gọi setTool', () => {
    mountHost();
    act(() => {
      fireEvent.keyDown(window, { key: 'b' });
      fireEvent.keyDown(window, { key: 'Escape' });
      fireEvent.keyDown(window, { key: '1' });
    });
    expect(mockSetTool3D).not.toHaveBeenCalled();
  });
});
