"use client";
import dynamic from 'next/dynamic';
import { forwardRef, useState, useRef, useEffect, useCallback, useImperativeHandle, useId } from 'react';
import { createPortal } from 'react-dom';
import { jsxs, jsx, Fragment } from 'react/jsx-runtime';
import '@excalidraw/excalidraw/index.css';

// src/ExcalidrawWhiteboardView.tsx

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
var WRAPPER_ID = "stamp-toolbar-portal-wrapper";
function ToolbarStampInjector({
  enabled,
  activeStamp,
  onToggleGeometry,
  onToggleLatex
}) {
  const [mountNode, setMountNode] = useState(null);
  useEffect(() => {
    if (!enabled) {
      setMountNode(null);
      return;
    }
    let cancelled = false;
    let attempts = 0;
    let observer = null;
    let timer = null;
    const tryMount = () => {
      if (cancelled) return;
      const container = document.querySelector(".excalidraw .App-toolbar .Stack_horizontal") ?? document.querySelector(".App-toolbar .Stack_horizontal");
      if (!container) {
        if (attempts++ < 20) {
          timer = setTimeout(tryMount, 100);
        }
        return;
      }
      let wrapper = container.querySelector("#" + WRAPPER_ID);
      if (!wrapper) {
        wrapper = document.createElement("div");
        wrapper.id = WRAPPER_ID;
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
      setMountNode(wrapper);
    };
    tryMount();
    const root = document.querySelector(".excalidraw") ?? document.body;
    observer = new MutationObserver(() => {
      if (cancelled) return;
      const stillThere = document.getElementById(WRAPPER_ID);
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
      document.getElementById(WRAPPER_ID)?.remove();
    };
  }, [enabled]);
  if (!enabled || !mountNode) return null;
  return createPortal(
    /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx(
        StampToolButton,
        {
          icon: GeometryIcon,
          keybind: "G",
          label: "Ch\xE8n h\xECnh h\u1ECDc (G)",
          active: activeStamp === "geometry",
          onClick: onToggleGeometry,
          dataTestId: "stamp-toolbar-geometry"
        }
      ),
      /* @__PURE__ */ jsx(
        StampToolButton,
        {
          icon: LatexIcon,
          keybind: "L",
          label: "Ch\xE8n c\xF4ng th\u1EE9c LaTeX (L)",
          active: activeStamp === "latex",
          onClick: onToggleLatex,
          dataTestId: "stamp-toolbar-latex"
        }
      )
    ] }),
    mountNode
  );
}
var GeometryIcon = /* @__PURE__ */ jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [
  /* @__PURE__ */ jsx("polygon", { points: "4,20 20,20 12,5" }),
  /* @__PURE__ */ jsx("circle", { cx: "4", cy: "20", r: "1.4", fill: "currentColor", stroke: "none" }),
  /* @__PURE__ */ jsx("circle", { cx: "20", cy: "20", r: "1.4", fill: "currentColor", stroke: "none" }),
  /* @__PURE__ */ jsx("circle", { cx: "12", cy: "5", r: "1.4", fill: "currentColor", stroke: "none" })
] });
var LatexIcon = /* @__PURE__ */ jsx("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: /* @__PURE__ */ jsx("path", { d: "M17 5 H7 L13 12 L7 19 H17" }) });
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
var Icon = {
  cursor: /* @__PURE__ */ jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ jsx("path", { d: "M4 4 L20 12 L13 13 L11 20 Z" }) }),
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
  ] })
};
var TOOLS = [
  { key: "move", label: "Di chuy\u1EC3n", hint: "K\xE9o \u0111i\u1EC3m ho\u1EB7c xoay n\u1EC1n", icon: Icon.cursor, group: "move", needs: 0 },
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
  { key: "circleCenter", label: "\u0110\u01B0\u1EDDng tr\xF2n (t\xE2m + \u0111i\u1EC3m)", hint: "Click t\xE2m r\u1ED3i 1 \u0111i\u1EC3m tr\xEAn \u0111\u01B0\u1EDDng tr\xF2n", icon: Icon.circleCenter, group: "circle", needs: 2 },
  { key: "circle3", label: "\u0110\u01B0\u1EDDng tr\xF2n qua 3 \u0111i\u1EC3m", hint: "Click 3 \u0111i\u1EC3m", icon: Icon.circle3, group: "circle", needs: 3 },
  { key: "tangent", label: "Ti\u1EBFp tuy\u1EBFn", hint: "Click 1 \u0111i\u1EC3m + 1 \u0111\u01B0\u1EDDng tr\xF2n c\xF3 s\u1EB5n", icon: Icon.tangent, group: "circle", needs: 2, accepts: ["point", "circle"] },
  { key: "angle", label: "G\xF3c", hint: "Click 3 \u0111i\u1EC3m c\xF3 s\u1EB5n (\u0111\u1EC9nh \u1EDF gi\u1EEFa)", icon: Icon.angle, group: "measure", needs: 3, accepts: ["point", "point", "point"] },
  { key: "distance", label: "Kho\u1EA3ng c\xE1ch", hint: "Click 2 \u0111i\u1EC3m c\xF3 s\u1EB5n", icon: Icon.distance, group: "measure", needs: 2, accepts: ["point", "point"] },
  { key: "area", label: "Di\u1EC7n t\xEDch", hint: "Click c\xE1c \u0111\u1EC9nh, click l\u1EA1i \u0111i\u1EC3m \u0111\u1EA7u \u0111\u1EC3 \u0111\xF3ng", icon: Icon.area, group: "measure", needs: -1 },
  { key: "toggleLabel", label: "Hi\u1EC7n/\u1EA9n t\xEAn", hint: "Click v\xE0o \u0111\u1ED1i t\u01B0\u1EE3ng", icon: Icon.toggleLabel, group: "edit", needs: 1, accepts: ["any"] },
  { key: "toggleVisible", label: "Hi\u1EC7n/\u1EA9n \u0111\u1ED1i t\u01B0\u1EE3ng", hint: "Click v\xE0o \u0111\u1ED1i t\u01B0\u1EE3ng", icon: Icon.toggleVisible, group: "edit", needs: 1, accepts: ["any"] },
  { key: "delete", label: "Xo\xE1", hint: "Click v\xE0o \u0111\u1ED1i t\u01B0\u1EE3ng", icon: Icon.trash, group: "edit", needs: 1, accepts: ["any"] }
];
var GROUP_LABELS = {
  move: "C\u01A1 b\u1EA3n",
  point: "\u0110i\u1EC3m",
  line: "\u0110\u01B0\u1EDDng",
  construct: "D\u1EF1ng h\xECnh",
  polygon: "\u0110a gi\xE1c",
  circle: "\u0110\u01B0\u1EDDng tr\xF2n",
  measure: "\u0110o l\u01B0\u1EDDng",
  edit: "Ch\u1EC9nh s\u1EEDa"
};
function objKind(obj) {
  if (!obj) return "other";
  const e = (obj.elType || obj.type || "").toString().toLowerCase();
  if (e === "point" || e === "glider" || e === "midpoint") return "point";
  if (e === "line" || e === "segment" || e === "arrow" || e === "axis" || e === "normal" || e === "parallel" || e === "perpendicular" || e === "tangent" || e === "bisector" || e === "perpendicularsegment") return "line";
  if (e === "circle" || e === "circumcircle") return "circle";
  return "other";
}
var JSXGraphMiniBoard = ({ onReady, initialState }) => {
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
  const pendingRef = useRef([]);
  const [, setPendingCount] = useState(0);
  const previewSegRef = useRef([]);
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
      const obj = boardRef.current.create(type, resolved, { ...attrs });
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
  const clearPending = useCallback(() => {
    clearPreviewSegs();
    pendingRef.current = [];
    setPendingCount(0);
  }, [clearPreviewSegs]);
  const finalize = useCallback((toolDef, picks) => {
    if (!boardRef.current) return;
    const labels = picks.map(localIdOf).filter(Boolean);
    const stroke = { strokeColor: "#0f172a", strokeWidth: 2 };
    const strokeOnly = { ...stroke, fillColor: "none", fillOpacity: 0 };
    const lblName = nextLabel();
    switch (toolDef.key) {
      case "midpoint":
        create("midpoint", labels, { name: lblName, color: "#000", size: 3 });
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
      case "angle":
        create("angle", labels, { radius: 1, fillColor: "#22c55e", fillOpacity: 0.25, strokeColor: "#16a34a", strokeWidth: 1.5, name: lblName });
        break;
      case "distance": {
        const pA = picks[0], pB = picks[1];
        const dist = Math.hypot(pA.X() - pB.X(), pA.Y() - pB.Y());
        const midX = (pA.X() + pB.X()) / 2;
        const midY = (pA.Y() + pB.Y()) / 2;
        create("text", [midX, midY, `d = ${dist.toFixed(2)}`], { fontSize: 14, color: "#dc2626" });
        break;
      }
      case "polygon": {
        create("polygon", labels, { fillColor: "#1e3a8a", fillOpacity: 0.1, borders: { strokeColor: "#0f172a", strokeWidth: 2 } });
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
          const id = localIdOf(obj);
          if (id) {
            creationLogRef.current = creationLogRef.current.filter((e) => e.id !== id);
            objMapRef.current.delete(id);
            setHistoryTick((t) => t + 1);
          }
        } catch {
        }
        break;
      }
    }
  }, [create, localIdOf, nextLabel]);
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
      if (!((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !e.shiftKey)) return;
      const ae = document.activeElement;
      if (ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.isContentEditable)) return;
      e.preventDefault();
      e.stopPropagation();
      undoLast();
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [undoLast]);
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
            const obj = board.create(el.type, resolved, { ...el.attrs });
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
          axisObjsRef.current.x = board.create("axis", [[0, 0], [1, 0]], { strokeColor: "#94a3b8", name: "", withLabel: false });
          axisObjsRef.current.y = board.create("axis", [[0, 0], [0, 1]], { strokeColor: "#94a3b8", name: "", withLabel: false });
        } catch {
        }
      }
      if (showGridRef.current) {
        try {
          board.create("grid", [], { strokeColor: "#e2e8f0", strokeOpacity: 1 });
        } catch {
        }
      }
      board.on("down", (e) => {
        if (!boardRef.current) return;
        const t = toolRef.current;
        if (t === "move") return;
        const toolDef = TOOLS.find((td) => td.key === t);
        if (!toolDef) return;
        const coords = boardRef.current.getUsrCoordsOfMouse(e);
        const x = coords[0], y = coords[1];
        const hits = objectsAt(e).filter((o) => o !== axisObjsRef.current.x && o !== axisObjsRef.current.y);
        const bestHit = hits.find((o) => objKind(o) === "point") ?? hits[0] ?? null;
        const snapPointForPointSlot = () => bestHit && objKind(bestHit) === "point" ? bestHit : findNearestPoint(e, 12);
        if (t === "point") {
          const name = nextLabel();
          create("point", [x, y], { name, color: "#0f172a", size: 3, fillColor: "#0f172a", strokeColor: "#0f172a" });
          return;
        }
        if (toolDef.needs === 1 && toolDef.accepts) {
          const hit = bestHit ?? findNearestPoint(e, 12);
          if (hit) finalize(toolDef, [hit]);
          else flashWarn("Click v\xE0o m\u1ED9t \u0111\u1ED1i t\u01B0\u1EE3ng \u0111\u1EC3 \xE1p d\u1EE5ng");
          return;
        }
        if (toolDef.needs === -1) {
          const snappedPoint = snapPointForPointSlot();
          if (pendingRef.current.length >= 3 && snappedPoint && snappedPoint === pendingRef.current[0]) {
            clearPreviewSegs();
            finalize(toolDef, pendingRef.current);
            clearPending();
            return;
          }
          const pick2 = snappedPoint ?? (() => {
            const name = nextLabel();
            return create("point", [x, y], { name, color: "#0f172a", size: 3 });
          })();
          if (pendingRef.current.length > 0 && boardRef.current) {
            const prev = pendingRef.current[pendingRef.current.length - 1];
            try {
              const seg = boardRef.current.create("segment", [prev, pick2], {
                strokeColor: "#3b82f6",
                strokeWidth: 1.5,
                strokeOpacity: 0.75,
                fixed: true,
                highlight: false,
                withLabel: false
              });
              previewSegRef.current.push(seg);
            } catch {
            }
          }
          pendingRef.current.push(pick2);
          setPendingCount(pendingRef.current.length);
          return;
        }
        let pick = null;
        if (toolDef.accepts) {
          const usedKinds = pendingRef.current.map((p) => objKind(p));
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
          else if (remaining.includes("point")) {
            const near = findNearestPoint(e, 12);
            if (near) pick = near;
          } else if (remaining.includes("any")) {
            pick = strictPoint ?? lineHit ?? circleHit ?? null;
          }
          if (!pick) {
            const needs = remaining.map(
              (k) => k === "point" ? "m\u1ED9t \u0111i\u1EC3m" : k === "line" ? "m\u1ED9t \u0111\u01B0\u1EDDng/\u0111o\u1EA1n" : k === "circle" ? "m\u1ED9t \u0111\u01B0\u1EDDng tr\xF2n" : "m\u1ED9t \u0111\u1ED1i t\u01B0\u1EE3ng"
            );
            flashWarn(`C\xF2n c\u1EA7n click v\xE0o ${needs.join(" + ")} c\xF3 s\u1EB5n`);
            return;
          }
        } else {
          const snapped = snapPointForPointSlot();
          if (snapped) pick = snapped;
          else {
            const name = nextLabel();
            pick = create("point", [x, y], { name, color: "#0f172a", size: 3, fillColor: "#0f172a", strokeColor: "#0f172a" });
          }
        }
        if (!pick) return;
        pendingRef.current.push(pick);
        setPendingCount(pendingRef.current.length);
        if (pendingRef.current.length >= toolDef.needs) {
          finalize(toolDef, pendingRef.current);
          clearPending();
        }
      });
      onReady({
        getContainer: () => containerRef.current,
        getCreationLog: () => [...creationLogRef.current],
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
        }
      });
    })();
    return () => {
      cancelled = true;
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
        axisObjsRef.current.x = b.create("axis", [[0, 0], [1, 0]], { strokeColor: "#94a3b8", name: "", withLabel: false });
        axisObjsRef.current.y = b.create("axis", [[0, 0], [0, 1]], { strokeColor: "#94a3b8", name: "", withLabel: false });
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
        b.create("grid", [], { strokeColor: "#e2e8f0", strokeOpacity: 1 });
      }
      b.update();
    } catch {
    }
  }, [showGrid]);
  const handleToolChange = useCallback((t) => {
    clearPending();
    toolRef.current = t;
    setTool(t);
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
var TOOLTIP_DELAY_MS = 400;
function Shell({ title, icon, onClose, children }) {
  return /* @__PURE__ */ jsxs(
    "aside",
    {
      role: "complementary",
      "aria-label": title,
      "data-testid": "stamp-left-panel",
      "data-stamp-area": "true",
      className: "absolute left-0 top-0 z-30 flex h-full w-60 flex-col border-r border-slate-200 bg-white shadow-md animate-in slide-in-from-left duration-200",
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
function GeometryLeftPanel({
  activeTool,
  onToolChange,
  showAxis,
  showGrid,
  onShowAxisChange,
  onShowGridChange,
  onUndo,
  canUndo,
  onClose
}) {
  const grouped = TOOLS.reduce((acc, t) => {
    var _a;
    (acc[_a = t.group] ?? (acc[_a] = [])).push(t);
    return acc;
  }, {});
  const groupKeys = Object.keys(grouped);
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
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsxs(Shell, { title: "H\xECnh h\u1ECDc", icon: GeometryIconHeader, onClose, children: [
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
            children: /* @__PURE__ */ jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
              /* @__PURE__ */ jsx("polyline", { points: "3 7 3 13 9 13" }),
              /* @__PURE__ */ jsx("path", { d: "M3.51 13a9 9 0 1 0 2.13-9.36L3 7" })
            ] })
          }
        )
      ] }) }),
      groupKeys.map((group) => /* @__PURE__ */ jsx(Section, { label: GROUP_LABELS[group], children: /* @__PURE__ */ jsx("div", { className: "grid grid-cols-4 gap-1", children: grouped[group].map((t) => {
        const active = activeTool === t.key;
        return /* @__PURE__ */ jsx(
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
              "flex h-8 items-center justify-center rounded-md transition",
              active ? "bg-emerald-600 text-white shadow-sm" : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
            ].join(" "),
            children: t.icon
          },
          t.key
        );
      }) }) }, group))
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
function LatexLeftPanel({
  displayMode,
  onDisplayModeChange,
  onInsertSnippet,
  onClose
}) {
  return /* @__PURE__ */ jsxs(Shell, { title: "C\xF4ng th\u1EE9c LaTeX", icon: "\u2211", onClose, children: [
    /* @__PURE__ */ jsx(Section, { label: "Ch\u1EBF \u0111\u1ED9 hi\u1EC3n th\u1ECB", children: /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-1.5", children: [
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
    SNIPPETS.map((group) => /* @__PURE__ */ jsx(Section, { label: group.group, children: /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-1", children: group.items.map((s) => /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        onClick: () => onInsertSnippet(s.snippet),
        title: s.snippet,
        className: "rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700",
        children: s.preview
      },
      s.snippet
    )) }) }, group.group)),
    /* @__PURE__ */ jsx(Section, { label: "Ph\xEDm t\u1EAFt", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2 text-[11px] text-slate-600", children: [
      /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-1", children: [
        /* @__PURE__ */ jsx("kbd", { className: "rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono", children: "Enter" }),
        "ch\xE8n"
      ] }),
      /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-1", children: [
        /* @__PURE__ */ jsx("kbd", { className: "rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono", children: "Esc" }),
        "\u0111\xF3ng"
      ] })
    ] }) })
  ] });
}

