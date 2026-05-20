"use client";
'use strict';

var immer = require('immer');
var jsxRuntime = require('react/jsx-runtime');
var React7 = require('react');
var reactDom = require('react-dom');

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

var React7__namespace = /*#__PURE__*/_interopNamespace(React7);

var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
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

// src/core/scene/types.ts
function createEmptyState(domain) {
  return { ...EMPTY_STATE, meta: { domain, version: 1 } };
}
var EMPTY_STATE;
var init_types = __esm({
  "src/core/scene/types.ts"() {
    EMPTY_STATE = {
      objects: {},
      order: [],
      counter: 0,
      meta: { domain: "3d", version: 1 }
    };
  }
});

// src/core/scene/registry.ts
function getKind(type) {
  const def = registry.get(type);
  if (!def) throw new Error(`[scene] unknown kind: ${type}`);
  return def;
}
var registry;
var init_registry = __esm({
  "src/core/scene/registry.ts"() {
    registry = /* @__PURE__ */ new Map();
  }
});

// src/core/scene/reducer.ts
function collectDependents(state, rootId) {
  const dependents = /* @__PURE__ */ new Set([rootId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const obj of Object.values(state.objects)) {
      if (dependents.has(obj.id)) continue;
      let kindDef;
      try {
        kindDef = getKind(obj.kind);
      } catch {
        continue;
      }
      const refs = kindDef.dependsOn(obj.attrs);
      if (refs.some((r) => dependents.has(r))) {
        dependents.add(obj.id);
        grew = true;
      }
    }
  }
  return dependents;
}
function reduce(draft, action) {
  switch (action.type) {
    case "ADD": {
      const { obj } = action.payload;
      if (draft.objects[obj.id]) throw new Error(`[scene] id "${obj.id}" \u0111\xE3 t\u1ED3n t\u1EA1i`);
      const kindDef = getKind(obj.kind);
      kindDef.validate?.(obj.attrs);
      draft.objects[obj.id] = obj;
      draft.order.push(obj.id);
      draft.counter += 1;
      return;
    }
    case "UPDATE": {
      const { id, patch } = action.payload;
      const obj = draft.objects[id];
      if (!obj) return;
      Object.assign(obj, patch);
      return;
    }
    case "UPDATE_ATTRS": {
      const { id, patch } = action.payload;
      const obj = draft.objects[id];
      if (!obj) return;
      const kindDef = getKind(obj.kind);
      const nextAttrs = { ...obj.attrs, ...patch };
      kindDef.validate?.(nextAttrs);
      obj.attrs = nextAttrs;
      return;
    }
    case "DELETE": {
      const { id } = action.payload;
      if (!draft.objects[id]) return;
      const toDelete = collectDependents(draft, id);
      for (const delId of toDelete) {
        delete draft.objects[delId];
      }
      draft.order = draft.order.filter((x) => !toDelete.has(x));
      return;
    }
    case "RESET": {
      draft.objects = {};
      draft.order = [];
      draft.counter = 0;
      return;
    }
    case "LOAD": {
      const { state } = action.payload;
      draft.objects = { ...state.objects };
      draft.order = [...state.order];
      draft.counter = state.counter;
      draft.meta = { ...state.meta };
      return;
    }
    case "TRANSACTION": {
      for (const sub of action.payload.actions) {
        reduce(draft, sub);
      }
      return;
    }
  }
}
var init_reducer = __esm({
  "src/core/scene/reducer.ts"() {
    init_registry();
  }
});
function createStore(initial, options = {}) {
  const limit = options.historyLimit ?? HISTORY_DEFAULT;
  let state = initial;
  const past = [];
  const future = [];
  const listeners = /* @__PURE__ */ new Set();
  let dispatching = false;
  let suspendHistory = false;
  let transactionActions = null;
  function notify(prev, action) {
    listeners.forEach((l) => l(state, prev, action));
  }
  function pushHistory(prev) {
    if (suspendHistory) return;
    past.push(prev);
    if (past.length > limit) past.shift();
    future.length = 0;
  }
  function applyAction(action) {
    const prev = state;
    state = immer.produce(state, (draft) => {
      reduce(draft, action);
    });
    if (state !== prev) {
      pushHistory(prev);
      notify(prev, action);
    }
  }
  return {
    getState: () => state,
    dispatch(action) {
      if (dispatching) throw new Error("[scene] kh\xF4ng \u0111\u01B0\u1EE3c dispatch trong subscriber");
      if (transactionActions) {
        transactionActions.push(action);
        return;
      }
      dispatching = true;
      try {
        applyAction(action);
      } finally {
        dispatching = false;
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    undo() {
      const prev = past.pop();
      if (!prev) return;
      future.push(state);
      const old = state;
      state = prev;
      notify(old, UNDO_ACTION);
    },
    redo() {
      const next = future.pop();
      if (!next) return;
      past.push(state);
      if (past.length > limit) past.shift();
      const old = state;
      state = next;
      notify(old, REDO_ACTION);
    },
    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0,
    transaction(fn) {
      if (transactionActions) throw new Error("[scene] transaction l\u1ED3ng nhau kh\xF4ng h\u1ED7 tr\u1EE3");
      transactionActions = [];
      try {
        fn((a) => {
          transactionActions.push(a);
        });
      } finally {
        const actions = transactionActions;
        transactionActions = null;
        if (actions.length > 0) {
          applyAction({ type: "TRANSACTION", payload: { actions } });
        }
      }
    },
    withoutHistory(fn) {
      const prevSuspend = suspendHistory;
      suspendHistory = true;
      try {
        fn();
      } finally {
        suspendHistory = prevSuspend;
      }
    }
  };
}
var HISTORY_DEFAULT, UNDO_ACTION, REDO_ACTION;
var init_store = __esm({
  "src/core/scene/store.ts"() {
    init_reducer();
    HISTORY_DEFAULT = 100;
    UNDO_ACTION = { type: "TRANSACTION", payload: { actions: [] } };
    REDO_ACTION = { type: "TRANSACTION", payload: { actions: [] } };
  }
});

// src/core/scene/selectors.ts
function listObjects(state) {
  return state.order.map((id) => state.objects[id]).filter((o) => o !== void 0);
}
function byKind(state, kind) {
  return listObjects(state).filter((o) => o.kind === kind);
}
function nextLabel(state, kind) {
  const used = new Set(byKind(state, kind).map((o) => o.label));
  for (const c of ALPHABET) if (!used.has(c)) return c;
  let idx = 1;
  while (true) {
    for (const c of ALPHABET) {
      const candidate = `${c}${idx}`;
      if (!used.has(candidate)) return candidate;
    }
    idx += 1;
  }
}
var ALPHABET;
var init_selectors = __esm({
  "src/core/scene/selectors.ts"() {
    ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  }
});

// src/core/scene/migrations/state.ts
function listStateMigrations() {
  return stateMigrations;
}
var stateMigrations, CURRENT_STATE_VERSION;
var init_state = __esm({
  "src/core/scene/migrations/state.ts"() {
    stateMigrations = /* @__PURE__ */ new Map();
    CURRENT_STATE_VERSION = 1;
  }
});

// src/core/scene/migrations/runMigrations.ts
function migrateState(raw) {
  if (!raw || typeof raw !== "object") throw new Error("[scene] invalid state shape");
  let state = raw;
  const currentVersion = state.meta?.version ?? 1;
  const stateMigs = listStateMigrations();
  for (let v = currentVersion + 1; v <= Math.max(CURRENT_STATE_VERSION, ...stateMigs.keys()); v++) {
    const fn = stateMigs.get(v);
    if (fn) state = fn(state);
  }
  const migratedObjects = {};
  for (const [id, obj] of Object.entries(state.objects ?? {})) {
    const def = getKind(obj.kind);
    let cur = obj;
    while ((cur.schemaVersion ?? 0) < def.schemaVersion) {
      const next = (cur.schemaVersion ?? 0) + 1;
      const mig = def.migrate[next];
      if (!mig) throw new Error(`[scene] missing migration cho ${obj.kind} v${next}`);
      cur = mig(cur);
      cur.schemaVersion = next;
    }
    if ((cur.schemaVersion ?? 0) !== def.schemaVersion) {
      throw new Error(
        `[scene] missing migration cho ${obj.kind}: stored v${cur.schemaVersion ?? 0}, current v${def.schemaVersion}`
      );
    }
    migratedObjects[id] = cur;
  }
  return {
    objects: migratedObjects,
    order: state.order ?? [],
    counter: state.counter ?? 0,
    meta: state.meta ?? { domain: "3d", version: CURRENT_STATE_VERSION }
  };
}
var init_runMigrations = __esm({
  "src/core/scene/migrations/runMigrations.ts"() {
    init_registry();
    init_state();
  }
});

// src/core/scene/index.ts
var init_scene = __esm({
  "src/core/scene/index.ts"() {
    init_types();
    init_store();
    init_selectors();
    init_runMigrations();
  }
});

// src/stamps/geometry-2d/serialize.ts
function serializeBoard(bbox, state, options = {}) {
  return {
    version: 2,
    bbox,
    state,
    showAxis: !!options.showAxis,
    showGrid: !!options.showGrid
  };
}
function deserializeBoard(raw) {
  if (raw && typeof raw === "object" && raw.version === 2) {
    const r = raw;
    return {
      version: 2,
      bbox: r.bbox,
      state: migrateState(r.state),
      showAxis: !!r.showAxis,
      showGrid: !!r.showGrid
    };
  }
  console.warn("[2d/serialize] format kh\xF4ng nh\u1EADn di\u1EC7n ho\u1EB7c v1 c\u0169 \u2014 d\xF9ng state r\u1ED7ng");
  return {
    version: 2,
    bbox: [-5, 5, 5, -5],
    state: createEmptyState("2d"),
    showAxis: false,
    showGrid: false
  };
}
var init_serialize = __esm({
  "src/stamps/geometry-2d/serialize.ts"() {
    init_scene();
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
var themeStroke, themeAxis, themeGrid, themeLabel;
var init_theme = __esm({
  "src/stamps/geometry-2d/editor/theme.ts"() {
    themeStroke = (dark) => dark ? "#e2e8f0" : "#0f172a";
    themeAxis = (dark) => dark ? "#cbd5e1" : "#94a3b8";
    themeGrid = (dark) => dark ? "#475569" : "#e2e8f0";
    themeLabel = (dark) => dark ? "#e2e8f0" : "#000000";
  }
});

// src/stamps/shared/safeJsx.ts
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
var isDev;
var init_safeJsx = __esm({
  "src/stamps/shared/safeJsx.ts"() {
    isDev = (() => {
      try {
        return typeof process !== "undefined" && process.env?.NODE_ENV !== "production";
      } catch {
        return false;
      }
    })();
  }
});

// src/core/scene/render/types2d.ts
var DEFAULT_THEME_2D;
var init_types2d = __esm({
  "src/core/scene/render/types2d.ts"() {
    DEFAULT_THEME_2D = {
      stroke: "#0f172a",
      fill: "#60a5fa",
      label: "#0f172a",
      axis: "#94a3b8",
      grid: "#e2e8f0",
      pointFill: "#1e40af"
    };
  }
});

// src/core/scene/render/JxgRenderer.ts
var JxgRenderer;
var init_JxgRenderer = __esm({
  "src/core/scene/render/JxgRenderer.ts"() {
    init_registry();
    init_types2d();
    JxgRenderer = class {
      constructor(store, board, options = {}) {
        this.elements = /* @__PURE__ */ new Map();
        this.disposed = false;
        this.highlightedId = null;
        this.highlightOriginal = null;
        this.store = store;
        this.board = board;
        this.theme = options.theme ?? DEFAULT_THEME_2D;
        this.unsubscribe = store.subscribe((next, prev) => this.applyDiff(prev, next));
        this.applyDiff(void 0, store.getState());
      }
      ctx() {
        return {
          jxg: this.board,
          resolveRef: (id) => {
            const el = this.elements.get(id);
            if (!el) throw new Error(`[scene/2d] resolveRef: ch\u01B0a render id="${id}"`);
            return el;
          },
          defaults: { theme: this.theme }
        };
      }
      create(obj) {
        try {
          const def = getKind(obj.kind);
          const el = def.render(obj, this.ctx());
          this.elements.set(obj.id, el);
        } catch (err) {
          console.warn(`[scene/render/2d] kh\xF4ng render \u0111\u01B0\u1EE3c ${obj.kind} id="${obj.id}":`, err);
        }
      }
      remove(id) {
        const el = this.elements.get(id);
        if (!el) return;
        try {
          this.board.removeObject?.(el);
        } catch (err) {
          console.warn(`[scene/render/2d] kh\xF4ng remove \u0111\u01B0\u1EE3c id="${id}":`, err);
        }
        this.elements.delete(id);
      }
      applyDiff(prev, next) {
        if (this.disposed) return;
        const prevObjs = prev?.objects ?? {};
        const nextObjs = next.objects;
        for (const id of Object.keys(prevObjs)) {
          if (!(id in nextObjs)) this.remove(id);
        }
        for (const id of next.order) {
          const cur = nextObjs[id];
          const old = prevObjs[id];
          if (!old) {
            this.create(cur);
            continue;
          }
          if (Object.is(old, cur)) continue;
          const def = getKind(cur.kind);
          const existing = this.elements.get(id);
          if (def.update && existing) {
            try {
              def.update(cur, old, this.ctx(), existing);
              continue;
            } catch (err) {
              console.warn(`[scene/render/2d] update fail, recreate:`, err);
            }
          }
          this.remove(id);
          this.create(cur);
        }
      }
      dispose() {
        if (this.disposed) return;
        this.unsubscribe();
        for (const id of Array.from(this.elements.keys())) this.remove(id);
        this.disposed = true;
      }
      highlight(id) {
        if (this.disposed) return;
        if (this.highlightedId && this.highlightOriginal) {
          const prev = this.elements.get(this.highlightedId);
          try {
            prev?.setAttribute?.(this.highlightOriginal);
          } catch (err) {
            console.warn("[scene/render/2d] highlight restore fail:", err);
          }
        }
        this.highlightedId = null;
        this.highlightOriginal = null;
        if (!id) return;
        const el = this.elements.get(id);
        if (!el) return;
        try {
          const stroke = el.getAttribute?.("strokeColor") ?? "#1e40af";
          const thick = el.getAttribute?.("strokeWidth") ?? 2;
          this.highlightOriginal = { stroke, thick };
          el.setAttribute?.({ strokeColor: "#ef4444", strokeWidth: thick + 2 });
          this.highlightedId = id;
        } catch (err) {
          console.warn("[scene/render/2d] highlight apply fail:", err);
        }
      }
    };
  }
});

// src/stamps/geometry-2d/render.ts
function containerDimsForBbox(bbox) {
  const [xmin, ymax, xmax, ymin] = bbox;
  const w = Math.abs(xmax - xmin);
  const h = Math.abs(ymax - ymin);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return { width: FALLBACK_W, height: FALLBACK_H };
  }
  let width = w * PIXELS_PER_UNIT;
  let height = h * PIXELS_PER_UNIT;
  const maxAxis = Math.max(width, height);
  if (maxAxis > MAX_DIM) {
    const ratio = MAX_DIM / maxAxis;
    width *= ratio;
    height *= ratio;
  }
  const minAxis = Math.min(width, height);
  if (minAxis < MIN_DIM) {
    const ratio = MIN_DIM / minAxis;
    width *= ratio;
    height *= ratio;
  }
  return { width: Math.round(width), height: Math.round(height) };
}
async function renderGeometrySvgFromState(jsonState) {
  const parsed = deserializeBoard(JSON.parse(jsonState));
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
  const { width, height } = containerDimsForBbox(parsed.bbox);
  const container = document.createElement("div");
  const containerId = "jxg_offscreen_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
  container.id = containerId;
  container.style.cssText = `position:absolute;top:-99999px;left:-99999px;width:${width}px;height:${height}px;visibility:hidden;pointer-events:none;`;
  document.body.appendChild(container);
  let board = null;
  let renderer = null;
  try {
    board = JXG.JSXGraph.initBoard(containerId, {
      boundingbox: parsed.bbox,
      axis: !!parsed.showAxis,
      grid: !!parsed.showGrid,
      showCopyright: false,
      showNavigation: false,
      keepAspectRatio: true
    });
    const store = createStore(parsed.state);
    renderer = new JxgRenderer(store, board);
    board.update();
    return renderGeometryToSvg(container);
  } finally {
    try {
      renderer?.dispose();
    } catch {
    }
    safeJsx("render.freeBoard", () => {
      if (board) JXG.JSXGraph.freeBoard(board);
    });
    if (container.parentNode) container.parentNode.removeChild(container);
  }
}
var PIXELS_PER_UNIT, MIN_DIM, MAX_DIM, FALLBACK_W, FALLBACK_H;
var init_render = __esm({
  "src/stamps/geometry-2d/render.ts"() {
    init_renderInline();
    init_serialize();
    init_theme();
    init_safeJsx();
    init_scene();
    init_JxgRenderer();
    PIXELS_PER_UNIT = 20;
    MIN_DIM = 100;
    MAX_DIM = 1200;
    FALLBACK_W = 400;
    FALLBACK_H = 300;
  }
});

// src/stamps/geometry-2d/types.ts
function isGeometryCustomData(data) {
  if (!data || typeof data !== "object") return false;
  const d = data;
  return d.kind === "geometry" && d.version === 1 && typeof d.jsonState === "string";
}
var init_types2 = __esm({
  "src/stamps/geometry-2d/types.ts"() {
  }
});
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
var init_handlers = __esm({
  "src/stamps/geometry-2d/editor/handlers.ts"() {
    init_tools();
    init_safeJsx();
  }
});

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
var init_hitTest = __esm({
  "src/stamps/geometry-2d/editor/hitTest.ts"() {
    init_scene();
  }
});
function useSceneStore(initialState) {
  const store = React7.useMemo(() => createStore(initialState), []);
  const state = React7.useSyncExternalStore(
    (cb) => store.subscribe(() => cb()),
    () => store.getState(),
    () => store.getState()
  );
  const canUndo = store.canUndo();
  const canRedo = store.canRedo();
  return { store, state, canUndo, canRedo };
}
var init_useSceneStore = __esm({
  "src/stamps/geometry-2d/editor/useSceneStore.ts"() {
    init_scene();
  }
});
function useToolStateMachine(initial = "move") {
  const [tool, setToolState] = React7.useState(initial);
  const [pendingIds, setPendingIds] = React7.useState([]);
  const toolRef = React7.useRef(initial);
  const pendingIdsRef = React7.useRef([]);
  const setTool = React7.useCallback((t) => {
    toolRef.current = t;
    pendingIdsRef.current = [];
    setToolState(t);
    setPendingIds([]);
  }, []);
  const pushPending = React7.useCallback((id) => {
    pendingIdsRef.current = [...pendingIdsRef.current, id];
    setPendingIds(pendingIdsRef.current);
  }, []);
  const clearPending = React7.useCallback(() => {
    pendingIdsRef.current = [];
    setPendingIds([]);
  }, []);
  return { tool, pendingIds, toolRef, pendingIdsRef, setTool, pushPending, clearPending };
}
var init_useToolStateMachine = __esm({
  "src/stamps/geometry-2d/editor/useToolStateMachine.ts"() {
  }
});
var JSXGraphMiniBoard;
var init_MiniBoard = __esm({
  "src/stamps/geometry-2d/editor/MiniBoard.tsx"() {
    "use client";
    init_scene();
    init_JxgRenderer();
    init_handlers();
    init_hitTest();
    init_theme();
    init_tools();
    init_useSceneStore();
    init_useToolStateMachine();
    init_safeJsx();
    JSXGraphMiniBoard = ({ onReady, initialState, isDark }) => {
      const isDarkRef = React7.useRef(!!isDark);
      isDarkRef.current = !!isDark;
      const containerId = React7.useId().replace(/:/g, "_") + "_jxgmini";
      const containerRef = React7.useRef(null);
      const boardRef = React7.useRef(null);
      const jxgRef = React7.useRef(null);
      const rendererRef = React7.useRef(null);
      const axisObjsRef = React7.useRef({});
      const initState = React7.useMemo(
        () => initialState?.state ?? createEmptyState("2d"),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
      );
      const { store } = useSceneStore(initState);
      const toolSM = useToolStateMachine("move");
      const [showAxis, setShowAxisState] = React7.useState(initialState?.showAxis ?? false);
      const [showGrid, setShowGridState] = React7.useState(initialState?.showGrid ?? false);
      const showAxisRef = React7.useRef(showAxis);
      showAxisRef.current = showAxis;
      const showGridRef = React7.useRef(showGrid);
      showGridRef.current = showGrid;
      const selectedSetRef = React7.useRef(/* @__PURE__ */ new Set());
      const [, setSelectionTick] = React7.useState(0);
      const pendingRef = React7.useRef([]);
      const previewSegRef = React7.useRef([]);
      const phantomRef = React7.useRef(null);
      const previewShapeRef = React7.useRef(null);
      const previewRafRef = React7.useRef(null);
      const marqueeRef = React7.useRef(null);
      const moveDownRef = React7.useRef(null);
      const lastMoveClickRef = React7.useRef({ id: null, time: 0 });
      const pendingTransformRef = React7.useRef(null);
      const subscribersRef = React7.useRef(/* @__PURE__ */ new Set());
      const selectSubsRef = React7.useRef(/* @__PURE__ */ new Set());
      const transformSubsRef = React7.useRef(/* @__PURE__ */ new Set());
      const notifySubscribers = React7.useCallback(() => {
        subscribersRef.current.forEach((cb) => safeJsx("MiniBoard.notifySubscriber.cb", () => cb()));
      }, []);
      React7.useEffect(() => store.subscribe(() => notifySubscribers()), [store, notifySubscribers]);
      React7.useEffect(() => {
        notifySubscribers();
      }, [showAxis, showGrid, toolSM.tool, notifySubscribers]);
      const jxgIdToSceneRef = React7.useRef(/* @__PURE__ */ new Map());
      React7.useEffect(() => {
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
      const jxgFromSceneId = React7.useCallback((id) => {
        const r = rendererRef.current;
        if (!r) return null;
        return r.elements?.get(id) ?? null;
      }, []);
      const jxgIdToSceneId = React7.useCallback((jxgObj) => {
        if (!jxgObj?.id) return null;
        return jxgIdToSceneRef.current.get(String(jxgObj.id)) ?? null;
      }, []);
      const screenCoordsOf = React7.useCallback((evt) => {
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
      const objectsAt = React7.useCallback((evt) => {
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
      const findNearestPointJxg = React7.useCallback((evt, tolPx = 12) => {
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
      const promoteLabel = React7.useCallback((o) => {
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
      const toggleSelect = React7.useCallback((id, additive) => {
        if (!additive) {
          selectedSetRef.current.clear();
          selectedSetRef.current.add(id);
        } else if (selectedSetRef.current.has(id)) selectedSetRef.current.delete(id);
        else selectedSetRef.current.add(id);
        setSelectionTick((t) => t + 1);
      }, []);
      const clearSelection = React7.useCallback(() => {
        selectedSetRef.current.clear();
        setSelectionTick((t) => t + 1);
      }, []);
      const deleteSelection = React7.useCallback(() => {
        if (selectedSetRef.current.size === 0) return;
        store.transaction((dispatch) => {
          for (const id of selectedSetRef.current) dispatch({ type: "DELETE", payload: { id } });
        });
        selectedSetRef.current.clear();
        setSelectionTick((t) => t + 1);
      }, [store]);
      const clearPreviewSegs = React7.useCallback(() => {
        const b = boardRef.current;
        if (!b) return;
        for (const s of previewSegRef.current) {
          safeJsx("MiniBoard.removeObject(previewSeg)", () => b.removeObject(s));
        }
        previewSegRef.current = [];
      }, []);
      const removePhantom = React7.useCallback(() => {
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
      const clearPending = React7.useCallback(() => {
        removePhantom();
        clearPreviewSegs();
        pendingRef.current = [];
        toolSM.clearPending();
      }, [clearPreviewSegs, removePhantom, toolSM]);
      const refreshPreview = React7.useCallback(() => {
      }, []);
      const [, setWarn] = React7.useState(null);
      const warnTimerRef = React7.useRef(null);
      const flashWarn = React7.useCallback((msg) => {
        if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
        setWarn(msg);
        warnTimerRef.current = setTimeout(() => setWarn(null), 1800);
      }, []);
      React7.useEffect(() => () => {
        if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
      }, []);
      const nextLabelFor = React7.useCallback(
        (kind) => nextLabel(store.getState(), kind),
        [store]
      );
      const buildSnapshot = React7.useCallback(
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
      const emitSelect = React7.useCallback((info) => {
        const snap = buildSnapshot(info.id, info.anchorScreen);
        if (!snap) return;
        selectSubsRef.current.forEach((cb) => safeJsx("MiniBoard.emitSelect.cb", () => cb(snap)));
      }, [buildSnapshot]);
      const emitTransform = React7.useCallback((info) => {
        transformSubsRef.current.forEach((cb) => safeJsx("MiniBoard.emitTransform.cb", () => cb(info)));
      }, []);
      const ctxRef = React7.useRef(null);
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
      React7.useEffect(() => {
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
      React7.useEffect(() => {
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
      React7.useEffect(() => {
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
      const handleToolChange = React7.useCallback((t) => {
        clearPending();
        toolSM.setTool(t);
        const b = boardRef.current;
        if (b) safeJsx("MiniBoard.setPanForTool", () => {
          if (b.attr?.pan) b.attr.pan.enabled = t !== "select";
        });
      }, [clearPending, toolSM]);
      React7.useEffect(() => {
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
                "data-testid": a.testId,
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
  return /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [
    /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M3 10 L8 5 L8 8 L15 8 A5 5 0 0 1 20 13 L20 16" }),
    /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M3 10 L8 15 L8 12" })
  ] });
}
function RedoIcon() {
  return /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [
    /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M21 10 L16 5 L16 8 L9 8 A5 5 0 0 0 4 13 L4 16" }),
    /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M21 10 L16 15 L16 12" })
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
  const [hover, setHover] = React7.useState(null);
  const [portalReady, setPortalReady] = React7.useState(false);
  const hoverTimerRef = React7.useRef(null);
  React7.useEffect(() => {
    setPortalReady(true);
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);
  const showHover = React7.useCallback((el, t) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      const r = el.getBoundingClientRect();
      setHover({ label: t.label, hint: t.hint, x: r.right, y: r.top + r.height / 2 });
    }, TOOLTIP_DELAY_MS);
  }, []);
  const hideHover = React7.useCallback(() => {
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
  const grouped = React7.useMemo(() => {
    return TOOLS.reduce((acc, t) => {
      var _a;
      (acc[_a = t.group] ?? (acc[_a] = [])).push(t);
      return acc;
    }, {});
  }, []);
  const groupKeys = React7.useMemo(
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
            "data-testid": "undo-btn",
            className: "ml-auto inline-flex items-center justify-center rounded p-1 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent",
            children: /* @__PURE__ */ jsxRuntime.jsx(UndoIcon, {})
          }
        ),
        /* @__PURE__ */ jsxRuntime.jsx(
          "button",
          {
            type: "button",
            onClick: onRedo,
            disabled: !canRedo,
            title: "L\xE0m l\u1EA1i (Ctrl/Cmd+Shift+Z)",
            "aria-label": "L\xE0m l\u1EA1i",
            "data-testid": "redo-btn",
            className: "inline-flex items-center justify-center rounded p-1 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent",
            children: /* @__PURE__ */ jsxRuntime.jsx(RedoIcon, {})
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
    onRedo,
    canRedo,
    isDark,
    drawerOpen,
    onDrawerClose
  } = props;
  const groups = React7.useMemo(() => {
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
        },
        {
          label: "L\xE0m l\u1EA1i",
          title: "L\xE0m l\u1EA1i (Ctrl/Cmd+Shift+Z)",
          icon: /* @__PURE__ */ jsxRuntime.jsx(RedoIcon, {}),
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
  const [state, setState] = React7.useState(() => ({
    isMobile: readMatch(MOBILE_QUERY),
    isTouchOnly: readMatch(NO_HOVER_QUERY)
  }));
  React7.useEffect(() => {
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
      const rootRef = React7.useRef(null);
      const [section, setSection] = React7.useState(null);
      const { isMobile } = useIsMobile();
      const [clamped, setClamped] = React7.useState(null);
      React7.useLayoutEffect(() => {
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
      const [name, setName] = React7.useState(initialName);
      React7.useEffect(() => {
        setName(initialName);
      }, [initialName]);
      React7.useEffect(() => {
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
      const colorIndicatorTint = React7.useMemo(() => currentColor, [currentColor]);
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
      const [value, setValue] = React7.useState(defaultValue);
      const inputRef = React7.useRef(null);
      const meta = LABELS[kind];
      React7.useEffect(() => {
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

// src/core/scene/ui/kindMeta.ts
function getKindUiMeta(kind) {
  return KIND_UI_META[kind] ?? { displayName: kind, icon: "?" };
}
var KIND_UI_META;
var init_kindMeta = __esm({
  "src/core/scene/ui/kindMeta.ts"() {
    KIND_UI_META = {
      // 2D
      point: { displayName: "\u0110i\u1EC3m", icon: "\xB7" },
      segment: { displayName: "\u0110o\u1EA1n th\u1EB3ng", icon: "\u2014" },
      line: { displayName: "\u0110\u01B0\u1EDDng th\u1EB3ng", icon: "/" },
      ray: { displayName: "Tia", icon: "\u2192" },
      vector: { displayName: "Vector", icon: "\u2197" },
      circle: { displayName: "\u0110\u01B0\u1EDDng tr\xF2n", icon: "\u25CB" },
      polygon: { displayName: "\u0110a gi\xE1c", icon: "\u25C7" },
      intersection: { displayName: "Giao \u0111i\u1EC3m", icon: "\u2715" },
      // 3D
      point3d: { displayName: "\u0110i\u1EC3m", icon: "\xB7" },
      segment3d: { displayName: "\u0110o\u1EA1n th\u1EB3ng", icon: "\u2014" },
      line3d: { displayName: "\u0110\u01B0\u1EDDng th\u1EB3ng", icon: "/" },
      ray3d: { displayName: "Tia", icon: "\u2192" },
      vector3d: { displayName: "Vector", icon: "\u2197" },
      plane3d: { displayName: "M\u1EB7t ph\u1EB3ng", icon: "\u25B1" },
      polygon3d: { displayName: "\u0110a gi\xE1c", icon: "\u25C7" },
      sphere3d: { displayName: "M\u1EB7t c\u1EA7u", icon: "\u25EF" },
      polyhedron3d: { displayName: "\u0110a di\u1EC7n", icon: "\u2B22" },
      cylinder3d: { displayName: "H\xECnh tr\u1EE5", icon: "\u232D" },
      cone3d: { displayName: "H\xECnh n\xF3n", icon: "\u25B2" }
    };
  }
});
function ObjectRowMenu(props) {
  const { onRename, onChangeColor, onDelete } = props;
  const [open, setOpen] = React7__namespace.useState(false);
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "relative inline-block", children: [
    /* @__PURE__ */ jsxRuntime.jsx(
      "button",
      {
        type: "button",
        "aria-label": "Row menu",
        onClick: (e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        },
        className: "rounded px-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800",
        children: "\u22EE"
      }
    ),
    open ? /* @__PURE__ */ jsxRuntime.jsxs(
      "div",
      {
        role: "menu",
        className: "absolute right-0 z-10 mt-1 w-40 rounded-md border border-zinc-200 bg-white py-1 text-xs shadow-lg dark:border-zinc-700 dark:bg-zinc-900",
        onClick: (e) => e.stopPropagation(),
        children: [
          /* @__PURE__ */ jsxRuntime.jsx(MenuItem, { onClick: () => {
            setOpen(false);
            onRename();
          }, children: "\u0110\u1ED5i t\xEAn" }),
          /* @__PURE__ */ jsxRuntime.jsx(MenuItem, { onClick: () => {
            setOpen(false);
            onChangeColor();
          }, children: "\u0110\u1ED5i m\xE0u" }),
          /* @__PURE__ */ jsxRuntime.jsx(MenuItem, { onClick: () => {
            setOpen(false);
            onDelete();
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
var init_ObjectRowMenu = __esm({
  "src/core/scene/ui/ObjectRowMenu.tsx"() {
    "use client";
  }
});
function ObjectRow(props) {
  const { obj, selected, onSelect, onToggleVisible, onToggleLocked, onRename, onChangeColor, onDelete } = props;
  const meta = getKindUiMeta(obj.kind);
  let summary = "";
  try {
    summary = getKind(obj.kind).describe(obj);
  } catch {
    summary = obj.label;
  }
  return /* @__PURE__ */ jsxRuntime.jsxs(
    "li",
    {
      "data-testid": `object-row-${obj.id}`,
      "aria-selected": selected,
      onClick: () => onSelect(obj.id),
      className: "flex items-center gap-2 border-b border-zinc-100 px-3 py-1.5 text-xs cursor-pointer dark:border-zinc-800 " + (selected ? "bg-blue-50 dark:bg-blue-950" : "hover:bg-zinc-50 dark:hover:bg-zinc-900"),
      children: [
        /* @__PURE__ */ jsxRuntime.jsx("span", { "aria-hidden": true, className: "inline-block w-4 text-center text-base leading-none", children: meta.icon }),
        /* @__PURE__ */ jsxRuntime.jsx("span", { className: "min-w-[3ch] font-semibold", children: obj.label }),
        /* @__PURE__ */ jsxRuntime.jsx("span", { className: "flex-1 truncate text-zinc-500", children: summary }),
        /* @__PURE__ */ jsxRuntime.jsx(
          "button",
          {
            type: "button",
            "aria-label": "Toggle visibility",
            "aria-pressed": !obj.visible,
            onClick: (e) => {
              e.stopPropagation();
              onToggleVisible(obj.id);
            },
            className: "rounded px-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800",
            children: obj.visible ? "\u{1F441}" : "\u{1F6AB}"
          }
        ),
        /* @__PURE__ */ jsxRuntime.jsx(
          "button",
          {
            type: "button",
            "aria-label": "Toggle lock",
            "aria-pressed": obj.locked,
            onClick: (e) => {
              e.stopPropagation();
              onToggleLocked(obj.id);
            },
            className: "rounded px-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800",
            children: obj.locked ? "\u{1F512}" : "\u{1F513}"
          }
        ),
        /* @__PURE__ */ jsxRuntime.jsx(
          ObjectRowMenu,
          {
            onRename: () => onRename(obj.id),
            onChangeColor: () => onChangeColor(obj.id),
            onDelete: () => onDelete(obj.id)
          }
        )
      ]
    }
  );
}
var init_ObjectRow = __esm({
  "src/core/scene/ui/ObjectRow.tsx"() {
    "use client";
    init_registry();
    init_kindMeta();
    init_ObjectRowMenu();
  }
});
function ObjectListPanel(props) {
  const { store, selectedId, onSelect } = props;
  const subscribe = React7__namespace.useCallback(
    (cb) => store.subscribe(() => cb()),
    [store]
  );
  const state = React7__namespace.useSyncExternalStore(subscribe, store.getState, store.getState);
  const objects = listObjects(state);
  function handleSelect(id) {
    onSelect?.(id);
  }
  function handleToggleVisible(id) {
    const obj = state.objects[id];
    if (!obj) return;
    store.dispatch({ type: "UPDATE", payload: { id, patch: { visible: !obj.visible } } });
  }
  function handleToggleLocked(id) {
    const obj = state.objects[id];
    if (!obj) return;
    store.dispatch({ type: "UPDATE", payload: { id, patch: { locked: !obj.locked } } });
  }
  function handleDelete(id) {
    store.dispatch({ type: "DELETE", payload: { id } });
  }
  function noop() {
  }
  return /* @__PURE__ */ jsxRuntime.jsx(
    "ul",
    {
      "data-testid": "object-list-panel",
      className: "flex max-h-[calc(100vh-200px)] flex-col overflow-y-auto",
      children: objects.length === 0 ? /* @__PURE__ */ jsxRuntime.jsx("li", { className: "px-3 py-4 text-center text-xs text-zinc-500", children: "Ch\u01B0a c\xF3 \u0111\u1ED1i t\u01B0\u1EE3ng n\xE0o" }) : objects.map((obj) => /* @__PURE__ */ jsxRuntime.jsx(
        ObjectRow,
        {
          obj,
          state,
          selected: obj.id === selectedId,
          onSelect: handleSelect,
          onToggleVisible: handleToggleVisible,
          onToggleLocked: handleToggleLocked,
          onRename: noop,
          onChangeColor: noop,
          onDelete: handleDelete
        },
        obj.id
      ))
    }
  );
}
var init_ObjectListPanel = __esm({
  "src/core/scene/ui/ObjectListPanel.tsx"() {
    "use client";
    init_selectors();
    init_ObjectRow();
  }
});
function useActionRecorder(store) {
  const [history, setHistory] = React7__namespace.useState([]);
  const isRecordingRef = React7__namespace.useRef(true);
  const isReplayingRef = React7__namespace.useRef(false);
  const [isRecording, setIsRecording] = React7__namespace.useState(true);
  const [isReplaying, setIsReplaying] = React7__namespace.useState(false);
  React7__namespace.useEffect(() => {
    const unsub = store.subscribe((_next, _prev, action) => {
      if (!isRecordingRef.current) return;
      if (isReplayingRef.current) return;
      setHistory((h) => [...h, { action, at: Date.now() }]);
    });
    return unsub;
  }, [store]);
  const record = React7__namespace.useCallback(() => {
    isRecordingRef.current = true;
    setIsRecording(true);
  }, []);
  const stop = React7__namespace.useCallback(() => {
    isRecordingRef.current = false;
    setIsRecording(false);
  }, []);
  const clear = React7__namespace.useCallback(() => {
    setHistory([]);
  }, []);
  const replay = React7__namespace.useCallback(async (delayMs = 0) => {
    if (history.length === 0) return;
    isReplayingRef.current = true;
    setIsReplaying(true);
    try {
      store.dispatch({ type: "RESET" });
      for (const { action } of history) {
        if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
        store.dispatch(action);
      }
    } finally {
      isReplayingRef.current = false;
      setIsReplaying(false);
    }
  }, [history, store]);
  return { history, isRecording, isReplaying, record, stop, clear, replay };
}
var init_useActionRecorder = __esm({
  "src/core/scene/ui/useActionRecorder.ts"() {
    "use client";
  }
});
function RecorderPanel(props) {
  const { recorder, defaultOpen = false } = props;
  const [open, setOpen] = React7__namespace.useState(defaultOpen);
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "fixed bottom-3 right-3 z-50 rounded-md border border-zinc-300 bg-white shadow-lg text-xs dark:border-zinc-700 dark:bg-zinc-900", children: [
    /* @__PURE__ */ jsxRuntime.jsxs(
      "button",
      {
        type: "button",
        "aria-label": "Toggle recorder",
        onClick: () => setOpen((v) => !v),
        className: "flex items-center gap-2 px-3 py-1.5 font-semibold",
        children: [
          /* @__PURE__ */ jsxRuntime.jsx("span", { children: "\u{1F3AC} Recorder" }),
          /* @__PURE__ */ jsxRuntime.jsx(
            "span",
            {
              "data-testid": "recorder-count",
              className: "rounded bg-zinc-100 px-1.5 py-0.5 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
              children: recorder.history.length
            }
          )
        ]
      }
    ),
    open ? /* @__PURE__ */ jsxRuntime.jsxs("div", { "data-testid": "recorder-body", className: "border-t border-zinc-200 px-3 py-2 dark:border-zinc-800", children: [
      /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "mb-2 flex gap-1", children: [
        recorder.isRecording ? /* @__PURE__ */ jsxRuntime.jsx(
          "button",
          {
            type: "button",
            "aria-label": "Stop recording",
            onClick: recorder.stop,
            className: "rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700",
            children: "\u23F8 Stop"
          }
        ) : /* @__PURE__ */ jsxRuntime.jsx(
          "button",
          {
            type: "button",
            "aria-label": "Start recording",
            onClick: recorder.record,
            className: "rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700",
            children: "\u23FA Record"
          }
        ),
        /* @__PURE__ */ jsxRuntime.jsx(
          "button",
          {
            type: "button",
            "aria-label": "Replay",
            disabled: recorder.isReplaying || recorder.history.length === 0,
            onClick: () => {
              void recorder.replay(100);
            },
            className: "rounded border border-zinc-300 px-2 py-1 disabled:opacity-50 dark:border-zinc-700",
            children: "\u25B6 Replay"
          }
        ),
        /* @__PURE__ */ jsxRuntime.jsx(
          "button",
          {
            type: "button",
            "aria-label": "Clear history",
            onClick: recorder.clear,
            className: "rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700",
            children: "\u{1F5D1}"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntime.jsx("ul", { className: "max-h-40 overflow-y-auto font-mono text-[10px]", children: recorder.history.map((r, i) => /* @__PURE__ */ jsxRuntime.jsxs("li", { className: "border-b border-zinc-100 py-0.5 dark:border-zinc-800", children: [
        r.action.type,
        "payload" in r.action && r.action.payload?.id ? ` #${r.action.payload.id}` : ""
      ] }, i)) })
    ] }) : null
  ] });
}
var init_RecorderPanel = __esm({
  "src/core/scene/ui/RecorderPanel.tsx"() {
    "use client";
  }
});
function RecorderPanelDev(props) {
  const { force, ...rest } = props;
  const isDev2 = force || process.env.NODE_ENV === "development";
  if (!isDev2) return null;
  return /* @__PURE__ */ jsxRuntime.jsx(RecorderPanel, { ...rest });
}
var init_RecorderPanelDev = __esm({
  "src/core/scene/ui/RecorderPanelDev.tsx"() {
    "use client";
    init_RecorderPanel();
  }
});
function RecorderPanelWithStore({ store }) {
  const recorder = useActionRecorder(store);
  return /* @__PURE__ */ jsxRuntime.jsx(RecorderPanelDev, { recorder });
}
var GeometryEditorPanel;
var init_EditorPanel = __esm({
  "src/stamps/geometry-2d/editor/EditorPanel.tsx"() {
    "use client";
    init_MiniBoard();
    init_serialize();
    init_render();
    init_PropertiesPopover();
    init_TransformParamPopover();
    init_LeftPanel();
    init_ObjectListPanel();
    init_useActionRecorder();
    init_RecorderPanelDev();
    GeometryEditorPanel = React7.forwardRef(
      function GeometryEditorPanel2({ initialState, onInsert, onClose, withLeftPanel = false, onStateChange, isDark, isMobile = false, onOpenDrawer, onUndo, onRedo, canUndo, canRedo }, ref) {
        const handleRef = React7.useRef(null);
        const [ready, setReady] = React7.useState(false);
        const [hasContent, setHasContent] = React7.useState(false);
        const [selectedId, setSelectedId] = React7.useState(void 0);
        const sceneStoreRef = React7.useRef(null);
        const [propsPopover, setPropsPopover] = React7.useState(null);
        const [transformPopover, setTransformPopover] = React7.useState(null);
        const onStateChangeRef = React7.useRef(onStateChange);
        React7.useEffect(() => {
          onStateChangeRef.current = onStateChange;
        }, [onStateChange]);
        const emitState = React7.useCallback(() => {
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
        const handleReady = React7.useCallback((h) => {
          handleRef.current = h;
          sceneStoreRef.current = h.getStore();
          setReady(true);
          emitState();
          h.subscribe(emitState);
          h.onSelect((snap) => setPropsPopover(snap));
          h.onTransformParam((info) => setTransformPopover(info));
        }, [emitState]);
        const performInsert = React7.useCallback(() => {
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
        const handleInsert = React7.useCallback(() => {
          performInsert();
        }, [performInsert]);
        React7.useImperativeHandle(ref, () => ({
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
                isMobile && /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
                  /* @__PURE__ */ jsxRuntime.jsx(
                    "button",
                    {
                      type: "button",
                      onClick: onUndo,
                      disabled: !canUndo,
                      "aria-label": "Ho\xE0n t\xE1c",
                      title: "Ho\xE0n t\xE1c (Ctrl/Cmd+Z)",
                      "data-testid": "undo-btn-mobile",
                      className: "inline-flex h-9 w-9 items-center justify-center rounded transition hover:bg-white/15 disabled:opacity-40",
                      children: /* @__PURE__ */ jsxRuntime.jsx(UndoIcon, {})
                    }
                  ),
                  /* @__PURE__ */ jsxRuntime.jsx(
                    "button",
                    {
                      type: "button",
                      onClick: onRedo,
                      disabled: !canRedo,
                      "aria-label": "L\xE0m l\u1EA1i",
                      title: "L\xE0m l\u1EA1i (Ctrl/Cmd+Shift+Z)",
                      "data-testid": "redo-btn-mobile",
                      className: "inline-flex h-9 w-9 items-center justify-center rounded transition hover:bg-white/15 disabled:opacity-40",
                      children: /* @__PURE__ */ jsxRuntime.jsx(RedoIcon, {})
                    }
                  ),
                  /* @__PURE__ */ jsxRuntime.jsx(
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
                /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: onClose, "aria-label": "\u0110\xF3ng", className: "inline-flex h-9 w-9 items-center justify-center rounded transition hover:bg-white/15", children: /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
                  /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" }),
                  /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" })
                ] }) })
              ] }),
              /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "flex min-h-0 flex-1", style: isMobile ? void 0 : { height: "420px" }, children: [
                /* @__PURE__ */ jsxRuntime.jsx("div", { className: "flex-1", children: /* @__PURE__ */ jsxRuntime.jsx(
                  JSXGraphMiniBoard,
                  {
                    onReady: handleReady,
                    initialState,
                    isDark
                  }
                ) }),
                sceneStoreRef.current && /* @__PURE__ */ jsxRuntime.jsx("div", { className: "w-56 border-l border-zinc-200 dark:border-zinc-800 overflow-y-auto", children: /* @__PURE__ */ jsxRuntime.jsx(
                  ObjectListPanel,
                  {
                    store: sceneStoreRef.current,
                    selectedId,
                    onSelect: handleSelectObject
                  }
                ) })
              ] }),
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
                    handleRef.current?.mutateObject(propsPopover.id, patch);
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
              transformPopover && (transformPopover.tool === "rotate" || transformPopover.tool === "dilate" || transformPopover.tool === "regularPolygon") && /* @__PURE__ */ jsxRuntime.jsx(
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
                      disabled: !ready || !hasContent,
                      title: !hasContent ? "V\u1EBD \xEDt nh\u1EA5t m\u1ED9t \u0111\u1ED1i t\u01B0\u1EE3ng tr\u01B0\u1EDBc khi ch\xE8n" : void 0,
                      "data-testid": "geometry-insert-btn",
                      className: "rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50",
                      children: "Ch\xE8n"
                    }
                  )
                ] })
              ] }),
              sceneStoreRef.current && /* @__PURE__ */ jsxRuntime.jsx(RecorderPanelWithStore, { store: sceneStoreRef.current })
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
  const [chordGroup, setChordGroup] = React7.useState(null);
  const groupOrderRef = React7.useRef(groupOrder);
  const toolsRef = React7.useRef(tools);
  const onSelectRef = React7.useRef(onSelect);
  const chordGroupRef = React7.useRef(null);
  groupOrderRef.current = groupOrder;
  toolsRef.current = tools;
  onSelectRef.current = onSelect;
  const cancel = React7.useCallback(() => {
    chordGroupRef.current = null;
    setChordGroup(null);
  }, []);
  React7.useEffect(() => {
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
    init_types2();
    init_useIsMobile();
    INITIAL_GEOM_STATE = {
      tool: "move",
      showAxis: false,
      showGrid: false,
      canUndo: false,
      canRedo: false
    };
    GeometryStampHost = React7.forwardRef(
      function GeometryStampHost2({ api, editingElement, onClose, isDark }, ref) {
        const panelRef = React7.useRef(null);
        const [geomState, setGeomState] = React7.useState(INITIAL_GEOM_STATE);
        const { isMobile } = useIsMobile();
        const [drawerOpen, setDrawerOpen] = React7.useState(false);
        const { chordGroup } = useChordShortcut({
          groupOrder: GROUP_ORDER,
          tools: TOOLS,
          onSelect: (key) => panelRef.current?.setTool(key),
          enabled: !isMobile
        });
        const initialState = React7.useMemo(() => {
          if (!editingElement) return null;
          if (!isGeometryCustomData(editingElement.customData)) return null;
          try {
            return JSON.parse(editingElement.customData.jsonState);
          } catch {
            console.warn("GeometryStampHost: customData jsonState corrupted");
            return null;
          }
        }, [editingElement]);
        const handleInsert = React7.useCallback(
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
        React7.useImperativeHandle(
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
  }
});

// src/stamps/geometry-2d/index.tsx
init_render();
init_types2();
var GeometryStampHost3 = React7.lazy(
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

exports.geometryStamp = geometryStamp;
exports.isGeometryCustomData = isGeometryCustomData;
//# sourceMappingURL=geometry-2d.js.map
//# sourceMappingURL=geometry-2d.js.map