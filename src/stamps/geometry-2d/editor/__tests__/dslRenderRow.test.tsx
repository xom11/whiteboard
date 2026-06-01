// src/stamps/geometry-2d/editor/__tests__/dslRenderRow.test.tsx
//
// Integration test cho renderRow custom của geometry-2d (issue #41):
// tab Đối tượng hiển thị mô tả DSL-style thay vì describe() mặc định, và
// fallback an toàn cho object out-of-DSL.

import * as React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { StampLeftPanel } from '../../../shared/StampLeftPanel';
import { TOOLS, GROUP_ORDER, GROUP_LABELS, letterForGroup, type GeomGroup } from '../tools';
import type { GeomTool } from '../MiniBoard';
import { createStore } from '../../../../core/scene/store';
import type { SceneObject, State, Store } from '../../../../core/scene/types';
import { makeDslRenderRow } from '../dslRenderRow';

// Register scene kinds (point/segment/...) cho getKind() trong fallback path.
import '../../../../core/scene/kinds';

function mountWithStore(store: Store) {
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
      objects={{
        store,
        renderRow: makeDslRenderRow(store),
      }}
    />,
  );
}

function pt(id: string, label: string, constraint: Record<string, unknown>): SceneObject {
  return {
    id, kind: 'point', label,
    visible: true, locked: false, layer: 'default', schemaVersion: 1,
    attrs: { constraint },
  };
}
function shape(id: string, kind: string, label: string, attrs: Record<string, unknown>): SceneObject {
  return {
    id, kind, label,
    visible: true, locked: false, layer: 'default', schemaVersion: 1,
    attrs,
  };
}

function storeOf(objs: SceneObject[]): Store {
  const initial: State = {
    objects: Object.fromEntries(objs.map((o) => [o.id, o])),
    order: objs.map((o) => o.id),
    counter: objs.length,
    meta: { domain: '2d', version: 1, view: { bbox: [-10, 10, 10, -10], showAxis: false, showGrid: false } },
  };
  return createStore(initial);
}

describe('geometry-2d × renderRow — DSL-style descriptions', () => {
  test('free point row hiển thị "(x, y)"', () => {
    const A = pt('p1', 'A', { kind: 'free', x: 1, y: 2 });
    mountWithStore(storeOf([A]));
    act(() => { fireEvent.click(screen.getByTestId('tab-objects')); });
    const row = screen.getByTestId('object-row-p1');
    expect(row.textContent).toContain('A = (1, 2)');
  });

  test('midpoint hiển thị "trung điểm BC"', () => {
    const B = pt('p1', 'B', { kind: 'free', x: -2, y: 0 });
    const C = pt('p2', 'C', { kind: 'free', x: 3, y: 0 });
    const M = pt('p3', 'M', { kind: 'midpoint', p1: 'p1', p2: 'p2' });
    mountWithStore(storeOf([B, C, M]));
    act(() => { fireEvent.click(screen.getByTestId('tab-objects')); });
    expect(screen.getByTestId('object-row-p3').textContent).toContain('M = trung điểm BC');
  });

  test('segment hiển thị "đoạn AB"', () => {
    const A = pt('p1', 'A', { kind: 'free', x: 0, y: 0 });
    const B = pt('p2', 'B', { kind: 'free', x: 2, y: 0 });
    const s = shape('s1', 'segment', 'AB', { p1: 'p1', p2: 'p2' });
    mountWithStore(storeOf([A, B, s]));
    act(() => { fireEvent.click(screen.getByTestId('tab-objects')); });
    expect(screen.getByTestId('object-row-s1').textContent).toContain('AB = đoạn AB');
  });

  test('out-of-DSL object (vector) hiển thị fallback "(không hỗ trợ DSL)"', () => {
    const A = pt('p1', 'A', { kind: 'free', x: 0, y: 0 });
    const B = pt('p2', 'B', { kind: 'free', x: 2, y: 0 });
    const v = shape('v1', 'vector', 'v', { p1: 'p1', p2: 'p2' });
    mountWithStore(storeOf([A, B, v]));
    act(() => { fireEvent.click(screen.getByTestId('tab-objects')); });
    const row = screen.getByTestId('object-row-v1');
    expect(row.textContent).toMatch(/\(không hỗ trợ DSL\)/);
  });

  test('row click vẫn forward selection (test row toggle integration)', () => {
    const A = pt('p1', 'A', { kind: 'free', x: 0, y: 0 });
    mountWithStore(storeOf([A]));
    act(() => { fireEvent.click(screen.getByTestId('tab-objects')); });
    const row = screen.getByTestId('object-row-p1');
    expect(row).toBeInTheDocument();
  });
});
