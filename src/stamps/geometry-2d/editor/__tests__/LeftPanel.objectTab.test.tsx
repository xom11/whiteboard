import * as React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { GeometryLeftPanel } from '../LeftPanel';
import { createStore } from '../../../../core/scene/store';
import { registerKind, getKind } from '../../../../core/scene/registry';
import type { SceneObject, State } from '../../../../core/scene/types';

// ---------------------------------------------------------------------------
// Fake kind — tránh side-effect JXG của 'point' kind thật
// ---------------------------------------------------------------------------
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

function makeStoreWithPoint(label: string) {
  const initial: State = {
    objects: { p1: makeObj('p1', label) },
    order: ['p1'],
    counter: 1,
    meta: { domain: '2d', version: 1 },
  };
  return createStore(initial);
}

// ---------------------------------------------------------------------------
// Base props (no store) — matches GeometryLeftPanelProps
// ---------------------------------------------------------------------------
const baseProps = {
  activeTool: 'move' as const,
  onToolChange: () => {},
  showAxis: false,
  showGrid: false,
  onShowAxisChange: () => {},
  onShowGridChange: () => {},
  onUndo: () => {},
  canUndo: false,
  onRedo: () => {},
  canRedo: false,
  onClose: () => {},
  isMobile: false,
};

describe('GeometryLeftPanel - Object tab', () => {
  test('no store: tab row hidden, only tools visible', () => {
    render(<GeometryLeftPanel {...baseProps} />);
    // LeftPanelShell renders role="tablist" only when tabs.length >= 2
    expect(screen.queryByRole('tablist')).toBeNull();
    // Tools content (Section "Bố cục") should still render
    expect(screen.getByText('Bố cục')).toBeInTheDocument();
  });

  test('with store: tab row visible, default active=tools', () => {
    const store = makeStoreWithPoint('A');
    render(<GeometryLeftPanel {...baseProps} store={store} />);
    expect(screen.getByTestId('tab-tools')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('tab-objects')).toHaveAttribute('aria-selected', 'false');
  });

  test('clicking objects tab shows ObjectListPanel with rows', () => {
    const store = makeStoreWithPoint('A');
    render(<GeometryLeftPanel {...baseProps} store={store} />);
    act(() => {
      fireEvent.click(screen.getByTestId('tab-objects'));
    });
    expect(screen.getByTestId('object-list-panel')).toBeInTheDocument();
    expect(screen.getByTestId('object-row-p1')).toBeInTheDocument();
  });

  test('clicking row triggers onObjectSelect with id', () => {
    const store = makeStoreWithPoint('A');
    const onObjectSelect = jest.fn();
    render(<GeometryLeftPanel {...baseProps} store={store} onObjectSelect={onObjectSelect} />);
    act(() => {
      fireEvent.click(screen.getByTestId('tab-objects'));
    });
    fireEvent.click(screen.getByTestId('object-row-p1'));
    expect(onObjectSelect).toHaveBeenCalledWith('p1');
  });
});
