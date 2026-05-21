// Integration test: 2D's TOOLS + StampLeftPanel objects tab.
// (Trước Phase 2 từng test trực tiếp GeometryLeftPanel.)
import * as React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { StampLeftPanel } from '../../../shared/StampLeftPanel';
import { TOOLS, GROUP_ORDER, GROUP_LABELS, letterForGroup, type GeomGroup } from '../tools';
import type { GeomTool } from '../MiniBoard';
import { createStore } from '../../../../core/scene/store';
import { registerKind, getKind } from '../../../../core/scene/registry';
import type { SceneObject, State, Store } from '../../../../core/scene/types';

const FAKE_KIND = 'fakeobjlp';
try {
  getKind(FAKE_KIND);
} catch {
  registerKind({
    type: FAKE_KIND,
    schemaVersion: 1,
    migrate: {},
    dependsOn: () => [],
    describe: (obj) => `${obj.label}`,
    render: () => ({}),
  });
}

function makeObj(id: string, label: string, over: Partial<SceneObject> = {}): SceneObject {
  return {
    id,
    kind: FAKE_KIND,
    label,
    visible: true,
    locked: false,
    layer: 'default',
    schemaVersion: 1,
    attrs: {},
    ...over,
  };
}

function makeStoreWithPoint(label: string): Store {
  const initial: State = {
    objects: { p1: makeObj('p1', label) },
    order: ['p1'],
    counter: 1,
    meta: { domain: '2d', version: 1 },
  };
  return createStore(initial);
}

function mount(opts: { store?: Store; onObjectSelect?: (id: string | null) => void } = {}) {
  return render(
    <StampLeftPanel<GeomTool, GeomGroup>
      title="Hình học"
      icon={<span />}
      tools={TOOLS}
      groupOrder={GROUP_ORDER}
      groupLabels={GROUP_LABELS}
      activeTool="move"
      onToolChange={() => {}}
      view={{ showAxis: false, showGrid: false, onShowAxisChange: () => {}, onShowGridChange: () => {} }}
      history={{ onUndo: () => {}, canUndo: false, onRedo: () => {}, canRedo: false }}
      chord={{ activeGroup: null, letterForGroup }}
      onClose={() => {}}
      objects={opts.store ? { store: opts.store, onObjectSelect: opts.onObjectSelect } : undefined}
    />,
  );
}

describe('geometry-2d × StampLeftPanel — Object tab', () => {
  test('no store: tab row hidden, only tools visible', () => {
    mount();
    // LeftPanelShell renders role="tablist" only when tabs.length >= 2
    expect(screen.queryByRole('tablist')).toBeNull();
    // Tools content (Section "Bố cục") should still render
    expect(screen.getByText('Bố cục')).toBeInTheDocument();
  });

  test('with store: tab row visible, default active=tools', () => {
    const store = makeStoreWithPoint('A');
    mount({ store });
    expect(screen.getByTestId('tab-tools')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('tab-objects')).toHaveAttribute('aria-selected', 'false');
  });

  test('clicking objects tab shows ObjectListPanel with rows', () => {
    const store = makeStoreWithPoint('A');
    mount({ store });
    act(() => {
      fireEvent.click(screen.getByTestId('tab-objects'));
    });
    expect(screen.getByTestId('object-list-panel')).toBeInTheDocument();
    expect(screen.getByTestId('object-row-p1')).toBeInTheDocument();
  });

  test('clicking row triggers onObjectSelect with id', () => {
    const store = makeStoreWithPoint('A');
    const onObjectSelect = jest.fn();
    mount({ store, onObjectSelect });
    act(() => {
      fireEvent.click(screen.getByTestId('tab-objects'));
    });
    fireEvent.click(screen.getByTestId('object-row-p1'));
    expect(onObjectSelect).toHaveBeenCalledWith('p1');
  });
});
