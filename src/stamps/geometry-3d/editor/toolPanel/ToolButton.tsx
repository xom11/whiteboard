'use client';
import * as React from 'react';
import type { ToolKey } from '../tools/spec';

export interface ToolButtonProps {
  toolKey: ToolKey;
  label: string;
  selected: boolean;
  onClick: (key: ToolKey) => void;
  icon?: React.ReactNode;
}

export function ToolButton(props: ToolButtonProps): React.ReactElement {
  const { toolKey, label, selected, onClick, icon } = props;
  return (
    <button
      type="button"
      data-tool-key={toolKey}
      aria-pressed={selected}
      onClick={() => onClick(toolKey)}
      className={
        'flex flex-col items-center justify-center gap-1 rounded-md border p-2 text-xs ' +
        (selected
          ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200'
          : 'border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800')
      }
      style={{ width: 80, height: 72 }}
    >
      <span aria-hidden className="text-lg">{icon ?? '⬛'}</span>
      <span className="text-center leading-tight">{label}</span>
    </button>
  );
}
