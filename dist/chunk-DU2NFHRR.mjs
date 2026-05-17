"use client";
import { paletteFor } from './chunk-HTBLO5JO.mjs';

// src/stamps/geometry-3d/serialize.ts
function isGeometry3DCustomData(data) {
  if (!data || typeof data !== "object") return false;
  const d = data;
  return d.kind === "geometry3d" && (d.version === 1 || d.version === 2) && typeof d.jsonState === "string";
}
function serializeBoard3D(state) {
  return JSON.stringify(state);
}
function parseSerializedBoard3D(json) {
  const parsed = JSON.parse(json);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("parseSerializedBoard3D: not an object");
  }
  const p = parsed;
  if (p.version !== 1 && p.version !== 2) {
    throw new Error(`parseSerializedBoard3D: unsupported version ${String(p.version)}`);
  }
  if (!Array.isArray(p.elements)) {
    throw new Error("parseSerializedBoard3D: elements missing");
  }
  return parsed;
}

// src/stamps/geometry-3d/editor/theme.ts
function paletteFor2(isDark) {
  const base = paletteFor(isDark);
  return {
    ...base,
    view3dBg: isDark ? "#1a1a1a" : "#ffffff",
    axisX: "#d63b3b",
    axisY: "#2d8a2d",
    axisZ: "#2d6dd6"
  };
}
var DEFAULT_VIEW3D = {
  azimuth: 0.7,
  elevation: 0.4,
  bbox3D: [-3, -3, -3, 3, 3, 3]
};
var VIEW3D_ATTRS = (isDark) => {
  const p = paletteFor2(isDark);
  const axisLabel = (color) => ({
    strokeColor: color,
    fontSize: 14,
    offset: [10, 0]
  });
  return {
    az: { slider: { visible: false }, point2: { visible: false } },
    el: { slider: { visible: false } },
    projection: "central",
    // GeoGebra-style: axes pass through origin (0,0,0) instead of bbox border.
    axesPosition: "center",
    xAxis: {
      strokeColor: p.axisX,
      strokeWidth: 2,
      lastArrow: { type: 2, size: 8 },
      name: "x",
      withLabel: true,
      label: axisLabel(p.axisX)
    },
    yAxis: {
      strokeColor: p.axisY,
      strokeWidth: 2,
      lastArrow: { type: 2, size: 8 },
      name: "y",
      withLabel: true,
      label: axisLabel(p.axisY)
    },
    zAxis: {
      strokeColor: p.axisZ,
      strokeWidth: 2,
      lastArrow: { type: 2, size: 8 },
      name: "z",
      withLabel: true,
      label: axisLabel(p.axisZ)
    },
    // GeoGebra-style: hide ALL bbox wall planes; the XY ground plane is drawn
    // explicitly at z=0 via the helper below (so it coincides with Ox/Oy).
    xPlaneRear: { visible: false, mesh3d: { visible: false } },
    yPlaneRear: { visible: false, mesh3d: { visible: false } },
    zPlaneRear: { visible: false, mesh3d: { visible: false } }
  };
};
var GROUND_PLANE_ATTRS = (isDark) => ({
  fillColor: isDark ? "#2a2a2a" : "#e6e6e6",
  fillOpacity: isDark ? 0.5 : 0.55,
  strokeColor: isDark ? "#3a3a3a" : "#cfcfcf",
  strokeOpacity: 0.7,
  strokeWidth: 1,
  fixed: true,
  highlight: false,
  withLabel: false,
  layer: 0
});
var GROUND_PLANE_RANGE = [-3, 3];

export { DEFAULT_VIEW3D, GROUND_PLANE_ATTRS, GROUND_PLANE_RANGE, VIEW3D_ATTRS, isGeometry3DCustomData, paletteFor2 as paletteFor, parseSerializedBoard3D, serializeBoard3D };
//# sourceMappingURL=chunk-DU2NFHRR.mjs.map
//# sourceMappingURL=chunk-DU2NFHRR.mjs.map