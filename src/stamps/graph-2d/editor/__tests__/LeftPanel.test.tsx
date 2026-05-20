'use client';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { GraphLeftPanel } from '../LeftPanel';
import { createStore } from '../../../../core/scene/store';
import { createEmptyState } from '../../../../core/scene/types';
import '../../../../core/scene/kinds';

function makeStore() {
  const store = createStore(createEmptyState('graph2d'));
  store.dispatch({
    type: 'ADD',
    payload: {
      obj: {
        id: 'f1',
        kind: 'function2d',
        label: 'f1',
        visible: true,
        locked: false,
        layer: 'default',
        schemaVersion: 1,
        attrs: { expression: 'x^2', color: '#2563eb', visible: true },
      },
    },
  });
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
  return store;
}

describe('GraphLeftPanel smoke', () => {
  it('renders LeftPanelShell với testId stamp-left-panel', () => {
    const store = makeStore();
    render(
      <GraphLeftPanel
        store={store}
        activeTool="move"
        onToolChange={() => {}}
        onAddFunction={() => {}}
        onAddParameter={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.getByTestId('stamp-left-panel')).toBeInTheDocument();
  });

  it('tab Công cụ và tab Đối tượng có mặt', () => {
    const store = makeStore();
    render(
      <GraphLeftPanel
        store={store}
        activeTool="move"
        onToolChange={() => {}}
        onAddFunction={() => {}}
        onAddParameter={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.getByTestId('tab-tools')).toBeInTheDocument();
    expect(screen.getByTestId('tab-objects')).toBeInTheDocument();
  });

  it('switch sang tab Đối tượng hiện ObjectListPanel', () => {
    const store = makeStore();
    render(
      <GraphLeftPanel
        store={store}
        activeTool="move"
        onToolChange={() => {}}
        onAddFunction={() => {}}
        onAddParameter={() => {}}
        onClose={() => {}}
      />,
    );
    fireEvent.click(screen.getByTestId('tab-objects'));
    expect(screen.getByTestId('object-list-panel')).toBeInTheDocument();
  });

  it('tab Đối tượng hiển thị FunctionRow cho function2d', () => {
    const store = makeStore();
    render(
      <GraphLeftPanel
        store={store}
        activeTool="move"
        onToolChange={() => {}}
        onAddFunction={() => {}}
        onAddParameter={() => {}}
        onClose={() => {}}
      />,
    );
    fireEvent.click(screen.getByTestId('tab-objects'));
    expect(screen.getByTestId('function-row-f1')).toBeInTheDocument();
    expect(screen.getByTestId('parameter-row-a')).toBeInTheDocument();
  });

  it('onAddFunction được gọi khi click nút Thêm hàm', () => {
    const onAddFunction = jest.fn();
    const store = makeStore();
    render(
      <GraphLeftPanel
        store={store}
        activeTool="move"
        onToolChange={() => {}}
        onAddFunction={onAddFunction}
        onAddParameter={() => {}}
        onClose={() => {}}
      />,
    );
    fireEvent.click(screen.getByTestId('tab-objects'));
    fireEvent.click(screen.getByTestId('add-function-btn'));
    expect(onAddFunction).toHaveBeenCalled();
  });

  it('onAddParameter được gọi khi click nút Thêm tham số', () => {
    const onAddParameter = jest.fn();
    const store = makeStore();
    render(
      <GraphLeftPanel
        store={store}
        activeTool="move"
        onToolChange={() => {}}
        onAddFunction={() => {}}
        onAddParameter={onAddParameter}
        onClose={() => {}}
      />,
    );
    fireEvent.click(screen.getByTestId('tab-objects'));
    fireEvent.click(screen.getByTestId('add-parameter-btn'));
    expect(onAddParameter).toHaveBeenCalled();
  });
});
