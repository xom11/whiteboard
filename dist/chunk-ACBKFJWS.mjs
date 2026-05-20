"use client";
import { isGeometry3DCustomData, renderGeometry3DSvgFromState } from './chunk-7WNDGXBJ.mjs';
import { lazy } from 'react';
import { jsxs, jsx } from 'react/jsx-runtime';

var Geometry3DStampHost = lazy(
  () => import('./host-QASORHVP.mjs').then((m) => ({ default: m.Geometry3DStampHost }))
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
//# sourceMappingURL=chunk-ACBKFJWS.mjs.map
//# sourceMappingURL=chunk-ACBKFJWS.mjs.map