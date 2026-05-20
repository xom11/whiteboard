'use client';
import * as React from 'react';
import { createPortal } from 'react-dom';
import { ToolPalette } from './toolPanel/ToolPalette';
import { ObjectListPanel } from '../../../core/scene/ui/ObjectListPanel';
import { ToolIcons } from './toolPanel/icons';
import {
  GROUP_LABELS,
  GROUP_ORDER,
  TOOLS_BY_GROUP,
  letterForGroup,
  type Geom3DGroup,
} from './toolPanel/groups';
import type { Store } from '../../../core/scene';
import { TOOLS, type ToolKey } from './tools/spec';
import {
  MobileToolDrawer,
  type MobileToolGroup,
} from '../../shared/MobileToolDrawer';
import { LeftPanelShell, Section } from '../../../core/scene/ui/LeftPanelShell';

const TOOLTIP_DELAY_MS = 400;

type HoverState = { label: string; hint?: string; x: number; y: number } | null;

export interface LeftPanelProps {
  store: Store;
  selectedTool: ToolKey;
  onSelectTool: (k: ToolKey) => void;
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
  chordGroup?: Geom3DGroup | null;
  /** Currently selected object id (for ObjectListPanel row highlight). */
  selectedObjectId?: string;
  /** Called when user clicks a row in ObjectListPanel. */
  onObjectSelect?: (id: string) => void;
}

const Geom3DIconHeader = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 9 L4 20 L14 20 L14 9 Z" />
    <path d="M4 9 L10 4 L20 4 L14 9 Z" />
    <path d="M14 9 L20 4 L20 15 L14 20 Z" />
  </svg>
);

function AxisIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="4" y1="20" x2="20" y2="20" />
      <line x1="4" y1="20" x2="4" y2="4" />
      <line x1="4" y1="20" x2="16" y2="8" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 8 L20 4" />
      <path d="M4 14 L20 10" />
      <path d="M4 20 L20 16" />
      <path d="M4 8 L4 20" />
      <path d="M12 6 L12 18" />
      <path d="M20 4 L20 16" />
    </svg>
  );
}

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


function useToolHoverTooltip() {
  const [hover, setHover] = React.useState<HoverState>(null);
  const [portalReady, setPortalReady] = React.useState(false);
  const hoverTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    setPortalReady(true);
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  const showHover = React.useCallback((next: NonNullable<HoverState>) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => setHover(next), TOOLTIP_DELAY_MS);
  }, []);

  const hideHover = React.useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setHover(null);
  }, []);

  return { hover, portalReady, showHover, hideHover };
}

type Tab = 'tools' | 'algebra';

function DesktopPanel(props: LeftPanelProps) {
  const {
    store,
    selectedTool,
    onSelectTool,
    showAxis,
    showGrid,
    onShowAxisChange,
    onShowGridChange,
    onUndo,
    canUndo,
    onRedo,
    canRedo,
    onClose,
    isDark,
    chordGroup,
    selectedObjectId,
    onObjectSelect,
  } = props;
  const [tab, setTab] = React.useState<Tab>('tools');
  const { hover, portalReady, showHover, hideHover } = useToolHoverTooltip();

  return (
    <>
      <LeftPanelShell
        title="Hình học 3D"
        icon={Geom3DIconHeader}
        onClose={onClose}
        isDark={isDark}
        tabs={[
          { key: 'tools', label: '🧰 Công cụ', testId: 'tab-tools' },
          { key: 'algebra', label: '📐 Đối tượng', testId: 'tab-algebra' },
        ]}
        activeTab={tab}
        onTabChange={setTab}
      >
        {tab === 'tools' ? (
          <>
            <Section label="Góc nhìn">
              <div className="flex items-center gap-3 text-[11px] text-slate-700">
                <label className="inline-flex select-none items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={showAxis}
                    onChange={(e) => onShowAxisChange(e.target.checked)}
                    data-testid="toggle-axis"
                  />
                  Trục
                </label>
                <label className="inline-flex select-none items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={showGrid}
                    onChange={(e) => onShowGridChange(e.target.checked)}
                    data-testid="toggle-grid"
                  />
                  Lưới
                </label>
                <div className="ml-auto flex items-center gap-0.5">
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
            </Section>

            <ToolPalette
              selected={selectedTool}
              onSelect={onSelectTool}
              chordGroup={chordGroup ?? null}
              onHoverTool={(info) => (info ? showHover(info) : hideHover())}
            />

            {chordGroup && (
              <div
                data-testid="chord-hint"
                className="rounded border border-emerald-200 bg-emerald-50/60 px-2 py-1 text-[11px] leading-snug text-slate-600"
              >
                <span className="font-mono font-semibold text-emerald-700">
                  {letterForGroup(chordGroup)}
                </span>
                <span className="ml-1.5">
                  → {GROUP_LABELS[chordGroup]}. Bấm số 1-9 để chọn công cụ, Esc huỷ.
                </span>
              </div>
            )}
          </>
        ) : (
          <section data-testid="algebra-panel">
            <ObjectListPanel
              store={store}
              selectedId={selectedObjectId}
              onSelect={onObjectSelect}
            />
          </section>
        )}
      </LeftPanelShell>
      {portalReady && hover && typeof document !== 'undefined'
        ? createPortal(
            <div
              role="tooltip"
              className="pointer-events-none fixed w-max max-w-[220px] rounded-md bg-slate-900 px-2 py-1 text-left text-[11px] leading-tight text-white shadow-lg"
              style={{
                left: hover.x + 8,
                top: hover.y,
                transform: 'translate(0, -50%)',
                zIndex: 2147483600,
              }}
            >
              <span className="block font-medium">{hover.label}</span>
              {hover.hint && <span className="mt-0.5 block text-slate-300">{hover.hint}</span>}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function MobilePanel(props: LeftPanelProps) {
  const {
    selectedTool,
    onSelectTool,
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
  } = props;

  const groups = React.useMemo<MobileToolGroup<ToolKey, Geom3DGroup>[]>(
    () =>
      GROUP_ORDER.map((group) => {
        const keys = TOOLS_BY_GROUP[group];
        return {
          group,
          groupLabel: GROUP_LABELS[group],
          tools: keys.map((k) => {
            const tool = TOOLS.find((t) => t.key === k)!;
            return { key: k, label: tool.label, icon: ToolIcons[k] };
          }),
        };
      }),
    [],
  );

  return (
    <MobileToolDrawer
      title="Hình học 3D"
      headerIcon={Geom3DIconHeader}
      testId="left-panel"
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
          testId: 'undo-btn',
        },
        {
          label: 'Làm lại',
          title: 'Làm lại (Ctrl/Cmd+Shift+Z)',
          icon: <RedoIcon />,
          onClick: onRedo,
          disabled: !canRedo,
          testId: 'redo-btn',
        },
      ]}
      groups={groups}
      activeTool={selectedTool}
      onToolSelect={onSelectTool}
    />
  );
}

export function LeftPanel(props: LeftPanelProps): React.ReactElement {
  if (props.isMobile) return <MobilePanel {...props} />;
  return <DesktopPanel {...props} />;
}
