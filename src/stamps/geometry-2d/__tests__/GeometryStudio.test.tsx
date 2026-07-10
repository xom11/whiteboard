import { render, act } from '@testing-library/react';
import React, { createRef } from 'react';
import { GeometryStudio } from '../studio/GeometryStudio';
import type { StampHostHandle } from '../../shared/types';
import type { GeometryEditorPanelHandle } from '../editor/EditorPanel';

// Bắt props truyền xuống EditorPanel + cho phép gọi onInsert từ ngoài.
let capturedOnInsert: ((json: string, svg: string) => void) | null = null;
let capturedApi: unknown = 'SENTINEL';

jest.mock('../editor/EditorPanel', () => {
  const actual = jest.requireActual('../editor/EditorPanel');
  const React = jest.requireActual('react');
  const MockPanel = React.forwardRef<
    GeometryEditorPanelHandle,
    { onInsert: (j: string, s: string) => void; api?: unknown }
  >(function MockPanel(props, ref) {
    capturedOnInsert = props.onInsert;
    capturedApi = props.api;
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

describe('GeometryStudio', () => {
  beforeEach(() => {
    capturedOnInsert = null;
    capturedApi = 'SENTINEL';
  });

  test('gọi onCommit đúng (jsonState, svgString) khi editor insert', async () => {
    const onCommit = jest.fn();
    render(<GeometryStudio onCommit={onCommit} onClose={() => {}} />);

    await act(async () => {
      capturedOnInsert!('{"objects":{}}', '<svg/>');
    });

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith('{"objects":{}}', '<svg/>');
  });

  test('gọi onClose sau khi commit xong', async () => {
    const onClose = jest.fn();
    render(<GeometryStudio onCommit={() => {}} onClose={onClose} />);

    await act(async () => {
      capturedOnInsert!('{}', '<svg/>');
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('thiếu api không làm vỡ — vẫn commit được', async () => {
    const onCommit = jest.fn();
    render(<GeometryStudio onCommit={onCommit} onClose={() => {}} />);

    expect(capturedApi).toBeUndefined();
    await act(async () => {
      capturedOnInsert!('{}', '<svg/>');
    });
    expect(onCommit).toHaveBeenCalled();
  });

  test('ref expose tryInsert + hasContent', () => {
    const ref = createRef<StampHostHandle>();
    render(<GeometryStudio ref={ref} onCommit={() => {}} onClose={() => {}} />);
    expect(ref.current!.tryInsert()).toBe(true);
    expect(ref.current!.hasContent()).toBe(true);
  });

  test('onCommit lỗi vẫn đóng panel, không ném ra ngoài', async () => {
    const onClose = jest.fn();
    const onCommit = jest.fn().mockRejectedValue(new Error('boom'));
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    render(<GeometryStudio onCommit={onCommit} onClose={onClose} />);

    await act(async () => {
      capturedOnInsert!('{}', '<svg/>');
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  test('onCommit trả về false (chưa commit) → onClose KHÔNG được gọi, panel giữ mở', async () => {
    const onClose = jest.fn();
    const onCommit = jest.fn().mockResolvedValue(false);
    render(<GeometryStudio onCommit={onCommit} onClose={onClose} />);

    await act(async () => {
      capturedOnInsert!('{}', '<svg/>');
    });

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });
});
