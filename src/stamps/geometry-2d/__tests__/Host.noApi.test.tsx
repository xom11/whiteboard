import { render, act } from '@testing-library/react';
import React from 'react';
import { GeometryStampHost } from '../host';
import type { GeometryEditorPanelHandle } from '../editor/EditorPanel';

// Bắt onInsert của EditorPanel để lái trực tiếp, giống GeometryStudio.test.tsx.
let capturedOnInsert: ((json: string, svg: string) => void) | null = null;

jest.mock('../editor/EditorPanel', () => {
  const actual = jest.requireActual('../editor/EditorPanel');
  const React = jest.requireActual('react');
  const MockPanel = React.forwardRef<
    GeometryEditorPanelHandle,
    { onInsert: (j: string, s: string) => void }
  >(function MockPanel(props, ref) {
    capturedOnInsert = props.onInsert;
    React.useImperativeHandle(
      ref,
      (): GeometryEditorPanelHandle => ({
        insert: () => true,
        hasContent: () => true,
        selectObject: () => {},
      }),
    );
    return null;
  });
  return { ...actual, GeometryEditorPanel: MockPanel };
});

jest.mock('../../shared/StampLeftPanel', () => ({
  StampLeftPanel: () => null,
}));

describe('GeometryStampHost — api chưa sẵn sàng', () => {
  beforeEach(() => {
    capturedOnInsert = null;
  });

  test('api undefined → onClose KHÔNG được gọi, không insert (panel giữ mở)', async () => {
    const onClose = jest.fn();
    render(
      <GeometryStampHost
        api={undefined}
        editingElement={null}
        onClose={onClose}
        isDark={false}
      />,
    );

    await act(async () => {
      capturedOnInsert!('{}', '<svg/>');
    });

    expect(onClose).not.toHaveBeenCalled();
  });

  test('api sẵn sàng (fake hoạt động) → onClose ĐƯỢC gọi sau insert', async () => {
    const onClose = jest.fn();
    const fakeApi = {
      getSceneElements: () => [],
      addFiles: jest.fn(),
      getAppState: () => ({}),
      updateScene: jest.fn(),
      getFiles: () => ({}),
    };
    render(
      <GeometryStampHost
        api={fakeApi}
        editingElement={null}
        onClose={onClose}
        isDark={false}
      />,
    );

    await act(async () => {
      capturedOnInsert!('{}', '<svg/>');
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
