import * as React from 'react';
import { render, fireEvent, screen, act } from '@testing-library/react';
import { ObjectListPanel } from '../ObjectListPanel';
import { createStore } from '../../store';
import { registerKind, getKind } from '../../registry';
import type { SceneObject, State } from '../../types';
import '../../kinds';

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

  it('lock toggle via menu dispatches UPDATE patch locked=true', () => {
    const initial: State = {
      objects: { A: makeObj('A', 'A') },
      order: ['A'],
      counter: 1,
      meta: { domain: '2d', version: 1 },
    };
    const store = createStore(initial);
    render(<ObjectListPanel store={store} />);
    fireEvent.click(screen.getByLabelText('Row menu'));
    fireEvent.click(screen.getByText('Khoá'));
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

  it('only the selected row shows detail block', () => {
    // Use real `point` kind so measure() returns a non-null result.
    const A: SceneObject = {
      id: 'A', kind: 'point', label: 'A', visible: true, locked: false,
      attrs: { constraint: { kind: 'free', x: 1, y: 2 } },
    } as SceneObject;
    const B: SceneObject = {
      id: 'B', kind: 'point', label: 'B', visible: true, locked: false,
      attrs: { constraint: { kind: 'free', x: 3, y: 4 } },
    } as SceneObject;
    const initial: State = {
      objects: { A, B }, order: ['A', 'B'], counter: 2,
      meta: { domain: '2d', version: 1 },
    };
    const store = createStore(initial);
    const { rerender } = render(<ObjectListPanel store={store} selectedId="A" />);
    expect(screen.getByTestId('object-row-detail-A')).toBeInTheDocument();
    expect(screen.queryByTestId('object-row-detail-B')).not.toBeInTheDocument();

    rerender(<ObjectListPanel store={store} selectedId="B" />);
    expect(screen.queryByTestId('object-row-detail-A')).not.toBeInTheDocument();
    expect(screen.getByTestId('object-row-detail-B')).toBeInTheDocument();
  });
});

describe('ObjectListPanel.renderRow', () => {
  function setup() {
    const store = createStore({ objects: {}, order: [], counter: 0, meta: { domain: 'graph2d' as const, version: 1 } });
    store.dispatch({
      type: 'ADD',
      payload: {
        obj: {
          id: 'f1', kind: 'function2d', label: 'f', visible: true, locked: false,
          layer: 'default', schemaVersion: 1,
          attrs: { expression: 'x^2', color: '#000', visible: true },
        },
      },
    });
    return store;
  }

  it('renderRow overrides default row', () => {
    const store = setup();
    const renderRow = jest.fn((obj: SceneObject) => (
      <div key={obj.id} data-testid={`custom-row-${obj.id}`}>{obj.label}</div>
    ));
    const { getByTestId, queryByTestId } = render(
      <ObjectListPanel store={store} renderRow={renderRow} />,
    );
    expect(getByTestId('custom-row-f1')).toBeInTheDocument();
    expect(queryByTestId('object-row-f1')).toBeNull();
    expect(renderRow).toHaveBeenCalled();
  });

  it('default row khi renderRow undefined', () => {
    const store = setup();
    const { getByTestId } = render(<ObjectListPanel store={store} />);
    expect(getByTestId('object-row-f1')).toBeInTheDocument();
  });

  it('renderRow nhận đúng selected và onClick', () => {
    const store = setup();
    const onSelect = jest.fn();
    const renderRow = jest.fn((_obj: SceneObject, defaults: { selected: boolean; onClick: () => void }) => (
      <div
        key={_obj.id}
        data-testid={`custom-row-${_obj.id}`}
        data-selected={defaults.selected ? 'true' : 'false'}
        onClick={defaults.onClick}
      >
        {_obj.label}
      </div>
    ));
    const { getByTestId } = render(
      <ObjectListPanel store={store} renderRow={renderRow} onSelect={onSelect} selectedId="f1" />,
    );
    const row = getByTestId('custom-row-f1');
    expect(row).toHaveAttribute('data-selected', 'true');
    fireEvent.click(row);
    expect(onSelect).toHaveBeenCalledWith('f1');
  });
});
