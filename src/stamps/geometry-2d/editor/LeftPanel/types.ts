// src/stamps/geometry-2d/editor/LeftPanel/types.ts
import type { Store } from '../../../../core/scene/store';
import type { GeomTool } from '../MiniBoard';
import type { GeomGroup } from '../tools';

export const TOOLTIP_DELAY_MS = 400;
export type HoverState = { label: string; hint?: string; x: number; y: number } | null;

export interface GeometryLeftPanelProps {
  activeTool: GeomTool;
  onToolChange: (t: GeomTool) => void;
  showAxis: boolean;
  showGrid: boolean;
  onShowAxisChange: (b: boolean) => void;
  onShowGridChange: (b: boolean) => void;
  onUndo: () => void;
  canUndo: boolean;
  onRedo: () => void;
  canRedo: boolean;
  onClose: () => void;
  isDark?: boolean;
  isMobile?: boolean;
  drawerOpen?: boolean;
  onDrawerClose?: () => void;
  /** Chord shortcut: group đang được focus (sau khi bấm letter). null = không active. */
  chordGroup?: GeomGroup | null;
  /** Scene store — bật tab "Đối tượng" khi truyền. */
  store?: Store;
  selectedObjectId?: string;
  onObjectSelect?: (id: string | null) => void;
}

export const TOOLS_TABS = [
  { key: 'tools' as const, label: '🧰 Công cụ', testId: 'tab-tools' },
  { key: 'objects' as const, label: '📐 Đối tượng', testId: 'tab-objects' },
];
