import * as React from 'react';
import { render, fireEvent, screen, act } from '@testing-library/react';
import { ObjectListPanel } from '../ObjectListPanel';
import { createStore } from '../../store';
import { registerKind, getKind } from '../../registry';
import type { SceneObject, State } from '../../types';

const FAKE_KIND = 'fakepanel';
try { getKind(FAKE_KIND); } catch {
  registerKind({
    type: FAKE_KIND,
    schemaVersion: 1,
    migrate: {},
    dependsOn: () => [],
    describe: (obj) => `${obj.label} desc`,
    render: () => ({}),
  });
}

function makeObj(id: string, label: string, over: Partial<SceneObject> = {}): SceneObject {
  return {
    id, kind: FAKE_KIND, label, visible: true, locked: false,
    layer: 'default', schemaVersion: 1, attrs: {}, ...over,
  };
}

describe('ObjectListPanel', () => {
  it('renders empty state when no objects', () => {
    const store = createStore({ objects: {}, order: [], counter: 0, meta: { domain: '2d', version: 1 } });
    render(<ObjectListPanel store={store} />);
    expect(screen.getByText('Chưa có đối tượng nào')).toBeInTheDocument();
  });

  it('renders one row per object in order', () => {
    const initial: State = {
      objects: {
        A: makeObj('A', 'A'),
        B: makeObj('B', 'B'),
      },
      order: ['A', 'B'],
      counter: 2,
      meta: { domain: '2d', version: 1 },
    };
    const store = createStore(initial);
    render(<ObjectListPanel store={store} />);
    expect(screen.getByTestId('object-row-A')).toBeInTheDocument();
    expect(screen.getByTestId('object-row-B')).toBeInTheDocument();
  });

  it('re-renders when store dispatches ADD', () => {
    const store = createStore({ objects: {}, order: [], counter: 0, meta: { domain: '2d', version: 1 } });
    render(<ObjectListPanel store={store} />);
    expect(screen.queryByTestId('object-row-X')).toBeNull();
    act(() => {
      store.dispatch({ type: 'ADD', payload: { obj: makeObj('X', 'X') } });
    });
    expect(screen.getByTestId('object-row-X')).toBeInTheDocument();
  });

  it('eye toggle dispatches UPDATE patch visible=false', () => {
    const initial: State = {
      objects: { A: makeObj('A', 'A') },
      order: ['A'],
      counter: 1,
      meta: { domain: '2d', version: 1 },
    };
    const store = createStore(initial);
    render(<ObjectListPanel store={store} />);
    fireEvent.click(screen.getByLabelText('Toggle visibility'));
    expect(store.getState().objects.A.visible).toBe(false);
  });

  it('lock toggle dispatches UPDATE patch locked=true', () => {
    const initial: State = {
      objects: { A: makeObj('A', 'A') },
      order: ['A'],
      counter: 1,
      meta: { domain: '2d', version: 1 },
    };
    const store = createStore(initial);
    render(<ObjectListPanel store={store} />);
    fireEvent.click(screen.getByLabelText('Toggle lock'));
    expect(store.getState().objects.A.locked).toBe(true);
  });

  it('delete dispatches DELETE', () => {
    const initial: State = {
      objects: { A: makeObj('A', 'A') },
      order: ['A'],
      counter: 1,
      meta: { domain: '2d', version: 1 },
    };
    const store = createStore(initial);
    render(<ObjectListPanel store={store} />);
    fireEvent.click(screen.getByLabelText('Row menu'));
    fireEvent.click(screen.getByText('Xoá'));
    expect(store.getState().objects.A).toBeUndefined();
  });

  it('click row calls onSelect prop', () => {
    const initial: State = {
      objects: { A: makeObj('A', 'A') },
      order: ['A'],
      counter: 1,
      meta: { domain: '2d', version: 1 },
    };
    const store = createStore(initial);
    const onSelect = jest.fn();
    render(<ObjectListPanel store={store} onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId('object-row-A'));
    expect(onSelect).toHaveBeenCalledWith('A');
  });

  it('selectedId prop reflects in aria-selected', () => {
    const initial: State = {
      objects: { A: makeObj('A', 'A'), B: makeObj('B', 'B') },
      order: ['A', 'B'],
      counter: 2,
      meta: { domain: '2d', version: 1 },
    };
    const store = createStore(initial);
    render(<ObjectListPanel store={store} selectedId="B" />);
    expect(screen.getByTestId('object-row-A')).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByTestId('object-row-B')).toHaveAttribute('aria-selected', 'true');
  });
});
