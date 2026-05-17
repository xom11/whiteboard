'use client';

import { lazy } from 'react';
import { renderLatexToSvg } from './render';
import type {
  RestoredStampFile,
  StampType,
} from '../shared/types';
import { isLatexCustomData, type LatexCustomData } from './types';

export { isLatexCustomData };
export type { LatexCustomData };

const LatexStampHost = lazy(() =>
  import('./host').then((m) => ({ default: m.LatexStampHost })),
);

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
  async renderSvgFromCustomData(data) {
    if (!isLatexCustomData(data)) {
      throw new Error('latexStamp.renderSvgFromCustomData: customData không phải latex');
    }
    return renderLatexToSvg(data.src, data.displayMode);
  },
  async restoreFileFromCustomData(element): Promise<RestoredStampFile | null> {
    const data = element.customData as LatexCustomData | undefined;
    const fileId = (element as { fileId?: string | null }).fileId;
    if (!data || !fileId) return null;
    if (!isLatexCustomData(data)) return null;
    const svgString = await renderLatexToSvg(data.src, data.displayMode);
    const utf8 = unescape(encodeURIComponent(svgString));
    const dataURL = 'data:image/svg+xml;base64,' + (
      typeof btoa !== 'undefined' ? btoa(utf8) : Buffer.from(utf8).toString('base64')
    );
    return { fileId, dataURL, mimeType: 'image/svg+xml' };
  },
  Host: LatexStampHost,
};
