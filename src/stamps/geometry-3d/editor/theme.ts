import {
  paletteFor as palette2D,
  type GeomPalette,
} from '../../geometry-2d/editor/theme';

export type Geom3DPalette = GeomPalette & {
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
  return {
    az: { slider: { visible: false }, point2: { visible: false } },
    el: { slider: { visible: false } },
    projection: 'central' as const,
    axesPosition: 'border' as const,
    xAxis: { strokeColor: p.axisX, lastArrow: { type: 2 } },
    yAxis: { strokeColor: p.axisY, lastArrow: { type: 2 } },
    zAxis: { strokeColor: p.axisZ, lastArrow: { type: 2 } },
  };
};
