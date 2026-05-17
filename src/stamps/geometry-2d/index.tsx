'use client';

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { GeometryLeftPanel } from './editor/LeftPanel';
import {
  GeometryEditorPanel,
  type GeometryEditorPanelHandle,
  type GeomBoardState,
} from './editor/EditorPanel';
import type { GeomTool } from './editor/MiniBoard';
import { GROUP_ORDER, TOOLS } from './editor/tools';
import { useChordShortcut } from '../shared/useChordShortcut';
import { insertStampImage } from '../shared/insertImage';
import { renderGeometrySvgFromState } from './render';
import type { SerializedBoard } from './serialize';
import type {
  BaseStampCustomData,
  RestoredStampFile,
  StampHostProps,
  StampHostHandle,
  StampType,
} from '../shared/types';
import { useIsMobile } from '../shared/useIsMobile';

// ============== Custom data type + guard ==============

export interface GeometryCustomData extends BaseStampCustomData {
  kind: 'geometry';
  version: 1;
  jsonState: string;
  svgWidth: number;
  svgHeight: number;
}

export function isGeometryCustomData(data: unknown): data is GeometryCustomData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Partial<GeometryCustomData>;
  return d.kind === 'geometry' && d.version === 1 && typeof d.jsonState === 'string';
}

// ============== Host component ==============

const INITIAL_GEOM_STATE: GeomBoardState = {
  tool: 'move',
  showAxis: false,
  showGrid: false,
  canUndo: false,
};

const GeometryStampHost = forwardRef<StampHostHandle, StampHostProps>(
  function GeometryStampHost({ api, editingElement, onClose, isDark }, ref) {
    const panelRef = useRef<GeometryEditorPanelHandle | null>(null);
    const [geomState, setGeomState] = useState<GeomBoardState>(INITIAL_GEOM_STATE);
    const { isMobile } = useIsMobile();
    const [drawerOpen, setDrawerOpen] = useState(false);

    const { chordGroup } = useChordShortcut({
      groupOrder: GROUP_ORDER,
      tools: TOOLS,
      onSelect: (key) => panelRef.current?.setTool(key as GeomTool),
      enabled: !isMobile,
    });

    // Initial state cho editor: parse từ customData nếu đang re-edit, null nếu tạo mới.
    const initialState = useMemo<SerializedBoard | null>(() => {
      if (!editingElement) return null;
      if (!isGeometryCustomData(editingElement.customData)) return null;
      try {
        return JSON.parse(editingElement.customData.jsonState) as SerializedBoard;
      } catch {
        console.warn('GeometryStampHost: customData jsonState corrupted');
        return null;
      }
    }, [editingElement]);

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
        <GeometryLeftPanel
          activeTool={geomState.tool}
          onToolChange={(t: GeomTool) => panelRef.current?.setTool(t)}
          showAxis={geomState.showAxis}
          showGrid={geomState.showGrid}
          onShowAxisChange={(b) => panelRef.current?.setShowAxis(b)}
          onShowGridChange={(b) => panelRef.current?.setShowGrid(b)}
          onUndo={() => panelRef.current?.undo()}
          canUndo={geomState.canUndo}
          onClose={onClose}
          isDark={isDark}
          isMobile={isMobile}
          drawerOpen={drawerOpen}
          onDrawerClose={() => setDrawerOpen(false)}
          chordGroup={chordGroup}
        />
        <GeometryEditorPanel
          ref={panelRef}
          initialState={initialState}
          onInsert={handleInsert}
          onClose={onClose}
          onStateChange={setGeomState}
          withLeftPanel={!isMobile}
          isDark={isDark}
          isMobile={isMobile}
          onOpenDrawer={() => setDrawerOpen(true)}
        />
      </>
    );
  },
);

// ============== Stamp definition ==============

const GeometryIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="4,20 20,20 12,5" />
    <circle cx="4" cy="20" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="20" cy="20" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="12" cy="5" r="1.4" fill="currentColor" stroke="none" />
  </svg>
);

export const geometryStamp: StampType = {
  kind: 'geometry',
  shortcutKey: 'g',
  toolbarLabel: 'G',
  toolbarTitle: 'Chèn hình học (G)',
  toolbarIcon: GeometryIcon,
  toolbarTestId: 'stamp-toolbar-geometry',
  matchesCustomData: isGeometryCustomData,
  async renderSvgFromCustomData(data) {
    if (!isGeometryCustomData(data)) {
      throw new Error('geometryStamp.renderSvgFromCustomData: customData không phải geometry');
    }
    return renderGeometrySvgFromState(data.jsonState);
  },
  async restoreFileFromCustomData(element): Promise<RestoredStampFile | null> {
    const data = element.customData as GeometryCustomData | undefined;
    const fileId = (element as { fileId?: string | null }).fileId;
    if (!data || !fileId) return null;
    if (!isGeometryCustomData(data)) return null;
    const svgString = await renderGeometrySvgFromState(data.jsonState);
    const utf8 = unescape(encodeURIComponent(svgString));
    const dataURL = 'data:image/svg+xml;base64,' + (
      typeof btoa !== 'undefined' ? btoa(utf8) : Buffer.from(utf8).toString('base64')
    );
    return { fileId, dataURL, mimeType: 'image/svg+xml' };
  },
  Host: GeometryStampHost,
};
