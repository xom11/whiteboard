'use client';

import { forwardRef, useCallback } from 'react';
import { GeometryStudio } from './studio/GeometryStudio';
import { insertStampImage } from '../shared/insertImage';
import { isGeometryCustomData, type GeometryCustomData } from './types';
import type { StampHostProps, StampHostHandle } from '../shared/types';

/** Adapter Excalidraw cho GeometryStudio. Toàn bộ điều phối editor nằm ở Studio. */
export const GeometryStampHost = forwardRef<StampHostHandle, StampHostProps>(
  function GeometryStampHost(
    { api, editingElement, onClose, isDark, generateGeometryFigure, onGeometryDraft },
    ref,
  ) {
    const initialJsonState = isGeometryCustomData(editingElement?.customData)
      ? editingElement.customData.jsonState
      : undefined;

    const handleCommit = useCallback(
      async (jsonState: string, svgString: string): Promise<boolean> => {
        if (!api) return false;
        await insertStampImage(api, {
          svgString,
          makeCustomData: (): GeometryCustomData => ({
            kind: 'geometry',
            version: 1,
            jsonState,
          }),
          editingElementId: editingElement?.id ?? null,
          preserveExistingSize: true,
        });
        return true;
      },
      [api, editingElement?.id],
    );

    return (
      <GeometryStudio
        ref={ref}
        initialJsonState={initialJsonState}
        onCommit={handleCommit}
        onClose={onClose}
        isDark={isDark}
        api={api}
        generateGeometryFigure={generateGeometryFigure}
        onGeometryDraft={onGeometryDraft}
      />
    );
  },
);
