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
  onUndo: () => void;
  canUndo: boolean;
  onRedo: () => void;
  canRedo: boolean;
}

type Tab = 'tools' | 'algebra';

export function UndoIcon(): React.ReactElement {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 10 L8 5 L8 8 L15 8 A5 5 0 0 1 20 13 L20 16" />
      <path d="M3 10 L8 15 L8 12" />
    </svg>
  );
}

export function RedoIcon(): React.ReactElement {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 10 L16 5 L16 8 L9 8 A5 5 0 0 0 4 13 L4 16" />
      <path d="M21 10 L16 15 L16 12" />
    </svg>
  );
}

export function LeftPanel(props: LeftPanelProps): React.ReactElement {
  const { scene, selectedTool, onSelectTool, onUndo, canUndo, onRedo, canRedo } = props;
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
        <div className="flex items-center gap-0.5 px-1">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            title="Hoàn tác (Ctrl/Cmd+Z)"
            aria-label="Hoàn tác"
            data-testid="undo-btn"
            className="inline-flex items-center justify-center rounded p-1 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
          >
            <UndoIcon />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            title="Làm lại (Ctrl/Cmd+Shift+Z)"
            aria-label="Làm lại"
            data-testid="redo-btn"
            className="inline-flex items-center justify-center rounded p-1 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
          >
            <RedoIcon />
          </button>
        </div>
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
