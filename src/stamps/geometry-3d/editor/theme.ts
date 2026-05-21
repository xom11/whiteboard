import {
  paletteFor as palette2D,
} from '../../geometry-2d/editor/theme';
import type { Theme2D } from '../../../core/scene/render/types2d';

export type Geom3DPalette = Theme2D & {
  view3dBg: string;
  axisX: string;
  axisY: string;
  axisZ: string;
};

export function paletteFor(isDark: boolean): Geom3DPalette {
  const base = palette2D(isDark);
  return {
    ...base,
    view3dBg: isDark ? '#1a1a1a' : '#ffffff',
    axisX: '#d63b3b',
    axisY: '#2d8a2d',
    axisZ: '#2d6dd6',
  };
}

export const DEFAULT_VIEW3D: {
  azimuth: number;
  elevation: number;
  bbox3D: [number, number, number, number, number, number];
} = {
  azimuth: 0.7,
  elevation: 0.4,
  bbox3D: [-3, -3, -3, 3, 3, 3],
};

export const VIEW3D_ATTRS = (isDark: boolean) => {
  const p = paletteFor(isDark);
  const axisLabel = (color: string) => ({
    strokeColor: color,
    fontSize: 14,
    offset: [10, 0] as [number, number],
  });
  return {
    az: { slider: { visible: false }, point2: { visible: false } },
    el: { slider: { visible: false } },
    projection: 'central' as const,
    // GeoGebra-style: axes pass through origin (0,0,0) instead of bbox border.
    axesPosition: 'center' as const,
    xAxis: {
      strokeColor: p.axisX,
      strokeWidth: 2,
      lastArrow: { type: 2, size: 8 },
      name: 'x',
      withLabel: true,
      label: axisLabel(p.axisX),
    },
    yAxis: {
      strokeColor: p.axisY,
      strokeWidth: 2,
      lastArrow: { type: 2, size: 8 },
      name: 'y',
      withLabel: true,
      label: axisLabel(p.axisY),
    },
    zAxis: {
      strokeColor: p.axisZ,
      strokeWidth: 2,
      lastArrow: { type: 2, size: 8 },
      name: 'z',
      withLabel: true,
      label: axisLabel(p.axisZ),
    },
    // GeoGebra-style: hide ALL bbox wall planes; the XY ground plane is drawn
    // explicitly at z=0 via the helper below (so it coincides with Ox/Oy).
    xPlaneRear: { visible: false, mesh3d: { visible: false } },
    yPlaneRear: { visible: false, mesh3d: { visible: false } },
    zPlaneRear: { visible: false, mesh3d: { visible: false } },
  };
};

export const GROUND_PLANE_ATTRS = (isDark: boolean) => ({
  fillColor: isDark ? '#2a2a2a' : '#e6e6e6',
  fillOpacity: isDark ? 0.5 : 0.55,
  strokeColor: isDark ? '#3a3a3a' : '#cfcfcf',
  strokeOpacity: 0.7,
  strokeWidth: 1,
  fixed: true,
  highlight: false,
  withLabel: false,
  layer: 0,
});

/** XY ground plane extent (square around origin in user units). */
export const GROUND_PLANE_RANGE: [number, number] = [-3, 3];
