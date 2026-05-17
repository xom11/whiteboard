"use client";
require('./index.css');
'use strict';

var jsxRuntime = require('react/jsx-runtime');
var React11 = require('react');
var reactDom = require('react-dom');
var excalidraw = require('@excalidraw/excalidraw');
require('@excalidraw/excalidraw/index.css');

function _interopNamespace(e) {
  if (e && e.__esModule) return e;
  var n = Object.create(null);
  if (e) {
    Object.keys(e).forEach(function (k) {
      if (k !== 'default') {
        var d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: function () { return e[k]; }
        });
      }
    });
  }
  n.default = e;
  return Object.freeze(n);
}

var React11__namespace = /*#__PURE__*/_interopNamespace(React11);

var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

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
var init_renderInline = __esm({
  "src/stamps/geometry-2d/renderInline.ts"() {
  }
});

// src/stamps/geometry-2d/editor/theme.ts
function paletteFor(isDark) {
  return {
    stroke: themeStroke(isDark),
    axis: themeAxis(isDark),
    grid: themeGrid(isDark),
    label: themeLabel(isDark)
  };
}
function resolveAttrColors(attrs, palette) {
  if (typeof attrs === "string") {
    const key = SENTINEL_MAP[attrs];
    return key ? palette[key] : attrs;
  }
  if (Array.isArray(attrs)) {
    return attrs.map((a) => resolveAttrColors(a, palette));
  }
  if (attrs && typeof attrs === "object") {
    const out = {};
    for (const [k, v] of Object.entries(attrs)) {
      out[k] = resolveAttrColors(v, palette);
    }
    return out;
  }
  return attrs;
}
var themeStroke, themeAxis, themeGrid, themeLabel, SENTINEL_MAP;
var init_theme = __esm({
  "src/stamps/geometry-2d/editor/theme.ts"() {
    themeStroke = (dark) => dark ? "#e2e8f0" : "#0f172a";
    themeAxis = (dark) => dark ? "#cbd5e1" : "#94a3b8";
    themeGrid = (dark) => dark ? "#475569" : "#e2e8f0";
    themeLabel = (dark) => dark ? "#e2e8f0" : "#000000";
    SENTINEL_MAP = {
      "@stroke": "stroke",
      "@axis": "axis",
      "@grid": "grid",
      "@label": "label"
    };
  }
});

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
var init_serialize = __esm({
  "src/stamps/geometry-2d/serialize.ts"() {
    init_theme();
  }
});

// src/stamps/geometry-2d/render.ts
async function renderGeometrySvgFromState(jsonState) {
  const parsed = JSON.parse(jsonState);
  const palette = paletteFor(false);
  const JXG = (await import('jsxgraph')).default;
  try {
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
  } catch {
  }
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
    try {
      if (board) JXG.JSXGraph.freeBoard(board);
    } catch {
    }
    if (container.parentNode) container.parentNode.removeChild(container);
  }
}
var init_render = __esm({
  "src/stamps/geometry-2d/render.ts"() {
    init_renderInline();
    init_serialize();
    init_theme();
  }
});

// src/stamps/geometry-2d/types.ts
function isGeometryCustomData(data) {
  if (!data || typeof data !== "object") return false;
  const d = data;
  return d.kind === "geometry" && d.version === 1 && typeof d.jsonState === "string";
}
var init_types = __esm({
  "src/stamps/geometry-2d/types.ts"() {
  }
});

// src/stamps/geometry-2d/editor/transforms.ts
function copyVisAttrs(obj) {
  const v = obj?.visProp ?? {};
  const pick = (k) => v?.[k];
  const out = {};
  const mapping = [
    ["strokecolor", "strokeColor"],
    ["strokewidth", "strokeWidth"],
    ["strokeopacity", "strokeOpacity"],
    ["dash", "dash"],
    ["fillcolor", "fillColor"],
    ["fillopacity", "fillOpacity"]
  ];
  for (const [from, to] of mapping) {
    const val = pick(from);
    if (val !== void 0) out[to] = val;
  }
  return out;
}
function getDefiningPoints(obj) {
  if (!obj) return null;
  const e = (obj.elType ?? obj.type ?? "").toString().toLowerCase();
  if (e === "point" || e === "glider" || e === "midpoint") {
    return { kind: "point", points: [obj], attrs: copyVisAttrs(obj) };
  }
  if (LINE_LIKE.has(e) && obj.point1 && obj.point2) {
    const kind = e === "segment" ? "segment" : e === "arrow" ? "arrow" : "line";
    return { kind, points: [obj.point1, obj.point2], attrs: copyVisAttrs(obj) };
  }
  if (e === "circle" && obj.center && obj.point2) {
    return { kind: "circleCenter", points: [obj.center, obj.point2], attrs: copyVisAttrs(obj) };
  }
  if (e === "circumcircle" && obj.point1 && obj.point2 && obj.point3) {
    return {
      kind: "circle3",
      points: [obj.point1, obj.point2, obj.point3],
      attrs: copyVisAttrs(obj)
    };
  }
  return null;
}
function buildTransformSpec(input) {
  switch (input.kind) {
    case "translate": {
      const [a, b] = input.vectorPoints;
      const dx = b.X() - a.X();
      const dy = b.Y() - a.Y();
      return { params: [dx, dy], attrs: { type: "translate" } };
    }
    case "rotate":
      return {
        params: [input.angleDeg * Math.PI / 180, input.center],
        attrs: { type: "rotate" }
      };
    case "reflectLine":
      return { params: [input.line], attrs: { type: "reflect" } };
    case "reflectPoint":
      return { params: [Math.PI, input.center], attrs: { type: "rotate" } };
    case "dilate":
      return {
        params: [],
        attrs: { type: "scale" },
        chain: [
          { params: [-input.center.X(), -input.center.Y()], attrs: { type: "translate" } },
          { params: [input.k, input.k], attrs: { type: "scale" } },
          { params: [input.center.X(), input.center.Y()], attrs: { type: "translate" } }
        ]
      };
  }
}
var LINE_LIKE;
var init_transforms = __esm({
  "src/stamps/geometry-2d/editor/transforms.ts"() {
    LINE_LIKE = /* @__PURE__ */ new Set(["line", "segment", "arrow"]);
  }
});
function letterForGroup(g) {
  const idx = GROUP_ORDER.indexOf(g);
  return idx >= 0 ? String.fromCharCode(A_CODE + idx) : "";
}
function objKind(obj) {
  if (!obj) return "other";
  const e = (obj.elType || obj.type || "").toString().toLowerCase();
  if (e === "point" || e === "glider" || e === "midpoint") return "point";
  if (e === "line" || e === "segment" || e === "arrow" || e === "axis" || e === "normal" || e === "parallel" || e === "perpendicular" || e === "tangent" || e === "bisector" || e === "perpendicularsegment") return "line";
  if (e === "circle" || e === "circumcircle") return "circle";
  return "other";
}
var Icon, TOOLS, GROUP_LABELS, GROUP_ORDER, A_CODE;
var init_tools = __esm({
  "src/stamps/geometry-2d/editor/tools.tsx"() {
    Icon = {
      cursor: /* @__PURE__ */ jsxRuntime.jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M4 4 L20 12 L13 13 L11 20 Z" }) }),
      select: /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
        /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M4 4 L20 12 L13 13 L11 20 Z", fill: "none" }),
        /* @__PURE__ */ jsxRuntime.jsx("rect", { x: "2.5", y: "2.5", width: "19", height: "19", strokeDasharray: "3 2", fill: "none" })
      ] }),
      point: /* @__PURE__ */ jsxRuntime.jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsxRuntime.jsx("circle", { cx: "12", cy: "12", r: "4", fill: "currentColor" }) }),
      midpoint: /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
        /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "4", y1: "12", x2: "20", y2: "12" }),
        /* @__PURE__ */ jsxRuntime.jsx("circle", { cx: "12", cy: "12", r: "2.5", fill: "currentColor", stroke: "none" }),
        /* @__PURE__ */ jsxRuntime.jsx("circle", { cx: "4", cy: "12", r: "1.6", fill: "currentColor", stroke: "none" }),
        /* @__PURE__ */ jsxRuntime.jsx("circle", { cx: "20", cy: "12", r: "1.6", fill: "currentColor", stroke: "none" })
      ] }),
      segment: /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
        /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "5", y1: "18", x2: "19", y2: "6" }),
        /* @__PURE__ */ jsxRuntime.jsx("circle", { cx: "5", cy: "18", r: "1.7", fill: "currentColor" }),
        /* @__PURE__ */ jsxRuntime.jsx("circle", { cx: "19", cy: "6", r: "1.7", fill: "currentColor" })
      ] }),
      line: /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
        /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "2", y1: "20", x2: "22", y2: "4" }),
        /* @__PURE__ */ jsxRuntime.jsx("circle", { cx: "8", cy: "16", r: "1.6", fill: "currentColor" }),
        /* @__PURE__ */ jsxRuntime.jsx("circle", { cx: "16", cy: "8", r: "1.6", fill: "currentColor" })
      ] }),
      ray: /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
        /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "5", y1: "19", x2: "22", y2: "2" }),
        /* @__PURE__ */ jsxRuntime.jsx("circle", { cx: "5", cy: "19", r: "1.7", fill: "currentColor" }),
        /* @__PURE__ */ jsxRuntime.jsx("circle", { cx: "12", cy: "12", r: "1.5", fill: "currentColor" })
      ] }),
      vector: /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
        /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "4", y1: "20", x2: "20", y2: "4" }),
        /* @__PURE__ */ jsxRuntime.jsx("polyline", { points: "14,4 20,4 20,10" })
      ] }),
      perpendicular: /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
        /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "3", y1: "18", x2: "21", y2: "18" }),
        /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "12", y1: "18", x2: "12", y2: "4" }),
        /* @__PURE__ */ jsxRuntime.jsx("rect", { x: "12", y: "14", width: "4", height: "4", fill: "none" })
      ] }),
      parallel: /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
        /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "3", y1: "9", x2: "21", y2: "5" }),
        /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "3", y1: "19", x2: "21", y2: "15" })
      ] }),
      perpBisector: /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
        /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "4", y1: "18", x2: "20", y2: "18" }),
        /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "12", y1: "4", x2: "12", y2: "22", strokeDasharray: "3 2" }),
        /* @__PURE__ */ jsxRuntime.jsx("circle", { cx: "6", cy: "18", r: "1.5", fill: "currentColor" }),
        /* @__PURE__ */ jsxRuntime.jsx("circle", { cx: "18", cy: "18", r: "1.5", fill: "currentColor" })
      ] }),
      bisector: /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
        /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "4", y1: "20", x2: "20", y2: "4" }),
        /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "4", y1: "20", x2: "20", y2: "20" }),
        /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "4", y1: "20", x2: "22", y2: "12", strokeDasharray: "3 2" })
      ] }),
      polygon: /* @__PURE__ */ jsxRuntime.jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinejoin: "round", children: /* @__PURE__ */ jsxRuntime.jsx("polygon", { points: "6,6 18,6 22,14 12,22 4,14" }) }),
      regularPolygon: /* @__PURE__ */ jsxRuntime.jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinejoin: "round", children: /* @__PURE__ */ jsxRuntime.jsx("polygon", { points: "12,3 20,8 20,17 12,22 4,17 4,8" }) }),
      circleCenter: /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
        /* @__PURE__ */ jsxRuntime.jsx("circle", { cx: "12", cy: "12", r: "8" }),
        /* @__PURE__ */ jsxRuntime.jsx("circle", { cx: "12", cy: "12", r: "1.6", fill: "currentColor" })
      ] }),
      circle3: /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
        /* @__PURE__ */ jsxRuntime.jsx("circle", { cx: "12", cy: "12", r: "8" }),
        /* @__PURE__ */ jsxRuntime.jsx("circle", { cx: "12", cy: "4", r: "1.5", fill: "currentColor" }),
        /* @__PURE__ */ jsxRuntime.jsx("circle", { cx: "20", cy: "14", r: "1.5", fill: "currentColor" }),
        /* @__PURE__ */ jsxRuntime.jsx("circle", { cx: "5", cy: "16", r: "1.5", fill: "currentColor" })
      ] }),
      tangent: /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
        /* @__PURE__ */ jsxRuntime.jsx("circle", { cx: "11", cy: "13", r: "6" }),
        /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "2", y1: "20", x2: "22", y2: "2" })
      ] }),
      angle: /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
        /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "4", y1: "20", x2: "20", y2: "20" }),
        /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "4", y1: "20", x2: "20", y2: "6" }),
        /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M14 20 A 10 10 0 0 0 11 13" })
      ] }),
      distance: /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
        /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "4", y1: "12", x2: "20", y2: "12" }),
        /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "4", y1: "8", x2: "4", y2: "16" }),
        /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "20", y1: "8", x2: "20", y2: "16" })
      ] }),
      area: /* @__PURE__ */ jsxRuntime.jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: /* @__PURE__ */ jsxRuntime.jsx("polygon", { points: "5,6 19,6 21,14 13,21 3,15", fill: "currentColor", fillOpacity: "0.2" }) }),
      toggleLabel: /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
        /* @__PURE__ */ jsxRuntime.jsx("text", { x: "3", y: "18", fontSize: "16", fontFamily: "serif", fontWeight: "700", fill: "currentColor", stroke: "none", children: "A" }),
        /* @__PURE__ */ jsxRuntime.jsx("text", { x: "13", y: "14", fontSize: "11", fontFamily: "serif", fontWeight: "700", fill: "currentColor", stroke: "none", children: "A" })
      ] }),
      toggleVisible: /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
        /* @__PURE__ */ jsxRuntime.jsx("circle", { cx: "12", cy: "12", r: "3.5", fill: "currentColor", fillOpacity: "0.4" }),
        /* @__PURE__ */ jsxRuntime.jsx("circle", { cx: "12", cy: "12", r: "3.5" }),
        /* @__PURE__ */ jsxRuntime.jsx("circle", { cx: "20", cy: "6", r: "1.5", fill: "currentColor" })
      ] }),
      trash: /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
        /* @__PURE__ */ jsxRuntime.jsx("polyline", { points: "3,6 5,6 21,6" }),
        /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M19 6 l-1 14 a 2 2 0 0 1 -2 2 H 8 a 2 2 0 0 1 -2 -2 l-1 -14" }),
        /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "10", y1: "11", x2: "10", y2: "17" }),
        /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "14", y1: "11", x2: "14", y2: "17" })
      ] }),
      translate: /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
        /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M4 4 L20 20" }),
        /* @__PURE__ */ jsxRuntime.jsx("polygon", { points: "14,4 20,4 20,10", fill: "currentColor" }),
        /* @__PURE__ */ jsxRuntime.jsx("circle", { cx: "5", cy: "5", r: "1.5", fill: "currentColor" })
      ] }),
      rotate: /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
        /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M4 12 A8 8 0 1 1 12 20" }),
        /* @__PURE__ */ jsxRuntime.jsx("polyline", { points: "4,9 4,13 8,13" })
      ] }),
      reflectLine: /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
        /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "12", y1: "2", x2: "12", y2: "22", strokeDasharray: "3 2" }),
        /* @__PURE__ */ jsxRuntime.jsx("polygon", { points: "4,6 9,12 4,18", fill: "currentColor" }),
        /* @__PURE__ */ jsxRuntime.jsx("polygon", { points: "20,6 15,12 20,18", fill: "currentColor" })
      ] }),
      reflectPoint: /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
        /* @__PURE__ */ jsxRuntime.jsx("circle", { cx: "12", cy: "12", r: "1.5", fill: "currentColor" }),
        /* @__PURE__ */ jsxRuntime.jsx("circle", { cx: "5", cy: "5", r: "1.6", fill: "currentColor" }),
        /* @__PURE__ */ jsxRuntime.jsx("circle", { cx: "19", cy: "19", r: "1.6", fill: "currentColor" }),
        /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "5", y1: "5", x2: "19", y2: "19", strokeDasharray: "2 2" })
      ] }),
      dilate: /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
        /* @__PURE__ */ jsxRuntime.jsx("circle", { cx: "12", cy: "12", r: "1.5", fill: "currentColor" }),
        /* @__PURE__ */ jsxRuntime.jsx("polygon", { points: "6,18 18,18 12,6", fillOpacity: "0.1", fill: "currentColor" }),
        /* @__PURE__ */ jsxRuntime.jsx("polygon", { points: "9,15 15,15 12,11", fill: "currentColor" })
      ] })
    };
    TOOLS = [
      { key: "move", label: "Di chuy\u1EC3n", hint: "K\xE9o \u0111i\u1EC3m ho\u1EB7c xoay n\u1EC1n", icon: Icon.cursor, group: "move", needs: 0 },
      { key: "select", label: "Ch\u1ECDn", hint: "Click \u0111\u1EC3 ch\u1ECDn 1 / Shift+click \u0111\u1EC3 b\u1ECF th\xEAm / K\xE9o n\u1EC1n \u0111\u1EC3 khoanh v\xF9ng / DEL \u0111\u1EC3 xo\xE1", icon: Icon.select, group: "move", needs: 0 },
      { key: "point", label: "\u0110i\u1EC3m m\u1EDBi", hint: "Click \u0111\u1EC3 th\xEAm \u0111i\u1EC3m", icon: Icon.point, group: "point", needs: 1 },
      { key: "midpoint", label: "Trung \u0111i\u1EC3m", hint: "Click 2 \u0111i\u1EC3m c\xF3 s\u1EB5n", icon: Icon.midpoint, group: "point", needs: 2, accepts: ["point", "point"] },
      { key: "segment", label: "\u0110o\u1EA1n th\u1EB3ng", hint: "Click 2 \u0111i\u1EC3m", icon: Icon.segment, group: "line", needs: 2 },
      { key: "line", label: "\u0110\u01B0\u1EDDng th\u1EB3ng qua 2 \u0111i\u1EC3m", hint: "Click 2 \u0111i\u1EC3m", icon: Icon.line, group: "line", needs: 2 },
      { key: "ray", label: "Tia qua 2 \u0111i\u1EC3m", hint: "Click 2 \u0111i\u1EC3m", icon: Icon.ray, group: "line", needs: 2 },
      { key: "vector", label: "Vector", hint: "Click 2 \u0111i\u1EC3m", icon: Icon.vector, group: "line", needs: 2 },
      { key: "perpendicular", label: "\u0110\u01B0\u1EDDng vu\xF4ng g\xF3c", hint: "Click 1 \u0111i\u1EC3m + 1 \u0111\u01B0\u1EDDng c\xF3 s\u1EB5n", icon: Icon.perpendicular, group: "construct", needs: 2, accepts: ["point", "line"] },
      { key: "parallel", label: "\u0110\u01B0\u1EDDng song song", hint: "Click 1 \u0111i\u1EC3m + 1 \u0111\u01B0\u1EDDng c\xF3 s\u1EB5n", icon: Icon.parallel, group: "construct", needs: 2, accepts: ["point", "line"] },
      { key: "perpBisector", label: "\u0110\u01B0\u1EDDng trung tr\u1EF1c", hint: "Click 2 \u0111i\u1EC3m c\xF3 s\u1EB5n", icon: Icon.perpBisector, group: "construct", needs: 2, accepts: ["point", "point"] },
      { key: "angleBisector", label: "\u0110\u01B0\u1EDDng ph\xE2n gi\xE1c", hint: "Click 3 \u0111i\u1EC3m c\xF3 s\u1EB5n (\u0111\u1EC9nh \u1EDF gi\u1EEFa)", icon: Icon.bisector, group: "construct", needs: 3, accepts: ["point", "point", "point"] },
      { key: "polygon", label: "\u0110a gi\xE1c", hint: "Click c\xE1c \u0111i\u1EC3m, click l\u1EA1i \u0111i\u1EC3m \u0111\u1EA7u \u0111\u1EC3 \u0111\xF3ng", icon: Icon.polygon, group: "polygon", needs: -1 },
      { key: "regularPolygon", label: "\u0110a gi\xE1c \u0111\u1EC1u", hint: "Click 2 \u0111i\u1EC3m r\u1ED3i nh\u1EADp s\u1ED1 c\u1EA1nh", icon: Icon.regularPolygon, group: "polygon", needs: 2, accepts: ["point", "point"] },
      { key: "circleCenter", label: "\u0110\u01B0\u1EDDng tr\xF2n (t\xE2m + \u0111i\u1EC3m)", hint: "Click t\xE2m r\u1ED3i 1 \u0111i\u1EC3m tr\xEAn \u0111\u01B0\u1EDDng tr\xF2n", icon: Icon.circleCenter, group: "circle", needs: 2 },
      { key: "circle3", label: "\u0110\u01B0\u1EDDng tr\xF2n qua 3 \u0111i\u1EC3m", hint: "Click 3 \u0111i\u1EC3m", icon: Icon.circle3, group: "circle", needs: 3 },
      { key: "tangent", label: "Ti\u1EBFp tuy\u1EBFn", hint: "Click 1 \u0111i\u1EC3m + 1 \u0111\u01B0\u1EDDng tr\xF2n c\xF3 s\u1EB5n", icon: Icon.tangent, group: "circle", needs: 2, accepts: ["point", "circle"] },
      { key: "angle", label: "G\xF3c", hint: "Click 3 \u0111i\u1EC3m c\xF3 s\u1EB5n (\u0111\u1EC9nh \u1EDF gi\u1EEFa)", icon: Icon.angle, group: "measure", needs: 3, accepts: ["point", "point", "point"] },
      { key: "distance", label: "Kho\u1EA3ng c\xE1ch", hint: "Click 2 \u0111i\u1EC3m c\xF3 s\u1EB5n", icon: Icon.distance, group: "measure", needs: 2, accepts: ["point", "point"] },
      { key: "area", label: "Di\u1EC7n t\xEDch", hint: "Click c\xE1c \u0111\u1EC9nh, click l\u1EA1i \u0111i\u1EC3m \u0111\u1EA7u \u0111\u1EC3 \u0111\xF3ng", icon: Icon.area, group: "measure", needs: -1 },
      { key: "toggleLabel", label: "Hi\u1EC7n/\u1EA9n t\xEAn", hint: "Click v\xE0o \u0111\u1ED1i t\u01B0\u1EE3ng", icon: Icon.toggleLabel, group: "edit", needs: 1, accepts: ["any"] },
      { key: "toggleVisible", label: "Hi\u1EC7n/\u1EA9n \u0111\u1ED1i t\u01B0\u1EE3ng", hint: "Click v\xE0o \u0111\u1ED1i t\u01B0\u1EE3ng", icon: Icon.toggleVisible, group: "edit", needs: 1, accepts: ["any"] },
      { key: "delete", label: "Xo\xE1", hint: "Click v\xE0o \u0111\u1ED1i t\u01B0\u1EE3ng", icon: Icon.trash, group: "edit", needs: 1, accepts: ["any"] },
      { key: "translate", label: "Ph\xE9p t\u1ECBnh ti\u1EBFn", hint: "Click object \u2192 2 \u0111i\u1EC3m t\u1EA1o vector", icon: Icon.translate, group: "transform", needs: 3, accepts: ["any", "point", "point"] },
      { key: "rotate", label: "Quay \u0111\u1ED1i t\u01B0\u1EE3ng", hint: "Click object \u2192 t\xE2m quay \u2192 nh\u1EADp g\xF3c", icon: Icon.rotate, group: "transform", needs: 2, accepts: ["any", "point"] },
      { key: "reflectLine", label: "\u0110\u1ED1i x\u1EE9ng qua \u0111\u01B0\u1EDDng th\u1EB3ng", hint: "Click object \u2192 \u0111\u01B0\u1EDDng th\u1EB3ng", icon: Icon.reflectLine, group: "transform", needs: 2, accepts: ["any", "line"] },
      { key: "reflectPoint", label: "\u0110\u1ED1i x\u1EE9ng qua \u0111i\u1EC3m", hint: "Click object \u2192 t\xE2m \u0111\u1ED1i x\u1EE9ng", icon: Icon.reflectPoint, group: "transform", needs: 2, accepts: ["any", "point"] },
      { key: "dilate", label: "Ph\xE9p v\u1ECB t\u1EF1", hint: "Click object \u2192 t\xE2m \u2192 nh\u1EADp t\u1EF7 s\u1ED1 k", icon: Icon.dilate, group: "transform", needs: 2, accepts: ["any", "point"] }
    ];
    GROUP_LABELS = {
      move: "C\u01A1 b\u1EA3n",
      point: "\u0110i\u1EC3m",
      line: "\u0110\u01B0\u1EDDng",
      construct: "D\u1EF1ng h\xECnh",
      polygon: "\u0110a gi\xE1c",
      circle: "\u0110\u01B0\u1EDDng tr\xF2n",
      measure: "\u0110o l\u01B0\u1EDDng",
      edit: "Ch\u1EC9nh s\u1EEDa",
      transform: "Ph\xE9p bi\u1EBFn h\xECnh"
    };
    GROUP_ORDER = [
      "move",
      "point",
      "line",
      "construct",
      "polygon",
      "circle",
      "measure",
      "edit",
      "transform"
    ];
    A_CODE = "A".charCodeAt(0);
  }
});

// src/stamps/geometry-2d/editor/handlers.ts
function handleDown(ctx, e) {
  if (!ctx.boardRef.current) return;
  const t = ctx.toolRef.current;
  if (t === "move") {
    const sc = ctx.screenCoordsOf(e);
    if (!sc) return;
    const [sx, sy] = sc;
    ctx.moveDownRef.current = { sx, sy };
    return;
  }
  if (t === "select") {
    const sc = ctx.screenCoordsOf(e);
    if (!sc) return;
    const [sx, sy] = sc;
    const hits2 = ctx.objectsAt(e).map(ctx.promoteLabel).filter((o) => o !== ctx.axisObjsRef.current.x && o !== ctx.axisObjsRef.current.y);
    const obj = hits2.find((o) => objKind(o) === "point") ?? hits2[0] ?? ctx.findNearestPoint(e, 12);
    if (obj) {
      const shift = !!(e.shiftKey || e.altKey);
      ctx.toggleSelect(obj, shift);
      ctx.moveDownRef.current = { sx, sy };
      ctx.marqueeRef.current = null;
      return;
    }
    ctx.marqueeRef.current = { startSx: sx, startSy: sy };
    if (!(e.shiftKey || e.altKey)) ctx.clearSelection();
    return;
  }
  const toolDef = TOOLS.find((td) => td.key === t);
  if (!toolDef) return;
  const coords = ctx.boardRef.current.getUsrCoordsOfMouse(e);
  const x = coords[0], y = coords[1];
  const hits = ctx.objectsAt(e).map(ctx.promoteLabel).filter((o) => o !== ctx.axisObjsRef.current.x && o !== ctx.axisObjsRef.current.y);
  const bestHit = hits.find((o) => objKind(o) === "point") ?? hits[0] ?? null;
  const snapPointForPointSlot = () => bestHit && objKind(bestHit) === "point" ? bestHit : ctx.findNearestPoint(e, 12);
  if (t === "point") {
    const curves = hits.filter((o) => objKind(o) === "line" || objKind(o) === "circle");
    if (curves.length >= 2) {
      const a = curves[0];
      const b = curves[1];
      const aId = ctx.localIdOf(a);
      const bId = ctx.localIdOf(b);
      if (aId && bId) {
        const name2 = ctx.nextLabel();
        const attrs = { name: name2, color: "@stroke", size: 3, fillColor: "@stroke", strokeColor: "@stroke" };
        try {
          const isLineLine = objKind(a) === "line" && objKind(b) === "line";
          if (isLineLine) {
            ctx.create("intersection", [aId, bId, 0], attrs);
          } else {
            const tmp0 = ctx.boardRef.current.create("intersection", [a, b, 0], { visible: false, withLabel: false });
            const tmp1 = ctx.boardRef.current.create("intersection", [a, b, 1], { visible: false, withLabel: false });
            const d0 = Math.hypot((tmp0.X?.() ?? 0) - x, (tmp0.Y?.() ?? 0) - y);
            const d1 = Math.hypot((tmp1.X?.() ?? 0) - x, (tmp1.Y?.() ?? 0) - y);
            try {
              ctx.boardRef.current.removeObject(tmp0);
            } catch {
            }
            try {
              ctx.boardRef.current.removeObject(tmp1);
            } catch {
            }
            const idx = d0 <= d1 ? 0 : 1;
            ctx.create("intersection", [aId, bId, idx], attrs);
          }
          return;
        } catch {
        }
      }
    }
    const name = ctx.nextLabel();
    ctx.create("point", [x, y], { name, color: "@stroke", size: 3, fillColor: "@stroke", strokeColor: "@stroke" });
    return;
  }
  if (toolDef.needs === 1 && toolDef.accepts) {
    const hit = bestHit ?? ctx.findNearestPoint(e, 12);
    if (hit) ctx.finalize(toolDef, [hit]);
    else ctx.flashWarn("Click v\xE0o m\u1ED9t \u0111\u1ED1i t\u01B0\u1EE3ng \u0111\u1EC3 \xE1p d\u1EE5ng");
    return;
  }
  if (toolDef.needs === -1) {
    const snappedPoint = snapPointForPointSlot();
    if (ctx.pendingRef.current.length >= 3 && snappedPoint && snappedPoint === ctx.pendingRef.current[0]) {
      ctx.clearPreviewSegs();
      ctx.finalize(toolDef, ctx.pendingRef.current);
      ctx.clearPending();
      return;
    }
    if (snappedPoint && ctx.pendingRef.current.includes(snappedPoint)) {
      ctx.flashWarn("\u0110\u1EC9nh n\xE0y \u0111\xE3 c\xF3 \u2014 click \u0111i\u1EC3m kh\xE1c ho\u1EB7c click l\u1EA1i \u0111i\u1EC3m \u0111\u1EA7u \u0111\u1EC3 \u0111\xF3ng");
      return;
    }
    const pick2 = snappedPoint ?? (() => {
      const name = ctx.nextLabel();
      return ctx.create("point", [x, y], { name, color: "@stroke", size: 3 });
    })();
    if (ctx.pendingRef.current.length > 0 && ctx.boardRef.current) {
      const prev = ctx.pendingRef.current[ctx.pendingRef.current.length - 1];
      try {
        const seg = ctx.boardRef.current.create("segment", [prev, pick2], {
          strokeColor: "#3b82f6",
          strokeWidth: 1.5,
          strokeOpacity: 0.75,
          fixed: true,
          highlight: false,
          withLabel: false
        });
        ctx.previewSegRef.current.push(seg);
      } catch {
      }
    }
    ctx.pendingRef.current.push(pick2);
    ctx.setPendingCount(ctx.pendingRef.current.length);
    return;
  }
  let pick = null;
  if (toolDef.accepts) {
    const usedKinds = ctx.pendingRef.current.map((p) => objKind(p));
    const remaining = [...toolDef.accepts];
    for (const u of usedKinds) {
      if (u === "other") continue;
      const i = remaining.indexOf(u);
      if (i >= 0) remaining.splice(i, 1);
    }
    const strictPoint = hits.find((o) => objKind(o) === "point") ?? null;
    const lineHit = hits.find((o) => objKind(o) === "line") ?? null;
    const circleHit = hits.find((o) => objKind(o) === "circle") ?? null;
    if (remaining.includes("point") && strictPoint) pick = strictPoint;
    else if (remaining.includes("line") && lineHit) pick = lineHit;
    else if (remaining.includes("circle") && circleHit) pick = circleHit;
    else if (remaining.includes("any") && (strictPoint || lineHit || circleHit)) {
      pick = strictPoint ?? lineHit ?? circleHit;
    } else if (remaining.includes("point")) {
      const near = ctx.findNearestPoint(e, 12);
      if (near) pick = near;
    }
    if (!pick) {
      const needs = remaining.map(
        (k) => k === "point" ? "m\u1ED9t \u0111i\u1EC3m" : k === "line" ? "m\u1ED9t \u0111\u01B0\u1EDDng/\u0111o\u1EA1n" : k === "circle" ? "m\u1ED9t \u0111\u01B0\u1EDDng tr\xF2n" : "m\u1ED9t \u0111\u1ED1i t\u01B0\u1EE3ng"
      );
      ctx.flashWarn(`C\xF2n c\u1EA7n click v\xE0o ${needs.join(" + ")} c\xF3 s\u1EB5n`);
      return;
    }
    if (ctx.pendingRef.current.includes(pick)) {
      ctx.flashWarn("\u0110\xE3 ch\u1ECDn \u0111\u1ED1i t\u01B0\u1EE3ng n\xE0y \u2014 ch\u1ECDn \u0111\u1ED1i t\u01B0\u1EE3ng kh\xE1c");
      return;
    }
  } else {
    const snapped = snapPointForPointSlot();
    if (snapped && ctx.pendingRef.current.includes(snapped)) {
      ctx.flashWarn("\u0110\xE3 ch\u1ECDn \u0111i\u1EC3m n\xE0y \u2014 ch\u1ECDn \u0111i\u1EC3m kh\xE1c ho\u1EB7c click ch\u1ED7 tr\u1ED1ng");
      return;
    }
    if (snapped) pick = snapped;
    else {
      const name = ctx.nextLabel();
      pick = ctx.create("point", [x, y], { name, color: "@stroke", size: 3, fillColor: "@stroke", strokeColor: "@stroke" });
    }
  }
  if (!pick) return;
  ctx.pendingRef.current.push(pick);
  ctx.setPendingCount(ctx.pendingRef.current.length);
  if (ctx.pendingRef.current.length >= toolDef.needs) {
    const tk = toolDef.key;
    if (tk === "rotate" || tk === "dilate") {
      const source = ctx.pendingRef.current[0];
      const center = ctx.pendingRef.current[1];
      const cx = (e.clientX ?? 0) + 8;
      const cy = (e.clientY ?? 0) + 8;
      ctx.pendingTransformRef.current = { tool: tk, source, center, anchorScreen: { x: cx, y: cy } };
      ctx.emitTransform({ tool: tk, anchor: { x: cx, y: cy } });
      return;
    }
    if (tk === "regularPolygon") {
      const p1 = ctx.pendingRef.current[0];
      const p2 = ctx.pendingRef.current[1];
      const cx = (e.clientX ?? 0) + 8;
      const cy = (e.clientY ?? 0) + 8;
      ctx.pendingTransformRef.current = { tool: tk, source: p1, center: p2, anchorScreen: { x: cx, y: cy } };
      ctx.emitTransform({ tool: tk, anchor: { x: cx, y: cy } });
      return;
    }
    if (tk === "translate") {
      const source = ctx.pendingRef.current[0];
      const spec = buildTransformSpec({ kind: "translate", vectorPoints: [ctx.pendingRef.current[1], ctx.pendingRef.current[2]] });
      ctx.finalizeTransformCreate(spec, source);
      ctx.clearPending();
      return;
    }
    if (tk === "reflectLine") {
      const source = ctx.pendingRef.current[0];
      const spec = buildTransformSpec({ kind: "reflectLine", line: ctx.pendingRef.current[1] });
      ctx.finalizeTransformCreate(spec, source);
      ctx.clearPending();
      return;
    }
    if (tk === "reflectPoint") {
      const source = ctx.pendingRef.current[0];
      const spec = buildTransformSpec({ kind: "reflectPoint", center: ctx.pendingRef.current[1] });
      ctx.finalizeTransformCreate(spec, source);
      ctx.clearPending();
      return;
    }
    ctx.finalize(toolDef, ctx.pendingRef.current);
    ctx.clearPending();
  } else {
    ctx.refreshPreview();
  }
}
function handleUp(ctx, e) {
  const t = ctx.toolRef.current;
  if (t === "select") {
    const mq = ctx.marqueeRef.current;
    ctx.marqueeRef.current = null;
    ctx.moveDownRef.current = null;
    if (!mq) return;
    const sc2 = ctx.screenCoordsOf(e);
    if (!sc2) return;
    const [ex, ey] = sc2;
    if (mq.rect) {
      try {
        ctx.boardRef.current?.removeObject(mq.rect);
      } catch {
      }
    }
    if (Math.hypot(ex - mq.startSx, ey - mq.startSy) < 4) return;
    const x1 = Math.min(mq.startSx, ex), x2 = Math.max(mq.startSx, ex);
    const y1 = Math.min(mq.startSy, ey), y2 = Math.max(mq.startSy, ey);
    const board = ctx.boardRef.current;
    if (!board) return;
    const list = board.objectsList || [];
    for (const o of list) {
      if (o === ctx.axisObjsRef.current.x || o === ctx.axisObjsRef.current.y) continue;
      const kind = objKind(o);
      if (kind === "point") {
        const pc = o.coords?.scrCoords;
        if (!pc) continue;
        if (pc[1] >= x1 && pc[1] <= x2 && pc[2] >= y1 && pc[2] <= y2) {
          if (!ctx.selectedSetRef.current.has(o)) {
            ctx.selectedSetRef.current.add(o);
            ctx.applySelectionStyle(o);
          }
        }
      } else if (kind === "line" || kind === "circle") {
        const defs = [o.point1, o.point2, o.center, o.midpoint, o.point3].filter(Boolean);
        const anyInside = defs.some((p) => {
          const pc = p?.coords?.scrCoords;
          return pc && pc[1] >= x1 && pc[1] <= x2 && pc[2] >= y1 && pc[2] <= y2;
        });
        if (anyInside && !ctx.selectedSetRef.current.has(o)) {
          ctx.selectedSetRef.current.add(o);
          ctx.applySelectionStyle(o);
        }
      }
    }
    ctx.setSelectionTick((tt) => tt + 1);
    try {
      board.update();
    } catch {
    }
    return;
  }
  if (t !== "move") return;
  const start = ctx.moveDownRef.current;
  ctx.moveDownRef.current = null;
  if (!start) return;
  const sc = ctx.screenCoordsOf(e);
  if (!sc) return;
  const [sx, sy] = sc;
  const moved = Math.hypot(sx - start.sx, sy - start.sy);
  if (moved > 4) return;
  const hits = ctx.objectsAt(e).map(ctx.promoteLabel).filter((o) => o !== ctx.axisObjsRef.current.x && o !== ctx.axisObjsRef.current.y);
  const best = hits.find((o) => objKind(o) === "point") ?? hits[0] ?? ctx.findNearestPoint(e, 12);
  if (!best) {
    ctx.lastMoveClickRef.current = { obj: null, time: 0 };
    return;
  }
  const now = Date.now();
  const isDouble = ctx.lastMoveClickRef.current.obj === best && now - ctx.lastMoveClickRef.current.time < 400;
  ctx.lastMoveClickRef.current = { obj: best, time: now };
  if (!isDouble) return;
  const cx = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
  const cy = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
  const snap = ctx.snapshotObject(best, { x: cx + 8, y: cy + 8 });
  if (snap) ctx.emitSelect(snap);
}
function handleMove(ctx, e) {
  if (ctx.toolRef.current === "select" && ctx.marqueeRef.current) {
    const sc = ctx.screenCoordsOf(e);
    if (sc && ctx.boardRef.current) {
      const [sx, sy] = sc;
      const { startSx, startSy } = ctx.marqueeRef.current;
      const b = ctx.boardRef.current;
      const ux1 = b.screenCoords2userCoords?.([Math.min(startSx, sx), Math.min(startSy, sy)]) ?? null;
      const ux2 = b.screenCoords2userCoords?.([Math.max(startSx, sx), Math.max(startSy, sy)]) ?? null;
      const toUsr = (px, py) => {
        const ox = b.origin?.scrCoords?.[1] ?? 0;
        const oy = b.origin?.scrCoords?.[2] ?? 0;
        const ux = (px - ox) / b.unitX;
        const uy = (oy - py) / b.unitY;
        return [ux, uy];
      };
      const [x1u, y1u] = ux1 && ux1.length >= 2 ? [ux1[0], ux1[1]] : toUsr(Math.min(startSx, sx), Math.min(startSy, sy));
      const [x2u, y2u] = ux2 && ux2.length >= 2 ? [ux2[0], ux2[1]] : toUsr(Math.max(startSx, sx), Math.max(startSy, sy));
      const rect = ctx.marqueeRef.current.rect;
      if (rect) {
        try {
          ctx.boardRef.current.removeObject(rect);
        } catch {
        }
      }
      try {
        ctx.marqueeRef.current.rect = ctx.boardRef.current.create("polygon", [
          [x1u, y1u],
          [x2u, y1u],
          [x2u, y2u],
          [x1u, y2u]
        ], {
          fillColor: "#06b6d4",
          fillOpacity: 0.08,
          borders: { strokeColor: "#06b6d4", strokeWidth: 1, dash: 2 },
          vertices: { visible: false },
          fixed: true,
          highlight: false,
          withLabel: false
        });
      } catch {
      }
    }
    return;
  }
  const ph = ctx.phantomRef.current;
  if (!ph || !ctx.boardRef.current) return;
  if (ctx.previewRafRef.current != null) return;
  ctx.previewRafRef.current = requestAnimationFrame(() => {
    ctx.previewRafRef.current = null;
    if (!ctx.boardRef.current || !ctx.phantomRef.current) return;
    try {
      const coords = ctx.boardRef.current.getUsrCoordsOfMouse(e);
      const JXG = ctx.jxgRef.current;
      if (!JXG) return;
      ctx.phantomRef.current.setPositionDirectly(JXG.COORDS_BY_USER, [coords[0], coords[1]]);
      ctx.boardRef.current.update();
    } catch {
    }
  });
}
var init_handlers = __esm({
  "src/stamps/geometry-2d/editor/handlers.ts"() {
    init_tools();
    init_transforms();
  }
});
var JSXGraphMiniBoard;
var init_MiniBoard = __esm({
  "src/stamps/geometry-2d/editor/MiniBoard.tsx"() {
    "use client";
    init_transforms();
    init_tools();
    init_theme();
    init_handlers();
    JSXGraphMiniBoard = ({ onReady, initialState, isDark }) => {
      const isDarkRef = React11.useRef(!!isDark);
      isDarkRef.current = !!isDark;
      const containerId = React11.useId().replace(/:/g, "_") + "_jxgmini";
      const containerRef = React11.useRef(null);
      const boardRef = React11.useRef(null);
      const jxgRef = React11.useRef(null);
      const axisObjsRef = React11.useRef({});
      const creationLogRef = React11.useRef([]);
      const [tool, setTool] = React11.useState("move");
      const toolRef = React11.useRef("move");
      toolRef.current = tool;
      const [showAxis, setShowAxis] = React11.useState(initialState?.showAxis ?? false);
      const [showGrid, setShowGrid] = React11.useState(initialState?.showGrid ?? false);
      const showAxisRef = React11.useRef(showAxis);
      showAxisRef.current = showAxis;
      const showGridRef = React11.useRef(showGrid);
      showGridRef.current = showGrid;
      const objMapRef = React11.useRef(/* @__PURE__ */ new Map());
      const valueLabelsRef = React11.useRef(/* @__PURE__ */ new Map());
      const pendingRef = React11.useRef([]);
      const [, setPendingCount] = React11.useState(0);
      const selectedSetRef = React11.useRef(/* @__PURE__ */ new Set());
      const selOriginalRef = React11.useRef(/* @__PURE__ */ new Map());
      const [, setSelectionTick] = React11.useState(0);
      const marqueeRef = React11.useRef(null);
      const previewSegRef = React11.useRef([]);
      const phantomRef = React11.useRef(null);
      const previewShapeRef = React11.useRef(null);
      const previewRafRef = React11.useRef(null);
      const [historyTick, setHistoryTick] = React11.useState(0);
      const [, setWarn] = React11.useState(null);
      const warnTimerRef = React11.useRef(null);
      const flashWarn = React11.useCallback((msg) => {
        if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
        setWarn(msg);
        warnTimerRef.current = setTimeout(() => setWarn(null), 1800);
      }, []);
      React11.useEffect(() => () => {
        if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
      }, []);
      const labelIdxRef = React11.useRef(0);
      const nextLabel = React11.useCallback(() => {
        const idx = labelIdxRef.current;
        const suffix = idx >= 26 ? String(Math.floor(idx / 26)) : "";
        const code = "A".charCodeAt(0) + idx % 26;
        labelIdxRef.current = idx + 1;
        return String.fromCharCode(code) + suffix;
      }, []);
      const nextLocalId = React11.useCallback(() => "j" + creationLogRef.current.length, []);
      const resolveArgs = React11.useCallback((args) => {
        return args.map((a) => {
          if (typeof a === "string" && objMapRef.current.has(a)) {
            return objMapRef.current.get(a);
          }
          return a;
        });
      }, []);
      const pushLog = React11.useCallback(
        (id, type, args, attrs, obj) => {
          creationLogRef.current.push({ id, type, args, attrs });
          objMapRef.current.set(id, obj);
          setHistoryTick((t) => t + 1);
        },
        []
      );
      const create = React11.useCallback(
        (type, args, attrs = {}) => {
          if (!boardRef.current) return null;
          const id = nextLocalId();
          const resolved = resolveArgs(args);
          const resolvedAttrs = resolveAttrColors(attrs, paletteFor(isDarkRef.current));
          const obj = boardRef.current.create(type, resolved, resolvedAttrs);
          pushLog(id, type, args, attrs, obj);
          return obj;
        },
        [nextLocalId, resolveArgs, pushLog]
      );
      const localIdOf = React11.useCallback((obj) => {
        for (const [id, o] of objMapRef.current.entries()) {
          if (o === obj) return id;
        }
        return null;
      }, []);
      const snapshotObject = React11.useCallback((obj, anchorScreen) => {
        const o = obj;
        const k = objKind(o);
        if (k !== "point" && k !== "line" && k !== "circle") return null;
        const v = o.visProp ?? {};
        const showLabel = v.withlabel !== false;
        const showValue = valueLabelsRef.current.has(o);
        return {
          obj: o,
          kind: k,
          name: typeof o.name === "string" ? o.name : "",
          color: v.strokecolor ?? "#1e1e1e",
          dash: typeof v.dash === "number" ? v.dash : 0,
          width: typeof v.strokewidth === "number" ? v.strokewidth : 2,
          face: v.face ?? "o",
          showLabel,
          showValue,
          screenCoords: anchorScreen
        };
      }, []);
      const createValueLabelFor = React11.useCallback((target) => {
        const b = boardRef.current;
        if (!b || !target) return null;
        const k = objKind(target);
        if (k === "line") {
          const p1 = target.point1;
          const p2 = target.point2;
          if (!p1 || !p2) return null;
          const txt = b.create("text", [
            () => (p1.X() + p2.X()) / 2 + 0.15,
            () => (p1.Y() + p2.Y()) / 2 + 0.25,
            () => {
              const dx = p2.X() - p1.X();
              const dy = p2.Y() - p1.Y();
              const len = Math.hypot(dx, dy);
              const name = typeof target.name === "string" && target.name ? target.name : "d";
              return `${name} = ${len.toFixed(2)}`;
            }
          ], { fontSize: 12, color: "#dc2626", fixed: true, highlight: false });
          return txt;
        }
        if (k === "circle") {
          const center = target.center ?? target.midpoint;
          if (!center) return null;
          const txt = b.create("text", [
            () => center.X() + 0.3,
            () => center.Y() + 0.3,
            () => {
              const r = typeof target.Radius === "function" ? target.Radius() : 0;
              const name = typeof target.name === "string" && target.name ? target.name : "r";
              return `${name} = ${r.toFixed(2)}`;
            }
          ], { fontSize: 12, color: "#dc2626", fixed: true, highlight: false });
          return txt;
        }
        return null;
      }, []);
      const mutateObject = React11.useCallback((obj, patch) => {
        if (!boardRef.current) return;
        const o = obj;
        if (patch.remove) {
          const vl = valueLabelsRef.current.get(o);
          if (vl) {
            try {
              boardRef.current.removeObject(vl);
            } catch {
            }
            valueLabelsRef.current.delete(o);
          }
          try {
            boardRef.current.removeObject(o);
          } catch {
          }
          const board = boardRef.current;
          const aliveIds = /* @__PURE__ */ new Set();
          for (const [id, obj2] of objMapRef.current.entries()) {
            const jxgId = obj2?.id;
            if (jxgId && board && board.objects && board.objects[jxgId]) {
              aliveIds.add(id);
            }
          }
          creationLogRef.current = creationLogRef.current.filter((e) => aliveIds.has(e.id));
          for (const id of Array.from(objMapRef.current.keys())) {
            if (!aliveIds.has(id)) objMapRef.current.delete(id);
          }
          setHistoryTick((t) => t + 1);
          return;
        }
        if (typeof patch.valueLabel === "boolean") {
          const has = valueLabelsRef.current.has(o);
          if (patch.valueLabel && !has) {
            const txt = createValueLabelFor(o);
            if (txt) {
              valueLabelsRef.current.set(o, txt);
              const targetId = localIdOf(o);
              if (targetId) {
                const id = nextLocalId();
                creationLogRef.current.push({ id, type: "valueLabel", args: [targetId], attrs: {} });
                objMapRef.current.set(id, txt);
                setHistoryTick((t) => t + 1);
              }
            }
          } else if (!patch.valueLabel && has) {
            const txt = valueLabelsRef.current.get(o);
            valueLabelsRef.current.delete(o);
            if (txt) {
              try {
                boardRef.current.removeObject(txt);
              } catch {
              }
              const txtId = localIdOf(txt);
              if (txtId) {
                creationLogRef.current = creationLogRef.current.filter((e) => e.id !== txtId);
                objMapRef.current.delete(txtId);
                setHistoryTick((t) => t + 1);
              }
            }
          }
        }
        if (patch.attrs) {
          try {
            o.setAttribute(patch.attrs);
          } catch {
          }
          const id = localIdOf(o);
          if (id) {
            const entry = creationLogRef.current.find((e) => e.id === id);
            if (entry) entry.attrs = { ...entry.attrs, ...patch.attrs };
            setHistoryTick((t) => t + 1);
          }
        }
        try {
          boardRef.current.update();
        } catch {
        }
      }, [createValueLabelFor, localIdOf, nextLocalId]);
      const clearPreviewSegs = React11.useCallback(() => {
        const b = boardRef.current;
        if (!b) return;
        for (const s of previewSegRef.current) {
          try {
            b.removeObject(s);
          } catch {
          }
        }
        previewSegRef.current = [];
      }, []);
      const removePhantom = React11.useCallback(() => {
        const b = boardRef.current;
        if (!b) return;
        if (previewShapeRef.current) {
          try {
            b.removeObject(previewShapeRef.current);
          } catch {
          }
          previewShapeRef.current = null;
        }
        if (phantomRef.current) {
          try {
            b.removeObject(phantomRef.current);
          } catch {
          }
          phantomRef.current = null;
        }
      }, []);
      const clearPending = React11.useCallback(() => {
        removePhantom();
        clearPreviewSegs();
        pendingRef.current = [];
        setPendingCount(0);
      }, [clearPreviewSegs, removePhantom]);
      const applySelectionStyle = React11.useCallback((obj) => {
        if (!obj || selOriginalRef.current.has(obj)) return;
        try {
          const visProp = obj.visProp ?? {};
          selOriginalRef.current.set(obj, {
            strokeColor: visProp.strokecolor,
            strokeWidth: visProp.strokewidth
          });
          const kind = objKind(obj);
          if (kind === "point") {
            obj.setAttribute({ strokeColor: "#06b6d4", strokeWidth: 3 });
          } else {
            obj.setAttribute({ strokeColor: "#06b6d4", strokeWidth: 3 });
          }
        } catch {
        }
      }, []);
      const restoreSelectionStyle = React11.useCallback((obj) => {
        const orig = selOriginalRef.current.get(obj);
        if (!orig) return;
        try {
          const attrs = {};
          if (orig.strokeColor !== void 0) attrs.strokeColor = orig.strokeColor;
          if (orig.strokeWidth !== void 0) attrs.strokeWidth = orig.strokeWidth;
          obj.setAttribute(attrs);
        } catch {
        }
        selOriginalRef.current.delete(obj);
      }, []);
      const clearSelection = React11.useCallback(() => {
        for (const o of selectedSetRef.current) {
          restoreSelectionStyle(o);
        }
        selectedSetRef.current.clear();
        setSelectionTick((t) => t + 1);
        try {
          boardRef.current?.update();
        } catch {
        }
      }, [restoreSelectionStyle]);
      const toggleSelect = React11.useCallback((obj, additive) => {
        if (!obj) return;
        if (!additive) {
          for (const o of selectedSetRef.current) {
            if (o !== obj) restoreSelectionStyle(o);
          }
          selectedSetRef.current = /* @__PURE__ */ new Set([obj]);
          applySelectionStyle(obj);
        } else {
          if (selectedSetRef.current.has(obj)) {
            restoreSelectionStyle(obj);
            selectedSetRef.current.delete(obj);
          } else {
            selectedSetRef.current.add(obj);
            applySelectionStyle(obj);
          }
        }
        setSelectionTick((t) => t + 1);
        try {
          boardRef.current?.update();
        } catch {
        }
      }, [applySelectionStyle, restoreSelectionStyle]);
      const deleteSelected = React11.useCallback(() => {
        const board = boardRef.current;
        if (!board) return;
        if (selectedSetRef.current.size === 0) return;
        for (const o of selectedSetRef.current) selOriginalRef.current.delete(o);
        for (const o of selectedSetRef.current) {
          try {
            board.removeObject(o);
          } catch {
          }
        }
        selectedSetRef.current.clear();
        const aliveIds = /* @__PURE__ */ new Set();
        for (const [id, o] of objMapRef.current.entries()) {
          const jxgId = o?.id;
          if (jxgId && board.objects && board.objects[jxgId]) aliveIds.add(id);
        }
        creationLogRef.current = creationLogRef.current.filter((e) => aliveIds.has(e.id));
        for (const id of Array.from(objMapRef.current.keys())) {
          if (!aliveIds.has(id)) objMapRef.current.delete(id);
        }
        setSelectionTick((t) => t + 1);
        setHistoryTick((t) => t + 1);
      }, []);
      const buildPreview = React11.useCallback((toolDef, picks, phantom) => {
        const b = boardRef.current;
        if (!b) return null;
        const style = { strokeColor: "#3b82f6", strokeWidth: 1.5, strokeOpacity: 0.65, dash: 2, fixed: true, highlight: false, withLabel: false };
        const circStyle = { ...style, fillColor: "none", fillOpacity: 0 };
        try {
          switch (toolDef.key) {
            case "segment":
            case "midpoint":
            case "distance":
              return b.create("segment", [picks[0], phantom], style);
            case "line":
              return b.create("line", [picks[0], phantom], style);
            case "ray":
              return b.create("line", [picks[0], phantom], { ...style, straightFirst: false, straightLast: true });
            case "vector":
              return b.create("arrow", [picks[0], phantom], style);
            case "circleCenter":
              return b.create("circle", [picks[0], phantom], circStyle);
            case "circle3":
              if (picks.length === 1) return b.create("circle", [picks[0], phantom], circStyle);
              if (picks.length === 2) return b.create("circumcircle", [picks[0], picks[1], phantom], circStyle);
              return null;
            case "angle":
              if (picks.length === 1) return b.create("segment", [picks[0], phantom], style);
              if (picks.length === 2) return b.create("angle", [picks[0], picks[1], phantom], { ...style, radius: 1, fillColor: "#22c55e", fillOpacity: 0.15 });
              return null;
            case "perpBisector":
              return b.create("segment", [picks[0], phantom], style);
            case "angleBisector":
              if (picks.length === 1) return b.create("segment", [picks[0], phantom], style);
              if (picks.length === 2) return b.create("bisector", [picks[0], picks[1], phantom], style);
              return null;
            case "perpendicular":
            case "parallel":
            case "tangent":
              if (picks.length === 1) {
                const k = objKind(picks[0]);
                if (k === "line" && toolDef.key !== "tangent") {
                  return b.create(toolDef.key, [picks[0], phantom], style);
                }
                if (k === "circle" && toolDef.key === "tangent") {
                  const glider = b.create("glider", [phantom.X(), phantom.Y(), picks[0]], { visible: false, withLabel: false });
                  return b.create("tangent", [glider], style);
                }
              }
              return null;
            default:
              return null;
          }
        } catch {
          return null;
        }
      }, []);
      const refreshPreview = React11.useCallback(() => {
        const b = boardRef.current;
        if (!b) return;
        if (previewShapeRef.current) {
          try {
            b.removeObject(previewShapeRef.current);
          } catch {
          }
          previewShapeRef.current = null;
        }
        const t = toolRef.current;
        const toolDef = TOOLS.find((td) => td.key === t);
        if (!toolDef) return;
        const picks = pendingRef.current;
        if (picks.length === 0 || toolDef.needs <= 0) return;
        if (picks.length >= toolDef.needs) return;
        if (!phantomRef.current) {
          try {
            phantomRef.current = b.create("point", [0, 0], { visible: false, fixed: true, withLabel: false, name: "" });
          } catch {
            return;
          }
        }
        previewShapeRef.current = buildPreview(toolDef, picks, phantomRef.current);
      }, [buildPreview]);
      const finalize = React11.useCallback((toolDef, picks) => {
        if (!boardRef.current) return;
        const labels = picks.map(localIdOf).filter(Boolean);
        const stroke = { strokeColor: "@stroke", strokeWidth: 2 };
        const strokeOnly = { ...stroke, fillColor: "none", fillOpacity: 0 };
        const lblName = nextLabel();
        switch (toolDef.key) {
          case "midpoint":
            create("midpoint", labels, { name: lblName, color: "@stroke", size: 3 });
            break;
          case "segment":
            create("segment", labels, stroke);
            break;
          case "line":
            create("line", labels, stroke);
            break;
          case "ray": {
            create("line", labels, { ...stroke, straightFirst: false, straightLast: true });
            break;
          }
          case "vector":
            create("arrow", labels, stroke);
            break;
          case "perpendicular": {
            const [p, l] = picks[0] && objKind(picks[0]) === "point" ? [labels[0], labels[1]] : [labels[1], labels[0]];
            create("perpendicular", [l, p], stroke);
            break;
          }
          case "parallel": {
            const [p, l] = picks[0] && objKind(picks[0]) === "point" ? [labels[0], labels[1]] : [labels[1], labels[0]];
            create("parallel", [l, p], stroke);
            break;
          }
          case "perpBisector": {
            const mid = create("midpoint", labels, { visible: false, withLabel: false, name: "" });
            const seg = create("segment", labels, { visible: false, withLabel: false });
            const midId = localIdOf(mid);
            const segId = localIdOf(seg);
            if (midId && segId) create("perpendicular", [segId, midId], stroke);
            break;
          }
          case "angleBisector":
            create("bisector", labels, stroke);
            break;
          case "circleCenter":
            create("circle", labels, strokeOnly);
            break;
          case "circle3":
            create("circumcircle", labels, strokeOnly);
            break;
          case "tangent": {
            const firstIsPoint = picks[0] && objKind(picks[0]) === "point";
            const pointPick = firstIsPoint ? picks[0] : picks[1];
            const circleLabel = firstIsPoint ? labels[1] : labels[0];
            if (!pointPick || !circleLabel) break;
            const px = typeof pointPick.X === "function" ? pointPick.X() : 0;
            const py = typeof pointPick.Y === "function" ? pointPick.Y() : 0;
            const glider = create("glider", [px, py, circleLabel], { name: "", size: 2, strokeColor: "#666", visible: false });
            const gid = localIdOf(glider);
            if (gid) create("tangent", [gid], stroke);
            break;
          }
          case "angle": {
            const [pa, pb, pc] = picks;
            let order = labels;
            try {
              const ax = pa.X() - pb.X(), ay = pa.Y() - pb.Y();
              const cx = pc.X() - pb.X(), cy = pc.Y() - pb.Y();
              const cross2 = ax * cy - ay * cx;
              if (cross2 < 0) order = [labels[2], labels[1], labels[0]];
            } catch {
            }
            create("angle", order, {
              radius: 1,
              fillColor: "#22c55e",
              fillOpacity: 0.25,
              strokeColor: "#16a34a",
              strokeWidth: 1.5,
              name: "",
              withLabel: false
            });
            break;
          }
          case "distance": {
            const pA = picks[0], pB = picks[1];
            const dist = Math.hypot(pA.X() - pB.X(), pA.Y() - pB.Y());
            const midX = (pA.X() + pB.X()) / 2;
            const midY = (pA.Y() + pB.Y()) / 2;
            create("text", [midX, midY, `d = ${dist.toFixed(2)}`], { fontSize: 14, color: "#dc2626" });
            break;
          }
          case "polygon": {
            create("polygon", labels, { fillColor: "#1e3a8a", fillOpacity: 0.1, borders: { strokeColor: "@stroke", strokeWidth: 2 } });
            break;
          }
          case "area": {
            create("polygon", labels, { fillColor: "#3b82f6", fillOpacity: 0.18, borders: { strokeColor: "#1d4ed8", strokeWidth: 2 } });
            break;
          }
          case "toggleLabel": {
            const obj = picks[0];
            try {
              if (obj.label) {
                const visible = obj.label.visProp.visible !== false;
                obj.label.setAttribute({ visible: !visible });
              } else if (obj.setAttribute) {
                const cur = obj.visProp.withlabel !== false;
                obj.setAttribute({ withLabel: !cur });
              }
              boardRef.current.update();
            } catch {
            }
            break;
          }
          case "toggleVisible": {
            const obj = picks[0];
            try {
              const visible = obj.visProp.visible !== false;
              obj.setAttribute({ visible: !visible });
              boardRef.current.update();
            } catch {
            }
            break;
          }
          case "delete": {
            const obj = picks[0];
            try {
              boardRef.current.removeObject(obj);
              const board = boardRef.current;
              const aliveIds = /* @__PURE__ */ new Set();
              for (const [id, o] of objMapRef.current.entries()) {
                const jxgId = o?.id;
                if (jxgId && board && board.objects && board.objects[jxgId]) {
                  aliveIds.add(id);
                }
              }
              creationLogRef.current = creationLogRef.current.filter((e) => aliveIds.has(e.id));
              for (const id of Array.from(objMapRef.current.keys())) {
                if (!aliveIds.has(id)) objMapRef.current.delete(id);
              }
              setHistoryTick((t) => t + 1);
            } catch {
            }
            break;
          }
        }
      }, [create, localIdOf, nextLabel]);
      const finalizeTransformCreate = React11.useCallback((spec, source) => {
        if (!boardRef.current) return;
        const def = getDefiningPoints(source);
        if (!def) {
          flashWarn("Kh\xF4ng th\u1EC3 bi\u1EBFn \u0111\u1ED5i \u0111\u1ED1i t\u01B0\u1EE3ng n\xE0y");
          return;
        }
        const transformObjs = [];
        const transformIds = [];
        const steps = spec.chain ?? [{ params: spec.params, attrs: spec.attrs }];
        for (const step of steps) {
          const stepLogArgs = [];
          for (const p of step.params) {
            if (typeof p === "function") {
              flashWarn("Tham s\u1ED1 transform kh\xF4ng serialize \u0111\u01B0\u1EE3c \u2014 b\u1ECF qua");
              return;
            }
            if (p && typeof p === "object") {
              const id = localIdOf(p);
              if (!id) {
                flashWarn("\u0110\u1ED1i t\u01B0\u1EE3ng tham chi\u1EBFu kh\xF4ng n\u1EB1m trong board \u2014 kh\xF4ng th\u1EC3 bi\u1EBFn \u0111\u1ED5i");
                return;
              }
              stepLogArgs.push(id);
            } else {
              stepLogArgs.push(p);
            }
          }
          const stepId = nextLocalId();
          const stepObj = boardRef.current.create("transform", step.params, step.attrs);
          creationLogRef.current.push({ id: stepId, type: "transform", args: stepLogArgs, attrs: step.attrs });
          objMapRef.current.set(stepId, stepObj);
          transformObjs.push(stepObj);
          transformIds.push(stepId);
        }
        const transformParent = transformObjs.length === 1 ? transformObjs[0] : transformObjs;
        const transformLogRef = transformObjs.length === 1 ? transformIds[0] : transformIds;
        const transformedPoints = def.points.map((src) => {
          const srcId = localIdOf(src);
          const id = nextLocalId();
          const srcName = typeof src.name === "string" ? src.name : "";
          const newName = srcName ? `${srcName}'` : nextLabel();
          const attrs = { name: newName, size: 3, color: "#0ea5e9", strokeColor: "#0ea5e9", fillColor: "#0ea5e9" };
          const obj = boardRef.current.create("point", [src, transformParent], attrs);
          creationLogRef.current.push({ id, type: "point", args: [srcId ?? src, transformLogRef], attrs });
          objMapRef.current.set(id, obj);
          return obj;
        });
        const baseStyle = { ...def.attrs, strokeColor: "#0ea5e9" };
        const strokeOnly = { ...baseStyle, fillColor: "none", fillOpacity: 0 };
        const ids = transformedPoints.map((p) => localIdOf(p)).filter((s) => !!s);
        switch (def.kind) {
          case "point":
            break;
          case "segment":
            create("segment", ids, baseStyle);
            break;
          case "line":
            create("line", ids, baseStyle);
            break;
          case "ray":
            create("line", ids, { ...baseStyle, straightFirst: false, straightLast: true });
            break;
          case "arrow":
            create("arrow", ids, baseStyle);
            break;
          case "circleCenter":
            create("circle", ids, strokeOnly);
            break;
          case "circle3":
            create("circumcircle", ids, strokeOnly);
            break;
        }
        setHistoryTick((t) => t + 1);
      }, [create, flashWarn, localIdOf, nextLabel, nextLocalId]);
      const undoLast = React11.useCallback(() => {
        const b = boardRef.current;
        if (!b) return;
        while (creationLogRef.current.length > 0) {
          const last = creationLogRef.current.pop();
          if (!last) break;
          const obj = objMapRef.current.get(last.id);
          objMapRef.current.delete(last.id);
          if (obj) {
            try {
              b.removeObject(obj);
            } catch {
            }
            clearPending();
            setHistoryTick((t) => t + 1);
            try {
              b.update();
            } catch {
            }
            return;
          }
        }
        setHistoryTick((t) => t + 1);
      }, [clearPending]);
      React11.useEffect(() => {
        const onKey = (e) => {
          const ae = document.activeElement;
          const inField = !!(ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.isContentEditable));
          if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
            if (inField) return;
            e.preventDefault();
            e.stopPropagation();
            undoLastRef.current();
            return;
          }
          if (e.key === "Escape" && !inField) {
            if (pendingRef.current.length > 0) {
              e.preventDefault();
              e.stopPropagation();
              clearPendingRef.current();
            }
            if (selectedSetRef.current.size > 0) {
              e.preventDefault();
              e.stopPropagation();
              clearSelectionRef.current();
            }
          }
          if ((e.key === "Delete" || e.key === "Backspace") && !inField) {
            if (selectedSetRef.current.size > 0) {
              e.preventDefault();
              e.stopPropagation();
              deleteSelectedRef.current();
            }
          }
        };
        window.addEventListener("keydown", onKey, { capture: true });
        return () => window.removeEventListener("keydown", onKey, { capture: true });
      }, []);
      const screenCoordsOf = React11.useCallback((evt) => {
        const b = boardRef.current;
        if (!b) return null;
        try {
          const mp = b.getMousePosition ? b.getMousePosition(evt) : null;
          if (mp && mp.length >= 2) return [mp[0], mp[1]];
        } catch {
        }
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const cx = evt.clientX ?? evt.touches?.[0]?.clientX ?? 0;
          const cy = evt.clientY ?? evt.touches?.[0]?.clientY ?? 0;
          return [cx - rect.left, cy - rect.top];
        }
        return null;
      }, []);
      const objectsAt = React11.useCallback((evt) => {
        const b = boardRef.current;
        if (!b) return [];
        const sc = screenCoordsOf(evt);
        if (!sc) return [];
        const [sx, sy] = sc;
        const list = [];
        try {
          const objs = b.objectsList || [];
          for (const o of objs) {
            try {
              if (o.hasPoint && o.hasPoint(sx, sy)) list.push(o);
            } catch {
            }
          }
        } catch {
        }
        return list;
      }, [screenCoordsOf]);
      const findNearestPoint = React11.useCallback((evt, tolPx = 12) => {
        const b = boardRef.current;
        if (!b) return null;
        const sc = screenCoordsOf(evt);
        if (!sc) return null;
        const [sx, sy] = sc;
        const tol2 = tolPx * tolPx;
        let best = null;
        try {
          const objs = b.objectsList || [];
          for (const o of objs) {
            try {
              if (objKind(o) !== "point") continue;
              const pc = o.coords?.scrCoords;
              if (!pc) continue;
              const dx = pc[1] - sx;
              const dy = pc[2] - sy;
              const d2 = dx * dx + dy * dy;
              if (d2 <= tol2 && (!best || d2 < best.d2)) best = { obj: o, d2 };
            } catch {
            }
          }
        } catch {
        }
        return best ? best.obj : null;
      }, [screenCoordsOf]);
      const promoteLabel = React11.useCallback((o) => {
        if (!o) return o;
        const t = (o.elType || o.type || "").toString().toLowerCase();
        if (t !== "text") return o;
        const b = boardRef.current;
        if (!b) return o;
        try {
          for (const c of b.objectsList || []) {
            if (c.label === o) return c;
          }
        } catch {
        }
        return o;
      }, []);
      const pendingTransformRef = React11.useRef(null);
      const transformSubsRef = React11.useRef(/* @__PURE__ */ new Set());
      const emitTransform = React11.useCallback((info) => {
        transformSubsRef.current.forEach((cb) => {
          try {
            cb(info);
          } catch {
          }
        });
      }, []);
      const selectSubsRef = React11.useRef(/* @__PURE__ */ new Set());
      const emitSelect = React11.useCallback((snap) => {
        selectSubsRef.current.forEach((cb) => {
          try {
            cb(snap);
          } catch {
          }
        });
      }, []);
      const moveDownRef = React11.useRef(null);
      const lastMoveClickRef = React11.useRef({ obj: null, time: 0 });
      React11.useEffect(() => {
        if (typeof window === "undefined" || !containerRef.current) return;
        let cancelled = false;
        (async () => {
          const JXG = (await import('jsxgraph')).default;
          if (cancelled || !containerRef.current) return;
          jxgRef.current = JXG;
          try {
            const opts = JXG.Options;
            if (opts) {
              opts.text = opts.text || {};
              opts.text.display = "internal";
              opts.text.useASCIIMathML = false;
              opts.text.useMathJax = false;
              opts.text.useKatex = false;
              opts.label = opts.label || {};
              opts.label.display = "internal";
              opts.label.strokeColor = themeLabel(isDarkRef.current);
              opts.text.strokeColor = themeLabel(isDarkRef.current);
            }
          } catch {
          }
          const board = JXG.JSXGraph.initBoard(containerId, {
            boundingbox: initialState?.bbox ?? [-10, 10, 10, -10],
            axis: false,
            // We manage axis manually via toggle for clean default
            grid: false,
            showCopyright: false,
            showNavigation: true,
            // Keep 1:1 user→pixel ratio so circles stay circular regardless of the
            // container aspect ratio (Excalidraw panel is taller than wide and
            // without this circles became ellipses after reload).
            keepAspectRatio: true,
            pan: { enabled: true, needShift: false },
            zoom: { wheel: true },
            // Looser hit-test radius so clicking on a thin segment/line/circle
            // actually registers without pixel-perfect aim. `precision` is a real
            // JSXGraph option (Options.precision) but isn't in the d.ts file.
            ...{ precision: { hasPoint: 8, mouse: 4, touch: 16 } }
          });
          boardRef.current = board;
          if (initialState && initialState.elements.length > 0) {
            const idMap = objMapRef.current;
            for (const el of initialState.elements) {
              const resolved = el.args.map((a) => typeof a === "string" && idMap.has(a) ? idMap.get(a) : a);
              try {
                if (el.type === "valueLabel") {
                  const target = resolved[0];
                  if (target) {
                    const txt = createValueLabelFor(target);
                    if (txt) {
                      idMap.set(el.id, txt);
                      valueLabelsRef.current.set(target, txt);
                    }
                  }
                  continue;
                }
                const themedAttrs = resolveAttrColors({ ...el.attrs }, paletteFor(isDarkRef.current));
                const obj = board.create(el.type, resolved, themedAttrs);
                idMap.set(el.id, obj);
              } catch (err) {
                console.warn("Replay failed for", el.type, err);
              }
            }
            creationLogRef.current = [...initialState.elements];
            labelIdxRef.current = initialState.elements.filter((e) => e.type === "point").length;
          }
          if (showAxisRef.current) {
            try {
              axisObjsRef.current.x = board.create("axis", [[0, 0], [1, 0]], { strokeColor: themeAxis(isDarkRef.current), name: "", withLabel: false });
              axisObjsRef.current.y = board.create("axis", [[0, 0], [0, 1]], { strokeColor: themeAxis(isDarkRef.current), name: "", withLabel: false });
            } catch {
            }
          }
          if (showGridRef.current) {
            try {
              board.create("grid", [], { strokeColor: themeGrid(isDarkRef.current), strokeOpacity: 1 });
            } catch {
            }
          }
          board.on("down", (e) => {
            const ctx = {
              boardRef,
              toolRef,
              pendingRef,
              previewSegRef,
              axisObjsRef,
              selectedSetRef,
              marqueeRef,
              moveDownRef,
              lastMoveClickRef,
              pendingTransformRef,
              phantomRef,
              previewShapeRef,
              previewRafRef,
              jxgRef,
              screenCoordsOf,
              objectsAt,
              promoteLabel,
              findNearestPoint,
              toggleSelect,
              clearSelection,
              applySelectionStyle,
              localIdOf,
              nextLabel,
              create,
              finalize,
              finalizeTransformCreate,
              clearPending,
              clearPreviewSegs,
              refreshPreview,
              flashWarn,
              emitTransform,
              snapshotObject,
              emitSelect,
              setPendingCount,
              setSelectionTick
            };
            handleDown(ctx, e);
          });
          board.on("up", (e) => {
            const ctx = {
              boardRef,
              toolRef,
              pendingRef,
              previewSegRef,
              axisObjsRef,
              selectedSetRef,
              marqueeRef,
              moveDownRef,
              lastMoveClickRef,
              pendingTransformRef,
              phantomRef,
              previewShapeRef,
              previewRafRef,
              jxgRef,
              screenCoordsOf,
              objectsAt,
              promoteLabel,
              findNearestPoint,
              toggleSelect,
              clearSelection,
              applySelectionStyle,
              localIdOf,
              nextLabel,
              create,
              finalize,
              finalizeTransformCreate,
              clearPending,
              clearPreviewSegs,
              refreshPreview,
              flashWarn,
              emitTransform,
              snapshotObject,
              emitSelect,
              setPendingCount,
              setSelectionTick
            };
            handleUp(ctx, e);
          });
          board.on("move", (e) => {
            const ctx = {
              boardRef,
              toolRef,
              pendingRef,
              previewSegRef,
              axisObjsRef,
              selectedSetRef,
              marqueeRef,
              moveDownRef,
              lastMoveClickRef,
              pendingTransformRef,
              phantomRef,
              previewShapeRef,
              previewRafRef,
              jxgRef,
              screenCoordsOf,
              objectsAt,
              promoteLabel,
              findNearestPoint,
              toggleSelect,
              clearSelection,
              applySelectionStyle,
              localIdOf,
              nextLabel,
              create,
              finalize,
              finalizeTransformCreate,
              clearPending,
              clearPreviewSegs,
              refreshPreview,
              flashWarn,
              emitTransform,
              snapshotObject,
              emitSelect,
              setPendingCount,
              setSelectionTick
            };
            handleMove(ctx, e);
          });
          onReady({
            getContainer: () => containerRef.current,
            // Sync toạ độ live của free point về log trước khi trả ra. JSXGraph
            // cho phép drag free point (args=[x,y] không có ref), việc drag chỉ
            // cập nhật obj.X()/Y() trên board chứ không đụng log → re-edit + Chèn
            // sẽ serialize toạ độ cũ → SVG không đổi → fileId trùng → user thấy
            // "k thay đổi". Line/segment/circle/polygon tham chiếu point qua id
            // nên auto-update theo.
            getCreationLog: () => creationLogRef.current.map((e) => {
              if (e.type !== "point") return { ...e };
              const args = e.args;
              if (!Array.isArray(args) || args.length !== 2) return { ...e };
              if (typeof args[0] !== "number" || typeof args[1] !== "number") return { ...e };
              const obj = objMapRef.current.get(e.id);
              if (!obj || typeof obj.X !== "function" || typeof obj.Y !== "function") return { ...e };
              const x = obj.X();
              const y = obj.Y();
              if (!Number.isFinite(x) || !Number.isFinite(y)) return { ...e };
              return { ...e, args: [x, y] };
            }),
            getBbox: () => boardRef.current ? boardRef.current.getBoundingBox() : [-10, 10, 10, -10],
            getShowAxis: () => showAxisRef.current,
            getShowGrid: () => showGridRef.current,
            setTool: (t) => handleToolChangeRef.current(t),
            getTool: () => toolRef.current,
            setShowAxis: (b) => setShowAxisRef.current(b),
            setShowGrid: (b) => setShowGridRef.current(b),
            undo: () => undoLastRef.current(),
            canUndo: () => creationLogRef.current.length > 0,
            subscribe: (cb) => {
              subscribersRef.current.add(cb);
              return () => {
                subscribersRef.current.delete(cb);
              };
            },
            snapshotObject,
            mutateObject,
            getAllPointNames: () => {
              const b = boardRef.current;
              if (!b) return [];
              const out = [];
              try {
                const objs = b.objectsList || [];
                for (const o of objs) {
                  if (objKind(o) === "point" && typeof o.name === "string" && o.name) {
                    out.push(o.name);
                  }
                }
              } catch {
              }
              return out;
            },
            onSelect: (cb) => {
              selectSubsRef.current.add(cb);
              return () => {
                selectSubsRef.current.delete(cb);
              };
            },
            onTransformParam: (cb) => {
              transformSubsRef.current.add(cb);
              return () => {
                transformSubsRef.current.delete(cb);
              };
            },
            confirmTransformParam: (value) => {
              const p = pendingTransformRef.current;
              if (!p) return;
              if (p.tool === "regularPolygon") {
                const n = Math.max(3, Math.round(value));
                const p1Id = localIdOf(p.source);
                const p2Id = localIdOf(p.center);
                if (p1Id && p2Id && boardRef.current) {
                  try {
                    create("regularpolygon", [p1Id, p2Id, n], {
                      fillColor: "#1e3a8a",
                      fillOpacity: 0.1,
                      borders: { strokeColor: "@stroke", strokeWidth: 2 }
                    });
                  } catch (err) {
                    console.warn("regularpolygon failed", err);
                  }
                }
                pendingTransformRef.current = null;
                emitTransformRef.current(null);
                clearPendingRef.current();
                return;
              }
              const spec = p.tool === "rotate" ? buildTransformSpec({ kind: "rotate", center: p.center, angleDeg: value }) : buildTransformSpec({ kind: "dilate", center: p.center, k: value });
              finalizeTransformCreateRef.current(spec, p.source);
              pendingTransformRef.current = null;
              emitTransformRef.current(null);
              clearPendingRef.current();
            },
            cancelTransformParam: () => {
              pendingTransformRef.current = null;
              emitTransformRef.current(null);
              clearPendingRef.current();
            },
            getSelectionSize: () => selectedSetRef.current.size,
            clearSelection: () => clearSelectionRef.current(),
            deleteSelection: () => deleteSelectedRef.current()
          });
        })();
        return () => {
          cancelled = true;
          if (previewRafRef.current != null) {
            cancelAnimationFrame(previewRafRef.current);
            previewRafRef.current = null;
          }
          if (boardRef.current && jxgRef.current) {
            try {
              jxgRef.current.JSXGraph.freeBoard(boardRef.current);
            } catch {
            }
            boardRef.current = null;
          }
        };
      }, [containerId]);
      React11.useEffect(() => {
        const b = boardRef.current;
        if (!b) return;
        try {
          if (axisObjsRef.current.x) {
            try {
              b.removeObject(axisObjsRef.current.x);
            } catch {
            }
            axisObjsRef.current.x = void 0;
          }
          if (axisObjsRef.current.y) {
            try {
              b.removeObject(axisObjsRef.current.y);
            } catch {
            }
            axisObjsRef.current.y = void 0;
          }
          if (showAxis) {
            axisObjsRef.current.x = b.create("axis", [[0, 0], [1, 0]], { strokeColor: themeAxis(isDarkRef.current), name: "", withLabel: false });
            axisObjsRef.current.y = b.create("axis", [[0, 0], [0, 1]], { strokeColor: themeAxis(isDarkRef.current), name: "", withLabel: false });
          }
          b.update();
        } catch {
        }
      }, [showAxis]);
      React11.useEffect(() => {
        const b = boardRef.current;
        if (!b) return;
        try {
          const objs = Object.values(b.objects || {});
          for (const o of objs) {
            if (o && (o.elType === "grid" || o.type === "grid" || o.visProp && o.visProp.type === "grid")) {
              try {
                b.removeObject(o);
              } catch {
              }
            }
          }
          if (showGrid) {
            b.create("grid", [], { strokeColor: themeGrid(isDarkRef.current), strokeOpacity: 1 });
          }
          b.update();
        } catch {
        }
      }, [showGrid]);
      const handleToolChange = React11.useCallback((t) => {
        clearPending();
        toolRef.current = t;
        setTool(t);
        const b = boardRef.current;
        if (b) {
          try {
            if (b.attr?.pan) b.attr.pan.enabled = t !== "select";
          } catch {
          }
        }
      }, [clearPending]);
      const handleToolChangeRef = React11.useRef(handleToolChange);
      handleToolChangeRef.current = handleToolChange;
      const subscribersRef = React11.useRef(/* @__PURE__ */ new Set());
      const notifySubscribers = React11.useCallback(() => {
        subscribersRef.current.forEach((cb) => {
          try {
            cb();
          } catch {
          }
        });
      }, []);
      React11.useEffect(() => {
        notifySubscribers();
      }, [tool, showAxis, showGrid, historyTick, notifySubscribers]);
      const undoLastRef = React11.useRef(undoLast);
      undoLastRef.current = undoLast;
      const clearPendingRef = React11.useRef(clearPending);
      clearPendingRef.current = clearPending;
      const finalizeTransformCreateRef = React11.useRef(finalizeTransformCreate);
      finalizeTransformCreateRef.current = finalizeTransformCreate;
      const clearSelectionRef = React11.useRef(clearSelection);
      clearSelectionRef.current = clearSelection;
      const deleteSelectedRef = React11.useRef(deleteSelected);
      deleteSelectedRef.current = deleteSelected;
      const emitTransformRef = React11.useRef(emitTransform);
      emitTransformRef.current = emitTransform;
      const setShowAxisRef = React11.useRef(setShowAxis);
      setShowAxisRef.current = setShowAxis;
      const setShowGridRef = React11.useRef(setShowGrid);
      setShowGridRef.current = setShowGrid;
      return /* @__PURE__ */ jsxRuntime.jsx(
        "div",
        {
          ref: containerRef,
          id: containerId,
          "data-testid": "jxgmini-container",
          className: "h-full min-h-0 bg-white",
          style: { touchAction: "none" }
        }
      );
    };
  }
});
function MobileToolDrawer({
  title,
  headerIcon,
  chips,
  actions,
  groups,
  activeTool,
  onToolSelect,
  drawerOpen,
  onDrawerClose,
  isDark,
  testId
}) {
  return /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
    drawerOpen && /* @__PURE__ */ jsxRuntime.jsx(
      "div",
      {
        className: "stamp-drawer-backdrop",
        onPointerDown: onDrawerClose,
        "aria-hidden": "true"
      }
    ),
    /* @__PURE__ */ jsxRuntime.jsxs(
      "aside",
      {
        role: "complementary",
        "aria-label": title,
        "aria-hidden": !drawerOpen ? "true" : void 0,
        "data-testid": testId,
        "data-stamp-area": "true",
        "data-mobile-drawer": "true",
        "data-geo-mobile": "true",
        "data-drawer-state": drawerOpen ? "open" : "closed",
        className: [
          isDark ? "theme--dark " : "",
          "stamp-drawer-mobile flex flex-col border-r border-slate-200 bg-white shadow-md"
        ].join(""),
        children: [
          /* @__PURE__ */ jsxRuntime.jsxs("header", { className: "flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-4 py-3", children: [
            /* @__PURE__ */ jsxRuntime.jsxs("h3", { className: "flex items-center gap-2 text-base font-semibold text-slate-800", children: [
              /* @__PURE__ */ jsxRuntime.jsx("span", { className: "inline-flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700", children: headerIcon }),
              title
            ] }),
            /* @__PURE__ */ jsxRuntime.jsx(
              "button",
              {
                type: "button",
                onClick: onDrawerClose,
                "aria-label": "\u0110\xF3ng ng\u0103n c\xF4ng c\u1EE5",
                className: "inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800",
                children: /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
                  /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" }),
                  /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" })
                ] })
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "sticky top-0 z-10 flex items-center gap-2 border-b border-slate-200 bg-white/95 px-3 py-2 backdrop-blur", children: [
            chips.map((c) => /* @__PURE__ */ jsxRuntime.jsxs(
              "button",
              {
                type: "button",
                role: "switch",
                "aria-pressed": c.pressed,
                "aria-label": c.label,
                "data-testid": c.testId,
                onClick: () => c.onToggle(!c.pressed),
                className: "geo-mobile-chip",
                children: [
                  c.icon,
                  c.label
                ]
              },
              c.label
            )),
            actions.length > 0 && /* @__PURE__ */ jsxRuntime.jsx("div", { className: "ml-auto flex items-center gap-1", children: actions.map((a) => /* @__PURE__ */ jsxRuntime.jsx(
              "button",
              {
                type: "button",
                onClick: a.onClick,
                disabled: a.disabled,
                "aria-label": a.label,
                title: a.title ?? a.label,
                className: "inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent",
                children: a.icon
              },
              a.label
            )) })
          ] }),
          /* @__PURE__ */ jsxRuntime.jsx(
            "div",
            {
              className: "min-h-0 flex-1 overflow-y-auto",
              style: { paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" },
              children: groups.map((g) => /* @__PURE__ */ jsxRuntime.jsxs("section", { className: "px-3 pt-3 pb-1", children: [
                /* @__PURE__ */ jsxRuntime.jsxs("h4", { className: "mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500", children: [
                  /* @__PURE__ */ jsxRuntime.jsx("span", { className: "h-1 w-1 rounded-full bg-emerald-500" }),
                  g.groupLabel
                ] }),
                /* @__PURE__ */ jsxRuntime.jsx("div", { className: "grid grid-cols-3 gap-2", children: g.tools.map((t) => {
                  const active = activeTool === t.key;
                  return /* @__PURE__ */ jsxRuntime.jsxs(
                    "button",
                    {
                      type: "button",
                      "aria-label": t.label,
                      "aria-pressed": active,
                      "data-tool": t.key,
                      onClick: () => {
                        onToolSelect(t.key);
                        onDrawerClose();
                      },
                      className: [
                        "flex flex-col items-center justify-center gap-1.5 rounded-2xl px-2 py-3 transition active:scale-95",
                        active ? "geo-mobile-tool-active" : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                      ].join(" "),
                      children: [
                        /* @__PURE__ */ jsxRuntime.jsx("span", { className: "flex h-6 w-6 items-center justify-center", children: t.icon }),
                        /* @__PURE__ */ jsxRuntime.jsx("span", { className: "text-center text-[11px] font-medium leading-tight line-clamp-2", children: t.label })
                      ]
                    },
                    t.key
                  );
                }) })
              ] }, g.group))
            }
          )
        ]
      }
    )
  ] });
}
var init_MobileToolDrawer = __esm({
  "src/stamps/shared/MobileToolDrawer.tsx"() {
    "use client";
  }
});
function Shell({ title, icon, onClose, children, isDark, closeLabel = "\u0110\xF3ng" }) {
  return /* @__PURE__ */ jsxRuntime.jsxs(
    "aside",
    {
      role: "complementary",
      "aria-label": title,
      "data-testid": "stamp-left-panel",
      "data-stamp-area": "true",
      className: [
        isDark ? "theme--dark " : "",
        "absolute left-0 top-0 z-30 flex h-full w-60 flex-col border-r border-slate-200 bg-white shadow-md animate-in slide-in-from-left duration-200"
      ].join(""),
      children: [
        /* @__PURE__ */ jsxRuntime.jsxs("header", { className: "flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-3 py-2", children: [
          /* @__PURE__ */ jsxRuntime.jsxs("h3", { className: "flex items-center gap-2 text-sm font-semibold text-slate-800", children: [
            /* @__PURE__ */ jsxRuntime.jsx("span", { className: "text-base leading-none", children: icon }),
            title
          ] }),
          /* @__PURE__ */ jsxRuntime.jsx(
            "button",
            {
              onClick: onClose,
              "aria-label": closeLabel,
              className: "rounded p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800",
              children: /* @__PURE__ */ jsxRuntime.jsx(CloseIcon, {})
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntime.jsx("div", { className: "min-h-0 flex-1 overflow-y-auto p-3 space-y-4", children })
      ]
    }
  );
}
function Section({ label, children }) {
  return /* @__PURE__ */ jsxRuntime.jsxs("section", { children: [
    /* @__PURE__ */ jsxRuntime.jsx("h4", { className: "mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500", children: label }),
    children
  ] });
}
function CloseIcon() {
  return /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" }),
    /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" })
  ] });
}
function UndoIcon() {
  return /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ jsxRuntime.jsx("polyline", { points: "3 7 3 13 9 13" }),
    /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M3.51 13a9 9 0 1 0 2.13-9.36L3 7" })
  ] });
}
function AxisIcon() {
  return /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "4", y1: "20", x2: "20", y2: "20" }),
    /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "4", y1: "20", x2: "4", y2: "4" }),
    /* @__PURE__ */ jsxRuntime.jsx("polyline", { points: "2 6 4 4 6 6" }),
    /* @__PURE__ */ jsxRuntime.jsx("polyline", { points: "18 18 20 20 18 22" })
  ] });
}
function GridIcon() {
  return /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ jsxRuntime.jsx("rect", { x: "4", y: "4", width: "16", height: "16", rx: "1" }),
    /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "4", y1: "10", x2: "20", y2: "10" }),
    /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "4", y1: "16", x2: "20", y2: "16" }),
    /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "10", y1: "4", x2: "10", y2: "20" }),
    /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "16", y1: "4", x2: "16", y2: "20" })
  ] });
}
function useToolHoverTooltip() {
  const [hover, setHover] = React11.useState(null);
  const [portalReady, setPortalReady] = React11.useState(false);
  const hoverTimerRef = React11.useRef(null);
  React11.useEffect(() => {
    setPortalReady(true);
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);
  const showHover = React11.useCallback((el, t) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      const r = el.getBoundingClientRect();
      setHover({ label: t.label, hint: t.hint, x: r.right, y: r.top + r.height / 2 });
    }, TOOLTIP_DELAY_MS);
  }, []);
  const hideHover = React11.useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setHover(null);
  }, []);
  return { hover, portalReady, showHover, hideHover };
}
function DesktopGeometryPanel(props) {
  const { activeTool, onToolChange, showAxis, showGrid, onShowAxisChange, onShowGridChange, onUndo, canUndo, onClose, isDark, chordGroup } = props;
  const grouped = React11.useMemo(() => {
    return TOOLS.reduce((acc, t) => {
      var _a;
      (acc[_a = t.group] ?? (acc[_a] = [])).push(t);
      return acc;
    }, {});
  }, []);
  const groupKeys = React11.useMemo(
    () => GROUP_ORDER.filter((g) => grouped[g]),
    [grouped]
  );
  const activeGroupTools = chordGroup ? grouped[chordGroup] ?? null : null;
  const { hover, portalReady, showHover, hideHover } = useToolHoverTooltip();
  return /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
    /* @__PURE__ */ jsxRuntime.jsxs(Shell, { title: "H\xECnh h\u1ECDc", icon: GeometryIconHeader, onClose, isDark, children: [
      /* @__PURE__ */ jsxRuntime.jsx(Section, { label: "B\u1ED1 c\u1EE5c", children: /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "flex items-center gap-3 text-[11px] text-slate-700", children: [
        /* @__PURE__ */ jsxRuntime.jsxs("label", { className: "inline-flex select-none items-center gap-1.5", children: [
          /* @__PURE__ */ jsxRuntime.jsx(
            "input",
            {
              type: "checkbox",
              checked: showAxis,
              onChange: (e) => onShowAxisChange(e.target.checked),
              "data-testid": "toggle-axis"
            }
          ),
          "Tr\u1EE5c to\u1EA1 \u0111\u1ED9"
        ] }),
        /* @__PURE__ */ jsxRuntime.jsxs("label", { className: "inline-flex select-none items-center gap-1.5", children: [
          /* @__PURE__ */ jsxRuntime.jsx(
            "input",
            {
              type: "checkbox",
              checked: showGrid,
              onChange: (e) => onShowGridChange(e.target.checked),
              "data-testid": "toggle-grid"
            }
          ),
          "L\u01B0\u1EDBi"
        ] }),
        /* @__PURE__ */ jsxRuntime.jsx(
          "button",
          {
            type: "button",
            onClick: onUndo,
            disabled: !canUndo,
            title: "Ho\xE0n t\xE1c (Ctrl/Cmd+Z)",
            "aria-label": "Ho\xE0n t\xE1c",
            className: "ml-auto inline-flex items-center justify-center rounded p-1 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent",
            children: /* @__PURE__ */ jsxRuntime.jsx(UndoIcon, {})
          }
        )
      ] }) }),
      groupKeys.map((group) => {
        const isChordActive = chordGroup === group;
        const dimmed = chordGroup !== null && !isChordActive;
        return /* @__PURE__ */ jsxRuntime.jsxs(
          "section",
          {
            "data-chord-group": group,
            "data-chord-active": isChordActive ? "true" : "false",
            className: [
              "rounded-md transition",
              isChordActive ? "bg-emerald-50 ring-1 ring-emerald-400 p-1" : "p-0",
              dimmed ? "opacity-55" : "opacity-100"
            ].join(" "),
            children: [
              /* @__PURE__ */ jsxRuntime.jsxs("h4", { className: "mb-1.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-500", children: [
                /* @__PURE__ */ jsxRuntime.jsx("span", { children: GROUP_LABELS[group] }),
                /* @__PURE__ */ jsxRuntime.jsx(
                  "span",
                  {
                    "data-testid": `chord-letter-${group}`,
                    className: [
                      "font-mono text-[10px] leading-none transition",
                      isChordActive ? "text-emerald-700 font-bold" : "text-slate-400"
                    ].join(" "),
                    children: letterForGroup(group)
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntime.jsx("div", { className: "grid grid-cols-4 gap-1", children: grouped[group].map((t, i) => {
                const active = activeTool === t.key;
                return /* @__PURE__ */ jsxRuntime.jsxs(
                  "button",
                  {
                    type: "button",
                    "aria-label": t.label,
                    "aria-pressed": active,
                    "data-tool": t.key,
                    onClick: () => onToolChange(t.key),
                    onMouseEnter: (e) => showHover(e.currentTarget, t),
                    onMouseLeave: hideHover,
                    onFocus: (e) => showHover(e.currentTarget, t),
                    onBlur: hideHover,
                    className: [
                      "relative flex h-8 items-center justify-center rounded-md transition",
                      active ? "bg-emerald-600 text-white shadow-sm" : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                    ].join(" "),
                    children: [
                      t.icon,
                      /* @__PURE__ */ jsxRuntime.jsx(
                        "span",
                        {
                          "data-testid": `chord-num-${t.key}`,
                          className: [
                            "pointer-events-none absolute bottom-0 right-0.5 font-mono text-[9px] leading-none transition",
                            active ? "text-white/70" : isChordActive ? "text-emerald-700 font-bold" : "text-slate-400"
                          ].join(" "),
                          children: i + 1
                        }
                      )
                    ]
                  },
                  t.key
                );
              }) })
            ]
          },
          group
        );
      }),
      chordGroup && activeGroupTools && /* @__PURE__ */ jsxRuntime.jsxs(
        "div",
        {
          "data-testid": "chord-hint",
          className: "mt-1 rounded border border-emerald-200 bg-emerald-50/60 px-2 py-1 text-[11px] leading-snug text-slate-600",
          children: [
            /* @__PURE__ */ jsxRuntime.jsx("span", { className: "font-mono font-semibold text-emerald-700", children: letterForGroup(chordGroup) }),
            /* @__PURE__ */ jsxRuntime.jsx("span", { className: "mx-1 text-slate-400", children: "\u2192" }),
            activeGroupTools.map((t, i) => /* @__PURE__ */ jsxRuntime.jsxs("span", { className: "mr-2 inline-block", children: [
              /* @__PURE__ */ jsxRuntime.jsx("span", { className: "font-mono font-semibold text-emerald-700", children: i + 1 }),
              /* @__PURE__ */ jsxRuntime.jsx("span", { className: "ml-1", children: t.label })
            ] }, t.key)),
            /* @__PURE__ */ jsxRuntime.jsx("span", { className: "text-slate-400", children: "Esc hu\u1EF7" })
          ]
        }
      )
    ] }),
    portalReady && hover && typeof document !== "undefined" ? reactDom.createPortal(
      /* @__PURE__ */ jsxRuntime.jsxs(
        "div",
        {
          role: "tooltip",
          className: "pointer-events-none fixed w-max max-w-[220px] rounded-md bg-slate-900 px-2 py-1 text-left text-[11px] leading-tight text-white shadow-lg",
          style: {
            left: hover.x + 8,
            top: hover.y,
            transform: "translate(0, -50%)",
            zIndex: 2147483600
          },
          children: [
            /* @__PURE__ */ jsxRuntime.jsx("span", { className: "block font-medium", children: hover.label }),
            hover.hint && /* @__PURE__ */ jsxRuntime.jsx("span", { className: "mt-0.5 block text-slate-300", children: hover.hint })
          ]
        }
      ),
      document.body
    ) : null
  ] });
}
function MobileGeometryPanel(props) {
  const {
    activeTool,
    onToolChange,
    showAxis,
    showGrid,
    onShowAxisChange,
    onShowGridChange,
    onUndo,
    canUndo,
    isDark,
    drawerOpen,
    onDrawerClose
  } = props;
  const groups = React11.useMemo(() => {
    const acc = /* @__PURE__ */ new Map();
    for (const t of TOOLS) {
      if (!acc.has(t.group)) acc.set(t.group, []);
      acc.get(t.group).push(t);
    }
    return Array.from(acc.entries()).map(([group, tools]) => ({
      group,
      groupLabel: GROUP_LABELS[group],
      tools: tools.map((t) => ({ key: t.key, label: t.label, icon: t.icon }))
    }));
  }, []);
  return /* @__PURE__ */ jsxRuntime.jsx(
    MobileToolDrawer,
    {
      title: "H\xECnh h\u1ECDc",
      headerIcon: GeometryIconHeader,
      testId: "stamp-left-panel",
      isDark,
      drawerOpen: !!drawerOpen,
      onDrawerClose: () => onDrawerClose?.(),
      chips: [
        {
          label: "Tr\u1EE5c",
          icon: /* @__PURE__ */ jsxRuntime.jsx(AxisIcon, {}),
          pressed: showAxis,
          onToggle: onShowAxisChange,
          testId: "toggle-axis"
        },
        {
          label: "L\u01B0\u1EDBi",
          icon: /* @__PURE__ */ jsxRuntime.jsx(GridIcon, {}),
          pressed: showGrid,
          onToggle: onShowGridChange,
          testId: "toggle-grid"
        }
      ],
      actions: [
        {
          label: "Ho\xE0n t\xE1c",
          title: "Ho\xE0n t\xE1c (Ctrl/Cmd+Z)",
          icon: /* @__PURE__ */ jsxRuntime.jsx(UndoIcon, {}),
          onClick: onUndo,
          disabled: !canUndo
        }
      ],
      groups,
      activeTool,
      onToolSelect: onToolChange
    }
  );
}
function LeftPanel(props) {
  if (props.isMobile) {
    return /* @__PURE__ */ jsxRuntime.jsx(MobileGeometryPanel, { ...props });
  }
  return /* @__PURE__ */ jsxRuntime.jsx(DesktopGeometryPanel, { ...props });
}
var TOOLTIP_DELAY_MS, GeometryIconHeader;
var init_LeftPanel = __esm({
  "src/stamps/geometry-2d/editor/LeftPanel.tsx"() {
    "use client";
    init_MiniBoard();
    init_tools();
    init_MobileToolDrawer();
    TOOLTIP_DELAY_MS = 400;
    GeometryIconHeader = /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", children: [
      /* @__PURE__ */ jsxRuntime.jsx("polygon", { points: "4,20 20,20 12,5" }),
      /* @__PURE__ */ jsxRuntime.jsx("circle", { cx: "4", cy: "20", r: "1.5", fill: "currentColor", stroke: "none" }),
      /* @__PURE__ */ jsxRuntime.jsx("circle", { cx: "20", cy: "20", r: "1.5", fill: "currentColor", stroke: "none" }),
      /* @__PURE__ */ jsxRuntime.jsx("circle", { cx: "12", cy: "5", r: "1.5", fill: "currentColor", stroke: "none" })
    ] });
  }
});

// src/stamps/shared/excalidrawPalette.ts
var STROKE_PALETTE;
var init_excalidrawPalette = __esm({
  "src/stamps/shared/excalidrawPalette.ts"() {
    STROKE_PALETTE = [
      "#1e1e1e",
      // black
      "#e03131",
      // red
      "#e8590c",
      // orange
      "#f08c00",
      // yellow
      "#2f9e44",
      // green
      "#1971c2",
      // blue
      "#9c36b5",
      // grape
      "#868e96"
      // gray
    ];
  }
});
function readMatch(query) {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  try {
    return window.matchMedia(query).matches;
  } catch {
    return false;
  }
}
function useIsMobile() {
  const [state, setState] = React11.useState(() => ({
    isMobile: readMatch(MOBILE_QUERY),
    isTouchOnly: readMatch(NO_HOVER_QUERY)
  }));
  React11.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(MOBILE_QUERY);
    const tql = window.matchMedia(NO_HOVER_QUERY);
    const update = () => {
      setState({ isMobile: mql.matches, isTouchOnly: tql.matches });
    };
    update();
    mql.addEventListener("change", update);
    tql.addEventListener("change", update);
    return () => {
      mql.removeEventListener("change", update);
      tql.removeEventListener("change", update);
    };
  }, []);
  return state;
}
var MOBILE_QUERY, NO_HOVER_QUERY;
var init_useIsMobile = __esm({
  "src/stamps/shared/useIsMobile.ts"() {
    "use client";
    MOBILE_QUERY = "(max-width: 768px)";
    NO_HOVER_QUERY = "(hover: none)";
  }
});
function toSubscript(n) {
  return String(n).split("").map((d) => SUB_DIGITS[+d] ?? d).join("");
}
function stripTrailingSubscript(s) {
  let i = s.length;
  while (i > 0 && SUB_SET.has(s[i - 1])) i--;
  return s.slice(0, i);
}
function disambiguateName(name, existing) {
  if (!name) return name;
  if (!existing.has(name)) return name;
  const base = stripTrailingSubscript(name) || name;
  for (let n = 2; n < 1e3; n++) {
    const candidate = base + toSubscript(n);
    if (!existing.has(candidate)) return candidate;
  }
  return name;
}
var DASH_OPTIONS, WIDTH_OPTIONS, FACE_OPTIONS, SUB_DIGITS, SUB_SET, Icons, PropertiesPopover;
var init_PropertiesPopover = __esm({
  "src/stamps/geometry-2d/editor/PropertiesPopover.tsx"() {
    "use client";
    init_excalidrawPalette();
    init_useIsMobile();
    DASH_OPTIONS = [
      { value: 0, label: "N\xE9t li\u1EC1n" },
      { value: 2, label: "N\xE9t \u0111\u1EE9t" },
      { value: 1, label: "N\xE9t ch\u1EA5m" }
    ];
    WIDTH_OPTIONS = [1, 2, 3];
    FACE_OPTIONS = [
      { value: "o", symbol: "\u25CF" },
      { value: "circle", symbol: "\u25EF" },
      { value: "cross", symbol: "\u2715" },
      { value: "plus", symbol: "\u271A" }
    ];
    SUB_DIGITS = ["\u2080", "\u2081", "\u2082", "\u2083", "\u2084", "\u2085", "\u2086", "\u2087", "\u2088", "\u2089"];
    SUB_SET = new Set(SUB_DIGITS);
    Icons = {
      color: /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", children: [
        /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M19 11 L11 3 L3 11 L11 19 Z" }),
        /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M19 11 L21 16 a2 2 0 1 1 -4 0 Z", fill: "currentColor", stroke: "none" })
      ] }),
      style: /* @__PURE__ */ jsxRuntime.jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsxRuntime.jsx("circle", { cx: "12", cy: "12", r: "5", fill: "currentColor" }) }),
      size: /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", children: [
        /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "4", y1: "9", x2: "20", y2: "9", strokeWidth: "1" }),
        /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "4", y1: "13", x2: "20", y2: "13", strokeWidth: "2" }),
        /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "4", y1: "17", x2: "20", y2: "17", strokeWidth: "3.2" })
      ] }),
      name: /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "currentColor", children: [
        /* @__PURE__ */ jsxRuntime.jsx("text", { x: "2", y: "17", fontSize: "14", fontFamily: "serif", fontWeight: "700", children: "A" }),
        /* @__PURE__ */ jsxRuntime.jsx("text", { x: "12", y: "17", fontSize: "11", fontFamily: "serif", fontWeight: "700", children: "a" })
      ] }),
      trash: /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", children: [
        /* @__PURE__ */ jsxRuntime.jsx("polyline", { points: "3,6 5,6 21,6" }),
        /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M19 6 l-1 14 a 2 2 0 0 1 -2 2 H 8 a 2 2 0 0 1 -2 -2 l-1 -14" }),
        /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "10", y1: "11", x2: "10", y2: "17" }),
        /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "14", y1: "11", x2: "14", y2: "17" })
      ] })
    };
    PropertiesPopover = (props) => {
      const { anchor, onClose, onMutate, isDark, getAllNames } = props;
      const rootRef = React11.useRef(null);
      const [section, setSection] = React11.useState(null);
      const { isMobile } = useIsMobile();
      const [clamped, setClamped] = React11.useState(null);
      React11.useLayoutEffect(() => {
        if (typeof window === "undefined") return;
        const margin = 8;
        if (isMobile) {
          const rect2 = rootRef.current?.getBoundingClientRect();
          const w2 = rect2?.width ?? 280;
          const left2 = Math.max(margin, (window.innerWidth - w2) / 2);
          const top2 = window.innerHeight - (rect2?.height ?? 80) - margin - 12;
          setClamped({ left: left2, top: Math.max(margin, top2) });
          return;
        }
        const rect = rootRef.current?.getBoundingClientRect();
        const w = rect?.width ?? 280;
        const h = rect?.height ?? 80;
        const left = Math.max(margin, Math.min(anchor.x, window.innerWidth - w - margin));
        const top = Math.max(margin, Math.min(anchor.y, window.innerHeight - h - margin));
        setClamped({ left, top });
      }, [anchor.x, anchor.y, isMobile, section]);
      const initialName = props.kind === "point" ? props.currentName : props.kind === "line" || props.kind === "circle" ? props.currentName : "";
      const [name, setName] = React11.useState(initialName);
      React11.useEffect(() => {
        setName(initialName);
      }, [initialName]);
      React11.useEffect(() => {
        const onKey = (e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            onClose();
          }
        };
        const onPointerDown = (e) => {
          if (!rootRef.current?.contains(e.target)) onClose();
        };
        document.addEventListener("keydown", onKey);
        document.addEventListener("pointerdown", onPointerDown, { capture: true });
        return () => {
          document.removeEventListener("keydown", onKey);
          document.removeEventListener("pointerdown", onPointerDown, { capture: true });
        };
      }, [onClose]);
      const pickColor = (c) => {
        onMutate({ attrs: { strokeColor: c, fillColor: props.kind === "circle" ? "none" : c, color: c } });
      };
      const pickDash = (d) => onMutate({ attrs: { dash: d } });
      const pickWidth = (w) => onMutate({ attrs: { strokeWidth: w } });
      const pickFace = (f) => onMutate({ attrs: { face: f } });
      const currentName = props.kind === "point" || props.kind === "line" || props.kind === "circle" ? props.currentName : "";
      const commitName = () => {
        const trimmed = name.trim();
        if (trimmed === currentName) return;
        let final = trimmed;
        if (trimmed) {
          const others = new Set((getAllNames?.() ?? []).filter((n) => n !== currentName));
          final = disambiguateName(trimmed, others);
        }
        if (final !== name) setName(final);
        onMutate({ attrs: { name: final } });
      };
      const toggleShowLabel = (next) => onMutate({ attrs: { withLabel: next } });
      const toggleShowValue = (next) => onMutate({ valueLabel: next });
      const doDelete = () => {
        onMutate({ remove: true });
        onClose();
      };
      const toggleSection = (s) => setSection((cur) => cur === s ? null : s);
      const currentColor = props.currentColor;
      const currentDash = props.currentDash;
      const currentWidth = props.currentWidth;
      if (typeof document === "undefined") return null;
      const PillBtn = ({ id, label, icon, active, onClick, indicatorColor }) => /* @__PURE__ */ jsxRuntime.jsxs(
        "button",
        {
          type: "button",
          "data-section": id,
          "data-pill-btn": id,
          "aria-label": label,
          "aria-pressed": !!active,
          onClick,
          className: `relative flex h-8 w-8 items-center justify-center rounded-md transition ${active ? "bg-slate-200 text-slate-900" : "text-slate-700 hover:bg-slate-100"}`,
          children: [
            icon,
            indicatorColor && /* @__PURE__ */ jsxRuntime.jsx(
              "span",
              {
                "aria-hidden": true,
                className: "absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-4 rounded-full",
                style: { background: indicatorColor }
              }
            )
          ]
        }
      );
      const colorIndicatorTint = React11.useMemo(() => currentColor, [currentColor]);
      const pos = clamped ?? { left: anchor.x, top: anchor.y };
      const node = /* @__PURE__ */ jsxRuntime.jsxs(
        "div",
        {
          ref: rootRef,
          "data-stamp-area": "true",
          className: `${isDark ? "theme--dark " : ""}fixed z-[2147483600] flex flex-col gap-1.5`,
          style: { left: pos.left, top: pos.top },
          role: "dialog",
          "aria-label": "Thu\u1ED9c t\xEDnh \u0111\u1ED1i t\u01B0\u1EE3ng",
          children: [
            /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "flex items-center gap-1 rounded-full border border-slate-300 bg-white px-1.5 py-1 shadow-lg ring-1 ring-black/5", children: [
              /* @__PURE__ */ jsxRuntime.jsx(PillBtn, { id: "color", label: "M\xE0u", icon: Icons.color, active: section === "color", onClick: () => toggleSection("color"), indicatorColor: colorIndicatorTint }),
              /* @__PURE__ */ jsxRuntime.jsx(PillBtn, { id: "style", label: "Ki\u1EC3u", icon: Icons.style, active: section === "style", onClick: () => toggleSection("style") }),
              /* @__PURE__ */ jsxRuntime.jsx(PillBtn, { id: "size", label: "\u0110\u1ED9 d\xE0y", icon: Icons.size, active: section === "size", onClick: () => toggleSection("size") }),
              /* @__PURE__ */ jsxRuntime.jsx(PillBtn, { id: "name", label: "T\xEAn", icon: Icons.name, active: section === "name", onClick: () => toggleSection("name") }),
              /* @__PURE__ */ jsxRuntime.jsx("span", { "aria-hidden": true, className: "mx-0.5 h-5 w-px bg-slate-200" }),
              /* @__PURE__ */ jsxRuntime.jsx(PillBtn, { id: "delete", label: "Xo\xE1", icon: Icons.trash, onClick: doDelete })
            ] }),
            section && /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "w-[220px] rounded-lg border border-slate-300 bg-white p-3 shadow-2xl ring-1 ring-black/5", children: [
              section === "color" && /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "flex flex-col gap-1", children: [
                /* @__PURE__ */ jsxRuntime.jsx("span", { className: "text-[11px] font-medium text-slate-500", children: "M\xE0u" }),
                /* @__PURE__ */ jsxRuntime.jsx("div", { className: "flex flex-wrap gap-1", children: STROKE_PALETTE.map((c) => /* @__PURE__ */ jsxRuntime.jsx(
                  "button",
                  {
                    "aria-label": `M\xE0u ${c}`,
                    onClick: () => pickColor(c),
                    className: `h-6 w-6 rounded border ${currentColor === c ? "border-emerald-500 ring-2 ring-emerald-300" : "border-slate-200"}`,
                    style: { background: c }
                  },
                  c
                )) })
              ] }),
              section === "style" && /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "flex flex-col gap-1", children: [
                /* @__PURE__ */ jsxRuntime.jsx("span", { className: "text-[11px] font-medium text-slate-500", children: "Ki\u1EC3u" }),
                props.kind === "point" ? /* @__PURE__ */ jsxRuntime.jsx("div", { className: "flex gap-1", children: FACE_OPTIONS.map((f) => /* @__PURE__ */ jsxRuntime.jsx(
                  "button",
                  {
                    "aria-label": `H\xECnh ${f.value}`,
                    onClick: () => pickFace(f.value),
                    className: `h-7 w-7 rounded border text-sm ${props.currentFace === f.value ? "border-emerald-500 bg-emerald-50" : "border-slate-300 bg-white"}`,
                    children: f.symbol
                  },
                  f.value
                )) }) : /* @__PURE__ */ jsxRuntime.jsx("div", { className: "flex gap-1", children: DASH_OPTIONS.map((d) => /* @__PURE__ */ jsxRuntime.jsx(
                  "button",
                  {
                    "aria-label": `Ki\u1EC3u ${d.label.toLowerCase()}`,
                    onClick: () => pickDash(d.value),
                    className: `flex-1 rounded border px-1 py-1 text-[11px] ${currentDash === d.value ? "border-emerald-500 bg-emerald-50" : "border-slate-300 bg-white"}`,
                    children: d.label
                  },
                  d.value
                )) })
              ] }),
              section === "size" && /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "flex flex-col gap-1", children: [
                /* @__PURE__ */ jsxRuntime.jsx("span", { className: "text-[11px] font-medium text-slate-500", children: "\u0110\u1ED9 d\xE0y" }),
                /* @__PURE__ */ jsxRuntime.jsx("div", { className: "flex gap-1", children: WIDTH_OPTIONS.map((w) => /* @__PURE__ */ jsxRuntime.jsx(
                  "button",
                  {
                    "aria-label": `\u0110\u1ED9 d\xE0y ${w}`,
                    onClick: () => pickWidth(w),
                    className: `flex-1 rounded border py-1 ${currentWidth === w ? "border-emerald-500 bg-emerald-50" : "border-slate-300 bg-white"}`,
                    children: /* @__PURE__ */ jsxRuntime.jsx("span", { className: "inline-block rounded bg-slate-800", style: { width: 30, height: w } })
                  },
                  w
                )) })
              ] }),
              section === "name" && /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "flex flex-col gap-2", children: [
                /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "flex flex-col gap-1", children: [
                  /* @__PURE__ */ jsxRuntime.jsx("span", { className: "text-[11px] font-medium text-slate-500", children: "T\xEAn" }),
                  /* @__PURE__ */ jsxRuntime.jsx(
                    "input",
                    {
                      value: name,
                      onChange: (e) => setName(e.target.value),
                      onBlur: commitName,
                      onKeyDown: (e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          commitName();
                        }
                      },
                      autoFocus: true,
                      placeholder: props.kind === "point" ? "A, B, \u2026" : props.kind === "line" ? "a, b, f, \u2026" : "O, c, \u2026",
                      className: "rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800"
                    }
                  ),
                  /* @__PURE__ */ jsxRuntime.jsx("span", { className: "text-[10px] text-slate-400", children: "Tr\xF9ng t\xEAn s\u1EBD t\u1EF1 th\xEAm ch\u1EC9 s\u1ED1 (B \u2192 B\u2082)" })
                ] }),
                /* @__PURE__ */ jsxRuntime.jsxs("label", { className: "flex items-center justify-between gap-2 text-[12px] text-slate-700", children: [
                  /* @__PURE__ */ jsxRuntime.jsx("span", { children: "Hi\u1EC3n th\u1ECB t\xEAn" }),
                  /* @__PURE__ */ jsxRuntime.jsx(
                    "input",
                    {
                      type: "checkbox",
                      checked: props.currentShowLabel !== false,
                      onChange: (e) => toggleShowLabel(e.target.checked),
                      "aria-label": "Hi\u1EC3n th\u1ECB t\xEAn"
                    }
                  )
                ] }),
                (props.kind === "line" || props.kind === "circle") && /* @__PURE__ */ jsxRuntime.jsxs("label", { className: "flex items-center justify-between gap-2 text-[12px] text-slate-700", children: [
                  /* @__PURE__ */ jsxRuntime.jsx("span", { children: "Hi\u1EC3n th\u1ECB gi\xE1 tr\u1ECB" }),
                  /* @__PURE__ */ jsxRuntime.jsx(
                    "input",
                    {
                      type: "checkbox",
                      checked: !!props.currentShowValue,
                      onChange: (e) => toggleShowValue(e.target.checked),
                      "aria-label": "Hi\u1EC3n th\u1ECB gi\xE1 tr\u1ECB"
                    }
                  )
                ] })
              ] })
            ] })
          ]
        }
      );
      return reactDom.createPortal(node, document.body);
    };
  }
});
var LABELS, TransformParamPopover;
var init_TransformParamPopover = __esm({
  "src/stamps/geometry-2d/editor/TransformParamPopover.tsx"() {
    "use client";
    LABELS = {
      rotate: { aria: "G\xF3c quay", label: "G\xF3c (\xB0)", step: 15 },
      dilate: { aria: "T\u1EF7 s\u1ED1 k", label: "T\u1EF7 s\u1ED1 k", step: 0.5 },
      regularPolygon: { aria: "S\u1ED1 c\u1EA1nh \u0111a gi\xE1c \u0111\u1EC1u", label: "S\u1ED1 c\u1EA1nh (n \u2265 3)", step: 1, min: 3 }
    };
    TransformParamPopover = ({ kind, anchor, defaultValue, onConfirm, onCancel, isDark }) => {
      const [value, setValue] = React11.useState(defaultValue);
      const inputRef = React11.useRef(null);
      const meta = LABELS[kind];
      React11.useEffect(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, []);
      const submit = () => {
        let v = Number.isFinite(value) ? value : defaultValue;
        if (kind === "regularPolygon") {
          v = Math.max(3, Math.round(v));
        }
        onConfirm(v);
      };
      if (typeof document === "undefined") return null;
      const node = /* @__PURE__ */ jsxRuntime.jsxs(
        "div",
        {
          "data-stamp-area": "true",
          className: `${isDark ? "theme--dark " : ""}fixed z-[2147483600] flex flex-col gap-2 rounded-lg border border-slate-300 bg-white p-3 shadow-2xl ring-1 ring-black/5`,
          style: { left: anchor.x, top: anchor.y, minWidth: 180 },
          role: "dialog",
          "aria-label": meta.aria,
          children: [
            /* @__PURE__ */ jsxRuntime.jsx("label", { className: "text-xs font-medium text-slate-700", children: meta.label }),
            /* @__PURE__ */ jsxRuntime.jsx(
              "input",
              {
                ref: inputRef,
                type: "number",
                value,
                step: meta.step,
                min: meta.min,
                onChange: (e) => setValue(parseFloat(e.target.value)),
                onKeyDown: (e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submit();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    onCancel();
                  }
                },
                className: "rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800"
              }
            ),
            /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "flex justify-end gap-2", children: [
              /* @__PURE__ */ jsxRuntime.jsx(
                "button",
                {
                  onClick: onCancel,
                  className: "rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-100",
                  children: "Hu\u1EF7"
                }
              ),
              /* @__PURE__ */ jsxRuntime.jsx(
                "button",
                {
                  onClick: submit,
                  className: "rounded bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700",
                  children: "\xC1p d\u1EE5ng"
                }
              )
            ] })
          ]
        }
      );
      return reactDom.createPortal(node, document.body);
    };
  }
});
var GeometryEditorPanel;
var init_EditorPanel = __esm({
  "src/stamps/geometry-2d/editor/EditorPanel.tsx"() {
    "use client";
    init_MiniBoard();
    init_serialize();
    init_render();
    init_PropertiesPopover();
    init_TransformParamPopover();
    GeometryEditorPanel = React11.forwardRef(
      function GeometryEditorPanel2({ initialState, onInsert, onClose, withLeftPanel = false, onStateChange, isDark, isMobile = false, onOpenDrawer }, ref) {
        const handleRef = React11.useRef(null);
        const [ready, setReady] = React11.useState(false);
        const [propsPopover, setPropsPopover] = React11.useState(null);
        const [transformPopover, setTransformPopover] = React11.useState(null);
        const onStateChangeRef = React11.useRef(onStateChange);
        React11.useEffect(() => {
          onStateChangeRef.current = onStateChange;
        }, [onStateChange]);
        const emitState = React11.useCallback(() => {
          const h = handleRef.current;
          const cb = onStateChangeRef.current;
          if (!h || !cb) return;
          cb({
            tool: h.getTool(),
            showAxis: h.getShowAxis(),
            showGrid: h.getShowGrid(),
            canUndo: h.canUndo()
          });
        }, []);
        const handleReady = React11.useCallback((h) => {
          handleRef.current = h;
          setReady(true);
          emitState();
          h.subscribe(emitState);
          h.onSelect((snap) => setPropsPopover(snap));
          h.onTransformParam((info) => setTransformPopover(info));
        }, [emitState]);
        const performInsert = React11.useCallback(() => {
          if (!handleRef.current) return false;
          const log = handleRef.current.getCreationLog();
          if (log.length === 0) return false;
          const bbox = handleRef.current.getBbox();
          const showAxis = handleRef.current.getShowAxis();
          const showGrid = handleRef.current.getShowGrid();
          const serialized = serializeBoard(
            { getBoundingBox: () => bbox, create: () => void 0 },
            log,
            { showAxis, showGrid }
          );
          const jsonState = JSON.stringify(serialized);
          void (async () => {
            try {
              const svgString = await renderGeometrySvgFromState(jsonState);
              onInsert(jsonState, svgString);
            } catch (err) {
              console.error("Geometry insert failed:", err);
            }
          })();
          return true;
        }, [onInsert]);
        const handleInsert = React11.useCallback(() => {
          performInsert();
        }, [performInsert]);
        React11.useImperativeHandle(ref, () => ({
          setTool: (t) => handleRef.current?.setTool(t),
          setShowAxis: (b) => handleRef.current?.setShowAxis(b),
          setShowGrid: (b) => handleRef.current?.setShowGrid(b),
          undo: () => handleRef.current?.undo(),
          insert: performInsert,
          hasContent: () => (handleRef.current?.getCreationLog().length ?? 0) > 0
        }), [performInsert]);
        const wrapperStyle = isMobile ? { position: "fixed", inset: 0, zIndex: 40 } : {
          position: "absolute",
          top: "50%",
          left: withLeftPanel ? "calc(50% + 120px)" : "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 40
        };
        return /* @__PURE__ */ jsxRuntime.jsxs(
          "div",
          {
            role: "dialog",
            "aria-label": "D\u1EF1ng h\xECnh h\u1ECDc",
            "data-testid": "geometry-editor-panel",
            "data-stamp-area": "true",
            "data-mobile-editor": isMobile ? "true" : void 0,
            style: wrapperStyle,
            className: [
              isDark ? "theme--dark " : "",
              "flex flex-col overflow-hidden bg-white",
              isMobile ? "h-full w-full" : "h-[540px] max-h-[85vh] w-[640px] max-w-[calc(100vw-280px)] rounded-lg border border-slate-300 shadow-2xl ring-1 ring-black/5"
            ].join(" "),
            children: [
              /* @__PURE__ */ jsxRuntime.jsxs("header", { className: "flex items-center gap-2 border-b border-slate-200 bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-2 text-white", children: [
                isMobile && /* @__PURE__ */ jsxRuntime.jsx(
                  "button",
                  {
                    type: "button",
                    onClick: onOpenDrawer,
                    "aria-label": "M\u1EDF ng\u0103n c\xF4ng c\u1EE5",
                    className: "-ml-1 inline-flex h-10 w-10 items-center justify-center rounded transition hover:bg-white/15",
                    children: /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
                      /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "4", y1: "6", x2: "20", y2: "6" }),
                      /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "4", y1: "12", x2: "20", y2: "12" }),
                      /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "4", y1: "18", x2: "20", y2: "18" })
                    ] })
                  }
                ),
                /* @__PURE__ */ jsxRuntime.jsxs("h3", { className: "flex flex-1 items-center gap-2 text-sm font-semibold", children: [
                  /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
                    /* @__PURE__ */ jsxRuntime.jsx("polygon", { points: "3,18 12,3 21,18" }),
                    /* @__PURE__ */ jsxRuntime.jsx("circle", { cx: "12", cy: "3", r: "1.5", fill: "currentColor" }),
                    /* @__PURE__ */ jsxRuntime.jsx("circle", { cx: "3", cy: "18", r: "1.5", fill: "currentColor" }),
                    /* @__PURE__ */ jsxRuntime.jsx("circle", { cx: "21", cy: "18", r: "1.5", fill: "currentColor" })
                  ] }),
                  "D\u1EF1ng h\xECnh h\u1ECDc"
                ] }),
                isMobile && /* @__PURE__ */ jsxRuntime.jsx(
                  "button",
                  {
                    type: "button",
                    onClick: handleInsert,
                    disabled: !ready,
                    "data-testid": "geometry-insert-btn-mobile",
                    className: "rounded bg-white/15 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/25 disabled:opacity-50",
                    children: "Ch\xE8n"
                  }
                ),
                /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: onClose, "aria-label": "\u0110\xF3ng", className: "inline-flex h-9 w-9 items-center justify-center rounded transition hover:bg-white/15", children: /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
                  /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" }),
                  /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" })
                ] }) })
              ] }),
              /* @__PURE__ */ jsxRuntime.jsx("div", { className: "min-h-0 flex-1", style: isMobile ? void 0 : { height: "420px" }, children: /* @__PURE__ */ jsxRuntime.jsx(
                JSXGraphMiniBoard,
                {
                  onReady: handleReady,
                  initialState,
                  isDark
                }
              ) }),
              propsPopover && (propsPopover.kind === "point" ? /* @__PURE__ */ jsxRuntime.jsx(
                PropertiesPopover,
                {
                  kind: "point",
                  anchor: propsPopover.screenCoords,
                  isDark,
                  currentName: propsPopover.name,
                  currentColor: propsPopover.color,
                  currentDash: propsPopover.dash,
                  currentWidth: propsPopover.width,
                  currentFace: propsPopover.face,
                  currentShowLabel: propsPopover.showLabel,
                  getAllNames: () => handleRef.current?.getAllPointNames() ?? [],
                  onClose: () => setPropsPopover(null),
                  onMutate: (patch) => {
                    handleRef.current?.mutateObject(propsPopover.obj, patch);
                    if (patch.remove) setPropsPopover(null);
                    if (typeof patch.valueLabel === "boolean" || patch.attrs) {
                      setPropsPopover((cur) => cur ? { ...cur, showValue: patch.valueLabel ?? cur.showValue } : cur);
                    }
                  }
                }
              ) : /* @__PURE__ */ jsxRuntime.jsx(
                PropertiesPopover,
                {
                  kind: propsPopover.kind,
                  anchor: propsPopover.screenCoords,
                  isDark,
                  currentName: propsPopover.name,
                  currentColor: propsPopover.color,
                  currentDash: propsPopover.dash,
                  currentWidth: propsPopover.width,
                  currentShowLabel: propsPopover.showLabel,
                  currentShowValue: propsPopover.showValue,
                  getAllNames: () => handleRef.current?.getAllPointNames() ?? [],
                  onClose: () => setPropsPopover(null),
                  onMutate: (patch) => {
                    handleRef.current?.mutateObject(propsPopover.obj, patch);
                    if (patch.remove) setPropsPopover(null);
                    if (typeof patch.valueLabel === "boolean") {
                      setPropsPopover((cur) => cur ? { ...cur, showValue: patch.valueLabel ?? cur.showValue } : cur);
                    }
                    if (patch.attrs && "withLabel" in patch.attrs) {
                      setPropsPopover((cur) => cur ? { ...cur, showLabel: !!patch.attrs?.withLabel } : cur);
                    }
                  }
                }
              )),
              transformPopover && /* @__PURE__ */ jsxRuntime.jsx(
                TransformParamPopover,
                {
                  kind: transformPopover.tool,
                  anchor: transformPopover.anchor,
                  defaultValue: transformPopover.tool === "rotate" ? 90 : transformPopover.tool === "dilate" ? 2 : 6,
                  isDark,
                  onConfirm: (v) => {
                    handleRef.current?.confirmTransformParam(v);
                    setTransformPopover(null);
                  },
                  onCancel: () => {
                    handleRef.current?.cancelTransformParam();
                    setTransformPopover(null);
                  }
                }
              ),
              !isMobile && /* @__PURE__ */ jsxRuntime.jsxs("footer", { className: "flex items-center justify-between border-t border-slate-200 bg-slate-50 px-3 py-2", children: [
                /* @__PURE__ */ jsxRuntime.jsx("span", { className: "text-xs text-slate-500", children: "Ch\u1ECDn c\xF4ng c\u1EE5 b\xEAn tr\xE1i, click tr\xEAn b\u1EA3ng \u0111\u1EC3 d\u1EF1ng h\xECnh." }),
                /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "flex gap-2", children: [
                  /* @__PURE__ */ jsxRuntime.jsx(
                    "button",
                    {
                      onClick: onClose,
                      className: "rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100",
                      children: "Hu\u1EF7"
                    }
                  ),
                  /* @__PURE__ */ jsxRuntime.jsx(
                    "button",
                    {
                      onClick: handleInsert,
                      disabled: !ready,
                      "data-testid": "geometry-insert-btn",
                      className: "rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50",
                      children: "Ch\xE8n"
                    }
                  )
                ] })
              ] })
            ]
          }
        );
      }
    );
  }
});
function isFieldFocused() {
  const ae = typeof document !== "undefined" ? document.activeElement : null;
  return !!(ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.isContentEditable));
}
function useChordShortcut(args) {
  const { groupOrder, tools, onSelect, enabled } = args;
  const [chordGroup, setChordGroup] = React11.useState(null);
  const groupOrderRef = React11.useRef(groupOrder);
  const toolsRef = React11.useRef(tools);
  const onSelectRef = React11.useRef(onSelect);
  const chordGroupRef = React11.useRef(null);
  groupOrderRef.current = groupOrder;
  toolsRef.current = tools;
  onSelectRef.current = onSelect;
  const cancel = React11.useCallback(() => {
    chordGroupRef.current = null;
    setChordGroup(null);
  }, []);
  React11.useEffect(() => {
    if (!enabled) return;
    const setChord = (next) => {
      chordGroupRef.current = next;
      setChordGroup(next);
    };
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isFieldFocused()) return;
      const key = e.key;
      const lower = key.length === 1 ? key.toLowerCase() : key;
      if (key === "Escape") {
        if (chordGroupRef.current !== null) {
          e.preventDefault();
          e.stopPropagation();
          setChord(null);
        }
        return;
      }
      if (lower.length === 1 && lower >= "a" && lower <= "z") {
        const idx = lower.charCodeAt(0) - A_CODE2;
        if (idx < groupOrderRef.current.length) {
          e.preventDefault();
          e.stopPropagation();
          setChord(groupOrderRef.current[idx]);
        }
        return;
      }
      if (key >= "1" && key <= "9") {
        const active = chordGroupRef.current;
        if (active === null) return;
        const n = key.charCodeAt(0) - "1".charCodeAt(0);
        const toolsInGroup = toolsRef.current.filter(
          (t) => t.group === active
        );
        e.preventDefault();
        e.stopPropagation();
        if (n < toolsInGroup.length) {
          onSelectRef.current(toolsInGroup[n].key);
        }
        setChord(null);
        return;
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => {
      window.removeEventListener("keydown", onKey, { capture: true });
    };
  }, [enabled]);
  return { chordGroup, cancel };
}
var A_CODE2;
var init_useChordShortcut = __esm({
  "src/stamps/shared/useChordShortcut.ts"() {
    A_CODE2 = "a".charCodeAt(0);
  }
});

// src/stamps/shared/svgToImage.ts
async function hashString(input) {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const buf = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(digest)).slice(0, 16).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  let h1 = 2166136261;
  let h2 = 3421674724;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 16777619);
    h2 ^= c + i;
    h2 = Math.imul(h2, 1099511628211 & 4294967295);
  }
  return (h1 >>> 0).toString(16).padStart(8, "0") + (h2 >>> 0).toString(16).padStart(8, "0");
}
function parseSize(svg, attr) {
  const re = new RegExp(`<svg[^>]*\\s${attr}="(\\d+(?:\\.\\d+)?)`, "i");
  const m = svg.match(re);
  if (m) return Math.max(1, Math.round(parseFloat(m[1])));
  const vb = svg.match(/viewBox="([\d.\s-]+)"/i);
  if (vb) {
    const parts = vb[1].trim().split(/\s+/).map(parseFloat);
    if (parts.length === 4) return Math.max(1, Math.round(attr === "width" ? parts[2] : parts[3]));
  }
  return attr === "width" ? 200 : 100;
}
async function svgToImageElement(svg) {
  const width = parseSize(svg, "width");
  const height = parseSize(svg, "height");
  const utf8 = unescape(encodeURIComponent(svg));
  const dataURL = "data:image/svg+xml;base64," + btoa(utf8);
  const fileId = await hashString(dataURL);
  return { dataURL, fileId, width, height, mimeType: "image/svg+xml" };
}
var init_svgToImage = __esm({
  "src/stamps/shared/svgToImage.ts"() {
  }
});

// src/stamps/shared/insertImage.ts
function buildStampImageElement(api, fileId, width, height, customData, x, y) {
  const appState = api?.getAppState() ?? { scrollX: 0, scrollY: 0, width: 800, height: 600, zoom: { value: 1 } };
  const cx = x ?? appState.scrollX + (appState.width ?? 800) / 2 / (appState.zoom?.value ?? 1) - width / 2;
  const cy = y ?? appState.scrollY + (appState.height ?? 600) / 2 / (appState.zoom?.value ?? 1) - height / 2;
  return {
    type: "image",
    id: "stamp_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
    x: cx,
    y: cy,
    width,
    height,
    fileId,
    customData,
    angle: 0,
    strokeColor: "transparent",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 1,
    strokeStyle: "solid",
    roughness: 0,
    opacity: 100,
    groupIds: [],
    roundness: null,
    seed: Math.floor(Math.random() * 1e9),
    versionNonce: 0,
    version: 1,
    isDeleted: false,
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false,
    status: "saved",
    scale: [1, 1]
  };
}
async function insertStampImage(api, opts) {
  const { dataURL, fileId, width, height, mimeType } = await svgToImageElement(opts.svgString);
  api.addFiles([{ id: fileId, dataURL, mimeType, created: Date.now() }]);
  const customData = opts.makeCustomData(width, height);
  const elements = api.getSceneElements();
  const editingId = opts.editingElementId ?? null;
  if (editingId) {
    const updated = elements.map(
      (e) => e.id === editingId ? { ...e, fileId, customData, width, height } : e
    );
    api.updateScene({ elements: updated, appState: clearAppStateAfterInsert() });
    return { fileId, width, height, elementId: editingId };
  }
  const newElement = buildStampImageElement(
    api,
    fileId,
    width,
    height,
    customData,
    opts.position?.x,
    opts.position?.y
  );
  api.updateScene({
    elements: [...elements, newElement],
    appState: clearAppStateAfterInsert()
  });
  return { fileId, width, height, elementId: newElement.id };
}
var clearAppStateAfterInsert;
var init_insertImage = __esm({
  "src/stamps/shared/insertImage.ts"() {
    init_svgToImage();
    clearAppStateAfterInsert = () => ({
      selectedElementIds: {},
      croppingElementId: null
    });
  }
});

// src/stamps/geometry-2d/host.tsx
var host_exports = {};
__export(host_exports, {
  GeometryStampHost: () => GeometryStampHost
});
var INITIAL_GEOM_STATE, GeometryStampHost;
var init_host = __esm({
  "src/stamps/geometry-2d/host.tsx"() {
    "use client";
    init_LeftPanel();
    init_EditorPanel();
    init_tools();
    init_useChordShortcut();
    init_insertImage();
    init_types();
    init_useIsMobile();
    INITIAL_GEOM_STATE = {
      tool: "move",
      showAxis: false,
      showGrid: false,
      canUndo: false
    };
    GeometryStampHost = React11.forwardRef(
      function GeometryStampHost2({ api, editingElement, onClose, isDark }, ref) {
        const panelRef = React11.useRef(null);
        const [geomState, setGeomState] = React11.useState(INITIAL_GEOM_STATE);
        const { isMobile } = useIsMobile();
        const [drawerOpen, setDrawerOpen] = React11.useState(false);
        const { chordGroup } = useChordShortcut({
          groupOrder: GROUP_ORDER,
          tools: TOOLS,
          onSelect: (key) => panelRef.current?.setTool(key),
          enabled: !isMobile
        });
        const initialState = React11.useMemo(() => {
          if (!editingElement) return null;
          if (!isGeometryCustomData(editingElement.customData)) return null;
          try {
            return JSON.parse(editingElement.customData.jsonState);
          } catch {
            console.warn("GeometryStampHost: customData jsonState corrupted");
            return null;
          }
        }, [editingElement]);
        const handleInsert = React11.useCallback(
          async (jsonState, svgString) => {
            if (!api) return;
            try {
              await insertStampImage(api, {
                svgString,
                makeCustomData: (width, height) => ({
                  kind: "geometry",
                  version: 1,
                  jsonState,
                  svgWidth: width,
                  svgHeight: height
                }),
                editingElementId: editingElement?.id ?? null
              });
            } catch (err) {
              console.error("Geometry insert failed:", err);
            }
            onClose();
          },
          [api, editingElement?.id, onClose]
        );
        React11.useImperativeHandle(
          ref,
          () => ({
            tryInsert: () => panelRef.current?.insert() ?? false,
            hasContent: () => panelRef.current?.hasContent() ?? false
          }),
          []
        );
        return /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
          /* @__PURE__ */ jsxRuntime.jsx(
            LeftPanel,
            {
              activeTool: geomState.tool,
              onToolChange: (t) => panelRef.current?.setTool(t),
              showAxis: geomState.showAxis,
              showGrid: geomState.showGrid,
              onShowAxisChange: (b) => panelRef.current?.setShowAxis(b),
              onShowGridChange: (b) => panelRef.current?.setShowGrid(b),
              onUndo: () => panelRef.current?.undo(),
              canUndo: geomState.canUndo,
              onClose,
              isDark,
              isMobile,
              drawerOpen,
              onDrawerClose: () => setDrawerOpen(false),
              chordGroup
            }
          ),
          /* @__PURE__ */ jsxRuntime.jsx(
            GeometryEditorPanel,
            {
              ref: panelRef,
              initialState,
              onInsert: handleInsert,
              onClose,
              onStateChange: setGeomState,
              withLeftPanel: !isMobile,
              isDark,
              isMobile,
              onOpenDrawer: () => setDrawerOpen(true)
            }
          )
        ] });
      }
    );
  }
});

// src/stamps/latex/render.ts
function absoluteOrigin() {
  if (typeof window !== "undefined" && window.location) return window.location.origin;
  return "";
}
async function loadKatexCss() {
  if (cachedCss !== null) return cachedCss;
  try {
    if (typeof fetch === "function") {
      const res = await fetch("/katex.min.css");
      if (res.ok) {
        let css = await res.text();
        const origin = absoluteOrigin();
        if (origin) {
          css = css.replace(/url\((['"]?)(fonts\/)/g, `url($1${origin}/$2`);
        }
        cachedCss = css;
        return css;
      }
    }
  } catch {
  }
  cachedCss = "";
  return "";
}
async function renderLatexToSvg(src, displayMode) {
  const katex = await import('katex');
  const html = katex.default.renderToString(src, { displayMode, throwOnError: true, output: "html" });
  const measureDiv = document.createElement("div");
  measureDiv.style.cssText = "position:absolute;top:-9999px;left:-9999px;visibility:hidden;display:inline-block;";
  measureDiv.innerHTML = html;
  document.body.appendChild(measureDiv);
  const rect = measureDiv.getBoundingClientRect();
  const width = Math.ceil(rect.width) || 50;
  const height = Math.ceil(rect.height) || 20;
  document.body.removeChild(measureDiv);
  const cssText = await loadKatexCss();
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + " " + height + '"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="font-size:16px;line-height:1.2;"><style>' + cssText + "</style>" + html + "</div></foreignObject></svg>";
}
var cachedCss;
var init_render2 = __esm({
  "src/stamps/latex/render.ts"() {
    cachedCss = null;
  }
});

// src/stamps/latex/types.ts
function isLatexCustomData(data) {
  if (!data || typeof data !== "object") return false;
  const d = data;
  return d.kind === "latex" && d.version === 1 && typeof d.src === "string";
}
var init_types2 = __esm({
  "src/stamps/latex/types.ts"() {
  }
});
function Shell2({ title, icon, onClose, children, isMobile, drawerOpen, onDrawerClose }) {
  const mobileAttrs = isMobile ? {
    "data-mobile-drawer": "true",
    "data-drawer-state": drawerOpen ? "open" : "closed"
  } : {};
  const handleHeaderClose = () => {
    if (isMobile) onDrawerClose?.();
    else onClose();
  };
  return /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
    isMobile && drawerOpen && /* @__PURE__ */ jsxRuntime.jsx(
      "div",
      {
        className: "stamp-drawer-backdrop",
        onPointerDown: onDrawerClose,
        "aria-hidden": "true"
      }
    ),
    /* @__PURE__ */ jsxRuntime.jsxs(
      "aside",
      {
        role: "complementary",
        "aria-label": title,
        "aria-hidden": isMobile && !drawerOpen ? "true" : void 0,
        "data-testid": "stamp-left-panel",
        "data-stamp-area": "true",
        ...mobileAttrs,
        className: isMobile ? "stamp-drawer-mobile flex flex-col border-r border-slate-200 bg-white shadow-md" : "absolute left-0 top-0 z-30 flex h-full w-60 flex-col border-r border-slate-200 bg-white shadow-md animate-in slide-in-from-left duration-200",
        children: [
          /* @__PURE__ */ jsxRuntime.jsxs("header", { className: "flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-3 py-2", children: [
            /* @__PURE__ */ jsxRuntime.jsxs("h3", { className: "flex items-center gap-2 text-sm font-semibold text-slate-800", children: [
              /* @__PURE__ */ jsxRuntime.jsx("span", { className: "text-base leading-none", children: icon }),
              title
            ] }),
            /* @__PURE__ */ jsxRuntime.jsx(
              "button",
              {
                onClick: handleHeaderClose,
                "aria-label": isMobile ? "\u0110\xF3ng ng\u0103n c\xF4ng c\u1EE5" : "\u0110\xF3ng",
                className: "rounded p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800",
                children: /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
                  /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" }),
                  /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" })
                ] })
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntime.jsx("div", { className: "min-h-0 flex-1 overflow-y-auto p-3 space-y-4", children })
        ]
      }
    )
  ] });
}
function Section2({ label, children }) {
  return /* @__PURE__ */ jsxRuntime.jsxs("section", { children: [
    /* @__PURE__ */ jsxRuntime.jsx("h4", { className: "mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500", children: label }),
    children
  ] });
}
function LeftPanel2({
  displayMode,
  onDisplayModeChange,
  onInsertSnippet,
  onClose,
  isMobile,
  drawerOpen,
  onDrawerClose
}) {
  return /* @__PURE__ */ jsxRuntime.jsxs(
    Shell2,
    {
      title: "C\xF4ng th\u1EE9c LaTeX",
      icon: "\u2211",
      onClose,
      isMobile,
      drawerOpen,
      onDrawerClose,
      children: [
        /* @__PURE__ */ jsxRuntime.jsx(Section2, { label: "Ch\u1EBF \u0111\u1ED9 hi\u1EC3n th\u1ECB", children: /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "grid grid-cols-2 gap-1.5", children: [
          /* @__PURE__ */ jsxRuntime.jsxs(
            "button",
            {
              type: "button",
              onClick: () => onDisplayModeChange(false),
              "aria-pressed": !displayMode,
              className: [
                "rounded-md border px-2 py-1.5 text-xs transition",
                !displayMode ? "border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              ].join(" "),
              children: [
                /* @__PURE__ */ jsxRuntime.jsx("span", { className: "block font-medium", children: "Inline" }),
                /* @__PURE__ */ jsxRuntime.jsx("span", { className: "block text-[10px] text-slate-500", children: "$ ... $" })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntime.jsxs(
            "button",
            {
              type: "button",
              onClick: () => onDisplayModeChange(true),
              "aria-pressed": displayMode,
              className: [
                "rounded-md border px-2 py-1.5 text-xs transition",
                displayMode ? "border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              ].join(" "),
              children: [
                /* @__PURE__ */ jsxRuntime.jsx("span", { className: "block font-medium", children: "Block" }),
                /* @__PURE__ */ jsxRuntime.jsx("span", { className: "block text-[10px] text-slate-500", children: "$$ ... $$" })
              ]
            }
          )
        ] }) }),
        SNIPPETS.map((group) => /* @__PURE__ */ jsxRuntime.jsx(Section2, { label: group.group, children: /* @__PURE__ */ jsxRuntime.jsx("div", { className: "flex flex-wrap gap-1", children: group.items.map((s) => /* @__PURE__ */ jsxRuntime.jsx(
          "button",
          {
            type: "button",
            "data-snippet": s.snippet,
            onClick: () => onInsertSnippet(s.snippet),
            title: s.snippet,
            className: "rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700",
            children: s.preview
          },
          s.snippet
        )) }) }, group.group)),
        /* @__PURE__ */ jsxRuntime.jsx(Section2, { label: "Ph\xEDm t\u1EAFt", children: /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "flex flex-wrap gap-2 text-[11px] text-slate-600", children: [
          /* @__PURE__ */ jsxRuntime.jsxs("span", { className: "inline-flex items-center gap-1", children: [
            /* @__PURE__ */ jsxRuntime.jsx("kbd", { className: "rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono", children: "Enter" }),
            "ch\xE8n"
          ] }),
          /* @__PURE__ */ jsxRuntime.jsxs("span", { className: "inline-flex items-center gap-1", children: [
            /* @__PURE__ */ jsxRuntime.jsx("kbd", { className: "rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono", children: "Esc" }),
            "\u0111\xF3ng"
          ] })
        ] }) })
      ]
    }
  );
}
var SNIPPETS;
var init_LeftPanel2 = __esm({
  "src/stamps/latex/editor/LeftPanel.tsx"() {
    "use client";
    SNIPPETS = [
      {
        group: "Ph\xE2n s\u1ED1 & lu\u1EF9 th\u1EEBa",
        items: [
          { label: "Ph\xE2n s\u1ED1", preview: "a\u2044b", snippet: "\\frac{a}{b}" },
          { label: "Lu\u1EF9 th\u1EEBa", preview: "x\xB2", snippet: "^{2}" },
          { label: "Ch\u1EC9 s\u1ED1", preview: "x\u2081", snippet: "_{1}" },
          { label: "C\u0103n", preview: "\u221Ax", snippet: "\\sqrt{x}" },
          { label: "C\u0103n n", preview: "\u207F\u221Ax", snippet: "\\sqrt[n]{x}" }
        ]
      },
      {
        group: "T\u1ED5ng & t\xEDch ph\xE2n",
        items: [
          { label: "T\u1ED5ng", preview: "\u03A3", snippet: "\\sum_{i=1}^{n}" },
          { label: "T\xEDch", preview: "\u03A0", snippet: "\\prod_{i=1}^{n}" },
          { label: "T\xEDch ph\xE2n", preview: "\u222B", snippet: "\\int_{a}^{b}" },
          { label: "Gi\u1EDBi h\u1EA1n", preview: "lim", snippet: "\\lim_{x \\to 0}" }
        ]
      },
      {
        group: "K\xFD hi\u1EC7u",
        items: [
          { label: "\u03B1", preview: "\u03B1", snippet: "\\alpha" },
          { label: "\u03B2", preview: "\u03B2", snippet: "\\beta" },
          { label: "\u03C0", preview: "\u03C0", snippet: "\\pi" },
          { label: "\u03B8", preview: "\u03B8", snippet: "\\theta" },
          { label: "\u2260", preview: "\u2260", snippet: "\\neq" },
          { label: "\u2264", preview: "\u2264", snippet: "\\leq" },
          { label: "\u2265", preview: "\u2265", snippet: "\\geq" },
          { label: "\u221E", preview: "\u221E", snippet: "\\infty" },
          { label: "\u2192", preview: "\u2192", snippet: "\\to" }
        ]
      }
    ];
  }
});
var DEBOUNCE_MS, EditorPopover;
var init_EditorPopover = __esm({
  "src/stamps/latex/editor/EditorPopover.tsx"() {
    "use client";
    init_render2();
    DEBOUNCE_MS = 100;
    EditorPopover = React11.forwardRef(function EditorPopover2({
      x,
      y,
      initialValue,
      onInsert,
      onClose,
      displayMode: controlledDisplayMode,
      onDisplayModeChange,
      withLeftPanel = false,
      isMobile = false,
      onOpenDrawer
    }, ref) {
      const [value, setValue] = React11.useState(initialValue);
      const [internalDisplayMode] = React11.useState(false);
      const displayMode = controlledDisplayMode ?? internalDisplayMode;
      const [previewSvg, setPreviewSvg] = React11.useState(null);
      const [error, setError] = React11.useState(null);
      const debounceRef = React11.useRef(null);
      const inputRef = React11.useRef(null);
      React11.useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
          try {
            const svg = await renderLatexToSvg(value, displayMode);
            setPreviewSvg(svg);
            setError(null);
          } catch (err) {
            setPreviewSvg(null);
            setError(err.message);
          }
        }, DEBOUNCE_MS);
        return () => {
          if (debounceRef.current) clearTimeout(debounceRef.current);
        };
      }, [value, displayMode]);
      const handleInsert = React11.useCallback(() => {
        if (!previewSvg) return;
        onInsert(previewSvg, value, displayMode);
      }, [previewSvg, value, displayMode, onInsert]);
      const handleKeyDown = React11.useCallback(
        (e) => {
          if (e.key === "Escape") onClose();
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleInsert();
          }
        },
        [onClose, handleInsert]
      );
      React11.useImperativeHandle(
        ref,
        () => ({
          insertAtCursor: (snippet) => {
            const el = inputRef.current;
            if (!el) {
              setValue((v) => v + snippet);
              return;
            }
            const start = el.selectionStart ?? value.length;
            const end = el.selectionEnd ?? value.length;
            const next = value.slice(0, start) + snippet + value.slice(end);
            setValue(next);
            requestAnimationFrame(() => {
              el.focus();
              const pos = start + snippet.length;
              try {
                el.setSelectionRange(pos, pos);
              } catch {
              }
            });
          },
          hasContent: () => value.trim().length > 0 && !!previewSvg && !error,
          tryInsert: () => {
            if (!previewSvg || error || !value.trim()) return false;
            onInsert(previewSvg, value, displayMode);
            return true;
          }
        }),
        [value, previewSvg, error, displayMode, onInsert]
      );
      const isLegacyPosition = x > 0 || y > 0;
      const wrapperStyle = isMobile ? { position: "fixed", inset: 0, zIndex: 50 } : isLegacyPosition ? { position: "absolute", top: y, left: x, zIndex: 50 } : {
        position: "absolute",
        top: "50%",
        left: withLeftPanel ? "calc(50% + 120px)" : "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 50
      };
      return /* @__PURE__ */ jsxRuntime.jsxs(
        "div",
        {
          style: wrapperStyle,
          "data-stamp-area": "true",
          "data-mobile-editor": isMobile ? "true" : void 0,
          className: isMobile ? "flex h-full w-full flex-col bg-white" : "w-[420px] max-w-[calc(100vw-280px)] rounded-lg border border-slate-300 bg-white shadow-2xl ring-1 ring-black/5",
          role: "dialog",
          "aria-label": "Nh\u1EADp c\xF4ng th\u1EE9c LaTeX",
          children: [
            /* @__PURE__ */ jsxRuntime.jsxs("header", { className: `flex items-center gap-2 border-b border-slate-200 bg-gradient-to-r from-indigo-600 to-purple-600 px-3 py-2 text-white${isMobile ? "" : " rounded-t-lg"}`, children: [
              isMobile && /* @__PURE__ */ jsxRuntime.jsx(
                "button",
                {
                  type: "button",
                  onClick: onOpenDrawer,
                  "aria-label": "M\u1EDF ng\u0103n snippet",
                  className: "-ml-1 inline-flex h-10 w-10 items-center justify-center rounded transition hover:bg-white/15",
                  children: /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
                    /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "4", y1: "6", x2: "20", y2: "6" }),
                    /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "4", y1: "12", x2: "20", y2: "12" }),
                    /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "4", y1: "18", x2: "20", y2: "18" })
                  ] })
                }
              ),
              /* @__PURE__ */ jsxRuntime.jsxs("h3", { className: "flex flex-1 items-center gap-2 text-sm font-semibold", children: [
                /* @__PURE__ */ jsxRuntime.jsx("span", { className: "text-base leading-none", children: "\u2211" }),
                "C\xF4ng th\u1EE9c LaTeX"
              ] }),
              isMobile && /* @__PURE__ */ jsxRuntime.jsx(
                "button",
                {
                  type: "button",
                  onClick: handleInsert,
                  disabled: !previewSvg || !!error,
                  "data-testid": "latex-insert-btn-mobile",
                  className: "rounded bg-white/15 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/25 disabled:opacity-50",
                  children: "Ch\xE8n"
                }
              ),
              /* @__PURE__ */ jsxRuntime.jsx(
                "button",
                {
                  onClick: onClose,
                  "aria-label": "\u0110\xF3ng",
                  className: "inline-flex h-9 w-9 items-center justify-center rounded transition hover:bg-white/15",
                  children: /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
                    /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" }),
                    /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" })
                  ] })
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntime.jsxs("div", { className: `space-y-2 p-3${isMobile ? " flex min-h-0 flex-1 flex-col" : ""}`, children: [
              /* @__PURE__ */ jsxRuntime.jsx(
                "input",
                {
                  ref: inputRef,
                  type: "text",
                  role: "textbox",
                  value,
                  onChange: (e) => setValue(e.target.value),
                  onKeyDown: handleKeyDown,
                  placeholder: "Vd: \\frac{a^2+b^2}{c}",
                  className: `w-full rounded border border-slate-300 px-2 py-1.5 font-mono outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200${isMobile ? " min-h-[44px] text-base" : " text-sm"}`,
                  autoFocus: true
                }
              ),
              /* @__PURE__ */ jsxRuntime.jsx(
                "div",
                {
                  className: [
                    "flex items-center justify-center rounded border p-3 text-center",
                    isMobile ? "min-h-0 flex-1 overflow-auto" : "min-h-[64px]",
                    error ? "border-rose-300 bg-rose-50 text-rose-700" : "border-slate-200 bg-slate-50"
                  ].join(" "),
                  children: error ? /* @__PURE__ */ jsxRuntime.jsxs("span", { className: "text-xs", children: [
                    "L\u1ED7i: ",
                    error.slice(0, 80)
                  ] }) : previewSvg ? /* @__PURE__ */ jsxRuntime.jsx("span", { dangerouslySetInnerHTML: { __html: previewSvg } }) : /* @__PURE__ */ jsxRuntime.jsx("span", { className: "text-xs text-slate-400", children: "(xem tr\u01B0\u1EDBc)" })
                }
              ),
              !isMobile && /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "flex items-center justify-between", children: [
                /* @__PURE__ */ jsxRuntime.jsxs("span", { className: "text-[11px] text-slate-500", children: [
                  displayMode ? "Block" : "Inline",
                  " \xB7 Enter \u0111\u1EC3 ch\xE8n"
                ] }),
                /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "flex gap-2", children: [
                  /* @__PURE__ */ jsxRuntime.jsx(
                    "button",
                    {
                      onClick: onClose,
                      className: "rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100",
                      children: "Hu\u1EF7"
                    }
                  ),
                  /* @__PURE__ */ jsxRuntime.jsx(
                    "button",
                    {
                      onClick: handleInsert,
                      disabled: !previewSvg || !!error,
                      className: "rounded bg-indigo-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50",
                      children: "Ch\xE8n"
                    }
                  )
                ] })
              ] }),
              isMobile && /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "text-center text-[11px] text-slate-500", children: [
                displayMode ? "Block" : "Inline",
                " \xB7 B\u1EA5m Ch\xE8n \u1EDF thanh tr\xEAn"
              ] })
            ] })
          ]
        }
      );
    });
  }
});

// src/stamps/latex/host.tsx
var host_exports2 = {};
__export(host_exports2, {
  LatexStampHost: () => LatexStampHost
});
var LatexStampHost;
var init_host2 = __esm({
  "src/stamps/latex/host.tsx"() {
    "use client";
    init_LeftPanel2();
    init_EditorPopover();
    init_insertImage();
    init_useIsMobile();
    init_types2();
    LatexStampHost = React11.forwardRef(
      function LatexStampHost2({ api, editingElement, onClose }, ref) {
        const editorRef = React11.useRef(null);
        const { isMobile } = useIsMobile();
        const [drawerOpen, setDrawerOpen] = React11.useState(false);
        const initial = React11.useMemo(() => {
          if (editingElement && isLatexCustomData(editingElement.customData)) {
            return {
              initialValue: editingElement.customData.src,
              displayMode: !!editingElement.customData.displayMode
            };
          }
          return { initialValue: "", displayMode: false };
        }, [editingElement]);
        const [displayMode, setDisplayMode] = React11.useState(initial.displayMode);
        const handleInsert = React11.useCallback(
          async (svgString, src, dm) => {
            if (!api) return;
            try {
              await insertStampImage(api, {
                svgString,
                makeCustomData: () => ({
                  kind: "latex",
                  version: 1,
                  src,
                  displayMode: dm
                }),
                editingElementId: editingElement?.id ?? null
              });
            } catch (err) {
              console.error("Latex insert failed:", err);
            }
            onClose();
          },
          [api, editingElement?.id, onClose]
        );
        React11.useImperativeHandle(
          ref,
          () => ({
            tryInsert: () => editorRef.current?.tryInsert() ?? false,
            hasContent: () => editorRef.current?.hasContent() ?? false
          }),
          []
        );
        return /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
          /* @__PURE__ */ jsxRuntime.jsx(
            LeftPanel2,
            {
              displayMode,
              onDisplayModeChange: setDisplayMode,
              onInsertSnippet: (s) => editorRef.current?.insertAtCursor(s),
              onClose,
              isMobile,
              drawerOpen,
              onDrawerClose: () => setDrawerOpen(false)
            }
          ),
          /* @__PURE__ */ jsxRuntime.jsx(
            EditorPopover,
            {
              ref: editorRef,
              x: 0,
              y: 0,
              initialValue: initial.initialValue,
              displayMode,
              onDisplayModeChange: setDisplayMode,
              onInsert: handleInsert,
              onClose,
              withLeftPanel: !isMobile,
              isMobile,
              onOpenDrawer: () => setDrawerOpen(true)
            }
          )
        ] });
      }
    );
  }
});

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
var init_serialize2 = __esm({
  "src/stamps/geometry-3d/serialize.ts"() {
  }
});

// src/stamps/geometry-3d/editor/scene/labels.ts
function nextPointLabel(existing) {
  const used = new Set(existing);
  for (let suffix = 0; suffix < 1e3; suffix++) {
    for (let i = 0; i < 26; i++) {
      const letter = String.fromCharCode(A + i);
      const candidate = suffix === 0 ? letter : `${letter}_${suffix}`;
      if (!used.has(candidate)) return candidate;
    }
  }
  return `P_${used.size}`;
}
function nextDerivedLabel(kind, existing) {
  const used = new Set(existing);
  if (LOWERCASE_KINDS.includes(kind)) {
    for (let i = 0; i < 26; i++) {
      const c = String.fromCharCode("a".charCodeAt(0) + i);
      if (!used.has(c)) return c;
    }
    for (let n = 1; n < 1e3; n++) {
      const c = `a_${n}`;
      if (!used.has(c)) return c;
    }
  }
  const prefix = PREFIX[kind] ?? kind[0];
  for (let n = 1; n < 1e3; n++) {
    const candidate = `${prefix}_${n}`;
    if (!used.has(candidate)) return candidate;
  }
  return `${prefix}_x`;
}
var A, LOWERCASE_KINDS, PREFIX;
var init_labels = __esm({
  "src/stamps/geometry-3d/editor/scene/labels.ts"() {
    A = "A".charCodeAt(0);
    LOWERCASE_KINDS = ["segment", "line", "ray", "vector"];
    PREFIX = {
      sphere: "s",
      polyhedron: "h",
      cylinder: "c",
      cone: "k",
      polygon: "g",
      plane: "\u03C0"
    };
  }
});

// src/stamps/geometry-3d/editor/scene/Scene3D.ts
var Scene3D;
var init_Scene3D = __esm({
  "src/stamps/geometry-3d/editor/scene/Scene3D.ts"() {
    init_labels();
    Scene3D = class {
      constructor() {
        this.objects = /* @__PURE__ */ new Map();
        this.order = [];
        this.counter = 0;
        this.listeners = {
          add: /* @__PURE__ */ new Set(),
          change: /* @__PURE__ */ new Set(),
          delete: /* @__PURE__ */ new Set(),
          reset: /* @__PURE__ */ new Set()
        };
      }
      on(event, cb) {
        const set = this.listeners[event];
        set.add(cb);
        return () => {
          set.delete(cb);
        };
      }
      nextId(prefix) {
        this.counter += 1;
        return `${prefix}${this.counter}`;
      }
      addPoint(constraint, label, color) {
        const id = this.nextId("p");
        const existingLabels = this.list().filter((o) => o.kind === "point").map((o) => o.label);
        const autoLabel = label ?? nextPointLabel(existingLabels);
        const obj = {
          kind: "point",
          id,
          label: autoLabel,
          visible: true,
          color,
          constraint
        };
        this.objects.set(id, obj);
        this.order.push(id);
        this.listeners.add.forEach((cb) => cb(obj));
        return id;
      }
      addObject(kind, spec, label) {
        const id = this.nextId(kind[0]);
        const existingLabels = this.list().filter((o) => o.kind === kind).map((o) => o.label);
        const autoLabel = label ?? nextDerivedLabel(kind, existingLabels);
        const obj = { id, label: autoLabel, visible: true, kind, ...spec };
        this.objects.set(id, obj);
        this.order.push(id);
        this.listeners.add.forEach((cb) => cb(obj));
        return id;
      }
      insert(obj) {
        if (this.objects.has(obj.id)) {
          throw new Error(`Scene3D.insert: id ${obj.id} already exists`);
        }
        this.objects.set(obj.id, obj);
        this.order.push(obj.id);
        this.listeners.add.forEach((cb) => cb(obj));
      }
      get(id) {
        return this.objects.get(id);
      }
      list() {
        return this.order.map((id) => this.objects.get(id)).filter((obj) => obj !== void 0);
      }
      referencedIds(obj) {
        switch (obj.kind) {
          case "point": {
            const c = obj.constraint;
            if (c.kind === "onPlane") return [c.planeId];
            if (c.kind === "onLine") return [c.lineId];
            if (c.kind === "onPolygon") return [c.polygonId];
            if (c.kind === "onSphere") return [c.sphereId];
            return [];
          }
          case "segment":
          case "line":
            return [obj.p1, obj.p2];
          case "ray":
            return [obj.origin, obj.through];
          case "vector":
            return [obj.from, obj.to];
          case "polygon":
            return obj.vertices;
          case "plane":
            return [obj.p1, obj.p2, obj.p3];
          case "sphere":
            return [obj.center, obj.surfacePoint];
          case "polyhedron":
            return obj.vertices;
          case "cylinder":
            return [obj.baseCenter, obj.topCenter];
          case "cone":
            return [obj.baseCenter, obj.apex];
        }
      }
      collectDependents(targetId) {
        const dependents = /* @__PURE__ */ new Set([targetId]);
        let grew = true;
        while (grew) {
          grew = false;
          for (const obj of this.objects.values()) {
            if (dependents.has(obj.id)) continue;
            const refs = this.referencedIds(obj);
            if (refs.some((r) => dependents.has(r))) {
              dependents.add(obj.id);
              grew = true;
            }
          }
        }
        return dependents;
      }
      delete(id) {
        if (!this.objects.has(id)) return;
        const toDelete = this.collectDependents(id);
        for (const dependentId of toDelete) {
          this.objects.delete(dependentId);
          this.order = this.order.filter((x) => x !== dependentId);
          this.listeners.delete.forEach((cb) => cb(dependentId));
        }
      }
      reset() {
        this.objects.clear();
        this.order = [];
        this.counter = 0;
        this.listeners.reset.forEach((cb) => cb());
      }
      reserveId(prefix) {
        return this.nextId(prefix);
      }
      emitChange(id) {
        const obj = this.objects.get(id);
        if (!obj) return;
        this.listeners.change.forEach((cb) => cb(obj));
      }
    };
  }
});

// src/stamps/geometry-3d/editor/tools/handlers/_ensurePoint.ts
function hitToConstraint(hit) {
  switch (hit.kind) {
    case "onGround":
      return { kind: "onGround", x: hit.world[0], y: hit.world[1] };
    case "onAxis":
      return { kind: "onAxis", axis: hit.axis, t: hit.t };
    case "onPlane":
      return { kind: "onPlane", planeId: hit.planeId, u: hit.u, v: hit.v };
    case "onLine":
      return { kind: "onLine", lineId: hit.lineId, t: hit.t };
    case "onPolygon":
      return { kind: "onPolygon", polygonId: hit.polygonId, u: hit.u, v: hit.v };
    case "onSphere":
      return { kind: "onSphere", sphereId: hit.sphereId, theta: hit.theta, phi: hit.phi };
    default:
      return null;
  }
}
function ensurePoint(hit, scene) {
  if (hit.kind === "existingPoint") return hit.pointId;
  const c = hitToConstraint(hit);
  if (!c) return null;
  return scene.addPoint(c);
}
var init_ensurePoint = __esm({
  "src/stamps/geometry-3d/editor/tools/handlers/_ensurePoint.ts"() {
  }
});

// src/stamps/geometry-3d/editor/tools/handlers/point.ts
function buildPoint(args, scene) {
  const hit = args[0]?.hit;
  if (!hit) return null;
  if (hit.kind === "existingPoint") return hit.pointId;
  const c = hitToConstraint(hit);
  if (!c) return null;
  return scene.addPoint(c);
}
var buildPointOnObject;
var init_point = __esm({
  "src/stamps/geometry-3d/editor/tools/handlers/point.ts"() {
    init_ensurePoint();
    buildPointOnObject = buildPoint;
  }
});

// src/stamps/geometry-3d/editor/tools/handlers/segment.ts
function buildSegment(args, scene) {
  if (args.length < 2 || !args[0].hit || !args[1].hit) return null;
  const p1 = ensurePoint(args[0].hit, scene);
  const p2 = ensurePoint(args[1].hit, scene);
  if (!p1 || !p2 || p1 === p2) return null;
  return scene.addObject("segment", { p1, p2 });
}
function buildLine(args, scene) {
  if (args.length < 2 || !args[0].hit || !args[1].hit) return null;
  const p1 = ensurePoint(args[0].hit, scene);
  const p2 = ensurePoint(args[1].hit, scene);
  if (!p1 || !p2 || p1 === p2) return null;
  return scene.addObject("line", { p1, p2 });
}
function buildRay(args, scene) {
  if (args.length < 2 || !args[0].hit || !args[1].hit) return null;
  const origin = ensurePoint(args[0].hit, scene);
  const through = ensurePoint(args[1].hit, scene);
  if (!origin || !through || origin === through) return null;
  return scene.addObject("ray", { origin, through });
}
function buildVector(args, scene) {
  if (args.length < 2 || !args[0].hit || !args[1].hit) return null;
  const from = ensurePoint(args[0].hit, scene);
  const to = ensurePoint(args[1].hit, scene);
  if (!from || !to || from === to) return null;
  return scene.addObject("vector", { from, to });
}
var init_segment = __esm({
  "src/stamps/geometry-3d/editor/tools/handlers/segment.ts"() {
    init_ensurePoint();
  }
});

// src/stamps/geometry-3d/editor/tools/handlers/polygon.ts
function buildPolygon(args, scene) {
  const vertexArgs = args.filter((a) => a.step.type === "point");
  const vertexIds = vertexArgs.map((a) => a.hit ? ensurePoint(a.hit, scene) : null).filter((x) => !!x);
  if (vertexIds.length < 3) return null;
  return scene.addObject("polygon", { vertices: vertexIds });
}
var init_polygon = __esm({
  "src/stamps/geometry-3d/editor/tools/handlers/polygon.ts"() {
    init_ensurePoint();
  }
});

// src/stamps/geometry-3d/editor/scene/constraintMath.ts
function sub(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function add(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}
function scale(a, k) {
  return [a[0] * k, a[1] * k, a[2] * k];
}
function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function norm(a) {
  return Math.sqrt(dot(a, a));
}
function normalize(a) {
  const n = norm(a);
  return n === 0 ? a : scale(a, 1 / n);
}
function getPointWorld(id, scene) {
  const obj = scene.get(id);
  if (!obj || obj.kind !== "point") {
    throw new Error(`constraintMath: point ${id} not found`);
  }
  return constraintToWorld(obj.constraint, scene);
}
function getPlaneBasis(planeObj, scene) {
  const p1 = getPointWorld(planeObj.p1, scene);
  const p2 = getPointWorld(planeObj.p2, scene);
  const p3 = getPointWorld(planeObj.p3, scene);
  const basis1 = sub(p2, p1);
  const tmp = sub(p3, p1);
  const normal = normalize(cross(basis1, tmp));
  const basis2 = cross(normal, basis1);
  return { origin: p1, basis1, basis2, normal };
}
function constraintToWorld(c, scene) {
  switch (c.kind) {
    case "free":
      return [c.x, c.y, c.z];
    case "onGround":
      return [c.x, c.y, 0];
    case "onAxis": {
      if (c.axis === "x") return [c.t, 0, 0];
      if (c.axis === "y") return [0, c.t, 0];
      return [0, 0, c.t];
    }
    case "onPlane": {
      const plane = scene.get(c.planeId);
      if (!plane || plane.kind !== "plane") throw new Error("onPlane: plane missing");
      const { origin, basis1, basis2 } = getPlaneBasis(plane, scene);
      return add(add(origin, scale(basis1, c.u)), scale(basis2, c.v));
    }
    case "onLine": {
      const line = scene.get(c.lineId);
      if (!line || line.kind !== "line" && line.kind !== "segment" && line.kind !== "ray") {
        throw new Error("onLine: parent missing");
      }
      const p1Id = line.kind === "ray" ? line.origin : line.p1;
      const p2Id = line.kind === "ray" ? line.through : line.p2;
      const p1 = getPointWorld(p1Id, scene);
      const p2 = getPointWorld(p2Id, scene);
      const dir = sub(p2, p1);
      return add(p1, scale(dir, c.t));
    }
    case "onPolygon": {
      const pg = scene.get(c.polygonId);
      if (!pg || pg.kind !== "polygon") throw new Error("onPolygon: parent missing");
      const v = pg.vertices;
      if (v.length < 3) throw new Error("onPolygon: < 3 vertices");
      const p1 = getPointWorld(v[0], scene);
      const p2 = getPointWorld(v[1], scene);
      const p3 = getPointWorld(v[2], scene);
      const basis1 = sub(p2, p1);
      const tmp = sub(p3, p1);
      const normal = normalize(cross(basis1, tmp));
      const basis2 = cross(normal, basis1);
      return add(add(p1, scale(basis1, c.u)), scale(basis2, c.v));
    }
    case "onSphere": {
      const sph = scene.get(c.sphereId);
      if (!sph || sph.kind !== "sphere") throw new Error("onSphere: parent missing");
      const center = getPointWorld(sph.center, scene);
      const surface = getPointWorld(sph.surfacePoint, scene);
      const radius = norm(sub(surface, center));
      const x = center[0] + radius * Math.sin(c.phi) * Math.cos(c.theta);
      const y = center[1] + radius * Math.sin(c.phi) * Math.sin(c.theta);
      const z = center[2] + radius * Math.cos(c.phi);
      return [x, y, z];
    }
  }
}
function worldToConstraint(current, world, scene) {
  switch (current.kind) {
    case "free":
      return { kind: "free", x: world[0], y: world[1], z: world[2] };
    case "onGround":
      return { kind: "onGround", x: world[0], y: world[1] };
    case "onAxis": {
      const t = current.axis === "x" ? world[0] : current.axis === "y" ? world[1] : world[2];
      return { kind: "onAxis", axis: current.axis, t };
    }
    case "onPlane": {
      const plane = scene.get(current.planeId);
      if (!plane || plane.kind !== "plane") return current;
      const { origin, basis1, basis2 } = getPlaneBasis(plane, scene);
      const rel = sub(world, origin);
      const b1n = dot(basis1, basis1);
      const b2n = dot(basis2, basis2);
      const u = b1n === 0 ? 0 : dot(rel, basis1) / b1n;
      const v = b2n === 0 ? 0 : dot(rel, basis2) / b2n;
      return { kind: "onPlane", planeId: current.planeId, u, v };
    }
    case "onLine": {
      const line = scene.get(current.lineId);
      if (!line) return current;
      const p1Id = line.kind === "ray" ? line.origin : line.p1;
      const p2Id = line.kind === "ray" ? line.through : line.p2;
      const p1 = getPointWorld(p1Id, scene);
      const p2 = getPointWorld(p2Id, scene);
      const dir = sub(p2, p1);
      const len2 = dot(dir, dir);
      const t = len2 === 0 ? 0 : dot(sub(world, p1), dir) / len2;
      return { kind: "onLine", lineId: current.lineId, t };
    }
    case "onPolygon": {
      const pg = scene.get(current.polygonId);
      if (!pg || pg.kind !== "polygon" || pg.vertices.length < 3) return current;
      const p1 = getPointWorld(pg.vertices[0], scene);
      const p2 = getPointWorld(pg.vertices[1], scene);
      const p3 = getPointWorld(pg.vertices[2], scene);
      const basis1 = sub(p2, p1);
      const tmp = sub(p3, p1);
      const normal = normalize(cross(basis1, tmp));
      const basis2 = cross(normal, basis1);
      const rel = sub(world, p1);
      const b1n = dot(basis1, basis1);
      const b2n = dot(basis2, basis2);
      const u = b1n === 0 ? 0 : dot(rel, basis1) / b1n;
      const v = b2n === 0 ? 0 : dot(rel, basis2) / b2n;
      return { kind: "onPolygon", polygonId: current.polygonId, u, v };
    }
    case "onSphere": {
      const sph = scene.get(current.sphereId);
      if (!sph || sph.kind !== "sphere") return current;
      const center = getPointWorld(sph.center, scene);
      const rel = sub(world, center);
      const r = norm(rel);
      if (r === 0) return current;
      const phi = Math.acos(rel[2] / r);
      const theta = Math.atan2(rel[1], rel[0]);
      return { kind: "onSphere", sphereId: current.sphereId, theta, phi };
    }
  }
}
var init_constraintMath = __esm({
  "src/stamps/geometry-3d/editor/scene/constraintMath.ts"() {
  }
});

// src/stamps/geometry-3d/editor/scene/geometryChecks.ts
function getWorld(id, scene) {
  const obj = scene.get(id);
  if (!obj || obj.kind !== "point") return null;
  return constraintToWorld(obj.constraint, scene);
}
function areCollinear3(p1Id, p2Id, p3Id, scene) {
  const p1 = getWorld(p1Id, scene);
  const p2 = getWorld(p2Id, scene);
  const p3 = getWorld(p3Id, scene);
  if (!p1 || !p2 || !p3) return true;
  const a = [p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]];
  const b = [p3[0] - p1[0], p3[1] - p1[1], p3[2] - p1[2]];
  const c = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  return Math.hypot(c[0], c[1], c[2]) < EPS;
}
function apexCoplanarWithBase(baseIds, apexId, scene) {
  if (baseIds.length < 3) return false;
  const p1 = getWorld(baseIds[0], scene);
  const p2 = getWorld(baseIds[1], scene);
  const p3 = getWorld(baseIds[2], scene);
  const apex = getWorld(apexId, scene);
  if (!p1 || !p2 || !p3 || !apex) return false;
  const a = [p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]];
  const b = [p3[0] - p1[0], p3[1] - p1[1], p3[2] - p1[2]];
  const n = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const d = [apex[0] - p1[0], apex[1] - p1[1], apex[2] - p1[2]];
  const dotND = n[0] * d[0] + n[1] * d[1] + n[2] * d[2];
  return Math.abs(dotND) < EPS;
}
var EPS;
var init_geometryChecks = __esm({
  "src/stamps/geometry-3d/editor/scene/geometryChecks.ts"() {
    init_constraintMath();
    EPS = 1e-6;
  }
});

// src/stamps/geometry-3d/editor/tools/handlers/plane.ts
function buildPlane(args, scene) {
  if (args.length < 3 || !args[0].hit || !args[1].hit || !args[2].hit) return null;
  const p1 = ensurePoint(args[0].hit, scene);
  const p2 = ensurePoint(args[1].hit, scene);
  const p3 = ensurePoint(args[2].hit, scene);
  if (!p1 || !p2 || !p3) return null;
  if (p1 === p2 || p2 === p3 || p1 === p3) return null;
  if (areCollinear3(p1, p2, p3, scene)) return null;
  return scene.addObject("plane", { p1, p2, p3 });
}
var init_plane = __esm({
  "src/stamps/geometry-3d/editor/tools/handlers/plane.ts"() {
    init_ensurePoint();
    init_geometryChecks();
  }
});

// src/stamps/geometry-3d/editor/tools/handlers/pyramid.ts
function buildPyramid(args, scene) {
  const pointArgs = args.filter((a) => a.step.type === "point");
  const baseArgs = pointArgs.slice(0, -1);
  const apexArg = pointArgs.slice(-1)[0];
  if (baseArgs.length < 3 || !apexArg?.hit) return null;
  const baseIds = baseArgs.map((a) => a.hit ? ensurePoint(a.hit, scene) : null).filter((x) => !!x);
  const apexId = ensurePoint(apexArg.hit, scene);
  if (!apexId || baseIds.length < 3) return null;
  if (apexCoplanarWithBase(baseIds, apexId, scene)) return null;
  const vertices = [...baseIds, apexId];
  const apexIdx = vertices.length - 1;
  const faces = [baseIds.map((_, i) => i)];
  for (let i = 0; i < baseIds.length; i++) {
    faces.push([i, (i + 1) % baseIds.length, apexIdx]);
  }
  return scene.addObject("polyhedron", { flavor: "pyramid", vertices, faces });
}
var init_pyramid = __esm({
  "src/stamps/geometry-3d/editor/tools/handlers/pyramid.ts"() {
    init_ensurePoint();
    init_geometryChecks();
  }
});

// src/stamps/geometry-3d/editor/tools/handlers/prism.ts
function buildPrism(args, scene) {
  const baseArgs = args.filter((a) => a.step.type === "point");
  const numberArg = args.find((a) => a.step.type === "number");
  if (baseArgs.length < 3 || !numberArg || typeof numberArg.value !== "number") return null;
  const height = numberArg.value;
  if (height <= 0) return null;
  const baseIds = baseArgs.map((a) => a.hit ? ensurePoint(a.hit, scene) : null).filter((x) => !!x);
  if (baseIds.length < 3) return null;
  const topIds = [];
  for (const id of baseIds) {
    const p = scene.get(id);
    if (!p || p.kind !== "point") return null;
    const w = constraintToWorld(p.constraint, scene);
    topIds.push(scene.addPoint({ kind: "free", x: w[0], y: w[1], z: w[2] + height }));
  }
  const n = baseIds.length;
  const vertices = [...baseIds, ...topIds];
  const faces = [
    baseIds.map((_, i) => i),
    topIds.map((_, i) => n + i)
  ];
  for (let i = 0; i < n; i++) {
    faces.push([i, (i + 1) % n, n + (i + 1) % n, n + i]);
  }
  return scene.addObject("polyhedron", { flavor: "prism", vertices, faces });
}
var init_prism = __esm({
  "src/stamps/geometry-3d/editor/tools/handlers/prism.ts"() {
    init_ensurePoint();
    init_constraintMath();
  }
});

// src/stamps/geometry-3d/editor/tools/handlers/tetrahedron.ts
function buildTetrahedron(args, scene) {
  if (args.length < 2 || !args[0].hit || !args[1].hit) return null;
  const p1Id = ensurePoint(args[0].hit, scene);
  const p2Id = ensurePoint(args[1].hit, scene);
  if (!p1Id || !p2Id || p1Id === p2Id) return null;
  const p1Obj = scene.get(p1Id);
  const p2Obj = scene.get(p2Id);
  if (!p1Obj || p1Obj.kind !== "point" || !p2Obj || p2Obj.kind !== "point") return null;
  const p1 = constraintToWorld(p1Obj.constraint, scene);
  const p2 = constraintToWorld(p2Obj.constraint, scene);
  const z0 = Math.min(p1[2], p2[2]);
  const baseA = [p1[0], p1[1], z0];
  const baseB = [p2[0], p2[1], z0];
  const dx = baseB[0] - baseA[0];
  const dy = baseB[1] - baseA[1];
  const edge = Math.hypot(dx, dy);
  if (edge < 1e-9) return null;
  const mid = [(baseA[0] + baseB[0]) / 2, (baseA[1] + baseB[1]) / 2, z0];
  const perpX = -dy;
  const perpY = dx;
  const perpLen = Math.hypot(perpX, perpY);
  const height = edge * Math.sqrt(3) / 2;
  const baseC = [mid[0] + perpX / perpLen * height, mid[1] + perpY / perpLen * height, z0];
  const centroid = [
    (baseA[0] + baseB[0] + baseC[0]) / 3,
    (baseA[1] + baseB[1] + baseC[1]) / 3,
    z0
  ];
  const apexHeight = edge * Math.sqrt(2 / 3);
  const apex = [centroid[0], centroid[1], z0 + apexHeight];
  const cId = scene.addPoint({ kind: "free", x: baseC[0], y: baseC[1], z: baseC[2] });
  const apexId = scene.addPoint({ kind: "free", x: apex[0], y: apex[1], z: apex[2] });
  const vertices = [p1Id, p2Id, cId, apexId];
  const faces = [
    [0, 1, 2],
    // base
    [0, 1, 3],
    // face p1-p2-apex
    [1, 2, 3],
    // face p2-c-apex
    [2, 0, 3]
    // face c-p1-apex
  ];
  return scene.addObject("polyhedron", { flavor: "tetrahedron", vertices, faces });
}
var init_tetrahedron = __esm({
  "src/stamps/geometry-3d/editor/tools/handlers/tetrahedron.ts"() {
    init_ensurePoint();
    init_constraintMath();
  }
});

// src/stamps/geometry-3d/editor/tools/handlers/cube.ts
function buildCube(args, scene) {
  if (args.length < 2 || !args[0].hit || !args[1].hit) return null;
  const p1Id = ensurePoint(args[0].hit, scene);
  const p2Id = ensurePoint(args[1].hit, scene);
  if (!p1Id || !p2Id || p1Id === p2Id) return null;
  const p1Obj = scene.get(p1Id);
  const p2Obj = scene.get(p2Id);
  if (!p1Obj || p1Obj.kind !== "point" || !p2Obj || p2Obj.kind !== "point") return null;
  const p1 = constraintToWorld(p1Obj.constraint, scene);
  const p2 = constraintToWorld(p2Obj.constraint, scene);
  if (Math.abs(p1[2]) > 1e-6 || Math.abs(p2[2]) > 1e-6) return null;
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const edge = Math.hypot(dx, dy);
  if (edge < 1e-9) return null;
  const perpX = -dy;
  const perpY = dx;
  const p3 = [p2[0] + perpX, p2[1] + perpY, 0];
  const p4 = [p1[0] + perpX, p1[1] + perpY, 0];
  const t1 = [p1[0], p1[1], edge];
  const t2 = [p2[0], p2[1], edge];
  const t3 = [p3[0], p3[1], edge];
  const t4 = [p4[0], p4[1], edge];
  const p3Id = scene.addPoint({ kind: "onGround", x: p3[0], y: p3[1] });
  const p4Id = scene.addPoint({ kind: "onGround", x: p4[0], y: p4[1] });
  const t1Id = scene.addPoint({ kind: "free", x: t1[0], y: t1[1], z: t1[2] });
  const t2Id = scene.addPoint({ kind: "free", x: t2[0], y: t2[1], z: t2[2] });
  const t3Id = scene.addPoint({ kind: "free", x: t3[0], y: t3[1], z: t3[2] });
  const t4Id = scene.addPoint({ kind: "free", x: t4[0], y: t4[1], z: t4[2] });
  const vertices = [p1Id, p2Id, p3Id, p4Id, t1Id, t2Id, t3Id, t4Id];
  const faces = [
    [0, 1, 2, 3],
    // bottom
    [4, 5, 6, 7],
    // top
    [0, 1, 5, 4],
    // front
    [1, 2, 6, 5],
    // right
    [2, 3, 7, 6],
    // back
    [3, 0, 4, 7]
    // left
  ];
  return scene.addObject("polyhedron", { flavor: "cube", vertices, faces });
}
var init_cube = __esm({
  "src/stamps/geometry-3d/editor/tools/handlers/cube.ts"() {
    init_ensurePoint();
    init_constraintMath();
  }
});

// src/stamps/geometry-3d/editor/tools/handlers/sphere.ts
function buildSphere(args, scene) {
  if (args.length < 2 || !args[0].hit || !args[1].hit) return null;
  const center = ensurePoint(args[0].hit, scene);
  const surface = ensurePoint(args[1].hit, scene);
  if (!center || !surface || center === surface) return null;
  return scene.addObject("sphere", { center, surfacePoint: surface });
}
var init_sphere = __esm({
  "src/stamps/geometry-3d/editor/tools/handlers/sphere.ts"() {
    init_ensurePoint();
  }
});

// src/stamps/geometry-3d/editor/tools/handlers/cylinder.ts
function buildCylinder(args, scene) {
  const points = args.filter((a) => a.step.type === "point");
  const numberArg = args.find((a) => a.step.type === "number");
  if (points.length < 2 || !points[0].hit || !points[1].hit || !numberArg || typeof numberArg.value !== "number") return null;
  const radius = numberArg.value;
  if (radius <= 0) return null;
  const baseCenter = ensurePoint(points[0].hit, scene);
  const topCenter = ensurePoint(points[1].hit, scene);
  if (!baseCenter || !topCenter || baseCenter === topCenter) return null;
  return scene.addObject("cylinder", { baseCenter, topCenter, radius });
}
var init_cylinder = __esm({
  "src/stamps/geometry-3d/editor/tools/handlers/cylinder.ts"() {
    init_ensurePoint();
  }
});

// src/stamps/geometry-3d/editor/tools/handlers/cone.ts
function buildCone(args, scene) {
  const points = args.filter((a) => a.step.type === "point");
  const numberArg = args.find((a) => a.step.type === "number");
  if (points.length < 2 || !points[0].hit || !points[1].hit || !numberArg || typeof numberArg.value !== "number") return null;
  const radius = numberArg.value;
  if (radius <= 0) return null;
  const baseCenter = ensurePoint(points[0].hit, scene);
  const apex = ensurePoint(points[1].hit, scene);
  if (!baseCenter || !apex || baseCenter === apex) return null;
  return scene.addObject("cone", { baseCenter, apex, radius });
}
var init_cone = __esm({
  "src/stamps/geometry-3d/editor/tools/handlers/cone.ts"() {
    init_ensurePoint();
  }
});

// src/stamps/geometry-3d/editor/tools/spec.ts
var stubBuild, ALL_SURFACES, OBJECT_ONLY, NO_SURFACE, TOOLS2;
var init_spec = __esm({
  "src/stamps/geometry-3d/editor/tools/spec.ts"() {
    init_point();
    init_segment();
    init_polygon();
    init_plane();
    init_pyramid();
    init_prism();
    init_tetrahedron();
    init_cube();
    init_sphere();
    init_cylinder();
    init_cone();
    stubBuild = () => null;
    ALL_SURFACES = ["ground", "axis", "plane", "line", "polygon", "sphere"];
    OBJECT_ONLY = ["plane", "line", "polygon", "sphere"];
    NO_SURFACE = ["ground", "axis", "plane"];
    TOOLS2 = [
      {
        key: "move",
        label: "Di chuy\u1EC3n",
        hintIdle: "K\xE9o \u0111i\u1EC3m ho\u1EB7c xoay khung",
        steps: [],
        build: stubBuild
      },
      {
        key: "point",
        label: "\u0110i\u1EC3m",
        hintIdle: "Ch\u1ECDn m\u1EB7t ph\u1EB3ng / \u0111\u01B0\u1EDDng / m\u1EB7t c\u1EA7u \u0111\u1EC3 \u0111\u1EB7t \u0111i\u1EC3m",
        steps: [{ type: "point", allowExisting: false, allowNewOn: ALL_SURFACES, hint: "Ch\u1ECDn v\u1ECB tr\xED \u0111\u1EC3 \u0111\u1EB7t \u0111i\u1EC3m" }],
        build: buildPoint
      },
      {
        key: "pointOnObject",
        label: "\u0110i\u1EC3m tr\xEAn \u0111\u1ED1i t\u01B0\u1EE3ng",
        hintIdle: "Ch\u1ECDn m\u1ED9t \u0111\u1ED1i t\u01B0\u1EE3ng \u0111\u1EC3 \u0111\u1EB7t \u0111i\u1EC3m",
        steps: [{ type: "point", allowExisting: false, allowNewOn: OBJECT_ONLY, hint: "Click l\xEAn m\u1EB7t / \u0111\u01B0\u1EDDng \u0111\u1EC3 \u0111\u1EB7t \u0111i\u1EC3m" }],
        build: buildPointOnObject
      },
      {
        key: "segment",
        label: "\u0110o\u1EA1n th\u1EB3ng",
        hintIdle: "Ch\u1ECDn 2 \u0111i\u1EC3m \u0111\u1EC3 v\u1EBD \u0111o\u1EA1n th\u1EB3ng",
        steps: [
          { type: "point", allowExisting: true, allowNewOn: ALL_SURFACES, hint: "Ch\u1ECDn \u0111i\u1EC3m th\u1EE9 nh\u1EA5t" },
          { type: "point", allowExisting: true, allowNewOn: ALL_SURFACES, hint: "Ch\u1ECDn \u0111i\u1EC3m th\u1EE9 hai" }
        ],
        build: buildSegment
      },
      {
        key: "line",
        label: "\u0110\u01B0\u1EDDng th\u1EB3ng",
        hintIdle: "Ch\u1ECDn 2 \u0111i\u1EC3m \u0111\u1EC3 v\u1EBD \u0111\u01B0\u1EDDng th\u1EB3ng",
        steps: [
          { type: "point", allowExisting: true, allowNewOn: ALL_SURFACES, hint: "Ch\u1ECDn \u0111i\u1EC3m th\u1EE9 nh\u1EA5t" },
          { type: "point", allowExisting: true, allowNewOn: ALL_SURFACES, hint: "Ch\u1ECDn \u0111i\u1EC3m th\u1EE9 hai" }
        ],
        build: buildLine
      },
      {
        key: "ray",
        label: "Tia",
        hintIdle: "Ch\u1ECDn \u0111i\u1EC3m g\u1ED1c r\u1ED3i \u0111i\u1EC3m tr\xEAn tia",
        steps: [
          { type: "point", allowExisting: true, allowNewOn: ALL_SURFACES, hint: "Ch\u1ECDn \u0111i\u1EC3m g\u1ED1c" },
          { type: "point", allowExisting: true, allowNewOn: ALL_SURFACES, hint: "Ch\u1ECDn \u0111i\u1EC3m tr\xEAn tia" }
        ],
        build: buildRay
      },
      {
        key: "vector",
        label: "Vector",
        hintIdle: "Ch\u1ECDn 2 \u0111i\u1EC3m \u0111\u1EC3 v\u1EBD vector",
        steps: [
          { type: "point", allowExisting: true, allowNewOn: ALL_SURFACES, hint: "Ch\u1ECDn \u0111i\u1EC3m \u0111\u1EA7u" },
          { type: "point", allowExisting: true, allowNewOn: ALL_SURFACES, hint: "Ch\u1ECDn \u0111i\u1EC3m cu\u1ED1i" }
        ],
        build: buildVector
      },
      {
        key: "polygon",
        label: "\u0110a gi\xE1c",
        hintIdle: "Ch\u1ECDn c\xE1c \u0111\u1EC9nh; click \u0111i\u1EC3m \u0111\u1EA7u \u0111\u1EC3 \u0111\xF3ng",
        steps: [
          { type: "point", allowExisting: true, allowNewOn: ALL_SURFACES, hint: "Ch\u1ECDn \u0111\u1EC9nh th\u1EE9 1" },
          { type: "point", allowExisting: true, allowNewOn: ALL_SURFACES, hint: "Ch\u1ECDn \u0111\u1EC9nh th\u1EE9 2" },
          { type: "point", allowExisting: true, allowNewOn: ALL_SURFACES, hint: "Ch\u1ECDn \u0111\u1EC9nh th\u1EE9 3" },
          { type: "closingPoint", hint: "Click \u0111i\u1EC3m \u0111\u1EA7u \u0111\u1EC3 \u0111\xF3ng (ho\u1EB7c ch\u1ECDn th\xEAm \u0111\u1EC9nh)" }
        ],
        build: buildPolygon
      },
      {
        key: "plane",
        label: "M\u1EB7t ph\u1EB3ng (3 \u0111i\u1EC3m)",
        hintIdle: "Ch\u1ECDn 3 \u0111i\u1EC3m \u0111\u1EC3 x\xE1c \u0111\u1ECBnh m\u1EB7t ph\u1EB3ng",
        steps: [
          { type: "point", allowExisting: true, allowNewOn: ALL_SURFACES, hint: "Ch\u1ECDn \u0111i\u1EC3m th\u1EE9 1 c\u1EE7a m\u1EB7t ph\u1EB3ng" },
          { type: "point", allowExisting: true, allowNewOn: ALL_SURFACES, hint: "Ch\u1ECDn \u0111i\u1EC3m th\u1EE9 2" },
          { type: "point", allowExisting: true, allowNewOn: ALL_SURFACES, hint: "Ch\u1ECDn \u0111i\u1EC3m th\u1EE9 3" }
        ],
        build: buildPlane
      },
      {
        key: "pyramid",
        label: "H\xECnh ch\xF3p",
        hintIdle: "Ch\u1ECDn \u0111\xE1y \u0111a gi\xE1c r\u1ED3i ch\u1ECDn \u0111\u1EC9nh ch\xF3p",
        steps: [
          { type: "point", allowExisting: true, allowNewOn: NO_SURFACE, hint: "Ch\u1ECDn \u0111\u1EC9nh \u0111\xE1y 1" },
          { type: "point", allowExisting: true, allowNewOn: NO_SURFACE, hint: "Ch\u1ECDn \u0111\u1EC9nh \u0111\xE1y 2" },
          { type: "point", allowExisting: true, allowNewOn: NO_SURFACE, hint: "Ch\u1ECDn \u0111\u1EC9nh \u0111\xE1y 3" },
          { type: "closingPoint", hint: "Click \u0111\u1EC9nh \u0111\xE1y \u0111\u1EA7u ti\xEAn \u0111\u1EC3 \u0111\xF3ng (ho\u1EB7c ch\u1ECDn th\xEAm \u0111\u1EC9nh)" },
          { type: "point", allowExisting: true, allowNewOn: ALL_SURFACES, hint: "Ch\u1ECDn \u0111\u1EC9nh ch\xF3p" }
        ],
        build: buildPyramid
      },
      {
        key: "prism",
        label: "L\u0103ng tr\u1EE5",
        hintIdle: "Ch\u1ECDn \u0111\xE1y \u0111a gi\xE1c r\u1ED3i nh\u1EADp chi\u1EC1u cao",
        steps: [
          { type: "point", allowExisting: true, allowNewOn: NO_SURFACE, hint: "Ch\u1ECDn \u0111\u1EC9nh \u0111\xE1y 1" },
          { type: "point", allowExisting: true, allowNewOn: NO_SURFACE, hint: "Ch\u1ECDn \u0111\u1EC9nh \u0111\xE1y 2" },
          { type: "point", allowExisting: true, allowNewOn: NO_SURFACE, hint: "Ch\u1ECDn \u0111\u1EC9nh \u0111\xE1y 3" },
          { type: "closingPoint", hint: "Click \u0111\u1EC9nh \u0111\u1EA7u \u0111\u1EC3 \u0111\xF3ng \u0111\xE1y" },
          { type: "number", prompt: "Chi\u1EC1u cao (theo tr\u1EE5c z)", min: 1e-4 }
        ],
        build: buildPrism
      },
      {
        key: "tetrahedron",
        label: "T\u1EE9 di\u1EC7n \u0111\u1EC1u",
        hintIdle: "Ch\u1ECDn 2 \u0111i\u1EC3m x\xE1c \u0111\u1ECBnh c\u1EA1nh c\u1EE7a t\u1EE9 di\u1EC7n",
        steps: [
          { type: "point", allowExisting: true, allowNewOn: NO_SURFACE, hint: "Ch\u1ECDn \u0111i\u1EC3m 1" },
          { type: "point", allowExisting: true, allowNewOn: NO_SURFACE, hint: "Ch\u1ECDn \u0111i\u1EC3m 2" }
        ],
        build: buildTetrahedron
      },
      {
        key: "cube",
        label: "L\u1EADp ph\u01B0\u01A1ng",
        hintIdle: "Ch\u1ECDn 2 \u0111i\u1EC3m tr\xEAn n\u1EC1n x\xE1c \u0111\u1ECBnh c\u1EA1nh",
        steps: [
          { type: "point", allowExisting: true, allowNewOn: ["ground"], hint: "Ch\u1ECDn \u0111i\u1EC3m 1 (tr\xEAn n\u1EC1n)" },
          { type: "point", allowExisting: true, allowNewOn: ["ground"], hint: "Ch\u1ECDn \u0111i\u1EC3m 2 (tr\xEAn n\u1EC1n)" }
        ],
        build: buildCube
      },
      {
        key: "sphere",
        label: "M\u1EB7t c\u1EA7u",
        hintIdle: "Ch\u1ECDn t\xE2m r\u1ED3i \u0111i\u1EC3m tr\xEAn m\u1EB7t c\u1EA7u",
        steps: [
          { type: "point", allowExisting: true, allowNewOn: NO_SURFACE, hint: "Ch\u1ECDn t\xE2m m\u1EB7t c\u1EA7u" },
          { type: "point", allowExisting: true, allowNewOn: ALL_SURFACES, hint: "Ch\u1ECDn \u0111i\u1EC3m tr\xEAn m\u1EB7t c\u1EA7u" }
        ],
        build: buildSphere
      },
      {
        key: "cylinder",
        label: "H\xECnh tr\u1EE5",
        hintIdle: "Ch\u1ECDn t\xE2m \u0111\xE1y, t\xE2m tr\xEAn, r\u1ED3i nh\u1EADp b\xE1n k\xEDnh",
        steps: [
          { type: "point", allowExisting: true, allowNewOn: NO_SURFACE, hint: "Ch\u1ECDn t\xE2m \u0111\xE1y" },
          { type: "point", allowExisting: true, allowNewOn: NO_SURFACE, hint: "Ch\u1ECDn t\xE2m tr\xEAn" },
          { type: "number", prompt: "B\xE1n k\xEDnh", min: 1e-4 }
        ],
        build: buildCylinder
      },
      {
        key: "cone",
        label: "H\xECnh n\xF3n",
        hintIdle: "Ch\u1ECDn t\xE2m \u0111\xE1y, \u0111\u1EC9nh, r\u1ED3i nh\u1EADp b\xE1n k\xEDnh",
        steps: [
          { type: "point", allowExisting: true, allowNewOn: NO_SURFACE, hint: "Ch\u1ECDn t\xE2m \u0111\xE1y" },
          { type: "point", allowExisting: true, allowNewOn: NO_SURFACE, hint: "Ch\u1ECDn \u0111\u1EC9nh" },
          { type: "number", prompt: "B\xE1n k\xEDnh", min: 1e-4 }
        ],
        build: buildCone
      }
    ];
  }
});

// src/stamps/geometry-3d/editor/tools/controller.ts
function stepHint(step) {
  return step.type === "number" ? step.prompt : step.hint;
}
var ToolController;
var init_controller = __esm({
  "src/stamps/geometry-3d/editor/tools/controller.ts"() {
    init_spec();
    ToolController = class {
      constructor(scene) {
        this.scene = scene;
        this.state = { tool: null, stepIndex: 0, collected: [], hint: "" };
        this.listeners = /* @__PURE__ */ new Set();
        this.selectTool("move");
      }
      getState() {
        return this.state;
      }
      on(cb) {
        this.listeners.add(cb);
        return () => {
          this.listeners.delete(cb);
        };
      }
      selectTool(key) {
        const tool = TOOLS2.find((t) => t.key === key) ?? TOOLS2.find((t) => t.key === "move");
        const firstStep = tool.steps[0];
        this.state = {
          tool,
          stepIndex: 0,
          collected: [],
          hint: firstStep ? stepHint(firstStep) : tool.hintIdle
        };
        this.notify();
      }
      cancel() {
        this.selectTool("move");
      }
      consumeHit(hit) {
        const tool = this.state.tool;
        if (!tool) return false;
        const step = tool.steps[this.state.stepIndex];
        if (!step) return false;
        if (step.type === "closingPoint") {
          if (hit.kind === "empty") return false;
          if (hit.kind === "existingPoint") {
            this.state.collected.push({ step, hit });
            this.state.stepIndex++;
            this.advance();
            return true;
          }
          const prevStep = tool.steps[this.state.stepIndex - 1];
          if (!prevStep || prevStep.type !== "point") return false;
          if (!this.hitMatchesStep(hit, prevStep)) return false;
          this.state.collected.push({ step: prevStep, hit });
          this.notify();
          return true;
        }
        if (!this.hitMatchesStep(hit, step)) return false;
        this.state.collected.push({ step, hit });
        this.state.stepIndex++;
        this.advance();
        return true;
      }
      consumeNumber(value) {
        const tool = this.state.tool;
        if (!tool) return false;
        const step = tool.steps[this.state.stepIndex];
        if (!step || step.type !== "number") return false;
        if (step.min != null && value < step.min) return false;
        if (step.max != null && value > step.max) return false;
        this.state.collected.push({ step, value });
        this.state.stepIndex++;
        this.advance();
        return true;
      }
      hitMatchesStep(hit, step) {
        if (step.type !== "point" && step.type !== "closingPoint") return false;
        if (hit.kind === "empty") return false;
        if (step.type === "closingPoint") return hit.kind === "existingPoint";
        if (hit.kind === "existingPoint") return step.allowExisting;
        const surfaceMap = {
          onGround: "ground",
          onAxis: "axis",
          onPlane: "plane",
          onLine: "line",
          onPolygon: "polygon",
          onSphere: "sphere"
        };
        const k = surfaceMap[hit.kind];
        return k != null && step.type === "point" && step.allowNewOn.includes(k);
      }
      advance() {
        const tool = this.state.tool;
        if (this.state.stepIndex >= tool.steps.length) {
          tool.build(this.state.collected, this.scene);
          this.selectTool("move");
          return;
        }
        this.state.hint = stepHint(tool.steps[this.state.stepIndex]);
        this.notify();
      }
      notify() {
        for (const cb of this.listeners) cb(this.state);
      }
    };
  }
});

// src/stamps/geometry-3d/editor/renderer/faceted.ts
function cylinderFaces(center, top, radius) {
  const baseRing = [];
  const topRing = [];
  for (let i = 0; i < CURVED_SEGMENTS; i++) {
    const theta = i / CURVED_SEGMENTS * Math.PI * 2;
    const dx = radius * Math.cos(theta);
    const dy = radius * Math.sin(theta);
    baseRing.push([center[0] + dx, center[1] + dy, center[2]]);
    topRing.push([top[0] + dx, top[1] + dy, top[2]]);
  }
  const vertices = [...baseRing, ...topRing];
  const faces = [];
  faces.push(baseRing.map((_, i) => i));
  faces.push(topRing.map((_, i) => CURVED_SEGMENTS + i));
  for (let i = 0; i < CURVED_SEGMENTS; i++) {
    const next = (i + 1) % CURVED_SEGMENTS;
    faces.push([i, next, CURVED_SEGMENTS + next, CURVED_SEGMENTS + i]);
  }
  return { vertices, faces };
}
function coneFaces(baseCenter, apex, radius) {
  const baseRing = [];
  for (let i = 0; i < CURVED_SEGMENTS; i++) {
    const theta = i / CURVED_SEGMENTS * Math.PI * 2;
    baseRing.push([
      baseCenter[0] + radius * Math.cos(theta),
      baseCenter[1] + radius * Math.sin(theta),
      baseCenter[2]
    ]);
  }
  const apexIdx = baseRing.length;
  const vertices = [...baseRing, apex];
  const faces = [baseRing.map((_, i) => i)];
  for (let i = 0; i < CURVED_SEGMENTS; i++) {
    faces.push([i, (i + 1) % CURVED_SEGMENTS, apexIdx]);
  }
  return { vertices, faces };
}
var CURVED_SEGMENTS;
var init_faceted = __esm({
  "src/stamps/geometry-3d/editor/renderer/faceted.ts"() {
    CURVED_SEGMENTS = 16;
  }
});

// src/stamps/geometry-3d/editor/renderer/JxgRenderer.ts
var JxgRenderer;
var init_JxgRenderer = __esm({
  "src/stamps/geometry-3d/editor/renderer/JxgRenderer.ts"() {
    init_constraintMath();
    init_faceted();
    JxgRenderer = class {
      constructor(scene, view) {
        this.scene = scene;
        this.view = view;
        this.map = /* @__PURE__ */ new Map();
        this.unsubAdd = scene.on("add", (o) => this.handleAdd(o));
        this.unsubChange = scene.on("change", (o) => this.handleChange(o));
        this.unsubDelete = scene.on("delete", (id) => this.handleDelete(id));
        for (const obj of scene.list()) this.handleAdd(obj);
      }
      dispose() {
        this.unsubAdd();
        this.unsubChange();
        this.unsubDelete();
        for (const [id, j] of this.map) {
          try {
            j.remove?.();
          } catch {
          }
          this.map.delete(id);
        }
      }
      handleAdd(obj) {
        if (this.map.has(obj.id)) return;
        if (obj.kind === "point") {
          const world = constraintToWorld(obj.constraint, this.scene);
          const attrs = { id: obj.id, name: obj.label, size: 4, visible: obj.visible };
          const jxg = this.view.create("point3d", world, attrs);
          this.map.set(obj.id, jxg);
          this.attachDragHook(obj.id, jxg);
          return;
        }
        if (obj.kind === "segment") {
          const a = this.map.get(obj.p1);
          const b = this.map.get(obj.p2);
          const attrs = {
            id: obj.id,
            straightFirst: false,
            straightLast: false,
            visible: obj.visible,
            strokeColor: obj.color ?? "#0066cc",
            strokeWidth: 2
          };
          this.map.set(obj.id, this.view.create("line3d", [a, b], attrs));
          return;
        }
        if (obj.kind === "line") {
          const attrs = {
            id: obj.id,
            visible: obj.visible,
            strokeColor: obj.color ?? "#0066cc",
            strokeWidth: 2
          };
          this.map.set(
            obj.id,
            this.view.create("line3d", [this.map.get(obj.p1), this.map.get(obj.p2)], attrs)
          );
          return;
        }
        if (obj.kind === "ray") {
          const attrs = { id: obj.id, straightFirst: false, visible: obj.visible };
          this.map.set(
            obj.id,
            this.view.create("line3d", [this.map.get(obj.origin), this.map.get(obj.through)], attrs)
          );
          return;
        }
        if (obj.kind === "vector") {
          const attrs = {
            id: obj.id,
            lastArrow: true,
            straightFirst: false,
            straightLast: false,
            visible: obj.visible
          };
          this.map.set(
            obj.id,
            this.view.create("line3d", [this.map.get(obj.from), this.map.get(obj.to)], attrs)
          );
          return;
        }
        if (obj.kind === "plane") {
          const attrs = { id: obj.id, fillOpacity: 0.2, visible: obj.visible };
          this.map.set(
            obj.id,
            this.view.create(
              "plane3d",
              [this.map.get(obj.p1), this.map.get(obj.p2), this.map.get(obj.p3)],
              attrs
            )
          );
          return;
        }
        if (obj.kind === "polygon") {
          const refs = obj.vertices.map((v) => this.map.get(v));
          const attrs = { id: obj.id, fillOpacity: 0.3, visible: obj.visible };
          this.map.set(obj.id, this.view.create("polygon3d", [refs], attrs));
          return;
        }
        if (obj.kind === "sphere") {
          const attrs = { id: obj.id, fillOpacity: 0.25, visible: obj.visible };
          this.map.set(
            obj.id,
            this.view.create("sphere3d", [this.map.get(obj.center), this.map.get(obj.surfacePoint)], attrs)
          );
          return;
        }
        if (obj.kind === "polyhedron") {
          const verts = obj.vertices.map((id) => this.map.get(id));
          const faceJxgs = obj.faces.map(
            (face) => this.view.create("polygon3d", [face.map((idx) => verts[idx])], {
              id: `${obj.id}.face${face.join("-")}`,
              fillOpacity: 0.25,
              strokeColor: "#0066cc",
              strokeWidth: 1.5,
              visible: obj.visible
            })
          );
          this.map.set(obj.id, {
            _faces: faceJxgs,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            remove: () => faceJxgs.forEach((f) => f.remove?.())
          });
          return;
        }
        if (obj.kind === "cylinder" || obj.kind === "cone") {
          const baseCenterPt = this.scene.get(obj.baseCenter);
          if (!baseCenterPt || baseCenterPt.kind !== "point") return;
          const base = constraintToWorld(baseCenterPt.constraint, this.scene);
          let secondPt;
          if (obj.kind === "cylinder") {
            const topCenterPt = this.scene.get(obj.topCenter);
            if (!topCenterPt || topCenterPt.kind !== "point") return;
            secondPt = constraintToWorld(topCenterPt.constraint, this.scene);
          } else {
            const apexPt = this.scene.get(obj.apex);
            if (!apexPt || apexPt.kind !== "point") return;
            secondPt = constraintToWorld(apexPt.constraint, this.scene);
          }
          const geom = obj.kind === "cylinder" ? cylinderFaces(base, secondPt, obj.radius) : coneFaces(base, secondPt, obj.radius);
          const vertJxgs = geom.vertices.map(
            (v, i) => this.view.create("point3d", v, {
              id: `${obj.id}.v${i}`,
              visible: false,
              fixed: true,
              withLabel: false
            })
          );
          const faceJxgs = geom.faces.map(
            (face) => this.view.create("polygon3d", [face.map((idx) => vertJxgs[idx])], {
              id: `${obj.id}.face${face.join("-")}`,
              fillOpacity: 0.25,
              strokeColor: "#0066cc",
              strokeWidth: 1.5,
              visible: obj.visible
            })
          );
          this.map.set(obj.id, {
            _verts: vertJxgs,
            _faces: faceJxgs,
            remove: () => {
              faceJxgs.forEach((f) => f.remove?.());
              vertJxgs.forEach((v) => v.remove?.());
            }
          });
          return;
        }
      }
      attachDragHook(id, jxg) {
        if (typeof jxg.on !== "function") return;
        jxg.on("drag", () => {
          const obj = this.scene.get(id);
          if (!obj || obj.kind !== "point") return;
          const world = [jxg.X(), jxg.Y(), jxg.Z()];
          const updated = worldToConstraint(obj.constraint, world, this.scene);
          obj.constraint = updated;
          this.scene.emitChange(id);
        });
      }
      handleChange(obj) {
        const j = this.map.get(obj.id);
        if (!j) return;
        if (obj.kind === "point" && typeof j.moveTo === "function") {
          const w = constraintToWorld(obj.constraint, this.scene);
          j.moveTo([w[0], w[1], w[2]]);
        }
      }
      handleDelete(id) {
        const j = this.map.get(id);
        if (!j) return;
        try {
          j.remove?.();
        } catch {
        }
        this.map.delete(id);
      }
    };
  }
});

// src/stamps/geometry-3d/editor/hitTest/rayCast.ts
function screenToRay(screen, view) {
  const near = unproject(screen, view, 20);
  const far = unproject(screen, view, -20);
  const dir = [far[0] - near[0], far[1] - near[1], far[2] - near[2]];
  const n = Math.sqrt(dir[0] ** 2 + dir[1] ** 2 + dir[2] ** 2);
  const norm3 = n === 0 ? [0, 0, -1] : [dir[0] / n, dir[1] / n, dir[2] / n];
  return { origin: near, dir: norm3 };
}
function unproject(screen, view, depth) {
  if (typeof view.unprojectScreen === "function") {
    const v = view.unprojectScreen(screen.x, screen.y, depth);
    return [v[0], v[1], v[2]];
  }
  if (typeof view.project3DTo2D === "function") {
    const p0 = view.project3DTo2D(0, 0, 0);
    const px = view.project3DTo2D(1, 0, 0);
    const py = view.project3DTo2D(0, 1, 0);
    const pz = view.project3DTo2D(0, 0, 1);
    const ox = p0[1], oy = p0[2];
    const a = px[1] - ox, b = py[1] - ox, c = pz[1] - ox;
    const d = px[2] - oy, e = py[2] - oy, f = pz[2] - oy;
    const rhsX = screen.x - ox - c * depth;
    const rhsY = screen.y - oy - f * depth;
    const det = a * e - b * d;
    if (Math.abs(det) < 1e-9) return [0, 0, depth];
    const x = (e * rhsX - b * rhsY) / det;
    const y = (-d * rhsX + a * rhsY) / det;
    return [x, y, depth];
  }
  throw new Error("rayCast: view has neither unprojectScreen nor project3DTo2D");
}
var init_rayCast = __esm({
  "src/stamps/geometry-3d/editor/hitTest/rayCast.ts"() {
  }
});

// src/stamps/geometry-3d/editor/hitTest/intersect.ts
function dot2(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function sub2(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function add2(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}
function scale2(a, k) {
  return [a[0] * k, a[1] * k, a[2] * k];
}
function norm2(a) {
  return dot2(a, a);
}
function rayPlane(ray, plane) {
  const denom = dot2(ray.dir, plane.normal);
  if (Math.abs(denom) < EPS2) return null;
  const t = dot2(sub2(plane.point, ray.origin), plane.normal) / denom;
  if (t < 0) return null;
  return { point: add2(ray.origin, scale2(ray.dir, t)), t };
}
function rayGround(ray) {
  return rayPlane(ray, { point: [0, 0, 0], normal: [0, 0, 1] });
}
function raySphere(ray, sphere) {
  const oc = sub2(ray.origin, sphere.center);
  const b = dot2(oc, ray.dir);
  const c = dot2(oc, oc) - sphere.radius * sphere.radius;
  const disc = b * b - c;
  if (disc < 0) return null;
  const sqrtD = Math.sqrt(disc);
  const t1 = -b - sqrtD;
  const t2 = -b + sqrtD;
  const t = t1 >= 0 ? t1 : t2;
  if (t < 0) return null;
  return { point: add2(ray.origin, scale2(ray.dir, t)), t };
}
function rayLineSegment(ray, seg, maxDistance) {
  const u = ray.dir;
  const v = sub2(seg.b, seg.a);
  const w0 = sub2(ray.origin, seg.a);
  const a = dot2(u, u);
  const bb = dot2(u, v);
  const cc = dot2(v, v);
  const d = dot2(u, w0);
  const e = dot2(v, w0);
  const denom = a * cc - bb * bb;
  if (Math.abs(denom) < EPS2) return null;
  const sc = (bb * e - cc * d) / denom;
  const tc = (a * e - bb * d) / denom;
  if (sc < 0 || tc < 0 || tc > 1) return null;
  const pRay = add2(ray.origin, scale2(u, sc));
  const pSeg = add2(seg.a, scale2(v, tc));
  const dist2 = norm2(sub2(pRay, pSeg));
  if (dist2 > maxDistance * maxDistance) return null;
  return { point: pSeg, t: sc, tOnSegment: tc };
}
var EPS2;
var init_intersect = __esm({
  "src/stamps/geometry-3d/editor/hitTest/intersect.ts"() {
    EPS2 = 1e-9;
  }
});

// src/stamps/geometry-3d/editor/hitTest/snapping.ts
function findSnapPoint(screen, view, scene, pixelRadius = 8) {
  let best = null;
  const r2 = pixelRadius * pixelRadius;
  for (const obj of scene.list()) {
    if (obj.kind !== "point") continue;
    if (!obj.visible) continue;
    const world = constraintToWorld(obj.constraint, scene);
    const proj = view.project3DTo2D?.(world[0], world[1], world[2]);
    if (!proj) continue;
    const dx = proj[1] - screen.x;
    const dy = proj[2] - screen.y;
    const d2 = dx * dx + dy * dy;
    if (d2 <= r2 && (best === null || d2 < best.d2)) {
      best = { id: obj.id, d2 };
    }
  }
  return best?.id ?? null;
}
var init_snapping = __esm({
  "src/stamps/geometry-3d/editor/hitTest/snapping.ts"() {
    init_constraintMath();
  }
});

// src/stamps/geometry-3d/editor/hitTest/hitTest.ts
function hitTest(screen, view, scene) {
  const snap = findSnapPoint(screen, view, scene);
  if (snap) return { kind: "existingPoint", pointId: snap };
  const ray = screenToRay(screen, view);
  let bestSphere = null;
  for (const obj of scene.list()) {
    if (obj.kind !== "sphere" || !obj.visible) continue;
    const centerPoint = scene.get(obj.center);
    const surfacePoint = scene.get(obj.surfacePoint);
    if (!centerPoint || centerPoint.kind !== "point") continue;
    if (!surfacePoint || surfacePoint.kind !== "point") continue;
    const center = constraintToWorld(centerPoint.constraint, scene);
    const surface = constraintToWorld(surfacePoint.constraint, scene);
    const radius = Math.hypot(
      surface[0] - center[0],
      surface[1] - center[1],
      surface[2] - center[2]
    );
    const sh = raySphere(ray, { center, radius });
    if (sh && (bestSphere === null || sh.t < bestSphere.t)) {
      bestSphere = { id: obj.id, t: sh.t, world: sh.point };
    }
  }
  if (view.project3DTo2D) {
    const axes = [
      { axis: "x", a: [-10, 0, 0], b: [10, 0, 0] },
      { axis: "y", a: [0, -10, 0], b: [0, 10, 0] },
      { axis: "z", a: [0, 0, -10], b: [0, 0, 10] }
    ];
    for (const ax of axes) {
      const pa = view.project3DTo2D(ax.a[0], ax.a[1], ax.a[2]);
      const pb = view.project3DTo2D(ax.b[0], ax.b[1], ax.b[2]);
      const d = distScreenPointToSegment(screen, [pa[1], pa[2]], [pb[1], pb[2]]);
      if (d <= AXIS_PIXEL_THRESHOLD) {
        const hit = rayLineSegment(ray, { a: ax.a, b: ax.b }, 1e3);
        if (hit) {
          const t = ax.axis === "x" ? hit.point[0] : ax.axis === "y" ? hit.point[1] : hit.point[2];
          return { kind: "onAxis", axis: ax.axis, t, world: hit.point };
        }
      }
    }
  }
  let bestPlane = null;
  for (const obj of scene.list()) {
    if (obj.kind !== "plane" || !obj.visible) continue;
    const basis = planeBasis(obj, scene);
    if (!basis) continue;
    const ph = rayPlane(ray, { point: basis.origin, normal: basis.normal });
    if (ph && (bestPlane === null || ph.t < bestPlane.t)) {
      bestPlane = { id: obj.id, t: ph.t, world: ph.point, basis };
    }
  }
  if (bestPlane && (!bestSphere || bestPlane.t < bestSphere.t)) {
    const rel = [
      bestPlane.world[0] - bestPlane.basis.origin[0],
      bestPlane.world[1] - bestPlane.basis.origin[1],
      bestPlane.world[2] - bestPlane.basis.origin[2]
    ];
    const b1n = dot3(bestPlane.basis.basis1, bestPlane.basis.basis1);
    const b2n = dot3(bestPlane.basis.basis2, bestPlane.basis.basis2);
    const u = b1n === 0 ? 0 : dot3(rel, bestPlane.basis.basis1) / b1n;
    const v = b2n === 0 ? 0 : dot3(rel, bestPlane.basis.basis2) / b2n;
    return { kind: "onPlane", planeId: bestPlane.id, u, v, world: bestPlane.world };
  }
  if (bestSphere) {
    const sph = scene.get(bestSphere.id);
    if (sph && sph.kind === "sphere") {
      const centerPt = scene.get(sph.center);
      if (centerPt && centerPt.kind === "point") {
        const center = constraintToWorld(centerPt.constraint, scene);
        const relX = bestSphere.world[0] - center[0];
        const relY = bestSphere.world[1] - center[1];
        const relZ = bestSphere.world[2] - center[2];
        const r = Math.hypot(relX, relY, relZ);
        const phi = r === 0 ? 0 : Math.acos(relZ / r);
        const theta = Math.atan2(relY, relX);
        return { kind: "onSphere", sphereId: bestSphere.id, theta, phi, world: bestSphere.world };
      }
    }
  }
  const g = rayGround(ray);
  if (g) return { kind: "onGround", world: g.point };
  return { kind: "empty" };
}
function distScreenPointToSegment(p, a, b) {
  const vx = b[0] - a[0];
  const vy = b[1] - a[1];
  const wx = p.x - a[0];
  const wy = p.y - a[1];
  const c1 = vx * wx + vy * wy;
  if (c1 <= 0) return Math.hypot(wx, wy);
  const c2 = vx * vx + vy * vy;
  if (c2 <= c1) return Math.hypot(p.x - b[0], p.y - b[1]);
  const t = c1 / c2;
  const px = a[0] + t * vx;
  const py = a[1] + t * vy;
  return Math.hypot(p.x - px, p.y - py);
}
function planeBasis(planeObj, scene) {
  const p1Obj = scene.get(planeObj.p1);
  const p2Obj = scene.get(planeObj.p2);
  const p3Obj = scene.get(planeObj.p3);
  if (!p1Obj || p1Obj.kind !== "point") return null;
  if (!p2Obj || p2Obj.kind !== "point") return null;
  if (!p3Obj || p3Obj.kind !== "point") return null;
  const p1 = constraintToWorld(p1Obj.constraint, scene);
  const p2 = constraintToWorld(p2Obj.constraint, scene);
  const p3 = constraintToWorld(p3Obj.constraint, scene);
  const basis1 = [p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]];
  const tmp = [p3[0] - p1[0], p3[1] - p1[1], p3[2] - p1[2]];
  const cx = basis1[1] * tmp[2] - basis1[2] * tmp[1];
  const cy = basis1[2] * tmp[0] - basis1[0] * tmp[2];
  const cz = basis1[0] * tmp[1] - basis1[1] * tmp[0];
  const cLen = Math.hypot(cx, cy, cz);
  if (cLen === 0) return null;
  const normal = [cx / cLen, cy / cLen, cz / cLen];
  const basis2 = [
    normal[1] * basis1[2] - normal[2] * basis1[1],
    normal[2] * basis1[0] - normal[0] * basis1[2],
    normal[0] * basis1[1] - normal[1] * basis1[0]
  ];
  return { origin: p1, basis1, basis2, normal };
}
function dot3(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
var AXIS_PIXEL_THRESHOLD;
var init_hitTest = __esm({
  "src/stamps/geometry-3d/editor/hitTest/hitTest.ts"() {
    init_rayCast();
    init_intersect();
    init_snapping();
    init_constraintMath();
    AXIS_PIXEL_THRESHOLD = 12;
  }
});
function ToolButton(props) {
  const {
    toolKey,
    label,
    selected,
    onClick,
    icon,
    chordNum,
    chordActiveGroup,
    onMouseEnter,
    onMouseLeave
  } = props;
  return /* @__PURE__ */ jsxRuntime.jsxs(
    "button",
    {
      type: "button",
      "data-tool-key": toolKey,
      "data-testid": `tool-${toolKey}`,
      "aria-label": label,
      "aria-pressed": selected,
      onClick: () => onClick(toolKey),
      onMouseEnter,
      onMouseLeave,
      className: [
        "relative flex aspect-square items-center justify-center rounded-md transition",
        selected ? "bg-emerald-600 text-white shadow-sm" : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
      ].join(" "),
      children: [
        /* @__PURE__ */ jsxRuntime.jsx("span", { "aria-hidden": true, className: "inline-flex", children: icon ?? null }),
        chordNum != null && /* @__PURE__ */ jsxRuntime.jsx(
          "span",
          {
            "data-testid": `chord-num-${toolKey}`,
            className: [
              "pointer-events-none absolute bottom-0 right-0.5 font-mono text-[9px] leading-none transition",
              selected ? "text-white/70" : chordActiveGroup ? "text-emerald-700" : "text-slate-300"
            ].join(" "),
            children: chordNum
          }
        )
      ]
    }
  );
}
var init_ToolButton = __esm({
  "src/stamps/geometry-3d/editor/toolPanel/ToolButton.tsx"() {
    "use client";
  }
});
var wrap, dot4, ToolIcons;
var init_icons = __esm({
  "src/stamps/geometry-3d/editor/toolPanel/icons.tsx"() {
    wrap = (children) => /* @__PURE__ */ jsxRuntime.jsx(
      "svg",
      {
        width: "18",
        height: "18",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "1.6",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        "aria-hidden": "true",
        children
      }
    );
    dot4 = (cx, cy, r = 1.4) => /* @__PURE__ */ jsxRuntime.jsx("circle", { cx, cy, r, fill: "currentColor", stroke: "none" });
    ToolIcons = {
      move: wrap(
        /* @__PURE__ */ jsxRuntime.jsx(jsxRuntime.Fragment, { children: /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M5 4 L5 14 L8 11 L10 16 L13 15 L11 10 L15 10 Z" }) })
      ),
      point: wrap(
        /* @__PURE__ */ jsxRuntime.jsx(jsxRuntime.Fragment, { children: /* @__PURE__ */ jsxRuntime.jsx("circle", { cx: "12", cy: "12", r: "2.4", fill: "currentColor", stroke: "none" }) })
      ),
      pointOnObject: wrap(
        /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
          /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M3 16 L21 12" }),
          /* @__PURE__ */ jsxRuntime.jsx("circle", { cx: "12", cy: "13.5", r: "2.4", fill: "currentColor", stroke: "none" })
        ] })
      ),
      segment: wrap(
        /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
          /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "4", y1: "18", x2: "20", y2: "6" }),
          dot4(4, 18, 1.6),
          dot4(20, 6, 1.6)
        ] })
      ),
      line: wrap(
        /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
          /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "3", y1: "18", x2: "21", y2: "6" }),
          dot4(8, 14.5, 1.4),
          dot4(16, 9.5, 1.4)
        ] })
      ),
      ray: wrap(
        /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
          /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "5", y1: "18", x2: "19", y2: "7" }),
          /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M19 7 L15 6 M19 7 L18 11" }),
          dot4(5, 18, 1.6)
        ] })
      ),
      vector: wrap(
        /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
          /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "5", y1: "18", x2: "18", y2: "7" }),
          /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M18 7 L13 7 M18 7 L18 12" }),
          dot4(5, 18, 1.6)
        ] })
      ),
      polygon: wrap(
        /* @__PURE__ */ jsxRuntime.jsx(jsxRuntime.Fragment, { children: /* @__PURE__ */ jsxRuntime.jsx("polygon", { points: "12,4 20,10 17,19 7,19 4,10" }) })
      ),
      plane: wrap(
        /* @__PURE__ */ jsxRuntime.jsx(jsxRuntime.Fragment, { children: /* @__PURE__ */ jsxRuntime.jsx("polygon", { points: "3,9 14,5 21,11 10,15" }) })
      ),
      pyramid: wrap(
        /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
          /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M4 19 L20 19 L12 4 Z" }),
          /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M4 19 L12 16 L20 19" }),
          /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M12 4 L12 16", strokeDasharray: "2 2" })
        ] })
      ),
      prism: wrap(
        /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
          /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M4 8 L4 19 L14 19 L14 8 Z" }),
          /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M4 8 L10 4 L20 4 L14 8" }),
          /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M14 8 L14 19 L20 15 L20 4" }),
          /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M4 8 L14 8" })
        ] })
      ),
      tetrahedron: wrap(
        /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
          /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M4 19 L20 19 L12 5 Z" }),
          /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M4 19 L15 12 L20 19" }),
          /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M15 12 L12 5" })
        ] })
      ),
      cube: wrap(
        /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
          /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M4 8 L4 19 L14 19 L14 8 Z" }),
          /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M4 8 L10 4 L20 4 L14 8" }),
          /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M14 8 L14 19 L20 15 L20 4" })
        ] })
      ),
      sphere: wrap(
        /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
          /* @__PURE__ */ jsxRuntime.jsx("circle", { cx: "12", cy: "12", r: "8" }),
          /* @__PURE__ */ jsxRuntime.jsx("ellipse", { cx: "12", cy: "12", rx: "8", ry: "3" }),
          dot4(12, 12, 1.2)
        ] })
      ),
      cylinder: wrap(
        /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
          /* @__PURE__ */ jsxRuntime.jsx("ellipse", { cx: "12", cy: "6", rx: "6", ry: "2" }),
          /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M6 6 L6 18" }),
          /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M18 6 L18 18" }),
          /* @__PURE__ */ jsxRuntime.jsx("ellipse", { cx: "12", cy: "18", rx: "6", ry: "2" })
        ] })
      ),
      cone: wrap(
        /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
          /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "5", y1: "18", x2: "12", y2: "4" }),
          /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "19", y1: "18", x2: "12", y2: "4" }),
          /* @__PURE__ */ jsxRuntime.jsx("ellipse", { cx: "12", cy: "18", rx: "7", ry: "2" })
        ] })
      )
    };
  }
});

// src/stamps/geometry-3d/editor/toolPanel/groups.ts
function letterForGroup2(g) {
  const idx = GROUP_ORDER2.indexOf(g);
  return idx >= 0 ? String.fromCharCode(A_CODE3 + idx) : "";
}
var GROUP_ORDER2, GROUP_LABELS2, TOOLS_BY_GROUP, SPEC_BY_KEY, TOOLS_FLAT, A_CODE3;
var init_groups = __esm({
  "src/stamps/geometry-3d/editor/toolPanel/groups.ts"() {
    init_spec();
    GROUP_ORDER2 = [
      "basic",
      "point",
      "line",
      "plane",
      "polyhedron",
      "curve"
    ];
    GROUP_LABELS2 = {
      basic: "C\u01A1 b\u1EA3n",
      point: "\u0110i\u1EC3m",
      line: "\u0110\u01B0\u1EDDng th\u1EB3ng",
      plane: "M\u1EB7t ph\u1EB3ng",
      polyhedron: "Kh\u1ED1i \u0111a di\u1EC7n",
      curve: "Kh\u1ED1i cong"
    };
    TOOLS_BY_GROUP = {
      basic: ["move"],
      point: ["point", "pointOnObject"],
      line: ["segment", "line", "ray", "vector", "polygon"],
      plane: ["plane"],
      polyhedron: ["pyramid", "prism", "tetrahedron", "cube"],
      curve: ["sphere", "cylinder", "cone"]
    };
    SPEC_BY_KEY = TOOLS2.reduce(
      (acc, t) => {
        acc[t.key] = t;
        return acc;
      },
      {}
    );
    TOOLS_FLAT = GROUP_ORDER2.flatMap(
      (group) => TOOLS_BY_GROUP[group].map((key) => {
        const spec = SPEC_BY_KEY[key];
        return {
          key,
          label: spec?.label ?? key,
          hint: spec?.hintIdle ?? "",
          group
        };
      })
    );
    A_CODE3 = "A".charCodeAt(0);
  }
});
function ToolPalette(props) {
  const { selected, onSelect, chordGroup = null, onHoverTool } = props;
  return /* @__PURE__ */ jsxRuntime.jsx("div", { "data-testid": "tool-palette", className: "flex flex-col gap-3", children: GROUP_ORDER2.map((group) => {
    const keys = TOOLS_BY_GROUP[group];
    const isChordActive = chordGroup === group;
    const dimmed = chordGroup !== null && !isChordActive;
    return /* @__PURE__ */ jsxRuntime.jsxs(
      "section",
      {
        "data-chord-group": group,
        "data-chord-active": isChordActive ? "true" : "false",
        className: [
          "rounded-md transition",
          isChordActive ? "bg-emerald-50 ring-1 ring-emerald-400 p-1" : "p-0",
          dimmed ? "opacity-55" : "opacity-100"
        ].join(" "),
        children: [
          /* @__PURE__ */ jsxRuntime.jsxs("h4", { className: "mb-1.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-500", children: [
            /* @__PURE__ */ jsxRuntime.jsx("span", { children: GROUP_LABELS2[group] }),
            /* @__PURE__ */ jsxRuntime.jsx(
              "span",
              {
                "data-testid": `chord-letter-${group}`,
                className: [
                  "font-mono text-[10px] leading-none transition",
                  isChordActive ? "text-emerald-700 font-bold" : "text-slate-400"
                ].join(" "),
                children: letterForGroup2(group)
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntime.jsx("div", { className: "grid grid-cols-4 gap-1", children: keys.map((k, i) => {
            const tool = TOOLS2.find((t) => t.key === k);
            return /* @__PURE__ */ jsxRuntime.jsx(
              ToolButton,
              {
                toolKey: k,
                label: tool.label,
                selected: selected === k,
                onClick: onSelect,
                icon: ToolIcons[k],
                chordNum: i + 1,
                chordActiveGroup: isChordActive,
                onMouseEnter: (e) => onHoverTool?.({
                  label: tool.label,
                  hint: tool.hintIdle,
                  x: e.clientX,
                  y: e.clientY
                }),
                onMouseLeave: () => onHoverTool?.(null)
              },
              k
            );
          }) })
        ]
      },
      group
    );
  }) });
}
var init_ToolPalette = __esm({
  "src/stamps/geometry-3d/editor/toolPanel/ToolPalette.tsx"() {
    "use client";
    init_ToolButton();
    init_icons();
    init_groups();
    init_spec();
  }
});

// src/stamps/geometry-3d/editor/algebraPanel/symbolic.ts
function symbolicFor(obj, scene) {
  const n = (id) => scene.get(id)?.label ?? id;
  switch (obj.kind) {
    case "point": {
      const c = obj.constraint;
      switch (c.kind) {
        case "free":
          return "Point";
        case "onGround":
          return "Point(xyPlane)";
        case "onAxis":
          return `Point(${c.axis}Axis)`;
        case "onPlane":
          return `Point(${n(c.planeId)})`;
        case "onLine":
          return `Point(${n(c.lineId)})`;
        case "onPolygon":
          return `Point(${n(c.polygonId)})`;
        case "onSphere":
          return `Point(${n(c.sphereId)})`;
      }
      return "Point";
    }
    case "segment":
      return `Segment(${n(obj.p1)}, ${n(obj.p2)})`;
    case "line":
      return `Line(${n(obj.p1)}, ${n(obj.p2)})`;
    case "ray":
      return `Ray(${n(obj.origin)}, ${n(obj.through)})`;
    case "vector":
      return `Vector(${n(obj.from)}, ${n(obj.to)})`;
    case "polygon":
      return `Polygon(${obj.vertices.map(n).join(", ")})`;
    case "plane":
      return `Plane(${n(obj.p1)}, ${n(obj.p2)}, ${n(obj.p3)})`;
    case "sphere":
      return `Sphere(${n(obj.center)}, ${n(obj.surfacePoint)})`;
    case "polyhedron": {
      const flavorVn = {
        pyramid: "Ch\xF3p",
        prism: "L\u0103ng tr\u1EE5",
        tetrahedron: "T\u1EE9 di\u1EC7n",
        cube: "L\u1EADp ph\u01B0\u01A1ng"
      };
      return `${flavorVn[obj.flavor]}(${obj.vertices.length} \u0111\u1EC9nh)`;
    }
    case "cylinder":
      return `Cylinder(${n(obj.baseCenter)}, ${n(obj.topCenter)}, r=${obj.radius})`;
    case "cone":
      return `Cone(${n(obj.baseCenter)}, ${n(obj.apex)}, r=${obj.radius})`;
  }
}
function numericFor(obj, scene) {
  if (obj.kind === "point") {
    const w = constraintToWorld(obj.constraint, scene);
    return `(${round(w[0])}, ${round(w[1])}, ${round(w[2])})`;
  }
  return "";
}
function round(x) {
  return Math.abs(x) < 1e-9 ? "0" : (Math.round(x * 100) / 100).toString();
}
var init_symbolic = __esm({
  "src/stamps/geometry-3d/editor/algebraPanel/symbolic.ts"() {
    init_constraintMath();
  }
});
function RowMenu(props) {
  const [open, setOpen] = React11__namespace.useState(false);
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "relative inline-block", children: [
    /* @__PURE__ */ jsxRuntime.jsx(
      "button",
      {
        type: "button",
        "aria-label": "Row menu",
        onClick: () => setOpen((v) => !v),
        className: "rounded px-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800",
        children: "\u22EE"
      }
    ),
    open ? /* @__PURE__ */ jsxRuntime.jsxs(
      "div",
      {
        role: "menu",
        className: "absolute right-0 z-10 mt-1 w-40 rounded-md border border-zinc-200 bg-white py-1 text-xs shadow-lg dark:border-zinc-700 dark:bg-zinc-900",
        children: [
          /* @__PURE__ */ jsxRuntime.jsx(MenuItem, { onClick: () => {
            setOpen(false);
            props.onRename();
          }, children: "\u0110\u1ED5i t\xEAn" }),
          /* @__PURE__ */ jsxRuntime.jsx(MenuItem, { onClick: () => {
            setOpen(false);
            props.onChangeColor();
          }, children: "\u0110\u1ED5i m\xE0u" }),
          /* @__PURE__ */ jsxRuntime.jsx(MenuItem, { onClick: () => {
            setOpen(false);
            props.onToggleVisibility();
          }, children: props.visible ? "\u1EA8n" : "Hi\u1EC7n" }),
          /* @__PURE__ */ jsxRuntime.jsx(MenuItem, { onClick: () => {
            setOpen(false);
            props.onDelete();
          }, className: "text-red-600", children: "Xo\xE1" })
        ]
      }
    ) : null
  ] });
}
function MenuItem({ children, onClick, className }) {
  return /* @__PURE__ */ jsxRuntime.jsx(
    "button",
    {
      type: "button",
      role: "menuitem",
      onClick,
      className: `block w-full px-3 py-1 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 ${className ?? ""}`,
      children
    }
  );
}
var init_RowMenu = __esm({
  "src/stamps/geometry-3d/editor/algebraPanel/RowMenu.tsx"() {
    "use client";
  }
});
function AlgebraRow(props) {
  const { obj, scene, onDelete } = props;
  const symbolic = symbolicFor(obj, scene);
  const numeric = numericFor(obj, scene);
  return /* @__PURE__ */ jsxRuntime.jsxs(
    "li",
    {
      "data-testid": `algebra-row-${obj.id}`,
      className: "flex items-center gap-2 border-b border-zinc-100 px-3 py-1.5 text-xs dark:border-zinc-800",
      children: [
        /* @__PURE__ */ jsxRuntime.jsx(
          "span",
          {
            "aria-hidden": true,
            className: "inline-block size-3 rounded-full border",
            style: { backgroundColor: obj.color ?? "#0066cc" }
          }
        ),
        /* @__PURE__ */ jsxRuntime.jsx("span", { className: "min-w-[3ch] font-semibold", children: obj.label }),
        /* @__PURE__ */ jsxRuntime.jsx("span", { className: "text-zinc-500", children: "=" }),
        /* @__PURE__ */ jsxRuntime.jsx("span", { className: "flex-1 truncate font-mono", children: symbolic }),
        numeric ? /* @__PURE__ */ jsxRuntime.jsx("span", { className: "truncate text-zinc-500", children: numeric }) : null,
        /* @__PURE__ */ jsxRuntime.jsx(
          RowMenu,
          {
            visible: obj.visible,
            onRename: () => {
            },
            onChangeColor: () => {
            },
            onToggleVisibility: () => {
            },
            onDelete: () => onDelete(obj.id)
          }
        )
      ]
    }
  );
}
var init_AlgebraRow = __esm({
  "src/stamps/geometry-3d/editor/algebraPanel/AlgebraRow.tsx"() {
    "use client";
    init_symbolic();
    init_RowMenu();
  }
});
function AlgebraList(props) {
  const { scene } = props;
  const [, forceUpdate] = React11__namespace.useReducer((x) => x + 1, 0);
  React11__namespace.useEffect(() => {
    const unsubAdd = scene.on("add", () => forceUpdate());
    const unsubChange = scene.on("change", () => forceUpdate());
    const unsubDelete = scene.on("delete", () => forceUpdate());
    const unsubReset = scene.on("reset", () => forceUpdate());
    return () => {
      unsubAdd();
      unsubChange();
      unsubDelete();
      unsubReset();
    };
  }, [scene]);
  const objects = scene.list();
  return /* @__PURE__ */ jsxRuntime.jsx(
    "ul",
    {
      "data-testid": "algebra-list",
      className: "flex max-h-[calc(100vh-200px)] flex-col overflow-y-auto",
      children: objects.length === 0 ? /* @__PURE__ */ jsxRuntime.jsx("li", { className: "px-3 py-4 text-center text-xs text-zinc-500", children: "Ch\u01B0a c\xF3 \u0111\u1ED1i t\u01B0\u1EE3ng n\xE0o" }) : objects.map((o) => /* @__PURE__ */ jsxRuntime.jsx(AlgebraRow, { obj: o, scene, onDelete: (id) => scene.delete(id) }, o.id))
    }
  );
}
var init_AlgebraList = __esm({
  "src/stamps/geometry-3d/editor/algebraPanel/AlgebraList.tsx"() {
    "use client";
    init_AlgebraRow();
  }
});
function AxisIcon2() {
  return /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [
    /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "4", y1: "20", x2: "20", y2: "20" }),
    /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "4", y1: "20", x2: "4", y2: "4" }),
    /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "4", y1: "20", x2: "16", y2: "8" })
  ] });
}
function GridIcon2() {
  return /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [
    /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M4 8 L20 4" }),
    /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M4 14 L20 10" }),
    /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M4 20 L20 16" }),
    /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M4 8 L4 20" }),
    /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M12 6 L12 18" }),
    /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M20 4 L20 16" })
  ] });
}
function UndoIcon2() {
  return /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [
    /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M3 10 L8 5 L8 8 L15 8 A5 5 0 0 1 20 13 L20 16" }),
    /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M3 10 L8 15 L8 12" })
  ] });
}
function CloseIcon2() {
  return /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [
    /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" }),
    /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" })
  ] });
}
function Shell3({ title, icon, onClose, children, isDark }) {
  return /* @__PURE__ */ jsxRuntime.jsxs(
    "aside",
    {
      role: "complementary",
      "aria-label": title,
      "data-testid": "left-panel",
      "data-stamp-area": "true",
      className: [
        isDark ? "theme--dark " : "",
        "flex h-full w-60 flex-col border-r border-slate-200 bg-white"
      ].join(""),
      children: [
        /* @__PURE__ */ jsxRuntime.jsxs("header", { className: "flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-3 py-2", children: [
          /* @__PURE__ */ jsxRuntime.jsxs("h3", { className: "flex items-center gap-2 text-sm font-semibold text-slate-800", children: [
            /* @__PURE__ */ jsxRuntime.jsx("span", { className: "text-base leading-none", children: icon }),
            title
          ] }),
          /* @__PURE__ */ jsxRuntime.jsx(
            "button",
            {
              onClick: onClose,
              "aria-label": "\u0110\xF3ng",
              className: "rounded p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800",
              children: /* @__PURE__ */ jsxRuntime.jsx(CloseIcon2, {})
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntime.jsx("div", { className: "min-h-0 flex-1 overflow-y-auto p-3 space-y-3", children })
      ]
    }
  );
}
function Section3({ label, children }) {
  return /* @__PURE__ */ jsxRuntime.jsxs("section", { children: [
    /* @__PURE__ */ jsxRuntime.jsx("h4", { className: "mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500", children: label }),
    children
  ] });
}
function useToolHoverTooltip2() {
  const [hover, setHover] = React11__namespace.useState(null);
  const [portalReady, setPortalReady] = React11__namespace.useState(false);
  const hoverTimerRef = React11__namespace.useRef(null);
  React11__namespace.useEffect(() => {
    setPortalReady(true);
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);
  const showHover = React11__namespace.useCallback((next) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => setHover(next), TOOLTIP_DELAY_MS2);
  }, []);
  const hideHover = React11__namespace.useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setHover(null);
  }, []);
  return { hover, portalReady, showHover, hideHover };
}
function DesktopPanel(props) {
  const {
    scene,
    selectedTool,
    onSelectTool,
    showAxis,
    showGrid,
    onShowAxisChange,
    onShowGridChange,
    onUndo,
    canUndo,
    onClose,
    isDark,
    chordGroup
  } = props;
  const [tab, setTab] = React11__namespace.useState("tools");
  const { hover, portalReady, showHover, hideHover } = useToolHoverTooltip2();
  return /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
    /* @__PURE__ */ jsxRuntime.jsxs(Shell3, { title: "H\xECnh h\u1ECDc 3D", icon: Geom3DIconHeader, onClose, isDark, children: [
      /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "flex gap-1 rounded-md bg-slate-100 p-0.5", children: [
        /* @__PURE__ */ jsxRuntime.jsx(TabPill, { active: tab === "tools", onClick: () => setTab("tools"), testId: "tab-tools", children: "\u{1F9F0} C\xF4ng c\u1EE5" }),
        /* @__PURE__ */ jsxRuntime.jsx(TabPill, { active: tab === "algebra", onClick: () => setTab("algebra"), testId: "tab-algebra", children: "\u{1F4D0} \u0110\u1ED1i t\u01B0\u1EE3ng" })
      ] }),
      tab === "tools" ? /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
        /* @__PURE__ */ jsxRuntime.jsx(Section3, { label: "G\xF3c nh\xECn", children: /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "flex items-center gap-3 text-[11px] text-slate-700", children: [
          /* @__PURE__ */ jsxRuntime.jsxs("label", { className: "inline-flex select-none items-center gap-1.5", children: [
            /* @__PURE__ */ jsxRuntime.jsx(
              "input",
              {
                type: "checkbox",
                checked: showAxis,
                onChange: (e) => onShowAxisChange(e.target.checked),
                "data-testid": "toggle-axis"
              }
            ),
            "Tr\u1EE5c"
          ] }),
          /* @__PURE__ */ jsxRuntime.jsxs("label", { className: "inline-flex select-none items-center gap-1.5", children: [
            /* @__PURE__ */ jsxRuntime.jsx(
              "input",
              {
                type: "checkbox",
                checked: showGrid,
                onChange: (e) => onShowGridChange(e.target.checked),
                "data-testid": "toggle-grid"
              }
            ),
            "L\u01B0\u1EDBi"
          ] }),
          /* @__PURE__ */ jsxRuntime.jsx(
            "button",
            {
              type: "button",
              onClick: onUndo,
              disabled: !canUndo,
              title: "Ho\xE0n t\xE1c (Ctrl/Cmd+Z)",
              "aria-label": "Ho\xE0n t\xE1c",
              "data-testid": "undo-btn",
              className: "ml-auto inline-flex items-center justify-center rounded p-1 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent",
              children: /* @__PURE__ */ jsxRuntime.jsx(UndoIcon2, {})
            }
          )
        ] }) }),
        /* @__PURE__ */ jsxRuntime.jsx(
          ToolPalette,
          {
            selected: selectedTool,
            onSelect: onSelectTool,
            chordGroup: chordGroup ?? null,
            onHoverTool: (info) => info ? showHover(info) : hideHover()
          }
        ),
        chordGroup && /* @__PURE__ */ jsxRuntime.jsxs(
          "div",
          {
            "data-testid": "chord-hint",
            className: "rounded border border-emerald-200 bg-emerald-50/60 px-2 py-1 text-[11px] leading-snug text-slate-600",
            children: [
              /* @__PURE__ */ jsxRuntime.jsx("span", { className: "font-mono font-semibold text-emerald-700", children: letterForGroup2(chordGroup) }),
              /* @__PURE__ */ jsxRuntime.jsxs("span", { className: "ml-1.5", children: [
                "\u2192 ",
                GROUP_LABELS2[chordGroup],
                ". B\u1EA5m s\u1ED1 1-9 \u0111\u1EC3 ch\u1ECDn c\xF4ng c\u1EE5, Esc hu\u1EF7."
              ] })
            ]
          }
        )
      ] }) : /* @__PURE__ */ jsxRuntime.jsx("section", { "data-testid": "algebra-panel", children: /* @__PURE__ */ jsxRuntime.jsx(AlgebraList, { scene }) })
    ] }),
    portalReady && hover && typeof document !== "undefined" ? reactDom.createPortal(
      /* @__PURE__ */ jsxRuntime.jsxs(
        "div",
        {
          role: "tooltip",
          className: "pointer-events-none fixed w-max max-w-[220px] rounded-md bg-slate-900 px-2 py-1 text-left text-[11px] leading-tight text-white shadow-lg",
          style: {
            left: hover.x + 8,
            top: hover.y,
            transform: "translate(0, -50%)",
            zIndex: 2147483600
          },
          children: [
            /* @__PURE__ */ jsxRuntime.jsx("span", { className: "block font-medium", children: hover.label }),
            hover.hint && /* @__PURE__ */ jsxRuntime.jsx("span", { className: "mt-0.5 block text-slate-300", children: hover.hint })
          ]
        }
      ),
      document.body
    ) : null
  ] });
}
function TabPill({
  active,
  onClick,
  testId,
  children
}) {
  return /* @__PURE__ */ jsxRuntime.jsx(
    "button",
    {
      type: "button",
      onClick,
      "aria-pressed": active,
      "data-testid": testId,
      className: [
        "flex-1 rounded px-2 py-1 text-[11px] font-medium transition",
        active ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-800"
      ].join(" "),
      children
    }
  );
}
function MobilePanel(props) {
  const {
    selectedTool,
    onSelectTool,
    showAxis,
    showGrid,
    onShowAxisChange,
    onShowGridChange,
    onUndo,
    canUndo,
    isDark,
    drawerOpen,
    onDrawerClose
  } = props;
  const groups = React11__namespace.useMemo(
    () => GROUP_ORDER2.map((group) => {
      const keys = TOOLS_BY_GROUP[group];
      return {
        group,
        groupLabel: GROUP_LABELS2[group],
        tools: keys.map((k) => {
          const tool = TOOLS2.find((t) => t.key === k);
          return { key: k, label: tool.label, icon: ToolIcons[k] };
        })
      };
    }),
    []
  );
  return /* @__PURE__ */ jsxRuntime.jsx(
    MobileToolDrawer,
    {
      title: "H\xECnh h\u1ECDc 3D",
      headerIcon: Geom3DIconHeader,
      testId: "left-panel",
      isDark,
      drawerOpen: !!drawerOpen,
      onDrawerClose: () => onDrawerClose?.(),
      chips: [
        {
          label: "Tr\u1EE5c",
          icon: /* @__PURE__ */ jsxRuntime.jsx(AxisIcon2, {}),
          pressed: showAxis,
          onToggle: onShowAxisChange,
          testId: "toggle-axis"
        },
        {
          label: "L\u01B0\u1EDBi",
          icon: /* @__PURE__ */ jsxRuntime.jsx(GridIcon2, {}),
          pressed: showGrid,
          onToggle: onShowGridChange,
          testId: "toggle-grid"
        }
      ],
      actions: [
        {
          label: "Ho\xE0n t\xE1c",
          title: "Ho\xE0n t\xE1c (Ctrl/Cmd+Z)",
          icon: /* @__PURE__ */ jsxRuntime.jsx(UndoIcon2, {}),
          onClick: onUndo,
          disabled: !canUndo
        }
      ],
      groups,
      activeTool: selectedTool,
      onToolSelect: onSelectTool
    }
  );
}
function LeftPanel3(props) {
  if (props.isMobile) return /* @__PURE__ */ jsxRuntime.jsx(MobilePanel, { ...props });
  return /* @__PURE__ */ jsxRuntime.jsx(DesktopPanel, { ...props });
}
var TOOLTIP_DELAY_MS2, Geom3DIconHeader;
var init_LeftPanel3 = __esm({
  "src/stamps/geometry-3d/editor/LeftPanel.tsx"() {
    "use client";
    init_ToolPalette();
    init_AlgebraList();
    init_icons();
    init_groups();
    init_spec();
    init_MobileToolDrawer();
    TOOLTIP_DELAY_MS2 = 400;
    Geom3DIconHeader = /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [
      /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M4 9 L4 20 L14 20 L14 9 Z" }),
      /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M4 9 L10 4 L20 4 L14 9 Z" }),
      /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M14 9 L20 4 L20 15 L14 20 Z" })
    ] });
  }
});

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
var DEFAULT_VIEW3D, VIEW3D_ATTRS;
var init_theme2 = __esm({
  "src/stamps/geometry-3d/editor/theme.ts"() {
    init_theme();
    DEFAULT_VIEW3D = {
      azimuth: 0.7,
      elevation: 0.4,
      bbox3D: [-3, -3, -3, 3, 3, 3]
    };
    VIEW3D_ATTRS = (isDark) => {
      const p = paletteFor2(isDark);
      return {
        az: { slider: { visible: false }, point2: { visible: false } },
        el: { slider: { visible: false } },
        projection: "central",
        axesPosition: "border",
        xAxis: { strokeColor: p.axisX, lastArrow: { type: 2 } },
        yAxis: { strokeColor: p.axisY, lastArrow: { type: 2 } },
        zAxis: { strokeColor: p.axisZ, lastArrow: { type: 2 } }
      };
    };
  }
});
var MiniBoard3D;
var init_MiniBoard3D = __esm({
  "src/stamps/geometry-3d/editor/MiniBoard3D.tsx"() {
    "use client";
    init_theme2();
    MiniBoard3D = React11__namespace.forwardRef(
      function MiniBoard3D2(props, ref) {
        const containerRef = React11__namespace.useRef(null);
        const boardRef = React11__namespace.useRef(null);
        const viewRef = React11__namespace.useRef(null);
        const { isDark, onView3DReady, onPointerClick, onPointerMove, onPointerLeave } = props;
        const onView3DReadyRef = React11__namespace.useRef(onView3DReady);
        const onPointerClickRef = React11__namespace.useRef(onPointerClick);
        const onPointerMoveRef = React11__namespace.useRef(onPointerMove);
        const onPointerLeaveRef = React11__namespace.useRef(onPointerLeave);
        onView3DReadyRef.current = onView3DReady;
        onPointerClickRef.current = onPointerClick;
        onPointerMoveRef.current = onPointerMove;
        onPointerLeaveRef.current = onPointerLeave;
        React11__namespace.useImperativeHandle(
          ref,
          () => ({
            getBoard: () => boardRef.current,
            getView3D: () => viewRef.current,
            getSvgElement: () => containerRef.current?.querySelector("svg") ?? null
          }),
          []
        );
        React11__namespace.useEffect(() => {
          const div = containerRef.current;
          if (!div) return;
          let cancelled = false;
          let JXG = null;
          let board = null;
          let svgEl = null;
          let handlePointerDown = null;
          let handlePointerMove = null;
          let handlePointerLeave = null;
          void (async () => {
            try {
              JXG = (await import('jsxgraph')).default;
            } catch {
              return;
            }
            if (cancelled || !containerRef.current) return;
            try {
              JXG.Options.text.display = "internal";
            } catch {
            }
            try {
              board = JXG.JSXGraph.initBoard(div, {
                boundingbox: [-6, 6, 6, -6],
                keepaspectratio: true,
                axis: false,
                showCopyright: false,
                showNavigation: false,
                renderer: "svg"
              });
            } catch {
              return;
            }
            if (cancelled || !board) return;
            boardRef.current = board;
            let view = null;
            try {
              const baseAttrs = VIEW3D_ATTRS(isDark);
              view = board.create(
                "view3d",
                [
                  [-5, -5],
                  [10, 10],
                  [
                    [DEFAULT_VIEW3D.bbox3D[0], DEFAULT_VIEW3D.bbox3D[3]],
                    [DEFAULT_VIEW3D.bbox3D[1], DEFAULT_VIEW3D.bbox3D[4]],
                    [DEFAULT_VIEW3D.bbox3D[2], DEFAULT_VIEW3D.bbox3D[5]]
                  ]
                ],
                {
                  ...baseAttrs,
                  az: { ...baseAttrs.az, value: DEFAULT_VIEW3D.azimuth },
                  el: { ...baseAttrs.el, value: DEFAULT_VIEW3D.elevation }
                }
              );
            } catch {
            }
            viewRef.current = view;
            if (view) onView3DReadyRef.current?.(view, board);
            svgEl = containerRef.current?.querySelector("svg") ?? null;
            if (svgEl) {
              const p2 = paletteFor2(isDark);
              svgEl.style.background = p2.view3dBg;
              const pixelToUser = (e) => {
                const rect = svgEl.getBoundingClientRect();
                const px = e.clientX - rect.left;
                const py = e.clientY - rect.top;
                const b = board;
                if (!b || !b.origin || !b.origin.scrCoords) {
                  return { x: px, y: py };
                }
                const ox = b.origin.scrCoords[1];
                const oy = b.origin.scrCoords[2];
                const ux = b.unitX || 1;
                const uy = b.unitY || 1;
                return { x: (px - ox) / ux, y: (oy - py) / uy };
              };
              handlePointerDown = (e) => {
                if (!svgEl) return;
                onPointerClickRef.current?.(pixelToUser(e));
              };
              handlePointerMove = (e) => {
                if (!svgEl) return;
                onPointerMoveRef.current?.(pixelToUser(e));
              };
              handlePointerLeave = () => onPointerLeaveRef.current?.();
              svgEl.addEventListener("pointerdown", handlePointerDown);
              svgEl.addEventListener("pointermove", handlePointerMove);
              svgEl.addEventListener("pointerleave", handlePointerLeave);
            }
          })();
          return () => {
            cancelled = true;
            if (svgEl) {
              if (handlePointerDown) svgEl.removeEventListener("pointerdown", handlePointerDown);
              if (handlePointerMove) svgEl.removeEventListener("pointermove", handlePointerMove);
              if (handlePointerLeave) svgEl.removeEventListener("pointerleave", handlePointerLeave);
            }
            try {
              if (board && JXG) JXG.JSXGraph.freeBoard(board);
            } catch {
            }
            boardRef.current = null;
            viewRef.current = null;
          };
        }, [isDark]);
        const p = paletteFor2(isDark);
        return /* @__PURE__ */ jsxRuntime.jsx(
          "div",
          {
            "data-testid": "mini-board-3d",
            ref: containerRef,
            style: {
              width: "100%",
              height: "100%",
              minHeight: 400,
              background: p.view3dBg,
              position: "relative",
              // Clip JSXGraph mesh3d paths projecting outside the container.
              overflow: "hidden"
            }
          }
        );
      }
    );
  }
});
function StatusHint(props) {
  const { hint, hoverLabel } = props;
  return /* @__PURE__ */ jsxRuntime.jsxs(
    "div",
    {
      "data-testid": "status-hint",
      className: "border-t border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300",
      children: [
        /* @__PURE__ */ jsxRuntime.jsxs("span", { children: [
          "\u{1F4D0} ",
          hint || "Ch\u1ECDn c\xF4ng c\u1EE5 trong b\u1EA3ng b\xEAn tr\xE1i"
        ] }),
        hoverLabel ? /* @__PURE__ */ jsxRuntime.jsxs("span", { className: "ml-3 text-zinc-500", children: [
          "\u2014 \u0111ang tr\xEAn: ",
          hoverLabel
        ] }) : null
      ]
    }
  );
}
var init_StatusHint = __esm({
  "src/stamps/geometry-3d/editor/StatusHint.tsx"() {
    "use client";
  }
});

// src/stamps/geometry-3d/editor/scene/persistence.ts
function sceneToBoard(scene, view, bbox) {
  const elements = [];
  for (const obj of scene.list()) {
    const els = sceneObjectToElements(obj, scene);
    elements.push(...els);
  }
  return { version: 2, bbox, view, showAxes: true, showMesh: true, elements };
}
function sceneObjectToElements(obj, scene) {
  const baseAttrs = { label: obj.label, visible: obj.visible, color: obj.color };
  switch (obj.kind) {
    case "point": {
      let w;
      try {
        w = constraintToWorld(obj.constraint, scene);
      } catch {
        w = [0, 0, 0];
      }
      return [{
        type: "point3d",
        parents: [w[0], w[1], w[2]],
        attributes: { id: obj.id, ...baseAttrs },
        id: obj.id,
        label: obj.label,
        constraint: obj.constraint
      }];
    }
    case "segment":
    case "line":
    case "ray":
    case "vector":
    case "plane":
    case "sphere":
    case "polygon":
    case "polyhedron":
    case "cylinder":
    case "cone": {
      return [{
        type: pickJxgType(obj.kind),
        parents: [],
        attributes: { id: obj.id, ...baseAttrs, sceneKind: obj.kind, sceneSpec: encodeSpec(obj) },
        id: obj.id,
        label: obj.label
      }];
    }
  }
}
function pickJxgType(kind) {
  switch (kind) {
    case "point":
      return "point3d";
    case "segment":
    case "line":
    case "ray":
    case "vector":
      return "line3d";
    case "plane":
      return "plane3d";
    case "sphere":
      return "sphere3d";
    case "polygon":
    case "polyhedron":
    case "cylinder":
    case "cone":
      return "polygon3d";
  }
}
function encodeSpec(obj) {
  const rest = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k === "id" || k === "label" || k === "visible" || k === "color" || k === "kind") continue;
    rest[k] = v;
  }
  return rest;
}
function boardToScene(board) {
  const scene = new Scene3D();
  for (const el of board.elements) {
    if (el.type === "point3d") {
      const constraint = el.constraint ?? {
        kind: "free",
        x: Number(el.parents[0] ?? 0),
        y: Number(el.parents[1] ?? 0),
        z: Number(el.parents[2] ?? 0)
      };
      const color2 = el.attributes["color"];
      const visible2 = el.attributes["visible"] !== false;
      try {
        scene.insert({
          kind: "point",
          id: el.id,
          label: el.label ?? el.id,
          visible: visible2,
          color: color2,
          constraint
        });
      } catch {
      }
      continue;
    }
    const sceneKind = el.attributes["sceneKind"];
    const sceneSpec = el.attributes["sceneSpec"];
    if (!sceneKind || !sceneSpec) continue;
    const color = el.attributes["color"];
    const visible = el.attributes["visible"] !== false;
    const obj = {
      id: el.id,
      label: el.label ?? el.id,
      visible,
      color,
      kind: sceneKind,
      ...sceneSpec
    };
    try {
      scene.insert(obj);
    } catch {
    }
  }
  return scene;
}
var init_persistence = __esm({
  "src/stamps/geometry-3d/editor/scene/persistence.ts"() {
    init_Scene3D();
    init_constraintMath();
  }
});
var EditorPanel;
var init_EditorPanel2 = __esm({
  "src/stamps/geometry-3d/editor/EditorPanel.tsx"() {
    "use client";
    init_Scene3D();
    init_controller();
    init_JxgRenderer();
    init_hitTest();
    init_LeftPanel3();
    init_MiniBoard3D();
    init_StatusHint();
    init_persistence();
    EditorPanel = React11__namespace.forwardRef(
      function EditorPanel2(props, ref) {
        const {
          isDark: isDarkProp,
          initialState,
          onClose,
          isMobile = false,
          drawerOpen,
          onDrawerClose,
          chordGroup,
          onReadyChange
        } = props;
        const isDark = isDarkProp ?? false;
        const sceneRef = React11__namespace.useRef(null);
        if (!sceneRef.current) sceneRef.current = new Scene3D();
        const controllerRef = React11__namespace.useRef(null);
        if (!controllerRef.current) controllerRef.current = new ToolController(sceneRef.current);
        const [selectedTool, setSelectedTool] = React11__namespace.useState("move");
        const [hint, setHint] = React11__namespace.useState("Ch\u1ECDn c\xF4ng c\u1EE5 trong b\u1EA3ng b\xEAn tr\xE1i");
        const [hoverLabel, setHoverLabel] = React11__namespace.useState(null);
        const [showAxis, setShowAxis] = React11__namespace.useState(true);
        const [showGrid, setShowGrid] = React11__namespace.useState(true);
        const boardRef = React11__namespace.useRef(null);
        const rendererRef = React11__namespace.useRef(null);
        React11__namespace.useEffect(() => {
          if (initialState && sceneRef.current) {
            const loaded = boardToScene(initialState);
            sceneRef.current.reset();
            for (const obj of loaded.list()) {
              sceneRef.current.insert(obj);
            }
          }
        }, []);
        React11__namespace.useEffect(() => {
          const ctrl = controllerRef.current;
          const unsub = ctrl.on((state) => {
            setHint(state.hint);
            setSelectedTool(state.tool?.key ?? "move");
          });
          return unsub;
        }, []);
        React11__namespace.useEffect(() => {
          return () => {
            rendererRef.current?.dispose();
            rendererRef.current = null;
          };
        }, []);
        React11__namespace.useEffect(() => {
          const view = boardRef.current?.getView3D();
          const v = view;
          if (!v || typeof v.setAttribute !== "function") return;
          try {
            v.setAttribute({
              xAxis: { visible: showAxis },
              yAxis: { visible: showAxis },
              zAxis: { visible: showAxis },
              xPlaneRear: { visible: showGrid, mesh3d: { visible: showGrid } },
              yPlaneRear: { visible: showGrid, mesh3d: { visible: showGrid } },
              zPlaneRear: { visible: showGrid, mesh3d: { visible: showGrid } }
            });
            v.board?.update?.();
          } catch {
          }
        }, [showAxis, showGrid]);
        const handleView3DReady = React11__namespace.useCallback((view) => {
          if (!sceneRef.current) return;
          rendererRef.current = new JxgRenderer(sceneRef.current, view);
          onReadyChange?.(true);
        }, [onReadyChange]);
        const handleClick = React11__namespace.useCallback((screen) => {
          const board = boardRef.current;
          if (!board) return;
          const view = board.getView3D();
          if (!view) return;
          try {
            const hit = hitTest(screen, view, sceneRef.current);
            controllerRef.current.consumeHit(hit);
          } catch {
          }
        }, []);
        const handleMove2 = React11__namespace.useCallback((screen) => {
          const board = boardRef.current;
          if (!board) return;
          const view = board.getView3D();
          if (!view) return;
          let hit;
          try {
            hit = hitTest(screen, view, sceneRef.current);
          } catch {
            setHoverLabel(null);
            return;
          }
          if (hit.kind === "empty") setHoverLabel(null);
          else if (hit.kind === "existingPoint") {
            const obj = sceneRef.current.get(hit.pointId);
            setHoverLabel(obj?.label ?? null);
          } else if (hit.kind === "onGround") setHoverLabel("m\u1EB7t n\u1EC1n");
          else if (hit.kind === "onAxis") setHoverLabel(`tr\u1EE5c ${hit.axis.toUpperCase()}`);
          else if (hit.kind === "onPlane") setHoverLabel(`m\u1EB7t ph\u1EB3ng ${hit.planeId}`);
          else if (hit.kind === "onSphere") setHoverLabel(`m\u1EB7t c\u1EA7u ${hit.sphereId}`);
          else setHoverLabel(null);
        }, []);
        React11__namespace.useImperativeHandle(
          ref,
          () => ({
            hasContent: () => (sceneRef.current?.list().length ?? 0) > 0,
            serialize: () => {
              const view = boardRef.current?.getView3D();
              const v = view;
              const azimuth = typeof v?.az?.Value === "function" ? v.az.Value() : 0;
              const elevation = typeof v?.el?.Value === "function" ? v.el.Value() : 0;
              return sceneToBoard(
                sceneRef.current,
                { azimuth, elevation, bbox3D: [-5, -5, -5, 5, 5, 5] },
                [-6, -6, 6, 6]
              );
            },
            setTool: (k) => controllerRef.current.selectTool(k)
          }),
          []
        );
        return /* @__PURE__ */ jsxRuntime.jsxs(
          "div",
          {
            "data-testid": "editor-panel-3d",
            className: [
              isDark ? "theme--dark " : "",
              "flex h-full w-full overflow-hidden bg-white"
            ].join(""),
            children: [
              /* @__PURE__ */ jsxRuntime.jsx(
                LeftPanel3,
                {
                  scene: sceneRef.current,
                  selectedTool,
                  onSelectTool: (k) => controllerRef.current.selectTool(k),
                  showAxis,
                  showGrid,
                  onShowAxisChange: setShowAxis,
                  onShowGridChange: setShowGrid,
                  onUndo: () => {
                  },
                  canUndo: false,
                  onClose: () => onClose?.(),
                  isDark,
                  isMobile,
                  drawerOpen,
                  onDrawerClose,
                  chordGroup: chordGroup ?? null
                }
              ),
              /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "flex min-w-0 flex-1 flex-col", children: [
                /* @__PURE__ */ jsxRuntime.jsx("div", { className: "min-h-0 flex-1", children: /* @__PURE__ */ jsxRuntime.jsx(
                  MiniBoard3D,
                  {
                    ref: boardRef,
                    isDark,
                    onView3DReady: handleView3DReady,
                    onPointerClick: handleClick,
                    onPointerMove: handleMove2,
                    onPointerLeave: () => setHoverLabel(null)
                  }
                ) }),
                /* @__PURE__ */ jsxRuntime.jsx(StatusHint, { hint, hoverLabel })
              ] })
            ]
          }
        );
      }
    );
  }
});

// src/stamps/geometry-3d/host.tsx
var host_exports3 = {};
__export(host_exports3, {
  Geometry3DStampHost: () => Geometry3DStampHost
});
function parseInitial(editingElement) {
  if (!editingElement) return null;
  if (!isGeometry3DCustomData(editingElement.customData)) return null;
  try {
    return parseSerializedBoard3D(editingElement.customData.jsonState);
  } catch {
    return null;
  }
}
var Geometry3DStampHost;
var init_host3 = __esm({
  "src/stamps/geometry-3d/host.tsx"() {
    "use client";
    init_EditorPanel2();
    init_groups();
    init_useChordShortcut();
    init_insertImage();
    init_useIsMobile();
    init_serialize2();
    Geometry3DStampHost = React11.forwardRef(
      function Geometry3DStampHost2({ api, editingElement, onClose, isDark }, ref) {
        const editorRef = React11.useRef(null);
        const { isMobile } = useIsMobile();
        const [drawerOpen, setDrawerOpen] = React11.useState(false);
        const [ready, setReady] = React11.useState(false);
        const initial = React11.useMemo(
          () => parseInitial(editingElement),
          [editingElement]
        );
        const { chordGroup } = useChordShortcut({
          groupOrder: GROUP_ORDER2,
          tools: TOOLS_FLAT,
          onSelect: (key) => editorRef.current?.setTool(key),
          enabled: !isMobile
        });
        const performInsert = React11.useCallback(
          async (board, width, height, svgString) => {
            if (!api) return;
            const jsonState = serializeBoard3D(board);
            await insertStampImage(api, {
              svgString,
              makeCustomData: () => ({
                kind: "geometry3d",
                version: 1,
                jsonState,
                svgWidth: width,
                svgHeight: height
              }),
              editingElementId: editingElement?.id ?? null
            });
            onClose();
          },
          [api, editingElement, onClose]
        );
        const tryInsert = React11.useCallback(() => {
          if (!editorRef.current) return false;
          if (!editorRef.current.hasContent()) return false;
          const board = editorRef.current.serialize();
          if (board.elements.length === 0) return false;
          void performInsert(board, 0, 0, "");
          return true;
        }, [performInsert]);
        React11.useImperativeHandle(
          ref,
          () => ({
            tryInsert,
            hasContent: () => editorRef.current?.hasContent() ?? false
          }),
          [tryInsert]
        );
        const handleEditorInsert = React11.useCallback(
          (board, width, height, svgString) => {
            void performInsert(board, width, height, svgString);
          },
          [performInsert]
        );
        const wrapperStyle = isMobile ? { position: "fixed", inset: 0, zIndex: 40 } : {
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 40
        };
        return /* @__PURE__ */ jsxRuntime.jsxs(
          "div",
          {
            role: "dialog",
            "aria-label": "D\u1EF1ng h\xECnh h\u1ECDc 3D",
            "data-testid": "geom3d-host",
            "data-stamp-area": "true",
            style: wrapperStyle,
            className: [
              isDark ? "theme--dark " : "",
              "flex flex-col overflow-hidden bg-white",
              isMobile ? "h-full w-full" : "h-[600px] max-h-[85vh] w-[1040px] max-w-[calc(100vw-80px)] rounded-lg border border-slate-300 shadow-2xl ring-1 ring-black/5"
            ].join(" "),
            children: [
              /* @__PURE__ */ jsxRuntime.jsxs("header", { className: "flex items-center gap-2 border-b border-slate-200 bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-2 text-white", children: [
                isMobile && /* @__PURE__ */ jsxRuntime.jsx(
                  "button",
                  {
                    type: "button",
                    onClick: () => setDrawerOpen(true),
                    "aria-label": "M\u1EDF ng\u0103n c\xF4ng c\u1EE5",
                    className: "-ml-1 inline-flex h-10 w-10 items-center justify-center rounded transition hover:bg-white/15",
                    children: /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
                      /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "4", y1: "6", x2: "20", y2: "6" }),
                      /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "4", y1: "12", x2: "20", y2: "12" }),
                      /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "4", y1: "18", x2: "20", y2: "18" })
                    ] })
                  }
                ),
                /* @__PURE__ */ jsxRuntime.jsxs("h3", { className: "flex flex-1 items-center gap-2 text-sm font-semibold", children: [
                  /* @__PURE__ */ jsxRuntime.jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M4 9 L4 20 L14 20 L14 9 Z M4 9 L10 4 L20 4 L14 9 Z M14 9 L20 4 L20 15 L14 20 Z" }) }),
                  "D\u1EF1ng h\xECnh h\u1ECDc kh\xF4ng gian"
                ] }),
                isMobile && /* @__PURE__ */ jsxRuntime.jsx(
                  "button",
                  {
                    type: "button",
                    onClick: tryInsert,
                    disabled: !ready,
                    "data-testid": "geom3d-insert-btn-mobile",
                    className: "rounded bg-white/15 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/25 disabled:opacity-50",
                    children: "Ch\xE8n"
                  }
                ),
                /* @__PURE__ */ jsxRuntime.jsx(
                  "button",
                  {
                    onClick: onClose,
                    "aria-label": "\u0110\xF3ng",
                    className: "inline-flex h-9 w-9 items-center justify-center rounded transition hover:bg-white/15",
                    children: /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
                      /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" }),
                      /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" })
                    ] })
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntime.jsx("div", { className: "min-h-0 flex-1", children: /* @__PURE__ */ jsxRuntime.jsx(
                EditorPanel,
                {
                  ref: editorRef,
                  isDark,
                  initialState: initial,
                  onInsert: handleEditorInsert,
                  onClose,
                  isMobile,
                  drawerOpen,
                  onDrawerClose: () => setDrawerOpen(false),
                  chordGroup,
                  onReadyChange: setReady
                }
              ) }),
              !isMobile && /* @__PURE__ */ jsxRuntime.jsxs("footer", { className: "flex items-center justify-between border-t border-slate-200 bg-slate-50 px-3 py-2", children: [
                /* @__PURE__ */ jsxRuntime.jsx("span", { className: "text-xs text-slate-500", children: "Ch\u1ECDn c\xF4ng c\u1EE5 b\xEAn tr\xE1i, click tr\xEAn b\u1EA3ng \u0111\u1EC3 d\u1EF1ng h\xECnh." }),
                /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "flex gap-2", children: [
                  /* @__PURE__ */ jsxRuntime.jsx(
                    "button",
                    {
                      onClick: onClose,
                      className: "rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100",
                      children: "Hu\u1EF7"
                    }
                  ),
                  /* @__PURE__ */ jsxRuntime.jsx(
                    "button",
                    {
                      onClick: tryInsert,
                      disabled: !ready,
                      "data-testid": "geom3d-insert-btn",
                      className: "rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50",
                      children: "Ch\xE8n"
                    }
                  )
                ] })
              ] })
            ]
          }
        );
      }
    );
  }
});

// src/stamps/graph-2d/serialize.ts
function stringifySerializedGraph(graph) {
  return JSON.stringify(graph);
}
function parseSerializedGraph(jsonState) {
  let raw;
  try {
    raw = JSON.parse(jsonState);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw;
  if (r.version !== 1) return null;
  if (!r.view || typeof r.view !== "object") return null;
  const v = r.view;
  if (typeof v.xMin !== "number" || typeof v.xMax !== "number" || typeof v.yMin !== "number" || typeof v.yMax !== "number" || typeof v.showAxis !== "boolean" || typeof v.showGrid !== "boolean") {
    return null;
  }
  for (const key of ["functions", "parameters", "points", "intersections", "tangents"]) {
    if (!Array.isArray(r[key])) return null;
  }
  return raw;
}
var EMPTY_GRAPH;
var init_serialize3 = __esm({
  "src/stamps/graph-2d/serialize.ts"() {
    EMPTY_GRAPH = {
      version: 1,
      view: { xMin: -10, xMax: 10, yMin: -10, yMax: 10, showAxis: true, showGrid: true },
      functions: [],
      parameters: [],
      points: [],
      intersections: [],
      tangents: []
    };
  }
});

// src/stamps/graph-2d/parser.ts
function errResult(message) {
  return { ok: false, error: message, freeVars: /* @__PURE__ */ new Set() };
}
function validate(expr) {
  const trimmed = expr.trim();
  if (!trimmed) return errResult("Bi\u1EC3u th\u1EE9c r\u1ED7ng");
  if (!ALLOWED_CHARS.test(trimmed)) return errResult("K\xFD t\u1EF1 kh\xF4ng h\u1EE3p l\u1EC7");
  const ids = trimmed.match(IDENTIFIER_RE) ?? [];
  const freeVars = /* @__PURE__ */ new Set();
  for (const id of ids) {
    if (id === "x" || id === "pi" || id === "e") continue;
    if (ALLOWED_FUNCTIONS.has(id)) continue;
    if (id.length === 1) {
      freeVars.add(id);
      continue;
    }
    const hint = SUGGESTIONS[id];
    return errResult(
      hint ? `T\xEAn h\xE0m kh\xF4ng h\u1EE3p l\u1EC7: "${id}". B\u1EA1n c\xF3 \xFD l\xE0 "${hint}" kh\xF4ng?` : `T\xEAn kh\xF4ng h\u1EE3p l\u1EC7: "${id}"`
    );
  }
  try {
    const paramSubs = Object.fromEntries([...freeVars].map((v) => [v, 1]));
    const rewritten = rewriteToJs(trimmed, paramSubs);
    new Function("x", `return (${rewritten})`);
  } catch {
    return errResult("L\u1ED7i c\xFA ph\xE1p");
  }
  return { ok: true, freeVars };
}
function rewriteToJs(expr, params) {
  let s = expr.replace(/\^/g, "**");
  s = s.replace(/\bpi\b/g, "Math.PI");
  s = s.replace(/\be\b/g, "Math.E");
  for (const [from, to] of FUNCTION_REPLACEMENTS) {
    s = s.replace(new RegExp(`\\b${from}\\b`, "g"), to);
  }
  for (const [name, value] of Object.entries(params)) {
    if (name.length !== 1) continue;
    s = s.replace(new RegExp(`\\b${name}\\b`, "g"), `(${value})`);
  }
  return s;
}
function compile(expr, paramValues) {
  const v = validate(expr);
  if (!v.ok) return { error: v.error ?? "Invalid" };
  try {
    const rewritten = rewriteToJs(expr, paramValues);
    const raw = new Function("x", `return (${rewritten})`);
    return (x) => {
      try {
        const y = raw(x);
        return typeof y === "number" ? y : NaN;
      } catch {
        return NaN;
      }
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
var ALLOWED_FUNCTIONS, ALLOWED_CHARS, IDENTIFIER_RE, SUGGESTIONS, FUNCTION_REPLACEMENTS;
var init_parser = __esm({
  "src/stamps/graph-2d/parser.ts"() {
    ALLOWED_FUNCTIONS = /* @__PURE__ */ new Set([
      "sin",
      "cos",
      "tan",
      "asin",
      "acos",
      "atan",
      "log",
      "ln",
      "exp",
      "sqrt",
      "abs",
      "floor",
      "ceil",
      "round"
    ]);
    ALLOWED_CHARS = /^[a-zA-Z0-9_.+\-*/^()\s,]+$/;
    IDENTIFIER_RE = /[a-zA-Z][a-zA-Z0-9_]*/g;
    SUGGESTIONS = {
      tg: "tan",
      arcsin: "asin",
      arccos: "acos",
      arctan: "atan"
    };
    FUNCTION_REPLACEMENTS = [
      // longest first để tránh substring conflict (asin trước sin)
      ["asin", "Math.asin"],
      ["acos", "Math.acos"],
      ["atan", "Math.atan"],
      ["sqrt", "Math.sqrt"],
      ["floor", "Math.floor"],
      ["round", "Math.round"],
      ["ceil", "Math.ceil"],
      ["sin", "Math.sin"],
      ["cos", "Math.cos"],
      ["tan", "Math.tan"],
      ["abs", "Math.abs"],
      ["exp", "Math.exp"],
      ["log", "Math.log10"],
      ["ln", "Math.log"]
    ];
  }
});

// src/stamps/graph-2d/editor/handlers.ts
function addPointOnCurve(graph, ctx, idFactory) {
  if (!ctx.functionId) return graph;
  const point = {
    id: idFactory(),
    functionId: ctx.functionId,
    x: ctx.x
  };
  return { ...graph, points: [...graph.points, point] };
}
function addIntersection(graph, functionIdA, functionIdB, idFactory) {
  if (functionIdA === functionIdB) return graph;
  const exists = graph.intersections.some(
    (i) => i.functionIdA === functionIdA && i.functionIdB === functionIdB || i.functionIdA === functionIdB && i.functionIdB === functionIdA
  );
  if (exists) return graph;
  const intersection = {
    id: idFactory(),
    functionIdA,
    functionIdB
  };
  return { ...graph, intersections: [...graph.intersections, intersection] };
}
function numericalDerivative(expression, paramValues, x, h = 1e-4) {
  const fn = compile(expression, paramValues);
  if (typeof fn !== "function") return NaN;
  const y1 = fn(x - h);
  const y2 = fn(x + h);
  return (y2 - y1) / (2 * h);
}
var init_handlers2 = __esm({
  "src/stamps/graph-2d/editor/handlers.ts"() {
    init_parser();
  }
});

// src/stamps/graph-2d/renderObjects.ts
function renderGraphObjects(board, graph) {
  const paramMap = {};
  for (const p of graph.parameters) paramMap[p.name] = p.value;
  for (const f of graph.functions) {
    if (!f.visible) continue;
    const compiled = compile(f.expression, paramMap);
    if (typeof compiled !== "function") continue;
    const domain = f.domain ?? { min: graph.view.xMin, max: graph.view.xMax };
    board.create("functiongraph", [compiled, domain.min, domain.max], {
      strokeColor: f.color,
      strokeWidth: 2,
      name: f.name,
      withLabel: false,
      highlight: false
    });
  }
  for (const point of graph.points) {
    const fn = graph.functions.find((f) => f.id === point.functionId);
    if (!fn || !fn.visible) continue;
    const compiled = compile(fn.expression, paramMap);
    if (typeof compiled !== "function") continue;
    const y = compiled(point.x);
    board.create("point", [point.x, y], {
      name: point.label ?? "",
      size: 3,
      fillColor: fn.color,
      strokeColor: fn.color,
      withLabel: !!point.label
    });
  }
  for (const inter of graph.intersections) {
    const fa = graph.functions.find((f) => f.id === inter.functionIdA);
    const fb = graph.functions.find((f) => f.id === inter.functionIdB);
    if (!fa || !fb || !fa.visible || !fb.visible) continue;
    const cfa = compile(fa.expression, paramMap);
    const cfb = compile(fb.expression, paramMap);
    if (typeof cfa !== "function" || typeof cfb !== "function") continue;
    const roots = scanRoots((x) => cfa(x) - cfb(x), graph.view.xMin, graph.view.xMax);
    for (const x of roots) {
      board.create("point", [x, cfa(x)], {
        size: 3,
        fillColor: "#000",
        strokeColor: "#000"
      });
    }
  }
  for (const tan of graph.tangents) {
    const pt = graph.points.find((p) => p.id === tan.pointId);
    if (!pt) continue;
    const fn = graph.functions.find((f) => f.id === pt.functionId);
    if (!fn || !fn.visible) continue;
    const slope = numericalDerivative(fn.expression, paramMap, pt.x);
    const cfn = compile(fn.expression, paramMap);
    if (typeof cfn !== "function" || !Number.isFinite(slope)) continue;
    const y0 = cfn(pt.x);
    const x1 = graph.view.xMin;
    const x2 = graph.view.xMax;
    board.create(
      "line",
      [
        [x1, slope * (x1 - pt.x) + y0],
        [x2, slope * (x2 - pt.x) + y0]
      ],
      {
        strokeColor: fn.color,
        strokeWidth: 1,
        dash: 2,
        straightFirst: false,
        straightLast: false
      }
    );
  }
}
function scanRoots(fn, xMin, xMax, samples = 200) {
  const roots = [];
  const step = (xMax - xMin) / samples;
  let prevX = xMin;
  let prevY = fn(prevX);
  for (let i = 1; i <= samples; i++) {
    const x = xMin + i * step;
    const y = fn(x);
    if (Number.isFinite(prevY) && Number.isFinite(y) && prevY * y < 0) {
      let a = prevX;
      let b = x;
      let ya = prevY;
      for (let j = 0; j < 30; j++) {
        const m = (a + b) / 2;
        const ym = fn(m);
        if (Math.abs(ym) < 1e-6) {
          a = b = m;
          break;
        }
        if (ya * ym < 0) {
          b = m;
        } else {
          a = m;
          ya = ym;
        }
      }
      roots.push((a + b) / 2);
    }
    prevX = x;
    prevY = y;
  }
  return roots;
}
var init_renderObjects = __esm({
  "src/stamps/graph-2d/renderObjects.ts"() {
    init_parser();
    init_handlers2();
  }
});

// src/stamps/graph-2d/render.ts
async function renderGraph2dSvgFromState(jsonState) {
  const parsed = parseSerializedGraph(jsonState);
  if (!parsed) throw new Error("renderGraph2dSvgFromState: jsonState corrupt");
  const JXG = (await import('jsxgraph')).default;
  const opts = JXG.Options;
  if (opts) {
    opts.text = opts.text || {};
    opts.text.display = "internal";
    opts.text.useASCIIMathML = false;
    opts.text.useMathJax = false;
    opts.text.useKatex = false;
    opts.label = opts.label || {};
    opts.label.display = "internal";
  }
  const container = document.createElement("div");
  container.id = `jxg_graph2d_off_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  container.style.cssText = "position:absolute;top:-99999px;left:-99999px;width:600px;height:400px;visibility:hidden;pointer-events:none;";
  document.body.appendChild(container);
  let board = null;
  try {
    board = JXG.JSXGraph.initBoard(container.id, {
      boundingbox: [parsed.view.xMin, parsed.view.yMax, parsed.view.xMax, parsed.view.yMin],
      axis: parsed.view.showAxis,
      grid: parsed.view.showGrid,
      showCopyright: false,
      showNavigation: false,
      keepAspectRatio: false
    });
    renderGraphObjects(board, parsed);
    board.update();
    const svgEl = container.querySelector("svg");
    if (!svgEl) throw new Error("renderGraph2dSvgFromState: no svg generated");
    return svgEl.outerHTML;
  } finally {
    try {
      if (board) JXG.JSXGraph.freeBoard(board);
    } catch {
    }
    if (container.parentNode) container.parentNode.removeChild(container);
  }
}
var init_render3 = __esm({
  "src/stamps/graph-2d/render.ts"() {
    init_serialize3();
    init_renderObjects();
  }
});

// src/stamps/graph-2d/types.ts
function isGraph2DCustomData(data) {
  if (!data || typeof data !== "object") return false;
  const d = data;
  return d.kind === "graph2d" && d.version === 1 && typeof d.jsonState === "string";
}
var init_types3 = __esm({
  "src/stamps/graph-2d/types.ts"() {
  }
});

// src/stamps/graph-2d/editor/tools.ts
var GRAPH_TOOLS;
var init_tools2 = __esm({
  "src/stamps/graph-2d/editor/tools.ts"() {
    GRAPH_TOOLS = [
      { id: "move", label: "Di chuy\u1EC3n", title: "Di chuy\u1EC3n / ch\u1ECDn" },
      { id: "point-on-curve", label: "\u0110i\u1EC3m tr\xEAn curve", title: "T\u1EA1o \u0111i\u1EC3m c\u1ED1 \u0111\u1ECBnh tr\xEAn \u0111\u1ED3 th\u1ECB" },
      { id: "intersect", label: "Giao \u0111i\u1EC3m", title: "\u0110\xE1nh d\u1EA5u giao \u0111i\u1EC3m 2 \u0111\u1ED3 th\u1ECB" },
      { id: "tangent", label: "Ti\u1EBFp tuy\u1EBFn", title: "V\u1EBD ti\u1EBFp tuy\u1EBFn t\u1EA1i \u0111i\u1EC3m tr\xEAn \u0111\u1ED3 th\u1ECB" }
    ];
  }
});
function FunctionRow(props) {
  const { id, name, expression, color, visible, error } = props;
  const [draft, setDraft] = React11.useState(expression);
  React11.useEffect(() => {
    setDraft(expression);
  }, [expression]);
  const commit = () => {
    if (draft !== expression) props.onExpressionCommit(draft);
  };
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
      e.target.blur();
    } else if (e.key === "Escape") {
      setDraft(expression);
      e.target.blur();
    }
  };
  const handleBlur = (_) => commit();
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { className: `graph-function-row${error ? " is-error" : ""}`, "data-testid": `graph-function-row-${id}`, children: [
    /* @__PURE__ */ jsxRuntime.jsx(
      "span",
      {
        className: "graph-function-color",
        style: { backgroundColor: color },
        "aria-hidden": "true"
      }
    ),
    /* @__PURE__ */ jsxRuntime.jsxs("span", { className: "graph-function-name", "data-testid": `graph-function-name-${id}`, children: [
      name,
      "(x) ="
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx(
      "input",
      {
        "aria-label": "Bi\u1EC3u th\u1EE9c",
        className: "graph-function-input",
        type: "text",
        value: draft,
        onChange: (e) => setDraft(e.target.value),
        onKeyDown: handleKeyDown,
        onBlur: handleBlur,
        spellCheck: false,
        autoCorrect: "off",
        autoCapitalize: "off"
      }
    ),
    /* @__PURE__ */ jsxRuntime.jsx(
      "button",
      {
        type: "button",
        "aria-label": "\u1EA8n/hi\u1EC7n \u0111\u1ED3 th\u1ECB",
        className: `graph-function-eye${visible ? "" : " is-hidden"}`,
        onClick: props.onToggleVisible,
        children: visible ? "\u{1F441}" : "\u2298"
      }
    ),
    /* @__PURE__ */ jsxRuntime.jsx(
      "button",
      {
        type: "button",
        "aria-label": "Xo\xE1 \u0111\u1ED3 th\u1ECB",
        className: "graph-function-remove",
        onClick: props.onRemove,
        children: "\u2715"
      }
    ),
    error ? /* @__PURE__ */ jsxRuntime.jsx("div", { className: "graph-function-error", children: error }) : null
  ] });
}
var init_FunctionRow = __esm({
  "src/stamps/graph-2d/editor/FunctionRow.tsx"() {
    "use client";
  }
});
function SliderRow(props) {
  const { name, value, min, max, step } = props;
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "graph-slider-row", "data-testid": `graph-slider-row-${name}`, children: [
    /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "graph-slider-header", children: [
      /* @__PURE__ */ jsxRuntime.jsx("span", { className: "graph-slider-name", children: name }),
      /* @__PURE__ */ jsxRuntime.jsxs("span", { className: "graph-slider-value", children: [
        "= ",
        value.toFixed(2)
      ] }),
      /* @__PURE__ */ jsxRuntime.jsx(
        "button",
        {
          type: "button",
          "aria-label": `Xo\xE1 tham s\u1ED1 ${name}`,
          className: "graph-slider-remove",
          onClick: props.onRemove,
          children: "\u2715"
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx(
      "input",
      {
        type: "range",
        "aria-label": `Slider ${name}`,
        min,
        max,
        step,
        value,
        onChange: (e) => props.onChange(parseFloat(e.target.value)),
        className: "graph-slider-input"
      }
    ),
    /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "graph-slider-range", children: [
      /* @__PURE__ */ jsxRuntime.jsx("span", { children: min }),
      /* @__PURE__ */ jsxRuntime.jsx("span", { children: max })
    ] })
  ] });
}
var init_SliderRow = __esm({
  "src/stamps/graph-2d/editor/SliderRow.tsx"() {
    "use client";
  }
});

// src/stamps/graph-2d/colors.ts
function nextColor(usedColors) {
  for (const c of GRAPH_PALETTE) {
    if (!usedColors.includes(c)) return c;
  }
  return GRAPH_PALETTE[usedColors.length % GRAPH_PALETTE.length];
}
function nextFunctionName(usedNames) {
  for (const n of FUNCTION_NAMES) {
    if (!usedNames.includes(n)) return n;
  }
  return FUNCTION_NAMES[usedNames.length % FUNCTION_NAMES.length];
}
var GRAPH_PALETTE, FUNCTION_NAMES, MAX_FUNCTIONS, MAX_PARAMETERS;
var init_colors = __esm({
  "src/stamps/graph-2d/colors.ts"() {
    GRAPH_PALETTE = [
      "#2563eb",
      // blue
      "#dc2626",
      // red
      "#16a34a",
      // green
      "#9333ea",
      // purple
      "#ea580c",
      // orange
      "#0891b2",
      // cyan
      "#db2777",
      // pink
      "#65a30d"
      // lime
    ];
    FUNCTION_NAMES = ["f", "g", "h", "i", "j", "k", "l", "m"];
    MAX_FUNCTIONS = 8;
    MAX_PARAMETERS = 8;
  }
});
function AlgebraView(props) {
  const { graph, errors } = props;
  const atMax = graph.functions.length >= MAX_FUNCTIONS;
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "graph-algebra-view", children: [
    /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "graph-algebra-section", children: [
      graph.functions.map((f) => /* @__PURE__ */ jsxRuntime.jsx(
        FunctionRow,
        {
          id: f.id,
          name: f.name,
          expression: f.expression,
          color: f.color,
          visible: f.visible,
          error: errors[f.id] ?? null,
          onExpressionCommit: (expr) => props.onCommitFunctionExpr(f.id, expr),
          onToggleVisible: () => props.onToggleFunctionVisible(f.id),
          onRemove: () => props.onRemoveFunction(f.id)
        },
        f.id
      )),
      /* @__PURE__ */ jsxRuntime.jsx(
        "button",
        {
          type: "button",
          "aria-label": "Th\xEAm h\xE0m s\u1ED1",
          className: "graph-algebra-add",
          onClick: props.onAddFunctionDraft,
          disabled: atMax,
          children: "+ Th\xEAm h\xE0m"
        }
      )
    ] }),
    graph.parameters.length > 0 ? /* @__PURE__ */ jsxRuntime.jsx("div", { className: "graph-algebra-section graph-algebra-parameters", children: graph.parameters.map((p) => /* @__PURE__ */ jsxRuntime.jsx(
      SliderRow,
      {
        name: p.name,
        value: p.value,
        min: p.min,
        max: p.max,
        step: p.step,
        onChange: (v) => props.onParameterChange(p.name, v),
        onRangeChange: (min, max, step) => props.onParameterRangeChange(p.name, min, max, step),
        onRemove: () => props.onRemoveParameter(p.name)
      },
      p.name
    )) }) : null
  ] });
}
var init_AlgebraView = __esm({
  "src/stamps/graph-2d/editor/AlgebraView.tsx"() {
    "use client";
    init_FunctionRow();
    init_SliderRow();
    init_colors();
  }
});
function CloseIcon3() {
  return /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" }),
    /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" })
  ] });
}
function UndoIcon3() {
  return /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ jsxRuntime.jsx("polyline", { points: "3 7 3 13 9 13" }),
    /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M3.51 13a9 9 0 1 0 2.13-9.36L3 7" })
  ] });
}
function ResetViewIcon() {
  return /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ jsxRuntime.jsx("circle", { cx: "12", cy: "12", r: "9" }),
    /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "12", y1: "3", x2: "12", y2: "21" }),
    /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "3", y1: "12", x2: "21", y2: "12" })
  ] });
}
function MoveIcon() {
  return /* @__PURE__ */ jsxRuntime.jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M3 4 L9 4 L9 9 L4 9 Z" }) });
}
function PointOnCurveIcon() {
  return /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M3 17 C7 8, 14 8, 21 14" }),
    /* @__PURE__ */ jsxRuntime.jsx("circle", { cx: "12", cy: "11", r: "2.2", fill: "currentColor", stroke: "none" })
  ] });
}
function IntersectIcon() {
  return /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M3 17 C8 5, 14 5, 21 17" }),
    /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M3 5 C8 17, 14 17, 21 5" }),
    /* @__PURE__ */ jsxRuntime.jsx("circle", { cx: "12", cy: "11", r: "1.6", fill: "currentColor", stroke: "none" })
  ] });
}
function TangentIcon() {
  return /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M3 17 C8 7, 14 7, 21 16" }),
    /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "4", y1: "14", x2: "20", y2: "6" }),
    /* @__PURE__ */ jsxRuntime.jsx("circle", { cx: "12", cy: "10", r: "1.8", fill: "currentColor", stroke: "none" })
  ] });
}
function Section4({ label, children }) {
  return /* @__PURE__ */ jsxRuntime.jsxs("section", { children: [
    /* @__PURE__ */ jsxRuntime.jsx("h4", { className: "mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500", children: label }),
    children
  ] });
}
function PanelBody(props) {
  return /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
    /* @__PURE__ */ jsxRuntime.jsx(Section4, { label: "B\u1ED1 c\u1EE5c", children: /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "flex items-center gap-2 flex-wrap text-[11px] text-slate-700", children: [
      /* @__PURE__ */ jsxRuntime.jsxs("label", { className: "inline-flex select-none items-center gap-1.5", children: [
        /* @__PURE__ */ jsxRuntime.jsx(
          "input",
          {
            type: "checkbox",
            checked: props.showAxis,
            onChange: (e) => props.onShowAxisChange(e.target.checked),
            "data-testid": "toggle-axis"
          }
        ),
        "Tr\u1EE5c"
      ] }),
      /* @__PURE__ */ jsxRuntime.jsxs("label", { className: "inline-flex select-none items-center gap-1.5", children: [
        /* @__PURE__ */ jsxRuntime.jsx(
          "input",
          {
            type: "checkbox",
            checked: props.showGrid,
            onChange: (e) => props.onShowGridChange(e.target.checked),
            "data-testid": "toggle-grid"
          }
        ),
        "L\u01B0\u1EDBi"
      ] }),
      /* @__PURE__ */ jsxRuntime.jsx(
        "button",
        {
          type: "button",
          onClick: props.onResetView,
          title: "\u0110\u1EB7t l\u1EA1i t\u1EA7m nh\xECn",
          "aria-label": "\u0110\u1EB7t l\u1EA1i t\u1EA7m nh\xECn",
          className: "ml-auto inline-flex items-center justify-center rounded p-1 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900",
          children: /* @__PURE__ */ jsxRuntime.jsx(ResetViewIcon, {})
        }
      ),
      /* @__PURE__ */ jsxRuntime.jsx(
        "button",
        {
          type: "button",
          onClick: props.onUndo,
          disabled: !props.canUndo,
          title: "Ho\xE0n t\xE1c (Ctrl/Cmd+Z)",
          "aria-label": "Ho\xE0n t\xE1c",
          className: "inline-flex items-center justify-center rounded p-1 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent",
          children: /* @__PURE__ */ jsxRuntime.jsx(UndoIcon3, {})
        }
      )
    ] }) }),
    /* @__PURE__ */ jsxRuntime.jsx(Section4, { label: "C\xF4ng c\u1EE5", children: /* @__PURE__ */ jsxRuntime.jsx("div", { className: "grid grid-cols-4 gap-1", children: GRAPH_TOOLS.map((t) => {
      const isActive = props.activeTool === t.id;
      return /* @__PURE__ */ jsxRuntime.jsx(
        "button",
        {
          type: "button",
          "aria-label": t.title,
          title: t.title,
          "aria-pressed": isActive,
          onClick: () => props.onToolChange(t.id),
          "data-testid": `graph-tool-${t.id}`,
          className: [
            "flex h-8 items-center justify-center rounded-md transition",
            isActive ? "bg-orange-600 text-white shadow-sm" : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
          ].join(" "),
          children: TOOL_ICONS[t.id]
        },
        t.id
      );
    }) }) }),
    /* @__PURE__ */ jsxRuntime.jsx(Section4, { label: "H\xE0m s\u1ED1", children: /* @__PURE__ */ jsxRuntime.jsx(
      AlgebraView,
      {
        graph: props.graph,
        errors: props.errors,
        onAddFunctionDraft: props.onAddFunctionDraft,
        onCommitFunctionExpr: props.onCommitFunctionExpr,
        onToggleFunctionVisible: props.onToggleFunctionVisible,
        onRemoveFunction: props.onRemoveFunction,
        onParameterChange: props.onParameterChange,
        onParameterRangeChange: props.onParameterRangeChange,
        onRemoveParameter: props.onRemoveParameter
      }
    ) })
  ] });
}
function GraphLeftPanel(props) {
  const { isMobile, drawerOpen, isDark, onClose, onDrawerClose } = props;
  if (isMobile && !drawerOpen) return null;
  const handleClose = isMobile ? onDrawerClose : onClose;
  return /* @__PURE__ */ jsxRuntime.jsxs(
    "aside",
    {
      role: "complementary",
      "aria-label": "\u0110\u1ED3 th\u1ECB 2D",
      "data-testid": "graph-left-panel",
      "data-stamp-area": "true",
      className: [
        isDark ? "theme--dark " : "",
        isMobile ? "fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-white shadow-2xl animate-in slide-in-from-left duration-200" : "absolute left-0 top-0 z-30 flex h-full w-60 flex-col border-r border-slate-200 bg-white shadow-md animate-in slide-in-from-left duration-200"
      ].join(" "),
      children: [
        /* @__PURE__ */ jsxRuntime.jsxs("header", { className: "flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-3 py-2", children: [
          /* @__PURE__ */ jsxRuntime.jsxs("h3", { className: "flex items-center gap-2 text-sm font-semibold text-slate-800", children: [
            /* @__PURE__ */ jsxRuntime.jsx("span", { className: "text-base leading-none", children: GraphIconHeader }),
            "\u0110\u1ED3 th\u1ECB 2D"
          ] }),
          /* @__PURE__ */ jsxRuntime.jsx(
            "button",
            {
              onClick: handleClose,
              "aria-label": "\u0110\xF3ng",
              className: "rounded p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800",
              children: /* @__PURE__ */ jsxRuntime.jsx(CloseIcon3, {})
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntime.jsx("div", { className: "min-h-0 flex-1 overflow-y-auto p-3 space-y-4", children: /* @__PURE__ */ jsxRuntime.jsx(PanelBody, { ...props }) })
      ]
    }
  );
}
var GraphIconHeader, TOOL_ICONS;
var init_LeftPanel4 = __esm({
  "src/stamps/graph-2d/editor/LeftPanel.tsx"() {
    "use client";
    init_tools2();
    init_AlgebraView();
    GraphIconHeader = /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", children: [
      /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M3 21 V3" }),
      /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M3 21 H21" }),
      /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M5 19 C8 5, 14 5, 19 17" })
    ] });
    TOOL_ICONS = {
      move: /* @__PURE__ */ jsxRuntime.jsx(MoveIcon, {}),
      "point-on-curve": /* @__PURE__ */ jsxRuntime.jsx(PointOnCurveIcon, {}),
      intersect: /* @__PURE__ */ jsxRuntime.jsx(IntersectIcon, {}),
      tangent: /* @__PURE__ */ jsxRuntime.jsx(TangentIcon, {})
    };
  }
});
var init_theme3 = __esm({
  "src/stamps/graph-2d/editor/theme.ts"() {
  }
});
function MiniBoard({ graph, activeTool, isDark, onBoardEvent }) {
  const containerRef = React11.useRef(null);
  const boardRef = React11.useRef(null);
  const curvesRef = React11.useRef(/* @__PURE__ */ new Map());
  React11.useEffect(() => {
    let cancelled = false;
    let createdBoard = null;
    const containerEl = containerRef.current;
    if (!containerEl) return;
    const containerId = `jxg_graph2d_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    containerEl.id = containerId;
    (async () => {
      const JXG = (await import('jsxgraph')).default;
      if (cancelled) return;
      const opts = JXG.Options;
      if (opts) {
        opts.text = opts.text || {};
        opts.text.display = "internal";
        opts.label = opts.label || {};
        opts.label.display = "internal";
      }
      const board = JXG.JSXGraph.initBoard(containerId, {
        boundingbox: [graph.view.xMin, graph.view.yMax, graph.view.xMax, graph.view.yMin],
        axis: graph.view.showAxis,
        grid: graph.view.showGrid,
        showCopyright: false,
        showNavigation: true,
        pan: { enabled: true, needShift: false },
        zoom: { wheel: true, needShift: false },
        keepAspectRatio: false
      });
      boardRef.current = board;
      createdBoard = board;
      syncObjects(board, graph, curvesRef.current);
      board.on("boundingbox", () => {
        const bb = board.getBoundingBox();
        onBoardEvent({
          type: "view-change",
          view: {
            xMin: bb[0],
            xMax: bb[2],
            yMax: bb[1],
            yMin: bb[3],
            showAxis: graph.view.showAxis,
            showGrid: graph.view.showGrid
          }
        });
      });
      board.on("down", (ev) => {
        const usrCoords = board.getUsrCoordsOfMouse?.(ev);
        const x = usrCoords?.[0] ?? 0;
        const y = usrCoords?.[1] ?? 0;
        let functionId;
        for (const [id, ref] of curvesRef.current) {
          const obj = ref.obj;
          if (obj?.hasPoint && obj.hasPoint(ev.clientX ?? 0, ev.clientY ?? 0)) {
            functionId = id;
            break;
          }
        }
        if (functionId) onBoardEvent({ type: "click-curve", functionId, x, y });
        else onBoardEvent({ type: "click-empty", x, y });
      });
    })().catch((err) => console.error("MiniBoard init failed:", err));
    return () => {
      cancelled = true;
      try {
        if (createdBoard) __require("jsxgraph").default.JSXGraph.freeBoard(createdBoard);
      } catch {
      }
      boardRef.current = null;
      curvesRef.current.clear();
    };
  }, []);
  React11.useEffect(() => {
    if (!boardRef.current) return;
    syncObjects(boardRef.current, graph, curvesRef.current);
  }, [graph]);
  React11.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.style.cursor = activeTool === "move" ? "" : "crosshair";
  }, [activeTool]);
  return /* @__PURE__ */ jsxRuntime.jsx(
    "div",
    {
      ref: containerRef,
      className: "graph-miniboard",
      style: { width: "100%", height: "100%", minHeight: "300px" },
      "data-testid": "graph-miniboard"
    }
  );
}
function paramSig(graph) {
  return graph.parameters.map((p) => `${p.name}=${p.value}`).join(",");
}
function syncObjects(board, graph, curves) {
  const sig = paramSig(graph);
  const paramMap = {};
  for (const p of graph.parameters) paramMap[p.name] = p.value;
  const wantedIds = new Set(graph.functions.map((f) => f.id));
  for (const [id, ref] of curves) {
    if (!wantedIds.has(id)) {
      try {
        board.removeObject(ref.obj);
      } catch {
      }
      curves.delete(id);
    }
  }
  for (const f of graph.functions) {
    const existing = curves.get(f.id);
    const needsRecreate = !existing || existing.expression !== f.expression || existing.color !== f.color || existing.visible !== f.visible || existing.paramSignature !== sig;
    if (!needsRecreate) continue;
    if (existing) {
      try {
        board.removeObject(existing.obj);
      } catch {
      }
    }
    if (!f.visible) {
      curves.delete(f.id);
      continue;
    }
    const compiled = compile(f.expression, paramMap);
    if (typeof compiled !== "function") continue;
    const domain = f.domain ?? { min: graph.view.xMin, max: graph.view.xMax };
    const obj = board.create("functiongraph", [compiled, domain.min, domain.max], {
      strokeColor: f.color,
      strokeWidth: 2,
      name: f.name,
      withLabel: false,
      highlight: false
    });
    curves.set(f.id, {
      obj,
      expression: f.expression,
      color: f.color,
      visible: f.visible,
      paramSignature: sig
    });
  }
  for (const point of graph.points) {
    const fn = graph.functions.find((f) => f.id === point.functionId);
    if (!fn || !fn.visible) continue;
    const compiled = compile(fn.expression, paramMap);
    if (typeof compiled !== "function") continue;
    const y = compiled(point.x);
    board.create("point", [point.x, y], {
      name: point.label ?? "",
      size: 3,
      fillColor: fn.color,
      strokeColor: fn.color,
      withLabel: !!point.label
    });
  }
  for (const inter of graph.intersections) {
    const fa = graph.functions.find((f) => f.id === inter.functionIdA);
    const fb = graph.functions.find((f) => f.id === inter.functionIdB);
    if (!fa || !fb || !fa.visible || !fb.visible) continue;
    const cfa = compile(fa.expression, paramMap);
    const cfb = compile(fb.expression, paramMap);
    if (typeof cfa !== "function" || typeof cfb !== "function") continue;
    const roots = scanRoots2((x) => cfa(x) - cfb(x), graph.view.xMin, graph.view.xMax);
    for (const x of roots) {
      board.create("point", [x, cfa(x)], {
        size: 3,
        fillColor: "#000",
        strokeColor: "#000"
      });
    }
  }
  for (const tan of graph.tangents) {
    const pt = graph.points.find((p) => p.id === tan.pointId);
    if (!pt) continue;
    const fn = graph.functions.find((f) => f.id === pt.functionId);
    if (!fn || !fn.visible) continue;
    const slope = numericalDerivative(fn.expression, paramMap, pt.x);
    const cfn = compile(fn.expression, paramMap);
    if (typeof cfn !== "function" || !Number.isFinite(slope)) continue;
    const y0 = cfn(pt.x);
    const x1 = graph.view.xMin;
    const x2 = graph.view.xMax;
    board.create(
      "line",
      [
        [x1, slope * (x1 - pt.x) + y0],
        [x2, slope * (x2 - pt.x) + y0]
      ],
      {
        strokeColor: fn.color,
        strokeWidth: 1,
        dash: 2,
        straightFirst: false,
        straightLast: false
      }
    );
  }
  board.update();
}
function scanRoots2(fn, xMin, xMax, samples = 200) {
  const roots = [];
  const step = (xMax - xMin) / samples;
  let prevX = xMin;
  let prevY = fn(prevX);
  for (let i = 1; i <= samples; i++) {
    const x = xMin + i * step;
    const y = fn(x);
    if (Number.isFinite(prevY) && Number.isFinite(y) && prevY * y < 0) {
      let a = prevX;
      let b = x;
      let ya = prevY;
      for (let j = 0; j < 30; j++) {
        const m = (a + b) / 2;
        const ym = fn(m);
        if (Math.abs(ym) < 1e-6) {
          a = b = m;
          break;
        }
        if (ya * ym < 0) {
          b = m;
        } else {
          a = m;
          ya = ym;
        }
      }
      roots.push((a + b) / 2);
    }
    prevX = x;
    prevY = y;
  }
  return roots;
}
var init_MiniBoard2 = __esm({
  "src/stamps/graph-2d/editor/MiniBoard.tsx"() {
    "use client";
    init_parser();
    init_theme3();
    init_handlers2();
  }
});
var GraphEditorPanel;
var init_EditorPanel3 = __esm({
  "src/stamps/graph-2d/editor/EditorPanel.tsx"() {
    "use client";
    init_MiniBoard2();
    init_serialize3();
    init_parser();
    init_render3();
    init_colors();
    init_handlers2();
    GraphEditorPanel = React11.forwardRef(function GraphEditorPanel2(props, ref) {
      const initialGraph = props.initialState ?? EMPTY_GRAPH;
      const graphRef = React11.useRef(initialGraph);
      const [, forceUpdate] = React11.useState(0);
      const [errors, setErrors] = React11.useState({});
      const [tool, setToolState] = React11.useState("move");
      const undoStackRef = React11.useRef([]);
      const idCounterRef = React11.useRef(1);
      const toolRef = React11.useRef(tool);
      toolRef.current = tool;
      const intersectFirstRef = React11.useRef(null);
      const propsRef = React11.useRef(props);
      propsRef.current = props;
      const initialGraphNotifiedRef = React11.useRef(false);
      const pushUndo = React11.useCallback((g) => {
        undoStackRef.current.push(g);
        if (undoStackRef.current.length > 30) undoStackRef.current.shift();
      }, []);
      const setErrorsWithNotify = React11.useCallback(
        (updater) => {
          setErrors((prev) => {
            const next = updater(prev);
            propsRef.current.onErrorsChange?.(next);
            return next;
          });
        },
        []
      );
      const notifyStateChange = React11.useCallback((g, t) => {
        propsRef.current.onStateChange({
          tool: t,
          showAxis: g.view.showAxis,
          showGrid: g.view.showGrid,
          canUndo: undoStackRef.current.length > 0
        });
      }, []);
      const updateGraph = React11.useCallback(
        (mutator) => {
          const prev = graphRef.current;
          pushUndo(prev);
          const next = mutator(prev);
          graphRef.current = next;
          notifyStateChange(next, toolRef.current);
          forceUpdate((n) => n + 1);
          propsRef.current.onGraphChange?.(next);
        },
        [pushUndo, notifyStateChange]
      );
      const onBoardEvent = React11.useCallback((ev) => {
        const currentTool = toolRef.current;
        if (currentTool === "point-on-curve" && ev.type === "click-curve" && ev.functionId && ev.x !== void 0) {
          updateGraph(
            (g) => addPointOnCurve(
              g,
              { x: ev.x, y: ev.y ?? 0, functionId: ev.functionId },
              () => `p${idCounterRef.current++}`
            )
          );
          setToolState("move");
        } else if (currentTool === "intersect" && ev.type === "click-curve" && ev.functionId) {
          if (!intersectFirstRef.current) {
            intersectFirstRef.current = ev.functionId;
          } else {
            const a = intersectFirstRef.current;
            const b = ev.functionId;
            intersectFirstRef.current = null;
            updateGraph(
              (g) => addIntersection(g, a, b, () => `i${idCounterRef.current++}`)
            );
            setToolState("move");
          }
        } else if (currentTool === "tangent" && ev.type === "click-curve" && ev.functionId && ev.x !== void 0) {
          const pointId = `p${idCounterRef.current++}`;
          const tangentId = `t${idCounterRef.current++}`;
          updateGraph((g) => ({
            ...g,
            points: [...g.points, { id: pointId, functionId: ev.functionId, x: ev.x }],
            tangents: [...g.tangents, { id: tangentId, pointId }]
          }));
          setToolState("move");
        }
      }, [updateGraph]);
      React11.useImperativeHandle(
        ref,
        () => ({
          insert: () => {
            const g = graphRef.current;
            if (g.functions.length === 0) return false;
            const jsonState = stringifySerializedGraph(g);
            renderGraph2dSvgFromState(jsonState).then((svg) => propsRef.current.onInsert(jsonState, svg)).catch((err) => console.error("Graph2D insert render failed:", err));
            return true;
          },
          hasContent: () => graphRef.current.functions.length > 0,
          setTool: (t) => {
            setToolState(t);
            const g = graphRef.current;
            propsRef.current.onStateChange({
              tool: t,
              showAxis: g.view.showAxis,
              showGrid: g.view.showGrid,
              canUndo: undoStackRef.current.length > 0
            });
          },
          setShowAxis: (b) => updateGraph((g) => ({ ...g, view: { ...g.view, showAxis: b } })),
          setShowGrid: (b) => updateGraph((g) => ({ ...g, view: { ...g.view, showGrid: b } })),
          resetView: () => updateGraph((g) => ({
            ...g,
            view: { ...g.view, xMin: -10, xMax: 10, yMin: -10, yMax: 10 }
          })),
          undo: () => {
            const prev = undoStackRef.current.pop();
            if (!prev) return;
            graphRef.current = prev;
            forceUpdate((n) => n + 1);
            propsRef.current.onStateChange({
              tool: toolRef.current,
              showAxis: prev.view.showAxis,
              showGrid: prev.view.showGrid,
              canUndo: undoStackRef.current.length > 0
            });
            propsRef.current.onGraphChange?.(prev);
          },
          addFunction: (expr) => {
            const g = graphRef.current;
            if (g.functions.length >= MAX_FUNCTIONS) {
              return { ok: false, error: `T\u1ED1i \u0111a ${MAX_FUNCTIONS} h\xE0m` };
            }
            const v = validate(expr);
            if (!v.ok) return { ok: false, error: v.error ?? "Invalid" };
            const id = `f${idCounterRef.current++}`;
            const usedNames = g.functions.map((f) => f.name);
            const usedColors = g.functions.map((f) => f.color);
            const newFn = {
              id,
              name: nextFunctionName(usedNames),
              expression: expr,
              color: nextColor(usedColors),
              visible: true
            };
            const usedParamNames = new Set(g.parameters.map((p) => p.name));
            const newParams = [];
            for (const varName of v.freeVars) {
              if (usedParamNames.has(varName)) continue;
              if (g.parameters.length + newParams.length >= MAX_PARAMETERS) break;
              newParams.push({ name: varName, value: 1, min: -5, max: 5, step: 0.1 });
            }
            updateGraph((prev) => ({
              ...prev,
              functions: [...prev.functions, newFn],
              parameters: [...prev.parameters, ...newParams]
            }));
            setErrorsWithNotify((e) => ({ ...e, [id]: null }));
            return { ok: true, id };
          },
          commitFunctionExpression: (id, expr) => {
            const g = graphRef.current;
            const v = validate(expr);
            if (!v.ok) {
              setErrorsWithNotify((e) => ({ ...e, [id]: v.error ?? "Invalid" }));
              return;
            }
            const usedParamNames = new Set(g.parameters.map((p) => p.name));
            const newParams = [];
            for (const varName of v.freeVars) {
              if (usedParamNames.has(varName)) continue;
              if (g.parameters.length + newParams.length >= MAX_PARAMETERS) break;
              newParams.push({ name: varName, value: 1, min: -5, max: 5, step: 0.1 });
            }
            updateGraph((prev) => ({
              ...prev,
              functions: prev.functions.map(
                (f) => f.id === id ? { ...f, expression: expr } : f
              ),
              parameters: [...prev.parameters, ...newParams]
            }));
            setErrorsWithNotify((e) => ({ ...e, [id]: null }));
          },
          toggleFunctionVisible: (id) => updateGraph((g) => ({
            ...g,
            functions: g.functions.map(
              (f) => f.id === id ? { ...f, visible: !f.visible } : f
            )
          })),
          removeFunction: (id) => updateGraph((g) => ({
            ...g,
            functions: g.functions.filter((f) => f.id !== id)
          })),
          // setParameter does NOT push undo — would flood the stack (slider drag)
          setParameter: (name, value) => {
            const next = {
              ...graphRef.current,
              parameters: graphRef.current.parameters.map(
                (p) => p.name === name ? { ...p, value } : p
              )
            };
            graphRef.current = next;
            forceUpdate((n) => n + 1);
            propsRef.current.onGraphChange?.(next);
          },
          setParameterRange: (name, min, max, step) => updateGraph((g) => ({
            ...g,
            parameters: g.parameters.map(
              (p) => p.name === name ? { ...p, min, max, step, value: Math.min(max, Math.max(min, p.value)) } : p
            )
          })),
          removeParameter: (name) => updateGraph((g) => ({
            ...g,
            parameters: g.parameters.filter((p) => p.name !== name)
          })),
          getGraph: () => graphRef.current,
          getErrors: () => errors
        }),
        // deps: updateGraph stable; errors changes when function errors change; setErrorsWithNotify stable
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [updateGraph, errors, setErrorsWithNotify]
      );
      React11.useEffect(() => {
        if (!initialGraphNotifiedRef.current) {
          initialGraphNotifiedRef.current = true;
          propsRef.current.onGraphChange?.(graphRef.current);
        }
      }, []);
      const graph = graphRef.current;
      const hasContent = graph.functions.length > 0;
      const handleInsert = () => {
        const g = graphRef.current;
        if (g.functions.length === 0) return;
        const jsonState = stringifySerializedGraph(g);
        renderGraph2dSvgFromState(jsonState).then((svg) => propsRef.current.onInsert(jsonState, svg)).catch((err) => console.error("Graph2D insert render failed:", err));
      };
      const { isMobile, isDark, withLeftPanel } = props;
      const wrapperStyle = isMobile ? { position: "fixed", inset: 0, zIndex: 40 } : {
        position: "absolute",
        top: "50%",
        left: withLeftPanel ? "calc(50% + 120px)" : "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 40
      };
      return /* @__PURE__ */ jsxRuntime.jsxs(
        "div",
        {
          role: "dialog",
          "aria-label": "\u0110\u1ED3 th\u1ECB 2D",
          "data-testid": "graph-editor-panel",
          "data-stamp-area": "true",
          "data-mobile-editor": isMobile ? "true" : void 0,
          style: wrapperStyle,
          className: [
            isDark ? "theme--dark " : "",
            "flex flex-col overflow-hidden bg-white",
            isMobile ? "h-full w-full" : "h-[540px] max-h-[85vh] w-[640px] max-w-[calc(100vw-280px)] rounded-lg border border-slate-300 shadow-2xl ring-1 ring-black/5"
          ].join(" "),
          children: [
            /* @__PURE__ */ jsxRuntime.jsxs("header", { className: "flex items-center gap-2 border-b border-slate-200 bg-gradient-to-r from-orange-500 to-amber-600 px-3 py-2 text-white", children: [
              isMobile && /* @__PURE__ */ jsxRuntime.jsx(
                "button",
                {
                  type: "button",
                  onClick: props.onOpenDrawer,
                  "aria-label": "M\u1EDF b\u1EA3ng \u0111\u1EA1i s\u1ED1",
                  "data-testid": "graph-drawer-toggle",
                  className: "-ml-1 inline-flex h-10 w-10 items-center justify-center rounded transition hover:bg-white/15",
                  children: /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
                    /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "4", y1: "6", x2: "20", y2: "6" }),
                    /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "4", y1: "12", x2: "20", y2: "12" }),
                    /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "4", y1: "18", x2: "20", y2: "18" })
                  ] })
                }
              ),
              /* @__PURE__ */ jsxRuntime.jsxs("h3", { className: "flex flex-1 items-center gap-2 text-sm font-semibold", children: [
                /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
                  /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M3 21 V3" }),
                  /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M3 21 H21" }),
                  /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M5 19 C8 5, 14 5, 19 17" })
                ] }),
                "\u0110\u1ED3 th\u1ECB 2D"
              ] }),
              isMobile && /* @__PURE__ */ jsxRuntime.jsx(
                "button",
                {
                  type: "button",
                  onClick: handleInsert,
                  disabled: !hasContent,
                  "data-testid": "graph-insert-btn-mobile",
                  className: "rounded bg-white/15 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/25 disabled:opacity-50",
                  children: "Ch\xE8n"
                }
              ),
              /* @__PURE__ */ jsxRuntime.jsx(
                "button",
                {
                  onClick: props.onClose,
                  "aria-label": "\u0110\xF3ng",
                  className: "inline-flex h-9 w-9 items-center justify-center rounded transition hover:bg-white/15",
                  children: /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
                    /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" }),
                    /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" })
                  ] })
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntime.jsx("div", { className: "min-h-0 flex-1", children: /* @__PURE__ */ jsxRuntime.jsx(
              MiniBoard,
              {
                graph,
                activeTool: tool,
                isDark,
                onBoardEvent
              }
            ) }),
            !isMobile && /* @__PURE__ */ jsxRuntime.jsxs("footer", { className: "flex items-center justify-between border-t border-slate-200 bg-slate-50 px-3 py-2", children: [
              /* @__PURE__ */ jsxRuntime.jsx("span", { className: "text-xs text-slate-500", children: "Nh\u1EADp bi\u1EC3u th\u1EE9c trong b\u1EA3ng \u0111\u1EA1i s\u1ED1 b\xEAn tr\xE1i." }),
              /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "flex gap-2", children: [
                /* @__PURE__ */ jsxRuntime.jsx(
                  "button",
                  {
                    onClick: props.onClose,
                    className: "rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100",
                    children: "Hu\u1EF7"
                  }
                ),
                /* @__PURE__ */ jsxRuntime.jsx(
                  "button",
                  {
                    onClick: handleInsert,
                    disabled: !hasContent,
                    "data-testid": "graph-insert-btn",
                    className: "rounded bg-orange-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-orange-700 disabled:opacity-50",
                    children: "Ch\xE8n"
                  }
                )
              ] })
            ] })
          ]
        }
      );
    });
  }
});

// src/stamps/graph-2d/host.tsx
var host_exports4 = {};
__export(host_exports4, {
  Graph2DStampHost: () => Graph2DStampHost
});
var INITIAL_GRAPH_STATE, Graph2DStampHost;
var init_host4 = __esm({
  "src/stamps/graph-2d/host.tsx"() {
    "use client";
    init_LeftPanel4();
    init_EditorPanel3();
    init_insertImage();
    init_serialize3();
    init_useIsMobile();
    init_types3();
    INITIAL_GRAPH_STATE = {
      tool: "move",
      showAxis: true,
      showGrid: true,
      canUndo: false
    };
    Graph2DStampHost = React11.forwardRef(
      function Graph2DStampHost2({ api, editingElement, onClose, isDark }, ref) {
        const panelRef = React11.useRef(null);
        const [graphUIState, setGraphUIState] = React11.useState(INITIAL_GRAPH_STATE);
        const { isMobile } = useIsMobile();
        const [drawerOpen, setDrawerOpen] = React11.useState(false);
        const initialState = React11.useMemo(() => {
          if (!editingElement) return null;
          if (!isGraph2DCustomData(editingElement.customData)) return null;
          return parseSerializedGraph(editingElement.customData.jsonState);
        }, [editingElement]);
        const [graphSnapshot, setGraphSnapshot] = React11.useState(
          initialState ?? EMPTY_GRAPH
        );
        const [errorsSnapshot, setErrorsSnapshot] = React11.useState({});
        const handleInsert = React11.useCallback(
          async (jsonState, svgString) => {
            if (!api) return;
            try {
              await insertStampImage(api, {
                svgString,
                makeCustomData: (width, height) => ({
                  kind: "graph2d",
                  version: 1,
                  jsonState,
                  svgWidth: width,
                  svgHeight: height
                }),
                editingElementId: editingElement?.id ?? null
              });
            } catch (err) {
              console.error("Graph2D insert failed:", err);
            }
            onClose();
          },
          [api, editingElement?.id, onClose]
        );
        React11.useImperativeHandle(
          ref,
          () => ({
            tryInsert: () => panelRef.current?.insert() ?? false,
            hasContent: () => panelRef.current?.hasContent() ?? false
          }),
          []
        );
        return /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
          /* @__PURE__ */ jsxRuntime.jsx(
            GraphLeftPanel,
            {
              activeTool: graphUIState.tool,
              onToolChange: (t) => panelRef.current?.setTool(t),
              showAxis: graphUIState.showAxis,
              showGrid: graphUIState.showGrid,
              onShowAxisChange: (b) => panelRef.current?.setShowAxis(b),
              onShowGridChange: (b) => panelRef.current?.setShowGrid(b),
              onResetView: () => panelRef.current?.resetView(),
              onUndo: () => panelRef.current?.undo(),
              canUndo: graphUIState.canUndo,
              onClose,
              isDark,
              isMobile,
              drawerOpen,
              onDrawerClose: () => setDrawerOpen(false),
              graph: graphSnapshot,
              errors: errorsSnapshot,
              onAddFunctionDraft: () => {
                const result = panelRef.current?.addFunction("x");
                if (result && !result.ok) console.warn("addFunction failed:", result.error);
              },
              onCommitFunctionExpr: (id, expr) => panelRef.current?.commitFunctionExpression(id, expr),
              onToggleFunctionVisible: (id) => panelRef.current?.toggleFunctionVisible(id),
              onRemoveFunction: (id) => panelRef.current?.removeFunction(id),
              onParameterChange: (name, v) => panelRef.current?.setParameter(name, v),
              onParameterRangeChange: (name, min, max, step) => panelRef.current?.setParameterRange(name, min, max, step),
              onRemoveParameter: (name) => panelRef.current?.removeParameter(name)
            }
          ),
          /* @__PURE__ */ jsxRuntime.jsx(
            GraphEditorPanel,
            {
              ref: panelRef,
              initialState,
              onInsert: handleInsert,
              onClose,
              onStateChange: setGraphUIState,
              onGraphChange: setGraphSnapshot,
              onErrorsChange: setErrorsSnapshot,
              withLeftPanel: !isMobile,
              isDark,
              isMobile,
              onOpenDrawer: () => setDrawerOpen(true)
            }
          )
        ] });
      }
    );
  }
});

// src/ExcalidrawWithMenus.tsx
var ExcalidrawWithMenus_exports = {};
__export(ExcalidrawWithMenus_exports, {
  ExcalidrawWithMenus: () => ExcalidrawWithMenus
});
function ExcalidrawWithMenus(props) {
  const { children, ...rest } = props;
  return /* @__PURE__ */ jsxRuntime.jsxs(excalidraw.Excalidraw, { ...rest, children: [
    /* @__PURE__ */ jsxRuntime.jsxs(excalidraw.MainMenu, { children: [
      /* @__PURE__ */ jsxRuntime.jsx(excalidraw.MainMenu.DefaultItems.LoadScene, {}),
      /* @__PURE__ */ jsxRuntime.jsx(excalidraw.MainMenu.DefaultItems.SaveAsImage, {}),
      /* @__PURE__ */ jsxRuntime.jsx(excalidraw.MainMenu.DefaultItems.ClearCanvas, {}),
      /* @__PURE__ */ jsxRuntime.jsx(excalidraw.MainMenu.DefaultItems.ToggleTheme, {})
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx(excalidraw.Footer, { children: /* @__PURE__ */ jsxRuntime.jsx("span", {}) }),
    /* @__PURE__ */ jsxRuntime.jsx(excalidraw.WelcomeScreen, { children: /* @__PURE__ */ jsxRuntime.jsx("span", {}) }),
    children
  ] });
}
var init_ExcalidrawWithMenus = __esm({
  "src/ExcalidrawWithMenus.tsx"() {
    "use client";
  }
});

// src/serialize.ts
function pickSyncableAppState(s) {
  return {
    viewBackgroundColor: s.viewBackgroundColor,
    zoom: s.zoom,
    scrollX: s.scrollX,
    scrollY: s.scrollY,
    gridSize: s.gridSize ?? null,
    theme: s.theme
  };
}

// src/stamps/geometry-2d/index.tsx
init_render();
init_types();
var GeometryStampHost3 = React11.lazy(
  () => Promise.resolve().then(() => (init_host(), host_exports)).then((m) => ({ default: m.GeometryStampHost }))
);
var GeometryIcon = /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [
  /* @__PURE__ */ jsxRuntime.jsx("polygon", { points: "4,20 20,20 12,5" }),
  /* @__PURE__ */ jsxRuntime.jsx("circle", { cx: "4", cy: "20", r: "1.4", fill: "currentColor", stroke: "none" }),
  /* @__PURE__ */ jsxRuntime.jsx("circle", { cx: "20", cy: "20", r: "1.4", fill: "currentColor", stroke: "none" }),
  /* @__PURE__ */ jsxRuntime.jsx("circle", { cx: "12", cy: "5", r: "1.4", fill: "currentColor", stroke: "none" })
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
  Host: GeometryStampHost3
};

// src/stamps/latex/index.tsx
init_render2();
init_types2();
var LatexStampHost3 = React11.lazy(
  () => Promise.resolve().then(() => (init_host2(), host_exports2)).then((m) => ({ default: m.LatexStampHost }))
);
var LatexIcon = /* @__PURE__ */ jsxRuntime.jsx("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M17 5 H7 L13 12 L7 19 H17" }) });
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
  Host: LatexStampHost3
};

// src/stamps/geometry-3d/index.tsx
init_serialize2();

// src/stamps/geometry-3d/render.ts
init_serialize2();
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
var Geometry3DStampHost3 = React11.lazy(
  () => Promise.resolve().then(() => (init_host3(), host_exports3)).then((m) => ({ default: m.Geometry3DStampHost }))
);
var Geometry3DIcon = /* @__PURE__ */ jsxRuntime.jsxs(
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
      /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M4 9 L4 20 L14 20 L14 9 Z" }),
      /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M4 9 L10 4 L20 4 L14 9 Z" }),
      /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M14 9 L20 4 L20 15 L14 20 Z" })
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
  Host: Geometry3DStampHost3
};

// src/stamps/graph-2d/index.tsx
init_render3();
init_types3();
var Graph2DStampHost3 = React11.lazy(
  () => Promise.resolve().then(() => (init_host4(), host_exports4)).then((m) => ({ default: m.Graph2DStampHost }))
);
var Graph2DIcon = /* @__PURE__ */ jsxRuntime.jsxs(
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
      /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M3 21 V3" }),
      /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M3 21 H21" }),
      /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M5 19 C8 5, 14 5, 19 17" })
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
  Host: Graph2DStampHost3
};

// src/stamps/shared/registry.ts
var STABLE_STAMPS = Object.freeze([
  geometryStamp,
  latexStamp
]);
var EXPERIMENTAL_STAMPS = Object.freeze([
  geometry3dStamp,
  graph2dStamp
]);
var ALL_STAMPS = Object.freeze([
  ...STABLE_STAMPS,
  ...EXPERIMENTAL_STAMPS
]);
var DEFAULT_STAMPS = ALL_STAMPS;
function findStampForCustomData(data, stamps = DEFAULT_STAMPS) {
  for (const s of stamps) {
    if (s.matchesCustomData(data)) return s;
  }
  return null;
}
function isStampElement(element, stamps = DEFAULT_STAMPS) {
  return findStampForCustomData(element.customData, stamps) !== null;
}
var MENU_WRAPPER_ID = "stamp-menu-portal-wrapper";
var POPOVER_SELECTOR = ".App-toolbar__extra-tools-dropdown .dropdown-menu-container";
function ToolbarInjector({
  enabled,
  activeStampKind,
  onToggle,
  stamps = DEFAULT_STAMPS
}) {
  const [menuMount, setMenuMount] = React11.useState(null);
  const menuMountRef = React11.useRef(null);
  React11.useEffect(() => {
    if (!enabled) {
      if (menuMountRef.current !== null) {
        menuMountRef.current = null;
        setMenuMount(null);
      }
      document.getElementById(MENU_WRAPPER_ID)?.remove();
      return;
    }
    let cancelled = false;
    let observer = null;
    let rafId = null;
    const apply = (next) => {
      if (cancelled || menuMountRef.current === next) return;
      menuMountRef.current = next;
      queueMicrotask(() => {
        if (!cancelled) setMenuMount(next);
      });
    };
    const findMenu = () => {
      if (cancelled) return;
      const container = document.querySelector(POPOVER_SELECTOR);
      if (!container) {
        apply(null);
        return;
      }
      let wrapper = container.querySelector("#" + MENU_WRAPPER_ID);
      if (!wrapper) {
        wrapper = document.createElement("div");
        wrapper.id = MENU_WRAPPER_ID;
        wrapper.setAttribute("data-stamp-menu", "true");
        wrapper.setAttribute("data-stamp-area", "true");
        wrapper.style.display = "contents";
        container.insertBefore(wrapper, container.firstChild);
      }
      apply(wrapper);
    };
    const schedule = () => {
      if (rafId != null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        findMenu();
      });
    };
    findMenu();
    const root = document.querySelector(".excalidraw") ?? document.body;
    observer = new MutationObserver(schedule);
    observer.observe(root, { childList: true, subtree: true });
    return () => {
      cancelled = true;
      if (rafId != null) cancelAnimationFrame(rafId);
      observer?.disconnect();
      document.getElementById(MENU_WRAPPER_ID)?.remove();
    };
  }, [enabled]);
  if (!enabled || !menuMount) return null;
  const closePopover = () => {
    const trigger = document.querySelector(
      ".App-toolbar__extra-tools-trigger"
    );
    trigger?.click();
  };
  return reactDom.createPortal(
    /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
      stamps.map((stamp) => /* @__PURE__ */ jsxRuntime.jsx(
        StampMenuItem,
        {
          icon: stamp.toolbarIcon,
          label: stamp.toolbarTitle,
          active: activeStampKind === stamp.kind,
          onClick: () => {
            onToggle(stamp.kind);
            closePopover();
          },
          dataTestId: stamp.toolbarTestId
        },
        stamp.kind
      )),
      /* @__PURE__ */ jsxRuntime.jsx(
        "div",
        {
          "aria-hidden": "true",
          style: {
            height: 1,
            background: "var(--default-border-color, rgba(0,0,0,0.08))",
            margin: "6px 4px"
          }
        }
      )
    ] }),
    menuMount
  );
}
function StampMenuItem({ icon, label, active, onClick, dataTestId }) {
  const className = [
    "dropdown-menu-item",
    "dropdown-menu-item-base",
    active ? "dropdown-menu-item--selected" : ""
  ].filter(Boolean).join(" ");
  return /* @__PURE__ */ jsxRuntime.jsxs(
    "button",
    {
      type: "button",
      onClick,
      "aria-label": label,
      "aria-pressed": active,
      "data-testid": dataTestId,
      className,
      style: {
        display: "flex",
        alignItems: "center",
        columnGap: "0.625rem",
        width: "100%",
        boxSizing: "border-box",
        background: "transparent",
        border: "1px solid transparent",
        cursor: "pointer",
        fontFamily: "inherit",
        fontSize: "0.875rem",
        color: "var(--color-on-surface)"
      },
      children: [
        /* @__PURE__ */ jsxRuntime.jsx(
          "span",
          {
            "aria-hidden": "true",
            style: {
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "1rem",
              height: "1rem"
            },
            children: icon
          }
        ),
        /* @__PURE__ */ jsxRuntime.jsx("span", { children: label })
      ]
    }
  );
}
function isEditableTarget(t) {
  if (!t || !(t instanceof HTMLElement)) return false;
  if (t.isContentEditable) return true;
  const tag = t.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}
function useShortcuts({
  enabled,
  onToggle,
  stamps = DEFAULT_STAMPS
}) {
  React11.useEffect(() => {
    if (!enabled) return;
    const keyToKind = /* @__PURE__ */ new Map();
    for (const s of stamps) keyToKind.set(s.shortcutKey, s.kind);
    const handler = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isEditableTarget(e.target)) return;
      const key = e.key.toLowerCase();
      const kind = keyToKind.get(key);
      if (!kind) return;
      e.preventDefault();
      e.stopPropagation();
      onToggle(kind);
    };
    window.addEventListener("keydown", handler, { capture: true });
    return () => window.removeEventListener("keydown", handler, { capture: true });
  }, [enabled, onToggle, stamps]);
}
var DOUBLE_CLICK_MS = 400;
function useStampDoubleClick({ enabled, stamps, onOpen }) {
  const lastClickRef = React11.useRef({
    time: 0,
    elementId: null
  });
  return React11.useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (_activeTool, pointerDownState) => {
      if (!enabled) return;
      const hitElement = pointerDownState?.hit?.element;
      if (!hitElement || hitElement.type !== "image") return;
      const stamp = findStampForCustomData(hitElement.customData, stamps);
      if (!stamp) return;
      const now = Date.now();
      const isDouble = lastClickRef.current.elementId === hitElement.id && now - lastClickRef.current.time < DOUBLE_CLICK_MS;
      lastClickRef.current = { time: now, elementId: hitElement.id };
      if (!isDouble) return;
      onOpen(stamp.kind, {
        id: hitElement.id,
        customData: hitElement.customData
      });
    },
    [enabled, stamps, onOpen]
  );
}
var ALLOWED_KEYS = /* @__PURE__ */ new Set([
  "Tab",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Shift",
  "Control",
  "Alt",
  "Meta",
  "CapsLock",
  "Home",
  "End",
  "PageUp",
  "PageDown"
]);
function isEditable(el) {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}
function useStampShortcutBlocker({ activeStamp, stamps }) {
  const shortcutKeys = React11.useMemo(
    () => new Set(stamps.map((s) => s.shortcutKey.toLowerCase())),
    [stamps]
  );
  React11.useEffect(() => {
    if (!activeStamp) return;
    const blocker = (e) => {
      if (isEditable(e.target)) return;
      if (e.ctrlKey || e.metaKey) return;
      if (ALLOWED_KEYS.has(e.key)) return;
      if (e.key === "Escape") return;
      if (shortcutKeys.has(e.key.toLowerCase())) return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("keydown", blocker, { capture: true });
    return () => window.removeEventListener("keydown", blocker, { capture: true });
  }, [activeStamp, shortcutKeys]);
}
function useStampClickOutside({ activeStamp, hostRef, onClose }) {
  React11.useEffect(() => {
    if (!activeStamp) return;
    let lastFire = 0;
    const handler = (e) => {
      const target = e.target;
      if (!target) return;
      if (target.closest('[data-stamp-area="true"]')) return;
      const now = Date.now();
      if (now - lastFire < 50) return;
      lastFire = now;
      hostRef.current?.tryInsert();
      onClose();
    };
    window.addEventListener("pointerdown", handler, { capture: true });
    window.addEventListener("mousedown", handler, { capture: true });
    return () => {
      window.removeEventListener("pointerdown", handler, { capture: true });
      window.removeEventListener("mousedown", handler, { capture: true });
    };
  }, [activeStamp, hostRef, onClose]);
}

// src/stamps/shared/restoreStampFiles.ts
function svgToDataURL(svg) {
  const utf8 = unescape(encodeURIComponent(svg));
  return "data:image/svg+xml;base64," + btoa(utf8);
}
async function buildFileForStamp(fileId, customData, stamp) {
  try {
    const svg = await stamp.renderSvgFromCustomData(customData);
    return { id: fileId, dataURL: svgToDataURL(svg), mimeType: "image/svg+xml", created: Date.now() };
  } catch (err) {
    console.warn("Stamp restore failed for", fileId, "(" + stamp.kind + ")", err);
    return null;
  }
}
async function restoreMissingStampFiles(api, elements, stamps = DEFAULT_STAMPS) {
  if (!api) return;
  const filesToAdd = [];
  const newPathHandled = /* @__PURE__ */ new Set();
  for (const el of elements) {
    const stamp = findStampForCustomData(el.customData, stamps);
    if (!stamp?.restoreFileFromCustomData) continue;
    const restored = await stamp.restoreFileFromCustomData(el);
    if (!restored) continue;
    newPathHandled.add(el.id);
    filesToAdd.push({
      id: restored.fileId,
      dataURL: restored.dataURL,
      mimeType: restored.mimeType,
      created: Date.now()
    });
  }
  const existing = typeof api.getFiles === "function" ? api.getFiles() : {};
  const seen = /* @__PURE__ */ new Set();
  for (const el of elements) {
    if (newPathHandled.has(el.id)) continue;
    if (el.type !== "image") continue;
    if (!el.fileId) continue;
    if (existing && existing[el.fileId]) continue;
    if (seen.has(el.fileId)) continue;
    const stamp = findStampForCustomData(el.customData, stamps);
    if (!stamp) continue;
    seen.add(el.fileId);
    const built = await buildFileForStamp(el.fileId, el.customData, stamp);
    if (built) filesToAdd.push(built);
  }
  if (filesToAdd.length > 0) {
    try {
      api.addFiles(filesToAdd);
    } catch (err) {
      console.warn("addFiles failed:", err);
    }
  }
}

// src/core/persistence/sceneStore.ts
var PREFIX2 = "whiteboard:scene:";
var SCHEMA_VERSION = 1;
function fullKey(key) {
  return PREFIX2 + key;
}
function readScene(key) {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(fullKey(key));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.version !== SCHEMA_VERSION) {
      console.warn(
        `[whiteboard] scene version ${parsed.version} kh\xF4ng kh\u1EDBp ${SCHEMA_VERSION}, b\u1ECF qua.`
      );
      return null;
    }
    if (!Array.isArray(parsed.elements)) return null;
    return {
      version: SCHEMA_VERSION,
      elements: parsed.elements,
      appState: parsed.appState ?? {},
      savedAt: typeof parsed.savedAt === "number" ? parsed.savedAt : Date.now()
    };
  } catch (err) {
    console.warn("[whiteboard] scene parse error, clear:", err);
    try {
      window.localStorage.removeItem(fullKey(key));
    } catch {
    }
    return null;
  }
}
function writeScene(key, payload) {
  if (typeof window === "undefined") return;
  const record = {
    version: SCHEMA_VERSION,
    elements: payload.elements,
    appState: payload.appState,
    savedAt: Date.now()
  };
  try {
    window.localStorage.setItem(fullKey(key), JSON.stringify(record));
  } catch (err) {
    console.warn("[whiteboard] scene write failed:", err);
  }
}

// src/core/persistence/fileStore.ts
var DB_NAME = "whiteboard-files";
var DB_VERSION = 1;
var STORE = "files";
var dbPromise = null;
var idbDisabled = false;
function openDb() {
  if (idbDisabled) return Promise.reject(new Error("IndexedDB disabled"));
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      idbDisabled = true;
      reject(new Error("indexedDB undefined"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("storageKey", "storageKey", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      idbDisabled = true;
      reject(req.error ?? new Error("IDB open failed"));
    };
  });
  return dbPromise;
}
async function withStore(mode, fn, fallback) {
  let db;
  try {
    db = await openDb();
  } catch {
    return fallback;
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    let result = fallback;
    try {
      fn(
        store,
        (value) => {
          result = value;
        },
        reject
      );
    } catch (err) {
      reject(err);
      return;
    }
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => {
      console.warn("[whiteboard] IDB tx error:", tx.error);
      reject(tx.error ?? new Error("IDB tx error"));
    };
    tx.onabort = () => reject(tx.error ?? new Error("IDB tx aborted"));
  });
}
async function readFiles(storageKey) {
  try {
    return await withStore(
      "readonly",
      (store, setResult, fail) => {
        const out = {};
        const req = store.index("storageKey").openCursor(IDBKeyRange.only(storageKey));
        req.onsuccess = () => {
          const cursor = req.result;
          if (!cursor) {
            setResult(out);
            return;
          }
          const record = cursor.value;
          out[record.id] = {
            dataURL: record.dataURL,
            mimeType: record.mimeType,
            created: record.created
          };
          cursor.continue();
        };
        req.onerror = () => fail(req.error);
      },
      {}
    );
  } catch (err) {
    console.warn("[whiteboard] readFiles failed:", err);
    return {};
  }
}
async function writeFiles(storageKey, files) {
  const entries = Object.entries(files);
  if (entries.length === 0) return;
  try {
    await withStore(
      "readwrite",
      (store, setResult, fail) => {
        let pending = entries.length;
        const finishOne = () => {
          pending -= 1;
          if (pending === 0) setResult(void 0);
        };
        const now = Date.now();
        for (const [id, f] of entries) {
          const ff = f;
          const getReq = store.get(id);
          getReq.onsuccess = () => {
            if (getReq.result) {
              finishOne();
              return;
            }
            const rec = {
              id,
              storageKey,
              dataURL: ff.dataURL,
              mimeType: ff.mimeType,
              created: ff.created ?? now,
              savedAt: now
            };
            const putReq = store.put(rec);
            putReq.onsuccess = finishOne;
            putReq.onerror = () => fail(putReq.error);
          };
          getReq.onerror = () => fail(getReq.error);
        }
        ;
      },
      void 0
    );
  } catch (err) {
    console.warn("[whiteboard] writeFiles failed:", err);
  }
}
async function pruneFiles(storageKey, keepIds) {
  try {
    await withStore(
      "readwrite",
      (store, setResult, fail) => {
        const req = store.index("storageKey").openCursor(IDBKeyRange.only(storageKey));
        req.onsuccess = () => {
          const cursor = req.result;
          if (!cursor) {
            setResult(void 0);
            return;
          }
          const record = cursor.value;
          if (keepIds.has(record.id)) {
            cursor.continue();
            return;
          }
          const deleteReq = cursor.delete();
          deleteReq.onsuccess = () => cursor.continue();
          deleteReq.onerror = () => fail(deleteReq.error);
        };
        req.onerror = () => fail(req.error);
      },
      void 0
    );
  } catch (err) {
    console.warn("[whiteboard] pruneFiles failed:", err);
  }
}
var Excalidraw2 = React11.lazy(
  () => Promise.resolve().then(() => (init_ExcalidrawWithMenus(), ExcalidrawWithMenus_exports)).then((m) => ({ default: m.ExcalidrawWithMenus }))
);
var ExcalidrawLoadingFallback = () => /* @__PURE__ */ jsxRuntime.jsx("div", { className: "flex h-full items-center justify-center text-sm text-gray-500", children: "\u0110ang t\u1EA3i b\u1EA3ng\u2026" });
var SYNC_THROTTLE_MS = 200;
function Whiteboard({
  storageKey = "default",
  readOnly = false,
  onSceneChange,
  onFilesChange,
  onApi,
  langCode = "vi-VN",
  stamps = DEFAULT_STAMPS
}) {
  const [api, setApi] = React11.useState(null);
  const apiRef = React11.useRef(null);
  const [isDarkTheme, setIsDarkTheme] = React11.useState(false);
  const isDarkThemeRef = React11.useRef(false);
  const knownFileIdsRef = React11.useRef(/* @__PURE__ */ new Set());
  const lastSceneHashRef = React11.useRef("");
  const sceneThrottleRef = React11.useRef(null);
  const fileThrottleRef = React11.useRef(null);
  const pruneThrottleRef = React11.useRef(null);
  const latestSceneRef = React11.useRef(null);
  const pendingFilesRef = React11.useRef({});
  const persistEnabled = typeof storageKey === "string" && storageKey.length > 0;
  const persistKeyRef = React11.useRef(storageKey);
  persistKeyRef.current = storageKey;
  const persistedInitial = React11.useMemo(
    () => persistEnabled ? readScene(storageKey) : null,
    [persistEnabled, storageKey]
  );
  const effectiveInitialScene = persistedInitial ? {
    elements: persistedInitial.elements,
    appState: persistedInitial.appState
  } : null;
  const [activeStamp, setActiveStamp] = React11.useState(null);
  const activeStampRef = React11.useRef(activeStamp);
  activeStampRef.current = activeStamp;
  const [editingElement, setEditingElement] = React11.useState(null);
  const hostRef = React11.useRef(null);
  const handledCropIdRef = React11.useRef(null);
  const prevExcalidrawToolRef = React11.useRef("selection");
  const stampByKind = React11.useMemo(() => {
    const m = /* @__PURE__ */ new Map();
    for (const s of stamps) m.set(s.kind, s);
    return m;
  }, [stamps]);
  const activeStampDef = activeStamp ? stampByKind.get(activeStamp) ?? null : null;
  const HostComponent = activeStampDef?.Host ?? null;
  const openStamp = React11.useCallback(
    (kind, element = null) => {
      if (readOnly) return;
      if (!stampByKind.has(kind)) return;
      setEditingElement(element);
      setActiveStamp(kind);
    },
    [readOnly, stampByKind]
  );
  const closeStamp = React11.useCallback(() => {
    setActiveStamp(null);
    setEditingElement(null);
  }, []);
  const toggleStampByKind = React11.useCallback(
    (kind) => {
      if (activeStamp === kind) closeStamp();
      else openStamp(kind);
    },
    [activeStamp, openStamp, closeStamp]
  );
  const handleChange = React11.useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (elements, appState, files) => {
      const nextDark = appState?.theme === "dark";
      if (isDarkThemeRef.current !== nextDark) {
        isDarkThemeRef.current = nextDark;
        queueMicrotask(() => setIsDarkTheme(nextDark));
      }
      if (readOnly) return;
      latestSceneRef.current = { elements, appState };
      const cropId = appState?.croppingElementId;
      if (cropId && cropId !== handledCropIdRef.current && api) {
        const el = elements.find((e) => e.id === cropId);
        if (el) {
          const stamp = findStampForCustomData(el.customData, stamps);
          if (stamp) {
            handledCropIdRef.current = cropId;
            const elId = el.id;
            const elCustom = el.customData;
            const stampKind = stamp.kind;
            queueMicrotask(() => {
              try {
                api.updateScene({
                  appState: { croppingElementId: null, selectedElementIds: {} }
                });
              } catch {
              }
              openStamp(stampKind, { id: elId, customData: elCustom });
            });
            return;
          }
        }
      }
      if (!cropId) {
        handledCropIdRef.current = null;
      }
      const fileIds = Object.keys(files);
      const newIds = fileIds.filter((id) => !knownFileIdsRef.current.has(id));
      if (newIds.length > 0) {
        newIds.forEach((id) => knownFileIdsRef.current.add(id));
        onFilesChange?.(files, newIds);
      }
      if (!sceneThrottleRef.current) {
        sceneThrottleRef.current = setTimeout(async () => {
          sceneThrottleRef.current = null;
          const mod = await import('@excalidraw/excalidraw');
          const latestScene = latestSceneRef.current ?? { elements, appState };
          const liveElements = latestScene.elements.filter((e) => !e.isDeleted);
          const liveAppState = pickSyncableAppState(latestScene.appState);
          const elementHash = mod.hashElementsVersion(liveElements);
          const sceneHash = `${elementHash}:${JSON.stringify(liveAppState)}`;
          if (sceneHash === lastSceneHashRef.current) return;
          lastSceneHashRef.current = sceneHash;
          onSceneChange?.({ elements: liveElements, appState: liveAppState });
          if (persistEnabled) {
            writeScene(storageKey, {
              elements: liveElements,
              appState: liveAppState
            });
          }
        }, SYNC_THROTTLE_MS);
      }
      if (persistEnabled && newIds.length > 0) {
        for (const id of newIds) {
          if (files[id]) pendingFilesRef.current[id] = files[id];
        }
        if (!fileThrottleRef.current) {
          fileThrottleRef.current = setTimeout(() => {
            fileThrottleRef.current = null;
            const pending = pendingFilesRef.current;
            pendingFilesRef.current = {};
            const currentElements = api?.getSceneElements?.() ?? elements;
            const stampIds = /* @__PURE__ */ new Set();
            for (const el of currentElements) {
              const fid = el.fileId;
              if (fid && isStampElement(el)) stampIds.add(fid);
            }
            const raster = {};
            for (const [id, f] of Object.entries(pending)) {
              if (!stampIds.has(id)) raster[id] = f;
            }
            if (Object.keys(raster).length > 0) {
              void writeFiles(persistKeyRef.current, raster);
            }
          }, 1e3);
        }
      }
      if (persistEnabled && !pruneThrottleRef.current) {
        pruneThrottleRef.current = setTimeout(() => {
          pruneThrottleRef.current = null;
          const currentElements = api?.getSceneElements?.() ?? elements;
          const keep = /* @__PURE__ */ new Set();
          for (const el of currentElements) {
            const fid = el.fileId;
            if (fid && !isStampElement(el)) keep.add(fid);
          }
          void pruneFiles(persistKeyRef.current, keep);
        }, 2e3);
      }
    },
    [readOnly, api, onSceneChange, onFilesChange, persistEnabled, storageKey, stamps, openStamp]
  );
  React11.useEffect(() => {
    if (!api || !persistEnabled) return;
    let cancelled = false;
    void readFiles(storageKey).then((files) => {
      if (cancelled) return;
      const entries = Object.entries(files);
      if (entries.length === 0) return;
      try {
        api.addFiles(
          entries.map(([id, f]) => ({
            id,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            dataURL: f.dataURL,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            mimeType: f.mimeType,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            created: f.created ?? Date.now()
          }))
        );
        entries.forEach(([id]) => knownFileIdsRef.current.add(id));
      } catch (err) {
        console.warn("[whiteboard] addFiles t\u1EEB IDB th\u1EA5t b\u1EA1i:", err);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [api, persistEnabled, storageKey]);
  React11.useEffect(() => {
    if (!api) return;
    let cancelled = false;
    const run = async () => {
      try {
        const elements = api.getSceneElements();
        if (!elements || elements.length === 0) return;
        if (cancelled) return;
        await restoreMissingStampFiles(api, elements, stamps);
      } catch (err) {
        console.warn("Math stamp restore pass failed:", err);
      }
    };
    run();
    const t = setTimeout(run, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [api, persistedInitial, stamps]);
  React11.useEffect(
    () => () => {
      if (sceneThrottleRef.current) clearTimeout(sceneThrottleRef.current);
      if (fileThrottleRef.current) clearTimeout(fileThrottleRef.current);
      if (pruneThrottleRef.current) clearTimeout(pruneThrottleRef.current);
    },
    []
  );
  const handlePointerDown = useStampDoubleClick({
    enabled: !readOnly,
    stamps,
    onOpen: openStamp
  });
  useShortcuts({
    enabled: !readOnly,
    onToggle: toggleStampByKind,
    stamps
  });
  React11.useEffect(() => {
    if (!api) return;
    if (activeStamp) {
      try {
        const cur = api.getAppState?.()?.activeTool?.type ?? "selection";
        if (cur && cur !== "hand") prevExcalidrawToolRef.current = cur;
        api.setActiveTool?.({ type: "hand" });
      } catch {
      }
    } else {
      try {
        api.setActiveTool?.({ type: prevExcalidrawToolRef.current });
      } catch {
      }
    }
  }, [activeStamp, api]);
  useStampShortcutBlocker({ activeStamp, stamps });
  React11.useEffect(() => {
    if (!activeStamp) return;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      const ae = document.activeElement;
      if (ae && (ae.tagName === "TEXTAREA" || ae.isContentEditable)) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      closeStamp();
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [activeStamp, closeStamp]);
  useStampClickOutside({ activeStamp, hostRef, onClose: closeStamp });
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { className: `relative h-full w-full${isDarkTheme ? " theme--dark" : ""}`, children: [
    /* @__PURE__ */ jsxRuntime.jsx(React11.Suspense, { fallback: /* @__PURE__ */ jsxRuntime.jsx(ExcalidrawLoadingFallback, {}), children: /* @__PURE__ */ jsxRuntime.jsx(
      Excalidraw2,
      {
        excalidrawAPI: (a) => {
          if (apiRef.current === a) return;
          apiRef.current = a;
          queueMicrotask(() => {
            setApi(a);
            onApi?.(a);
          });
        },
        langCode,
        viewModeEnabled: readOnly,
        initialData: effectiveInitialScene ? {
          elements: effectiveInitialScene.elements,
          appState: {
            ...effectiveInitialScene.appState,
            gridSize: effectiveInitialScene.appState.gridSize ?? void 0
          }
        } : { appState: { viewBackgroundColor: "#ffffff" } },
        onChange: handleChange,
        onPointerDown: handlePointerDown
      }
    ) }),
    /* @__PURE__ */ jsxRuntime.jsx(
      ToolbarInjector,
      {
        enabled: !readOnly,
        activeStampKind: activeStamp,
        onToggle: toggleStampByKind,
        stamps
      }
    ),
    HostComponent && /* @__PURE__ */ jsxRuntime.jsx(
      HostComponent,
      {
        ref: hostRef,
        api,
        editingElement,
        onClose: closeStamp,
        isDark: isDarkTheme
      }
    )
  ] });
}

exports.ALL_STAMPS = ALL_STAMPS;
exports.DEFAULT_STAMPS = DEFAULT_STAMPS;
exports.EXPERIMENTAL_STAMPS = EXPERIMENTAL_STAMPS;
exports.STABLE_STAMPS = STABLE_STAMPS;
exports.Whiteboard = Whiteboard;
exports.findStampForCustomData = findStampForCustomData;
exports.geometry3dStamp = geometry3dStamp;
exports.geometryStamp = geometryStamp;
exports.graph2dStamp = graph2dStamp;
exports.isGeometry3DCustomData = isGeometry3DCustomData;
exports.isGeometryCustomData = isGeometryCustomData;
exports.isGraph2DCustomData = isGraph2DCustomData;
exports.isLatexCustomData = isLatexCustomData;
exports.isStampElement = isStampElement;
exports.latexStamp = latexStamp;
exports.pickSyncableAppState = pickSyncableAppState;
exports.restoreMissingStampFiles = restoreMissingStampFiles;
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map