import { pickSyncableAppState } from '../serialize';

describe('pickSyncableAppState', () => {
  test('keeps viewBackgroundColor, zoom, scroll, gridSize, theme, strokeWidth', () => {
    const input = {
      viewBackgroundColor: '#ffffff',
      zoom: { value: 1.5 },
      scrollX: 100,
      scrollY: 200,
      gridSize: 20,
      theme: 'light',
      currentItemStrokeWidth: 0.5,
      // volatile fields below — must be stripped
      draggingElement: { id: 'x' },
      selectedElementIds: { a: true },
      cursorButton: 'down',
      isLoading: true,
      errorMessage: 'oops',
    } as unknown as Parameters<typeof pickSyncableAppState>[0];
    const out = pickSyncableAppState(input);
    expect(out).toEqual({
      viewBackgroundColor: '#ffffff',
      zoom: { value: 1.5 },
      scrollX: 100,
      scrollY: 200,
      gridSize: 20,
      theme: 'light',
      currentItemStrokeWidth: 0.5,
    });
  });

  test('nhớ độ dày nét qua lần tải lại — nếu không GV chọn nét mảnh xong F5 là mất', () => {
    const out = pickSyncableAppState({
      viewBackgroundColor: '#fff',
      zoom: { value: 1 },
      scrollX: 0,
      scrollY: 0,
      gridSize: null,
      theme: 'light',
      currentItemStrokeWidth: 0.25,
    } as unknown as Parameters<typeof pickSyncableAppState>[0]);
    expect(out.currentItemStrokeWidth).toBe(0.25);
  });

  test('scene lưu từ bản cũ không có độ dày nét → mặc định Excalidraw', () => {
    const out = pickSyncableAppState({
      viewBackgroundColor: '#fff',
      zoom: { value: 1 },
      scrollX: 0,
      scrollY: 0,
      gridSize: null,
      theme: 'light',
    } as unknown as Parameters<typeof pickSyncableAppState>[0]);
    expect(out.currentItemStrokeWidth).toBe(2);
  });

  test('giá trị nét lạ bị kẹp về trong dải trước khi lưu', () => {
    const out = pickSyncableAppState({
      viewBackgroundColor: '#fff',
      zoom: { value: 1 },
      scrollX: 0,
      scrollY: 0,
      gridSize: null,
      theme: 'light',
      currentItemStrokeWidth: 99,
    } as unknown as Parameters<typeof pickSyncableAppState>[0]);
    expect(out.currentItemStrokeWidth).toBe(4);
  });

  test('nền trong suốt của lớp giấy kẻ dòng không rò vào scene đã lưu', () => {
    // PaperBackground đặt 'transparent' để nhìn xuyên canvas. Lưu nguyên
    // giá trị đó thì máy khác mở bảng ra sẽ thấy nền lộ trang web dưới.
    const out = pickSyncableAppState({
      viewBackgroundColor: 'transparent',
      zoom: { value: 1 },
      scrollX: 0,
      scrollY: 0,
      gridSize: null,
      theme: 'light',
    } as unknown as Parameters<typeof pickSyncableAppState>[0]);
    expect(out.viewBackgroundColor).toBe('#ffffff');
  });

  test('màu nền do người dùng chọn vẫn giữ nguyên', () => {
    const out = pickSyncableAppState({
      viewBackgroundColor: '#fff5c2',
      zoom: { value: 1 },
      scrollX: 0,
      scrollY: 0,
      gridSize: null,
      theme: 'light',
    } as unknown as Parameters<typeof pickSyncableAppState>[0]);
    expect(out.viewBackgroundColor).toBe('#fff5c2');
  });

  test('handles missing gridSize as null', () => {
    const out = pickSyncableAppState({
      viewBackgroundColor: '#fff',
      zoom: { value: 1 },
      scrollX: 0,
      scrollY: 0,
      gridSize: null,
      theme: 'light',
    } as unknown as Parameters<typeof pickSyncableAppState>[0]);
    expect(out.gridSize).toBeNull();
  });
});
