"use client";
import { isLatexCustomData, renderLatexToSvg } from './chunk-X5R72SSJ.mjs';
import { lazy } from 'react';
import { jsx } from 'react/jsx-runtime';

var LatexStampHost = lazy(
  () => import('./host-Z3TEJKZA.mjs').then((m) => ({ default: m.LatexStampHost }))
);
var LatexIcon = /* @__PURE__ */ jsx("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: /* @__PURE__ */ jsx("path", { d: "M17 5 H7 L13 12 L7 19 H17" }) });
var latexStamp = {
  kind: "latex",
  shortcutKey: "l",
  toolbarLabel: "L",
  toolbarTitle: "Ch\xE8n c\xF4ng th\u1EE9c LaTeX (L)",
  toolbarIcon: LatexIcon,
  toolbarTestId: "stamp-toolbar-latex",
  matchesCustomData: isLatexCustomData,
  async renderSvgFromCustomData(data) {
    if (!isLatexCustomData(data)) {
      throw new Error("latexStamp.renderSvgFromCustomData: customData kh\xF4ng ph\u1EA3i latex");
    }
    return renderLatexToSvg(data.src, data.displayMode);
  },
  async restoreFileFromCustomData(element) {
    const data = element.customData;
    const fileId = element.fileId;
    if (!data || !fileId) return null;
    if (!isLatexCustomData(data)) return null;
    const svgString = await renderLatexToSvg(data.src, data.displayMode);
    const utf8 = unescape(encodeURIComponent(svgString));
    const dataURL = "data:image/svg+xml;base64," + (typeof btoa !== "undefined" ? btoa(utf8) : Buffer.from(utf8).toString("base64"));
    return { fileId, dataURL, mimeType: "image/svg+xml" };
  },
  Host: LatexStampHost
};

export { latexStamp };
//# sourceMappingURL=chunk-7P7SQFOW.mjs.map
//# sourceMappingURL=chunk-7P7SQFOW.mjs.map