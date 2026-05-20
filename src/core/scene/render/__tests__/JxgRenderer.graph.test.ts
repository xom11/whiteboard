// src/core/scene/render/__tests__/JxgRenderer.graph.test.ts
import { JxgRenderer } from '../JxgRenderer';
import { createStore } from '../../store';
import { createEmptyState } from '../../types';
import '../../kinds';

function mockBoard() {
  const created: { type: string; args: unknown[]; opts: unknown }[] = [];
  const removed: unknown[] = [];
  return {
    created,
    removed,
    create: jest.fn((type: string, args: unknown[], opts: unknown) => {
      const el = { _type: type, _args: args, _opts: opts, removeObject: jest.fn() };
      created.push({ type, args, opts: el._opts });
      return el;
    }),
    removeObject: jest.fn((el: unknown) => {
      removed.push(el);
    }),
  };
}

describe('JxgRenderer + graph kinds', () => {
  it('ADD function2d → board.create("functiongraph", ...)', () => {
    const store = createStore(createEmptyState('graph2d'));
    const board = mockBoard();
    new JxgRenderer(store, board);

    store.dispatch({
      type: 'ADD',
      payload: {
        obj: {
          id: 'f1',
          kind: 'function2d',
          label: 'f',
          visible: true,
          locked: false,
          layer: 'default',
          schemaVersion: 1,
          attrs: { expression: 'x^2', color: '#2563eb', visible: true },
        },
      },
    });

    const calls = board.created.filter((c) => c.type === 'functiongraph');
    expect(calls.length).toBe(1);
  });

  it('UPDATE_ATTRS parameter.value → re-render dependent function2d', () => {
    const store = createStore(createEmptyState('graph2d'));
    const board = mockBoard();
    new JxgRenderer(store, board);

    // ADD parameter 'a'
    store.dispatch({
      type: 'ADD',
      payload: {
        obj: {
          id: 'a',
          kind: 'parameter',
          label: 'a',
          visible: true,
          locked: false,
          layer: 'default',
          schemaVersion: 1,
          attrs: { value: 1, min: -5, max: 5, step: 0.1 },
        },
      },
    });

    // ADD function2d whose expression depends on 'a'
    store.dispatch({
      type: 'ADD',
      payload: {
        obj: {
          id: 'f1',
          kind: 'function2d',
          label: 'f',
          visible: true,
          locked: false,
          layer: 'default',
          schemaVersion: 1,
          attrs: { expression: 'a*x', color: '#2563eb', visible: true },
        },
      },
    });

    const beforeCount = board.created.filter((c) => c.type === 'functiongraph').length;

    // UPDATE_ATTRS on parameter 'a' → should trigger re-render of f1
    store.dispatch({
      type: 'UPDATE_ATTRS',
      payload: { id: 'a', patch: { value: 2, min: -5, max: 5, step: 0.1 } },
    });

    const afterCount = board.created.filter((c) => c.type === 'functiongraph').length;
    // Re-render means a new functiongraph was created (after remove + create)
    expect(afterCount).toBeGreaterThan(beforeCount);
  });

  it('ADD pointOnCurve → board.create("glider", ...)', () => {
    const store = createStore(createEmptyState('graph2d'));
    const board = mockBoard();
    new JxgRenderer(store, board);

    // ADD function2d first
    store.dispatch({
      type: 'ADD',
      payload: {
        obj: {
          id: 'f1',
          kind: 'function2d',
          label: 'f',
          visible: true,
          locked: false,
          layer: 'default',
          schemaVersion: 1,
          attrs: { expression: 'x^2', color: '#000', visible: true },
        },
      },
    });

    // ADD pointOnCurve referencing f1
    store.dispatch({
      type: 'ADD',
      payload: {
        obj: {
          id: 'P',
          kind: 'pointOnCurve',
          label: 'P',
          visible: true,
          locked: false,
          layer: 'default',
          schemaVersion: 1,
          attrs: { functionId: 'f1', x: 1 },
        },
      },
    });

    const gliderCalls = board.created.filter((c) => c.type === 'glider');
    expect(gliderCalls.length).toBe(1);
  });
});
