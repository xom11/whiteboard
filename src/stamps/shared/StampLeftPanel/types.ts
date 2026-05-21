// src/stamps/shared/StampLeftPanel/types.ts
//
// Shared types cho StampLeftPanel template. Dùng generic TKey/TGroup để
// preserve type safety tại call site (host của từng stamp truyền union type
// riêng); internal cài theo string là OK.

import type { ReactNode } from 'react';
import type { Store } from '../../../core/scene/store';
import type { SceneObject } from '../../../core/scene/types';

export const TOOLTIP_DELAY_MS = 400;
export type HoverState = { label: string; hint?: string; x: number; y: number } | null;

/** Tool descriptor unified cho 3 stamp editor. */
export interface StampToolDef<TKey extends string = string, TGroup extends string = string> {
  key: TKey;
  label: string;
  hint?: string;
  icon: ReactNode;
  group: TGroup;
  shortcut?: string;
}

export interface StampLeftPanelTabs {
  /** Label tab "Đối tượng" (default "📐 Đối tượng"). */
  objectsLabel?: ReactNode;
  /** Label tab "Công cụ" (default "🧰 Công cụ"). */
  toolsLabel?: ReactNode;
}

export interface StampLeftPanelViewProps {
  /** Section header label, default "Bố cục". */
  sectionLabel?: string;
  /** Checkbox label cho axis, default "Trục". */
  axisLabel?: string;
  /** Checkbox label cho grid, default "Lưới". */
  gridLabel?: string;
  showAxis: boolean;
  showGrid: boolean;
  onShowAxisChange: (b: boolean) => void;
  onShowGridChange: (b: boolean) => void;
}

export interface StampLeftPanelHistoryProps {
  onUndo: () => void;
  canUndo: boolean;
  onRedo: () => void;
  canRedo: boolean;
}

export interface StampLeftPanelChordProps<TGroup extends string = string> {
  /** Group đang được focus sau khi user bấm letter. null = không active. */
  activeGroup: TGroup | null;
  /** Mapping group → letter hint (vd "P" cho group "point"). */
  letterForGroup: (g: TGroup) => string;
}

export interface StampLeftPanelObjectsProps {
  store: Store;
  selectedObjectId?: string;
  onObjectSelect?: (id: string | null) => void;
  /** Custom row render (vd graph-2d cần FunctionRow/ParameterRow). Trả null để fallback default ObjectRow. */
  renderRow?: (
    obj: SceneObject,
    defaults: { selected: boolean; onClick: () => void },
  ) => ReactNode | null;
  /** Optional buttons phía trên ObjectListPanel (vd graph-2d "+Hàm" "+Tham số"). */
  addButtons?: ReadonlyArray<{ label: string; testId?: string; onClick: () => void }>;
}

export interface StampLeftPanelProps<
  TKey extends string = string,
  TGroup extends string = string,
> {
  // Header
  title: string;
  icon: ReactNode;
  onClose: () => void;
  isDark?: boolean;
  /** data-testid trên <aside> root. Default "stamp-left-panel". */
  testId?: string;

  // Tools (required)
  tools: ReadonlyArray<StampToolDef<TKey, TGroup>>;
  groupOrder: ReadonlyArray<TGroup>;
  groupLabels: Record<TGroup, string>;
  activeTool: TKey;
  onToolChange: (k: TKey) => void;

  // Optional sections
  view?: StampLeftPanelViewProps;
  history?: StampLeftPanelHistoryProps;
  chord?: StampLeftPanelChordProps<TGroup>;
  objects?: StampLeftPanelObjectsProps;
  tabs?: StampLeftPanelTabs;

  // Mobile
  isMobile?: boolean;
  drawerOpen?: boolean;
  onDrawerClose?: () => void;
}
