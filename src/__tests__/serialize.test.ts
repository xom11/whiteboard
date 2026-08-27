import { pickSyncableAppState } from '../serialize';

describe('pickSyncableAppState', () => {
  test('keeps viewBackgroundColor, zoom, scroll, gridSize, theme', () => {
    const input = {
      viewBackgroundColor: '#ffffff',
      zoom: { value: 1.5 },
      scrollX: 100,
      scrollY: 200,
      gridSize: 20,
      theme: 'light',
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
    });
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
