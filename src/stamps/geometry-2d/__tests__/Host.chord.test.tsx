import { render, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { createRef } from 'react';
import { GeometryStampHost } from '../host';
import type { StampHostHandle } from '../../shared/types';
import type { GeometryEditorPanelHandle } from '../editor/EditorPanel';

// Spy mounted by mocked GeometryEditorPanel — populated qua forwardRef.
const mockSetTool = jest.fn();

jest.mock('../editor/EditorPanel', () => {
  const actual = jest.requireActual('../editor/EditorPanel');
  const React = jest.requireActual('react');
  const MockPanel = React.forwardRef<GeometryEditorPanelHandle, unknown>(
    function MockPanel(_props, ref) {
      React.useImperativeHandle(
        ref,
        (): GeometryEditorPanelHandle => ({
          setTool: mockSetTool,
          setShowAxis: jest.fn(),
          setShowGrid: jest.fn(),
          undo: jest.fn(),
          insert: () => false,
          hasContent: () => false,
        }),
      );
      return null;
    },
  );
  return { ...actual, GeometryEditorPanel: MockPanel };
});

jest.mock('../../shared/StampLeftPanel', () => ({
  StampLeftPanel: () => null,
}));

describe('GeometryStampHost — chord shortcuts', () => {
  beforeEach(() => {
    mockSetTool.mockClear();
  });

  function mountHost() {
    const ref = createRef<StampHostHandle>();
    const Host = GeometryStampHost;
    const minimalApi = {
      getSceneElements: () => [],
      addFiles: jest.fn(),
      getAppState: () => ({}),
      updateScene: jest.fn(),
      getFiles: () => ({}),
    };
    return render(
      <Host
        ref={ref}
        api={minimalApi as never}
        editingElement={null}
        onClose={jest.fn()}
        isDark={false}
      />,
    );
  }

  test('B → 2 chọn tool "midpoint"', () => {
    mountHost();
    act(() => {
      fireEvent.keyDown(window, { key: 'b' });
      fireEvent.keyDown(window, { key: '2' });
    });
    expect(mockSetTool).toHaveBeenCalledWith('midpoint');
  });

  test('A → 1 chọn tool "move"', () => {
    mountHost();
    act(() => {
      fireEvent.keyDown(window, { key: 'a' });
      fireEvent.keyDown(window, { key: '1' });
    });
    expect(mockSetTool).toHaveBeenCalledWith('move');
  });

  test('I → 5 chọn tool "dilate" (cuối group transform)', () => {
    mountHost();
    act(() => {
      fireEvent.keyDown(window, { key: 'i' });
      fireEvent.keyDown(window, { key: '5' });
    });
    expect(mockSetTool).toHaveBeenCalledWith('dilate');
  });

  test('Esc giữa chord không gọi setTool', () => {
    mountHost();
    act(() => {
      fireEvent.keyDown(window, { key: 'b' });
      fireEvent.keyDown(window, { key: 'Escape' });
      fireEvent.keyDown(window, { key: '1' });
    });
    expect(mockSetTool).not.toHaveBeenCalled();
  });

  test('Number không có chord → ignore', () => {
    mountHost();
    act(() => {
      fireEvent.keyDown(window, { key: '1' });
    });
    expect(mockSetTool).not.toHaveBeenCalled();
  });
});
