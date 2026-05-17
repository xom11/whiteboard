'use client';

import { lazy } from 'react';
import { renderGraph2dSvgFromState } from './render';
import type {
  RestoredStampFile,
  StampType,
} from '../shared/types';
import { isGraph2DCustomData, type Graph2DCustomData } from './types';

export { isGraph2DCustomData };
export type { Graph2DCustomData };

const Graph2DStampHost = lazy(() =>
  import('./host').then((m) => ({ default: m.Graph2DStampHost })),
);

const Graph2DIcon = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M3 21 V3" />
    <path d="M3 21 H21" />
    <path d="M5 19 C8 5, 14 5, 19 17" />
  </svg>
);

export const graph2dStamp: StampType = {
  kind: 'graph2d',
  experimental: true,
  shortcutKey: 'h',
  toolbarLabel: 'H',
  toolbarTitle: 'Chèn đồ thị 2D (H)',
  toolbarIcon: Graph2DIcon,
  toolbarTestId: 'stamp-toolbar-graph2d',
  matchesCustomData: isGraph2DCustomData,
  async renderSvgFromCustomData(data) {
    if (!isGraph2DCustomData(data)) {
      throw new Error('graph2dStamp.renderSvgFromCustomData: customData không phải graph2d');
    }
    return renderGraph2dSvgFromState(data.jsonState);
  },
  async restoreFileFromCustomData(element): Promise<RestoredStampFile | null> {
    const data = element.customData as Graph2DCustomData | undefined;
    const fileId = (element as { fileId?: string | null }).fileId;
    if (!data || !fileId) return null;
    if (!isGraph2DCustomData(data)) return null;
    const svgString = await renderGraph2dSvgFromState(data.jsonState);
    const utf8 = unescape(encodeURIComponent(svgString));
    const dataURL =
      'data:image/svg+xml;base64,' +
      (typeof btoa !== 'undefined' ? btoa(utf8) : Buffer.from(utf8).toString('base64'));
    return { fileId, dataURL, mimeType: 'image/svg+xml' };
  },
  Host: Graph2DStampHost,
};
