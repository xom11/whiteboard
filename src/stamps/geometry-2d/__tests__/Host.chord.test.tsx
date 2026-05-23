import { render, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { createRef } from 'react';
import { GeometryStampHost } from '../host';
import type { StampHostHandle } from '../../shared/types';
import type { GeometryEditorPanelHandle } from '../editor/EditorPanel';

// Tier 2 F: host owns `selectedTool` + drives EditorPanel via prop. Theo dõi
// prop được pass xuống mock để verify chord shortcut update host state.
const selectedToolHistory: string[] = [];

jest.mock('../editor/EditorPanel', () => {
  const actual = jest.requireActual('../editor/EditorPanel');
  const React = jest.requireActual('react');
  const MockPanel = React.forwardRef<GeometryEditorPanelHandle, { selectedTool: string }>(
    function MockPanel(props, ref) {
      selectedToolHistory.push(props.selectedTool);
      React.useImperativeHandle(
        ref,
        (): GeometryEditorPanelHandle => ({
          insert: () => false,
          hasContent: () => false,
          selectObject: () => {},
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
    selectedToolHistory.length = 0;
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
    expect(selectedToolHistory).toContain('midpoint');
  });

  test('A → 1 chọn tool "move"', () => {
    mountHost();
    // Tool mặc định là 'move' → chuyển sang midpoint trước để verify chord A→1
    // thật sự đưa về 'move'.
    act(() => {
      fireEvent.keyDown(window, { key: 'b' });
      fireEvent.keyDown(window, { key: '2' });
    });
    const lenAfterMidpoint = selectedToolHistory.length;
    act(() => {
      fireEvent.keyDown(window, { key: 'a' });
      fireEvent.keyDown(window, { key: '1' });
    });
    expect(selectedToolHistory.slice(lenAfterMidpoint)).toContain('move');
  });

  test('J → 5 chọn tool "dilate" (cuối group transform)', () => {
    mountHost();
    act(() => {
      fireEvent.keyDown(window, { key: 'j' });
      fireEvent.keyDown(window, { key: '5' });
    });
    expect(selectedToolHistory).toContain('dilate');
  });

  test('Esc giữa chord không đổi tool', () => {
    mountHost();
    const initialLen = selectedToolHistory.length;
    act(() => {
      fireEvent.keyDown(window, { key: 'b' });
      fireEvent.keyDown(window, { key: 'Escape' });
      fireEvent.keyDown(window, { key: '1' });
    });
    // Chỉ có 'move' (initial) được pass — không có midpoint/move sau Esc.
    const distinct = new Set(selectedToolHistory.slice(initialLen));
    expect(distinct.has('midpoint')).toBe(false);
  });

  test('Number không có chord → ignore', () => {
    mountHost();
    const initialLen = selectedToolHistory.length;
    act(() => {
      fireEvent.keyDown(window, { key: '1' });
    });
    // Không phát sinh tool mới sau key '1' đơn lẻ.
    const after = selectedToolHistory.slice(initialLen);
    expect(after.every((t) => t === 'move')).toBe(true);
  });
});