// src/stamp/renderLatexToSvg.ts
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
var LatexEditorPopover = forwardRef(function LatexEditorPopover2({
  x,
  y,
  initialValue,
  onInsert,
  onClose,
  displayMode: controlledDisplayMode,
  onDisplayModeChange,
  withLeftPanel = false
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
  const wrapperStyle = isLegacyPosition ? { position: "absolute", top: y, left: x, zIndex: 50 } : {
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
      className: "w-[420px] max-w-[calc(100vw-280px)] rounded-lg border border-slate-300 bg-white shadow-2xl ring-1 ring-black/5",
      role: "dialog",
      "aria-label": "Nh\u1EADp c\xF4ng th\u1EE9c LaTeX",
      children: [
        /* @__PURE__ */ jsxs("header", { className: "flex items-center justify-between rounded-t-lg border-b border-slate-200 bg-gradient-to-r from-indigo-600 to-purple-600 px-3 py-2 text-white", children: [
          /* @__PURE__ */ jsxs("h3", { className: "flex items-center gap-2 text-sm font-semibold", children: [
            /* @__PURE__ */ jsx("span", { className: "text-base leading-none", children: "\u2211" }),
            "C\xF4ng th\u1EE9c LaTeX"
          ] }),
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: onClose,
              "aria-label": "\u0110\xF3ng",
              className: "rounded p-1 transition hover:bg-white/15",
              children: /* @__PURE__ */ jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
                /* @__PURE__ */ jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" }),
                /* @__PURE__ */ jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" })
              ] })
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-2 p-3", children: [
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
              className: "w-full rounded border border-slate-300 px-2 py-1.5 font-mono text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200",
              autoFocus: true
            }
          ),
          /* @__PURE__ */ jsx(
            "div",
            {
              className: [
                "flex min-h-[64px] items-center justify-center rounded border p-3 text-center",
                error ? "border-rose-300 bg-rose-50 text-rose-700" : "border-slate-200 bg-slate-50"
              ].join(" "),
              children: error ? /* @__PURE__ */ jsxs("span", { className: "text-xs", children: [
                "L\u1ED7i: ",
                error.slice(0, 80)
              ] }) : previewSvg ? /* @__PURE__ */ jsx("span", { dangerouslySetInnerHTML: { __html: previewSvg } }) : /* @__PURE__ */ jsx("span", { className: "text-xs text-slate-400", children: "(xem tr\u01B0\u1EDBc)" })
            }
          ),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
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
          ] })
        ] })
      ]
    }
  );
});

