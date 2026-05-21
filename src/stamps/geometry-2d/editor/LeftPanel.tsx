'use client';
import React from 'react';
import { DesktopGeometryPanel } from './LeftPanel/Desktop';
import { MobileGeometryPanel } from './LeftPanel/Mobile';
import type { GeometryLeftPanelProps } from './LeftPanel/types';

export { UndoIcon, RedoIcon } from './LeftPanel/icons';

export function LeftPanel(props: GeometryLeftPanelProps) {
  if (props.isMobile) {
    return <MobileGeometryPanel {...props} />;
  }
  return <DesktopGeometryPanel {...props} />;
}

// Alias for back-compat
export { LeftPanel as GeometryLeftPanel };
