"use client";
import { isGeometryCustomData, renderGeometrySvgFromState } from './chunk-BJX4YNA5.mjs';
import { lazy } from 'react';
import { jsxs, jsx } from 'react/jsx-runtime';

var GeometryStampHost = lazy(
  () => import('./host-K5RDGVIR.mjs').then((m) => ({ default: m.GeometryStampHost }))
);
var GeometryIcon = /* @__PURE__ */ jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [
  /* @__PURE__ */ jsx("polygon", { points: "4,20 20,20 12,5" }),
  /* @__PURE__ */ jsx("circle", { cx: "4", cy: "20", r: "1.4", fill: "currentColor", stroke: "none" }),
  /* @__PURE__ */ jsx("circle", { cx: "20", cy: "20", r: "1.4", fill: "currentColor", stroke: "none" }),
  /* @__PURE__ */ jsx("circle", { cx: "12", cy: "5", r: "1.4", fill: "currentColor", stroke: "none" })
] });
var geometryStamp = {
  kind: "geometry",
  shortcutKey: "g",
  toolbarLabel: "G",
  toolbarTitle: "Ch\xE8n h\xECnh h\u1ECDc (G)",
  toolbarIcon: GeometryIcon,
  toolbarTestId: "stamp-toolbar-geometry",
  matchesCustomData: isGeometryCustomData,
  async renderSvgFromCustomData(data) {
    if (!isGeometryCustomData(data)) {
      throw new Error("geometryStamp.renderSvgFromCustomData: customData kh\xF4ng ph\u1EA3i geometry");
    }
    return renderGeometrySvgFromState(data.jsonState);
  },
  async restoreFileFromCustomData(element) {
    const data = element.customData;
    const fileId = element.fileId;
    if (!data || !fileId) return null;
    if (!isGeometryCustomData(data)) return null;
    const svgString = await renderGeometrySvgFromState(data.jsonState);
    const utf8 = unescape(encodeURIComponent(svgString));
    const dataURL = "data:image/svg+xml;base64," + (typeof btoa !== "undefined" ? btoa(utf8) : Buffer.from(utf8).toString("base64"));
    return { fileId, dataURL, mimeType: "image/svg+xml" };
  },
  Host: GeometryStampHost
};

export { geometryStamp };
//# sourceMappingURL=chunk-5RBNRBFW.mjs.map
//# sourceMappingURL=chunk-5RBNRBFW.mjs.map