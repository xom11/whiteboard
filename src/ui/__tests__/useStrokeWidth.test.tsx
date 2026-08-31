import { renderHook, act } from '@testing-library/react';

jest.mock('@excalidraw/excalidraw', () => ({
  // Bản thật bump version/versionNonce/updated để Excalidraw nhận ra element đã
  // đổi. Mock giữ đúng HÌNH DẠNG đó (đối tượng MỚI + version tăng) vì chính hai
  // điều này là hợp đồng mà updateScene dựa vào.
  newElementWith: (el: Record<string, unknown>, updates: Record<string, unknown>) => ({
    ...el,
    ...updates,
    version: ((el.version as number) ?? 0) + 1,
  }),
  CaptureUpdateAction: { IMMEDIATELY: 'IMMEDIATELY', NEVER: 'NEVER' },
}));

import { useStrokeWidth } from '../useStrokeWidth';
import { DEFAULT_STROKE_WIDTH } from '../strokeWidth';

type El = { id: string; strokeWidth?: number; version?: number; isDeleted?: boolean };

function makeApi(elements: El[], selectedElementIds: Record<string, boolean> = {}) {
  const updateScene = jest.fn();
  return {
    updateScene,
    getSceneElements: () => elements,
    getAppState: () => ({ selectedElementIds, currentItemStrokeWidth: 2 }),
  } as never as Parameters<typeof useStrokeWidth>[0] & { updateScene: jest.Mock };
}

describe('useStrokeWidth', () => {
  it('giá trị khởi tạo là mặc định của Excalidraw', () => {
    const { result } = renderHook(() => useStrokeWidth(makeApi([])));
    expect(result.current.value).toBe(DEFAULT_STROKE_WIDTH);
  });

  it('sync đọc nét của element đang chọn', () => {
    const { result } = renderHook(() => useStrokeWidth(makeApi([])));
    act(() => {
      result.current.sync([{ id: 'a', strokeWidth: 4 }], {
        selectedElementIds: { a: true },
        currentItemStrokeWidth: 2,
      });
    });
    expect(result.current.value).toBe(4);
  });

  it('apply ghi currentItemStrokeWidth khi KHÔNG chọn gì, và không đụng elements', () => {
    const api = makeApi([{ id: 'a', strokeWidth: 2 }]);
    const { result } = renderHook(() => useStrokeWidth(api));

    act(() => result.current.apply(0.5));

    expect(api.updateScene).toHaveBeenCalledTimes(1);
    const arg = api.updateScene.mock.calls[0][0];
    expect(arg.appState).toEqual({ currentItemStrokeWidth: 0.5 });
    // Không có element nào đổi → đừng đẩy mảng elements vào scene cho tốn công.
    expect(arg.elements).toBeUndefined();
    expect(result.current.value).toBe(0.5);
  });

  it('apply đổi nét CHỈ những element đang chọn', () => {
    const api = makeApi(
      [
        { id: 'a', strokeWidth: 2, version: 7 },
        { id: 'b', strokeWidth: 2, version: 7 },
      ],
      { a: true },
    );
    const { result } = renderHook(() => useStrokeWidth(api));

    act(() => result.current.apply(0.25));

    const els = api.updateScene.mock.calls[0][0].elements as El[];
    expect(els.map((e) => e.strokeWidth)).toEqual([0.25, 2]);
    // Element không chọn phải giữ NGUYÊN THAM CHIẾU — tạo đối tượng mới cho nó
    // là bảo Excalidraw "b cũng đổi", làm bẩn undo và ép vẽ lại thừa.
    expect(els[1]).toBe(api.getSceneElements()[1]);
    expect(els[0].version).toBe(8);
  });

  it('apply hút nấc trước khi ghi — không để 0.4 lọt vào scene', () => {
    const api = makeApi([{ id: 'a', strokeWidth: 2 }], { a: true });
    const { result } = renderHook(() => useStrokeWidth(api));

    act(() => result.current.apply(0.4));

    expect(api.updateScene.mock.calls[0][0].appState.currentItemStrokeWidth).toBe(0.5);
    expect(result.current.value).toBe(0.5);
  });

  it('bỏ qua element đang chọn nhưng không có nét (ảnh)', () => {
    const api = makeApi([{ id: 'a' }], { a: true });
    const { result } = renderHook(() => useStrokeWidth(api));

    act(() => result.current.apply(1));

    expect(api.updateScene.mock.calls[0][0].elements).toBeUndefined();
  });

  it('dùng captureUpdate IMMEDIATELY để undo/redo bắt được thao tác', () => {
    const api = makeApi([{ id: 'a', strokeWidth: 2 }], { a: true });
    const { result } = renderHook(() => useStrokeWidth(api));

    act(() => result.current.apply(1));

    expect(api.updateScene.mock.calls[0][0].captureUpdate).toBe('IMMEDIATELY');
  });

  it('api chưa sẵn sàng → apply không ném, vẫn nhớ giá trị GV chọn', () => {
    const { result } = renderHook(() => useStrokeWidth(null));
    act(() => result.current.apply(0.75));
    expect(result.current.value).toBe(0.75);
  });
});
