'use client';

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { StampLeftPanel } from '../shared/StampLeftPanel';
import { GeometryIconHeader } from './editor/icons';
import {
  GeometryEditorPanel,
  type GeometryEditorPanelHandle,
  type GeomBoardState,
} from './editor/EditorPanel';
import type { GeomTool } from './editor/MiniBoard';
import { GROUP_ORDER, GROUP_LABELS, TOOLS, letterForGroup, type GeomGroup } from './editor/tools';
import { useChordShortcut } from '../shared/useChordShortcut';
import { insertStampImage } from '../shared/insertImage';
import { deserializeBoard } from './serialize';
import { isGeometryCustomData, type GeometryCustomData } from './types';
import type { State } from '../../core/scene/types';
import type {
  StampHostProps,
  StampHostHandle,
} from '../shared/types';
import { useIsMobile } from '../shared/useIsMobile';
import { useStampStore } from '../shared/useStampStore';

const INITIAL_GEOM_STATE: GeomBoardState = {
  tool: 'move',
  showAxis: false,
  showGrid: false,
  canUndo: false,
  canRedo: false,
};

function parseInitialState(data: unknown): State | null {
  if (!isGeometryCustomData(data)) return null;
  return deserializeBoard(data.jsonState);
}

export const GeometryStampHost = forwardRef<StampHostHandle, StampHostProps>(
  function GeometryStampHost({ api, editingElement, onClose, isDark }, ref) {
    const panelRef = useRef<GeometryEditorPanelHandle | null>(null);
    const [geomState, setGeomState] = useState<GeomBoardState>(INITIAL_GEOM_STATE);
    const { isMobile } = useIsMobile();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const sceneStore = useStampStore('2d', editingElement, parseInitialState);
    const [selectedObjectId, setSelectedObjectId] = useState<string | undefined>(undefined);

    const { chordGroup } = useChordShortcut({
      groupOrder: GROUP_ORDER,
      tools: TOOLS,
      onSelect: (key) => panelRef.current?.setTool(key as GeomTool),
      enabled: !isMobile,
    });

    const handleInsert = useCallback(
      async (jsonState: string, svgString: string) => {
        if (!api) return;
        try {
          await insertStampImage(api, {
            svgString,
            makeCustomData: (width, height): GeometryCustomData => ({
              kind: 'geometry',
              version: 1,
              jsonState,
              svgWidth: width,
              svgHeight: height,
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
          activeTool={geomState.tool}
          onToolChange={(t) => panelRef.current?.setTool(t)}
          view={{
            showAxis: geomState.showAxis,
            showGrid: geomState.showGrid,
            onShowAxisChange: (b) => panelRef.current?.setShowAxis(b),
            onShowGridChange: (b) => panelRef.current?.setShowGrid(b),
          }}
          history={{
            onUndo: () => panelRef.current?.undo(),
            canUndo: geomState.canUndo,
            onRedo: () => panelRef.current?.redo(),
            canRedo: geomState.canRedo,
          }}
          chord={{ activeGroup: chordGroup, letterForGroup }}
          objects={{
            store: sceneStore,
            selectedObjectId,
            onObjectSelect: (id) => {
              setSelectedObjectId(id ?? undefined);
              panelRef.current?.selectObject(id);
            },
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
          onStateChange={setGeomState}
          withLeftPanel={!isMobile}
          isDark={isDark}
          isMobile={isMobile}
          onOpenDrawer={() => setDrawerOpen(true)}
          onUndo={() => panelRef.current?.undo()}
          onRedo={() => panelRef.current?.redo()}
          canUndo={geomState.canUndo}
          canRedo={geomState.canRedo}
          onSelectionChange={setSelectedObjectId}
        />
      </>
    );
  },
);
