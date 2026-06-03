'use client';
// src/stamps/shared/StampLeftPanel/Desktop.tsx
//
// Desktop layout cho StampLeftPanel. Render:
//   1. LeftPanelShell chrome + tabs (chỉ render tablist khi có objects)
//   2. Tab "tools": <AxisGridSection> + <ToolGrid> chord-aware
//   3. Tab "objects": optional add buttons + <ObjectListPanel> với custom renderRow

import React, { useEffect, useState } from 'react';
import { LeftPanelShell } from '../../../core/scene/ui/LeftPanelShell';
import { ObjectListPanel } from '../../../core/scene/ui/ObjectListPanel';
import { AxisGridSection } from './AxisGridSection';
import { ToolGrid } from './ToolGrid';
import type { StampLeftPanelProps } from './types';

export function StampLeftPanelDesktop<TKey extends string, TGroup extends string>(
  props: StampLeftPanelProps<TKey, TGroup>,
): React.ReactElement {
  const {
    title,
    icon,
    onClose,
    isDark,
    testId,
    tools,
    groupOrder,
    groupLabels,
    activeTool,
    onToolChange,
    view,
    history,
    chord,
    objects,
    tabs,
  } = props;

  const [tab, setTab] = useState<'tools' | 'objects'>('tools');
  const hasObjects = !!objects;

  useEffect(() => {
    if (!hasObjects && tab === 'objects') setTab('tools');
  }, [hasObjects, tab]);

  const tabSpecs = hasObjects
    ? [
        { key: 'tools' as const, label: tabs?.toolsLabel ?? '🧰 Công cụ', testId: 'tab-tools' },
        { key: 'objects' as const, label: tabs?.objectsLabel ?? '📐 Đối tượng', testId: 'tab-objects' },
      ]
    : undefined;

  return (
    <LeftPanelShell
      title={title}
      icon={icon}
      onClose={onClose}
      isDark={isDark}
      testId={testId ?? 'stamp-left-panel'}
      tabs={tabSpecs}
      activeTab={hasObjects ? tab : undefined}
      onTabChange={hasObjects ? setTab : undefined}
      resizable
      widthStorageKey="xom11.stamp-left-panel.width"
    >
      {(!hasObjects || tab === 'tools') ? (
        <>
          <AxisGridSection view={view} history={history} />
          <ToolGrid
            tools={tools}
            groupOrder={groupOrder}
            groupLabels={groupLabels}
            activeTool={activeTool}
            onToolChange={onToolChange}
            chord={chord}
          />
        </>
      ) : (
        <section data-testid="objects-panel" className="flex flex-col gap-2">
          {objects!.addButtons && objects!.addButtons.length > 0 && (
            <div className="flex gap-1">
              {objects!.addButtons.map((b) => (
                <button
                  key={b.label}
                  type="button"
                  data-testid={b.testId}
                  onClick={b.onClick}
                  className="flex-1 rounded border border-slate-300 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  {b.label}
                </button>
              ))}
            </div>
          )}
          <ObjectListPanel
            store={objects!.store}
            selectedId={objects!.selectedObjectId}
            onSelect={objects!.onObjectSelect}
            renderRow={objects!.renderRow}
          />
        </section>
      )}
    </LeftPanelShell>
  );
}
