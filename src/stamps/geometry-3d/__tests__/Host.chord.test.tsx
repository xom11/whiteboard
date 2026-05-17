// TODO(Phase 8.2): chord-shortcut wiring was removed from Geometry3DStampHost
// during the Phase 6 EditorPanel rewrite (Scene3D + ToolController flow takes
// over tool selection via LeftPanel). Re-enable + adapt these tests once the
// new chord shortcut bridges into ToolController.selectTool(...).

import { render, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { createRef } from 'react';
import { Geometry3DStampHost } from '../host';
import type { StampHostHandle } from '../../shared/types';

const mockSetTool3D = jest.fn();

jest.mock('../editor/EditorPanel', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  const MockEditor = ReactActual.forwardRef<unknown, Record<string, unknown>>(
    function MockEditor(_props, ref) {
      ReactActual.useImperativeHandle(ref, () => ({
        hasContent: () => false,
        serialize: () => ({
          version: 1,
          bbox: [-6, -6, 6, 6],
          view: { azimuth: 0, elevation: 0, bbox3D: [-5, -5, -5, 5, 5, 5] },
          showAxes: true,
          showMesh: true,
          elements: [],
        }),
      }));
      return null;
    },
  );
  return { EditorPanel: MockEditor };
});

describe.skip('Geometry3DStampHost — chord shortcuts (legacy)', () => {
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

  test('B → 1 chọn tool "point"', () => {
    mountHost();
    act(() => {
      fireEvent.keyDown(window, { key: 'b' });
      fireEvent.keyDown(window, { key: '1' });
    });
    expect(mockSetTool3D).toHaveBeenCalledWith('point');
  });

  test('C → 1 chọn tool "tetrahedron"', () => {
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
