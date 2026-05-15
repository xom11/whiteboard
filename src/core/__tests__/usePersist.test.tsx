import { renderHook } from '@testing-library/react';
import { usePersist, writePersisted, type PersistedSnapshot } from '../usePersist';

const KEY = 'test-persist-key';

beforeEach(() => {
  window.sessionStorage.clear();
});

describe('usePersist', () => {
  it('return null persistedInitial khi không có key', () => {
    const { result } = renderHook(() =>
      usePersist(undefined, null, () => {}),
    );
    expect(result.current.persistedInitial).toBeNull();
  });

  it('return null khi key có nhưng storage trống', () => {
    const { result } = renderHook(() => usePersist(KEY, null, () => {}));
    expect(result.current.persistedInitial).toBeNull();
  });

  it('đọc snapshot đã lưu khi mount', () => {
    const snap: PersistedSnapshot = {
      elements: [{ id: 'a' } as never],
      appState: { theme: 'light' as never } as never,
    };
    writePersisted(KEY, snap);

    const { result } = renderHook(() => usePersist(KEY, null, () => {}));
    expect(result.current.persistedInitial?.elements).toHaveLength(1);
  });

  it('bỏ qua snapshot lỗi format (elements không phải array)', () => {
    window.sessionStorage.setItem(KEY, JSON.stringify({ elements: 'oops' }));
    const { result } = renderHook(() => usePersist(KEY, null, () => {}));
    expect(result.current.persistedInitial).toBeNull();
  });

  it('addFiles và markFileKnown khi api có và files đã lưu', () => {
    const snap: PersistedSnapshot = {
      elements: [],
      appState: {},
      files: {
        f1: { dataURL: 'data:x', mimeType: 'image/png', created: 0 } as never,
      },
    };
    writePersisted(KEY, snap);

    const api = { addFiles: jest.fn() };
    const markKnown = jest.fn();
    renderHook(() => usePersist(KEY, api, markKnown));

    expect(api.addFiles).toHaveBeenCalledTimes(1);
    const arg = api.addFiles.mock.calls[0][0];
    expect(arg).toHaveLength(1);
    expect(arg[0].id).toBe('f1');
    expect(markKnown).toHaveBeenCalledWith('f1');
  });

  it('không crash khi không có files trong snapshot', () => {
    writePersisted(KEY, { elements: [], appState: {} });
    const api = { addFiles: jest.fn() };
    renderHook(() => usePersist(KEY, api, () => {}));
    expect(api.addFiles).not.toHaveBeenCalled();
  });
});

describe('writePersisted', () => {
  it('lưu được snapshot và đọc lại bằng usePersist', () => {
    const snap: PersistedSnapshot = {
      elements: [{ id: 'x' } as never],
      appState: {},
    };
    writePersisted(KEY, snap);
    const raw = window.sessionStorage.getItem(KEY);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!).elements[0].id).toBe('x');
  });
});
