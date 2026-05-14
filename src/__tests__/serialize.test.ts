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
