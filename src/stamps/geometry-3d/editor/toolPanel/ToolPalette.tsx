'use client';
import * as React from 'react';
import { ToolButton } from './ToolButton';
import { TOOLS, TOOL_GROUPS, type ToolKey } from '../tools/spec';

const ICONS: Partial<Record<ToolKey, string>> = {
  move: '↖', point: '·', pointOnObject: '⊙',
  segment: '—', line: '⟷', ray: '→', vector: '↗',
  polygon: '⬠', plane: '⬜',
  pyramid: '△', prism: '▦', tetrahedron: '◬', cube: '⬛',
  sphere: '●', cylinder: '⌭', cone: '⏶',
};

export interface ToolPaletteProps {
  selected: ToolKey;
  onSelect: (key: ToolKey) => void;
}

export function ToolPalette(props: ToolPaletteProps): React.ReactElement {
  const { selected, onSelect } = props;
  return (
    <div data-testid="tool-palette" className="flex flex-col gap-4 p-3">
      {Object.entries(TOOL_GROUPS).map(([groupLabel, keys]) => (
        <div key={groupLabel}>
          <h4 className="mb-1 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
            {groupLabel}
          </h4>
          <div className="grid grid-cols-3 gap-1.5">
            {keys.map((k) => {
              const tool = TOOLS.find((t) => t.key === k)!;
              return (
                <ToolButton
                  key={k}
                  toolKey={k}
                  label={tool.label}
                  selected={selected === k}
                  onClick={onSelect}
                  icon={ICONS[k]}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
