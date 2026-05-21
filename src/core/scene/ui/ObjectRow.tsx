'use client';
import * as React from 'react';
import type { SceneObject, State } from '../types';
import { getKind } from '../registry';
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

function formatMeasure(items: { label: string; value: number }[]): string {
  return items.map((it) => `${it.label} = ${it.value.toFixed(2)}`).join(', ');
}

export function ObjectRow(props: ObjectRowProps): React.ReactElement {
  const { obj, state, selected, onSelect, onToggleVisible, onToggleLocked, onRename, onChangeColor, onDelete } = props;

  let summary = '';
  try {
    summary = getKind(obj.kind).describe(obj);
  } catch {
    summary = obj.label;
  }

  let detail: string | null = null;
  if (selected) {
    try {
      const measure = getKind(obj.kind).measure?.(obj, state);
      if (measure && measure.length > 0) detail = formatMeasure(measure);
    } catch {
      detail = null;
    }
  }

  const color = (obj.attrs as { color?: string }).color ?? '#888888';

  return (
    <li
      data-testid={`object-row-${obj.id}`}
      aria-selected={selected}
      className={
        'flex flex-col border-b border-zinc-100 dark:border-zinc-800 ' +
        (selected ? 'bg-blue-50 dark:bg-blue-950' : 'hover:bg-zinc-50 dark:hover:bg-zinc-900')
      }
    >
      <div
        className="flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer"
        onClick={() => onSelect(obj.id)}
      >
        <button
          type="button"
          aria-label="Toggle visibility"
          aria-pressed={!obj.visible}
          onClick={(e) => { e.stopPropagation(); onToggleVisible(obj.id); }}
          className="h-4 w-4 shrink-0 rounded-full border-2 transition"
          style={{
            backgroundColor: obj.visible ? color : 'transparent',
            borderColor: color,
          }}
        />
        <span className="flex-1 truncate text-zinc-700 dark:text-zinc-200">
          <span className="font-semibold">{obj.label}</span>
          <span className="ml-1 text-zinc-500 dark:text-zinc-400">{summary}</span>
        </span>
        <ObjectRowMenu
          locked={obj.locked}
          onToggleLocked={() => onToggleLocked(obj.id)}
          onRename={() => onRename(obj.id)}
          onChangeColor={() => onChangeColor(obj.id)}
          onDelete={() => onDelete(obj.id)}
        />
      </div>
      {detail && (
        <div
          data-testid={`object-row-detail-${obj.id}`}
          className="pl-9 pr-3 pb-1.5 text-[11px] text-zinc-500 dark:text-zinc-400"
        >
          {detail}
        </div>
      )}
    </li>
  );
}
