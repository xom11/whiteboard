'use client';
import * as React from 'react';
import type { SceneObject, State } from '../types';
import { getKind } from '../registry';
import { getKindUiMeta } from './kindMeta';
import { ObjectRowMenu } from './ObjectRowMenu';

export interface ObjectRowProps {
  obj: SceneObject;
  state: State;
  selected: boolean;
  onSelect: (id: string) => void;
  onToggleVisible: (id: string) => void;
  onToggleLocked: (id: string) => void;
  onRename: (id: string) => void;
  onChangeColor: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ObjectRow(props: ObjectRowProps): React.ReactElement {
  const { obj, selected, onSelect, onToggleVisible, onToggleLocked, onRename, onChangeColor, onDelete } = props;
  const meta = getKindUiMeta(obj.kind);

  let summary = '';
  try {
    summary = getKind(obj.kind).describe(obj);
  } catch {
    summary = obj.label;
  }

  return (
    <li
      data-testid={`object-row-${obj.id}`}
      aria-selected={selected}
      onClick={() => onSelect(obj.id)}
      className={
        'flex items-center gap-2 border-b border-zinc-100 px-3 py-1.5 text-xs cursor-pointer dark:border-zinc-800 ' +
        (selected ? 'bg-blue-50 dark:bg-blue-950' : 'hover:bg-zinc-50 dark:hover:bg-zinc-900')
      }
    >
      <span aria-hidden className="inline-block w-4 text-center text-base leading-none">{meta.icon}</span>
      <span className="min-w-[3ch] font-semibold">{obj.label}</span>
      <span className="flex-1 truncate text-zinc-500">{summary}</span>
      <button
        type="button"
        aria-label="Toggle visibility"
        aria-pressed={!obj.visible}
        onClick={(e) => { e.stopPropagation(); onToggleVisible(obj.id); }}
        className="rounded px-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        {obj.visible ? '👁' : '🚫'}
      </button>
      <button
        type="button"
        aria-label="Toggle lock"
        aria-pressed={obj.locked}
        onClick={(e) => { e.stopPropagation(); onToggleLocked(obj.id); }}
        className="rounded px-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        {obj.locked ? '🔒' : '🔓'}
      </button>
      <ObjectRowMenu
        onRename={() => onRename(obj.id)}
        onChangeColor={() => onChangeColor(obj.id)}
        onDelete={() => onDelete(obj.id)}
      />
    </li>
  );
}
