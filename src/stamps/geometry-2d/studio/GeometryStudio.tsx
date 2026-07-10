'use client';

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StampLeftPanel } from '../../shared/StampLeftPanel';
import { GeometryIconHeader } from '../editor/icons';
import {
  GeometryEditorPanel,
  type GeometryEditorPanelHandle,
} from '../editor/EditorPanel';
import type { GeomTool } from '../editor/MiniBoard';
import { GROUP_ORDER, GROUP_LABELS, TOOLS, letterForGroup, type GeomGroup } from '../editor/tools';
import { useChordShortcut } from '../../shared/useChordShortcut';
import { deserializeBoard } from '../serialize';
import { DEFAULT_VIEW_2D } from '../../../core/scene';
import type { StampHostHandle, GenerateGeometryFigure } from '../../shared/types';
import type { GeometryDraftPreview } from '../../shared/draftTypes';
import { useIsMobile } from '../../shared/useIsMobile';
import { useStampStore } from '../../shared/useStampStore';
import { makeDslRenderRow } from '../editor/dslRenderRow';

export interface GeometryStudioProps {
  /** Seed store lúc mount. Vắng = board trống. */
  initialJsonState?: string;
  /** Thay cho insertStampImage. Editor gọi khi user bấm "Chèn". */
  onCommit: (jsonState: string, svgString: string) => void | Promise<void>;
  onClose: () => void;
  isDark?: boolean;
  /** Chỉ để EditorPanel đọc viewport khi dựng draft. Vắng = bỏ qua draft. */
  api?: unknown;
  generateGeometryFigure?: GenerateGeometryFigure;
  onGeometryDraft?: (draft: GeometryDraftPreview | null) => void;
}

export const GeometryStudio = forwardRef<StampHostHandle, GeometryStudioProps>(
  function GeometryStudio(
    { initialJsonState, onCommit, onClose, isDark, api, generateGeometryFigure, onGeometryDraft },
    ref,
  ) {
    const panelRef = useRef<GeometryEditorPanelHandle | null>(null);
    const { isMobile } = useIsMobile();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const sceneStore = useStampStore('2d', () =>
      initialJsonState ? deserializeBoard(initialJsonState) : null,
    );

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
        try {
          await onCommit(jsonState, svgString);
        } catch (err) {
          console.error('Geometry commit failed:', err);
        }
        onClose();
      },
      [onCommit, onClose],
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
