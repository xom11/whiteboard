import { readScene, writeScene, clearScene } from '../sceneStore';

beforeEach(() => {
  window.localStorage.clear();
  jest.restoreAllMocks();
});

describe('sceneStore', () => {
  test('roundtrip read/write', () => {
    writeScene('k1', {
      elements: [{ id: 'a', type: 'rectangle' } as never],
      appState: { theme: 'light', viewBackgroundColor: '#fff' } as never,
    });
    const got = readScene('k1');
    expect(got).not.toBeNull();
    expect(got!.elements).toHaveLength(1);
    expect(got!.appState.theme).toBe('light');
    expect(got!.version).toBe(1);
    expect(typeof got!.savedAt).toBe('number');
  });

  test('read trên key chưa có → null', () => {
    expect(readScene('nope')).toBeNull();
  });

  test('clearScene xoá key', () => {
    writeScene('k', { elements: [], appState: {} as never });
    clearScene('k');
    expect(readScene('k')).toBeNull();
  });

  test('malformed JSON → null + clear', () => {
    window.localStorage.setItem('whiteboard:scene:bad', '{{not json');
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(readScene('bad')).toBeNull();
    expect(window.localStorage.getItem('whiteboard:scene:bad')).toBeNull();
    warn.mockRestore();
  });

  test('version lớn hơn → null + warn', () => {
    window.localStorage.setItem(
      'whiteboard:scene:future',
      JSON.stringify({ version: 99, elements: [], appState: {}, savedAt: 0 }),
    );
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(readScene('future')).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  test('missing elements field → null', () => {
    window.localStorage.setItem(
      'whiteboard:scene:bad2',
      JSON.stringify({ version: 1, appState: {}, savedAt: 0 }),
    );
    expect(readScene('bad2')).toBeNull();
  });

  test('quota error nuốt, không throw', () => {
    const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => writeScene('q', { elements: [], appState: {} as never })).not.toThrow();
    expect(warn).toHaveBeenCalled();
    setItem.mockRestore();
    warn.mockRestore();
  });
});
