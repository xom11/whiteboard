'use client';
import { lazy, type ReactNode } from 'react';
import { renderGraphSvgFromState } from './render';
import { isGraph2DCustomData, type Graph2DCustomData } from './types';
import { parseSceneState } from './serialize';
import { svgToImageElement } from '../shared/svgToImage';
import type { RestoredStampFile, StampType } from '../shared/types';

export { isGraph2DCustomData };
export type { Graph2DCustomData };

const Graph2DStampHost = lazy(() =>
  import('./host').then((m) => ({ default: m.Graph2DStampHost })),
);

const Graph2DIcon: ReactNode = (
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
    <path d="M3 3L3 21L21 21" />
    <path d="M6 16Q9 8 12 10Q15 12 18 6" />
  </svg>
);

export const graph2dStamp: StampType = {
  kind: 'graph2d',
  shortcutKey: 'h',
  toolbarLabel: '📈',
  toolbarTitle: 'Chèn đồ thị 2D (H)',
  toolbarIcon: Graph2DIcon,
  toolbarTestId: 'graph2d-stamp',
  experimental: true,
  matchesCustomData: isGraph2DCustomData,

  async renderSvgFromCustomData(data: unknown): Promise<string> {
    if (!isGraph2DCustomData(data)) {
      throw new Error('graph2dStamp.renderSvgFromCustomData: customData không phải graph2d v2');
    }
    const state = parseSceneState(data.sceneJson);
    if (!state) throw new Error('graph2dStamp.renderSvgFromCustomData: sceneJson không hợp lệ');
    return renderGraphSvgFromState(state, false);
  },

  async restoreFileFromCustomData(element): Promise<RestoredStampFile | null> {
    const data = element.customData;
    if (!isGraph2DCustomData(data)) return null;
    const fileId = (element as { fileId?: string | null }).fileId;
    if (!fileId) return null;
    const state = parseSceneState(data.sceneJson);
    if (!state) return null;
    const svgString = await renderGraphSvgFromState(state, false);
    const result = await svgToImageElement(svgString);
    return { fileId, dataURL: result.dataURL, mimeType: result.mimeType };
  },

  Host: Graph2DStampHost,
};
