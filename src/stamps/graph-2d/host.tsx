'use client';
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import React from 'react';
import {
  GraphEditorPanel,
  type GraphEditorPanelHandle,
  type GraphBoardState,
} from './editor/EditorPanel';
import { StampLeftPanel } from '../shared/StampLeftPanel';
import { insertStampImage } from '../shared/insertImage';
import { useIsMobile } from '../shared/useIsMobile';
import { useStampStore } from '../shared/useStampStore';
import { isGraph2DCustomData, type Graph2DCustomData } from './types';
import { parseSceneState } from './serialize';
import { TOOLS, GROUPS, GROUP_LABELS, type GraphTool, type GraphToolGroup } from './editor/tools';
import { FunctionRow } from './editor/rows/FunctionRow';
import { ParameterRow } from './editor/rows/ParameterRow';
import type { Function2DAttrs } from '../../core/scene/kinds/function2d';
import type { ParameterAttrs } from '../../core/scene/kinds/parameter';
import type { Store } from '../../core/scene/store';
import type { SceneObject, State } from '../../core/scene/types';
import type { StampHostProps, StampHostHandle } from '../shared/types';

const INITIAL_STATE: GraphBoardState = {
  tool: 'move',
  showAxis: true,
  showGrid: true,
  canUndo: false,
  canRedo: false,
};

const GraphIconHeader = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3 L3 21 L21 21" />
    <path d="M6 14 Q9 8 12 10 Q15 12 18 6" />
  </svg>
);

function makeRenderRow(store: Store) {
  return function renderRow(
    obj: SceneObject,
    defaults: { selected: boolean; onClick: () => void },
  ): React.ReactNode {
    if (obj.kind === 'function2d') {
      return (
        <FunctionRow
          obj={obj as unknown as SceneObject<Function2DAttrs>}
          store={store}
          selected={defaults.selected}
          onClick={defaults.onClick}
        />
      );
    }
    if (obj.kind === 'parameter') {
      return (
        <ParameterRow
          obj={obj as unknown as SceneObject<ParameterAttrs>}
          store={store}
          selected={defaults.selected}
          onClick={defaults.onClick}
        />
      );
    }
    // Fallback to default ObjectRow
    return null;
  };
}

function parseInitialState(data: unknown): State | null {
  if (!isGraph2DCustomData(data)) return null;
  const state = parseSceneState(data.jsonState);
  if (!state) {
    console.warn('Graph2DStampHost: jsonState corrupted hoặc không hợp lệ');
    return null;
  }
  return state;
}

export const Graph2DStampHost = forwardRef<StampHostHandle, StampHostProps>(
  function Graph2DStampHost({ api, editingElement, onClose, isDark }, ref) {
    const panelRef = useRef<GraphEditorPanelHandle | null>(null);
    const { isMobile } = useIsMobile();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [boardState, setBoardState] = useState<GraphBoardState>(INITIAL_STATE);
    const sceneStore = useStampStore('graph2d', editingElement, parseInitialState);
    const [selectedObjectId, setSelectedObjectId] = useState<string | undefined>(undefined);

    // ---------- Add buttons (dispatch trực tiếp vào store) ----------

    const handleAddFunction = useCallback(() => {
      const existing = Object.values(sceneStore.getState().objects).filter((o) => o.kind === 'function2d');
      const id = `f${existing.length + 1}`;
      sceneStore.dispatch({
        type: 'ADD',
        payload: {
          obj: {
            id,
            kind: 'function2d',
            label: id,
            visible: true,
            locked: false,
            layer: 'default',
            schemaVersion: 1,
            attrs: { expression: 'x', color: '#2563eb', visible: true },
          },
        },
      });
    }, [sceneStore]);

    const handleAddParameter = useCallback(() => {
      const existing = Object.values(sceneStore.getState().objects).filter((o) => o.kind === 'parameter');
      const labels = 'abcdefghijklmnopqrstuvwxyz';
      const usedLabels = new Set(existing.map((o) => o.label));
      let label = 'a';
      for (const c of labels) {
        if (!usedLabels.has(c)) { label = c; break; }
      }
      const id = label;
      sceneStore.dispatch({
        type: 'ADD',
        payload: {
          obj: {
            id,
            kind: 'parameter',
            label,
            visible: true,
            locked: false,
            layer: 'default',
            schemaVersion: 1,
            attrs: { value: 1, min: -5, max: 5, step: 0.1 },
          },
        },
      });
    }, [sceneStore]);

    // ---------- Insert ----------

    const handleInsert = useCallback(
      async (jsonState: string, svgString: string) => {
        if (!api) return;
        try {
          await insertStampImage(api, {
            svgString,
            makeCustomData: (): Graph2DCustomData => ({
              kind: 'graph2d',
              version: 2,
              jsonState,
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

    const renderRow = useMemo(() => makeRenderRow(sceneStore), [sceneStore]);

    return (
      <>
        <StampLeftPanel<GraphTool, GraphToolGroup>
          title="Đồ thị"
          icon={GraphIconHeader}
          onClose={onClose}
          isDark={isDark}
          testId="stamp-left-panel"
          tools={TOOLS}
          groupOrder={GROUPS}
          groupLabels={GROUP_LABELS}
          activeTool={boardState.tool}
          onToolChange={(t) => panelRef.current?.setTool(t)}
          view={{
            showAxis: boardState.showAxis,
            showGrid: boardState.showGrid,
            onShowAxisChange: (b) => panelRef.current?.setShowAxis(b),
            onShowGridChange: (b) => panelRef.current?.setShowGrid(b),
          }}
          history={{
            onUndo: () => panelRef.current?.undo(),
            canUndo: boardState.canUndo,
            onRedo: () => panelRef.current?.redo(),
            canRedo: boardState.canRedo,
          }}
          objects={{
            store: sceneStore,
            selectedObjectId,
            onObjectSelect: (id) => {
              setSelectedObjectId(id ?? undefined);
              panelRef.current?.highlight(id);
            },
            renderRow,
            addButtons: [
              { label: '+ Hàm f(x)', testId: 'add-function-btn', onClick: handleAddFunction },
              { label: '+ Tham số', testId: 'add-parameter-btn', onClick: handleAddParameter },
            ],
          }}
          isMobile={isMobile}
          drawerOpen={drawerOpen}
          onDrawerClose={() => setDrawerOpen(false)}
        />
        <GraphEditorPanel
          ref={panelRef}
          store={sceneStore}
          onInsert={handleInsert}
          onClose={onClose}
          isDark={isDark}
          withLeftPanel={!isMobile}
          isMobile={isMobile}
          onOpenDrawer={() => setDrawerOpen(true)}
          onUndo={() => panelRef.current?.undo()}
          onRedo={() => panelRef.current?.redo()}
          canUndo={boardState.canUndo}
          canRedo={boardState.canRedo}
          onSelectionChange={setSelectedObjectId}
          onStateChange={setBoardState}
        />
      </>
    );
  },
);
