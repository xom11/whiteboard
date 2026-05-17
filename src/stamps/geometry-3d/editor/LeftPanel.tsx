'use client';
import * as React from 'react';
import { ToolPalette } from './toolPanel/ToolPalette';
import { AlgebraList } from './algebraPanel/AlgebraList';
import type { Scene3D } from './scene/Scene3D';
import type { ToolKey } from './tools/spec';

export interface LeftPanelProps {
  scene: Scene3D;
  selectedTool: ToolKey;
  onSelectTool: (k: ToolKey) => void;
}

type Tab = 'tools' | 'algebra';

export function LeftPanel(props: LeftPanelProps): React.ReactElement {
  const { scene, selectedTool, onSelectTool } = props;
  const [tab, setTab] = React.useState<Tab>('tools');
  return (
    <div
      data-testid="left-panel"
      className="flex h-full w-[280px] flex-col border-r border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
    >
      <div className="flex border-b border-zinc-200 dark:border-zinc-700">
        <TabButton active={tab === 'tools'} onClick={() => setTab('tools')}>
          🧰 Tools
        </TabButton>
        <TabButton active={tab === 'algebra'} onClick={() => setTab('algebra')}>
          📐 Algebra
        </TabButton>
      </div>
      <div className="flex-1 overflow-y-auto">
        {tab === 'tools' ? (
          <ToolPalette selected={selectedTool} onSelect={onSelectTool} />
        ) : (
          <AlgebraList scene={scene} />
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: React.PropsWithChildren<{ active: boolean; onClick: () => void }>): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        'flex-1 px-3 py-2 text-sm font-medium ' +
        (active
          ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
          : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300')
      }
    >
      {children}
    </button>
  );
}
