'use client';
import * as React from 'react';
import type { Store } from '../store';
import type { SceneObject } from '../types';
import { listObjects } from '../selectors';
import { ObjectRow } from './ObjectRow';

export interface ObjectListPanelProps {
  store: Store;
  selectedId?: string;
  onSelect?: (id: string) => void;
  /**
   * Optional per-kind row renderer. Called with the SceneObject and default props
   * (selected, onClick). Return a ReactNode to override the default ObjectRow.
   * Return null/undefined to fall back to the default ObjectRow.
   */
  renderRow?: (
    obj: SceneObject,
    defaults: { selected: boolean; onClick: () => void },
  ) => React.ReactNode;
}

export function ObjectListPanel(props: ObjectListPanelProps): React.ReactElement {
  const { store, selectedId, onSelect, renderRow } = props;
  // useSyncExternalStore expects subscribe to receive () => void callback,
  // but Store.subscribe takes (next, prev, action) => void. Wrap to adapt.
  const subscribe = React.useCallback(
    (cb: () => void) => store.subscribe(() => cb()),
    [store],
  );
  const state = React.useSyncExternalStore(subscribe, store.getState, store.getState);
  const objects = listObjects(state);

  function handleSelect(id: string) {
    onSelect?.(id);
  }

  function handleToggleVisible(id: string) {
    const obj = state.objects[id];
    if (!obj) return;
    store.dispatch({ type: 'UPDATE', payload: { id, patch: { visible: !obj.visible } } });
  }

  function handleToggleLocked(id: string) {
    const obj = state.objects[id];
    if (!obj) return;
    store.dispatch({ type: 'UPDATE', payload: { id, patch: { locked: !obj.locked } } });
  }

  function handleDelete(id: string) {
    store.dispatch({ type: 'DELETE', payload: { id } });
  }

  function noop() { /* rename + change color stubbed for Phase 3 */ }

  return (
    <ul
      data-testid="object-list-panel"
      className="flex max-h-[calc(100vh-200px)] flex-col overflow-y-auto"
    >
      {objects.length === 0 ? (
        <li className="px-3 py-4 text-center text-xs text-zinc-500">Chưa có đối tượng nào</li>
      ) : (
        objects.map((obj) => {
          const selected = obj.id === selectedId;
          const onClick = () => handleSelect(obj.id);
          if (renderRow) {
            const custom = renderRow(obj, { selected, onClick });
            if (custom != null) {
              return <React.Fragment key={obj.id}>{custom}</React.Fragment>;
            }
          }
          return (
            <ObjectRow
              key={obj.id}
              obj={obj}
              state={state}
              selected={selected}
              onSelect={handleSelect}
              onToggleVisible={handleToggleVisible}
              onToggleLocked={handleToggleLocked}
              onRename={noop}
              onChangeColor={noop}
              onDelete={handleDelete}
            />
          );
        })
      )}
    </ul>
  );
}
