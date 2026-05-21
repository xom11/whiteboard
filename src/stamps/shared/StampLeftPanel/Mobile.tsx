'use client';
// src/stamps/shared/StampLeftPanel/Mobile.tsx
//
// Mobile layout: wrap shared MobileToolDrawer với mapping:
//   chips    = axis/grid (from view)
//   actions  = undo/redo (from history)
//   groups   = tools grouped by group
//   objects  = objectsTab (objects.store + addButtons + custom renderRow)

import React, { useMemo } from 'react';
import { MobileToolDrawer, type MobileToolGroup } from '../MobileToolDrawer';
import { ObjectListPanel } from '../../../core/scene/ui/ObjectListPanel';
import type { StampLeftPanelProps } from './types';

function AxisIcon(): React.ReactElement {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="4" y1="20" x2="20" y2="20" />
      <line x1="4" y1="20" x2="4" y2="4" />
      <polyline points="2 6 4 4 6 6" />
      <polyline points="18 18 20 20 18 22" />
    </svg>
  );
}

function GridIcon(): React.ReactElement {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="1" />
      <line x1="4" y1="10" x2="20" y2="10" />
      <line x1="4" y1="16" x2="20" y2="16" />
      <line x1="10" y1="4" x2="10" y2="20" />
      <line x1="16" y1="4" x2="16" y2="20" />
    </svg>
  );
}

function UndoIcon(): React.ReactElement {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 10 L8 5 L8 8 L15 8 A5 5 0 0 1 20 13 L20 16" />
      <path d="M3 10 L8 15 L8 12" />
    </svg>
  );
}

function RedoIcon(): React.ReactElement {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 10 L16 5 L16 8 L9 8 A5 5 0 0 0 4 13 L4 16" />
      <path d="M21 10 L16 15 L16 12" />
    </svg>
  );
}

export function StampLeftPanelMobile<TKey extends string, TGroup extends string>(
  props: StampLeftPanelProps<TKey, TGroup>,
): React.ReactElement {
  const {
    title,
    icon,
    isDark,
    testId,
    tools,
    groupOrder,
    groupLabels,
    activeTool,
    onToolChange,
    view,
    history,
    objects,
    tabs,
    drawerOpen,
    onDrawerClose,
  } = props;

  const groups = useMemo<MobileToolGroup<TKey, TGroup>[]>(() => {
    const acc = new Map<TGroup, typeof tools[number][]>();
    for (const t of tools) {
      if (!acc.has(t.group)) acc.set(t.group, []);
      acc.get(t.group)!.push(t);
    }
    // Preserve groupOrder
    return groupOrder
      .filter((g) => acc.has(g))
      .map((group) => ({
        group,
        groupLabel: groupLabels[group],
        tools: acc.get(group)!.map((t) => ({ key: t.key, label: t.label, icon: t.icon })),
      }));
  }, [tools, groupOrder, groupLabels]);

  const chips = view
    ? [
        {
          label: view.axisLabel ?? 'Trục',
          icon: <AxisIcon />,
          pressed: view.showAxis,
          onToggle: view.onShowAxisChange,
          testId: 'toggle-axis',
        },
        {
          label: view.gridLabel ?? 'Lưới',
          icon: <GridIcon />,
          pressed: view.showGrid,
          onToggle: view.onShowGridChange,
          testId: 'toggle-grid',
        },
      ]
    : [];

  const actions = history
    ? [
        {
          label: 'Hoàn tác',
          title: 'Hoàn tác (Ctrl/Cmd+Z)',
          icon: <UndoIcon />,
          onClick: history.onUndo,
          disabled: !history.canUndo,
          testId: 'undo-btn',
        },
        {
          label: 'Làm lại',
          title: 'Làm lại (Ctrl/Cmd+Shift+Z)',
          icon: <RedoIcon />,
          onClick: history.onRedo,
          disabled: !history.canRedo,
          testId: 'redo-btn',
        },
      ]
    : [];

  return (
    <MobileToolDrawer
      title={title}
      headerIcon={icon}
      testId={testId ?? 'stamp-left-panel'}
      isDark={isDark}
      drawerOpen={!!drawerOpen}
      onDrawerClose={() => onDrawerClose?.()}
      chips={chips}
      actions={actions}
      groups={groups}
      activeTool={activeTool}
      onToolSelect={onToolChange}
      objectsTab={
        objects
          ? {
              label: tabs?.objectsLabel ?? '📐 Đối tượng',
              render: () => (
                <div className="flex flex-col gap-2 px-3">
                  {objects.addButtons && objects.addButtons.length > 0 && (
                    <div className="flex gap-1 pt-3">
                      {objects.addButtons.map((b) => (
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
                    store={objects.store}
                    selectedId={objects.selectedObjectId}
                    onSelect={objects.onObjectSelect}
                    renderRow={objects.renderRow}
                  />
                </div>
              ),
            }
          : undefined
      }
    />
  );
}
