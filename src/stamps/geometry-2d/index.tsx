'use client';

import { lazy, type ReactNode } from 'react';
import { renderGeometrySvgFromState } from './render';
import type {
  RestoredStampFile,
  StampType,
} from '../shared/types';
import { svgToStampFile } from '../shared/svgToStampFile';
import {
  isGeometryCustomData,
  type GeometryCustomData,
} from './types';

export type { GeometryCustomData };

const GeometryStampHost = lazy(() =>
  import('./host').then((m) => ({ default: m.GeometryStampHost })),
);

const GeometryIcon: ReactNode = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="4,20 20,20 12,5" />
    <circle cx="4" cy="20" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="20" cy="20" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="12" cy="5" r="1.4" fill="currentColor" stroke="none" />
  </svg>
);

export const geometryStamp: StampType<GeometryCustomData> = {
  kind: 'geometry',
  shortcutKey: 'g',
  toolbarLabel: 'G',
  toolbarTitle: 'Chèn hình học (G)',
  toolbarIcon: GeometryIcon,
  toolbarTestId: 'stamp-toolbar-geometry',
  matchesCustomData: isGeometryCustomData,
  async renderSvgFromCustomData(data) {
    if (!isGeometryCustomData(data)) {
      throw new Error('geometryStamp.renderSvgFromCustomData: customData không phải geometry');
    }
    return renderGeometrySvgFromState(data.jsonState);
  },
  async restoreFileFromCustomData(element): Promise<RestoredStampFile | null> {
    const data = element.customData as GeometryCustomData | undefined;
    const fileId = (element as { fileId?: string | null }).fileId;
    if (!data || !fileId || !isGeometryCustomData(data)) return null;
    const svgString = await renderGeometrySvgFromState(data.jsonState);
    return svgToStampFile(svgString, fileId);
  },
  Host: GeometryStampHost,
};
