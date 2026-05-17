"use client";
import { paletteFor, resolveAttrColors } from './chunk-HTBLO5JO.mjs';

// src/stamps/geometry-2d/renderInline.ts
function renderGeometryToSvg(boardContainer) {
  const svgEl = boardContainer.querySelector("svg");
  if (!svgEl) throw new Error("renderGeometryToSvg: no SVG found in board container");
  const clone = svgEl.cloneNode(true);
  if (!clone.getAttribute("xmlns")) {
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  }
  return new XMLSerializer().serializeToString(clone);
}

// src/stamps/geometry-2d/serialize.ts
function serializeBoard(board, log, options = {}) {
  return {
    bbox: board.getBoundingBox(),
    elements: log.map((e) => ({ type: e.type, args: e.args, attrs: e.attrs, id: e.id })),
    showAxis: !!options.showAxis,
    showGrid: !!options.showGrid
  };
}
function createValueLabel(board, target) {
  if (!board || !target) return null;
  const e = (target.elType ?? target.type ?? "").toString().toLowerCase();
  if (e === "segment" || e === "line" || e === "arrow") {
    const p1 = target.point1, p2 = target.point2;
    if (!p1 || !p2) return null;
    return board.create("text", [
      () => (p1.X() + p2.X()) / 2 + 0.15,
      () => (p1.Y() + p2.Y()) / 2 + 0.25,
      () => {
        const len = Math.hypot(p2.X() - p1.X(), p2.Y() - p1.Y());
        const name = typeof target.name === "string" && target.name ? target.name : "d";
        return `${name} = ${len.toFixed(2)}`;
      }
    ], { fontSize: 12, color: "#dc2626", fixed: true, highlight: false });
  }
  if (e === "circle" || e === "circumcircle") {
    const center = target.center ?? target.midpoint ?? target.point1;
    if (!center) return null;
    return board.create("text", [
      () => center.X() + 0.3,
      () => center.Y() + 0.3,
      () => {
        const r = typeof target.Radius === "function" ? target.Radius() : 0;
        const name = typeof target.name === "string" && target.name ? target.name : "r";
        return `${name} = ${r.toFixed(2)}`;
      }
    ], { fontSize: 12, color: "#dc2626", fixed: true, highlight: false });
  }
  return null;
}
function deserializeIntoBoard(board, serialized, options = {}) {
  const palette = options.palette ?? paletteFor(false);
  const idMap = /* @__PURE__ */ new Map();
  const resolve = (a) => {
    if (typeof a === "string" && idMap.has(a)) return idMap.get(a);
    if (Array.isArray(a)) return a.map(resolve);
    return a;
  };
  for (const el of serialized.elements) {
    const resolvedArgs = el.args.map(resolve);
    if (el.type === "valueLabel") {
      const target = resolvedArgs[0];
      const txt = createValueLabel(board, target);
      if (txt) idMap.set(el.id, txt);
      continue;
    }
    const themedAttrs = resolveAttrColors({ ...el.attrs }, palette);
    const created = board.create(el.type, resolvedArgs, themedAttrs);
    idMap.set(el.id, created);
  }
}

// src/stamps/shared/safeJsx.ts
var isDev = (() => {
  try {
    return typeof process !== "undefined" && process.env?.NODE_ENV !== "production";
  } catch {
    return false;
  }
})();
function safeJsx(label, fn, fallback) {
  try {
    return fn();
  } catch (err) {
    if (isDev) {
      console.warn("[whiteboard:jsxgraph]", label, err);
    }
    return fallback;
  }
}

// src/stamps/geometry-2d/render.ts
async function renderGeometrySvgFromState(jsonState) {
  const parsed = JSON.parse(jsonState);
  const palette = paletteFor(false);
  const JXG = (await import('jsxgraph')).default;
  safeJsx("render.applyOptions", () => {
    const opts = JXG.Options;
    if (opts) {
      opts.text = opts.text || {};
      opts.text.display = "internal";
      opts.text.useASCIIMathML = false;
      opts.text.useMathJax = false;
      opts.text.useKatex = false;
      opts.text.strokeColor = palette.label;
      opts.label = opts.label || {};
      opts.label.display = "internal";
      opts.label.strokeColor = palette.label;
      opts.axis = opts.axis || {};
      opts.axis.strokeColor = palette.axis;
      opts.grid = opts.grid || {};
      opts.grid.strokeColor = palette.grid;
    }
  });
  const container = document.createElement("div");
  const containerId = "jxg_offscreen_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
  container.id = containerId;
  container.style.cssText = "position:absolute;top:-99999px;left:-99999px;width:400px;height:300px;visibility:hidden;pointer-events:none;";
  document.body.appendChild(container);
  let board = null;
  try {
    board = JXG.JSXGraph.initBoard(containerId, {
      boundingbox: parsed.bbox,
      axis: !!parsed.showAxis,
      grid: !!parsed.showGrid,
      showCopyright: false,
      showNavigation: false,
      keepAspectRatio: false
    });
    deserializeIntoBoard(board, parsed, { palette });
    board.update();
    return renderGeometryToSvg(container);
  } finally {
    safeJsx("render.freeBoard", () => {
      if (board) JXG.JSXGraph.freeBoard(board);
    });
    if (container.parentNode) container.parentNode.removeChild(container);
  }
}

// src/stamps/geometry-2d/types.ts
function isGeometryCustomData(data) {
  if (!data || typeof data !== "object") return false;
  const d = data;
  return d.kind === "geometry" && d.version === 1 && typeof d.jsonState === "string";
}

export { isGeometryCustomData, renderGeometrySvgFromState, safeJsx, serializeBoard };
//# sourceMappingURL=chunk-KEYZ5EZT.mjs.map
//# sourceMappingURL=chunk-KEYZ5EZT.mjs.map