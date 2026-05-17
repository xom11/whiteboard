'use client';
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { EditorPanel, type EditorPanelHandle } from './editor/EditorPanel';
import { LeftPanel as Geometry3DLeftPanel } from './editor/LeftPanel';
import type { MiniBoard3DHandle } from './editor/MiniBoard3D';
import { GROUP_ORDER_3D, TOOLS_3D, type GeomTool3D } from './editor/tools';
import { useChordShortcut } from '../shared/useChordShortcut';
import { insertStampImage } from '../shared/insertImage';
import type {
  StampHostProps,
  StampHostHandle,
  StampType,
  RestoredStampFile,
} from '../shared/types';
import {
  isGeometry3DCustomData,
  parseSerializedBoard3D,
  type Geometry3DCustomData,
  type SerializedBoard3D,
} from './serialize';
import { renderGeometry3DSvgFromState } from './render';
import { useIsMobile } from '../shared/useIsMobile';

export { isGeometry3DCustomData };
export type { Geometry3DCustomData };

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

const Geometry3DIcon: ReactNode = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {/* Mặt trước */}
    <path d="M4 9 L4 20 L14 20 L14 9 Z" />
    {/* Mặt trên */}
    <path d="M4 9 L10 4 L20 4 L14 9 Z" />
    {/* Mặt phải */}
    <path d="M14 9 L20 4 L20 15 L14 20 Z" />
  </svg>
);

export const geometry3dStamp: StampType = {
  kind: 'geometry3d',
  experimental: true,
  shortcutKey: 'd',
  toolbarLabel: 'D',
  toolbarTitle: 'Hình 3D (D)',
  toolbarIcon: Geometry3DIcon,
  toolbarTestId: 'stamp-toolbar-geometry3d',
  matchesCustomData: isGeometry3DCustomData,
  async renderSvgFromCustomData(data: unknown): Promise<string> {
    if (!isGeometry3DCustomData(data)) {
      throw new Error('geometry3dStamp.renderSvgFromCustomData: customData không phải geometry3d');
    }
    const { svgString } = await renderGeometry3DSvgFromState(data.jsonState);
    return svgString;
  },
  restoreFileFromCustomData: async (element): Promise<RestoredStampFile | null> => {
    const data = element.customData as Geometry3DCustomData | undefined;
    const fileId = (element as { fileId?: string | null }).fileId;
    if (!data || !fileId) return null;
    if (!isGeometry3DCustomData(data)) return null;
    try {
      const { svgString } = await renderGeometry3DSvgFromState(data.jsonState);
      const dataURL = `data:image/svg+xml;base64,${
        typeof btoa !== 'undefined'
          ? btoa(unescape(encodeURIComponent(svgString)))
          : Buffer.from(svgString).toString('base64')
      }`;
      return { fileId, dataURL, mimeType: 'image/svg+xml' };
    } catch {
      return null;
    }
  },
  Host: Geometry3DStampHost,
};
