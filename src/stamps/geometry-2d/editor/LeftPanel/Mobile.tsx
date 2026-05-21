'use client';
import React, { useMemo } from 'react';
import { TOOLS, GROUP_LABELS, type GeomTool, type ToolDef } from '../MiniBoard';
import { MobileToolDrawer, type MobileToolGroup } from '../../../shared/MobileToolDrawer';
import { ObjectListPanel } from '../../../../core/scene/ui/ObjectListPanel';
import { AxisIcon, GeometryIconHeader, GridIcon, RedoIcon, UndoIcon } from './icons';
import type { GeometryLeftPanelProps } from './types';

export function MobileGeometryPanel(props: GeometryLeftPanelProps) {
  const {
    activeTool,
    onToolChange,
    showAxis,
    showGrid,
    onShowAxisChange,
    onShowGridChange,
    onUndo,
    canUndo,
    onRedo,
    canRedo,
    isDark,
    drawerOpen,
    onDrawerClose,
    store,
    selectedObjectId,
    onObjectSelect,
  } = props;

  const groups = useMemo<MobileToolGroup<GeomTool, ToolDef['group']>[]>(() => {
    const acc = new Map<ToolDef['group'], ToolDef[]>();
    for (const t of TOOLS) {
      if (!acc.has(t.group)) acc.set(t.group, []);
      acc.get(t.group)!.push(t);
    }
    return Array.from(acc.entries()).map(([group, tools]) => ({
      group,
      groupLabel: GROUP_LABELS[group],
      tools: tools.map((t) => ({ key: t.key, label: t.label, icon: t.icon })),
    }));
  }, []);

  return (
    <MobileToolDrawer
      title="Hình học"
      headerIcon={GeometryIconHeader}
      testId="stamp-left-panel"
      isDark={isDark}
      drawerOpen={!!drawerOpen}
      onDrawerClose={() => onDrawerClose?.()}
      chips={[
        {
          label: 'Trục',
          icon: <AxisIcon />,
          pressed: showAxis,
          onToggle: onShowAxisChange,
          testId: 'toggle-axis',
        },
        {
          label: 'Lưới',
          icon: <GridIcon />,
          pressed: showGrid,
          onToggle: onShowGridChange,
          testId: 'toggle-grid',
        },
      ]}
      actions={[
        {
          label: 'Hoàn tác',
          title: 'Hoàn tác (Ctrl/Cmd+Z)',
          icon: <UndoIcon />,
          onClick: onUndo,
          disabled: !canUndo,
        },
        {
          label: 'Làm lại',
          title: 'Làm lại (Ctrl/Cmd+Shift+Z)',
          icon: <RedoIcon />,
          onClick: onRedo,
          disabled: !canRedo,
        },
      ]}
      groups={groups}
      activeTool={activeTool}
      onToolSelect={onToolChange}
      objectsTab={
        store
          ? {
              label: '📐 Đối tượng',
              render: () => (
                <ObjectListPanel store={store} selectedId={selectedObjectId} onSelect={onObjectSelect} />
              ),
            }
          : undefined
      }
    />
  );
}
