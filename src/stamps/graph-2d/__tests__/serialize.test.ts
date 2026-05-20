import { stringifySceneState, parseSceneState } from '../serialize';
import { createEmptyState } from '../../../core/scene/types';
import '../../../core/scene/kinds';

describe('graph-2d/serialize', () => {
  it('roundtrip empty state', () => {
    const s = createEmptyState('graph2d');
    const json = stringifySceneState(s);
    const parsed = parseSceneState(json);
    expect(parsed).not.toBeNull();
    expect(parsed!.meta.domain).toBe('graph2d');
    expect(parsed!.meta.version).toBe(1);
    expect(parsed!.order).toEqual([]);
    expect(parsed!.objects).toEqual({});
    expect(parsed!.counter).toBe(0);
  });

  it('roundtrip state với function2d object', () => {
    const s = createEmptyState('graph2d');
    const stateWithObj = {
      ...s,
      objects: {
        f1: {
          id: 'f1', kind: 'function2d', label: 'f1', visible: true, locked: false,
          layer: 'default', schemaVersion: 1,
          attrs: { expression: 'sin(x)', color: '#2563eb', visible: true },
        },
      },
      order: ['f1'],
      counter: 1,
    };
    const json = stringifySceneState(stateWithObj);
    const parsed = parseSceneState(json);
    expect(parsed).not.toBeNull();
    expect(parsed!.objects.f1.attrs.expression).toBe('sin(x)');
  });

  it('parseSceneState returns null on garbage', () => {
    expect(parseSceneState('{}')).toBeNull();
    expect(parseSceneState('not json')).toBeNull();
  });

  it('parseSceneState returns null khi domain khác graph2d', () => {
    const s = createEmptyState('2d');
    expect(parseSceneState(JSON.stringify(s))).toBeNull();
  });

  it('stringifySceneState trả về JSON string hợp lệ', () => {
    const s = createEmptyState('graph2d');
    const json = stringifySceneState(s);
    expect(typeof json).toBe('string');
    expect(() => JSON.parse(json)).not.toThrow();
  });
});
