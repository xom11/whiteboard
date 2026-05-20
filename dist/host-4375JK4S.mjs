"use client";
import { serializeBoard, renderGeometrySvgFromState, isGeometryCustomData, safeJsx, JxgRenderer } from './chunk-7FCFYGPI.mjs';
import { ObjectListPanel, useChordShortcut, useActionRecorder, RecorderPanelDev, MobileToolDrawer } from './chunk-S3P5PCJ4.mjs';
import { createEmptyState, nextLabel, themeAxis, themeGrid, themeLabel, paletteFor, listObjects, createStore } from './chunk-MBJVQIF6.mjs';
import { useIsMobile } from './chunk-P2AOIF7S.mjs';
import { insertStampImage } from './chunk-C6SCVOMC.mjs';
import './chunk-BJTO5JO5.mjs';
import { forwardRef, useRef, useState, useEffect, useCallback, useImperativeHandle, useMemo, useId, useLayoutEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { jsxs, jsx, Fragment } from 'react/jsx-runtime';

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
  const ec = typeof obj.elementClass === "number" ? obj.elementClass : null;
  if (ec === 1) return "point";
  if (ec === 2) return "line";
  if (ec === 3) return "circle";
  const e = (obj.elType || obj.type || "").toString().toLowerCase();
  if (e === "point" || e === "glider" || e === "midpoint" || e === "intersection" || e === "otherintersection" || e === "reflection" || e === "mirrorpoint" || e === "mirrorelement" || e === "orthogonalprojection" || e === "parallelpoint") return "point";
  if (e === "line" || e === "segment" || e === "arrow" || e === "axis" || e === "normal" || e === "parallel" || e === "perpendicular" || e === "tangent" || e === "bisector" || e === "perpendicularsegment") return "line";
  if (e === "circle" || e === "circumcircle") return "circle";
  return "other";
}

