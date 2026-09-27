'use client';

import { forwardRef, useCallback, useMemo } from 'react';
import { GeometryStudio } from './studio/GeometryStudio';
import { insertStampImage } from '../shared/insertImage';
import { isGeometryCustomData, type GeometryCustomData } from './types';
import type { StampHostProps, StampHostHandle } from '../shared/types';
import type { StampLeftPanelSearchProps } from '../shared/StampLeftPanel/types';
import { buildGraph2DSeed, parseFunctionInput } from '../graph-2d/fromExpression';

/** Adapter Excalidraw cho GeometryStudio. Toàn bộ điều phối editor nằm ở Studio. */
export const GeometryStampHost = forwardRef<StampHostHandle, StampHostProps>(
  function GeometryStampHost(
    {
      api,
      editingElement,
      onClose,
      isDark,
      generateGeometryFigure,
      onGeometryDraft,
      canOpenStamp,
      onOpenStamp,
    },
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

    // Gõ một hàm số vào ô "Tìm công cụ" → gợi ý chuyển sang Đồ thị 2D đã điền
    // sẵn hàm đó. Chỉ bật khi Whiteboard có đăng ký stamp graph2d.
    const coDoThi = !!onOpenStamp && !!canOpenStamp?.('graph2d');
    const toolSearch = useMemo<StampLeftPanelSearchProps | undefined>(
      () =>
        coDoThi
          ? {
              placeholder: 'Tìm công cụ hoặc gõ hàm số, vd y = x^2 − 2x',
              actionForQuery: (query) => {
                const parsed = parseFunctionInput(query);
                if (!parsed) return null;
                return {
                  label: `Vẽ đồ thị y = ${parsed.expression}`,
                  hint: 'Chuyển sang Đồ thị 2D',
                  icon: '📈',
                  testId: 'tool-search-graph2d',
                  onRun: () => onOpenStamp!('graph2d', buildGraph2DSeed(parsed)),
                };
              },
            }
          : undefined,
      [coDoThi, onOpenStamp],
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
        toolSearch={toolSearch}
      />
    );
  },
);
