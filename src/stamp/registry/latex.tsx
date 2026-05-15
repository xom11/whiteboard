'use client';

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { LatexLeftPanel } from '../StampLeftPanel';
import { LatexEditorPopover, type LatexEditorHandle } from '../LatexEditorPopover';
import { insertStampImage } from '../../core/insertStampImage';
import { renderLatexToSvg } from '../renderLatexToSvg';
import type {
  BaseStampCustomData,
  StampHostProps,
  StampHostHandle,
  StampType,
} from './types';

// ============== Custom data type + guard ==============

export interface LatexCustomData extends BaseStampCustomData {
  kind: 'latex';
  version: 1;
  src: string;
  displayMode: boolean;
}

export function isLatexCustomData(data: unknown): data is LatexCustomData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Partial<LatexCustomData>;
  return d.kind === 'latex' && d.version === 1 && typeof d.src === 'string';
}

// ============== Host component ==============

const LatexStampHost = forwardRef<StampHostHandle, StampHostProps>(
  function LatexStampHost({ api, editingElement, onClose }, ref) {
    const editorRef = useRef<LatexEditorHandle | null>(null);

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
          withLeftPanel
        />
      </>
    );
  },
);

// ============== Stamp definition ==============

const LatexIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17 5 H7 L13 12 L7 19 H17" />
  </svg>
);

export const latexStamp: StampType = {
  kind: 'latex',
  shortcutKey: 'l',
  toolbarLabel: 'L',
  toolbarTitle: 'Chèn công thức LaTeX (L)',
  toolbarIcon: LatexIcon,
  toolbarTestId: 'stamp-toolbar-latex',
  matchesCustomData: isLatexCustomData,
  async renderSvgFromCustomData(data, ctx) {
    if (!isLatexCustomData(data)) {
      throw new Error('latexStamp.renderSvgFromCustomData: customData không phải latex');
    }
    return renderLatexToSvg(data.src, data.displayMode, !!ctx?.isDark);
  },
  Host: LatexStampHost,
};
