'use client';
import React, { useState } from 'react';
import { LeftPanelShell } from '../../../core/scene/ui/LeftPanelShell';
import { ObjectListPanel } from '../../../core/scene/ui/ObjectListPanel';
import type { Store } from '../../../core/scene/store';
import type { SceneObject } from '../../../core/scene/types';
import type { GraphTool } from './tools';
import { TOOLS, GROUP_LABELS, GROUPS } from './tools';
import { FunctionRow } from './rows/FunctionRow';
import { ParameterRow } from './rows/ParameterRow';
import type { Function2DAttrs } from '../../../core/scene/kinds/function2d';
import type { ParameterAttrs } from '../../../core/scene/kinds/parameter';
import { ObjectRow } from '../../../core/scene/ui/ObjectRow';

// ---------- Icons ----------

const GraphIconHeader = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3 L3 21 L21 21" />
    <path d="M6 14 Q9 8 12 10 Q15 12 18 6" />
  </svg>
);

// ---------- Tabs ----------

const PANEL_TABS = [
  { key: 'tools' as const, label: '🧰 Công cụ', testId: 'tab-tools' },
  { key: 'objects' as const, label: '📐 Đối tượng', testId: 'tab-objects' },
] as const;

// ---------- Props ----------

export interface GraphLeftPanelProps {
  store: Store;
  activeTool: GraphTool;
  onToolChange: (t: GraphTool) => void;
  onAddFunction: () => void;
  onAddParameter: () => void;
  onClose: () => void;
  isDark?: boolean;
  selectedObjectId?: string;
  onObjectSelect?: (id: string | null) => void;
}

// ---------- renderRow for graph kinds ----------

function makeRenderRow(store: Store) {
  return function renderRow(
    obj: SceneObject,
    defaults: { selected: boolean; onClick: () => void },
  ): React.ReactNode {
    if (obj.kind === 'function2d') {
      return (
        <FunctionRow
          obj={obj as unknown as SceneObject<Function2DAttrs>}
          store={store}
          selected={defaults.selected}
          onClick={defaults.onClick}
        />
      );
    }
    if (obj.kind === 'parameter') {
      return (
        <ParameterRow
          obj={obj as unknown as SceneObject<ParameterAttrs>}
          store={store}
          selected={defaults.selected}
          onClick={defaults.onClick}
        />
      );
    }
    // Fallback to default ObjectRow for other kinds (point, segment, etc.)
    return null;
  };
}

// ---------- Tool button strip ----------

function ToolStrip({
  activeTool,
  onToolChange,
}: {
  activeTool: GraphTool;
  onToolChange: (t: GraphTool) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {GROUPS.map((group) => {
        const groupTools = TOOLS.filter((t) => t.group === group);
        if (groupTools.length === 0) return null;
        return (
          <section key={group}>
            <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {GROUP_LABELS[group]}
            </h4>
            <div className="grid grid-cols-4 gap-1">
              {groupTools.map((t) => {
                const active = activeTool === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    aria-label={t.label}
                    aria-pressed={active}
                    title={t.title + (t.shortcut ? ` (${t.shortcut})` : '')}
                    data-tool={t.id}
                    onClick={() => onToolChange(t.id)}
                    className={[
                      'flex h-8 items-center justify-center rounded-md text-[10px] transition',
                      active
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900',
                    ].join(' ')}
                  >
                    {t.label.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// ---------- Objects tab ----------

function ObjectsTab({
  store,
  selectedObjectId,
  onObjectSelect,
  onAddFunction,
  onAddParameter,
}: {
  store: Store;
  selectedObjectId?: string;
  onObjectSelect?: (id: string | null) => void;
  onAddFunction: () => void;
  onAddParameter: () => void;
}) {
  const renderRow = makeRenderRow(store);

  return (
    <div className="flex flex-col gap-2">
      {/* Add buttons */}
      <div className="flex gap-1">
        <button
          type="button"
          data-testid="add-function-btn"
          onClick={onAddFunction}
          className="flex-1 rounded border border-blue-300 bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700 transition hover:bg-blue-100"
          title="Thêm hàm số f(x)"
        >
          + Hàm f(x)
        </button>
        <button
          type="button"
          data-testid="add-parameter-btn"
          onClick={onAddParameter}
          className="flex-1 rounded border border-slate-300 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 transition hover:bg-slate-100"
          title="Thêm tham số slider"
        >
          + Tham số
        </button>
      </div>

      {/* Object list */}
      <ObjectListPanel
        store={store}
        selectedId={selectedObjectId}
        onSelect={onObjectSelect}
        renderRow={renderRow}
      />
    </div>
  );
}

// ---------- Public component ----------

export function GraphLeftPanel(props: GraphLeftPanelProps): React.ReactElement {
  const {
    store,
    activeTool,
    onToolChange,
    onAddFunction,
    onAddParameter,
    onClose,
    isDark,
    selectedObjectId,
    onObjectSelect,
  } = props;

  const [tab, setTab] = useState<'tools' | 'objects'>('tools');

  return (
    <LeftPanelShell
      title="Đồ thị"
      icon={GraphIconHeader}
      onClose={onClose}
      isDark={isDark}
      testId="stamp-left-panel"
      tabs={PANEL_TABS}
      activeTab={tab}
      onTabChange={setTab}
    >
      {tab === 'tools' ? (
        <ToolStrip activeTool={activeTool} onToolChange={onToolChange} />
      ) : (
        <ObjectsTab
          store={store}
          selectedObjectId={selectedObjectId}
          onObjectSelect={onObjectSelect}
          onAddFunction={onAddFunction}
          onAddParameter={onAddParameter}
        />
      )}
    </LeftPanelShell>
  );
}
