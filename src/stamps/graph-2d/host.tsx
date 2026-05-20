'use client';
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import {
  GraphEditorPanel,
  type GraphEditorPanelHandle,
} from './editor/EditorPanel';
import { insertStampImage } from '../shared/insertImage';
import { isGraph2DCustomData, type Graph2DCustomData } from './types';
import { parseSceneState } from './serialize';
import type { StampHostProps, StampHostHandle } from '../shared/types';

export const Graph2DStampHost = forwardRef<StampHostHandle, StampHostProps>(
  function Graph2DStampHost({ api, editingElement, onClose, isDark }, ref) {
    const panelRef = useRef<GraphEditorPanelHandle | null>(null);

    const initialState = useMemo(() => {
      if (!editingElement) return null;
      if (!isGraph2DCustomData(editingElement.customData)) return null;
      const state = parseSceneState(editingElement.customData.sceneJson);
      if (!state) {
        console.warn('Graph2DStampHost: sceneJson corrupted hoặc không hợp lệ');
        return null;
      }
      return state;
    }, [editingElement]);

    const handleInsert = useCallback(
      async (sceneJson: string, svgString: string) => {
        if (!api) return;
        try {
          await insertStampImage(api, {
            svgString,
            makeCustomData: (width, height): Graph2DCustomData => ({
              kind: 'graph2d',
              version: 2,
              sceneJson,
              svgWidth: width,
              svgHeight: height,
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

    return (
      <GraphEditorPanel
        ref={panelRef}
        initialState={initialState}
        onInsert={handleInsert}
        onClose={onClose}
        isDark={isDark}
        withLeftPanel={true}
      />
    );
  },
);
