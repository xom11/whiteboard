'use client';

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { GraphLeftPanel } from './editor/LeftPanel';
import {
  GraphEditorPanel,
  type GraphEditorPanelHandle,
  type GraphState,
} from './editor/EditorPanel';
import { insertStampImage } from '../shared/insertImage';
import {
  parseSerializedGraph,
  EMPTY_GRAPH,
  type SerializedGraph,
} from './serialize';
import type {
  StampHostProps,
  StampHostHandle,
} from '../shared/types';
import { useIsMobile } from '../shared/useIsMobile';
import { isGraph2DCustomData, type Graph2DCustomData } from './types';

// ============== Host component ==============

const INITIAL_GRAPH_STATE: GraphState = {
  tool: 'move',
  showAxis: true,
  showGrid: true,
  canUndo: false,
};

export const Graph2DStampHost = forwardRef<StampHostHandle, StampHostProps>(
  function Graph2DStampHost({ api, editingElement, onClose, isDark }, ref) {
    const panelRef = useRef<GraphEditorPanelHandle | null>(null);
    const [graphUIState, setGraphUIState] = useState<GraphState>(INITIAL_GRAPH_STATE);
    const { isMobile } = useIsMobile();
    const [drawerOpen, setDrawerOpen] = useState(false);

    const initialState = useMemo<SerializedGraph | null>(() => {
      if (!editingElement) return null;
      if (!isGraph2DCustomData(editingElement.customData)) return null;
      return parseSerializedGraph(editingElement.customData.jsonState);
    }, [editingElement]);

    // State lifted from EditorPanel so LeftPanel/AlgebraView renders current graph + errors
    const [graphSnapshot, setGraphSnapshot] = useState<SerializedGraph>(
      initialState ?? EMPTY_GRAPH,
    );
    const [errorsSnapshot, setErrorsSnapshot] = useState<Record<string, string | null>>({});

    const handleInsert = useCallback(
      async (jsonState: string, svgString: string) => {
        if (!api) return;
        try {
          await insertStampImage(api, {
            svgString,
            makeCustomData: (width, height): Graph2DCustomData => ({
              kind: 'graph2d',
              version: 1,
              jsonState,
              svgWidth: width,
              svgHeight: height,
            }),
            editingElementId: editingElement?.id ?? null,
          });
        } catch (err) {
          console.error('Graph2D insert failed:', err);
        }
        onClose();
      },
      [api, editingElement?.id, onClose],
    );

    useImperativeHandle(
      ref,
      () => ({
        tryInsert: () => panelRef.current?.insert() ?? false,
        hasContent: () => panelRef.current?.hasContent() ?? false,
      }),
      [],
    );

    return (
      <>
        <GraphLeftPanel
          activeTool={graphUIState.tool}
          onToolChange={(t) => panelRef.current?.setTool(t)}
          showAxis={graphUIState.showAxis}
          showGrid={graphUIState.showGrid}
          onShowAxisChange={(b) => panelRef.current?.setShowAxis(b)}
          onShowGridChange={(b) => panelRef.current?.setShowGrid(b)}
          onResetView={() => panelRef.current?.resetView()}
          onUndo={() => panelRef.current?.undo()}
          canUndo={graphUIState.canUndo}
          onClose={onClose}
          isDark={isDark}
          isMobile={isMobile}
          drawerOpen={drawerOpen}
          onDrawerClose={() => setDrawerOpen(false)}
          graph={graphSnapshot}
          errors={errorsSnapshot}
          onAddFunctionDraft={() => {
            const result = panelRef.current?.addFunction('x');
            if (result && !result.ok) console.warn('addFunction failed:', result.error);
          }}
          onCommitFunctionExpr={(id, expr) =>
            panelRef.current?.commitFunctionExpression(id, expr)
          }
          onToggleFunctionVisible={(id) => panelRef.current?.toggleFunctionVisible(id)}
          onRemoveFunction={(id) => panelRef.current?.removeFunction(id)}
          onParameterChange={(name, v) => panelRef.current?.setParameter(name, v)}
          onParameterRangeChange={(name, min, max, step) =>
            panelRef.current?.setParameterRange(name, min, max, step)
          }
          onRemoveParameter={(name) => panelRef.current?.removeParameter(name)}
        />
        <GraphEditorPanel
          ref={panelRef}
          initialState={initialState}
          onInsert={handleInsert}
          onClose={onClose}
          onStateChange={setGraphUIState}
          onGraphChange={setGraphSnapshot}
          onErrorsChange={setErrorsSnapshot}
          withLeftPanel={!isMobile}
          isDark={isDark}
          isMobile={isMobile}
          onOpenDrawer={() => setDrawerOpen(true)}
        />
      </>
    );
  },
);