// src/stamp/serializeBoard.ts
function serializeBoard(board, log, options = {}) {
  return {
    bbox: board.getBoundingBox(),
    elements: log.map((e) => ({ type: e.type, args: e.args, attrs: e.attrs, id: e.id })),
    showAxis: !!options.showAxis,
    showGrid: !!options.showGrid
  };
}
function deserializeIntoBoard(board, serialized) {
  const idMap = /* @__PURE__ */ new Map();
  for (const el of serialized.elements) {
    const resolvedArgs = el.args.map((a) => {
      if (typeof a === "string" && idMap.has(a)) return idMap.get(a);
      return a;
    });
    const created = board.create(el.type, resolvedArgs, { ...el.attrs });
    idMap.set(el.id, created);
  }
}

// src/stamp/renderGeometryToSvg.ts
function renderGeometryToSvg(boardContainer) {
  const svgEl = boardContainer.querySelector("svg");
  if (!svgEl) throw new Error("renderGeometryToSvg: no SVG found in board container");
  const clone = svgEl.cloneNode(true);
  if (!clone.getAttribute("xmlns")) {
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  }
  return new XMLSerializer().serializeToString(clone);
}
var GeometryEditorPanel = forwardRef(
  function GeometryEditorPanel2({ initialState, onInsert, onClose, withLeftPanel = false, onStateChange }, ref) {
    const handleRef = useRef(null);
    const [ready, setReady] = useState(false);
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
    }, [emitState]);
    const performInsert = useCallback(() => {
      if (!handleRef.current) return false;
      const container = handleRef.current.getContainer();
      if (!container) return false;
      const log = handleRef.current.getCreationLog();
      if (log.length === 0) return false;
      try {
        const svgString = renderGeometryToSvg(container);
        const bbox = handleRef.current.getBbox();
        const showAxis = handleRef.current.getShowAxis();
        const showGrid = handleRef.current.getShowGrid();
        const serialized = serializeBoard(
          { getBoundingBox: () => bbox, create: () => void 0 },
          log,
          { showAxis, showGrid }
        );
        onInsert(JSON.stringify(serialized), svgString);
        return true;
      } catch (err) {
        console.error("Geometry insert failed:", err);
        return false;
      }
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
    const wrapperStyle = {
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
        style: wrapperStyle,
        className: "flex h-[540px] max-h-[85vh] w-[640px] max-w-[calc(100vw-280px)] flex-col overflow-hidden rounded-lg border border-slate-300 bg-white shadow-2xl ring-1 ring-black/5",
        children: [
          /* @__PURE__ */ jsxs("header", { className: "flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-2 text-white", children: [
            /* @__PURE__ */ jsxs("h3", { className: "flex items-center gap-2 text-sm font-semibold", children: [
              /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
                /* @__PURE__ */ jsx("polygon", { points: "3,18 12,3 21,18" }),
                /* @__PURE__ */ jsx("circle", { cx: "12", cy: "3", r: "1.5", fill: "currentColor" }),
                /* @__PURE__ */ jsx("circle", { cx: "3", cy: "18", r: "1.5", fill: "currentColor" }),
                /* @__PURE__ */ jsx("circle", { cx: "21", cy: "18", r: "1.5", fill: "currentColor" })
              ] }),
              "D\u1EF1ng h\xECnh h\u1ECDc"
            ] }),
            /* @__PURE__ */ jsx("button", { onClick: onClose, "aria-label": "\u0110\xF3ng", className: "rounded p-1 transition hover:bg-white/15", children: /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
              /* @__PURE__ */ jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" }),
              /* @__PURE__ */ jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" })
            ] }) })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "min-h-0 flex-1", style: { height: "420px" }, children: /* @__PURE__ */ jsx(
            JSXGraphMiniBoard,
            {
              onReady: handleReady,
              initialState
            }
          ) }),
          /* @__PURE__ */ jsxs("footer", { className: "flex items-center justify-between border-t border-slate-200 bg-slate-50 px-3 py-2", children: [
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
function isEditableTarget(t) {
  if (!t || !(t instanceof HTMLElement)) return false;
  if (t.isContentEditable) return true;
  const tag = t.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}
function useStampShortcuts({ onGeometry, onLatex, enabled }) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isEditableTarget(e.target)) return;
      const key = e.key.toLowerCase();
      if (key !== "g" && key !== "l") return;
      e.preventDefault();
      e.stopPropagation();
      if (key === "g") onGeometry();
      else onLatex();
    };
    window.addEventListener("keydown", handler, { capture: true });
    return () => window.removeEventListener("keydown", handler, { capture: true });
  }, [enabled, onGeometry, onLatex]);
}

