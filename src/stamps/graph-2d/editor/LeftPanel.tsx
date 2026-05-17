'use client';

import React from 'react';
import { GRAPH_TOOLS, type GraphTool } from './tools';
import { AlgebraView, type AlgebraViewProps } from './AlgebraView';

// ---------- Icons ----------

const GraphIconHeader = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21 V3" />
    <path d="M3 21 H21" />
    <path d="M5 19 C8 5, 14 5, 19 17" />
  </svg>
);

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}

function UndoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 7 3 13 9 13" />
      <path d="M3.51 13a9 9 0 1 0 2.13-9.36L3 7" />
    </svg>
  );
}

function ResetViewIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="3" x2="12" y2="21" />
      <line x1="3" y1="12" x2="21" y2="12" />
    </svg>
  );
}

// Tool icons
function MoveIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 4 L9 4 L9 9 L4 9 Z" />
    </svg>
  );
}
function PointOnCurveIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17 C7 8, 14 8, 21 14" />
      <circle cx="12" cy="11" r="2.2" fill="currentColor" stroke="none" />
    </svg>
  );
}
function IntersectIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17 C8 5, 14 5, 21 17" />
      <path d="M3 5 C8 17, 14 17, 21 5" />
      <circle cx="12" cy="11" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}
function TangentIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17 C8 7, 14 7, 21 16" />
      <line x1="4" y1="14" x2="20" y2="6" />
      <circle cx="12" cy="10" r="1.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

const TOOL_ICONS: Record<GraphTool, React.ReactNode> = {
  move: <MoveIcon />,
  'point-on-curve': <PointOnCurveIcon />,
  intersect: <IntersectIcon />,
  tangent: <TangentIcon />,
};

// ---------- Props ----------

export interface GraphLeftPanelProps extends AlgebraViewProps {
  activeTool: GraphTool;
  onToolChange: (t: GraphTool) => void;
  showAxis: boolean;
  showGrid: boolean;
  onShowAxisChange: (b: boolean) => void;
  onShowGridChange: (b: boolean) => void;
  onResetView: () => void;
  onUndo: () => void;
  canUndo: boolean;
  onClose: () => void;
  isDark: boolean;
  isMobile: boolean;
  drawerOpen: boolean;
  onDrawerClose: () => void;
}

// ---------- Section ----------

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

// ---------- Body ----------

function PanelBody(props: GraphLeftPanelProps) {
  return (
    <>
      <Section label="Bố cục">
        <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-700">
          <label className="inline-flex select-none items-center gap-1.5">
            <input
              type="checkbox"
              checked={props.showAxis}
              onChange={(e) => props.onShowAxisChange(e.target.checked)}
              data-testid="toggle-axis"
            />
            Trục
          </label>
          <label className="inline-flex select-none items-center gap-1.5">
            <input
              type="checkbox"
              checked={props.showGrid}
              onChange={(e) => props.onShowGridChange(e.target.checked)}
              data-testid="toggle-grid"
            />
            Lưới
          </label>
          <button
            type="button"
            onClick={props.onResetView}
            title="Đặt lại tầm nhìn"
            aria-label="Đặt lại tầm nhìn"
            className="ml-auto inline-flex items-center justify-center rounded p-1 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <ResetViewIcon />
          </button>
          <button
            type="button"
            onClick={props.onUndo}
            disabled={!props.canUndo}
            title="Hoàn tác (Ctrl/Cmd+Z)"
            aria-label="Hoàn tác"
            className="inline-flex items-center justify-center rounded p-1 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
          >
            <UndoIcon />
          </button>
        </div>
      </Section>

      <Section label="Công cụ">
        <div className="grid grid-cols-4 gap-1">
          {GRAPH_TOOLS.map((t) => {
            const isActive = props.activeTool === t.id;
            return (
              <button
                key={t.id}
                type="button"
                aria-label={t.title}
                title={t.title}
                aria-pressed={isActive}
                onClick={() => props.onToolChange(t.id)}
                data-testid={`graph-tool-${t.id}`}
                className={[
                  'flex h-8 items-center justify-center rounded-md transition',
                  isActive
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900',
                ].join(' ')}
              >
                {TOOL_ICONS[t.id]}
              </button>
            );
          })}
        </div>
      </Section>

      <Section label="Hàm số">
        <AlgebraView
          graph={props.graph}
          errors={props.errors}
          onAddFunctionDraft={props.onAddFunctionDraft}
          onCommitFunctionExpr={props.onCommitFunctionExpr}
          onToggleFunctionVisible={props.onToggleFunctionVisible}
          onRemoveFunction={props.onRemoveFunction}
          onParameterChange={props.onParameterChange}
          onParameterRangeChange={props.onParameterRangeChange}
          onRemoveParameter={props.onRemoveParameter}
        />
      </Section>
    </>
  );
}

// ---------- Public ----------

export function GraphLeftPanel(props: GraphLeftPanelProps) {
  const { isMobile, drawerOpen, isDark, onClose, onDrawerClose } = props;
  if (isMobile && !drawerOpen) return null;
  const handleClose = isMobile ? onDrawerClose : onClose;
  return (
    <aside
      role="complementary"
      aria-label="Đồ thị 2D"
      data-testid="graph-left-panel"
      data-stamp-area="true"
      className={[
        isDark ? 'theme--dark ' : '',
        isMobile
          ? 'fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-white shadow-2xl animate-in slide-in-from-left duration-200'
          : 'absolute left-0 top-0 z-30 flex h-full w-60 flex-col border-r border-slate-200 bg-white shadow-md animate-in slide-in-from-left duration-200',
      ].join(' ')}
    >
      <header className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-3 py-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <span className="text-base leading-none">{GraphIconHeader}</span>
          Đồ thị 2D
        </h3>
        <button
          onClick={handleClose}
          aria-label="Đóng"
          className="rounded p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
        >
          <CloseIcon />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-3 space-y-4">
        <PanelBody {...props} />
      </div>
    </aside>
  );
}
