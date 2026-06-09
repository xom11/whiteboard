'use client';

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StampLeftPanel } from '../shared/StampLeftPanel';
import { GeometryIconHeader } from './editor/icons';
import {
  GeometryEditorPanel,
  type GeometryEditorPanelHandle,
} from './editor/EditorPanel';
import type { GeomTool } from './editor/MiniBoard';
import { GROUP_ORDER, GROUP_LABELS, TOOLS, letterForGroup, type GeomGroup } from './editor/tools';
import { useChordShortcut } from '../shared/useChordShortcut';
import { insertStampImage } from '../shared/insertImage';
import { deserializeBoard } from './serialize';
import { isGeometryCustomData, type GeometryCustomData } from './types';
import { DEFAULT_VIEW_2D, type State } from '../../core/scene';
import type {
  StampHostProps,
  StampHostHandle,
} from '../shared/types';
import { useIsMobile } from '../shared/useIsMobile';
import { useStampStore } from '../shared/useStampStore';
import { makeDslRenderRow } from './editor/dslRenderRow';

function parseInitialState(data: unknown): State | null {
  if (!isGeometryCustomData(data)) return null;
  return deserializeBoard(data.jsonState);
}

export const GeometryStampHost = forwardRef<StampHostHandle, StampHostProps>(
  function GeometryStampHost({ api, editingElement, onClose, isDark, generateGeometryFigure, onGeometryDraft }, ref) {
    const panelRef = useRef<GeometryEditorPanelHandle | null>(null);
    const { isMobile } = useIsMobile();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const sceneStore = useStampStore('2d', editingElement, parseInitialState);

    // Tier 2 F — host owns editor UI state.
    const initialMeta = sceneStore.getState().meta;
    const initialView = initialMeta.domain === '2d' ? initialMeta.view : DEFAULT_VIEW_2D;
    const [selectedTool, setSelectedTool] = useState<GeomTool>('move');
    const [showAxis, setShowAxis] = useState<boolean>(initialView.showAxis);
    const [showGrid, setShowGrid] = useState<boolean>(initialView.showGrid);
    const [canUndo, setCanUndo] = useState<boolean>(false);
    const [canRedo, setCanRedo] = useState<boolean>(false);
    const [selectedObjectId, setSelectedObjectId] = useState<string | undefined>(undefined);

    const handleHistoryChange = useCallback((u: boolean, r: boolean) => {
      setCanUndo(u);
      setCanRedo(r);
    }, []);

    const handleUndo = useCallback(() => sceneStore.undo(), [sceneStore]);
    const handleRedo = useCallback(() => sceneStore.redo(), [sceneStore]);

    const { chordGroup } = useChordShortcut({
      groupOrder: GROUP_ORDER,
      tools: TOOLS,
      onSelect: (key) => setSelectedTool(key as GeomTool),
      enabled: !isMobile,
    });

    const renderRow = useMemo(() => makeDslRenderRow(sceneStore), [sceneStore]);

    const handleInsert = useCallback(
      async (jsonState: string, svgString: string) => {
        if (!api) return;
        try {
          await insertStampImage(api, {
            svgString,
            makeCustomData: (): GeometryCustomData => ({
              kind: 'geometry',
              version: 1,
              jsonState,
            }),
            editingElementId: editingElement?.id ?? null,
          });
        } catch (err) {
          console.error('Geometry insert failed:', err);
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
        <StampLeftPanel<GeomTool, GeomGroup>
          title="Hình học"
          icon={GeometryIconHeader}
          onClose={onClose}
          isDark={isDark}
          testId="stamp-left-panel"
          tools={TOOLS}
          groupOrder={GROUP_ORDER}
          groupLabels={GROUP_LABELS}
          activeTool={selectedTool}
          onToolChange={setSelectedTool}
          view={{
            showAxis,
            showGrid,
            onShowAxisChange: setShowAxis,
            onShowGridChange: setShowGrid,
          }}
          history={{
            onUndo: handleUndo,
            canUndo,
            onRedo: handleRedo,
            canRedo,
          }}
          chord={{ activeGroup: chordGroup, letterForGroup }}
          objects={{
            store: sceneStore,
            selectedObjectId,
            onObjectSelect: (id) => {
              setSelectedObjectId(id ?? undefined);
              panelRef.current?.selectObject(id);
            },
            renderRow,
          }}
          isMobile={isMobile}
          drawerOpen={drawerOpen}
          onDrawerClose={() => setDrawerOpen(false)}
        />
        <GeometryEditorPanel
          ref={panelRef}
          store={sceneStore}
          onInsert={handleInsert}
          onClose={onClose}
          selectedTool={selectedTool}
          showAxis={showAxis}
          showGrid={showGrid}
          onHistoryChange={handleHistoryChange}
          withLeftPanel={!isMobile}
          isDark={isDark}
          isMobile={isMobile}
          onOpenDrawer={() => setDrawerOpen(true)}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={canUndo}
          canRedo={canRedo}
          onSelectionChange={setSelectedObjectId}
          generateGeometryFigure={generateGeometryFigure}
          api={api}
          onGeometryDraft={onGeometryDraft}
        />
      </>
    );
  },
);
