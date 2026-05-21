'use client';
// src/stamps/shared/StampLeftPanel/AxisGridSection.tsx
//
// Section "Bố cục" / "Góc nhìn": 2 checkbox axis/grid + (optional) undo/redo
// button ở mép phải. Render khi có ít nhất 1 trong (view, history).
// Skip toàn bộ section khi cả 2 đều undefined.

import React from 'react';
import { Section } from '../../../core/scene/ui/LeftPanelShell';
import type {
  StampLeftPanelHistoryProps,
  StampLeftPanelViewProps,
} from './types';

export interface AxisGridSectionProps {
  view?: StampLeftPanelViewProps;
  history?: StampLeftPanelHistoryProps;
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

export function AxisGridSection(props: AxisGridSectionProps): React.ReactElement | null {
  const { view, history } = props;
  if (!view && !history) return null;

  const sectionLabel = view?.sectionLabel ?? 'Bố cục';
  const axisLabel = view?.axisLabel ?? 'Trục';
  const gridLabel = view?.gridLabel ?? 'Lưới';

  return (
    <Section label={sectionLabel}>
      <div className="flex items-center gap-3 text-[11px] text-slate-700">
        {view && (
          <>
            <label className="inline-flex select-none items-center gap-1.5">
              <input
                type="checkbox"
                checked={view.showAxis}
                onChange={(e) => view.onShowAxisChange(e.target.checked)}
                data-testid="toggle-axis"
              />
              {axisLabel}
            </label>
            <label className="inline-flex select-none items-center gap-1.5">
              <input
                type="checkbox"
                checked={view.showGrid}
                onChange={(e) => view.onShowGridChange(e.target.checked)}
                data-testid="toggle-grid"
              />
              {gridLabel}
            </label>
          </>
        )}
        {history && (
          <div className="ml-auto flex items-center gap-0.5">
            <button
              type="button"
              onClick={history.onUndo}
              disabled={!history.canUndo}
              title="Hoàn tác (Ctrl/Cmd+Z)"
              aria-label="Hoàn tác"
              data-testid="undo-btn"
              className="inline-flex items-center justify-center rounded p-1 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
            >
              <UndoIcon />
            </button>
            <button
              type="button"
              onClick={history.onRedo}
              disabled={!history.canRedo}
              title="Làm lại (Ctrl/Cmd+Shift+Z)"
              aria-label="Làm lại"
              data-testid="redo-btn"
              className="inline-flex items-center justify-center rounded p-1 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
            >
              <RedoIcon />
            </button>
          </div>
        )}
      </div>
    </Section>
  );
}
