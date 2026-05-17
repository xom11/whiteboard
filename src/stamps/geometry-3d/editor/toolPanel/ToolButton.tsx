'use client';
import * as React from 'react';
import type { ToolKey } from '../tools/spec';

export interface ToolButtonProps {
  toolKey: ToolKey;
  label: string;
  selected: boolean;
  onClick: (key: ToolKey) => void;
  icon?: React.ReactNode;
  /** Chord-mode positional digit (1..9) overlaid bottom-right. */
  chordNum?: number | null;
  /** Highlight ring when its parent group is the active chord group. */
  chordActiveGroup?: boolean;
  onMouseEnter?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onMouseLeave?: () => void;
}

export function ToolButton(props: ToolButtonProps): React.ReactElement {
  const {
    toolKey,
    label,
    selected,
    onClick,
    icon,
    chordNum,
    chordActiveGroup,
    onMouseEnter,
    onMouseLeave,
  } = props;
  return (
    <button
      type="button"
      data-tool-key={toolKey}
      data-testid={`tool-${toolKey}`}
      aria-label={label}
      aria-pressed={selected}
      onClick={() => onClick(toolKey)}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={[
        'relative flex aspect-square items-center justify-center rounded-md transition',
        selected
          ? 'bg-emerald-600 text-white shadow-sm'
          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900',
      ].join(' ')}
    >
      <span aria-hidden className="inline-flex">
        {icon ?? null}
      </span>
      {chordNum != null && (
        <span
          data-testid={`chord-num-${toolKey}`}
          className={[
            'pointer-events-none absolute bottom-0 right-0.5 font-mono text-[9px] leading-none transition',
            selected
              ? 'text-white/70'
              : chordActiveGroup
                ? 'text-emerald-700'
                : 'text-slate-300',
          ].join(' ')}
        >
          {chordNum}
        </span>
      )}
    </button>
  );
}
