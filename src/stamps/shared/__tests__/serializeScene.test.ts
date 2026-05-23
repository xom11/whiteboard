import { serializeScene, deserializeScene } from '../serializeScene';
import { createEmptyState } from '../../../core/scene';

describe('serializeScene / deserializeScene', () => {
  test('serialize returns JSON.stringify(state)', () => {
    const state = createEmptyState('2d');
    expect(serializeScene(state)).toBe(JSON.stringify(state));
  });

  test('roundtrip preserves objects + meta.view', () => {
    const state = createEmptyState('graph2d');
    const raw = serializeScene(state);
    const back = deserializeScene('graph2d', raw);
    expect(back.meta.domain).toBe('graph2d');
    expect(back.meta.view).toEqual(state.meta.view);
    expect(back.objects).toEqual(state.objects);
  });

  test('deserialize fallback empty state on invalid JSON', () => {
    const back = deserializeScene('2d', '{ not valid json');
    expect(back.meta.domain).toBe('2d');
    expect(Object.keys(back.objects)).toHaveLength(0);
  });

  test('deserialize fallback empty state on null/undefined input', () => {
    const back = deserializeScene('3d', '');
    expect(back.meta.domain).toBe('3d');
    expect(back.meta.view).toBeDefined();
  });

  test('deserialize fallback when shape lacks required fields', () => {
    const back = deserializeScene('graph2d', JSON.stringify({ foo: 'bar' }));
    expect(back.meta.domain).toBe('graph2d');
    expect(Object.keys(back.objects)).toHaveLength(0);
  });

  test('deserialize fallback when meta.domain mismatches', () => {
    const wrong = createEmptyState('2d');
    const back = deserializeScene('graph2d', JSON.stringify(wrong));
    // Mismatched domain → fallback empty state for requested domain.
    expect(back.meta.domain).toBe('graph2d');
  });

  test('deserialize accepts well-formed state matching domain', () => {
    const original = createEmptyState('2d');
    const back = deserializeScene('2d', JSON.stringify(original));
    expect(back.meta.domain).toBe('2d');
    // view shape khớp '2d' (bbox + showAxis + showGrid)
    if (back.meta.domain === '2d') {
      expect(back.meta.view.bbox).toBeDefined();
      expect(typeof back.meta.view.showAxis).toBe('boolean');
    }
  });
});
