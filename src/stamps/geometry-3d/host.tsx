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
import { LeftPanel as Geometry3DLeftPanel } from './editor/LeftPanel';
import type { MiniBoard3DHandle } from './editor/MiniBoard3D';
import { GROUP_ORDER_3D, TOOLS_3D, type GeomTool3D } from './editor/tools';
import { useChordShortcut } from '../shared/useChordShortcut';
import { insertStampImage } from '../shared/insertImage';
import { useIsMobile } from '../shared/useIsMobile';
import {
  isGeometry3DCustomData,
  parseSerializedBoard3D,
  type Geometry3DCustomData,
  type SerializedBoard3D,
} from './serialize';
import type {
  StampHostProps,
  StampHostHandle,
} from '../shared/types';

function parseInitial(
  editingElement: StampHostProps['editingElement'],
): SerializedBoard3D | null {
  if (!editingElement) return null;
  if (!isGeometry3DCustomData(editingElement.customData)) return null;
  try {
    return parseSerializedBoard3D(editingElement.customData.jsonState);
  } catch {
    return null;
  }
}

export const Geometry3DStampHost = forwardRef<StampHostHandle, StampHostProps>(
  function Geometry3DStampHost({ api, editingElement, onClose, isDark }, ref) {
    const editorRef = useRef<EditorPanelHandle | null>(null);
    const { isMobile } = useIsMobile();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [boardHandle, setBoardHandle] = useState<MiniBoard3DHandle | null>(null);

    const initial = useMemo(
      () => parseInitial(editingElement),
      [editingElement],
    );

    const handleBoardReady = useCallback((h: MiniBoard3DHandle | null) => {
      setBoardHandle((prev) => (prev === h ? prev : h));
    }, []);

    const { chordGroup } = useChordShortcut({
      groupOrder: GROUP_ORDER_3D,
      tools: TOOLS_3D as unknown as Array<{ key: string; group: typeof GROUP_ORDER_3D[number] }>,
      onSelect: (key) => boardHandle?.setTool(key as GeomTool3D),
      enabled: !isMobile,
    });

    const handleResetView = useCallback(() => {
      boardHandle?.resetView();
    }, [boardHandle]);

    const handleInsert = useCallback(
      async (jsonState: string, svgString: string, width: number, height: number) => {
        if (!api) return;
        await insertStampImage(api, {
          svgString,
          makeCustomData: (): Geometry3DCustomData => ({
            kind: 'geometry3d',
            version: 1,
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
        <Geometry3DLeftPanel
          handle={boardHandle}
          onResetView={handleResetView}
          onClose={onClose}
          isDark={isDark}
          isMobile={isMobile}
          drawerOpen={drawerOpen}
          onDrawerClose={() => setDrawerOpen(false)}
          chordGroup={chordGroup}
        />
        <EditorPanel
          ref={editorRef}
          isDark={isDark}
          initial={initial}
          onInsert={handleInsert}
          onClose={onClose}
          isMobile={isMobile}
          withLeftPanel={!isMobile}
          onBoardReady={handleBoardReady}
          onOpenDrawer={() => setDrawerOpen(true)}
        />
      </>
    );
  },
);
