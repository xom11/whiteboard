'use client';
import * as React from 'react';
import type { Store } from '../../../../core/scene';
import { listObjects } from '../../../../core/scene';
import { AlgebraRow } from './AlgebraRow';

export interface AlgebraListProps {
  store: Store;
}

export function AlgebraList(props: AlgebraListProps): React.ReactElement {
  const { store } = props;
  const state = React.useSyncExternalStore(store.subscribe, store.getState, store.getState);
  const objects = listObjects(state);

  return (
    <ul
      data-testid="algebra-list"
      className="flex max-h-[calc(100vh-200px)] flex-col overflow-y-auto"
    >
      {objects.length === 0 ? (
        <li className="px-3 py-4 text-center text-xs text-zinc-500">Chưa có đối tượng nào</li>
      ) : (
        objects.map((o) => (
          <AlgebraRow
            key={o.id}
            obj={o}
            state={state}
            onDelete={(id) => store.dispatch({ type: 'DELETE', payload: { id } })}
          />
        ))
      )}
    </ul>
  );
}
