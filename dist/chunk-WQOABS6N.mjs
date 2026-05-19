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

// src/stamps/geometry-3d/render.ts
var OUTPUT_WIDTH = 1024;
var OUTPUT_HEIGHT = 768;
async function renderGeometry3DSvgFromState(jsonState) {
  const state = parseSerializedBoard3D(jsonState);
  const JXG = (await import('jsxgraph')).default;
  const div = document.createElement("div");
  div.style.cssText = `position:absolute;left:-9999px;top:-9999px;width:${OUTPUT_WIDTH}px;height:${OUTPUT_HEIGHT}px;`;
  document.body.appendChild(div);
  try {
    JXG.Options.text.display = "internal";
    const board = JXG.JSXGraph.initBoard(div, {
      boundingbox: state.bbox,
      keepaspectratio: true,
      axis: false,
      showCopyright: false,
      showNavigation: false,
      renderer: "svg"
    });
    const baseAttrs = VIEW3D_ATTRS(false);
    const view = board.create(
      "view3d",
      [
        [-5, -5],
        [10, 10],
        [
          [state.view.bbox3D[0], state.view.bbox3D[3]],
          [state.view.bbox3D[1], state.view.bbox3D[4]],
          [state.view.bbox3D[2], state.view.bbox3D[5]]
        ]
      ],
      {
        ...baseAttrs,
        // JSXGraph view3d đọc azimuth/elevation từ az.slider.start (không phải
        // az.value). Nếu pass `value` → JSXGraph bỏ qua → render rơi về default
        // (1.0 rad / 0.3 rad), không khớp góc user xoay trong editor.
        az: { ...baseAttrs.az, slider: { ...baseAttrs.az.slider, start: state.view.azimuth } },
        el: { ...baseAttrs.el, slider: { ...baseAttrs.el.slider, start: state.view.elevation } }
      }
    );
    try {
      const v = view;
      v?.az_slide?.setValue?.(state.view.azimuth);
      v?.el_slide?.setValue?.(state.view.elevation);
      v?.board?.update?.();
    } catch {
    }
    if (!state.showAxes) {
      view.defaultAxes = [];
    }
    try {
      view.create(
        "plane3d",
        [
          [0, 0, 0],
          [1, 0, 0],
          [0, 1, 0],
          GROUND_PLANE_RANGE,
          GROUND_PLANE_RANGE
        ],
        GROUND_PLANE_ATTRS(false)
      );
    } catch {
    }
    const idMap = /* @__PURE__ */ new Map();
    for (const el of state.elements) {
      const parents = el.parents.map(
        (p) => typeof p === "string" && p.startsWith("@id:") ? idMap.get(p.slice(4)) : p
      );
      const obj = view.create(el.type, parents, {
        ...el.attributes,
        id: el.id,
        name: el.label
      });
      idMap.set(el.id, obj);
    }
    const svg = div.querySelector("svg");
    if (!svg) {
      throw new Error("renderGeometry3DSvgFromState: SVG not produced");
    }
    const clone = svg.cloneNode(true);
    clone.setAttribute("width", String(OUTPUT_WIDTH));
    clone.setAttribute("height", String(OUTPUT_HEIGHT));
    const svgString = new XMLSerializer().serializeToString(clone);
    try {
      JXG.JSXGraph.freeBoard(board);
    } catch {
    }
    return { svgString, width: OUTPUT_WIDTH, height: OUTPUT_HEIGHT };
  } finally {
    document.body.removeChild(div);
  }
}

export { DEFAULT_VIEW3D, GROUND_PLANE_ATTRS, GROUND_PLANE_RANGE, VIEW3D_ATTRS, isGeometry3DCustomData, paletteFor2 as paletteFor, parseSerializedBoard3D, renderGeometry3DSvgFromState, serializeBoard3D };
//# sourceMappingURL=chunk-WQOABS6N.mjs.map
//# sourceMappingURL=chunk-WQOABS6N.mjs.map