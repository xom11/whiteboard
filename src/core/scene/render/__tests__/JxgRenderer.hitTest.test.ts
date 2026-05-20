// src/core/scene/render/__tests__/JxgRenderer.hitTest.test.ts
import { JxgRenderer } from '../JxgRenderer';
import { createStore } from '../../store';
import { createEmptyState } from '../../types';
import '../../kinds';

describe('JxgRenderer hit-test helpers', () => {
  function mockBoard() {
    return {
      create: jest.fn((type: string) => {
        const el = { _type: type, hasPoint: () => false };
        return el;
      }),
      removeObject: jest.fn(),
      on: jest.fn(),
    };
  }

  it('getElement returns null for unknown id', () => {
    const store = createStore(createEmptyState('graph2d'));
    const board = mockBoard();
    const r = new JxgRenderer(store, board);
    expect(r.getElement('nonexistent')).toBeNull();
  });

  it('getElement returns scene-rendered element after ADD', () => {
    const store = createStore(createEmptyState('graph2d'));
    const board = mockBoard();
    const r = new JxgRenderer(store, board);
    store.dispatch({
      type: 'ADD',
      payload: {
        obj: {
          id: 'f1', kind: 'function2d', label: 'f', visible: true,
          locked: false, layer: 'default', schemaVersion: 1,
          attrs: { expression: 'x', color: '#000', visible: true },
        },
      },
    });
    expect(r.getElement('f1')).toBeTruthy();
  });

  it('listElements returns map with rendered ids', () => {
    const store = createStore(createEmptyState('graph2d'));
    const board = mockBoard();
    const r = new JxgRenderer(store, board);
    store.dispatch({
      type: 'ADD',
      payload: {
        obj: {
          id: 'f1', kind: 'function2d', label: 'f', visible: true,
          locked: false, layer: 'default', schemaVersion: 1,
          attrs: { expression: 'x', color: '#000', visible: true },
        },
      },
    });
    const map = r.listElements();
    expect(map instanceof Map).toBe(true);
    expect(map.has('f1')).toBe(true);
  });

  it('listElements is empty when no objects added', () => {
    const store = createStore(createEmptyState('graph2d'));
    const board = mockBoard();
    const r = new JxgRenderer(store, board);
    expect(r.listElements().size).toBe(0);
  });
});
