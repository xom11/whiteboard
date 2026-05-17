'use client';

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { LeftPanel as LatexLeftPanel } from './editor/LeftPanel';
import {
  EditorPopover as LatexEditorPopover,
  type EditorPopoverHandle as LatexEditorHandle,
} from './editor/EditorPopover';
import { insertStampImage } from '../shared/insertImage';
import { useIsMobile } from '../shared/useIsMobile';
import { isLatexCustomData, type LatexCustomData } from './types';
import type { StampHostProps, StampHostHandle } from '../shared/types';

export const LatexStampHost = forwardRef<StampHostHandle, StampHostProps>(
  function LatexStampHost({ api, editingElement, onClose }, ref) {
    const editorRef = useRef<LatexEditorHandle | null>(null);
    const { isMobile } = useIsMobile();
    const [drawerOpen, setDrawerOpen] = useState(false);

    const initial = useMemo(() => {
      if (editingElement && isLatexCustomData(editingElement.customData)) {
        return {
          initialValue: editingElement.customData.src,
          displayMode: !!editingElement.customData.displayMode,
        };
      }
      return { initialValue: '', displayMode: false };
    }, [editingElement]);

    const [displayMode, setDisplayMode] = useState(initial.displayMode);

    const handleInsert = useCallback(
      async (svgString: string, src: string, dm: boolean) => {
        if (!api) return;
        try {
          await insertStampImage(api, {
            svgString,
            makeCustomData: (): LatexCustomData => ({
              kind: 'latex',
              version: 1,
              src,
              displayMode: dm,
            }),
            editingElementId: editingElement?.id ?? null,
          });
        } catch (err) {
          console.error('Latex insert failed:', err);
        }
        onClose();
      },
      [api, editingElement?.id, onClose],
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
        <LatexLeftPanel
          displayMode={displayMode}
          onDisplayModeChange={setDisplayMode}
          onInsertSnippet={(s) => editorRef.current?.insertAtCursor(s)}
          onClose={onClose}
          isMobile={isMobile}
          drawerOpen={drawerOpen}
          onDrawerClose={() => setDrawerOpen(false)}
        />
        <LatexEditorPopover
          ref={editorRef}
          x={0}
          y={0}
          initialValue={initial.initialValue}
          displayMode={displayMode}
          onDisplayModeChange={setDisplayMode}
          onInsert={handleInsert}
          onClose={onClose}
          withLeftPanel={!isMobile}
          isMobile={isMobile}
          onOpenDrawer={() => setDrawerOpen(true)}
        />
      </>
    );
  },
);
