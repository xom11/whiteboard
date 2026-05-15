'use client';

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { GeometryLeftPanel } from '../StampLeftPanel';
import {
  GeometryEditorPanel,
  type GeometryEditorPanelHandle,
  type GeomBoardState,
} from '../GeometryEditorPanel';
import type { GeomTool } from '../JSXGraphMiniBoard';
import { insertStampImage } from '../../core/insertStampImage';
import { renderGeometrySvgFromState } from '../renderGeometryFromState';
import type { SerializedBoard } from '../serializeBoard';
import type {
  BaseStampCustomData,
  StampHostProps,
  StampHostHandle,
  StampType,
} from './types';

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
        />
        <GeometryEditorPanel
          ref={panelRef}
          initialState={initialState}
          onInsert={handleInsert}
          onClose={onClose}
          onStateChange={setGeomState}
          withLeftPanel
          isDark={isDark}
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
  async renderSvgFromCustomData(data, ctx) {
    if (!isGeometryCustomData(data)) {
      throw new Error('geometryStamp.renderSvgFromCustomData: customData không phải geometry');
    }
    return renderGeometrySvgFromState(data.jsonState, !!ctx?.isDark);
  },
  Host: GeometryStampHost,
};
