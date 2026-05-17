'use client';

import { GRAPH_TOOLS, type GraphTool } from './tools';
import { AlgebraView, type AlgebraViewProps } from './AlgebraView';

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

export function GraphLeftPanel(props: GraphLeftPanelProps) {
  const { activeTool, onToolChange, showAxis, showGrid, canUndo } = props;

  return (
    <aside
      className={`graph-left-panel${props.isMobile ? ' is-mobile' : ''}${props.isMobile && !props.drawerOpen ? ' is-closed' : ''}`}
      aria-hidden={props.isMobile && !props.drawerOpen}
    >
      <div className="graph-tool-strip">
        {GRAPH_TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-label={t.title}
            title={t.title}
            className={`graph-tool-btn${activeTool === t.id ? ' is-active' : ''}`}
            onClick={() => onToolChange(t.id)}
            data-testid={`graph-tool-${t.id}`}
          >
            {t.label.slice(0, 1)}
          </button>
        ))}
        <div className="graph-tool-strip-sep" />
        <button
          type="button"
          aria-label="Bật/tắt trục"
          className={`graph-tool-btn${showAxis ? ' is-active' : ''}`}
          onClick={() => props.onShowAxisChange(!showAxis)}
        >
          ⊥
        </button>
        <button
          type="button"
          aria-label="Bật/tắt lưới"
          className={`graph-tool-btn${showGrid ? ' is-active' : ''}`}
          onClick={() => props.onShowGridChange(!showGrid)}
        >
          ▦
        </button>
        <button
          type="button"
          aria-label="Đặt lại tầm nhìn"
          className="graph-tool-btn"
          onClick={props.onResetView}
        >
          ⊕
        </button>
        <button
          type="button"
          aria-label="Hoàn tác"
          className="graph-tool-btn"
          onClick={props.onUndo}
          disabled={!canUndo}
        >
          ↶
        </button>
      </div>
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
      <div className="graph-left-panel-footer">
        <button type="button" className="graph-btn-cancel" onClick={props.onClose}>
          Hủy
        </button>
      </div>
    </aside>
  );
}