// src/stamp/types.ts
function isMathStamp(element) {
  const c = element.customData;
  if (!c) return false;
  if (c.version !== 1) return false;
  return c.kind === "geometry" || c.kind === "latex";
}

// src/stamp/svgToImageElement.ts
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

// src/stamp/restoreMathStampFiles.ts
function svgToDataURL(svg) {
  const utf8 = unescape(encodeURIComponent(svg));
  return "data:image/svg+xml;base64," + btoa(utf8);
}
async function renderGeometrySvgFromState(jsonState) {
  const parsed = JSON.parse(jsonState);
  const JXG = (await import('jsxgraph')).default;
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
    deserializeIntoBoard(board, parsed);
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
async function buildFileForStamp(fileId, customData) {
  try {
    let svg;
    if (customData.kind === "latex") {
      svg = await renderLatexToSvg(customData.src, customData.displayMode);
    } else if (customData.kind === "geometry") {
      svg = await renderGeometrySvgFromState(customData.jsonState);
    } else {
      return null;
    }
    return { id: fileId, dataURL: svgToDataURL(svg), mimeType: "image/svg+xml", created: Date.now() };
  } catch (err) {
    console.warn("Math-stamp restore failed for", fileId, err);
    return null;
  }
}
async function restoreMissingMathStampFiles(api, elements) {
  if (!api) return;
  const existing = typeof api.getFiles === "function" ? api.getFiles() : {};
  const targets = [];
  const seen = /* @__PURE__ */ new Set();
  for (const el of elements) {
    if (el.type !== "image") continue;
    if (!el.fileId) continue;
    if (existing && existing[el.fileId]) continue;
    if (seen.has(el.fileId)) continue;
    if (!isMathStamp(el)) continue;
    seen.add(el.fileId);
    targets.push({ fileId: el.fileId, customData: el.customData });
  }
  if (targets.length === 0) return;
  const built = await Promise.all(targets.map((t) => buildFileForStamp(t.fileId, t.customData)));
  const files = built.filter((f) => !!f);
  if (files.length > 0) {
    try {
      api.addFiles(files);
    } catch (err) {
      console.warn("addFiles failed:", err);
    }
  }
}
var Excalidraw = dynamic(
  async () => (await import('./ExcalidrawWithMenus-YGFFNZYY.mjs')).ExcalidrawWithMenus,
  {
    ssr: false,
    loading: () => /* @__PURE__ */ jsx("div", { className: "flex h-full items-center justify-center text-sm text-gray-500", children: "\u0110ang t\u1EA3i b\u1EA3ng\u2026" })
  }
);
var SYNC_THROTTLE_MS = 200;
var DOUBLE_CLICK_MS = 400;
var INITIAL_GEOM_STATE = {
  tool: "move",
  showAxis: false,
  showGrid: false,
  canUndo: false
};
function ExcalidrawWhiteboardView({
  role,
  initialScene,
  remoteScene,
  remoteFiles,
  onSceneChange,
  onFilesChange,
  langCode = "vi-VN"
}) {
  const [api, setApi] = useState(null);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const knownFileIdsRef = useRef(/* @__PURE__ */ new Set());
  const lastElementsHashRef = useRef("");
  const throttleTimerRef = useRef(null);
  const [activeStamp, setActiveStamp] = useState(null);
  const activeStampRef = useRef(activeStamp);
  activeStampRef.current = activeStamp;
  const [geometryEditing, setGeometryEditing] = useState({ editingElementId: null, initialState: null });
  const [geomState, setGeomState] = useState(INITIAL_GEOM_STATE);
  const geomPanelRef = useRef(null);
  const [latexEditing, setLatexEditing] = useState({ editingElementId: null, initialValue: "", x: 0, y: 0 });
  const [latexDisplayMode, setLatexDisplayMode] = useState(false);
  const latexEditorRef = useRef(null);
  const latexInsertableRef = useRef({
    insert: () => false,
    hasContent: () => false
  });
  const lastClickRef = useRef({
    time: 0,
    elementId: null
  });
  const handledCropIdRef = useRef(null);
  const prevExcalidrawToolRef = useRef("selection");
  const isTeacher = role === "teacher";
  const openGeometry = useCallback(() => {
    if (!isTeacher) return;
    setGeometryEditing({ editingElementId: null, initialState: null });
    setGeomState(INITIAL_GEOM_STATE);
    setActiveStamp("geometry");
  }, [isTeacher]);
  const openLatex = useCallback(() => {
    if (!isTeacher) return;
    setLatexEditing({ editingElementId: null, initialValue: "", x: 0, y: 0 });
    setActiveStamp("latex");
  }, [isTeacher]);
  const closeStamp = useCallback(() => {
    setActiveStamp(null);
    setGeometryEditing({ editingElementId: null, initialState: null });
    setLatexEditing({ editingElementId: null, initialValue: "", x: 0, y: 0 });
  }, []);
  const toggleGeometry = useCallback(() => {
    if (activeStamp === "geometry") closeStamp();
    else openGeometry();
  }, [activeStamp, closeStamp, openGeometry]);
  const toggleLatex = useCallback(() => {
    if (activeStamp === "latex") closeStamp();
    else openLatex();
  }, [activeStamp, closeStamp, openLatex]);
  const handleChange = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (elements, appState, files) => {
      const nextDark = appState?.theme === "dark";
      setIsDarkTheme((prev) => prev === nextDark ? prev : nextDark);
      if (!isTeacher) return;
      const cropId = appState?.croppingElementId;
      if (cropId && cropId !== handledCropIdRef.current && api) {
        const el = elements.find((e) => e.id === cropId);
        if (el && isMathStamp(el)) {
          handledCropIdRef.current = cropId;
          api.updateScene({
            appState: { ...appState, croppingElementId: null, selectedElementIds: {} }
          });
          if (el.customData.kind === "geometry") {
            try {
              const parsed = JSON.parse(el.customData.jsonState);
              setGeometryEditing({ editingElementId: el.id, initialState: parsed });
              setActiveStamp("geometry");
            } catch {
              console.warn("customData jsonState corrupted; skipping reopen");
            }
          } else {
            const elAny = el;
            setLatexEditing({
              editingElementId: el.id,
              initialValue: el.customData.src,
              x: elAny.x ?? 0,
              y: elAny.y ?? 0
            });
            setLatexDisplayMode(!!el.customData.displayMode);
            setActiveStamp("latex");
          }
          return;
        }
      }
      if (!cropId) {
        handledCropIdRef.current = null;
      }
      const fileIds = Object.keys(files);
      const newIds = fileIds.filter((id) => !knownFileIdsRef.current.has(id));
      if (newIds.length > 0) {
        newIds.forEach((id) => knownFileIdsRef.current.add(id));
        onFilesChange(files, newIds);
      }
      if (throttleTimerRef.current) return;
      throttleTimerRef.current = setTimeout(async () => {
        throttleTimerRef.current = null;
        const mod = await import('@excalidraw/excalidraw');
        const hash = mod.hashElementsVersion(elements);
        if (hash === lastElementsHashRef.current) return;
        lastElementsHashRef.current = hash;
        onSceneChange({
          elements: elements.filter((e) => !e.isDeleted),
          appState: pickSyncableAppState(appState)
        });
      }, SYNC_THROTTLE_MS);
    },
    [isTeacher, api, onSceneChange, onFilesChange]
  );
  useEffect(() => {
    if (isTeacher || !api || !remoteScene) return;
    api.updateScene({
      elements: remoteScene.elements,
      appState: remoteScene.appState
    });
  }, [isTeacher, api, remoteScene]);
  useEffect(() => {
    if (isTeacher || !api || !remoteFiles) return;
    const entries = Object.entries(remoteFiles);
    if (entries.length === 0) return;
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
  }, [isTeacher, api, remoteFiles]);
  useEffect(() => {
    if (!api) return;
    let cancelled = false;
    const run = async () => {
      try {
        const elements = api.getSceneElements();
        if (!elements || elements.length === 0) return;
        if (cancelled) return;
        await restoreMissingMathStampFiles(api, elements);
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
  }, [api, initialScene, remoteScene]);
  useEffect(
    () => () => {
      if (throttleTimerRef.current) clearTimeout(throttleTimerRef.current);
    },
    []
  );
  const buildStampImageElement = useCallback(
    (fileId, width, height, customData, x, y) => {
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
    },
    [api]
  );
  const clearAppStateAfterInsert = () => ({
    selectedElementIds: {},
    croppingElementId: null
  });
  const handleGeometryInsert = useCallback(
    async (jsonState, svgString) => {
      if (!api) return;
      try {
        const { dataURL, fileId, width, height, mimeType } = await svgToImageElement(svgString);
        api.addFiles([{ id: fileId, dataURL, mimeType, created: Date.now() }]);
        const customData = {
          kind: "geometry",
          version: 1,
          jsonState,
          svgWidth: width,
          svgHeight: height
        };
        const elements = api.getSceneElements();
        const editingId = geometryEditing.editingElementId;
        if (editingId) {
          const updated = elements.map(
            (e) => e.id === editingId ? { ...e, fileId, customData, width, height } : e
          );
          api.updateScene({ elements: updated, appState: clearAppStateAfterInsert() });
        } else {
          const newElement = buildStampImageElement(fileId, width, height, customData);
          api.updateScene({
            elements: [...elements, newElement],
            appState: clearAppStateAfterInsert()
          });
        }
      } catch (err) {
        console.error("Geometry stamp insert failed:", err);
      }
      closeStamp();
    },
    [api, geometryEditing.editingElementId, buildStampImageElement, closeStamp]
  );
  const handleLatexInsert = useCallback(
    async (svgString, src, displayMode) => {
      if (!api) return;
      try {
        const { dataURL, fileId, width, height, mimeType } = await svgToImageElement(svgString);
        api.addFiles([{ id: fileId, dataURL, mimeType, created: Date.now() }]);
        const customData = {
          kind: "latex",
          version: 1,
          src,
          displayMode
        };
        const elements = api.getSceneElements();
        const editingId = latexEditing.editingElementId;
        if (editingId) {
          const updated = elements.map(
            (e) => e.id === editingId ? { ...e, fileId, customData, width, height } : e
          );
          api.updateScene({ elements: updated, appState: clearAppStateAfterInsert() });
        } else {
          const newElement = buildStampImageElement(
            fileId,
            width,
            height,
            customData,
            latexEditing.x || void 0,
            latexEditing.y || void 0
          );
          api.updateScene({
            elements: [...elements, newElement],
            appState: clearAppStateAfterInsert()
          });
        }
      } catch (err) {
        console.error("LaTeX stamp insert failed:", err);
      }
      closeStamp();
    },
    [api, latexEditing.editingElementId, latexEditing.x, latexEditing.y, buildStampImageElement, closeStamp]
  );
  const handlePointerDown = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (_activeTool, pointerDownState) => {
      if (!isTeacher) return;
      const hitElement = pointerDownState?.hit?.element;
      if (!hitElement || hitElement.type !== "image") return;
      if (!isMathStamp(hitElement)) return;
      const now = Date.now();
      const isDouble = lastClickRef.current.elementId === hitElement.id && now - lastClickRef.current.time < DOUBLE_CLICK_MS;
      lastClickRef.current = { time: now, elementId: hitElement.id };
      if (!isDouble) return;
      if (hitElement.customData.kind === "geometry") {
        try {
          const parsed = JSON.parse(hitElement.customData.jsonState);
          setGeometryEditing({ editingElementId: hitElement.id, initialState: parsed });
          setActiveStamp("geometry");
        } catch {
          console.warn("customData jsonState corrupted; skipping reopen");
        }
      } else {
        setLatexEditing({
          editingElementId: hitElement.id,
          initialValue: hitElement.customData.src,
          x: hitElement.x ?? 0,
          y: hitElement.y ?? 0
        });
        setLatexDisplayMode(!!hitElement.customData.displayMode);
        setActiveStamp("latex");
      }
    },
    [isTeacher]
  );
  useStampShortcuts({
    enabled: isTeacher,
    onGeometry: toggleGeometry,
    onLatex: toggleLatex
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
      const k = e.key.toLowerCase();
      if (k === "g" || k === "l") return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("keydown", blocker, { capture: true });
    return () => window.removeEventListener("keydown", blocker, { capture: true });
  }, [activeStamp]);
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
      const stampType = activeStampRef.current;
      if (stampType === "geometry") {
        geomPanelRef.current?.insert();
      } else if (stampType === "latex") {
        latexInsertableRef.current.insert();
      }
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
        excalidrawAPI: (a) => setApi(a),
        langCode,
        viewModeEnabled: !isTeacher,
        initialData: initialScene ? {
          elements: initialScene.elements,
          appState: {
            ...initialScene.appState,
            gridSize: initialScene.appState.gridSize ?? void 0
          }
        } : { appState: { viewBackgroundColor: "#ffffff" } },
        onChange: handleChange,
        onPointerDown: handlePointerDown
      }
    ),
    /* @__PURE__ */ jsx(
      ToolbarStampInjector,
      {
        enabled: isTeacher,
        activeStamp,
        onToggleGeometry: toggleGeometry,
        onToggleLatex: toggleLatex
      }
    ),
    activeStamp === "geometry" && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx(
        GeometryLeftPanel,
        {
          activeTool: geomState.tool,
          onToolChange: (t) => geomPanelRef.current?.setTool(t),
          showAxis: geomState.showAxis,
          showGrid: geomState.showGrid,
          onShowAxisChange: (b) => geomPanelRef.current?.setShowAxis(b),
          onShowGridChange: (b) => geomPanelRef.current?.setShowGrid(b),
          onUndo: () => geomPanelRef.current?.undo(),
          canUndo: geomState.canUndo,
          onClose: closeStamp
        }
      ),
      /* @__PURE__ */ jsx(
        GeometryEditorPanel,
        {
          ref: geomPanelRef,
          initialState: geometryEditing.initialState,
          onInsert: handleGeometryInsert,
          onClose: closeStamp,
          onStateChange: setGeomState,
          withLeftPanel: true
        }
      )
    ] }),
    activeStamp === "latex" && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx(
        LatexLeftPanel,
        {
          displayMode: latexDisplayMode,
          onDisplayModeChange: setLatexDisplayMode,
          onInsertSnippet: (s) => latexEditorRef.current?.insertAtCursor(s),
          onClose: closeStamp
        }
      ),
      /* @__PURE__ */ jsx(
        LatexEditorPopover,
        {
          ref: (node) => {
            latexEditorRef.current = node;
            if (node) {
              latexInsertableRef.current = {
                insert: () => node.tryInsert(),
                hasContent: () => node.hasContent()
              };
            }
          },
          x: 0,
          y: 0,
          initialValue: latexEditing.initialValue,
          displayMode: latexDisplayMode,
          onDisplayModeChange: setLatexDisplayMode,
          onInsert: handleLatexInsert,
          onClose: closeStamp,
          withLeftPanel: true
        }
      )
    ] })
  ] });
}

export { ExcalidrawWhiteboardView, pickSyncableAppState };
//# sourceMappingURL=index.mjs.map
//# sourceMappingURL=index.mjs.map