'use client';

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { EditorPanel, type EditorPanelHandle } from './editor/EditorPanel';
import { LeftPanel } from './editor/LeftPanel';
import { createStore, createEmptyState, type Store, type State } from '../../core/scene';
import { GROUP_ORDER, TOOLS_FLAT } from './editor/toolPanel/groups';
import { useChordShortcut } from '../shared/useChordShortcut';
import { insertStampImage } from '../shared/insertImage';
import { useIsMobile } from '../shared/useIsMobile';
import {
  isGeometry3DCustomData,
  parseSerializedBoard3D,
  type Geometry3DCustomData,
  type SerializedBoard3D,
  type SerializedView3D,
} from './serialize';
import type {
  StampHostProps,
  StampHostHandle,
} from '../shared/types';
import type { ToolKey } from './editor/tools/spec';

function parseInitial(
  editingElement: StampHostProps['editingElement'],
): { state: State; view?: SerializedView3D } | null {
  if (!editingElement) return null;
  if (!isGeometry3DCustomData(editingElement.customData)) return null;
  try {
    return parseSerializedBoard3D(JSON.parse(editingElement.customData.jsonState));
  } catch {
    return null;
  }
}

export const Geometry3DStampHost = forwardRef<StampHostHandle, StampHostProps>(
  function Geometry3DStampHost({ api, editingElement, onClose, isDark }, ref) {
    const editorRef = useRef<EditorPanelHandle | null>(null);
    const storeRef = useRef<Store | null>(null);
    if (!storeRef.current) storeRef.current = createStore(createEmptyState('3d'));
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

    const initial = useMemo(
      () => parseInitial(editingElement),
      [editingElement],
    );

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
      async (board: SerializedBoard3D, width: number, height: number, svgString: string) => {
        if (!api) return;
        const jsonState = JSON.stringify(board);
        await insertStampImage(api, {
          svgString,
          makeCustomData: (): Geometry3DCustomData => ({
            kind: 'geometry3d',
            // Bump customData.version vẫn 2 (đã được hỗ trợ ở isGeometry3DCustomData)
            // — payload bên trong là envelope v2 mới của state.
            version: 2,
            jsonState,
            svgWidth: width,
            svgHeight: height,
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
        {!isMobile && (
          <LeftPanel
            store={storeRef.current}
            selectedTool={selectedTool}
            onSelectTool={handleSelectTool}
            showAxis={showAxis}
            showGrid={showGrid}
            onShowAxisChange={setShowAxis}
            onShowGridChange={setShowGrid}
            onUndo={handleUndo}
            canUndo={canUndo}
            onRedo={handleRedo}
            canRedo={canRedo}
            onClose={onClose}
            isDark={isDark}
            chordGroup={chordGroup}
            selectedObjectId={selectedObjectId}
            onObjectSelect={handleObjectSelect}
          />
        )}
        <EditorPanel
          ref={editorRef}
          isDark={isDark}
          initialState={initial}
          onInsert={handleEditorInsert}
          onClose={onClose}
          store={storeRef.current}
          selectedTool={selectedTool}
          onSelectedToolChange={setSelectedTool}
          showAxis={showAxis}
          showGrid={showGrid}
          onHistoryChange={handleHistoryChange}
          isMobile={isMobile}
          onOpenDrawer={() => setDrawerOpen(true)}
          withLeftPanel={!isMobile}
        />
        {isMobile && (
          <LeftPanel
            store={storeRef.current}
            selectedTool={selectedTool}
            onSelectTool={handleSelectTool}
            showAxis={showAxis}
            showGrid={showGrid}
            onShowAxisChange={setShowAxis}
            onShowGridChange={setShowGrid}
            onUndo={handleUndo}
            canUndo={canUndo}
            onRedo={handleRedo}
            canRedo={canRedo}
            onClose={onClose}
            isDark={isDark}
            isMobile
            drawerOpen={drawerOpen}
            onDrawerClose={() => setDrawerOpen(false)}
            chordGroup={chordGroup}
            selectedObjectId={selectedObjectId}
            onObjectSelect={handleObjectSelect}
          />
        )}
      </>
    );
  },
);
