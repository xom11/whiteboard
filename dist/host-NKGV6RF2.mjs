"use client";
import { EMPTY_GRAPH, addPointOnCurve, addIntersection, validate, stringifySerializedGraph, renderGraph2dSvgFromState, isGraph2DCustomData, parseSerializedGraph, compile, numericalDerivative } from './chunk-74VEEZBV.mjs';
import { useIsMobile } from './chunk-P2AOIF7S.mjs';
import { insertStampImage } from './chunk-C6SCVOMC.mjs';
import { __require } from './chunk-BJTO5JO5.mjs';
import { forwardRef, useRef, useState, useCallback, useEffect, useImperativeHandle, useMemo } from 'react';
import { jsxs, jsx, Fragment } from 'react/jsx-runtime';

// src/stamps/graph-2d/editor/tools.ts
var GRAPH_TOOLS = [
  { id: "move", label: "Di chuy\u1EC3n", title: "Di chuy\u1EC3n / ch\u1ECDn" },
  { id: "point-on-curve", label: "\u0110i\u1EC3m tr\xEAn curve", title: "T\u1EA1o \u0111i\u1EC3m c\u1ED1 \u0111\u1ECBnh tr\xEAn \u0111\u1ED3 th\u1ECB" },
  { id: "intersect", label: "Giao \u0111i\u1EC3m", title: "\u0110\xE1nh d\u1EA5u giao \u0111i\u1EC3m 2 \u0111\u1ED3 th\u1ECB" },
  { id: "tangent", label: "Ti\u1EBFp tuy\u1EBFn", title: "V\u1EBD ti\u1EBFp tuy\u1EBFn t\u1EA1i \u0111i\u1EC3m tr\xEAn \u0111\u1ED3 th\u1ECB" }
];
function FunctionRow(props) {
  const { id, name, expression, color, visible, error } = props;
  const [draft, setDraft] = useState(expression);
  useEffect(() => {
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
  return /* @__PURE__ */ jsxs("div", { className: `graph-function-row${error ? " is-error" : ""}`, "data-testid": `graph-function-row-${id}`, children: [
    /* @__PURE__ */ jsx(
      "span",
      {
        className: "graph-function-color",
        style: { backgroundColor: color },
        "aria-hidden": "true"
      }
    ),
    /* @__PURE__ */ jsxs("span", { className: "graph-function-name", "data-testid": `graph-function-name-${id}`, children: [
      name,
      "(x) ="
    ] }),
    /* @__PURE__ */ jsx(
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
    /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        "aria-label": "\u1EA8n/hi\u1EC7n \u0111\u1ED3 th\u1ECB",
        className: `graph-function-eye${visible ? "" : " is-hidden"}`,
        onClick: props.onToggleVisible,
        children: visible ? "\u{1F441}" : "\u2298"
      }
    ),
    /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        "aria-label": "Xo\xE1 \u0111\u1ED3 th\u1ECB",
        className: "graph-function-remove",
        onClick: props.onRemove,
        children: "\u2715"
      }
    ),
    error ? /* @__PURE__ */ jsx("div", { className: "graph-function-error", children: error }) : null
  ] });
}
function SliderRow(props) {
  const { name, value, min, max, step } = props;
  return /* @__PURE__ */ jsxs("div", { className: "graph-slider-row", "data-testid": `graph-slider-row-${name}`, children: [
    /* @__PURE__ */ jsxs("div", { className: "graph-slider-header", children: [
      /* @__PURE__ */ jsx("span", { className: "graph-slider-name", children: name }),
      /* @__PURE__ */ jsxs("span", { className: "graph-slider-value", children: [
        "= ",
        value.toFixed(2)
      ] }),
      /* @__PURE__ */ jsx(
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
    /* @__PURE__ */ jsx(
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
    /* @__PURE__ */ jsxs("div", { className: "graph-slider-range", children: [
      /* @__PURE__ */ jsx("span", { children: min }),
      /* @__PURE__ */ jsx("span", { children: max })
    ] })
  ] });
}

// src/stamps/graph-2d/colors.ts
var GRAPH_PALETTE = [
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
var FUNCTION_NAMES = ["f", "g", "h", "i", "j", "k", "l", "m"];
var MAX_FUNCTIONS = 8;
var MAX_PARAMETERS = 8;
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
function AlgebraView(props) {
  const { graph, errors } = props;
  const atMax = graph.functions.length >= MAX_FUNCTIONS;
  return /* @__PURE__ */ jsxs("div", { className: "graph-algebra-view", children: [
    /* @__PURE__ */ jsxs("div", { className: "graph-algebra-section", children: [
      graph.functions.map((f) => /* @__PURE__ */ jsx(
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
      /* @__PURE__ */ jsx(
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
    graph.parameters.length > 0 ? /* @__PURE__ */ jsx("div", { className: "graph-algebra-section graph-algebra-parameters", children: graph.parameters.map((p) => /* @__PURE__ */ jsx(
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
var GraphIconHeader = /* @__PURE__ */ jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", children: [
  /* @__PURE__ */ jsx("path", { d: "M3 21 V3" }),
  /* @__PURE__ */ jsx("path", { d: "M3 21 H21" }),
  /* @__PURE__ */ jsx("path", { d: "M5 19 C8 5, 14 5, 19 17" })
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
function ResetViewIcon() {
  return /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ jsx("circle", { cx: "12", cy: "12", r: "9" }),
    /* @__PURE__ */ jsx("line", { x1: "12", y1: "3", x2: "12", y2: "21" }),
    /* @__PURE__ */ jsx("line", { x1: "3", y1: "12", x2: "21", y2: "12" })
  ] });
}
function MoveIcon() {
  return /* @__PURE__ */ jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ jsx("path", { d: "M3 4 L9 4 L9 9 L4 9 Z" }) });
}
function PointOnCurveIcon() {
  return /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ jsx("path", { d: "M3 17 C7 8, 14 8, 21 14" }),
    /* @__PURE__ */ jsx("circle", { cx: "12", cy: "11", r: "2.2", fill: "currentColor", stroke: "none" })
  ] });
}
function IntersectIcon() {
  return /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ jsx("path", { d: "M3 17 C8 5, 14 5, 21 17" }),
    /* @__PURE__ */ jsx("path", { d: "M3 5 C8 17, 14 17, 21 5" }),
    /* @__PURE__ */ jsx("circle", { cx: "12", cy: "11", r: "1.6", fill: "currentColor", stroke: "none" })
  ] });
}
function TangentIcon() {
  return /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ jsx("path", { d: "M3 17 C8 7, 14 7, 21 16" }),
    /* @__PURE__ */ jsx("line", { x1: "4", y1: "14", x2: "20", y2: "6" }),
    /* @__PURE__ */ jsx("circle", { cx: "12", cy: "10", r: "1.8", fill: "currentColor", stroke: "none" })
  ] });
}
var TOOL_ICONS = {
  move: /* @__PURE__ */ jsx(MoveIcon, {}),
  "point-on-curve": /* @__PURE__ */ jsx(PointOnCurveIcon, {}),
  intersect: /* @__PURE__ */ jsx(IntersectIcon, {}),
  tangent: /* @__PURE__ */ jsx(TangentIcon, {})
};
function Section({ label, children }) {
  return /* @__PURE__ */ jsxs("section", { children: [
    /* @__PURE__ */ jsx("h4", { className: "mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500", children: label }),
    children
  ] });
}
function PanelBody(props) {
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(Section, { label: "B\u1ED1 c\u1EE5c", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 flex-wrap text-[11px] text-slate-700", children: [
      /* @__PURE__ */ jsxs("label", { className: "inline-flex select-none items-center gap-1.5", children: [
        /* @__PURE__ */ jsx(
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
      /* @__PURE__ */ jsxs("label", { className: "inline-flex select-none items-center gap-1.5", children: [
        /* @__PURE__ */ jsx(
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
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          onClick: props.onResetView,
          title: "\u0110\u1EB7t l\u1EA1i t\u1EA7m nh\xECn",
          "aria-label": "\u0110\u1EB7t l\u1EA1i t\u1EA7m nh\xECn",
          className: "ml-auto inline-flex items-center justify-center rounded p-1 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900",
          children: /* @__PURE__ */ jsx(ResetViewIcon, {})
        }
      ),
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          onClick: props.onUndo,
          disabled: !props.canUndo,
          title: "Ho\xE0n t\xE1c (Ctrl/Cmd+Z)",
          "aria-label": "Ho\xE0n t\xE1c",
          "data-testid": "undo-btn",
          className: "inline-flex items-center justify-center rounded p-1 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent",
          children: /* @__PURE__ */ jsx(UndoIcon, {})
        }
      ),
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          onClick: props.onRedo,
          disabled: !props.canRedo,
          title: "L\xE0m l\u1EA1i (Ctrl/Cmd+Shift+Z)",
          "aria-label": "L\xE0m l\u1EA1i",
          "data-testid": "redo-btn",
          className: "inline-flex items-center justify-center rounded p-1 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent",
          children: /* @__PURE__ */ jsx(RedoIcon, {})
        }
      )
    ] }) }),
    /* @__PURE__ */ jsx(Section, { label: "C\xF4ng c\u1EE5", children: /* @__PURE__ */ jsx("div", { className: "grid grid-cols-4 gap-1", children: GRAPH_TOOLS.map((t) => {
      const isActive = props.activeTool === t.id;
      return /* @__PURE__ */ jsx(
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
    /* @__PURE__ */ jsx(Section, { label: "H\xE0m s\u1ED1", children: /* @__PURE__ */ jsx(
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
  return /* @__PURE__ */ jsxs(
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
        /* @__PURE__ */ jsxs("header", { className: "flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-3 py-2", children: [
          /* @__PURE__ */ jsxs("h3", { className: "flex items-center gap-2 text-sm font-semibold text-slate-800", children: [
            /* @__PURE__ */ jsx("span", { className: "text-base leading-none", children: GraphIconHeader }),
            "\u0110\u1ED3 th\u1ECB 2D"
          ] }),
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: handleClose,
              "aria-label": "\u0110\xF3ng",
              className: "rounded p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800",
              children: /* @__PURE__ */ jsx(CloseIcon, {})
            }
          )
        ] }),
        /* @__PURE__ */ jsx("div", { className: "min-h-0 flex-1 overflow-y-auto p-3 space-y-4", children: /* @__PURE__ */ jsx(PanelBody, { ...props }) })
      ]
    }
  );
}
function MiniBoard({ graph, activeTool, isDark, onBoardEvent }) {
  const containerRef = useRef(null);
  const boardRef = useRef(null);
  const curvesRef = useRef(/* @__PURE__ */ new Map());
  useEffect(() => {
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
  useEffect(() => {
    if (!boardRef.current) return;
    syncObjects(boardRef.current, graph, curvesRef.current);
  }, [graph]);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.style.cursor = activeTool === "move" ? "" : "crosshair";
  }, [activeTool]);
  return /* @__PURE__ */ jsx(
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
  board.update();
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
var GraphEditorPanel = forwardRef(function GraphEditorPanel2(props, ref) {
  const initialGraph = props.initialState ?? EMPTY_GRAPH;
  const graphRef = useRef(initialGraph);
  const [, forceUpdate] = useState(0);
  const [errors, setErrors] = useState({});
  const [tool, setToolState] = useState("move");
  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);
  const idCounterRef = useRef(1);
  const toolRef = useRef(tool);
  toolRef.current = tool;
  const intersectFirstRef = useRef(null);
  const propsRef = useRef(props);
  propsRef.current = props;
  const initialGraphNotifiedRef = useRef(false);
  const pushUndo = useCallback((g) => {
    undoStackRef.current.push(g);
    if (undoStackRef.current.length > 30) undoStackRef.current.shift();
    redoStackRef.current = [];
  }, []);
  const setErrorsWithNotify = useCallback(
    (updater) => {
      setErrors((prev) => {
        const next = updater(prev);
        propsRef.current.onErrorsChange?.(next);
        return next;
      });
    },
    []
  );
  const notifyStateChange = useCallback((g, t) => {
    propsRef.current.onStateChange({
      tool: t,
      showAxis: g.view.showAxis,
      showGrid: g.view.showGrid,
      canUndo: undoStackRef.current.length > 0,
      canRedo: redoStackRef.current.length > 0
    });
  }, []);
  const updateGraph = useCallback(
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
  const doUndo = useCallback(() => {
    const prev = undoStackRef.current.pop();
    if (!prev) return;
    redoStackRef.current.push(graphRef.current);
    if (redoStackRef.current.length > 30) redoStackRef.current.shift();
    graphRef.current = prev;
    forceUpdate((n) => n + 1);
    propsRef.current.onStateChange({
      tool: toolRef.current,
      showAxis: prev.view.showAxis,
      showGrid: prev.view.showGrid,
      canUndo: undoStackRef.current.length > 0,
      canRedo: redoStackRef.current.length > 0
    });
    propsRef.current.onGraphChange?.(prev);
  }, []);
  const doRedo = useCallback(() => {
    const next = redoStackRef.current.pop();
    if (!next) return;
    undoStackRef.current.push(graphRef.current);
    if (undoStackRef.current.length > 30) undoStackRef.current.shift();
    graphRef.current = next;
    forceUpdate((n) => n + 1);
    propsRef.current.onStateChange({
      tool: toolRef.current,
      showAxis: next.view.showAxis,
      showGrid: next.view.showGrid,
      canUndo: undoStackRef.current.length > 0,
      canRedo: redoStackRef.current.length > 0
    });
    propsRef.current.onGraphChange?.(next);
  }, []);
  useEffect(() => {
    const onKey = (e) => {
      const ae = document.activeElement;
      const inField = !!(ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.isContentEditable));
      if (inField) return;
      if (!(e.metaKey || e.ctrlKey)) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        doUndo();
      } else if (key === "z" && e.shiftKey || key === "y" && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        doRedo();
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [doUndo, doRedo]);
  const onBoardEvent = useCallback((ev) => {
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
  useImperativeHandle(
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
          canUndo: undoStackRef.current.length > 0,
          canRedo: redoStackRef.current.length > 0
        });
      },
      setShowAxis: (b) => updateGraph((g) => ({ ...g, view: { ...g.view, showAxis: b } })),
      setShowGrid: (b) => updateGraph((g) => ({ ...g, view: { ...g.view, showGrid: b } })),
      resetView: () => updateGraph((g) => ({
        ...g,
        view: { ...g.view, xMin: -10, xMax: 10, yMin: -10, yMax: 10 }
      })),
      undo: doUndo,
      redo: doRedo,
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
    [updateGraph, errors, setErrorsWithNotify, doUndo, doRedo]
  );
  useEffect(() => {
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
  return /* @__PURE__ */ jsxs(
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
        /* @__PURE__ */ jsxs("header", { className: "flex items-center gap-2 border-b border-slate-200 bg-gradient-to-r from-orange-500 to-amber-600 px-3 py-2 text-white", children: [
          isMobile && /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: props.onOpenDrawer,
              "aria-label": "M\u1EDF b\u1EA3ng \u0111\u1EA1i s\u1ED1",
              "data-testid": "graph-drawer-toggle",
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
              /* @__PURE__ */ jsx("path", { d: "M3 21 V3" }),
              /* @__PURE__ */ jsx("path", { d: "M3 21 H21" }),
              /* @__PURE__ */ jsx("path", { d: "M5 19 C8 5, 14 5, 19 17" })
            ] }),
            "\u0110\u1ED3 th\u1ECB 2D"
          ] }),
          isMobile && /* @__PURE__ */ jsx(
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
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: props.onClose,
              "aria-label": "\u0110\xF3ng",
              className: "inline-flex h-9 w-9 items-center justify-center rounded transition hover:bg-white/15",
              children: /* @__PURE__ */ jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
                /* @__PURE__ */ jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" }),
                /* @__PURE__ */ jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" })
              ] })
            }
          )
        ] }),
        /* @__PURE__ */ jsx("div", { className: "min-h-0 flex-1", children: /* @__PURE__ */ jsx(
          MiniBoard,
          {
            graph,
            activeTool: tool,
            isDark,
            onBoardEvent
          }
        ) }),
        !isMobile && /* @__PURE__ */ jsxs("footer", { className: "flex items-center justify-between border-t border-slate-200 bg-slate-50 px-3 py-2", children: [
          /* @__PURE__ */ jsx("span", { className: "text-xs text-slate-500", children: "Nh\u1EADp bi\u1EC3u th\u1EE9c trong b\u1EA3ng \u0111\u1EA1i s\u1ED1 b\xEAn tr\xE1i." }),
          /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
            /* @__PURE__ */ jsx(
              "button",
              {
                onClick: props.onClose,
                className: "rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100",
                children: "Hu\u1EF7"
              }
            ),
            /* @__PURE__ */ jsx(
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
var INITIAL_GRAPH_STATE = {
  tool: "move",
  showAxis: true,
  showGrid: true,
  canUndo: false,
  canRedo: false
};
var Graph2DStampHost = forwardRef(
  function Graph2DStampHost2({ api, editingElement, onClose, isDark }, ref) {
    const panelRef = useRef(null);
    const [graphUIState, setGraphUIState] = useState(INITIAL_GRAPH_STATE);
    const { isMobile } = useIsMobile();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const initialState = useMemo(() => {
      if (!editingElement) return null;
      if (!isGraph2DCustomData(editingElement.customData)) return null;
      return parseSerializedGraph(editingElement.customData.jsonState);
    }, [editingElement]);
    const [graphSnapshot, setGraphSnapshot] = useState(
      initialState ?? EMPTY_GRAPH
    );
    const [errorsSnapshot, setErrorsSnapshot] = useState({});
    const handleInsert = useCallback(
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
          onRedo: () => panelRef.current?.redo(),
          canRedo: graphUIState.canRedo,
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
      /* @__PURE__ */ jsx(
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

export { Graph2DStampHost };
//# sourceMappingURL=host-NKGV6RF2.mjs.map
//# sourceMappingURL=host-NKGV6RF2.mjs.map