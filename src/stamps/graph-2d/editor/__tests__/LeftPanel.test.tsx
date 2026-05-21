'use client';
// Integration test: graph-2d's TOOLS + StampLeftPanel objects tab + addButtons + custom renderRow.
// (Trước Phase 4 từng test trực tiếp GraphLeftPanel — đã extract sang StampLeftPanel.)
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { StampLeftPanel } from '../../../shared/StampLeftPanel';
import { TOOLS, GROUPS, GROUP_LABELS, type GraphTool, type GraphToolGroup } from '../tools';
import { FunctionRow } from '../rows/FunctionRow';
import { ParameterRow } from '../rows/ParameterRow';
import type { Function2DAttrs } from '../../../../core/scene/kinds/function2d';
import type { ParameterAttrs } from '../../../../core/scene/kinds/parameter';
import { createStore } from '../../../../core/scene/store';
import { createEmptyState } from '../../../../core/scene/types';
import type { SceneObject } from '../../../../core/scene/types';
import type { Store } from '../../../../core/scene/store';
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

function makeRenderRow(store: Store) {
  return function renderRow(
    obj: SceneObject,
    defaults: { selected: boolean; onClick: () => void },
  ): React.ReactNode {
    if (obj.kind === 'function2d') {
      return (
        <FunctionRow
          obj={obj as unknown as SceneObject<Function2DAttrs>}
          store={store}
          selected={defaults.selected}
          onClick={defaults.onClick}
        />
      );
    }
    if (obj.kind === 'parameter') {
      return (
        <ParameterRow
          obj={obj as unknown as SceneObject<ParameterAttrs>}
          store={store}
          selected={defaults.selected}
          onClick={defaults.onClick}
        />
      );
    }
    return null;
  };
}

function mount(opts: { store?: Store; onAddFunction?: () => void; onAddParameter?: () => void } = {}) {
  const addButtons = (opts.onAddFunction || opts.onAddParameter)
    ? [
        ...(opts.onAddFunction ? [{ label: '+ Hàm f(x)', testId: 'add-function-btn', onClick: opts.onAddFunction }] : []),
        ...(opts.onAddParameter ? [{ label: '+ Tham số', testId: 'add-parameter-btn', onClick: opts.onAddParameter }] : []),
      ]
    : undefined;
  return render(
    <StampLeftPanel<GraphTool, GraphToolGroup>
      title="Đồ thị"
      icon={<span />}
      tools={TOOLS}
      groupOrder={GROUPS}
      groupLabels={GROUP_LABELS}
      activeTool="move"
      onToolChange={() => {}}
      onClose={() => {}}
      objects={opts.store ? {
        store: opts.store,
        renderRow: makeRenderRow(opts.store),
        addButtons,
      } : undefined}
    />,
  );
}

describe('graph-2d × StampLeftPanel smoke', () => {
  it('renders LeftPanelShell với testId stamp-left-panel', () => {
    const store = makeStore();
    mount({ store });
    expect(screen.getByTestId('stamp-left-panel')).toBeInTheDocument();
  });

  it('tab Công cụ và tab Đối tượng có mặt', () => {
    const store = makeStore();
    mount({ store });
    expect(screen.getByTestId('tab-tools')).toBeInTheDocument();
    expect(screen.getByTestId('tab-objects')).toBeInTheDocument();
  });

  it('switch sang tab Đối tượng hiện ObjectListPanel', () => {
    const store = makeStore();
    mount({ store });
    fireEvent.click(screen.getByTestId('tab-objects'));
    expect(screen.getByTestId('object-list-panel')).toBeInTheDocument();
  });

  it('tab Đối tượng hiển thị FunctionRow cho function2d', () => {
    const store = makeStore();
    mount({ store });
    fireEvent.click(screen.getByTestId('tab-objects'));
    expect(screen.getByTestId('function-row-f1')).toBeInTheDocument();
    expect(screen.getByTestId('parameter-row-a')).toBeInTheDocument();
  });

  it('onAddFunction được gọi khi click nút Thêm hàm', () => {
    const onAddFunction = jest.fn();
    const store = makeStore();
    mount({ store, onAddFunction });
    fireEvent.click(screen.getByTestId('tab-objects'));
    fireEvent.click(screen.getByTestId('add-function-btn'));
    expect(onAddFunction).toHaveBeenCalled();
  });

  it('onAddParameter được gọi khi click nút Thêm tham số', () => {
    const onAddParameter = jest.fn();
    const store = makeStore();
    mount({ store, onAddParameter });
    fireEvent.click(screen.getByTestId('tab-objects'));
    fireEvent.click(screen.getByTestId('add-parameter-btn'));
    expect(onAddParameter).toHaveBeenCalled();
  });
});