// src/stamps/geometry-2d/editor/handlers.ts
function freshId(ctx, prefix) {
  const counter = ctx.store.getState().counter;
  let n = counter + 1;
  let id = `${prefix}_${n}`;
  const objs = ctx.store.getState().objects;
  while (id in objs) {
    n += 1;
    id = `${prefix}_${n}`;
  }
  return id;
}
function mkSceneObj(id, kind, label, attrs) {
  return {
    id,
    kind,
    label,
    visible: true,
    locked: false,
    layer: "default",
    schemaVersion: 1,
    attrs
  };
}
function dispatchAddFreePoint(ctx, x, y) {
  const id = freshId(ctx, "p");
  const label = ctx.nextLabel("point");
  const obj = mkSceneObj(id, "point", label, { constraint: { kind: "free", x, y } });
  ctx.store.dispatch({ type: "ADD", payload: { obj } });
  return id;
}
function dispatchAddIntersection(ctx, attrs) {
  const id = freshId(ctx, "X");
  const label = ctx.nextLabel("intersection");
  const obj = mkSceneObj(id, "intersection", label, attrs);
  ctx.store.dispatch({ type: "ADD", payload: { obj } });
  return id;
}
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
    const obj = hits2.find((o) => objKind(o) === "point") ?? ctx.findNearestPointJxg(e, 12) ?? hits2[0];
    if (obj) {
      const sid = ctx.jxgIdToSceneId(obj);
      if (sid) {
        const shift = !!(e.shiftKey || e.altKey);
        ctx.toggleSelect(sid, shift);
      }
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
  const snapPointForPointSlot = () => bestHit && objKind(bestHit) === "point" ? bestHit : ctx.findNearestPointJxg(e, 12);
  if (t === "point") {
    const curves = hits.filter((o) => objKind(o) === "line" || objKind(o) === "circle");
    if (curves.length >= 2) {
      const a = curves[0];
      const b = curves[1];
      const aId = ctx.jxgIdToSceneId(a);
      const bId = ctx.jxgIdToSceneId(b);
      if (aId && bId) {
        try {
          const aKind = objKind(a);
          const bKind = objKind(b);
          if (aKind === "line" && bKind === "line") {
            dispatchAddIntersection(ctx, { kind: "lineLine", ref1: aId, ref2: bId });
            return;
          }
          const tmp0 = ctx.boardRef.current.create("intersection", [a, b, 0], { visible: false, withLabel: false });
          const tmp1 = ctx.boardRef.current.create("intersection", [a, b, 1], { visible: false, withLabel: false });
          const d0 = Math.hypot((tmp0.X?.() ?? 0) - x, (tmp0.Y?.() ?? 0) - y);
          const d1 = Math.hypot((tmp1.X?.() ?? 0) - x, (tmp1.Y?.() ?? 0) - y);
          safeJsx("handlers.removeObject(intersect.tmp0)", () => ctx.boardRef.current.removeObject(tmp0));
          safeJsx("handlers.removeObject(intersect.tmp1)", () => ctx.boardRef.current.removeObject(tmp1));
          const branch = d0 <= d1 ? 0 : 1;
          const isLineCircle = aKind === "line" && bKind === "circle" || aKind === "circle" && bKind === "line";
          if (isLineCircle) {
            dispatchAddIntersection(ctx, { kind: "lineCircle", ref1: aId, ref2: bId, branch });
          } else {
            dispatchAddIntersection(ctx, { kind: "circleCircle", ref1: aId, ref2: bId, branch });
          }
          return;
        } catch {
        }
      }
    }
    dispatchAddFreePoint(ctx, x, y);
    return;
  }
  if (toolDef.needs === 1 && toolDef.accepts) {
    const hit = bestHit ?? ctx.findNearestPointJxg(e, 12);
    if (!hit) {
      ctx.flashWarn("Click v\xE0o m\u1ED9t \u0111\u1ED1i t\u01B0\u1EE3ng \u0111\u1EC3 \xE1p d\u1EE5ng");
      return;
    }
    const sid = ctx.jxgIdToSceneId(hit);
    if (!sid) return;
    if (t === "delete") {
      ctx.store.dispatch({ type: "DELETE", payload: { id: sid } });
      return;
    }
    if (t === "toggleLabel") {
      const obj = ctx.store.getState().objects[sid];
      if (!obj) return;
      const cur = obj.attrs.showLabel;
      const next = !(cur ?? false);
      ctx.store.dispatch({ type: "UPDATE_ATTRS", payload: { id: sid, patch: { showLabel: next } } });
      return;
    }
    if (t === "toggleVisible") {
      const obj = ctx.store.getState().objects[sid];
      if (!obj) return;
      ctx.store.dispatch({ type: "UPDATE", payload: { id: sid, patch: { visible: !obj.visible } } });
      return;
    }
    return;
  }
  if (toolDef.needs === -1) {
    const snappedPoint = snapPointForPointSlot();
    const snappedId = snappedPoint ? ctx.jxgIdToSceneId(snappedPoint) : null;
    if (ctx.pendingIdsRef.current.length >= 3 && snappedId && snappedId === ctx.pendingIdsRef.current[0]) {
      ctx.clearPreviewSegs();
      const vertices = ctx.pendingIdsRef.current.slice();
      const id = freshId(ctx, t === "area" ? "area" : "poly");
      const label = ctx.nextLabel(t === "area" ? "polygon" : "polygon");
      ctx.store.dispatch({
        type: "ADD",
        payload: { obj: mkSceneObj(id, "polygon", label, { vertices }) }
      });
      ctx.clearPending();
      return;
    }
    if (snappedId && ctx.pendingIdsRef.current.includes(snappedId)) {
      ctx.flashWarn("\u0110\u1EC9nh n\xE0y \u0111\xE3 c\xF3 \u2014 click \u0111i\u1EC3m kh\xE1c ho\u1EB7c click l\u1EA1i \u0111i\u1EC3m \u0111\u1EA7u \u0111\u1EC3 \u0111\xF3ng");
      return;
    }
    let pickId2 = snappedId;
    let pickJxg = snappedPoint;
    if (!pickId2) {
      pickId2 = dispatchAddFreePoint(ctx, x, y);
      pickJxg = ctx.jxgFromSceneId(pickId2);
    }
    if (ctx.pendingRef.current.length > 0 && ctx.boardRef.current && pickJxg) {
      const prev = ctx.pendingRef.current[ctx.pendingRef.current.length - 1];
      safeJsx("handlers.createPreviewSegment", () => {
        const seg = ctx.boardRef.current.create("segment", [prev, pickJxg], {
          strokeColor: "#3b82f6",
          strokeWidth: 1.5,
          strokeOpacity: 0.75,
          fixed: true,
          highlight: false,
          withLabel: false
        });
        ctx.previewSegRef.current.push(seg);
      });
    }
    if (pickJxg) ctx.pendingRef.current.push(pickJxg);
    if (pickId2) ctx.pendingIdsRef.current.push(pickId2);
    ctx.setPendingCount(ctx.pendingIdsRef.current.length);
    return;
  }
  let pick = null;
  let pickId = null;
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
      const near = ctx.findNearestPointJxg(e, 12);
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
    pickId = ctx.jxgIdToSceneId(pick);
  } else {
    const snapped = snapPointForPointSlot();
    if (snapped && ctx.pendingRef.current.includes(snapped)) {
      ctx.flashWarn("\u0110\xE3 ch\u1ECDn \u0111i\u1EC3m n\xE0y \u2014 ch\u1ECDn \u0111i\u1EC3m kh\xE1c ho\u1EB7c click ch\u1ED7 tr\u1ED1ng");
      return;
    }
    if (snapped) {
      pick = snapped;
      pickId = ctx.jxgIdToSceneId(snapped);
    } else {
      pickId = dispatchAddFreePoint(ctx, x, y);
      pick = ctx.jxgFromSceneId(pickId);
    }
  }
  if (!pick) return;
  ctx.pendingRef.current.push(pick);
  if (pickId) ctx.pendingIdsRef.current.push(pickId);
  ctx.setPendingCount(ctx.pendingIdsRef.current.length);
  if (ctx.pendingIdsRef.current.length >= toolDef.needs) {
    const tk = toolDef.key;
    if (tk === "rotate" || tk === "dilate" || tk === "regularPolygon" || tk === "translate" || tk === "reflectLine" || tk === "reflectPoint") {
      const cx = (e.clientX ?? 0) + 8;
      const cy = (e.clientY ?? 0) + 8;
      ctx.pendingTransformRef.current = {
        tool: tk,
        sourceId: ctx.pendingIdsRef.current[0],
        pendingIds: ctx.pendingIdsRef.current.slice(),
        anchorScreen: { x: cx, y: cy }
      };
      ctx.emitTransform({ tool: tk, anchor: { x: cx, y: cy } });
      return;
    }
    finalizeShape(ctx, toolDef);
    ctx.clearPending();
  } else {
    ctx.refreshPreview();
  }
}
function finalizeShape(ctx, toolDef) {
  const ids = ctx.pendingIdsRef.current;
  const key = toolDef.key;
  switch (key) {
    case "segment": {
      const id = freshId(ctx, "s");
      const label = ctx.nextLabel("segment");
      ctx.store.dispatch({
        type: "ADD",
        payload: { obj: mkSceneObj(id, "segment", label, { p1: ids[0], p2: ids[1] }) }
      });
      return;
    }
    case "line":
    case "perpendicular":
    case "parallel":
    case "perpBisector":
    case "angleBisector":
    case "tangent": {
      const id = freshId(ctx, "l");
      const label = ctx.nextLabel("line");
      const p1 = ids[0];
      const p2 = ids[1] ?? ids[0];
      ctx.store.dispatch({
        type: "ADD",
        payload: { obj: mkSceneObj(id, "line", label, { p1, p2 }) }
      });
      return;
    }
    case "ray": {
      const id = freshId(ctx, "r");
      const label = ctx.nextLabel("ray");
      ctx.store.dispatch({
        type: "ADD",
        payload: { obj: mkSceneObj(id, "ray", label, { origin: ids[0], through: ids[1] }) }
      });
      return;
    }
    case "vector": {
      const id = freshId(ctx, "v");
      const label = ctx.nextLabel("vector");
      ctx.store.dispatch({
        type: "ADD",
        payload: { obj: mkSceneObj(id, "vector", label, { from: ids[0], to: ids[1] }) }
      });
      return;
    }
    case "circleCenter":
    case "circle3": {
      const id = freshId(ctx, "c");
      const label = ctx.nextLabel("circle");
      ctx.store.dispatch({
        type: "ADD",
        payload: {
          obj: mkSceneObj(id, "circle", label, {
            center: ids[0],
            surfacePoint: ids[1] ?? ids[0]
          })
        }
      });
      return;
    }
    case "midpoint": {
      const id = freshId(ctx, "mp");
      const label = ctx.nextLabel("point");
      ctx.store.dispatch({
        type: "ADD",
        payload: { obj: mkSceneObj(id, "point", label, { constraint: { kind: "free", x: 0, y: 0 } }) }
      });
      return;
    }
    default:
      return;
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
      safeJsx("handlers.removeObject(marquee.rect)", () => ctx.boardRef.current?.removeObject(mq.rect));
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
          const sid = ctx.jxgIdToSceneId(o);
          if (sid && !ctx.selectedSetRef.current.has(sid)) {
            ctx.selectedSetRef.current.add(sid);
          }
        }
      } else if (kind === "line" || kind === "circle") {
        const defs = [o.point1, o.point2, o.center, o.midpoint, o.point3].filter(Boolean);
        const anyInside = defs.some((p) => {
          const pc = p?.coords?.scrCoords;
          return pc && pc[1] >= x1 && pc[1] <= x2 && pc[2] >= y1 && pc[2] <= y2;
        });
        if (anyInside) {
          const sid = ctx.jxgIdToSceneId(o);
          if (sid && !ctx.selectedSetRef.current.has(sid)) {
            ctx.selectedSetRef.current.add(sid);
          }
        }
      }
    }
    ctx.setSelectionTick((tt) => tt + 1);
    safeJsx("handlers.board.update(marquee)", () => board.update());
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
  const best = hits.find((o) => objKind(o) === "point") ?? ctx.findNearestPointJxg(e, 12) ?? hits[0] ?? null;
  if (!best) {
    ctx.lastMoveClickRef.current = { id: null, time: 0 };
    return;
  }
  const bestId = ctx.jxgIdToSceneId(best);
  const now = Date.now();
  const isDouble = bestId !== null && ctx.lastMoveClickRef.current.id === bestId && now - ctx.lastMoveClickRef.current.time < 400;
  ctx.lastMoveClickRef.current = { id: bestId, time: now };
  if (!isDouble) return;
  const cx = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
  const cy = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
  if (!bestId) return;
  ctx.emitSelect({ id: bestId, anchorScreen: { x: cx + 8, y: cy + 8 } });
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
        safeJsx("handlers.removeObject(marquee.prevRect)", () => ctx.boardRef.current.removeObject(rect));
      }
      safeJsx("handlers.createMarqueePolygon", () => {
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
      });
    }
    return;
  }
  const ph = ctx.phantomRef.current;
  if (!ph || !ctx.boardRef.current) return;
  if (ctx.previewRafRef.current != null) return;
  ctx.previewRafRef.current = requestAnimationFrame(() => {
    ctx.previewRafRef.current = null;
    if (!ctx.boardRef.current || !ctx.phantomRef.current) return;
    safeJsx("handlers.phantomMove", () => {
      const coords = ctx.boardRef.current.getUsrCoordsOfMouse(e);
      const JXG = ctx.jxgRef.current;
      if (!JXG) return;
      ctx.phantomRef.current.setPositionDirectly(JXG.COORDS_BY_USER, [coords[0], coords[1]]);
      ctx.boardRef.current.update();
    });
  });
}

