// examples/stamp-template/index.tsx
// Public stamp definition. Đăng ký kind, shortcut, icon, type guard, renderer.
'use client';

import { lazy, type ReactNode } from 'react';
import type { StampType, RestoredStampFile } from '../../src/stamps/shared/types';
import { renderColorSwatchSvg } from './render';
import { isColorSwatchCustomData, type ColorSwatchCustomData } from './types';

export type { ColorSwatchCustomData };

// Lazy-load Host để stamp picker không kéo theo editor UI lúc khởi tạo Whiteboard.
const ColorSwatchHost = lazy(() =>
  import('./host').then((m) => ({ default: m.ColorSwatchHost })),
);

const ColorSwatchIcon: ReactNode = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <rect x="4" y="4" width="16" height="16" rx="2" />
  </svg>
);

export const colorSwatchStamp: StampType<ColorSwatchCustomData> = {
  // TODO: đổi 'color-swatch' / 'k' / 'K' thành kind+shortcut của bạn.
  kind: 'color-swatch',
  shortcutKey: 'k',
  toolbarLabel: 'K',
  toolbarTitle: 'Chèn ô màu (K)',
  toolbarIcon: ColorSwatchIcon,
  toolbarTestId: 'stamp-toolbar-color-swatch',
  // experimental: true,  // bật khi stamp chưa stable

  matchesCustomData: isColorSwatchCustomData,

  async renderSvgFromCustomData(data) {
    if (!isColorSwatchCustomData(data)) {
      throw new Error('colorSwatchStamp.renderSvgFromCustomData: customData không phải color-swatch');
    }
    return renderColorSwatchSvg(data.color);
  },

  async restoreFileFromCustomData(element): Promise<RestoredStampFile | null> {
    const data = element.customData as ColorSwatchCustomData | undefined;
    const fileId = (element as { fileId?: string | null }).fileId;
    if (!data || !fileId) return null;
    if (!isColorSwatchCustomData(data)) return null;
    const svgString = await renderColorSwatchSvg(data.color);
    const utf8 = unescape(encodeURIComponent(svgString));
    const dataURL =
      'data:image/svg+xml;base64,' +
      (typeof btoa !== 'undefined' ? btoa(utf8) : Buffer.from(utf8).toString('base64'));
    return { fileId, dataURL, mimeType: 'image/svg+xml' };
  },

  Host: ColorSwatchHost,
};
