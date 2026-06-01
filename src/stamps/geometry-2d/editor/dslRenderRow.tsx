// src/stamps/geometry-2d/editor/dslRenderRow.tsx
//
// Factory tạo renderRow cho `StampLeftPanel.objects.renderRow`. Reuse shared
// `ObjectRow` nhưng inject `describeDsl` cho title → tab Đối tượng hiển thị
// mô tả DSL-style (issue #41).

import type { ReactNode } from 'react';
import { ObjectRow } from '../../../core/scene/ui/ObjectRow';
import type { Store } from '../../../core/scene/store';
import type { SceneObject } from '../../../core/scene/types';
import { describeDsl } from '../dsl/describeDsl';

export function makeDslRenderRow(store: Store) {
  return function renderDslRow(
    obj: SceneObject,
    defaults: { selected: boolean; onClick: () => void },
  ): ReactNode {
    const state = store.getState();
    const noop = () => { /* rename + color stub theo ObjectRow default */ };
    return (
      <ObjectRow
        obj={obj}
        state={state}
        selected={defaults.selected}
        onSelect={defaults.onClick}
        onToggleVisible={(id) => {
          const o = state.objects[id];
          if (!o) return;
          store.dispatch({ type: 'UPDATE', payload: { id, patch: { visible: !o.visible } } });
        }}
        onToggleLocked={(id) => {
          const o = state.objects[id];
          if (!o) return;
          store.dispatch({ type: 'UPDATE', payload: { id, patch: { locked: !o.locked } } });
        }}
        onRename={noop}
        onChangeColor={noop}
        onDelete={(id) => store.dispatch({ type: 'DELETE', payload: { id } })}
        describe={describeDsl}
      />
    );
  };
}
