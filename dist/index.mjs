"use client";
import './index.css';
import dynamic from 'next/dynamic';
import { forwardRef, useRef, useState, useEffect, useCallback, useImperativeHandle, useMemo, useId, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { jsxs, jsx, Fragment } from 'react/jsx-runtime';
import '@excalidraw/excalidraw/index.css';

// src/Whiteboard.tsx

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

// src/stamps/geometry-2d/editor/transforms.ts
var LINE_LIKE = /* @__PURE__ */ new Set(["line", "segment", "arrow"]);
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
var Icon = {
  cursor: /* @__PURE__ */ jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ jsx("path", { d: "M4 4 L20 12 L13 13 L11 20 Z" }) }),
  select: /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ jsx("path", { d: "M4 4 L20 12 L13 13 L11 20 Z", fill: "none" }),
    /* @__PURE__ */ jsx("rect", { x: "2.5", y: "2.5", width: "19", height: "19", strokeDasharray: "3 2", fill: "none" })
  ] }),
  point: /* @__PURE__ */ jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("circle", { cx: "12", cy: "12", r: "4", fill: "currentColor" }) }),
  midpoint: /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
    /* @__PURE__ */ jsx("line", { x1: "4", y1: "12", x2: "20", y2: "12" }),
    /* @__PURE__ */ jsx("circle", { cx: "12", cy: "12", r: "2.5", fill: "currentColor", stroke: "none" }),
    /* @__PURE__ */ jsx("circle", { cx: "4", cy: "12", r: "1.6", fill: "currentColor", stroke: "none" }),
    /* @__PURE__ */ jsx("circle", { cx: "20", cy: "12", r: "1.6", fill: "currentColor", stroke: "none" })
  ] }),
  segment: /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
    /* @__PURE__ */ jsx("line", { x1: "5", y1: "18", x2: "19", y2: "6" }),
    /* @__PURE__ */ jsx("circle", { cx: "5", cy: "18", r: "1.7", fill: "currentColor" }),
    /* @__PURE__ */ jsx("circle", { cx: "19", cy: "6", r: "1.7", fill: "currentColor" })
  ] }),
  line: /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
    /* @__PURE__ */ jsx("line", { x1: "2", y1: "20", x2: "22", y2: "4" }),
    /* @__PURE__ */ jsx("circle", { cx: "8", cy: "16", r: "1.6", fill: "currentColor" }),
    /* @__PURE__ */ jsx("circle", { cx: "16", cy: "8", r: "1.6", fill: "currentColor" })
  ] }),
  ray: /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
    /* @__PURE__ */ jsx("line", { x1: "5", y1: "19", x2: "22", y2: "2" }),
    /* @__PURE__ */ jsx("circle", { cx: "5", cy: "19", r: "1.7", fill: "currentColor" }),
    /* @__PURE__ */ jsx("circle", { cx: "12", cy: "12", r: "1.5", fill: "currentColor" })
  ] }),
  vector: /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ jsx("line", { x1: "4", y1: "20", x2: "20", y2: "4" }),
    /* @__PURE__ */ jsx("polyline", { points: "14,4 20,4 20,10" })
  ] }),
  perpendicular: /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
    /* @__PURE__ */ jsx("line", { x1: "3", y1: "18", x2: "21", y2: "18" }),
    /* @__PURE__ */ jsx("line", { x1: "12", y1: "18", x2: "12", y2: "4" }),
    /* @__PURE__ */ jsx("rect", { x: "12", y: "14", width: "4", height: "4", fill: "none" })
  ] }),
  parallel: /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
    /* @__PURE__ */ jsx("line", { x1: "3", y1: "9", x2: "21", y2: "5" }),
    /* @__PURE__ */ jsx("line", { x1: "3", y1: "19", x2: "21", y2: "15" })
  ] }),
  perpBisector: /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
    /* @__PURE__ */ jsx("line", { x1: "4", y1: "18", x2: "20", y2: "18" }),
    /* @__PURE__ */ jsx("line", { x1: "12", y1: "4", x2: "12", y2: "22", strokeDasharray: "3 2" }),
    /* @__PURE__ */ jsx("circle", { cx: "6", cy: "18", r: "1.5", fill: "currentColor" }),
    /* @__PURE__ */ jsx("circle", { cx: "18", cy: "18", r: "1.5", fill: "currentColor" })
  ] }),
  bisector: /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
    /* @__PURE__ */ jsx("line", { x1: "4", y1: "20", x2: "20", y2: "4" }),
    /* @__PURE__ */ jsx("line", { x1: "4", y1: "20", x2: "20", y2: "20" }),
    /* @__PURE__ */ jsx("line", { x1: "4", y1: "20", x2: "22", y2: "12", strokeDasharray: "3 2" })
  ] }),
  polygon: /* @__PURE__ */ jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinejoin: "round", children: /* @__PURE__ */ jsx("polygon", { points: "6,6 18,6 22,14 12,22 4,14" }) }),
  regularPolygon: /* @__PURE__ */ jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinejoin: "round", children: /* @__PURE__ */ jsx("polygon", { points: "12,3 20,8 20,17 12,22 4,17 4,8" }) }),
  circleCenter: /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
    /* @__PURE__ */ jsx("circle", { cx: "12", cy: "12", r: "8" }),
    /* @__PURE__ */ jsx("circle", { cx: "12", cy: "12", r: "1.6", fill: "currentColor" })
  ] }),
  circle3: /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
    /* @__PURE__ */ jsx("circle", { cx: "12", cy: "12", r: "8" }),
    /* @__PURE__ */ jsx("circle", { cx: "12", cy: "4", r: "1.5", fill: "currentColor" }),
    /* @__PURE__ */ jsx("circle", { cx: "20", cy: "14", r: "1.5", fill: "currentColor" }),
    /* @__PURE__ */ jsx("circle", { cx: "5", cy: "16", r: "1.5", fill: "currentColor" })
  ] }),
  tangent: /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
    /* @__PURE__ */ jsx("circle", { cx: "11", cy: "13", r: "6" }),
    /* @__PURE__ */ jsx("line", { x1: "2", y1: "20", x2: "22", y2: "2" })
  ] }),
  angle: /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
    /* @__PURE__ */ jsx("line", { x1: "4", y1: "20", x2: "20", y2: "20" }),
    /* @__PURE__ */ jsx("line", { x1: "4", y1: "20", x2: "20", y2: "6" }),
    /* @__PURE__ */ jsx("path", { d: "M14 20 A 10 10 0 0 0 11 13" })
  ] }),
  distance: /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
    /* @__PURE__ */ jsx("line", { x1: "4", y1: "12", x2: "20", y2: "12" }),
    /* @__PURE__ */ jsx("line", { x1: "4", y1: "8", x2: "4", y2: "16" }),
    /* @__PURE__ */ jsx("line", { x1: "20", y1: "8", x2: "20", y2: "16" })
  ] }),
  area: /* @__PURE__ */ jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: /* @__PURE__ */ jsx("polygon", { points: "5,6 19,6 21,14 13,21 3,15", fill: "currentColor", fillOpacity: "0.2" }) }),
  toggleLabel: /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ jsx("text", { x: "3", y: "18", fontSize: "16", fontFamily: "serif", fontWeight: "700", fill: "currentColor", stroke: "none", children: "A" }),
    /* @__PURE__ */ jsx("text", { x: "13", y: "14", fontSize: "11", fontFamily: "serif", fontWeight: "700", fill: "currentColor", stroke: "none", children: "A" })
  ] }),
  toggleVisible: /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
    /* @__PURE__ */ jsx("circle", { cx: "12", cy: "12", r: "3.5", fill: "currentColor", fillOpacity: "0.4" }),
    /* @__PURE__ */ jsx("circle", { cx: "12", cy: "12", r: "3.5" }),
    /* @__PURE__ */ jsx("circle", { cx: "20", cy: "6", r: "1.5", fill: "currentColor" })
  ] }),
  trash: /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ jsx("polyline", { points: "3,6 5,6 21,6" }),
    /* @__PURE__ */ jsx("path", { d: "M19 6 l-1 14 a 2 2 0 0 1 -2 2 H 8 a 2 2 0 0 1 -2 -2 l-1 -14" }),
    /* @__PURE__ */ jsx("line", { x1: "10", y1: "11", x2: "10", y2: "17" }),
    /* @__PURE__ */ jsx("line", { x1: "14", y1: "11", x2: "14", y2: "17" })
  ] }),
  translate: /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
    /* @__PURE__ */ jsx("path", { d: "M4 4 L20 20" }),
    /* @__PURE__ */ jsx("polygon", { points: "14,4 20,4 20,10", fill: "currentColor" }),
    /* @__PURE__ */ jsx("circle", { cx: "5", cy: "5", r: "1.5", fill: "currentColor" })
  ] }),
  rotate: /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
    /* @__PURE__ */ jsx("path", { d: "M4 12 A8 8 0 1 1 12 20" }),
    /* @__PURE__ */ jsx("polyline", { points: "4,9 4,13 8,13" })
  ] }),
  reflectLine: /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
    /* @__PURE__ */ jsx("line", { x1: "12", y1: "2", x2: "12", y2: "22", strokeDasharray: "3 2" }),
    /* @__PURE__ */ jsx("polygon", { points: "4,6 9,12 4,18", fill: "currentColor" }),
    /* @__PURE__ */ jsx("polygon", { points: "20,6 15,12 20,18", fill: "currentColor" })
  ] }),
  reflectPoint: /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
    /* @__PURE__ */ jsx("circle", { cx: "12", cy: "12", r: "1.5", fill: "currentColor" }),
    /* @__PURE__ */ jsx("circle", { cx: "5", cy: "5", r: "1.6", fill: "currentColor" }),
    /* @__PURE__ */ jsx("circle", { cx: "19", cy: "19", r: "1.6", fill: "currentColor" }),
    /* @__PURE__ */ jsx("line", { x1: "5", y1: "5", x2: "19", y2: "19", strokeDasharray: "2 2" })
  ] }),
  dilate: /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
    /* @__PURE__ */ jsx("circle", { cx: "12", cy: "12", r: "1.5", fill: "currentColor" }),
    /* @__PURE__ */ jsx("polygon", { points: "6,18 18,18 12,6", fillOpacity: "0.1", fill: "currentColor" }),
    /* @__PURE__ */ jsx("polygon", { points: "9,15 15,15 12,11", fill: "currentColor" })
  ] })
};
var TOOLS = [
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
var GROUP_LABELS = {
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
var GROUP_ORDER = [
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
var A_CODE = "A".charCodeAt(0);
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

// src/stamps/geometry-2d/editor/theme.ts
var themeStroke = (dark) => dark ? "#e2e8f0" : "#0f172a";
var themeAxis = (dark) => dark ? "#cbd5e1" : "#94a3b8";
var themeGrid = (dark) => dark ? "#475569" : "#e2e8f0";
var themeLabel = (dark) => dark ? "#e2e8f0" : "#000000";
function paletteFor(isDark) {
  return {
    stroke: themeStroke(isDark),
    axis: themeAxis(isDark),
    grid: themeGrid(isDark),
    label: themeLabel(isDark)
  };
}
var SENTINEL_MAP = {
  "@stroke": "stroke",
  "@axis": "axis",
  "@grid": "grid",
  "@label": "label"
};
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
var JSXGraphMiniBoard = ({ onReady, initialState, isDark }) => {
  const isDarkRef = useRef(!!isDark);
  isDarkRef.current = !!isDark;
  const containerId = useId().replace(/:/g, "_") + "_jxgmini";
  const containerRef = useRef(null);
  const boardRef = useRef(null);
  const jxgRef = useRef(null);
  const axisObjsRef = useRef({});
  const creationLogRef = useRef([]);
  const [tool, setTool] = useState("move");
  const toolRef = useRef("move");
  toolRef.current = tool;
  const [showAxis, setShowAxis] = useState(initialState?.showAxis ?? false);
  const [showGrid, setShowGrid] = useState(initialState?.showGrid ?? false);
  const showAxisRef = useRef(showAxis);
  showAxisRef.current = showAxis;
  const showGridRef = useRef(showGrid);
  showGridRef.current = showGrid;
  const objMapRef = useRef(/* @__PURE__ */ new Map());
  const valueLabelsRef = useRef(/* @__PURE__ */ new Map());
  const pendingRef = useRef([]);
  const [, setPendingCount] = useState(0);
  const selectedSetRef = useRef(/* @__PURE__ */ new Set());
  const selOriginalRef = useRef(/* @__PURE__ */ new Map());
  const [, setSelectionTick] = useState(0);
  const marqueeRef = useRef(null);
  const previewSegRef = useRef([]);
  const phantomRef = useRef(null);
  const previewShapeRef = useRef(null);
  const previewRafRef = useRef(null);
  const [historyTick, setHistoryTick] = useState(0);
  const [, setWarn] = useState(null);
  const warnTimerRef = useRef(null);
  const flashWarn = useCallback((msg) => {
    if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
    setWarn(msg);
    warnTimerRef.current = setTimeout(() => setWarn(null), 1800);
  }, []);
  useEffect(() => () => {
    if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
  }, []);
  const labelIdxRef = useRef(0);
  const nextLabel = useCallback(() => {
    const idx = labelIdxRef.current;
    const suffix = idx >= 26 ? String(Math.floor(idx / 26)) : "";
    const code = "A".charCodeAt(0) + idx % 26;
    labelIdxRef.current = idx + 1;
    return String.fromCharCode(code) + suffix;
  }, []);
  const nextLocalId = useCallback(() => "j" + creationLogRef.current.length, []);
  const resolveArgs = useCallback((args) => {
    return args.map((a) => {
      if (typeof a === "string" && objMapRef.current.has(a)) {
        return objMapRef.current.get(a);
      }
      return a;
    });
  }, []);
  const pushLog = useCallback(
    (id, type, args, attrs, obj) => {
      creationLogRef.current.push({ id, type, args, attrs });
      objMapRef.current.set(id, obj);
      setHistoryTick((t) => t + 1);
    },
    []
  );
  const create = useCallback(
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
  const localIdOf = useCallback((obj) => {
    for (const [id, o] of objMapRef.current.entries()) {
      if (o === obj) return id;
    }
    return null;
  }, []);
  const snapshotObject = useCallback((obj, anchorScreen) => {
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
  const createValueLabelFor = useCallback((target) => {
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
  const mutateObject = useCallback((obj, patch) => {
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
  const clearPreviewSegs = useCallback(() => {
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
  const removePhantom = useCallback(() => {
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
  const clearPending = useCallback(() => {
    removePhantom();
    clearPreviewSegs();
    pendingRef.current = [];
    setPendingCount(0);
  }, [clearPreviewSegs, removePhantom]);
  const applySelectionStyle = useCallback((obj) => {
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
  const restoreSelectionStyle = useCallback((obj) => {
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
  const clearSelection = useCallback(() => {
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
  const toggleSelect = useCallback((obj, additive) => {
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
  const deleteSelected = useCallback(() => {
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
  const buildPreview = useCallback((toolDef, picks, phantom) => {
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
  const refreshPreview = useCallback(() => {
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
  const finalize = useCallback((toolDef, picks) => {
    if (!boardRef.current) return;
    const labels = picks.map(localIdOf).filter(Boolean);
    const stroke2 = { strokeColor: "@stroke", strokeWidth: 2 };
    const strokeOnly = { ...stroke2, fillColor: "none", fillOpacity: 0 };
    const lblName = nextLabel();
    switch (toolDef.key) {
      case "midpoint":
        create("midpoint", labels, { name: lblName, color: "@stroke", size: 3 });
        break;
      case "segment":
        create("segment", labels, stroke2);
        break;
      case "line":
        create("line", labels, stroke2);
        break;
      case "ray": {
        create("line", labels, { ...stroke2, straightFirst: false, straightLast: true });
        break;
      }
      case "vector":
        create("arrow", labels, stroke2);
        break;
      case "perpendicular": {
        const [p, l] = picks[0] && objKind(picks[0]) === "point" ? [labels[0], labels[1]] : [labels[1], labels[0]];
        create("perpendicular", [l, p], stroke2);
        break;
      }
      case "parallel": {
        const [p, l] = picks[0] && objKind(picks[0]) === "point" ? [labels[0], labels[1]] : [labels[1], labels[0]];
        create("parallel", [l, p], stroke2);
        break;
      }
      case "perpBisector": {
        const mid = create("midpoint", labels, { visible: false, withLabel: false, name: "" });
        const seg = create("segment", labels, { visible: false, withLabel: false });
        const midId = localIdOf(mid);
        const segId = localIdOf(seg);
        if (midId && segId) create("perpendicular", [segId, midId], stroke2);
        break;
      }
      case "angleBisector":
        create("bisector", labels, stroke2);
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
        if (gid) create("tangent", [gid], stroke2);
        break;
      }
      case "angle": {
        const [pa, pb, pc] = picks;
        let order = labels;
        try {
          const ax = pa.X() - pb.X(), ay = pa.Y() - pb.Y();
          const cx = pc.X() - pb.X(), cy = pc.Y() - pb.Y();
          const cross = ax * cy - ay * cx;
          if (cross < 0) order = [labels[2], labels[1], labels[0]];
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
  const finalizeTransformCreate = useCallback((spec, source) => {
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
  const undoLast = useCallback(() => {
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
  useEffect(() => {
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
  const screenCoordsOf = useCallback((evt) => {
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
  const objectsAt = useCallback((evt) => {
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
  const findNearestPoint = useCallback((evt, tolPx = 12) => {
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
  const promoteLabel = useCallback((o) => {
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
  const pendingTransformRef = useRef(null);
  const transformSubsRef = useRef(/* @__PURE__ */ new Set());
  const emitTransform = useCallback((info) => {
    transformSubsRef.current.forEach((cb) => {
      try {
        cb(info);
      } catch {
      }
    });
  }, []);
  const selectSubsRef = useRef(/* @__PURE__ */ new Set());
  const emitSelect = useCallback((snap) => {
    selectSubsRef.current.forEach((cb) => {
      try {
        cb(snap);
      } catch {
      }
    });
  }, []);
  const moveDownRef = useRef(null);
  const lastMoveClickRef = useRef({ obj: null, time: 0 });
  useEffect(() => {
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
  useEffect(() => {
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
  useEffect(() => {
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
  const handleToolChange = useCallback((t) => {
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
  const handleToolChangeRef = useRef(handleToolChange);
  handleToolChangeRef.current = handleToolChange;
  const subscribersRef = useRef(/* @__PURE__ */ new Set());
  const notifySubscribers = useCallback(() => {
    subscribersRef.current.forEach((cb) => {
      try {
        cb();
      } catch {
      }
    });
  }, []);
  useEffect(() => {
    notifySubscribers();
  }, [tool, showAxis, showGrid, historyTick, notifySubscribers]);
  const undoLastRef = useRef(undoLast);
  undoLastRef.current = undoLast;
  const clearPendingRef = useRef(clearPending);
  clearPendingRef.current = clearPending;
  const finalizeTransformCreateRef = useRef(finalizeTransformCreate);
  finalizeTransformCreateRef.current = finalizeTransformCreate;
  const clearSelectionRef = useRef(clearSelection);
  clearSelectionRef.current = clearSelection;
  const deleteSelectedRef = useRef(deleteSelected);
  deleteSelectedRef.current = deleteSelected;
  const emitTransformRef = useRef(emitTransform);
  emitTransformRef.current = emitTransform;
  const setShowAxisRef = useRef(setShowAxis);
  setShowAxisRef.current = setShowAxis;
  const setShowGridRef = useRef(setShowGrid);
  setShowGridRef.current = setShowGrid;
  return /* @__PURE__ */ jsx(
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
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    drawerOpen && /* @__PURE__ */ jsx(
      "div",
      {
        className: "stamp-drawer-backdrop",
        onPointerDown: onDrawerClose,
        "aria-hidden": "true"
      }
    ),
    /* @__PURE__ */ jsxs(
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
          /* @__PURE__ */ jsxs("header", { className: "flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-4 py-3", children: [
            /* @__PURE__ */ jsxs("h3", { className: "flex items-center gap-2 text-base font-semibold text-slate-800", children: [
              /* @__PURE__ */ jsx("span", { className: "inline-flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700", children: headerIcon }),
              title
            ] }),
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: onDrawerClose,
                "aria-label": "\u0110\xF3ng ng\u0103n c\xF4ng c\u1EE5",
                className: "inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800",
                children: /* @__PURE__ */ jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
                  /* @__PURE__ */ jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" }),
                  /* @__PURE__ */ jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" })
                ] })
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "sticky top-0 z-10 flex items-center gap-2 border-b border-slate-200 bg-white/95 px-3 py-2 backdrop-blur", children: [
            chips.map((c) => /* @__PURE__ */ jsxs(
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
            actions.length > 0 && /* @__PURE__ */ jsx("div", { className: "ml-auto flex items-center gap-1", children: actions.map((a) => /* @__PURE__ */ jsx(
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
          /* @__PURE__ */ jsx(
            "div",
            {
              className: "min-h-0 flex-1 overflow-y-auto",
              style: { paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" },
              children: groups.map((g) => /* @__PURE__ */ jsxs("section", { className: "px-3 pt-3 pb-1", children: [
                /* @__PURE__ */ jsxs("h4", { className: "mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500", children: [
                  /* @__PURE__ */ jsx("span", { className: "h-1 w-1 rounded-full bg-emerald-500" }),
                  g.groupLabel
                ] }),
                /* @__PURE__ */ jsx("div", { className: "grid grid-cols-3 gap-2", children: g.tools.map((t) => {
                  const active = activeTool === t.key;
                  return /* @__PURE__ */ jsxs(
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
                        /* @__PURE__ */ jsx("span", { className: "flex h-6 w-6 items-center justify-center", children: t.icon }),
                        /* @__PURE__ */ jsx("span", { className: "text-center text-[11px] font-medium leading-tight line-clamp-2", children: t.label })
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
var TOOLTIP_DELAY_MS = 400;
function Shell({ title, icon, onClose, children, isDark, closeLabel = "\u0110\xF3ng" }) {
  return /* @__PURE__ */ jsxs(
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
        /* @__PURE__ */ jsxs("header", { className: "flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-3 py-2", children: [
          /* @__PURE__ */ jsxs("h3", { className: "flex items-center gap-2 text-sm font-semibold text-slate-800", children: [
            /* @__PURE__ */ jsx("span", { className: "text-base leading-none", children: icon }),
            title
          ] }),
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: onClose,
              "aria-label": closeLabel,
              className: "rounded p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800",
              children: /* @__PURE__ */ jsx(CloseIcon, {})
            }
          )
        ] }),
        /* @__PURE__ */ jsx("div", { className: "min-h-0 flex-1 overflow-y-auto p-3 space-y-4", children })
      ]
    }
  );
}
function Section({ label, children }) {
  return /* @__PURE__ */ jsxs("section", { children: [
    /* @__PURE__ */ jsx("h4", { className: "mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500", children: label }),
    children
  ] });
}
var GeometryIconHeader = /* @__PURE__ */ jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", children: [
  /* @__PURE__ */ jsx("polygon", { points: "4,20 20,20 12,5" }),
  /* @__PURE__ */ jsx("circle", { cx: "4", cy: "20", r: "1.5", fill: "currentColor", stroke: "none" }),
  /* @__PURE__ */ jsx("circle", { cx: "20", cy: "20", r: "1.5", fill: "currentColor", stroke: "none" }),
  /* @__PURE__ */ jsx("circle", { cx: "12", cy: "5", r: "1.5", fill: "currentColor", stroke: "none" })
] });
function CloseIcon() {
  return /* @__PURE__ */ jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" }),
    /* @__PURE__ */ jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" })
  ] });
}
function UndoIcon() {
  return /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ jsx("polyline", { points: "3 7 3 13 9 13" }),
    /* @__PURE__ */ jsx("path", { d: "M3.51 13a9 9 0 1 0 2.13-9.36L3 7" })
  ] });
}
function AxisIcon() {
  return /* @__PURE__ */ jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ jsx("line", { x1: "4", y1: "20", x2: "20", y2: "20" }),
    /* @__PURE__ */ jsx("line", { x1: "4", y1: "20", x2: "4", y2: "4" }),
    /* @__PURE__ */ jsx("polyline", { points: "2 6 4 4 6 6" }),
    /* @__PURE__ */ jsx("polyline", { points: "18 18 20 20 18 22" })
  ] });
}
function GridIcon() {
  return /* @__PURE__ */ jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ jsx("rect", { x: "4", y: "4", width: "16", height: "16", rx: "1" }),
    /* @__PURE__ */ jsx("line", { x1: "4", y1: "10", x2: "20", y2: "10" }),
    /* @__PURE__ */ jsx("line", { x1: "4", y1: "16", x2: "20", y2: "16" }),
    /* @__PURE__ */ jsx("line", { x1: "10", y1: "4", x2: "10", y2: "20" }),
    /* @__PURE__ */ jsx("line", { x1: "16", y1: "4", x2: "16", y2: "20" })
  ] });
}
function useToolHoverTooltip() {
  const [hover, setHover] = useState(null);
  const [portalReady, setPortalReady] = useState(false);
  const hoverTimerRef = useRef(null);
  useEffect(() => {
    setPortalReady(true);
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);
  const showHover = useCallback((el, t) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      const r = el.getBoundingClientRect();
      setHover({ label: t.label, hint: t.hint, x: r.right, y: r.top + r.height / 2 });
    }, TOOLTIP_DELAY_MS);
  }, []);
  const hideHover = useCallback(() => {
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
  const grouped = useMemo(() => {
    return TOOLS.reduce((acc, t) => {
      var _a;
      (acc[_a = t.group] ?? (acc[_a] = [])).push(t);
      return acc;
    }, {});
  }, []);
  const groupKeys = useMemo(
    () => GROUP_ORDER.filter((g) => grouped[g]),
    [grouped]
  );
  const activeGroupTools = chordGroup ? grouped[chordGroup] ?? null : null;
  const { hover, portalReady, showHover, hideHover } = useToolHoverTooltip();
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsxs(Shell, { title: "H\xECnh h\u1ECDc", icon: GeometryIconHeader, onClose, isDark, children: [
      /* @__PURE__ */ jsx(Section, { label: "B\u1ED1 c\u1EE5c", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 text-[11px] text-slate-700", children: [
        /* @__PURE__ */ jsxs("label", { className: "inline-flex select-none items-center gap-1.5", children: [
          /* @__PURE__ */ jsx(
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
        /* @__PURE__ */ jsxs("label", { className: "inline-flex select-none items-center gap-1.5", children: [
          /* @__PURE__ */ jsx(
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
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: onUndo,
            disabled: !canUndo,
            title: "Ho\xE0n t\xE1c (Ctrl/Cmd+Z)",
            "aria-label": "Ho\xE0n t\xE1c",
            className: "ml-auto inline-flex items-center justify-center rounded p-1 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent",
            children: /* @__PURE__ */ jsx(UndoIcon, {})
          }
        )
      ] }) }),
      groupKeys.map((group) => {
        const isChordActive = chordGroup === group;
        const dimmed = chordGroup !== null && !isChordActive;
        return /* @__PURE__ */ jsxs(
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
              /* @__PURE__ */ jsxs("h4", { className: "mb-1.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-500", children: [
                /* @__PURE__ */ jsx("span", { children: GROUP_LABELS[group] }),
                /* @__PURE__ */ jsx(
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
              /* @__PURE__ */ jsx("div", { className: "grid grid-cols-4 gap-1", children: grouped[group].map((t, i) => {
                const active = activeTool === t.key;
                return /* @__PURE__ */ jsxs(
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
                      /* @__PURE__ */ jsx(
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
      chordGroup && activeGroupTools && /* @__PURE__ */ jsxs(
        "div",
        {
          "data-testid": "chord-hint",
          className: "mt-1 rounded border border-emerald-200 bg-emerald-50/60 px-2 py-1 text-[11px] leading-snug text-slate-600",
          children: [
            /* @__PURE__ */ jsx("span", { className: "font-mono font-semibold text-emerald-700", children: letterForGroup(chordGroup) }),
            /* @__PURE__ */ jsx("span", { className: "mx-1 text-slate-400", children: "\u2192" }),
            activeGroupTools.map((t, i) => /* @__PURE__ */ jsxs("span", { className: "mr-2 inline-block", children: [
              /* @__PURE__ */ jsx("span", { className: "font-mono font-semibold text-emerald-700", children: i + 1 }),
              /* @__PURE__ */ jsx("span", { className: "ml-1", children: t.label })
            ] }, t.key)),
            /* @__PURE__ */ jsx("span", { className: "text-slate-400", children: "Esc hu\u1EF7" })
          ]
        }
      )
    ] }),
    portalReady && hover && typeof document !== "undefined" ? createPortal(
      /* @__PURE__ */ jsxs(
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
            /* @__PURE__ */ jsx("span", { className: "block font-medium", children: hover.label }),
            hover.hint && /* @__PURE__ */ jsx("span", { className: "mt-0.5 block text-slate-300", children: hover.hint })
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
  const groups = useMemo(() => {
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
  return /* @__PURE__ */ jsx(
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
          icon: /* @__PURE__ */ jsx(AxisIcon, {}),
          pressed: showAxis,
          onToggle: onShowAxisChange,
          testId: "toggle-axis"
        },
        {
          label: "L\u01B0\u1EDBi",
          icon: /* @__PURE__ */ jsx(GridIcon, {}),
          pressed: showGrid,
          onToggle: onShowGridChange,
          testId: "toggle-grid"
        }
      ],
      actions: [
        {
          label: "Ho\xE0n t\xE1c",
          title: "Ho\xE0n t\xE1c (Ctrl/Cmd+Z)",
          icon: /* @__PURE__ */ jsx(UndoIcon, {}),
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
    return /* @__PURE__ */ jsx(MobileGeometryPanel, { ...props });
  }
  return /* @__PURE__ */ jsx(DesktopGeometryPanel, { ...props });
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

// src/stamps/shared/excalidrawPalette.ts
var STROKE_PALETTE = [
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
var MOBILE_QUERY = "(max-width: 768px)";
var NO_HOVER_QUERY = "(hover: none)";
function readMatch(query) {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  try {
    return window.matchMedia(query).matches;
  } catch {
    return false;
  }
}
function useIsMobile() {
  const [state, setState] = useState(() => ({
    isMobile: readMatch(MOBILE_QUERY),
    isTouchOnly: readMatch(NO_HOVER_QUERY)
  }));
  useEffect(() => {
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
var DASH_OPTIONS = [
  { value: 0, label: "N\xE9t li\u1EC1n" },
  { value: 2, label: "N\xE9t \u0111\u1EE9t" },
  { value: 1, label: "N\xE9t ch\u1EA5m" }
];
var WIDTH_OPTIONS = [1, 2, 3];
var FACE_OPTIONS = [
  { value: "o", symbol: "\u25CF" },
  { value: "circle", symbol: "\u25EF" },
  { value: "cross", symbol: "\u2715" },
  { value: "plus", symbol: "\u271A" }
];
var SUB_DIGITS = ["\u2080", "\u2081", "\u2082", "\u2083", "\u2084", "\u2085", "\u2086", "\u2087", "\u2088", "\u2089"];
var SUB_SET = new Set(SUB_DIGITS);
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
var Icons = {
  color: /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ jsx("path", { d: "M19 11 L11 3 L3 11 L11 19 Z" }),
    /* @__PURE__ */ jsx("path", { d: "M19 11 L21 16 a2 2 0 1 1 -4 0 Z", fill: "currentColor", stroke: "none" })
  ] }),
  style: /* @__PURE__ */ jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("circle", { cx: "12", cy: "12", r: "5", fill: "currentColor" }) }),
  size: /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", children: [
    /* @__PURE__ */ jsx("line", { x1: "4", y1: "9", x2: "20", y2: "9", strokeWidth: "1" }),
    /* @__PURE__ */ jsx("line", { x1: "4", y1: "13", x2: "20", y2: "13", strokeWidth: "2" }),
    /* @__PURE__ */ jsx("line", { x1: "4", y1: "17", x2: "20", y2: "17", strokeWidth: "3.2" })
  ] }),
  name: /* @__PURE__ */ jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "currentColor", children: [
    /* @__PURE__ */ jsx("text", { x: "2", y: "17", fontSize: "14", fontFamily: "serif", fontWeight: "700", children: "A" }),
    /* @__PURE__ */ jsx("text", { x: "12", y: "17", fontSize: "11", fontFamily: "serif", fontWeight: "700", children: "a" })
  ] }),
  trash: /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ jsx("polyline", { points: "3,6 5,6 21,6" }),
    /* @__PURE__ */ jsx("path", { d: "M19 6 l-1 14 a 2 2 0 0 1 -2 2 H 8 a 2 2 0 0 1 -2 -2 l-1 -14" }),
    /* @__PURE__ */ jsx("line", { x1: "10", y1: "11", x2: "10", y2: "17" }),
    /* @__PURE__ */ jsx("line", { x1: "14", y1: "11", x2: "14", y2: "17" })
  ] })
};
var PropertiesPopover = (props) => {
  const { anchor, onClose, onMutate, isDark, getAllNames } = props;
  const rootRef = useRef(null);
  const [section, setSection] = useState(null);
  const { isMobile } = useIsMobile();
  const [clamped, setClamped] = useState(null);
  useLayoutEffect(() => {
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
  const [name, setName] = useState(initialName);
  useEffect(() => {
    setName(initialName);
  }, [initialName]);
  useEffect(() => {
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
  const PillBtn = ({ id, label, icon, active, onClick, indicatorColor }) => /* @__PURE__ */ jsxs(
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
        indicatorColor && /* @__PURE__ */ jsx(
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
  const colorIndicatorTint = useMemo(() => currentColor, [currentColor]);
  const pos = clamped ?? { left: anchor.x, top: anchor.y };
  const node = /* @__PURE__ */ jsxs(
    "div",
    {
      ref: rootRef,
      "data-stamp-area": "true",
      className: `${isDark ? "theme--dark " : ""}fixed z-[2147483600] flex flex-col gap-1.5`,
      style: { left: pos.left, top: pos.top },
      role: "dialog",
      "aria-label": "Thu\u1ED9c t\xEDnh \u0111\u1ED1i t\u01B0\u1EE3ng",
      children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1 rounded-full border border-slate-300 bg-white px-1.5 py-1 shadow-lg ring-1 ring-black/5", children: [
          /* @__PURE__ */ jsx(PillBtn, { id: "color", label: "M\xE0u", icon: Icons.color, active: section === "color", onClick: () => toggleSection("color"), indicatorColor: colorIndicatorTint }),
          /* @__PURE__ */ jsx(PillBtn, { id: "style", label: "Ki\u1EC3u", icon: Icons.style, active: section === "style", onClick: () => toggleSection("style") }),
          /* @__PURE__ */ jsx(PillBtn, { id: "size", label: "\u0110\u1ED9 d\xE0y", icon: Icons.size, active: section === "size", onClick: () => toggleSection("size") }),
          /* @__PURE__ */ jsx(PillBtn, { id: "name", label: "T\xEAn", icon: Icons.name, active: section === "name", onClick: () => toggleSection("name") }),
          /* @__PURE__ */ jsx("span", { "aria-hidden": true, className: "mx-0.5 h-5 w-px bg-slate-200" }),
          /* @__PURE__ */ jsx(PillBtn, { id: "delete", label: "Xo\xE1", icon: Icons.trash, onClick: doDelete })
        ] }),
        section && /* @__PURE__ */ jsxs("div", { className: "w-[220px] rounded-lg border border-slate-300 bg-white p-3 shadow-2xl ring-1 ring-black/5", children: [
          section === "color" && /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1", children: [
            /* @__PURE__ */ jsx("span", { className: "text-[11px] font-medium text-slate-500", children: "M\xE0u" }),
            /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-1", children: STROKE_PALETTE.map((c) => /* @__PURE__ */ jsx(
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
          section === "style" && /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1", children: [
            /* @__PURE__ */ jsx("span", { className: "text-[11px] font-medium text-slate-500", children: "Ki\u1EC3u" }),
            props.kind === "point" ? /* @__PURE__ */ jsx("div", { className: "flex gap-1", children: FACE_OPTIONS.map((f) => /* @__PURE__ */ jsx(
              "button",
              {
                "aria-label": `H\xECnh ${f.value}`,
                onClick: () => pickFace(f.value),
                className: `h-7 w-7 rounded border text-sm ${props.currentFace === f.value ? "border-emerald-500 bg-emerald-50" : "border-slate-300 bg-white"}`,
                children: f.symbol
              },
              f.value
            )) }) : /* @__PURE__ */ jsx("div", { className: "flex gap-1", children: DASH_OPTIONS.map((d) => /* @__PURE__ */ jsx(
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
          section === "size" && /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1", children: [
            /* @__PURE__ */ jsx("span", { className: "text-[11px] font-medium text-slate-500", children: "\u0110\u1ED9 d\xE0y" }),
            /* @__PURE__ */ jsx("div", { className: "flex gap-1", children: WIDTH_OPTIONS.map((w) => /* @__PURE__ */ jsx(
              "button",
              {
                "aria-label": `\u0110\u1ED9 d\xE0y ${w}`,
                onClick: () => pickWidth(w),
                className: `flex-1 rounded border py-1 ${currentWidth === w ? "border-emerald-500 bg-emerald-50" : "border-slate-300 bg-white"}`,
                children: /* @__PURE__ */ jsx("span", { className: "inline-block rounded bg-slate-800", style: { width: 30, height: w } })
              },
              w
            )) })
          ] }),
          section === "name" && /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-2", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1", children: [
              /* @__PURE__ */ jsx("span", { className: "text-[11px] font-medium text-slate-500", children: "T\xEAn" }),
              /* @__PURE__ */ jsx(
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
              /* @__PURE__ */ jsx("span", { className: "text-[10px] text-slate-400", children: "Tr\xF9ng t\xEAn s\u1EBD t\u1EF1 th\xEAm ch\u1EC9 s\u1ED1 (B \u2192 B\u2082)" })
            ] }),
            /* @__PURE__ */ jsxs("label", { className: "flex items-center justify-between gap-2 text-[12px] text-slate-700", children: [
              /* @__PURE__ */ jsx("span", { children: "Hi\u1EC3n th\u1ECB t\xEAn" }),
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "checkbox",
                  checked: props.currentShowLabel !== false,
                  onChange: (e) => toggleShowLabel(e.target.checked),
                  "aria-label": "Hi\u1EC3n th\u1ECB t\xEAn"
                }
              )
            ] }),
            (props.kind === "line" || props.kind === "circle") && /* @__PURE__ */ jsxs("label", { className: "flex items-center justify-between gap-2 text-[12px] text-slate-700", children: [
              /* @__PURE__ */ jsx("span", { children: "Hi\u1EC3n th\u1ECB gi\xE1 tr\u1ECB" }),
              /* @__PURE__ */ jsx(
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
  return createPortal(node, document.body);
};
var LABELS = {
  rotate: { aria: "G\xF3c quay", label: "G\xF3c (\xB0)", step: 15 },
  dilate: { aria: "T\u1EF7 s\u1ED1 k", label: "T\u1EF7 s\u1ED1 k", step: 0.5 },
  regularPolygon: { aria: "S\u1ED1 c\u1EA1nh \u0111a gi\xE1c \u0111\u1EC1u", label: "S\u1ED1 c\u1EA1nh (n \u2265 3)", step: 1, min: 3 }
};
var TransformParamPopover = ({ kind, anchor, defaultValue, onConfirm, onCancel, isDark }) => {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef(null);
  const meta = LABELS[kind];
  useEffect(() => {
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
  const node = /* @__PURE__ */ jsxs(
    "div",
    {
      "data-stamp-area": "true",
      className: `${isDark ? "theme--dark " : ""}fixed z-[2147483600] flex flex-col gap-2 rounded-lg border border-slate-300 bg-white p-3 shadow-2xl ring-1 ring-black/5`,
      style: { left: anchor.x, top: anchor.y, minWidth: 180 },
      role: "dialog",
      "aria-label": meta.aria,
      children: [
        /* @__PURE__ */ jsx("label", { className: "text-xs font-medium text-slate-700", children: meta.label }),
        /* @__PURE__ */ jsx(
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
        /* @__PURE__ */ jsxs("div", { className: "flex justify-end gap-2", children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: onCancel,
              className: "rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-100",
              children: "Hu\u1EF7"
            }
          ),
          /* @__PURE__ */ jsx(
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
  return createPortal(node, document.body);
};
var GeometryEditorPanel = forwardRef(
  function GeometryEditorPanel2({ initialState, onInsert, onClose, withLeftPanel = false, onStateChange, isDark, isMobile = false, onOpenDrawer }, ref) {
    const handleRef = useRef(null);
    const [ready, setReady] = useState(false);
    const [propsPopover, setPropsPopover] = useState(null);
    const [transformPopover, setTransformPopover] = useState(null);
    const onStateChangeRef = useRef(onStateChange);
    useEffect(() => {
      onStateChangeRef.current = onStateChange;
    }, [onStateChange]);
    const emitState = useCallback(() => {
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
    const handleReady = useCallback((h) => {
      handleRef.current = h;
      setReady(true);
      emitState();
      h.subscribe(emitState);
      h.onSelect((snap) => setPropsPopover(snap));
      h.onTransformParam((info) => setTransformPopover(info));
    }, [emitState]);
    const performInsert = useCallback(() => {
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
    const handleInsert = useCallback(() => {
      performInsert();
    }, [performInsert]);
    useImperativeHandle(ref, () => ({
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
    return /* @__PURE__ */ jsxs(
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
          /* @__PURE__ */ jsxs("header", { className: "flex items-center gap-2 border-b border-slate-200 bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-2 text-white", children: [
            isMobile && /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: onOpenDrawer,
                "aria-label": "M\u1EDF ng\u0103n c\xF4ng c\u1EE5",
                className: "-ml-1 inline-flex h-10 w-10 items-center justify-center rounded transition hover:bg-white/15",
                children: /* @__PURE__ */ jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
                  /* @__PURE__ */ jsx("line", { x1: "4", y1: "6", x2: "20", y2: "6" }),
                  /* @__PURE__ */ jsx("line", { x1: "4", y1: "12", x2: "20", y2: "12" }),
                  /* @__PURE__ */ jsx("line", { x1: "4", y1: "18", x2: "20", y2: "18" })
                ] })
              }
            ),
            /* @__PURE__ */ jsxs("h3", { className: "flex flex-1 items-center gap-2 text-sm font-semibold", children: [
              /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
                /* @__PURE__ */ jsx("polygon", { points: "3,18 12,3 21,18" }),
                /* @__PURE__ */ jsx("circle", { cx: "12", cy: "3", r: "1.5", fill: "currentColor" }),
                /* @__PURE__ */ jsx("circle", { cx: "3", cy: "18", r: "1.5", fill: "currentColor" }),
                /* @__PURE__ */ jsx("circle", { cx: "21", cy: "18", r: "1.5", fill: "currentColor" })
              ] }),
              "D\u1EF1ng h\xECnh h\u1ECDc"
            ] }),
            isMobile && /* @__PURE__ */ jsx(
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
            /* @__PURE__ */ jsx("button", { onClick: onClose, "aria-label": "\u0110\xF3ng", className: "inline-flex h-9 w-9 items-center justify-center rounded transition hover:bg-white/15", children: /* @__PURE__ */ jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
              /* @__PURE__ */ jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" }),
              /* @__PURE__ */ jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" })
            ] }) })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "min-h-0 flex-1", style: isMobile ? void 0 : { height: "420px" }, children: /* @__PURE__ */ jsx(
            JSXGraphMiniBoard,
            {
              onReady: handleReady,
              initialState,
              isDark
            }
          ) }),
          propsPopover && (propsPopover.kind === "point" ? /* @__PURE__ */ jsx(
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
          ) : /* @__PURE__ */ jsx(
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
          transformPopover && /* @__PURE__ */ jsx(
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
          !isMobile && /* @__PURE__ */ jsxs("footer", { className: "flex items-center justify-between border-t border-slate-200 bg-slate-50 px-3 py-2", children: [
            /* @__PURE__ */ jsx("span", { className: "text-xs text-slate-500", children: "Ch\u1ECDn c\xF4ng c\u1EE5 b\xEAn tr\xE1i, click tr\xEAn b\u1EA3ng \u0111\u1EC3 d\u1EF1ng h\xECnh." }),
            /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
              /* @__PURE__ */ jsx(
                "button",
                {
                  onClick: onClose,
                  className: "rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100",
                  children: "Hu\u1EF7"
                }
              ),
              /* @__PURE__ */ jsx(
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
var A_CODE2 = "a".charCodeAt(0);
function isFieldFocused() {
  const ae = typeof document !== "undefined" ? document.activeElement : null;
  return !!(ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.isContentEditable));
}
function useChordShortcut(args) {
  const { groupOrder, tools, onSelect, enabled } = args;
  const [chordGroup, setChordGroup] = useState(null);
  const groupOrderRef = useRef(groupOrder);
  const toolsRef = useRef(tools);
  const onSelectRef = useRef(onSelect);
  const chordGroupRef = useRef(null);
  groupOrderRef.current = groupOrder;
  toolsRef.current = tools;
  onSelectRef.current = onSelect;
  const cancel = useCallback(() => {
    chordGroupRef.current = null;
    setChordGroup(null);
  }, []);
  useEffect(() => {
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

// src/stamps/shared/insertImage.ts
var clearAppStateAfterInsert = () => ({
  selectedElementIds: {},
  croppingElementId: null
});
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
function isGeometryCustomData(data) {
  if (!data || typeof data !== "object") return false;
  const d = data;
  return d.kind === "geometry" && d.version === 1 && typeof d.jsonState === "string";
}
var INITIAL_GEOM_STATE = {
  tool: "move",
  showAxis: false,
  showGrid: false,
  canUndo: false
};
var GeometryStampHost = forwardRef(
  function GeometryStampHost2({ api, editingElement, onClose, isDark }, ref) {
    const panelRef = useRef(null);
    const [geomState, setGeomState] = useState(INITIAL_GEOM_STATE);
    const { isMobile } = useIsMobile();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const { chordGroup } = useChordShortcut({
      groupOrder: GROUP_ORDER,
      tools: TOOLS,
      onSelect: (key) => panelRef.current?.setTool(key),
      enabled: !isMobile
    });
    const initialState = useMemo(() => {
      if (!editingElement) return null;
      if (!isGeometryCustomData(editingElement.customData)) return null;
      try {
        return JSON.parse(editingElement.customData.jsonState);
      } catch {
        console.warn("GeometryStampHost: customData jsonState corrupted");
        return null;
      }
    }, [editingElement]);
    const handleInsert = useCallback(
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
    useImperativeHandle(
      ref,
      () => ({
        tryInsert: () => panelRef.current?.insert() ?? false,
        hasContent: () => panelRef.current?.hasContent() ?? false
      }),
      []
    );
    return /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx(
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
      /* @__PURE__ */ jsx(
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
function Shell2({ title, icon, onClose, children, isMobile, drawerOpen, onDrawerClose }) {
  const mobileAttrs = isMobile ? {
    "data-mobile-drawer": "true",
    "data-drawer-state": drawerOpen ? "open" : "closed"
  } : {};
  const handleHeaderClose = () => {
    if (isMobile) onDrawerClose?.();
    else onClose();
  };
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    isMobile && drawerOpen && /* @__PURE__ */ jsx(
      "div",
      {
        className: "stamp-drawer-backdrop",
        onPointerDown: onDrawerClose,
        "aria-hidden": "true"
      }
    ),
    /* @__PURE__ */ jsxs(
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
          /* @__PURE__ */ jsxs("header", { className: "flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-3 py-2", children: [
            /* @__PURE__ */ jsxs("h3", { className: "flex items-center gap-2 text-sm font-semibold text-slate-800", children: [
              /* @__PURE__ */ jsx("span", { className: "text-base leading-none", children: icon }),
              title
            ] }),
            /* @__PURE__ */ jsx(
              "button",
              {
                onClick: handleHeaderClose,
                "aria-label": isMobile ? "\u0110\xF3ng ng\u0103n c\xF4ng c\u1EE5" : "\u0110\xF3ng",
                className: "rounded p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800",
                children: /* @__PURE__ */ jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
                  /* @__PURE__ */ jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" }),
                  /* @__PURE__ */ jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" })
                ] })
              }
            )
          ] }),
          /* @__PURE__ */ jsx("div", { className: "min-h-0 flex-1 overflow-y-auto p-3 space-y-4", children })
        ]
      }
    )
  ] });
}
function Section2({ label, children }) {
  return /* @__PURE__ */ jsxs("section", { children: [
    /* @__PURE__ */ jsx("h4", { className: "mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500", children: label }),
    children
  ] });
}
var SNIPPETS = [
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
function LeftPanel2({
  displayMode,
  onDisplayModeChange,
  onInsertSnippet,
  onClose,
  isMobile,
  drawerOpen,
  onDrawerClose
}) {
  return /* @__PURE__ */ jsxs(
    Shell2,
    {
      title: "C\xF4ng th\u1EE9c LaTeX",
      icon: "\u2211",
      onClose,
      isMobile,
      drawerOpen,
      onDrawerClose,
      children: [
        /* @__PURE__ */ jsx(Section2, { label: "Ch\u1EBF \u0111\u1ED9 hi\u1EC3n th\u1ECB", children: /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-1.5", children: [
          /* @__PURE__ */ jsxs(
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
                /* @__PURE__ */ jsx("span", { className: "block font-medium", children: "Inline" }),
                /* @__PURE__ */ jsx("span", { className: "block text-[10px] text-slate-500", children: "$ ... $" })
              ]
            }
          ),
          /* @__PURE__ */ jsxs(
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
                /* @__PURE__ */ jsx("span", { className: "block font-medium", children: "Block" }),
                /* @__PURE__ */ jsx("span", { className: "block text-[10px] text-slate-500", children: "$$ ... $$" })
              ]
            }
          )
        ] }) }),
        SNIPPETS.map((group) => /* @__PURE__ */ jsx(Section2, { label: group.group, children: /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-1", children: group.items.map((s) => /* @__PURE__ */ jsx(
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
        /* @__PURE__ */ jsx(Section2, { label: "Ph\xEDm t\u1EAFt", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2 text-[11px] text-slate-600", children: [
          /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-1", children: [
            /* @__PURE__ */ jsx("kbd", { className: "rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono", children: "Enter" }),
            "ch\xE8n"
          ] }),
          /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-1", children: [
            /* @__PURE__ */ jsx("kbd", { className: "rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono", children: "Esc" }),
            "\u0111\xF3ng"
          ] })
        ] }) })
      ]
    }
  );
}

// src/stamps/latex/render.ts
var cachedCss = null;
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
var DEBOUNCE_MS = 100;
var EditorPopover = forwardRef(function EditorPopover2({
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
  const [value, setValue] = useState(initialValue);
  const [internalDisplayMode] = useState(false);
  const displayMode = controlledDisplayMode ?? internalDisplayMode;
  const [previewSvg, setPreviewSvg] = useState(null);
  const [error, setError] = useState(null);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);
  useEffect(() => {
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
  const handleInsert = useCallback(() => {
    if (!previewSvg) return;
    onInsert(previewSvg, value, displayMode);
  }, [previewSvg, value, displayMode, onInsert]);
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleInsert();
      }
    },
    [onClose, handleInsert]
  );
  useImperativeHandle(
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
  return /* @__PURE__ */ jsxs(
    "div",
    {
      style: wrapperStyle,
      "data-stamp-area": "true",
      "data-mobile-editor": isMobile ? "true" : void 0,
      className: isMobile ? "flex h-full w-full flex-col bg-white" : "w-[420px] max-w-[calc(100vw-280px)] rounded-lg border border-slate-300 bg-white shadow-2xl ring-1 ring-black/5",
      role: "dialog",
      "aria-label": "Nh\u1EADp c\xF4ng th\u1EE9c LaTeX",
      children: [
        /* @__PURE__ */ jsxs("header", { className: `flex items-center gap-2 border-b border-slate-200 bg-gradient-to-r from-indigo-600 to-purple-600 px-3 py-2 text-white${isMobile ? "" : " rounded-t-lg"}`, children: [
          isMobile && /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: onOpenDrawer,
              "aria-label": "M\u1EDF ng\u0103n snippet",
              className: "-ml-1 inline-flex h-10 w-10 items-center justify-center rounded transition hover:bg-white/15",
              children: /* @__PURE__ */ jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
                /* @__PURE__ */ jsx("line", { x1: "4", y1: "6", x2: "20", y2: "6" }),
                /* @__PURE__ */ jsx("line", { x1: "4", y1: "12", x2: "20", y2: "12" }),
                /* @__PURE__ */ jsx("line", { x1: "4", y1: "18", x2: "20", y2: "18" })
              ] })
            }
          ),
          /* @__PURE__ */ jsxs("h3", { className: "flex flex-1 items-center gap-2 text-sm font-semibold", children: [
            /* @__PURE__ */ jsx("span", { className: "text-base leading-none", children: "\u2211" }),
            "C\xF4ng th\u1EE9c LaTeX"
          ] }),
          isMobile && /* @__PURE__ */ jsx(
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
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: onClose,
              "aria-label": "\u0110\xF3ng",
              className: "inline-flex h-9 w-9 items-center justify-center rounded transition hover:bg-white/15",
              children: /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
                /* @__PURE__ */ jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" }),
                /* @__PURE__ */ jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" })
              ] })
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { className: `space-y-2 p-3${isMobile ? " flex min-h-0 flex-1 flex-col" : ""}`, children: [
          /* @__PURE__ */ jsx(
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
          /* @__PURE__ */ jsx(
            "div",
            {
              className: [
                "flex items-center justify-center rounded border p-3 text-center",
                isMobile ? "min-h-0 flex-1 overflow-auto" : "min-h-[64px]",
                error ? "border-rose-300 bg-rose-50 text-rose-700" : "border-slate-200 bg-slate-50"
              ].join(" "),
              children: error ? /* @__PURE__ */ jsxs("span", { className: "text-xs", children: [
                "L\u1ED7i: ",
                error.slice(0, 80)
              ] }) : previewSvg ? /* @__PURE__ */ jsx("span", { dangerouslySetInnerHTML: { __html: previewSvg } }) : /* @__PURE__ */ jsx("span", { className: "text-xs text-slate-400", children: "(xem tr\u01B0\u1EDBc)" })
            }
          ),
          !isMobile && /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxs("span", { className: "text-[11px] text-slate-500", children: [
              displayMode ? "Block" : "Inline",
              " \xB7 Enter \u0111\u1EC3 ch\xE8n"
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
              /* @__PURE__ */ jsx(
                "button",
                {
                  onClick: onClose,
                  className: "rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100",
                  children: "Hu\u1EF7"
                }
              ),
              /* @__PURE__ */ jsx(
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
          isMobile && /* @__PURE__ */ jsxs("div", { className: "text-center text-[11px] text-slate-500", children: [
            displayMode ? "Block" : "Inline",
            " \xB7 B\u1EA5m Ch\xE8n \u1EDF thanh tr\xEAn"
          ] })
        ] })
      ]
    }
  );
});
function isLatexCustomData(data) {
  if (!data || typeof data !== "object") return false;
  const d = data;
  return d.kind === "latex" && d.version === 1 && typeof d.src === "string";
}
var LatexStampHost = forwardRef(
  function LatexStampHost2({ api, editingElement, onClose }, ref) {
    const editorRef = useRef(null);
    const { isMobile } = useIsMobile();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const initial = useMemo(() => {
      if (editingElement && isLatexCustomData(editingElement.customData)) {
        return {
          initialValue: editingElement.customData.src,
          displayMode: !!editingElement.customData.displayMode
        };
      }
      return { initialValue: "", displayMode: false };
    }, [editingElement]);
    const [displayMode, setDisplayMode] = useState(initial.displayMode);
    const handleInsert = useCallback(
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
    useImperativeHandle(
      ref,
      () => ({
        tryInsert: () => editorRef.current?.tryInsert() ?? false,
        hasContent: () => editorRef.current?.hasContent() ?? false
      }),
      []
    );
    return /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx(
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
      /* @__PURE__ */ jsx(
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

// src/stamps/geometry-3d/editor/handlers.ts
function createHandlerContext(deps) {
  return {
    ...deps,
    pendingPoints: [],
    pendingFlags: {},
    pushedPointCoords: /* @__PURE__ */ new Map()
  };
}
function refByPlaceholder(id) {
  return `@id:${id}`;
}
function createPoint3D(ctx, x, y, z, label) {
  const id = ctx.nextId();
  const attrs = { id, size: 3 };
  const ref = ctx.view.create("point3d", [x, y, z], attrs);
  ctx.objMap.set(id, ref);
  ctx.pushedPointCoords.set(id, [x, y, z]);
  ctx.pushLog({
    type: "point3d",
    parents: [x, y, z],
    attributes: attrs,
    id,
    label
  });
  return { id, ref, coords: [x, y, z] };
}
function resolvePoint(ctx, hit) {
  if (hit.existingPointId && ctx.objMap.has(hit.existingPointId)) {
    const stored = ctx.pushedPointCoords.get(hit.existingPointId);
    return {
      id: hit.existingPointId,
      ref: ctx.objMap.get(hit.existingPointId),
      coords: stored ?? [hit.x3, hit.y3, hit.z3]
    };
  }
  return createPoint3D(ctx, hit.x3, hit.y3, hit.z3);
}
function finishPolygon(ctx, points, extraAttrs = {}) {
  const id = ctx.nextId();
  const refs = points.map((p) => p.ref);
  const attrs = { id, ...extraAttrs };
  const ref = ctx.view.create("polygon3d", [refs], attrs);
  ctx.objMap.set(id, ref);
  ctx.pushLog({
    type: "polygon3d",
    parents: [points.map((p) => refByPlaceholder(p.id))],
    attributes: attrs,
    id
  });
}
function finishLineLike(ctx, elType, points, extraAttrs = {}) {
  const id = ctx.nextId();
  const refs = points.map((p) => p.ref);
  const attrs = { id, ...extraAttrs };
  const ref = ctx.view.create(elType, refs, attrs);
  ctx.objMap.set(id, ref);
  ctx.pushLog({
    type: elType,
    parents: points.map((p) => refByPlaceholder(p.id)),
    attributes: attrs,
    id
  });
}
function handleToolStep(ctx, tool, hit) {
  switch (tool) {
    case "move":
      return;
    case "point": {
      const coords = ctx.promptCoords("To\u1EA1 \u0111\u1ED9 \u0111i\u1EC3m (x, y, z)");
      if (!coords) return;
      createPoint3D(ctx, coords.x, coords.y, coords.z);
      ctx.notify();
      return;
    }
    case "segment":
    case "line": {
      const p = resolvePoint(ctx, hit);
      ctx.pendingPoints.push(p);
      if (ctx.pendingPoints.length === 2) {
        const lineColor = ctx.isDark ? "#9ecbff" : "#0066cc";
        const baseAttrs = {
          strokeColor: lineColor,
          strokeWidth: 2,
          visible: true,
          fixed: true
        };
        if (tool === "segment") {
          baseAttrs.straightFirst = false;
          baseAttrs.straightLast = false;
        }
        finishLineLike(ctx, "line3d", ctx.pendingPoints, baseAttrs);
        ctx.pendingPoints = [];
      }
      ctx.notify();
      return;
    }
    case "plane": {
      const p = resolvePoint(ctx, hit);
      ctx.pendingPoints.push(p);
      if (ctx.pendingPoints.length === 3) {
        finishLineLike(ctx, "plane3d", ctx.pendingPoints);
        ctx.pendingPoints = [];
      }
      ctx.notify();
      return;
    }
    case "triangle": {
      const p = resolvePoint(ctx, hit);
      ctx.pendingPoints.push(p);
      if (ctx.pendingPoints.length === 3) {
        finishPolygon(ctx, ctx.pendingPoints);
        ctx.pendingPoints = [];
      }
      ctx.notify();
      return;
    }
    case "polygon": {
      if (ctx.pendingPoints.length >= 3 && hit.existingPointId === ctx.pendingPoints[0].id) {
        finishPolygon(ctx, ctx.pendingPoints);
        ctx.pendingPoints = [];
        ctx.notify();
        return;
      }
      const p = resolvePoint(ctx, hit);
      ctx.pendingPoints.push(p);
      ctx.notify();
      return;
    }
    case "label": {
      if (!hit.existingPointId) return;
      const text = ctx.promptText("N\u1ED9i dung nh\xE3n");
      if (!text) return;
      const id = ctx.nextId();
      const pointLog = ctx.pushedPointCoords.get(hit.existingPointId);
      if (!pointLog) return;
      const [x, y, z] = pointLog;
      const attrs = {
        id,
        fontSize: 14,
        strokeColor: ctx.isDark ? "#f5f5f5" : "#111111"
      };
      const ref = ctx.view.create("text3d", [x, y, z, text], attrs);
      ctx.objMap.set(id, ref);
      ctx.pushLog({
        type: "text3d",
        parents: [x, y, z, text],
        attributes: attrs,
        id,
        label: text
      });
      ctx.notify();
      return;
    }
    // Solids + curved handled in B8, B9
    default:
      handleSolidStep(ctx, tool, hit);
      return;
  }
}
function handleSolidStep(ctx, tool, hit) {
  switch (tool) {
    case "tetrahedron": {
      const p = resolvePoint(ctx, hit);
      ctx.pendingPoints.push(p);
      if (ctx.pendingPoints.length === 4) {
        const [a, b, c, d] = ctx.pendingPoints;
        finishPolyhedron(ctx, [
          [a, b, c],
          [a, b, d],
          [a, c, d],
          [b, c, d]
        ]);
        ctx.pendingPoints = [];
      }
      ctx.notify();
      return;
    }
    case "parallelepiped": {
      const origin = resolvePoint(ctx, hit);
      const v1 = ctx.promptCoords("Vector c\u1EA1nh 1 (dx, dy, dz)");
      const v2 = ctx.promptCoords("Vector c\u1EA1nh 2 (dx, dy, dz)");
      const v3 = ctx.promptCoords("Vector c\u1EA1nh 3 (dx, dy, dz)");
      if (!v1 || !v2 || !v3) return;
      const [ox, oy, oz] = origin.coords;
      const c1 = createPoint3D(ctx, ox + v1.x, oy + v1.y, oz + v1.z);
      const c2 = createPoint3D(ctx, ox + v2.x, oy + v2.y, oz + v2.z);
      const c3 = createPoint3D(ctx, ox + v3.x, oy + v3.y, oz + v3.z);
      const c12 = createPoint3D(
        ctx,
        ox + v1.x + v2.x,
        oy + v1.y + v2.y,
        oz + v1.z + v2.z
      );
      const c13 = createPoint3D(
        ctx,
        ox + v1.x + v3.x,
        oy + v1.y + v3.y,
        oz + v1.z + v3.z
      );
      const c23 = createPoint3D(
        ctx,
        ox + v2.x + v3.x,
        oy + v2.y + v3.y,
        oz + v2.z + v3.z
      );
      const c123 = createPoint3D(
        ctx,
        ox + v1.x + v2.x + v3.x,
        oy + v1.y + v2.y + v3.y,
        oz + v1.z + v2.z + v3.z
      );
      finishPolyhedron(ctx, [
        [origin, c1, c12, c2],
        [origin, c1, c13, c3],
        [origin, c2, c23, c3],
        [c123, c12, c1, c13],
        [c123, c12, c2, c23],
        [c123, c13, c3, c23]
      ]);
      ctx.pendingPoints = [];
      ctx.notify();
      return;
    }
    case "prism": {
      if (ctx.pendingPoints.length >= 3 && hit.existingPointId === ctx.pendingPoints[0].id) {
        const base = ctx.pendingPoints;
        const height = ctx.promptNumber("Chi\u1EC1u cao (theo tr\u1EE5c z)");
        if (!height) return;
        const top = base.map(
          (bp) => createPoint3D(ctx, bp.coords[0], bp.coords[1], bp.coords[2] + height)
        );
        const faces = [base, top];
        for (let i = 0; i < base.length; i++) {
          const next = (i + 1) % base.length;
          faces.push([base[i], base[next], top[next], top[i]]);
        }
        finishPolyhedron(ctx, faces);
        ctx.pendingPoints = [];
        ctx.notify();
        return;
      }
      const p = resolvePoint(ctx, hit);
      ctx.pendingPoints.push(p);
      ctx.notify();
      return;
    }
    case "pyramid": {
      const baseDone = ctx.pendingFlags.pyramidBaseDone === true;
      if (!baseDone && ctx.pendingPoints.length >= 3 && hit.existingPointId === ctx.pendingPoints[0].id) {
        ctx.pendingFlags.pyramidBaseDone = true;
        ctx.notify();
        return;
      }
      if (baseDone) {
        const base = ctx.pendingPoints;
        const apex = createPoint3D(ctx, hit.x3, hit.y3, hit.z3);
        const faces = [base];
        for (let i = 0; i < base.length; i++) {
          const next = (i + 1) % base.length;
          faces.push([base[i], base[next], apex]);
        }
        finishPolyhedron(ctx, faces);
        ctx.pendingPoints = [];
        ctx.pendingFlags.pyramidBaseDone = false;
        ctx.notify();
        return;
      }
      const p = resolvePoint(ctx, hit);
      ctx.pendingPoints.push(p);
      ctx.notify();
      return;
    }
    // Curved → B9
    default:
      handleCurvedStep(ctx, tool, hit);
      return;
  }
}
function finishPolyhedron(ctx, faces) {
  const faceColor = ctx.isDark ? "rgba(150, 180, 220, 0.35)" : "rgba(60, 120, 200, 0.25)";
  const edgeColor = ctx.isDark ? "#9ecbff" : "#0066cc";
  for (const face of faces) {
    finishPolygon(ctx, face, {
      fillColor: faceColor,
      fillOpacity: 1,
      strokeColor: edgeColor,
      strokeWidth: 1.5,
      visible: true
    });
  }
}
var CURVED_SEGMENTS = 16;
function handleCurvedStep(ctx, tool, hit) {
  switch (tool) {
    case "sphere": {
      const radius = ctx.promptNumber("B\xE1n k\xEDnh m\u1EB7t c\u1EA7u");
      if (radius == null) return;
      const center = resolvePoint(ctx, hit);
      const id = ctx.nextId();
      const ref = ctx.view.create("sphere3d", [center.ref, radius], { id });
      ctx.objMap.set(id, ref);
      ctx.pushLog({
        type: "sphere3d",
        parents: [refByPlaceholder(center.id), radius],
        attributes: { id },
        id
      });
      ctx.notify();
      return;
    }
    case "cone": {
      const baseDone = ctx.pendingFlags.coneBaseDone === true;
      if (!baseDone) {
        const radius2 = ctx.promptNumber("B\xE1n k\xEDnh \u0111\xE1y");
        if (radius2 == null) return;
        const center2 = resolvePoint(ctx, hit);
        ctx.pendingFlags.coneCenter = center2;
        ctx.pendingFlags.coneRadius = radius2;
        ctx.pendingFlags.coneBaseDone = true;
        ctx.notify();
        return;
      }
      const center = ctx.pendingFlags.coneCenter;
      const radius = ctx.pendingFlags.coneRadius;
      const apex = createPoint3D(ctx, hit.x3, hit.y3, hit.z3);
      const [cx, cy, cz] = center.coords;
      const basePoints = [];
      for (let i = 0; i < CURVED_SEGMENTS; i++) {
        const theta = i / CURVED_SEGMENTS * Math.PI * 2;
        basePoints.push(
          createPoint3D(
            ctx,
            cx + radius * Math.cos(theta),
            cy + radius * Math.sin(theta),
            cz
          )
        );
      }
      const faces = [basePoints];
      for (let i = 0; i < CURVED_SEGMENTS; i++) {
        faces.push([basePoints[i], basePoints[(i + 1) % CURVED_SEGMENTS], apex]);
      }
      finishPolyhedron(ctx, faces);
      ctx.pendingFlags.coneBaseDone = false;
      ctx.pendingFlags.coneCenter = void 0;
      ctx.pendingFlags.coneRadius = void 0;
      ctx.notify();
      return;
    }
    case "cylinder": {
      const radius = ctx.promptNumber("B\xE1n k\xEDnh \u0111\xE1y");
      if (radius == null) return;
      const height = ctx.promptNumber("Chi\u1EC1u cao (theo tr\u1EE5c z)");
      if (height == null) return;
      const center = resolvePoint(ctx, hit);
      const [cx, cy, cz] = center.coords;
      const basePoints = [];
      const topPoints = [];
      for (let i = 0; i < CURVED_SEGMENTS; i++) {
        const theta = i / CURVED_SEGMENTS * Math.PI * 2;
        basePoints.push(
          createPoint3D(
            ctx,
            cx + radius * Math.cos(theta),
            cy + radius * Math.sin(theta),
            cz
          )
        );
        topPoints.push(
          createPoint3D(
            ctx,
            cx + radius * Math.cos(theta),
            cy + radius * Math.sin(theta),
            cz + height
          )
        );
      }
      const faces = [basePoints, topPoints];
      for (let i = 0; i < CURVED_SEGMENTS; i++) {
        const next = (i + 1) % CURVED_SEGMENTS;
        faces.push([basePoints[i], basePoints[next], topPoints[next], topPoints[i]]);
      }
      finishPolyhedron(ctx, faces);
      ctx.notify();
      return;
    }
    // 'solidofrevolution' removed in 0.6.1 — `solidofrevolution3d` is not a valid
    // JSXGraph 1.12.2 element. See Bug #8.
    default:
      return;
  }
}
var MiniBoard3D = forwardRef(function MiniBoard3D2({ isDark, initialState }, ref) {
  const reactId = useId();
  const containerId = `geom3d_${reactId.replace(/[^a-zA-Z0-9_]/g, "_")}`;
  const containerRef = useRef(null);
  const boardRef = useRef(null);
  const viewRef = useRef(null);
  const toolRef = useRef("move");
  const logRef = useRef([]);
  const objMapRef = useRef(/* @__PURE__ */ new Map());
  const subsRef = useRef(/* @__PURE__ */ new Set());
  const initialBbox3D = useRef(
    initialState?.view.bbox3D ?? DEFAULT_VIEW3D.bbox3D
  );
  const ctxRef = useRef(null);
  const pointerHandlerRef = useRef(null);
  const [showAxes, setShowAxes] = useState(initialState?.showAxes ?? true);
  const [showMesh, setShowMesh] = useState(initialState?.showMesh ?? false);
  const notify = useCallback(() => {
    for (const cb of subsRef.current) cb();
  }, []);
  useEffect(() => {
    const div = containerRef.current;
    if (!div) return;
    let cancelled = false;
    let JXG = null;
    let board = null;
    void (async () => {
      JXG = (await import('jsxgraph')).default;
      if (cancelled || !containerRef.current) return;
      JXG.Options.text.display = "internal";
      board = JXG.JSXGraph.initBoard(div, {
        boundingbox: [-6, 6, 6, -6],
        axis: false,
        showCopyright: false,
        showNavigation: false,
        renderer: "svg"
      });
      boardRef.current = board;
      const initView = initialState?.view ?? DEFAULT_VIEW3D;
      const baseAttrs = VIEW3D_ATTRS(isDark);
      const view = board.create(
        "view3d",
        [
          [-5, -5],
          [10, 10],
          [
            [initView.bbox3D[0], initView.bbox3D[3]],
            [initView.bbox3D[1], initView.bbox3D[4]],
            [initView.bbox3D[2], initView.bbox3D[5]]
          ]
        ],
        {
          ...baseAttrs,
          az: { ...baseAttrs.az, value: initView.azimuth },
          el: { ...baseAttrs.el, value: initView.elevation }
        }
      );
      viewRef.current = view;
      let idCounter = 1;
      const ctx = createHandlerContext({
        view,
        pushLog: (e) => {
          logRef.current.push(e);
          notify();
        },
        objMap: objMapRef.current,
        nextId: () => `obj_${Date.now().toString(36)}_${(idCounter++).toString(36)}`,
        isDark,
        promptCoords: (label) => {
          const raw = window.prompt(`${label}
(\u0111\u1ECBnh d\u1EA1ng "x,y,z")`, "0,0,0");
          if (!raw) return null;
          const parts = raw.split(",").map((s) => Number(s.trim()));
          if (parts.length !== 3 || parts.some((n) => !isFinite(n))) return null;
          return { x: parts[0], y: parts[1], z: parts[2] };
        },
        promptNumber: (label) => {
          const raw = window.prompt(label, "1");
          if (raw == null) return null;
          const n = Number(raw);
          return isFinite(n) ? n : null;
        },
        promptText: (label) => {
          const raw = window.prompt(label, "");
          return raw == null ? null : raw;
        },
        notify
      });
      ctxRef.current = ctx;
      function findExistingPointAt(clientX, clientY) {
        const containerRect = div.getBoundingClientRect();
        const localX = clientX - containerRect.left;
        const localY = clientY - containerRect.top;
        const PICK = 18;
        const svg = div.querySelector("svg");
        if (!svg) return void 0;
        for (const [id, obj] of objMapRef.current) {
          const entry = obj;
          if (entry?.elType !== "point3d") continue;
          const sc = entry.element2D?.coords?.scrCoords;
          if (!sc || sc.length < 3) continue;
          const dx = sc[1] - localX;
          const dy = sc[2] - localY;
          if (dx * dx + dy * dy <= PICK * PICK) return id;
        }
        return void 0;
      }
      const handlePointerDown = (e) => {
        const tool = toolRef.current;
        if (tool === "move") return;
        const existingPointId = findExistingPointAt(e.clientX, e.clientY);
        let x3 = 0;
        let y3 = 0;
        const z3 = 0;
        try {
          const board2d = boardRef.current;
          if (board2d?.getUsrCoordsOfMouse) {
            const uc = board2d.getUsrCoordsOfMouse(e);
            if (Array.isArray(uc) && uc.length >= 2) {
              x3 = uc[0];
              y3 = uc[1];
            }
          }
        } catch {
        }
        const hit = { x3, y3, z3, existingPointId };
        handleToolStep(ctx, tool, hit);
      };
      const svgEl = div.querySelector("svg");
      const targetEl = svgEl ?? div;
      const handlePointerDownEv = (e) => handlePointerDown(e);
      targetEl.addEventListener("pointerdown", handlePointerDownEv);
      pointerHandlerRef.current = { el: targetEl, fn: handlePointerDownEv };
      if (initialState?.elements?.length) {
        const map = objMapRef.current;
        for (const el of initialState.elements) {
          const parents = el.parents.map(
            (p2) => typeof p2 === "string" && p2.startsWith("@id:") ? map.get(p2.slice(4)) : p2
          );
          const obj = view.create(el.type, parents, {
            ...el.attributes,
            id: el.id,
            name: el.label
          });
          map.set(el.id, obj);
          logRef.current.push(el);
        }
      }
    })();
    return () => {
      cancelled = true;
      if (pointerHandlerRef.current) {
        pointerHandlerRef.current.el.removeEventListener(
          "pointerdown",
          pointerHandlerRef.current.fn
        );
        pointerHandlerRef.current = null;
      }
      try {
        if (board && JXG) JXG.JSXGraph.freeBoard(board);
      } catch {
      }
      boardRef.current = null;
      viewRef.current = null;
      ctxRef.current = null;
      objMapRef.current.clear();
    };
  }, []);
  const handleRef = useRef(null);
  handleRef.current = {
    getContainer: () => containerRef.current,
    getTool: () => toolRef.current,
    setTool: (t) => {
      toolRef.current = t;
      notify();
    },
    // Sync toạ độ live của free point3d về log trước khi trả ra. JSXGraph
    // cho phép drag point3d (parents=[x,y,z] không có ref), việc drag chỉ
    // cập nhật obj.X()/Y()/Z() chứ không đụng log → re-edit + Chèn sẽ
    // serialize toạ độ cũ → SVG không đổi → fileId trùng → user thấy
    // "k thay đổi". Line/plane/polygon/sphere tham chiếu point qua @id nên
    // auto-update theo.
    getCreationLog: () => logRef.current.map((e) => {
      if (e.type !== "point3d") return { ...e };
      const parents = e.parents;
      if (!Array.isArray(parents) || parents.length !== 3) return { ...e };
      if (typeof parents[0] !== "number" || typeof parents[1] !== "number" || typeof parents[2] !== "number") return { ...e };
      const obj = objMapRef.current.get(e.id);
      if (!obj || typeof obj.X !== "function" || typeof obj.Y !== "function" || typeof obj.Z !== "function") return { ...e };
      const x = obj.X();
      const y = obj.Y();
      const z = obj.Z();
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return { ...e };
      return { ...e, parents: [x, y, z] };
    }),
    pushLog: (e) => {
      logRef.current.push(e);
      notify();
    },
    getViewState: () => {
      const v = viewRef.current;
      return {
        azimuth: v?.az?.Value?.() ?? DEFAULT_VIEW3D.azimuth,
        elevation: v?.el?.Value?.() ?? DEFAULT_VIEW3D.elevation,
        bbox3D: initialBbox3D.current
      };
    },
    getBbox: () => [-6, 6, 6, -6],
    getShowAxes: () => showAxes,
    getShowMesh: () => showMesh,
    setShowAxes: (b) => {
      setShowAxes(b);
      notify();
    },
    setShowMesh: (b) => {
      setShowMesh(b);
      notify();
    },
    resetView: () => {
      notify();
    },
    undo: () => {
      logRef.current.pop();
      notify();
    },
    canUndo: () => logRef.current.length > 0,
    snapshotSVG: () => {
      const div = containerRef.current;
      if (!div) return { svgString: "", width: 0, height: 0 };
      const svg = div.querySelector("svg");
      if (!svg) return { svgString: "", width: 0, height: 0 };
      const clone = svg.cloneNode(true);
      const rect = svg.getBoundingClientRect();
      const width = rect.width || 600;
      const height = rect.height || 600;
      clone.setAttribute("width", String(width));
      clone.setAttribute("height", String(height));
      return {
        svgString: new XMLSerializer().serializeToString(clone),
        width,
        height
      };
    },
    subscribe: (cb) => {
      subsRef.current.add(cb);
      return () => {
        subsRef.current.delete(cb);
      };
    }
  };
  useImperativeHandle(ref, () => handleRef.current, []);
  const p = paletteFor2(isDark);
  return /* @__PURE__ */ jsx(
    "div",
    {
      ref: containerRef,
      id: containerId,
      style: {
        width: "100%",
        height: "100%",
        background: p.view3dBg,
        position: "relative",
        // Clip JSXGraph mesh3d/bounding-box paths that project outside the
        // board container (Bug #4) — without this they overlap LeftPanel and
        // block pointer events.
        overflow: "hidden"
      }
    }
  );
});
var EditorPanel = forwardRef(function EditorPanel2({ isDark, initial, onInsert, onClose, isMobile = false, withLeftPanel = false, onBoardReady, onOpenDrawer }, ref) {
  const boardRef = useRef(null);
  const [ready, setReady] = useState(false);
  const onBoardReadyRef = useRef(onBoardReady);
  onBoardReadyRef.current = onBoardReady;
  const setBoard = useCallback((h) => {
    boardRef.current = h;
    setReady(!!h);
    onBoardReadyRef.current?.(h);
  }, []);
  const performInsert = useCallback(() => {
    const board = boardRef.current;
    if (!board) return false;
    const log = board.getCreationLog();
    if (log.length === 0) return false;
    const view = board.getViewState();
    const state = {
      version: 1,
      bbox: board.getBbox(),
      view,
      showAxes: board.getShowAxes(),
      showMesh: board.getShowMesh(),
      elements: log
    };
    const snap = board.snapshotSVG();
    onInsert(JSON.stringify(state), snap.svgString, snap.width, snap.height);
    return true;
  }, [onInsert]);
  useImperativeHandle(
    ref,
    () => ({
      tryInsert: performInsert,
      hasContent: () => (boardRef.current?.getCreationLog().length ?? 0) > 0
    }),
    [performInsert]
  );
  const handleInsert = useCallback(() => {
    performInsert();
  }, [performInsert]);
  const wrapperStyle = isMobile ? { position: "fixed", inset: 0, zIndex: 40 } : {
    position: "absolute",
    top: "50%",
    left: withLeftPanel ? "calc(50% + 120px)" : "50%",
    transform: "translate(-50%, -50%)",
    zIndex: 40
  };
  return /* @__PURE__ */ jsxs(
    "div",
    {
      role: "dialog",
      "aria-label": "D\u1EF1ng h\xECnh h\u1ECDc 3D",
      "data-testid": "geom3d-editor-panel",
      "data-stamp-area": "true",
      "data-mobile-editor": isMobile ? "true" : void 0,
      style: wrapperStyle,
      className: [
        isDark ? "theme--dark " : "",
        "flex flex-col overflow-hidden bg-white",
        isMobile ? "h-full w-full" : "h-[600px] max-h-[85vh] w-[760px] max-w-[calc(100vw-280px)] rounded-lg border border-slate-300 shadow-2xl ring-1 ring-black/5"
      ].join(" "),
      children: [
        /* @__PURE__ */ jsxs("header", { className: "flex items-center gap-2 border-b border-slate-200 bg-gradient-to-r from-blue-600 to-cyan-600 px-3 py-2 text-white", children: [
          isMobile && /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: onOpenDrawer,
              "aria-label": "M\u1EDF ng\u0103n c\xF4ng c\u1EE5",
              className: "-ml-1 inline-flex h-10 w-10 items-center justify-center rounded transition hover:bg-white/15",
              children: /* @__PURE__ */ jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
                /* @__PURE__ */ jsx("line", { x1: "4", y1: "6", x2: "20", y2: "6" }),
                /* @__PURE__ */ jsx("line", { x1: "4", y1: "12", x2: "20", y2: "12" }),
                /* @__PURE__ */ jsx("line", { x1: "4", y1: "18", x2: "20", y2: "18" })
              ] })
            }
          ),
          /* @__PURE__ */ jsxs("h3", { className: "flex flex-1 items-center gap-2 text-sm font-semibold", children: [
            /* @__PURE__ */ jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ jsx("path", { d: "M4 7 L14 4 L20 7 L14 10 Z M4 7 L4 17 L14 20 L14 10 M14 20 L20 17 L20 7" }) }),
            "H\xECnh h\u1ECDc kh\xF4ng gian (3D)"
          ] }),
          isMobile && /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: handleInsert,
              disabled: !ready,
              "data-testid": "geom3d-insert-btn-mobile",
              className: "rounded bg-white/15 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/25 disabled:opacity-50",
              children: "Ch\xE8n"
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: onClose,
              "aria-label": "\u0110\xF3ng",
              className: "inline-flex h-9 w-9 items-center justify-center rounded transition hover:bg-white/15",
              children: /* @__PURE__ */ jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
                /* @__PURE__ */ jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" }),
                /* @__PURE__ */ jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" })
              ] })
            }
          )
        ] }),
        /* @__PURE__ */ jsx("div", { className: "min-h-0 flex-1", children: /* @__PURE__ */ jsx(MiniBoard3D, { ref: setBoard, isDark, initialState: initial }) }),
        !isMobile && /* @__PURE__ */ jsxs("footer", { className: "flex items-center justify-between border-t border-slate-200 bg-slate-50 px-3 py-2", children: [
          /* @__PURE__ */ jsx("span", { className: "text-xs text-slate-500", children: "Ch\u1ECDn c\xF4ng c\u1EE5 b\xEAn tr\xE1i, click tr\xEAn b\u1EA3ng \u0111\u1EC3 d\u1EF1ng h\xECnh." }),
          /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
            /* @__PURE__ */ jsx(
              "button",
              {
                onClick: onClose,
                className: "rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100",
                children: "Hu\u1EF7"
              }
            ),
            /* @__PURE__ */ jsx(
              "button",
              {
                onClick: handleInsert,
                disabled: !ready,
                "data-testid": "geom3d-insert-btn",
                className: "rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-blue-700 disabled:opacity-50",
                children: "Ch\xE8n"
              }
            )
          ] })
        ] })
      ]
    }
  );
});

// src/stamps/geometry-3d/editor/tools.ts
var GROUP_LABELS_3D = {
  view: "Xem",
  primitive: "C\u01A1 b\u1EA3n",
  solid: "Kh\u1ED1i \u0111a di\u1EC7n",
  curved: "Kh\u1ED1i cong",
  meta: "Kh\xE1c"
};
var GROUP_ORDER_3D = [
  "view",
  "primitive",
  "solid",
  "curved",
  "meta"
];
var A_CODE_3D = "A".charCodeAt(0);
function letterForGroup3D(g) {
  const idx = GROUP_ORDER_3D.indexOf(g);
  return idx >= 0 ? String.fromCharCode(A_CODE_3D + idx) : "";
}
var TOOLS_3D = [
  { key: "move", label: "Di chuy\u1EC3n", group: "view", stepsRequired: 0 },
  { key: "point", label: "\u0110i\u1EC3m", group: "primitive", stepsRequired: 1, hint: "Nh\u1EADp (x, y, z)" },
  { key: "segment", label: "\u0110o\u1EA1n th\u1EB3ng", group: "primitive", stepsRequired: 2 },
  { key: "line", label: "\u0110\u01B0\u1EDDng th\u1EB3ng", group: "primitive", stepsRequired: 2 },
  { key: "plane", label: "M\u1EB7t ph\u1EB3ng", group: "primitive", stepsRequired: 3 },
  { key: "triangle", label: "Tam gi\xE1c", group: "primitive", stepsRequired: 3 },
  {
    key: "polygon",
    label: "\u0110a gi\xE1c",
    group: "primitive",
    stepsRequired: 3,
    hint: "Click tr\u1EDF l\u1EA1i \u0111i\u1EC3m \u0111\u1EA7u \u0111\u1EC3 \u0111\xF3ng"
  },
  { key: "tetrahedron", label: "T\u1EE9 di\u1EC7n", group: "solid", stepsRequired: 4 },
  {
    key: "parallelepiped",
    label: "H\xECnh h\u1ED9p",
    group: "solid",
    stepsRequired: 1,
    hint: "1 \u0111\u1EC9nh + 3 vector"
  },
  {
    key: "prism",
    label: "L\u0103ng tr\u1EE5",
    group: "solid",
    stepsRequired: 3,
    hint: "\u0110a gi\xE1c \u0111\xE1y + chi\u1EC1u cao"
  },
  {
    key: "pyramid",
    label: "Ch\xF3p",
    group: "solid",
    stepsRequired: 4,
    hint: "\u0110a gi\xE1c \u0111\xE1y + \u0111\u1EC9nh"
  },
  { key: "sphere", label: "M\u1EB7t c\u1EA7u", group: "curved", stepsRequired: 1, hint: "T\xE2m + b\xE1n k\xEDnh" },
  {
    key: "cone",
    label: "H\xECnh n\xF3n",
    group: "curved",
    stepsRequired: 2,
    hint: "T\xE2m \u0111\xE1y + b\xE1n k\xEDnh + \u0111\u1EC9nh"
  },
  {
    key: "cylinder",
    label: "H\xECnh tr\u1EE5",
    group: "curved",
    stepsRequired: 1,
    hint: "T\xE2m \u0111\xE1y + b\xE1n k\xEDnh + chi\u1EC1u cao"
  },
  { key: "label", label: "Nh\xE3n", group: "meta", stepsRequired: 1, hint: "G\u1EAFn v\xE0o \u0111i\u1EC3m" }
];
function ToolButton({ toolKey, label, hint, active, onClick, icon, badge }) {
  return /* @__PURE__ */ jsxs(
    "button",
    {
      type: "button",
      title: hint ? `${label} \u2014 ${hint}` : label,
      "aria-label": label,
      "aria-pressed": active,
      onClick,
      "data-active": active || void 0,
      "data-tool": toolKey,
      className: [
        "relative flex h-8 items-center justify-center rounded-md transition",
        active ? "bg-blue-600 text-white shadow-sm" : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
      ].join(" "),
      children: [
        icon,
        badge
      ]
    }
  );
}
var stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round"
};
var ICONS_3D = {
  move: /* @__PURE__ */ jsx("svg", { width: "20", height: "20", viewBox: "0 0 24 24", ...stroke, children: /* @__PURE__ */ jsx("path", { d: "M5 9l-3 3 3 3M19 9l3 3-3 3M9 5l3-3 3 3M9 19l3 3 3-3" }) }),
  point: /* @__PURE__ */ jsx("svg", { width: "20", height: "20", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("circle", { cx: "12", cy: "12", r: "3", fill: "currentColor" }) }),
  segment: /* @__PURE__ */ jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", ...stroke, children: [
    /* @__PURE__ */ jsx("line", { x1: "4", y1: "20", x2: "20", y2: "4" }),
    /* @__PURE__ */ jsx("circle", { cx: "4", cy: "20", r: "1.5", fill: "currentColor", stroke: "none" }),
    /* @__PURE__ */ jsx("circle", { cx: "20", cy: "4", r: "1.5", fill: "currentColor", stroke: "none" })
  ] }),
  line: /* @__PURE__ */ jsx("svg", { width: "20", height: "20", viewBox: "0 0 24 24", ...stroke, children: /* @__PURE__ */ jsx("line", { x1: "2", y1: "22", x2: "22", y2: "2" }) }),
  plane: /* @__PURE__ */ jsx("svg", { width: "20", height: "20", viewBox: "0 0 24 24", ...stroke, children: /* @__PURE__ */ jsx("path", { d: "M3 18 L8 8 L21 6 L16 18 Z" }) }),
  triangle: /* @__PURE__ */ jsx("svg", { width: "20", height: "20", viewBox: "0 0 24 24", ...stroke, children: /* @__PURE__ */ jsx("path", { d: "M12 4 L21 20 L3 20 Z" }) }),
  polygon: /* @__PURE__ */ jsx("svg", { width: "20", height: "20", viewBox: "0 0 24 24", ...stroke, children: /* @__PURE__ */ jsx("path", { d: "M12 3 L20 9 L17 19 L7 19 L4 9 Z" }) }),
  tetrahedron: /* @__PURE__ */ jsx("svg", { width: "20", height: "20", viewBox: "0 0 24 24", ...stroke, children: /* @__PURE__ */ jsx("path", { d: "M12 3 L20 20 L4 20 Z M12 3 L12 20" }) }),
  parallelepiped: /* @__PURE__ */ jsx("svg", { width: "20", height: "20", viewBox: "0 0 24 24", ...stroke, children: /* @__PURE__ */ jsx("path", { d: "M4 7 L14 4 L20 7 L14 10 Z M4 7 L4 17 L14 20 L14 10 M14 20 L20 17 L20 7" }) }),
  prism: /* @__PURE__ */ jsx("svg", { width: "20", height: "20", viewBox: "0 0 24 24", ...stroke, children: /* @__PURE__ */ jsx("path", { d: "M12 4 L18 8 L18 20 L12 16 Z M12 4 L6 8 L6 20 L12 16 M6 8 L12 12 L18 8 M6 20 L18 20" }) }),
  pyramid: /* @__PURE__ */ jsx("svg", { width: "20", height: "20", viewBox: "0 0 24 24", ...stroke, children: /* @__PURE__ */ jsx("path", { d: "M12 3 L4 20 L20 20 Z M12 3 L12 20" }) }),
  sphere: /* @__PURE__ */ jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", ...stroke, children: [
    /* @__PURE__ */ jsx("circle", { cx: "12", cy: "12", r: "8" }),
    /* @__PURE__ */ jsx("ellipse", { cx: "12", cy: "12", rx: "8", ry: "3" })
  ] }),
  cone: /* @__PURE__ */ jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", ...stroke, children: [
    /* @__PURE__ */ jsx("path", { d: "M12 3 L4 20 L20 20 Z" }),
    /* @__PURE__ */ jsx("ellipse", { cx: "12", cy: "20", rx: "8", ry: "2" })
  ] }),
  cylinder: /* @__PURE__ */ jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", ...stroke, children: [
    /* @__PURE__ */ jsx("ellipse", { cx: "12", cy: "5", rx: "6", ry: "2" }),
    /* @__PURE__ */ jsx("ellipse", { cx: "12", cy: "19", rx: "6", ry: "2" }),
    /* @__PURE__ */ jsx("line", { x1: "6", y1: "5", x2: "6", y2: "19" }),
    /* @__PURE__ */ jsx("line", { x1: "18", y1: "5", x2: "18", y2: "19" })
  ] }),
  label: /* @__PURE__ */ jsx("svg", { width: "20", height: "20", viewBox: "0 0 24 24", ...stroke, children: /* @__PURE__ */ jsx("path", { d: "M4 4 H 16 L 20 8 L 16 12 H 4 Z" }) })
};
var TOOLTIP_DELAY_MS2 = 400;
function Shell3({ title, icon, onClose, children, isDark }) {
  return /* @__PURE__ */ jsxs(
    "aside",
    {
      role: "complementary",
      "aria-label": title,
      "data-testid": "geom3d-left-panel",
      "data-stamp-area": "true",
      className: [
        isDark ? "theme--dark " : "",
        "absolute left-0 top-0 z-30 flex h-full w-60 flex-col border-r border-slate-200 bg-white shadow-md animate-in slide-in-from-left duration-200"
      ].join(""),
      children: [
        /* @__PURE__ */ jsxs("header", { className: "flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-3 py-2", children: [
          /* @__PURE__ */ jsxs("h3", { className: "flex items-center gap-2 text-sm font-semibold text-slate-800", children: [
            /* @__PURE__ */ jsx("span", { className: "text-base leading-none", children: icon }),
            title
          ] }),
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: onClose,
              "aria-label": "\u0110\xF3ng",
              className: "rounded p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800",
              children: /* @__PURE__ */ jsx(CloseIcon2, {})
            }
          )
        ] }),
        /* @__PURE__ */ jsx("div", { className: "min-h-0 flex-1 overflow-y-auto p-3 space-y-4", children })
      ]
    }
  );
}
function Section3({ label, children }) {
  return /* @__PURE__ */ jsxs("section", { children: [
    /* @__PURE__ */ jsx("h4", { className: "mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500", children: label }),
    children
  ] });
}
var Geom3DIconHeader = /* @__PURE__ */ jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ jsx("path", { d: "M4 7 L14 4 L20 7 L14 10 Z M4 7 L4 17 L14 20 L14 10 M14 20 L20 17 L20 7" }) });
function CloseIcon2() {
  return /* @__PURE__ */ jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" }),
    /* @__PURE__ */ jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" })
  ] });
}
function UndoIcon2() {
  return /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ jsx("polyline", { points: "3 7 3 13 9 13" }),
    /* @__PURE__ */ jsx("path", { d: "M3.51 13a9 9 0 1 0 2.13-9.36L3 7" })
  ] });
}
function ResetViewIcon() {
  return /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ jsx("path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" }),
    /* @__PURE__ */ jsx("path", { d: "M3 3v5h5" })
  ] });
}
function AxisIcon3D() {
  return /* @__PURE__ */ jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ jsx("line", { x1: "12", y1: "20", x2: "12", y2: "4" }),
    /* @__PURE__ */ jsx("line", { x1: "12", y1: "12", x2: "22", y2: "6" }),
    /* @__PURE__ */ jsx("line", { x1: "12", y1: "12", x2: "2", y2: "18" })
  ] });
}
function MeshIcon() {
  return /* @__PURE__ */ jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ jsx("path", { d: "M4 8 L12 4 L20 8 L12 12 Z" }),
    /* @__PURE__ */ jsx("path", { d: "M4 8 L4 16 L12 20 L12 12" }),
    /* @__PURE__ */ jsx("path", { d: "M12 20 L20 16 L20 8" })
  ] });
}
function useToolHoverTooltip2() {
  const [hover, setHover] = useState(null);
  const [portalReady, setPortalReady] = useState(false);
  const hoverTimerRef = useRef(null);
  useEffect(() => {
    setPortalReady(true);
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);
  const showHover = useCallback((el, t) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      const r = el.getBoundingClientRect();
      setHover({ label: t.label, hint: t.hint, x: r.right, y: r.top + r.height / 2 });
    }, TOOLTIP_DELAY_MS2);
  }, []);
  const hideHover = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setHover(null);
  }, []);
  return { hover, portalReady, showHover, hideHover };
}
function useHandleState(handle) {
  const [tool, setTool] = useState("move");
  const [showAxes, setShowAxes] = useState(true);
  const [showMesh, setShowMesh] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  useEffect(() => {
    if (!handle) return;
    const sync = () => {
      setTool(handle.getTool());
      setShowAxes(handle.getShowAxes());
      setShowMesh(handle.getShowMesh());
      setCanUndo(handle.canUndo());
    };
    sync();
    return handle.subscribe(sync);
  }, [handle]);
  return { tool, showAxes, showMesh, canUndo };
}
function DesktopPanel(props) {
  const { handle, onResetView, onClose, isDark, chordGroup } = props;
  const { tool, showAxes, showMesh, canUndo } = useHandleState(handle);
  const { hover, portalReady, showHover, hideHover } = useToolHoverTooltip2();
  const grouped = useMemo(() => {
    return TOOLS_3D.reduce(
      (acc, t) => {
        var _a;
        (acc[_a = t.group] ?? (acc[_a] = [])).push(t);
        return acc;
      },
      {}
    );
  }, []);
  const orderedGroups = useMemo(
    () => GROUP_ORDER_3D.filter((g) => grouped[g]),
    [grouped]
  );
  const activeGroupTools = chordGroup ? grouped[chordGroup] ?? null : null;
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsxs(Shell3, { title: "H\xECnh h\u1ECDc 3D", icon: Geom3DIconHeader, onClose, isDark, children: [
      /* @__PURE__ */ jsx(Section3, { label: "B\u1ED1 c\u1EE5c", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 flex-wrap text-[11px] text-slate-700", children: [
        /* @__PURE__ */ jsxs("label", { className: "inline-flex select-none items-center gap-1.5", children: [
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "checkbox",
              checked: showAxes,
              onChange: (e) => handle?.setShowAxes(e.target.checked),
              "data-testid": "toggle-axes"
            }
          ),
          "Tr\u1EE5c"
        ] }),
        /* @__PURE__ */ jsxs("label", { className: "inline-flex select-none items-center gap-1.5", children: [
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "checkbox",
              checked: showMesh,
              onChange: (e) => handle?.setShowMesh(e.target.checked),
              "data-testid": "toggle-mesh"
            }
          ),
          "L\u01B0\u1EDBi"
        ] }),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: onResetView,
            title: "Reset g\xF3c nh\xECn",
            "aria-label": "Reset view",
            className: "ml-auto inline-flex items-center justify-center rounded p-1 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900",
            children: /* @__PURE__ */ jsx(ResetViewIcon, {})
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: () => handle?.undo(),
            disabled: !canUndo,
            title: "Ho\xE0n t\xE1c (Ctrl/Cmd+Z)",
            "aria-label": "Ho\xE0n t\xE1c",
            className: "inline-flex items-center justify-center rounded p-1 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent",
            children: /* @__PURE__ */ jsx(UndoIcon2, {})
          }
        )
      ] }) }),
      orderedGroups.map((group) => {
        const tools = grouped[group];
        const isChordActive = chordGroup === group;
        const dimmed = chordGroup !== null && !isChordActive;
        return /* @__PURE__ */ jsxs(
          "section",
          {
            "data-chord-group": group,
            "data-chord-active": isChordActive ? "true" : "false",
            className: [
              "rounded-md transition",
              isChordActive ? "bg-blue-50 ring-1 ring-blue-400 p-1" : "p-0",
              dimmed ? "opacity-55" : "opacity-100"
            ].join(" "),
            children: [
              /* @__PURE__ */ jsxs("h4", { className: "mb-1.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-500", children: [
                /* @__PURE__ */ jsx("span", { children: GROUP_LABELS_3D[group] }),
                /* @__PURE__ */ jsx(
                  "span",
                  {
                    "data-testid": `chord-letter-${group}`,
                    className: [
                      "font-mono text-[10px] leading-none transition",
                      isChordActive ? "text-blue-700 font-bold" : "text-slate-400"
                    ].join(" "),
                    children: letterForGroup3D(group)
                  }
                )
              ] }),
              /* @__PURE__ */ jsx("div", { className: "grid grid-cols-4 gap-1", children: tools.map((t, i) => {
                const isActive = tool === t.key;
                return /* @__PURE__ */ jsx(
                  ToolButton,
                  {
                    toolKey: t.key,
                    label: t.label,
                    hint: t.hint,
                    active: isActive,
                    onClick: () => handle?.setTool(t.key),
                    icon: /* @__PURE__ */ jsx(
                      "span",
                      {
                        onMouseEnter: (e) => showHover(e.currentTarget.closest("button"), t),
                        onMouseLeave: hideHover,
                        onFocus: (e) => showHover(e.currentTarget.closest("button"), t),
                        onBlur: hideHover,
                        children: ICONS_3D[t.key]
                      }
                    ),
                    badge: /* @__PURE__ */ jsx(
                      "span",
                      {
                        "data-testid": `chord-num-${t.key}`,
                        className: [
                          "pointer-events-none absolute bottom-0 right-0.5 font-mono text-[9px] leading-none transition",
                          isActive ? "text-white/70" : isChordActive ? "text-blue-700 font-bold" : "text-slate-400"
                        ].join(" "),
                        children: i + 1
                      }
                    )
                  },
                  t.key
                );
              }) })
            ]
          },
          group
        );
      }),
      chordGroup && activeGroupTools && /* @__PURE__ */ jsxs(
        "div",
        {
          "data-testid": "chord-hint",
          className: "mt-1 rounded border border-blue-200 bg-blue-50/60 px-2 py-1 text-[11px] leading-snug text-slate-600",
          children: [
            /* @__PURE__ */ jsx("span", { className: "font-mono font-semibold text-blue-700", children: letterForGroup3D(chordGroup) }),
            /* @__PURE__ */ jsx("span", { className: "mx-1 text-slate-400", children: "\u2192" }),
            activeGroupTools.map((t, i) => /* @__PURE__ */ jsxs("span", { className: "mr-2 inline-block", children: [
              /* @__PURE__ */ jsx("span", { className: "font-mono font-semibold text-blue-700", children: i + 1 }),
              /* @__PURE__ */ jsx("span", { className: "ml-1", children: t.label })
            ] }, t.key)),
            /* @__PURE__ */ jsx("span", { className: "text-slate-400", children: "Esc hu\u1EF7" })
          ]
        }
      )
    ] }),
    portalReady && hover && typeof document !== "undefined" ? createPortal(
      /* @__PURE__ */ jsxs(
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
            /* @__PURE__ */ jsx("span", { className: "block font-medium", children: hover.label }),
            hover.hint && /* @__PURE__ */ jsx("span", { className: "mt-0.5 block text-slate-300", children: hover.hint })
          ]
        }
      ),
      document.body
    ) : null
  ] });
}
function MobilePanel(props) {
  const { handle, onResetView, isDark, drawerOpen, onDrawerClose } = props;
  const { tool, showAxes, showMesh, canUndo } = useHandleState(handle);
  const groups = useMemo(() => {
    const acc = /* @__PURE__ */ new Map();
    for (const t of TOOLS_3D) {
      if (!acc.has(t.group)) acc.set(t.group, []);
      acc.get(t.group).push(t);
    }
    return Array.from(acc.entries()).map(([group, tools]) => ({
      group,
      groupLabel: GROUP_LABELS_3D[group],
      tools: tools.map((t) => ({ key: t.key, label: t.label, icon: ICONS_3D[t.key] }))
    }));
  }, []);
  return /* @__PURE__ */ jsx(
    MobileToolDrawer,
    {
      title: "H\xECnh h\u1ECDc 3D",
      headerIcon: Geom3DIconHeader,
      testId: "geom3d-left-panel",
      isDark,
      drawerOpen: !!drawerOpen,
      onDrawerClose: () => onDrawerClose?.(),
      chips: [
        {
          label: "Tr\u1EE5c",
          icon: /* @__PURE__ */ jsx(AxisIcon3D, {}),
          pressed: showAxes,
          onToggle: (b) => handle?.setShowAxes(b),
          testId: "toggle-axes"
        },
        {
          label: "L\u01B0\u1EDBi",
          icon: /* @__PURE__ */ jsx(MeshIcon, {}),
          pressed: showMesh,
          onToggle: (b) => handle?.setShowMesh(b),
          testId: "toggle-mesh"
        }
      ],
      actions: [
        {
          label: "Reset view",
          title: "Reset g\xF3c nh\xECn",
          icon: /* @__PURE__ */ jsx(ResetViewIcon, {}),
          onClick: onResetView
        },
        {
          label: "Ho\xE0n t\xE1c",
          title: "Ho\xE0n t\xE1c (Ctrl/Cmd+Z)",
          icon: /* @__PURE__ */ jsx(UndoIcon2, {}),
          onClick: () => handle?.undo(),
          disabled: !canUndo
        }
      ],
      groups,
      activeTool: tool,
      onToolSelect: (k) => handle?.setTool(k)
    }
  );
}
function LeftPanel3(props) {
  if (props.isMobile) return /* @__PURE__ */ jsx(MobilePanel, { ...props });
  return /* @__PURE__ */ jsx(DesktopPanel, { ...props });
}

// src/stamps/geometry-3d/serialize.ts
function isGeometry3DCustomData(data) {
  if (!data || typeof data !== "object") return false;
  const d = data;
  return d.kind === "geometry3d" && d.version === 1 && typeof d.jsonState === "string";
}
function parseSerializedBoard3D(json) {
  const parsed = JSON.parse(json);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("parseSerializedBoard3D: not an object");
  }
  const p = parsed;
  if (p.version !== 1) {
    throw new Error(`parseSerializedBoard3D: unsupported version ${String(p.version)}`);
  }
  if (!Array.isArray(p.elements)) {
    throw new Error("parseSerializedBoard3D: elements missing");
  }
  return parsed;
}

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
function parseInitial(editingElement) {
  if (!editingElement) return null;
  if (!isGeometry3DCustomData(editingElement.customData)) return null;
  try {
    return parseSerializedBoard3D(editingElement.customData.jsonState);
  } catch {
    return null;
  }
}
var Geometry3DStampHost = forwardRef(
  function Geometry3DStampHost2({ api, editingElement, onClose, isDark }, ref) {
    const editorRef = useRef(null);
    const { isMobile } = useIsMobile();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [boardHandle, setBoardHandle] = useState(null);
    const initial = useMemo(
      () => parseInitial(editingElement),
      [editingElement]
    );
    const handleBoardReady = useCallback((h) => {
      setBoardHandle((prev) => prev === h ? prev : h);
    }, []);
    const { chordGroup } = useChordShortcut({
      groupOrder: GROUP_ORDER_3D,
      tools: TOOLS_3D,
      onSelect: (key) => boardHandle?.setTool(key),
      enabled: !isMobile
    });
    const handleResetView = useCallback(() => {
      boardHandle?.resetView();
    }, [boardHandle]);
    const handleInsert = useCallback(
      async (jsonState, svgString, width, height) => {
        if (!api) return;
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
    useImperativeHandle(
      ref,
      () => ({
        tryInsert: () => editorRef.current?.tryInsert() ?? false,
        hasContent: () => editorRef.current?.hasContent() ?? false
      }),
      []
    );
    return /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx(
        LeftPanel3,
        {
          handle: boardHandle,
          onResetView: handleResetView,
          onClose,
          isDark,
          isMobile,
          drawerOpen,
          onDrawerClose: () => setDrawerOpen(false),
          chordGroup
        }
      ),
      /* @__PURE__ */ jsx(
        EditorPanel,
        {
          ref: editorRef,
          isDark,
          initial,
          onInsert: handleInsert,
          onClose,
          isMobile,
          withLeftPanel: !isMobile,
          onBoardReady: handleBoardReady,
          onOpenDrawer: () => setDrawerOpen(true)
        }
      )
    ] });
  }
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
      /* @__PURE__ */ jsx("path", { d: "M12 3 L20 8 L20 16 L12 21 L4 16 L4 8 Z" }),
      /* @__PURE__ */ jsx("path", { d: "M12 3 L12 21 M4 8 L12 12 L20 8 M4 16 L12 12 L20 16" })
    ]
  }
);
var geometry3dStamp = {
  kind: "geometry3d",
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

// src/stamps/shared/registry.ts
var DEFAULT_STAMPS = Object.freeze([
  geometryStamp,
  latexStamp,
  geometry3dStamp
]);
function findStampForCustomData(data, stamps = DEFAULT_STAMPS) {
  for (const s of stamps) {
    if (s.matchesCustomData(data)) return s;
  }
  return null;
}
function isStampElement(element, stamps = DEFAULT_STAMPS) {
  return findStampForCustomData(element.customData, stamps) !== null;
}
var TOOLBAR_WRAPPER_ID = "stamp-toolbar-portal-wrapper";
var MENU_WRAPPER_ID = "stamp-menu-portal-wrapper";
function ToolbarInjector({
  enabled,
  activeStampKind,
  onToggle,
  stamps = DEFAULT_STAMPS
}) {
  const [isMobile, setIsMobile] = useState(false);
  const [toolbarMount, setToolbarMount] = useState(null);
  const [menuMount, setMenuMount] = useState(null);
  const isMobileRef = useRef(false);
  const toolbarMountRef = useRef(null);
  const menuMountRef = useRef(null);
  useEffect(() => {
    if (!enabled) {
      if (isMobileRef.current !== false) {
        isMobileRef.current = false;
        setIsMobile(false);
      }
      return;
    }
    let cancelled = false;
    let observer = null;
    let timer = null;
    let attempts = 0;
    const apply = (next) => {
      if (cancelled || isMobileRef.current === next) return;
      isMobileRef.current = next;
      queueMicrotask(() => {
        if (!cancelled) setIsMobile(next);
      });
    };
    const attach = () => {
      if (cancelled) return;
      const root = document.querySelector(".excalidraw");
      if (!root) {
        if (attempts++ < 20) timer = setTimeout(attach, 100);
        return;
      }
      apply(root.classList.contains("excalidraw--mobile"));
      observer = new MutationObserver(() => {
        apply(root.classList.contains("excalidraw--mobile"));
      });
      observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    };
    attach();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      observer?.disconnect();
    };
  }, [enabled]);
  useEffect(() => {
    if (!enabled || isMobile) {
      if (toolbarMountRef.current !== null) {
        toolbarMountRef.current = null;
        setToolbarMount(null);
      }
      document.getElementById(TOOLBAR_WRAPPER_ID)?.remove();
      return;
    }
    let cancelled = false;
    let attempts = 0;
    let observer = null;
    let timer = null;
    const apply = (next) => {
      if (cancelled || toolbarMountRef.current === next) return;
      toolbarMountRef.current = next;
      queueMicrotask(() => {
        if (!cancelled) setToolbarMount(next);
      });
    };
    const tryMount = () => {
      if (cancelled) return;
      const container = document.querySelector(".excalidraw .App-toolbar .Stack_horizontal") ?? document.querySelector(".App-toolbar .Stack_horizontal");
      if (!container) {
        if (attempts++ < 20) timer = setTimeout(tryMount, 100);
        return;
      }
      let wrapper = container.querySelector("#" + TOOLBAR_WRAPPER_ID);
      if (!wrapper) {
        wrapper = document.createElement("div");
        wrapper.id = TOOLBAR_WRAPPER_ID;
        wrapper.className = "Stamp-toolbar-injector";
        wrapper.setAttribute("data-stamp-area", "true");
        wrapper.style.display = "inline-flex";
        wrapper.style.alignItems = "center";
        wrapper.style.gap = "4px";
        wrapper.style.marginInlineStart = "6px";
        wrapper.style.paddingInlineStart = "6px";
        wrapper.style.borderInlineStart = "1px solid var(--default-border-color, rgba(0,0,0,0.1))";
        const moreTools = container.querySelector(".App-toolbar__extra-tools-dropdown") ?? container.querySelector('button[aria-label*="More tools" i]');
        if (moreTools && moreTools.parentElement === container) {
          container.insertBefore(wrapper, moreTools);
        } else {
          container.appendChild(wrapper);
        }
      }
      apply(wrapper);
    };
    tryMount();
    const root = document.querySelector(".excalidraw") ?? document.body;
    observer = new MutationObserver(() => {
      if (cancelled) return;
      const stillThere = document.getElementById(TOOLBAR_WRAPPER_ID);
      if (!stillThere) {
        attempts = 0;
        tryMount();
      }
    });
    observer.observe(root, { childList: true, subtree: true });
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      observer?.disconnect();
      document.getElementById(TOOLBAR_WRAPPER_ID)?.remove();
    };
  }, [enabled, isMobile]);
  useEffect(() => {
    if (!enabled || !isMobile) {
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
      const container = document.querySelector(
        ".dropdown-menu--mobile .dropdown-menu-container"
      );
      if (!container) {
        apply(null);
        return;
      }
      let wrapper = container.querySelector("#" + MENU_WRAPPER_ID);
      if (!wrapper) {
        wrapper = document.createElement("div");
        wrapper.id = MENU_WRAPPER_ID;
        wrapper.setAttribute("data-stamp-menu", "true");
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
  }, [enabled, isMobile]);
  if (!enabled) return null;
  const closeMobileMenu = () => {
    const trigger = document.querySelector(
      ".App-toolbar__extra-tools-trigger"
    );
    trigger?.click();
  };
  const desktopButtons = !isMobile && toolbarMount ? createPortal(
    /* @__PURE__ */ jsx(Fragment, { children: stamps.map((stamp) => /* @__PURE__ */ jsx(
      StampToolButton,
      {
        icon: stamp.toolbarIcon,
        keybind: stamp.toolbarLabel,
        label: stamp.toolbarTitle,
        active: activeStampKind === stamp.kind,
        onClick: () => onToggle(stamp.kind),
        dataTestId: stamp.toolbarTestId
      },
      stamp.kind
    )) }),
    toolbarMount
  ) : null;
  const mobileMenuItems = isMobile && menuMount ? createPortal(
    /* @__PURE__ */ jsxs(Fragment, { children: [
      stamps.map((stamp) => /* @__PURE__ */ jsx(
        StampMenuItem,
        {
          icon: stamp.toolbarIcon,
          label: stamp.toolbarTitle,
          active: activeStampKind === stamp.kind,
          onClick: () => {
            onToggle(stamp.kind);
            closeMobileMenu();
          },
          dataTestId: stamp.toolbarTestId
        },
        stamp.kind
      )),
      /* @__PURE__ */ jsx(
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
  ) : null;
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    desktopButtons,
    mobileMenuItems
  ] });
}
function StampToolButton({ icon, keybind, label, active, onClick, dataTestId }) {
  return /* @__PURE__ */ jsxs(
    "button",
    {
      type: "button",
      title: label,
      "aria-label": label,
      "aria-pressed": active,
      onClick,
      "data-testid": dataTestId,
      className: "ToolIcon Shape",
      style: {
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "var(--lg-button-size, 2.25rem)",
        height: "var(--lg-button-size, 2.25rem)",
        padding: 0,
        margin: 0,
        background: active ? "var(--color-primary-light, #e0e7ff)" : "transparent",
        border: 0,
        borderRadius: "var(--space-factor, 0.25rem)",
        color: active ? "var(--color-primary, #6965db)" : "var(--icon-fill-color, #1b1b1f)",
        cursor: "pointer",
        transition: "background 0.15s"
      },
      onMouseEnter: (e) => {
        if (!active) e.currentTarget.style.background = "var(--button-hover-bg, rgba(0,0,0,0.06))";
      },
      onMouseLeave: (e) => {
        if (!active) e.currentTarget.style.background = "transparent";
      },
      children: [
        /* @__PURE__ */ jsx(
          "div",
          {
            "aria-hidden": "true",
            style: { display: "flex", alignItems: "center", justifyContent: "center" },
            children: icon
          }
        ),
        /* @__PURE__ */ jsx(
          "span",
          {
            "aria-hidden": "true",
            style: {
              position: "absolute",
              right: "3px",
              bottom: "2px",
              fontSize: "0.5625rem",
              color: "var(--keybinding-color, #6b7280)",
              fontFamily: "var(--ui-font, system-ui)",
              fontWeight: 400,
              pointerEvents: "none"
            },
            children: keybind
          }
        )
      ]
    }
  );
}
function StampMenuItem({ icon, label, active, onClick, dataTestId }) {
  const className = [
    "dropdown-menu-item",
    "dropdown-menu-item-base",
    active ? "dropdown-menu-item--selected" : ""
  ].filter(Boolean).join(" ");
  return /* @__PURE__ */ jsxs(
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
        /* @__PURE__ */ jsx(
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
        /* @__PURE__ */ jsx("span", { children: label })
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
  useEffect(() => {
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
var PREFIX = "whiteboard:scene:";
var SCHEMA_VERSION = 1;
function fullKey(key) {
  return PREFIX + key;
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
var Excalidraw = dynamic(
  async () => (await import('./ExcalidrawWithMenus-KBLDWPM2.mjs')).ExcalidrawWithMenus,
  {
    ssr: false,
    loading: () => /* @__PURE__ */ jsx("div", { className: "flex h-full items-center justify-center text-sm text-gray-500", children: "\u0110ang t\u1EA3i b\u1EA3ng\u2026" })
  }
);
var SYNC_THROTTLE_MS = 200;
var DOUBLE_CLICK_MS = 400;
function Whiteboard({
  storageKey = "default",
  readOnly = false,
  onSceneChange,
  onFilesChange,
  onApi,
  langCode = "vi-VN",
  stamps = DEFAULT_STAMPS
}) {
  const [api, setApi] = useState(null);
  const apiRef = useRef(null);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const isDarkThemeRef = useRef(false);
  const knownFileIdsRef = useRef(/* @__PURE__ */ new Set());
  const lastSceneHashRef = useRef("");
  const sceneThrottleRef = useRef(null);
  const fileThrottleRef = useRef(null);
  const pruneThrottleRef = useRef(null);
  const latestSceneRef = useRef(null);
  const pendingFilesRef = useRef({});
  const persistEnabled = typeof storageKey === "string" && storageKey.length > 0;
  const persistKeyRef = useRef(storageKey);
  persistKeyRef.current = storageKey;
  const persistedInitial = useMemo(
    () => persistEnabled ? readScene(storageKey) : null,
    [persistEnabled, storageKey]
  );
  const effectiveInitialScene = persistedInitial ? {
    elements: persistedInitial.elements,
    appState: persistedInitial.appState
  } : null;
  const [activeStamp, setActiveStamp] = useState(null);
  const activeStampRef = useRef(activeStamp);
  activeStampRef.current = activeStamp;
  const [editingElement, setEditingElement] = useState(null);
  const hostRef = useRef(null);
  const lastClickRef = useRef({
    time: 0,
    elementId: null
  });
  const handledCropIdRef = useRef(null);
  const prevExcalidrawToolRef = useRef("selection");
  const stampByKind = useMemo(() => {
    const m = /* @__PURE__ */ new Map();
    for (const s of stamps) m.set(s.kind, s);
    return m;
  }, [stamps]);
  const activeStampDef = activeStamp ? stampByKind.get(activeStamp) ?? null : null;
  const HostComponent = activeStampDef?.Host ?? null;
  const openStamp = useCallback(
    (kind, element = null) => {
      if (readOnly) return;
      if (!stampByKind.has(kind)) return;
      setEditingElement(element);
      setActiveStamp(kind);
    },
    [readOnly, stampByKind]
  );
  const closeStamp = useCallback(() => {
    setActiveStamp(null);
    setEditingElement(null);
  }, []);
  const toggleStampByKind = useCallback(
    (kind) => {
      if (activeStamp === kind) closeStamp();
      else openStamp(kind);
    },
    [activeStamp, openStamp, closeStamp]
  );
  const handleChange = useCallback(
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
  useEffect(() => {
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
  useEffect(() => {
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
  useEffect(
    () => () => {
      if (sceneThrottleRef.current) clearTimeout(sceneThrottleRef.current);
      if (fileThrottleRef.current) clearTimeout(fileThrottleRef.current);
      if (pruneThrottleRef.current) clearTimeout(pruneThrottleRef.current);
    },
    []
  );
  const handlePointerDown = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (_activeTool, pointerDownState) => {
      if (readOnly) return;
      const hitElement = pointerDownState?.hit?.element;
      if (!hitElement || hitElement.type !== "image") return;
      const stamp = findStampForCustomData(hitElement.customData, stamps);
      if (!stamp) return;
      const now = Date.now();
      const isDouble = lastClickRef.current.elementId === hitElement.id && now - lastClickRef.current.time < DOUBLE_CLICK_MS;
      lastClickRef.current = { time: now, elementId: hitElement.id };
      if (!isDouble) return;
      openStamp(stamp.kind, {
        id: hitElement.id,
        customData: hitElement.customData
      });
    },
    [readOnly, stamps, openStamp]
  );
  useShortcuts({
    enabled: !readOnly,
    onToggle: toggleStampByKind,
    stamps
  });
  useEffect(() => {
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
  const stampShortcutKeys = useMemo(
    () => new Set(stamps.map((s) => s.shortcutKey.toLowerCase())),
    [stamps]
  );
  useEffect(() => {
    if (!activeStamp) return;
    const ALLOWED_KEYS = /* @__PURE__ */ new Set([
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
    const isEditable = (el) => {
      if (!(el instanceof HTMLElement)) return false;
      if (el.isContentEditable) return true;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
    };
    const blocker = (e) => {
      if (isEditable(e.target)) return;
      if (e.ctrlKey || e.metaKey) return;
      if (ALLOWED_KEYS.has(e.key)) return;
      if (e.key === "Escape") return;
      if (stampShortcutKeys.has(e.key.toLowerCase())) return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("keydown", blocker, { capture: true });
    return () => window.removeEventListener("keydown", blocker, { capture: true });
  }, [activeStamp, stampShortcutKeys]);
  useEffect(() => {
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
  useEffect(() => {
    if (!activeStamp) return;
    let lastFireTime = 0;
    const handler = (e) => {
      const target = e.target;
      if (!target) return;
      if (target.closest('[data-stamp-area="true"]')) return;
      const now = Date.now();
      if (now - lastFireTime < 50) return;
      lastFireTime = now;
      hostRef.current?.tryInsert();
      closeStamp();
    };
    window.addEventListener("pointerdown", handler, { capture: true });
    window.addEventListener("mousedown", handler, { capture: true });
    return () => {
      window.removeEventListener("pointerdown", handler, { capture: true });
      window.removeEventListener("mousedown", handler, { capture: true });
    };
  }, [activeStamp, closeStamp]);
  return /* @__PURE__ */ jsxs("div", { className: `relative h-full w-full${isDarkTheme ? " theme--dark" : ""}`, children: [
    /* @__PURE__ */ jsx(
      Excalidraw,
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
    ),
    /* @__PURE__ */ jsx(
      ToolbarInjector,
      {
        enabled: !readOnly,
        activeStampKind: activeStamp,
        onToggle: toggleStampByKind,
        stamps
      }
    ),
    HostComponent && /* @__PURE__ */ jsx(
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

export { DEFAULT_STAMPS, Whiteboard, findStampForCustomData, geometry3dStamp, geometryStamp, isGeometry3DCustomData, isGeometryCustomData, isLatexCustomData, isStampElement, latexStamp, pickSyncableAppState, restoreMissingStampFiles };
//# sourceMappingURL=index.mjs.map
//# sourceMappingURL=index.mjs.map