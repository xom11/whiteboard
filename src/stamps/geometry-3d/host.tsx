'use client';

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { EditorPanel, type EditorPanelHandle } from './editor/EditorPanel';
import { StampLeftPanel } from '../shared/StampLeftPanel';
import type { State } from '../../core/scene';
import {
  GROUP_ORDER,
  GROUP_LABELS,
  TOOLS_FLAT,
  letterForGroup,
  type Geom3DGroup,
} from './editor/toolPanel/groups';
import { useChordShortcut } from '../shared/useChordShortcut';
import { insertStampImage } from '../shared/insertImage';
import { useIsMobile } from '../shared/useIsMobile';
import { useStampStore } from '../shared/useStampStore';
import {
  deserializeBoard3D,
  isGeometry3DCustomData,
  type Geometry3DCustomData,
} from './serialize';
import type {
  StampHostProps,
  StampHostHandle,
} from '../shared/types';
import type { ToolKey } from './editor/tools/spec';

const Geom3DIconHeader = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 9 L4 20 L14 20 L14 9 Z" />
    <path d="M4 9 L10 4 L20 4 L14 9 Z" />
    <path d="M14 9 L20 4 L20 15 L14 20 Z" />
  </svg>
);

function parseInitialState(data: unknown): State | null {
  if (!isGeometry3DCustomData(data)) return null;
  return deserializeBoard3D(data.jsonState);
}

export const Geometry3DStampHost = forwardRef<StampHostHandle, StampHostProps>(
  function Geometry3DStampHost({ api, editingElement, onClose, isDark }, ref) {
    const editorRef = useRef<EditorPanelHandle | null>(null);
    const sceneStore = useStampStore('3d', editingElement, parseInitialState);
    const { isMobile } = useIsMobile();
    const [drawerOpen, setDrawerOpen] = useState(false);

    const [selectedTool, setSelectedTool] = useState<ToolKey>('move');
    const [showAxis, setShowAxis] = useState<boolean>(true);
    const [showGrid, setShowGrid] = useState<boolean>(true);
    const [canUndo, setCanUndo] = useState<boolean>(false);
    const [canRedo, setCanRedo] = useState<boolean>(false);
    const [selectedObjectId, setSelectedObjectId] = useState<string | undefined>(undefined);

    const handleHistoryChange = useCallback((u: boolean, r: boolean) => {
      setCanUndo(u);
      setCanRedo(r);
    }, []);

    const handleObjectSelect = useCallback((id: string | null) => {
      setSelectedObjectId(id ?? undefined);
      editorRef.current?.highlight(id);
    }, []);

    const handleUndo = useCallback(() => editorRef.current?.undo(), []);
    const handleRedo = useCallback(() => editorRef.current?.redo(), []);

    const { chordGroup } = useChordShortcut({
      groupOrder: GROUP_ORDER,
      tools: TOOLS_FLAT,
      onSelect: (key) => {
        setSelectedTool(key as ToolKey);
        editorRef.current?.setTool(key as ToolKey);
      },
      enabled: !isMobile,
    });

    const handleSelectTool = useCallback((k: ToolKey) => {
      setSelectedTool(k);
      editorRef.current?.setTool(k);
    }, []);

    const handleEditorInsert = useCallback(
      async (jsonState: string, svgString: string) => {
        if (!api) return;
        await insertStampImage(api, {
          svgString,
          makeCustomData: (): Geometry3DCustomData => ({
            kind: 'geometry3d',
            version: 2,
            jsonState,
          }),
          editingElementId: editingElement?.id ?? null,
        });
        onClose();
      },
      [api, editingElement, onClose],
    );

    useImperativeHandle(
      ref,
      () => ({
        tryInsert: () => editorRef.current?.tryInsert() ?? false,
        hasContent: () => editorRef.current?.hasContent() ?? false,
      }),
      [],
    );

    return (
      <>
        <StampLeftPanel<ToolKey, Geom3DGroup>
          title="Hình học 3D"
          icon={Geom3DIconHeader}
          onClose={onClose}
          isDark={isDark}
          testId="stamp-left-panel"
          tools={TOOLS_FLAT}
          groupOrder={GROUP_ORDER}
          groupLabels={GROUP_LABELS}
          activeTool={selectedTool}
          onToolChange={handleSelectTool}
          view={{
            sectionLabel: 'Góc nhìn',
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
            onObjectSelect: handleObjectSelect,
          }}
          isMobile={isMobile}
          drawerOpen={drawerOpen}
          onDrawerClose={() => setDrawerOpen(false)}
        />
        <EditorPanel
          ref={editorRef}
          isDark={isDark}
          onInsert={handleEditorInsert}
          onClose={onClose}
          store={sceneStore}
          selectedTool={selectedTool}
          onSelectedToolChange={setSelectedTool}
          showAxis={showAxis}
          showGrid={showGrid}
          onHistoryChange={handleHistoryChange}
          isMobile={isMobile}
          onOpenDrawer={() => setDrawerOpen(true)}
          withLeftPanel={!isMobile}
        />
      </>
    );
  },
);
