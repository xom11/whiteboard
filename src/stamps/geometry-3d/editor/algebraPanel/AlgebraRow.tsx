'use client';
import * as React from 'react';
import type { SceneObject, State } from '../../../../core/scene';
import { symbolicFor, numericFor } from './symbolic';
import { RowMenu } from './RowMenu';

export interface AlgebraRowProps {
  obj: SceneObject;
  state: State;
  onDelete: (id: string) => void;
}

export function AlgebraRow(props: AlgebraRowProps): React.ReactElement {
  const { obj, state, onDelete } = props;
  const symbolic = symbolicFor(obj, state);
  const numeric = numericFor(obj, state);
  const color = (obj.attrs as { color?: string }).color ?? '#0066cc';
  return (
    <li
      data-testid={`algebra-row-${obj.id}`}
      className="flex items-center gap-2 border-b border-zinc-100 px-3 py-1.5 text-xs dark:border-zinc-800"
    >
      <span
        aria-hidden
        className="inline-block size-3 rounded-full border"
        style={{ backgroundColor: color }}
      />
      <span className="min-w-[3ch] font-semibold">{obj.label}</span>
      <span className="text-zinc-500">=</span>
      <span className="flex-1 truncate font-mono">{symbolic}</span>
      {numeric ? <span className="truncate text-zinc-500">{numeric}</span> : null}
      <RowMenu
        visible={obj.visible}
        onRename={() => { /* no-op for now; wired in EditorPanel later */ }}
        onChangeColor={() => { /* no-op */ }}
        onToggleVisibility={() => { /* no-op */ }}
        onDelete={() => onDelete(obj.id)}
      />
    </li>
  );
}
