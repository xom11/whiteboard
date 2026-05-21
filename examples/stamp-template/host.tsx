// examples/stamp-template/host.tsx
// Host component — bọc trọn UI editor + insert logic. Whiteboard mount host
// khi activeStamp khớp kind. Phải forwardRef để parent gọi tryInsert()/hasContent().
'use client';

import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { insertStampImage } from '../../src/stamps/shared/insertImage';
import type { StampHostProps, StampHostHandle } from '../../src/stamps/shared/types';
import { renderColorSwatchSvg } from './render';
import { isColorSwatchCustomData, type ColorSwatchCustomData } from './types';

export const ColorSwatchHost = forwardRef<StampHostHandle, StampHostProps>(
  function ColorSwatchHost({ api, editingElement, onClose }, ref) {
    // Restore màu từ editing element (re-edit) hoặc default.
    const initialColor =
      editingElement && isColorSwatchCustomData(editingElement.customData)
        ? editingElement.customData.color
        : '#cccccc';
    const colorRef = useRef<string>(initialColor);

    const handleInsert = useCallback(async () => {
      if (!api) return;
      try {
        const svgString = await renderColorSwatchSvg(colorRef.current);
        await insertStampImage(api, {
          svgString,
          makeCustomData: (): ColorSwatchCustomData => ({
            kind: 'color-swatch',
            version: 1,
            color: colorRef.current,
          }),
          editingElementId: editingElement?.id ?? null,
        });
      } catch (err) {
        console.error('color-swatch insert failed:', err);
      }
      onClose();
    }, [api, editingElement?.id, onClose]);

    useImperativeHandle(
      ref,
      () => ({
        tryInsert: () => {
          void handleInsert();
          return true;
        },
        hasContent: () => true,
      }),
      [handleInsert],
    );

    // TODO: thay div này bằng editor UI thật (color picker, properties panel...).
    return (
      <div style={{ position: 'fixed', top: 20, left: 20, padding: 12, background: '#fff', border: '1px solid #ccc' }}>
        <label>
          Color:{' '}
          <input
            type="color"
            defaultValue={initialColor}
            onChange={(e) => {
              colorRef.current = e.target.value;
            }}
          />
        </label>
        <button onClick={() => void handleInsert()} style={{ marginLeft: 8 }}>
          Insert
        </button>
        <button onClick={onClose} style={{ marginLeft: 4 }}>
          Cancel
        </button>
      </div>
    );
  },
);
