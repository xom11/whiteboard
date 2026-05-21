'use client';
// src/stamps/shared/StampLeftPanel/index.tsx
//
// Public API. Dispatch isMobile → Desktop hoặc Mobile.
//
// Usage:
//
//   <StampLeftPanel
//     title="Hình học"
//     icon={<GeomIcon />}
//     tools={TOOLS}                     // ReadonlyArray<StampToolDef>
//     groupOrder={GROUP_ORDER}
//     groupLabels={GROUP_LABELS}
//     activeTool={tool}
//     onToolChange={setTool}
//     view={{ showAxis, showGrid, onShowAxisChange, onShowGridChange }}     // optional
//     history={{ onUndo, canUndo, onRedo, canRedo }}                         // optional
//     chord={{ activeGroup, letterForGroup }}                                // optional
//     objects={{ store, addButtons, renderRow, ... }}                        // optional
//     isMobile={isMobile}
//     drawerOpen={drawerOpen}
//     onDrawerClose={...}
//     onClose={onClose}
//     isDark={isDark}
//   />

import React from 'react';
import { StampLeftPanelDesktop } from './Desktop';
import { StampLeftPanelMobile } from './Mobile';
import type { StampLeftPanelProps } from './types';

export function StampLeftPanel<TKey extends string, TGroup extends string>(
  props: StampLeftPanelProps<TKey, TGroup>,
): React.ReactElement {
  if (props.isMobile) return <StampLeftPanelMobile {...props} />;
  return <StampLeftPanelDesktop {...props} />;
}

export type {
  StampLeftPanelProps,
  StampToolDef,
  StampLeftPanelViewProps,
  StampLeftPanelHistoryProps,
  StampLeftPanelChordProps,
  StampLeftPanelObjectsProps,
  StampLeftPanelTabs,
  HoverState,
} from './types';
export { TOOLTIP_DELAY_MS } from './types';
export { useToolHoverTooltip } from './useToolHoverTooltip';
