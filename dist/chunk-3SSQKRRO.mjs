"use client";
import { isGraph2DCustomData, renderGraph2dSvgFromState } from './chunk-HM7RIXJE.mjs';
import { lazy } from 'react';
import { jsxs, jsx } from 'react/jsx-runtime';

var Graph2DStampHost = lazy(
  () => import('./host-2QGKMGCT.mjs').then((m) => ({ default: m.Graph2DStampHost }))
);
var Graph2DIcon = /* @__PURE__ */ jsxs(
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
      /* @__PURE__ */ jsx("path", { d: "M3 21 V3" }),
      /* @__PURE__ */ jsx("path", { d: "M3 21 H21" }),
      /* @__PURE__ */ jsx("path", { d: "M5 19 C8 5, 14 5, 19 17" })
    ]
  }
);
var graph2dStamp = {
  kind: "graph2d",
  experimental: true,
  shortcutKey: "h",
  toolbarLabel: "H",
  toolbarTitle: "Ch\xE8n \u0111\u1ED3 th\u1ECB 2D (H)",
  toolbarIcon: Graph2DIcon,
  toolbarTestId: "stamp-toolbar-graph2d",
  matchesCustomData: isGraph2DCustomData,
  async renderSvgFromCustomData(data) {
    if (!isGraph2DCustomData(data)) {
      throw new Error("graph2dStamp.renderSvgFromCustomData: customData kh\xF4ng ph\u1EA3i graph2d");
    }
    return renderGraph2dSvgFromState(data.jsonState);
  },
  async restoreFileFromCustomData(element) {
    const data = element.customData;
    const fileId = element.fileId;
    if (!data || !fileId) return null;
    if (!isGraph2DCustomData(data)) return null;
    const svgString = await renderGraph2dSvgFromState(data.jsonState);
    const utf8 = unescape(encodeURIComponent(svgString));
    const dataURL = "data:image/svg+xml;base64," + (typeof btoa !== "undefined" ? btoa(utf8) : Buffer.from(utf8).toString("base64"));
    return { fileId, dataURL, mimeType: "image/svg+xml" };
  },
  Host: Graph2DStampHost
};

export { graph2dStamp };
//# sourceMappingURL=chunk-3SSQKRRO.mjs.map
//# sourceMappingURL=chunk-3SSQKRRO.mjs.map