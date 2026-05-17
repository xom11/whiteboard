'use client';
import * as React from 'react';
import { createPortal } from 'react-dom';
import { ToolPalette } from './toolPanel/ToolPalette';
import { AlgebraList } from './algebraPanel/AlgebraList';
import { ToolIcons } from './toolPanel/icons';
import {
  GROUP_LABELS,
  GROUP_ORDER,
  TOOLS_BY_GROUP,
  letterForGroup,
  type Geom3DGroup,
} from './toolPanel/groups';
import type { Scene3D } from './scene/Scene3D';
import { TOOLS, type ToolKey } from './tools/spec';
import {
  MobileToolDrawer,
  type MobileToolGroup,
} from '../../shared/MobileToolDrawer';

const TOOLTIP_DELAY_MS = 400;

type HoverState = { label: string; hint?: string; x: number; y: number } | null;

export interface LeftPanelProps {
  scene: Scene3D;
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

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}

interface ShellProps {
  title: string;
  icon: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  isDark?: boolean;
}

function Shell({ title, icon, onClose, children, isDark }: ShellProps) {
  return (
    <aside
      role="complementary"
      aria-label={title}
      data-testid="left-panel"
      data-stamp-area="true"
      className={[
        isDark ? 'theme--dark ' : '',
        'absolute left-0 top-0 z-30 flex h-full w-60 flex-col border-r border-slate-200 bg-white shadow-md animate-in slide-in-from-left duration-200',
      ].join('')}
    >
      <header className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-3 py-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <span className="text-base leading-none">{icon}</span>
          {title}
        </h3>
        <button
          onClick={onClose}
          aria-label="Đóng"
          className="rounded p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
        >
          <CloseIcon />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-3 space-y-3">{children}</div>
    </aside>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </h4>
      {children}
    </section>
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
    scene,
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
  } = props;
  const [tab, setTab] = React.useState<Tab>('tools');
  const { hover, portalReady, showHover, hideHover } = useToolHoverTooltip();

  return (
    <>
      <Shell title="Hình học 3D" icon={Geom3DIconHeader} onClose={onClose} isDark={isDark}>
        <div className="flex gap-1 rounded-md bg-slate-100 p-0.5">
          <TabPill active={tab === 'tools'} onClick={() => setTab('tools')} testId="tab-tools">
            🧰 Công cụ
          </TabPill>
          <TabPill active={tab === 'algebra'} onClick={() => setTab('algebra')} testId="tab-algebra">
            📐 Đối tượng
          </TabPill>
        </div>

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
            <AlgebraList scene={scene} />
          </section>
        )}
      </Shell>
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

function TabPill({
  active,
  onClick,
  testId,
  children,
}: React.PropsWithChildren<{ active: boolean; onClick: () => void; testId?: string }>) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      data-testid={testId}
      className={[
        'flex-1 rounded px-2 py-1 text-[11px] font-medium transition',
        active
          ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
          : 'text-slate-500 hover:text-slate-800',
      ].join(' ')}
    >
      {children}
    </button>
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