// src/stamps/geometry-2d/editor/hitTest.ts
function findNearestPoint(state, pointCoord, x, y, tolPx, excludeIds = /* @__PURE__ */ new Set()) {
  let best = null;
  let bestDistSq = tolPx * tolPx;
  for (const obj of listObjects(state)) {
    if (obj.kind !== "point" && obj.kind !== "intersection") continue;
    if (excludeIds.has(obj.id)) continue;
    const coord = pointCoord(obj.id);
    if (!coord) continue;
    const dx = coord[0] - x;
    const dy = coord[1] - y;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestDistSq) {
      bestDistSq = d2;
      best = obj;
    }
  }
  return best;
}
function useSceneStore(initialState) {
  const store = useMemo(() => createStore(initialState), []);
  const state = useSyncExternalStore(
    (cb) => store.subscribe(() => cb()),
    () => store.getState(),
    () => store.getState()
  );
  const canUndo = store.canUndo();
  const canRedo = store.canRedo();
  return { store, state, canUndo, canRedo };
}
function useToolStateMachine(initial = "move") {
  const [tool, setToolState] = useState(initial);
  const [pendingIds, setPendingIds] = useState([]);
  const toolRef = useRef(initial);
  const pendingIdsRef = useRef([]);
  const setTool = useCallback((t) => {
    toolRef.current = t;
    pendingIdsRef.current = [];
    setToolState(t);
    setPendingIds([]);
  }, []);
  const pushPending = useCallback((id) => {
    pendingIdsRef.current = [...pendingIdsRef.current, id];
    setPendingIds(pendingIdsRef.current);
  }, []);
  const clearPending = useCallback(() => {
    pendingIdsRef.current = [];
    setPendingIds([]);
  }, []);
  return { tool, pendingIds, toolRef, pendingIdsRef, setTool, pushPending, clearPending };
}
var JSXGraphMiniBoard = ({ onReady, initialState, isDark }) => {
  const isDarkRef = useRef(!!isDark);
  isDarkRef.current = !!isDark;
  const containerId = useId().replace(/:/g, "_") + "_jxgmini";
  const containerRef = useRef(null);
  const boardRef = useRef(null);
  const jxgRef = useRef(null);
  const rendererRef = useRef(null);
  const axisObjsRef = useRef({});
  const initState = useMemo(
    () => initialState?.state ?? createEmptyState("2d"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const { store } = useSceneStore(initState);
  const toolSM = useToolStateMachine("move");
  const [showAxis, setShowAxisState] = useState(initialState?.showAxis ?? false);
  const [showGrid, setShowGridState] = useState(initialState?.showGrid ?? false);
  const showAxisRef = useRef(showAxis);
  showAxisRef.current = showAxis;
  const showGridRef = useRef(showGrid);
  showGridRef.current = showGrid;
  const selectedSetRef = useRef(/* @__PURE__ */ new Set());
  const [, setSelectionTick] = useState(0);
  const pendingRef = useRef([]);
  const previewSegRef = useRef([]);
  const phantomRef = useRef(null);
  const previewShapeRef = useRef(null);
  const previewRafRef = useRef(null);
  const marqueeRef = useRef(null);
  const moveDownRef = useRef(null);
  const lastMoveClickRef = useRef({ id: null, time: 0 });
  const pendingTransformRef = useRef(null);
  const subscribersRef = useRef(/* @__PURE__ */ new Set());
  const selectSubsRef = useRef(/* @__PURE__ */ new Set());
  const transformSubsRef = useRef(/* @__PURE__ */ new Set());
  const notifySubscribers = useCallback(() => {
    subscribersRef.current.forEach((cb) => safeJsx("MiniBoard.notifySubscriber.cb", () => cb()));
  }, []);
  useEffect(() => store.subscribe(() => notifySubscribers()), [store, notifySubscribers]);
  useEffect(() => {
    notifySubscribers();
  }, [showAxis, showGrid, toolSM.tool, notifySubscribers]);
  const jxgIdToSceneRef = useRef(/* @__PURE__ */ new Map());
  useEffect(() => {
    const rebuild = () => {
      const r = rendererRef.current;
      if (!r) return;
      const elements = r.elements;
      const next = /* @__PURE__ */ new Map();
      if (elements) {
        for (const [sid, jxg] of elements) {
          const jid = jxg?.id;
          if (jid) next.set(String(jid), sid);
        }
      }
      jxgIdToSceneRef.current = next;
    };
    rebuild();
    return store.subscribe(() => rebuild());
  }, [store]);
  const jxgFromSceneId = useCallback((id) => {
    const r = rendererRef.current;
    if (!r) return null;
    return r.elements?.get(id) ?? null;
  }, []);
  const jxgIdToSceneId = useCallback((jxgObj) => {
    if (!jxgObj?.id) return null;
    return jxgIdToSceneRef.current.get(String(jxgObj.id)) ?? null;
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
    const sc = b ? screenCoordsOf(evt) : null;
    if (!b || !sc) return [];
    const [sx, sy] = sc;
    const out = [];
    safeJsx("MiniBoard.objectsAt", () => {
      for (const o of b.objectsList || []) {
        if (o && typeof o.hasPoint === "function" && o.hasPoint(sx, sy)) out.push(o);
      }
    });
    return out;
  }, [screenCoordsOf]);
  const findNearestPointJxg = useCallback((evt, tolPx = 12) => {
    const b = boardRef.current;
    const sc = b ? screenCoordsOf(evt) : null;
    if (!b || !sc) return null;
    const [sx, sy] = sc;
    const pointCoord = (id) => {
      const j = jxgFromSceneId(id);
      const sc2 = j?.coords?.scrCoords;
      return sc2 ? [sc2[1], sc2[2]] : null;
    };
    const result = findNearestPoint(store.getState(), pointCoord, sx, sy, tolPx);
    return result ? jxgFromSceneId(result.id) : null;
  }, [screenCoordsOf, jxgFromSceneId, store]);
  const promoteLabel = useCallback((o) => {
    if (!o) return o;
    const t = (o.elType || o.type || "").toString().toLowerCase();
    if (t !== "text" || !boardRef.current) return o;
    const promoted = safeJsx("MiniBoard.promoteLabel", () => {
      for (const c of boardRef.current.objectsList || []) {
        if (c.label === o) return c;
      }
      return null;
    }, null);
    return promoted ?? o;
  }, []);
  const toggleSelect = useCallback((id, additive) => {
    if (!additive) {
      selectedSetRef.current.clear();
      selectedSetRef.current.add(id);
    } else if (selectedSetRef.current.has(id)) selectedSetRef.current.delete(id);
    else selectedSetRef.current.add(id);
    setSelectionTick((t) => t + 1);
  }, []);
  const clearSelection = useCallback(() => {
    selectedSetRef.current.clear();
    setSelectionTick((t) => t + 1);
  }, []);
  const deleteSelection = useCallback(() => {
    if (selectedSetRef.current.size === 0) return;
    store.transaction((dispatch) => {
      for (const id of selectedSetRef.current) dispatch({ type: "DELETE", payload: { id } });
    });
    selectedSetRef.current.clear();
    setSelectionTick((t) => t + 1);
  }, [store]);
  const clearPreviewSegs = useCallback(() => {
    const b = boardRef.current;
    if (!b) return;
    for (const s of previewSegRef.current) {
      safeJsx("MiniBoard.removeObject(previewSeg)", () => b.removeObject(s));
    }
    previewSegRef.current = [];
  }, []);
  const removePhantom = useCallback(() => {
    const b = boardRef.current;
    if (!b) return;
    if (previewShapeRef.current) {
      safeJsx("MiniBoard.removeObject(previewShape)", () => b.removeObject(previewShapeRef.current));
      previewShapeRef.current = null;
    }
    if (phantomRef.current) {
      safeJsx("MiniBoard.removeObject(phantom)", () => b.removeObject(phantomRef.current));
      phantomRef.current = null;
    }
  }, []);
  const clearPending = useCallback(() => {
    removePhantom();
    clearPreviewSegs();
    pendingRef.current = [];
    toolSM.clearPending();
  }, [clearPreviewSegs, removePhantom, toolSM]);
  const refreshPreview = useCallback(() => {
  }, []);
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
  const nextLabelFor = useCallback(
    (kind) => nextLabel(store.getState(), kind),
    [store]
  );
  const buildSnapshot = useCallback(
    (id, anchorScreen) => {
      const obj = store.getState().objects[id];
      if (!obj) return null;
      const k = obj.kind;
      if (k !== "point" && k !== "line" && k !== "circle" && k !== "segment" && k !== "ray" && k !== "vector") return null;
      const a = obj.attrs;
      const jKind = k === "point" ? "point" : k === "circle" ? "circle" : "line";
      return {
        id,
        kind: jKind,
        name: obj.label,
        color: a.color ?? "#0f172a",
        width: a.width ?? 2,
        dash: a.dash ?? 0,
        face: a.face ?? "o",
        showLabel: a.showLabel ?? true,
        showValue: a.showValue ?? false,
        screenCoords: anchorScreen
      };
    },
    [store]
  );
  const emitSelect = useCallback((info) => {
    const snap = buildSnapshot(info.id, info.anchorScreen);
    if (!snap) return;
    selectSubsRef.current.forEach((cb) => safeJsx("MiniBoard.emitSelect.cb", () => cb(snap)));
  }, [buildSnapshot]);
  const emitTransform = useCallback((info) => {
    transformSubsRef.current.forEach((cb) => safeJsx("MiniBoard.emitTransform.cb", () => cb(info)));
  }, []);
  const ctxRef = useRef(null);
  ctxRef.current = {
    boardRef,
    toolRef: toolSM.toolRef,
    pendingRef,
    pendingIdsRef: toolSM.pendingIdsRef,
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
    store,
    jxgIdToSceneId,
    jxgFromSceneId,
    screenCoordsOf,
    objectsAt,
    promoteLabel,
    findNearestPointJxg,
    toggleSelect,
    clearSelection,
    nextLabel: nextLabelFor,
    clearPending,
    clearPreviewSegs,
    refreshPreview,
    flashWarn,
    emitTransform,
    emitSelect,
    setPendingCount: () => {
    },
    setSelectionTick: (fn) => setSelectionTick(fn)
  };
  useEffect(() => {
    const onKey = (e) => {
      const ae = document.activeElement;
      const inField = !!(ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.isContentEditable));
      const lk = e.key.toLowerCase();
      if ((e.metaKey || e.ctrlKey) && lk === "z" && !e.shiftKey) {
        if (inField) return;
        e.preventDefault();
        e.stopPropagation();
        store.undo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && (lk === "z" && e.shiftKey || lk === "y" && !e.shiftKey)) {
        if (inField) return;
        e.preventDefault();
        e.stopPropagation();
        store.redo();
        return;
      }
      if (e.key === "Escape" && !inField) {
        if (toolSM.pendingIdsRef.current.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          clearPending();
        }
        if (selectedSetRef.current.size > 0) {
          e.preventDefault();
          e.stopPropagation();
          clearSelection();
        }
      }
      if ((e.key === "Delete" || e.key === "Backspace") && !inField && selectedSetRef.current.size > 0) {
        e.preventDefault();
        e.stopPropagation();
        deleteSelection();
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [store, toolSM, clearPending, clearSelection, deleteSelection]);
  useEffect(() => {
    const b = boardRef.current;
    if (!b) return;
    safeJsx("MiniBoard.toggleAxis", () => {
      if (axisObjsRef.current.x) {
        safeJsx("MiniBoard.removeObject(axisX)", () => b.removeObject(axisObjsRef.current.x));
        axisObjsRef.current.x = void 0;
      }
      if (axisObjsRef.current.y) {
        safeJsx("MiniBoard.removeObject(axisY)", () => b.removeObject(axisObjsRef.current.y));
        axisObjsRef.current.y = void 0;
      }
      if (showAxis) {
        axisObjsRef.current.x = b.create("axis", [[0, 0], [1, 0]], { strokeColor: themeAxis(isDarkRef.current), name: "", withLabel: false });
        axisObjsRef.current.y = b.create("axis", [[0, 0], [0, 1]], { strokeColor: themeAxis(isDarkRef.current), name: "", withLabel: false });
      }
      b.update();
    });
  }, [showAxis]);
  useEffect(() => {
    const b = boardRef.current;
    if (!b) return;
    safeJsx("MiniBoard.toggleGrid", () => {
      for (const o of Object.values(b.objects || {})) {
        if (o && (o.elType === "grid" || o.type === "grid" || o.visProp && o.visProp.type === "grid")) {
          safeJsx("MiniBoard.removeObject(grid)", () => b.removeObject(o));
        }
      }
      if (showGrid) b.create("grid", [], { strokeColor: themeGrid(isDarkRef.current), strokeOpacity: 1 });
      b.update();
    });
  }, [showGrid]);
  const handleToolChange = useCallback((t) => {
    clearPending();
    toolSM.setTool(t);
    const b = boardRef.current;
    if (b) safeJsx("MiniBoard.setPanForTool", () => {
      if (b.attr?.pan) b.attr.pan.enabled = t !== "select";
    });
  }, [clearPending, toolSM]);
  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;
    let cancelled = false;
    let wheelCleanup = null;
    void (async () => {
      const JXG = (await import('jsxgraph')).default;
      if (cancelled || !containerRef.current) return;
      jxgRef.current = JXG;
      safeJsx("MiniBoard.applyJxgOptions", () => {
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
      });
      const board = JXG.JSXGraph.initBoard(containerId, {
        boundingbox: initialState?.bbox ?? [-10, 10, 10, -10],
        axis: false,
        grid: false,
        showCopyright: false,
        showNavigation: true,
        keepAspectRatio: true,
        pan: { enabled: true, needShift: false },
        zoom: { wheel: false },
        ...{ precision: { hasPoint: 8, mouse: 4, touch: 16 } }
      });
      boardRef.current = board;
      const theme = paletteFor(isDarkRef.current);
      rendererRef.current = new JxgRenderer(store, board, {
        theme: {
          stroke: theme.stroke,
          fill: "#60a5fa",
          axis: theme.axis,
          grid: theme.grid,
          label: theme.label,
          pointFill: theme.stroke
        }
      });
      if (containerRef.current) {
        const wheelTarget = containerRef.current;
        const onWheel = (e) => {
          if (!e.ctrlKey && !e.metaKey) return;
          e.preventDefault();
          e.stopPropagation();
          let cx, cy;
          safeJsx("MiniBoard.wheelZoom.coords", () => {
            const usr = board.getUsrCoordsOfMouse?.(e);
            if (Array.isArray(usr) && usr.length === 2 && Number.isFinite(usr[0]) && Number.isFinite(usr[1])) {
              cx = usr[0];
              cy = usr[1];
            }
          });
          if (e.deltaY < 0) safeJsx("MiniBoard.wheelZoom.in", () => board.zoomIn(cx, cy));
          else if (e.deltaY > 0) safeJsx("MiniBoard.wheelZoom.out", () => board.zoomOut(cx, cy));
        };
        wheelTarget.addEventListener("wheel", onWheel, { passive: false });
        wheelCleanup = () => wheelTarget.removeEventListener("wheel", onWheel);
      }
      if (showAxisRef.current) safeJsx("MiniBoard.initAxes", () => {
        axisObjsRef.current.x = board.create("axis", [[0, 0], [1, 0]], { strokeColor: themeAxis(isDarkRef.current), name: "", withLabel: false });
        axisObjsRef.current.y = board.create("axis", [[0, 0], [0, 1]], { strokeColor: themeAxis(isDarkRef.current), name: "", withLabel: false });
      });
      if (showGridRef.current) safeJsx(
        "MiniBoard.initGrid",
        () => board.create("grid", [], { strokeColor: themeGrid(isDarkRef.current), strokeOpacity: 1 })
      );
      const fire = (h) => (e) => {
        if (ctxRef.current) h(ctxRef.current, e);
      };
      board.on("down", fire(handleDown));
      board.on("up", fire(handleUp));
      board.on("move", fire(handleMove));
      onReady({
        getContainer: () => containerRef.current,
        getBbox: () => board ? board.getBoundingBox() : [-10, 10, 10, -10],
        getState: () => store.getState(),
        getStore: () => store,
        highlight: (id) => {
          rendererRef.current?.highlight(id);
        },
        getShowAxis: () => showAxisRef.current,
        getShowGrid: () => showGridRef.current,
        setTool: handleToolChange,
        getTool: () => toolSM.toolRef.current,
        setShowAxis: (b) => setShowAxisState(b),
        setShowGrid: (b) => setShowGridState(b),
        undo: () => store.undo(),
        canUndo: () => store.canUndo(),
        redo: () => store.redo(),
        canRedo: () => store.canRedo(),
        subscribe: (cb) => {
          subscribersRef.current.add(cb);
          return () => {
            subscribersRef.current.delete(cb);
          };
        },
        snapshotObject: (id, anchorScreen) => buildSnapshot(id, anchorScreen),
        mutateObject: (id, patch) => {
          if (patch.remove) {
            store.dispatch({ type: "DELETE", payload: { id } });
            return;
          }
          if (!patch.attrs) return;
          const incoming = patch.attrs;
          const { name, withLabel, strokeColor, fillColor, strokeWidth, ...rest } = incoming;
          if (typeof name === "string") {
            store.dispatch({ type: "UPDATE", payload: { id, patch: { label: name } } });
          }
          const mapped = { ...rest };
          if (strokeColor !== void 0 && mapped.color === void 0) mapped.color = strokeColor;
          if (fillColor !== void 0 && mapped.color === void 0) mapped.color = fillColor;
          if (strokeWidth !== void 0 && mapped.width === void 0) mapped.width = strokeWidth;
          if (withLabel !== void 0 && mapped.showLabel === void 0) mapped.showLabel = withLabel;
          if (Object.keys(mapped).length > 0) {
            store.dispatch({ type: "UPDATE_ATTRS", payload: { id, patch: mapped } });
          }
        },
        getAllPointNames: () => listObjects(store.getState()).filter((o) => o.kind === "point" || o.kind === "intersection").map((o) => o.label),
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
        confirmTransformParam: (_value) => {
          pendingTransformRef.current = null;
          emitTransform(null);
          clearPending();
        },
        cancelTransformParam: () => {
          pendingTransformRef.current = null;
          emitTransform(null);
          clearPending();
        },
        getSelectionSize: () => selectedSetRef.current.size,
        clearSelection,
        deleteSelection
      });
    })();
    return () => {
      cancelled = true;
      if (wheelCleanup) {
        wheelCleanup();
        wheelCleanup = null;
      }
      if (previewRafRef.current != null) {
        cancelAnimationFrame(previewRafRef.current);
        previewRafRef.current = null;
      }
      rendererRef.current?.dispose();
      rendererRef.current = null;
      if (boardRef.current && jxgRef.current) {
        safeJsx("MiniBoard.freeBoard", () => jxgRef.current.JSXGraph.freeBoard(boardRef.current));
        boardRef.current = null;
      }
    };
  }, [containerId]);
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
  return /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [
    /* @__PURE__ */ jsx("path", { d: "M3 10 L8 5 L8 8 L15 8 A5 5 0 0 1 20 13 L20 16" }),
    /* @__PURE__ */ jsx("path", { d: "M3 10 L8 15 L8 12" })
  ] });
}
function RedoIcon() {
  return /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [
    /* @__PURE__ */ jsx("path", { d: "M21 10 L16 5 L16 8 L9 8 A5 5 0 0 0 4 13 L4 16" }),
    /* @__PURE__ */ jsx("path", { d: "M21 10 L16 15 L16 12" })
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
  const { activeTool, onToolChange, showAxis, showGrid, onShowAxisChange, onShowGridChange, onUndo, canUndo, onRedo, canRedo, onClose, isDark, chordGroup } = props;
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
            "data-testid": "undo-btn",
            className: "ml-auto inline-flex items-center justify-center rounded p-1 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent",
            children: /* @__PURE__ */ jsx(UndoIcon, {})
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: onRedo,
            disabled: !canRedo,
            title: "L\xE0m l\u1EA1i (Ctrl/Cmd+Shift+Z)",
            "aria-label": "L\xE0m l\u1EA1i",
            "data-testid": "redo-btn",
            className: "inline-flex items-center justify-center rounded p-1 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent",
            children: /* @__PURE__ */ jsx(RedoIcon, {})
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
    onRedo,
    canRedo,
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
        },
        {
          label: "L\xE0m l\u1EA1i",
          title: "L\xE0m l\u1EA1i (Ctrl/Cmd+Shift+Z)",
          icon: /* @__PURE__ */ jsx(RedoIcon, {}),
          onClick: onRedo,
          disabled: !canRedo
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
function RecorderPanelWithStore({ store }) {
  const recorder = useActionRecorder(store);
  return /* @__PURE__ */ jsx(RecorderPanelDev, { recorder });
}
var GeometryEditorPanel = forwardRef(
  function GeometryEditorPanel2({ initialState, onInsert, onClose, withLeftPanel = false, onStateChange, isDark, isMobile = false, onOpenDrawer, onUndo, onRedo, canUndo, canRedo }, ref) {
    const handleRef = useRef(null);
    const [ready, setReady] = useState(false);
    const [hasContent, setHasContent] = useState(false);
    const [selectedId, setSelectedId] = useState(void 0);
    const sceneStoreRef = useRef(null);
    const [propsPopover, setPropsPopover] = useState(null);
    const [transformPopover, setTransformPopover] = useState(null);
    const onStateChangeRef = useRef(onStateChange);
    useEffect(() => {
      onStateChangeRef.current = onStateChange;
    }, [onStateChange]);
    const emitState = useCallback(() => {
      const h = handleRef.current;
      if (!h) return;
      setHasContent(Object.keys(h.getState().objects).length > 0);
      const cb = onStateChangeRef.current;
      if (!cb) return;
      cb({
        tool: h.getTool(),
        showAxis: h.getShowAxis(),
        showGrid: h.getShowGrid(),
        canUndo: h.canUndo(),
        canRedo: h.canRedo()
      });
    }, []);
    const handleReady = useCallback((h) => {
      handleRef.current = h;
      sceneStoreRef.current = h.getStore();
      setReady(true);
      emitState();
      h.subscribe(emitState);
      h.onSelect((snap) => setPropsPopover(snap));
      h.onTransformParam((info) => setTransformPopover(info));
    }, [emitState]);
    const performInsert = useCallback(() => {
      if (!handleRef.current) return false;
      const h = handleRef.current;
      const state = h.getState();
      if (Object.keys(state.objects).length === 0) return false;
      const bbox = h.getBbox();
      const showAxis = h.getShowAxis();
      const showGrid = h.getShowGrid();
      const serialized = serializeBoard(bbox, state, { showAxis, showGrid });
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
      redo: () => handleRef.current?.redo(),
      insert: performInsert,
      hasContent: () => Object.keys(handleRef.current?.getState().objects ?? {}).length > 0
    }), [performInsert]);
    function handleSelectObject(id) {
      setSelectedId(id);
      handleRef.current?.highlight(id);
    }
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
            isMobile && /* @__PURE__ */ jsxs(Fragment, { children: [
              /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  onClick: onUndo,
                  disabled: !canUndo,
                  "aria-label": "Ho\xE0n t\xE1c",
                  title: "Ho\xE0n t\xE1c (Ctrl/Cmd+Z)",
                  "data-testid": "undo-btn-mobile",
                  className: "inline-flex h-9 w-9 items-center justify-center rounded transition hover:bg-white/15 disabled:opacity-40",
                  children: /* @__PURE__ */ jsx(UndoIcon, {})
                }
              ),
              /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  onClick: onRedo,
                  disabled: !canRedo,
                  "aria-label": "L\xE0m l\u1EA1i",
                  title: "L\xE0m l\u1EA1i (Ctrl/Cmd+Shift+Z)",
                  "data-testid": "redo-btn-mobile",
                  className: "inline-flex h-9 w-9 items-center justify-center rounded transition hover:bg-white/15 disabled:opacity-40",
                  children: /* @__PURE__ */ jsx(RedoIcon, {})
                }
              ),
              /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  onClick: handleInsert,
                  disabled: !ready || !hasContent,
                  title: !hasContent ? "V\u1EBD \xEDt nh\u1EA5t m\u1ED9t \u0111\u1ED1i t\u01B0\u1EE3ng tr\u01B0\u1EDBc khi ch\xE8n" : void 0,
                  "data-testid": "geometry-insert-btn-mobile",
                  className: "rounded bg-white/15 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/25 disabled:opacity-50",
                  children: "Ch\xE8n"
                }
              )
            ] }),
            /* @__PURE__ */ jsx("button", { onClick: onClose, "aria-label": "\u0110\xF3ng", className: "inline-flex h-9 w-9 items-center justify-center rounded transition hover:bg-white/15", children: /* @__PURE__ */ jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
              /* @__PURE__ */ jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" }),
              /* @__PURE__ */ jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" })
            ] }) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex min-h-0 flex-1", style: isMobile ? void 0 : { height: "420px" }, children: [
            /* @__PURE__ */ jsx("div", { className: "flex-1", children: /* @__PURE__ */ jsx(
              JSXGraphMiniBoard,
              {
                onReady: handleReady,
                initialState,
                isDark
              }
            ) }),
            sceneStoreRef.current && /* @__PURE__ */ jsx("div", { className: "w-56 border-l border-zinc-200 dark:border-zinc-800 overflow-y-auto", children: /* @__PURE__ */ jsx(
              ObjectListPanel,
              {
                store: sceneStoreRef.current,
                selectedId,
                onSelect: handleSelectObject
              }
            ) })
          ] }),
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
                handleRef.current?.mutateObject(propsPopover.id, patch);
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
                handleRef.current?.mutateObject(propsPopover.id, patch);
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
          transformPopover && (transformPopover.tool === "rotate" || transformPopover.tool === "dilate" || transformPopover.tool === "regularPolygon") && /* @__PURE__ */ jsx(
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
                  disabled: !ready || !hasContent,
                  title: !hasContent ? "V\u1EBD \xEDt nh\u1EA5t m\u1ED9t \u0111\u1ED1i t\u01B0\u1EE3ng tr\u01B0\u1EDBc khi ch\xE8n" : void 0,
                  "data-testid": "geometry-insert-btn",
                  className: "rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50",
                  children: "Ch\xE8n"
                }
              )
            ] })
          ] }),
          sceneStoreRef.current && /* @__PURE__ */ jsx(RecorderPanelWithStore, { store: sceneStoreRef.current })
        ]
      }
    );
  }
);
var INITIAL_GEOM_STATE = {
  tool: "move",
  showAxis: false,
  showGrid: false,
  canUndo: false,
  canRedo: false
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
          onRedo: () => panelRef.current?.redo(),
          canRedo: geomState.canRedo,
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
          onOpenDrawer: () => setDrawerOpen(true),
          onUndo: () => panelRef.current?.undo(),
          onRedo: () => panelRef.current?.redo(),
          canUndo: geomState.canUndo,
          canRedo: geomState.canRedo
        }
      )
    ] });
  }
);

export { GeometryStampHost };
//# sourceMappingURL=host-4375JK4S.mjs.map
//# sourceMappingURL=host-4375JK4S.mjs.map