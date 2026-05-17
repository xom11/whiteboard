"use client";
import { isGeometry3DCustomData, parseSerializedBoard3D } from './chunk-BFUP5QTF.mjs';
import { lazy } from 'react';
import { jsxs, jsx } from 'react/jsx-runtime';

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
      axis: false,
      showCopyright: false,
      showNavigation: false,
      renderer: "svg"
    });
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
        az: { slider: { visible: false }, value: state.view.azimuth },
        el: { slider: { visible: false }, value: state.view.elevation },
        projection: "central"
      }
    );
    if (!state.showAxes) {
      view.defaultAxes = [];
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
var Geometry3DStampHost = lazy(
  () => import('./host-IR36GT5N.mjs').then((m) => ({ default: m.Geometry3DStampHost }))
);
var Geometry3DIcon = /* @__PURE__ */ jsxs(
  "svg",
  {
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.6",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
    children: [
      /* @__PURE__ */ jsx("path", { d: "M4 9 L4 20 L14 20 L14 9 Z" }),
      /* @__PURE__ */ jsx("path", { d: "M4 9 L10 4 L20 4 L14 9 Z" }),
      /* @__PURE__ */ jsx("path", { d: "M14 9 L20 4 L20 15 L14 20 Z" })
    ]
  }
);
var geometry3dStamp = {
  kind: "geometry3d",
  experimental: true,
  shortcutKey: "d",
  toolbarLabel: "D",
  toolbarTitle: "H\xECnh 3D (D)",
  toolbarIcon: Geometry3DIcon,
  toolbarTestId: "stamp-toolbar-geometry3d",
  matchesCustomData: isGeometry3DCustomData,
  async renderSvgFromCustomData(data) {
    if (!isGeometry3DCustomData(data)) {
      throw new Error("geometry3dStamp.renderSvgFromCustomData: customData kh\xF4ng ph\u1EA3i geometry3d");
    }
    const { svgString } = await renderGeometry3DSvgFromState(data.jsonState);
    return svgString;
  },
  restoreFileFromCustomData: async (element) => {
    const data = element.customData;
    const fileId = element.fileId;
    if (!data || !fileId) return null;
    if (!isGeometry3DCustomData(data)) return null;
    try {
      const { svgString } = await renderGeometry3DSvgFromState(data.jsonState);
      const dataURL = `data:image/svg+xml;base64,${typeof btoa !== "undefined" ? btoa(unescape(encodeURIComponent(svgString))) : Buffer.from(svgString).toString("base64")}`;
      return { fileId, dataURL, mimeType: "image/svg+xml" };
    } catch {
      return null;
    }
  },
  Host: Geometry3DStampHost
};

export { geometry3dStamp };
//# sourceMappingURL=chunk-4DNQWZFX.mjs.map
//# sourceMappingURL=chunk-4DNQWZFX.mjs.map