'use client';

import { lazy, type ReactNode } from 'react';
import {
  isGeometry3DCustomData,
  type Geometry3DCustomData,
} from './serialize';
import { renderGeometry3DSvgFromState } from './render';
import type {
  RestoredStampFile,
  StampType,
} from '../shared/types';
import { svgToStampFile } from '../shared/svgToStampFile';

export type { Geometry3DCustomData };

const Geometry3DStampHost = lazy(() =>
  import('./host').then((m) => ({ default: m.Geometry3DStampHost })),
);

const Geometry3DIcon: ReactNode = (
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
    {/* Mặt trước */}
    <path d="M4 9 L4 20 L14 20 L14 9 Z" />
    {/* Mặt trên */}
    <path d="M4 9 L10 4 L20 4 L14 9 Z" />
    {/* Mặt phải */}
    <path d="M14 9 L20 4 L20 15 L14 20 Z" />
  </svg>
);

export const geometry3dStamp: StampType<Geometry3DCustomData> = {
  kind: 'geometry3d',
  experimental: true,
  shortcutKey: 'd',
  toolbarLabel: 'D',
  toolbarTitle: 'Hình 3D (D)',
  toolbarIcon: Geometry3DIcon,
  toolbarTestId: 'stamp-toolbar-geometry3d',
  matchesCustomData: isGeometry3DCustomData,
  async renderSvgFromCustomData(data: unknown): Promise<string> {
    if (!isGeometry3DCustomData(data)) {
      throw new Error('geometry3dStamp.renderSvgFromCustomData: customData không phải geometry3d');
    }
    const { svgString } = await renderGeometry3DSvgFromState(data.jsonState);
    return svgString;
  },
  restoreFileFromCustomData: async (element): Promise<RestoredStampFile | null> => {
    const data = element.customData as Geometry3DCustomData | undefined;
    const fileId = (element as { fileId?: string | null }).fileId;
    if (!data || !fileId || !isGeometry3DCustomData(data)) return null;
    try {
      const { svgString } = await renderGeometry3DSvgFromState(data.jsonState);
      return svgToStampFile(svgString, fileId);
    } catch {
      return null;
    }
  },
  Host: Geometry3DStampHost,
};
