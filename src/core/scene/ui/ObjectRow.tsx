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

function formatMeasure(items: { label: string; value: number }[]): string {
  return items.map((it) => `${it.label} = ${it.value.toFixed(2)}`).join(', ');
}

export function ObjectRow(props: ObjectRowProps): React.ReactElement {
  const { obj, state, selected, onSelect, onToggleVisible, onToggleLocked, onRename, onChangeColor, onDelete } = props;

  const meta = getKindUiMeta(obj.kind);

  let title = '';
  try {
    title = getKind(obj.kind).describe(obj, state);
  } catch {
    title = `${meta.displayName} ${obj.label}`;
  }

  let measureText: string | null = null;
  if (selected) {
    try {
      const m = getKind(obj.kind).measure?.(obj, state);
      if (m && m.length > 0) measureText = formatMeasure(m);
    } catch {
      measureText = null;
    }
  }

  const color = (obj.attrs as { color?: string }).color ?? meta.defaultColor;

  return (
    <li
      data-testid={`object-row-${obj.id}`}
      aria-selected={selected}
      onClick={() => onSelect(obj.id)}
      className={
        'flex flex-col border-b border-zinc-100 cursor-pointer dark:border-zinc-800 ' +
        (selected ? 'bg-blue-50 dark:bg-blue-950' : '')
      }
    >
      <div className="flex items-center gap-2 px-3 py-1.5 text-xs">
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
        <span className="flex-1 truncate text-black dark:text-white">
          {title}
        </span>
        <ObjectRowMenu
          locked={obj.locked}
          onToggleLocked={() => onToggleLocked(obj.id)}
          onRename={() => onRename(obj.id)}
          onChangeColor={() => onChangeColor(obj.id)}
          onDelete={() => onDelete(obj.id)}
        />
      </div>
      {selected && measureText && (
        <div
          data-testid={`object-row-detail-${obj.id}`}
          className="pl-9 pr-3 pb-1.5 text-[11px] text-black dark:text-white"
        >
          {measureText}
        </div>
      )}
    </li>
  );
}
