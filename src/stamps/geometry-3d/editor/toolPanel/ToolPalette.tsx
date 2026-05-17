'use client';
import * as React from 'react';
import { ToolButton } from './ToolButton';
import { ToolIcons } from './icons';
import {
  GROUP_LABELS,
  GROUP_ORDER,
  TOOLS_BY_GROUP,
  letterForGroup,
  type Geom3DGroup,
} from './groups';
import { TOOLS, type ToolKey } from '../tools/spec';

export interface ToolPaletteProps {
  selected: ToolKey;
  onSelect: (key: ToolKey) => void;
  chordGroup?: Geom3DGroup | null;
  onHoverTool?: (info: { label: string; hint?: string; x: number; y: number } | null) => void;
}

export function ToolPalette(props: ToolPaletteProps): React.ReactElement {
  const { selected, onSelect, chordGroup = null, onHoverTool } = props;
  return (
    <div data-testid="tool-palette" className="flex flex-col gap-3">
      {GROUP_ORDER.map((group) => {
        const keys = TOOLS_BY_GROUP[group];
        const isChordActive = chordGroup === group;
        const dimmed = chordGroup !== null && !isChordActive;
        return (
          <section
            key={group}
            data-chord-group={group}
            data-chord-active={isChordActive ? 'true' : 'false'}
            className={[
              'rounded-md transition',
              isChordActive
                ? 'bg-emerald-50 ring-1 ring-emerald-400 p-1'
                : 'p-0',
              dimmed ? 'opacity-55' : 'opacity-100',
            ].join(' ')}
          >
            <h4 className="mb-1.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <span>{GROUP_LABELS[group]}</span>
              <span
                data-testid={`chord-letter-${group}`}
                className={[
                  'font-mono text-[10px] leading-none transition',
                  isChordActive
                    ? 'text-emerald-700 font-bold'
                    : 'text-slate-400',
                ].join(' ')}
              >
                {letterForGroup(group)}
              </span>
            </h4>
            <div className="grid grid-cols-4 gap-1">
              {keys.map((k, i) => {
                const tool = TOOLS.find((t) => t.key === k)!;
                return (
                  <ToolButton
                    key={k}
                    toolKey={k}
                    label={tool.label}
                    selected={selected === k}
                    onClick={onSelect}
                    icon={ToolIcons[k]}
                    chordNum={i + 1}
                    chordActiveGroup={isChordActive}
                    onMouseEnter={(e) =>
                      onHoverTool?.({
                        label: tool.label,
                        hint: tool.hintIdle,
                        x: e.clientX,
                        y: e.clientY,
                      })
                    }
                    onMouseLeave={() => onHoverTool?.(null)}
                  />
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
