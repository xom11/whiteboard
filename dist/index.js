"use client";
require('./index.css');
'use strict';

var immer = require('immer');
var jsxRuntime = require('react/jsx-runtime');
var React8 = require('react');
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

var React8__namespace = /*#__PURE__*/_interopNamespace(React8);

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
      for (const sub3 of action.payload.actions) {
        reduce(draft, sub3);
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
  const store = React8.useMemo(() => createStore(initialState), []);
  const state = React8.useSyncExternalStore(
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
  const [tool, setToolState] = React8.useState(initial);
  const [pendingIds, setPendingIds] = React8.useState([]);
  const toolRef = React8.useRef(initial);
  const pendingIdsRef = React8.useRef([]);
  const setTool = React8.useCallback((t) => {
    toolRef.current = t;
    pendingIdsRef.current = [];
    setToolState(t);
    setPendingIds([]);
  }, []);
  const pushPending = React8.useCallback((id) => {
    pendingIdsRef.current = [...pendingIdsRef.current, id];
    setPendingIds(pendingIdsRef.current);
  }, []);
  const clearPending = React8.useCallback(() => {
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
      const isDarkRef = React8.useRef(!!isDark);
      isDarkRef.current = !!isDark;
      const containerId = React8.useId().replace(/:/g, "_") + "_jxgmini";
      const containerRef = React8.useRef(null);
      const boardRef = React8.useRef(null);
      const jxgRef = React8.useRef(null);
      const rendererRef = React8.useRef(null);
      const axisObjsRef = React8.useRef({});
      const initState = React8.useMemo(
        () => initialState?.state ?? createEmptyState("2d"),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
      );
      const { store } = useSceneStore(initState);
      const toolSM = useToolStateMachine("move");
      const [showAxis, setShowAxisState] = React8.useState(initialState?.showAxis ?? false);
      const [showGrid, setShowGridState] = React8.useState(initialState?.showGrid ?? false);
      const showAxisRef = React8.useRef(showAxis);
      showAxisRef.current = showAxis;
      const showGridRef = React8.useRef(showGrid);
      showGridRef.current = showGrid;
      const selectedSetRef = React8.useRef(/* @__PURE__ */ new Set());
      const [, setSelectionTick] = React8.useState(0);
      const pendingRef = React8.useRef([]);
      const previewSegRef = React8.useRef([]);
      const phantomRef = React8.useRef(null);
      const previewShapeRef = React8.useRef(null);
      const previewRafRef = React8.useRef(null);
      const marqueeRef = React8.useRef(null);
      const moveDownRef = React8.useRef(null);
      const lastMoveClickRef = React8.useRef({ id: null, time: 0 });
      const pendingTransformRef = React8.useRef(null);
      const subscribersRef = React8.useRef(/* @__PURE__ */ new Set());
      const selectSubsRef = React8.useRef(/* @__PURE__ */ new Set());
      const transformSubsRef = React8.useRef(/* @__PURE__ */ new Set());
      const notifySubscribers = React8.useCallback(() => {
        subscribersRef.current.forEach((cb) => safeJsx("MiniBoard.notifySubscriber.cb", () => cb()));
      }, []);
      React8.useEffect(() => store.subscribe(() => notifySubscribers()), [store, notifySubscribers]);
      React8.useEffect(() => {
        notifySubscribers();
      }, [showAxis, showGrid, toolSM.tool, notifySubscribers]);
      const jxgIdToSceneRef = React8.useRef(/* @__PURE__ */ new Map());
      React8.useEffect(() => {
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
      const jxgFromSceneId = React8.useCallback((id) => {
        const r = rendererRef.current;
        if (!r) return null;
        return r.elements?.get(id) ?? null;
      }, []);
      const jxgIdToSceneId = React8.useCallback((jxgObj) => {
        if (!jxgObj?.id) return null;
        return jxgIdToSceneRef.current.get(String(jxgObj.id)) ?? null;
      }, []);
      const screenCoordsOf = React8.useCallback((evt) => {
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
      const objectsAt = React8.useCallback((evt) => {
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
      const findNearestPointJxg = React8.useCallback((evt, tolPx = 12) => {
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
      const promoteLabel = React8.useCallback((o) => {
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
      const toggleSelect = React8.useCallback((id, additive) => {
        if (!additive) {
          selectedSetRef.current.clear();
          selectedSetRef.current.add(id);
        } else if (selectedSetRef.current.has(id)) selectedSetRef.current.delete(id);
        else selectedSetRef.current.add(id);
        setSelectionTick((t) => t + 1);
      }, []);
      const clearSelection = React8.useCallback(() => {
        selectedSetRef.current.clear();
        setSelectionTick((t) => t + 1);
      }, []);
      const deleteSelection = React8.useCallback(() => {
        if (selectedSetRef.current.size === 0) return;
        store.transaction((dispatch) => {
          for (const id of selectedSetRef.current) dispatch({ type: "DELETE", payload: { id } });
        });
        selectedSetRef.current.clear();
        setSelectionTick((t) => t + 1);
      }, [store]);
      const clearPreviewSegs = React8.useCallback(() => {
        const b = boardRef.current;
        if (!b) return;
        for (const s of previewSegRef.current) {
          safeJsx("MiniBoard.removeObject(previewSeg)", () => b.removeObject(s));
        }
        previewSegRef.current = [];
      }, []);
      const removePhantom = React8.useCallback(() => {
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
      const clearPending = React8.useCallback(() => {
        removePhantom();
        clearPreviewSegs();
        pendingRef.current = [];
        toolSM.clearPending();
      }, [clearPreviewSegs, removePhantom, toolSM]);
      const refreshPreview = React8.useCallback(() => {
      }, []);
      const [, setWarn] = React8.useState(null);
      const warnTimerRef = React8.useRef(null);
      const flashWarn = React8.useCallback((msg) => {
        if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
        setWarn(msg);
        warnTimerRef.current = setTimeout(() => setWarn(null), 1800);
      }, []);
      React8.useEffect(() => () => {
        if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
      }, []);
      const nextLabelFor = React8.useCallback(
        (kind) => nextLabel(store.getState(), kind),
        [store]
      );
      const buildSnapshot = React8.useCallback(
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
      const emitSelect = React8.useCallback((info) => {
        const snap = buildSnapshot(info.id, info.anchorScreen);
        if (!snap) return;
        selectSubsRef.current.forEach((cb) => safeJsx("MiniBoard.emitSelect.cb", () => cb(snap)));
      }, [buildSnapshot]);
      const emitTransform = React8.useCallback((info) => {
        transformSubsRef.current.forEach((cb) => safeJsx("MiniBoard.emitTransform.cb", () => cb(info)));
      }, []);
      const ctxRef = React8.useRef(null);
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
      React8.useEffect(() => {
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
      React8.useEffect(() => {
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
      React8.useEffect(() => {
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
      const handleToolChange = React8.useCallback((t) => {
        clearPending();
        toolSM.setTool(t);
        const b = boardRef.current;
        if (b) safeJsx("MiniBoard.setPanForTool", () => {
          if (b.attr?.pan) b.attr.pan.enabled = t !== "select";
        });
      }, [clearPending, toolSM]);
      React8.useEffect(() => {
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
  const [hover, setHover] = React8.useState(null);
  const [portalReady, setPortalReady] = React8.useState(false);
  const hoverTimerRef = React8.useRef(null);
  React8.useEffect(() => {
    setPortalReady(true);
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);
  const showHover = React8.useCallback((el, t) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      const r = el.getBoundingClientRect();
      setHover({ label: t.label, hint: t.hint, x: r.right, y: r.top + r.height / 2 });
    }, TOOLTIP_DELAY_MS);
  }, []);
  const hideHover = React8.useCallback(() => {
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
  const grouped = React8.useMemo(() => {
    return TOOLS.reduce((acc, t) => {
      var _a;
      (acc[_a = t.group] ?? (acc[_a] = [])).push(t);
      return acc;
    }, {});
  }, []);
  const groupKeys = React8.useMemo(
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
  const groups = React8.useMemo(() => {
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
  const [state, setState] = React8.useState(() => ({
    isMobile: readMatch(MOBILE_QUERY),
    isTouchOnly: readMatch(NO_HOVER_QUERY)
  }));
  React8.useEffect(() => {
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
      const rootRef = React8.useRef(null);
      const [section, setSection] = React8.useState(null);
      const { isMobile } = useIsMobile();
      const [clamped, setClamped] = React8.useState(null);
      React8.useLayoutEffect(() => {
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
      const [name, setName] = React8.useState(initialName);
      React8.useEffect(() => {
        setName(initialName);
      }, [initialName]);
      React8.useEffect(() => {
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
      const colorIndicatorTint = React8.useMemo(() => currentColor, [currentColor]);
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
      const [value, setValue] = React8.useState(defaultValue);
      const inputRef = React8.useRef(null);
      const meta = LABELS[kind];
      React8.useEffect(() => {
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
    init_LeftPanel();
    GeometryEditorPanel = React8.forwardRef(
      function GeometryEditorPanel2({ initialState, onInsert, onClose, withLeftPanel = false, onStateChange, isDark, isMobile = false, onOpenDrawer, onUndo, onRedo, canUndo, canRedo }, ref) {
        const handleRef = React8.useRef(null);
        const [ready, setReady] = React8.useState(false);
        const [hasContent, setHasContent] = React8.useState(false);
        const [propsPopover, setPropsPopover] = React8.useState(null);
        const [transformPopover, setTransformPopover] = React8.useState(null);
        const onStateChangeRef = React8.useRef(onStateChange);
        React8.useEffect(() => {
          onStateChangeRef.current = onStateChange;
        }, [onStateChange]);
        const emitState = React8.useCallback(() => {
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
        const handleReady = React8.useCallback((h) => {
          handleRef.current = h;
          setReady(true);
          emitState();
          h.subscribe(emitState);
          h.onSelect((snap) => setPropsPopover(snap));
          h.onTransformParam((info) => setTransformPopover(info));
        }, [emitState]);
        const performInsert = React8.useCallback(() => {
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
        const handleInsert = React8.useCallback(() => {
          performInsert();
        }, [performInsert]);
        React8.useImperativeHandle(ref, () => ({
          setTool: (t) => handleRef.current?.setTool(t),
          setShowAxis: (b) => handleRef.current?.setShowAxis(b),
          setShowGrid: (b) => handleRef.current?.setShowGrid(b),
          undo: () => handleRef.current?.undo(),
          redo: () => handleRef.current?.redo(),
          insert: performInsert,
          hasContent: () => Object.keys(handleRef.current?.getState().objects ?? {}).length > 0
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
  const [chordGroup, setChordGroup] = React8.useState(null);
  const groupOrderRef = React8.useRef(groupOrder);
  const toolsRef = React8.useRef(tools);
  const onSelectRef = React8.useRef(onSelect);
  const chordGroupRef = React8.useRef(null);
  groupOrderRef.current = groupOrder;
  toolsRef.current = tools;
  onSelectRef.current = onSelect;
  const cancel = React8.useCallback(() => {
    chordGroupRef.current = null;
    setChordGroup(null);
  }, []);
  React8.useEffect(() => {
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
    GeometryStampHost = React8.forwardRef(
      function GeometryStampHost2({ api, editingElement, onClose, isDark }, ref) {
        const panelRef = React8.useRef(null);
        const [geomState, setGeomState] = React8.useState(INITIAL_GEOM_STATE);
        const { isMobile } = useIsMobile();
        const [drawerOpen, setDrawerOpen] = React8.useState(false);
        const { chordGroup } = useChordShortcut({
          groupOrder: GROUP_ORDER,
          tools: TOOLS,
          onSelect: (key) => panelRef.current?.setTool(key),
          enabled: !isMobile
        });
        const initialState = React8.useMemo(() => {
          if (!editingElement) return null;
          if (!isGeometryCustomData(editingElement.customData)) return null;
          try {
            return JSON.parse(editingElement.customData.jsonState);
          } catch {
            console.warn("GeometryStampHost: customData jsonState corrupted");
            return null;
          }
        }, [editingElement]);
        const handleInsert = React8.useCallback(
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
        React8.useImperativeHandle(
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
var init_types3 = __esm({
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
    EditorPopover = React8.forwardRef(function EditorPopover2({
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
      const [value, setValue] = React8.useState(initialValue);
      const [internalDisplayMode] = React8.useState(false);
      const displayMode = controlledDisplayMode ?? internalDisplayMode;
      const [previewSvg, setPreviewSvg] = React8.useState(null);
      const [error, setError] = React8.useState(null);
      const debounceRef = React8.useRef(null);
      const inputRef = React8.useRef(null);
      React8.useEffect(() => {
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
      const handleInsert = React8.useCallback(() => {
        if (!previewSvg) return;
        onInsert(previewSvg, value, displayMode);
      }, [previewSvg, value, displayMode, onInsert]);
      const handleKeyDown = React8.useCallback(
        (e) => {
          if (e.key === "Escape") onClose();
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleInsert();
          }
        },
        [onClose, handleInsert]
      );
      React8.useImperativeHandle(
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
    init_types3();
    LatexStampHost = React8.forwardRef(
      function LatexStampHost2({ api, editingElement, onClose }, ref) {
        const editorRef = React8.useRef(null);
        const { isMobile } = useIsMobile();
        const [drawerOpen, setDrawerOpen] = React8.useState(false);
        const initial = React8.useMemo(() => {
          if (editingElement && isLatexCustomData(editingElement.customData)) {
            return {
              initialValue: editingElement.customData.src,
              displayMode: !!editingElement.customData.displayMode
            };
          }
          return { initialValue: "", displayMode: false };
        }, [editingElement]);
        const [displayMode, setDisplayMode] = React8.useState(initial.displayMode);
        const handleInsert = React8.useCallback(
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
        React8.useImperativeHandle(
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
function serializeBoard3D(state, view) {
  return view ? { version: 2, state, view } : { version: 2, state };
}
function parseSerializedBoard3D(raw) {
  if (raw && typeof raw === "object" && raw.version === 2) {
    const envelope = raw;
    const state = envelope.state ? migrateState(envelope.state) : createEmptyState("3d");
    return envelope.view ? { state, view: envelope.view } : { state };
  }
  return { state: createEmptyState("3d") };
}
var init_serialize2 = __esm({
  "src/stamps/geometry-3d/serialize.ts"() {
    init_scene();
  }
});

// src/core/scene/render/types.ts
var DEFAULT_THEME_3D;
var init_types4 = __esm({
  "src/core/scene/render/types.ts"() {
    DEFAULT_THEME_3D = {
      point: { size: 4, color: "#1e40af" },
      line: { strokeWidth: 2, color: "#0f172a" },
      plane: { fillOpacity: 0.15, color: "#60a5fa" }
    };
  }
});

// src/core/scene/render/JxgRenderer3D.ts
var JxgRenderer3D;
var init_JxgRenderer3D = __esm({
  "src/core/scene/render/JxgRenderer3D.ts"() {
    init_registry();
    init_types4();
    JxgRenderer3D = class {
      constructor(store, view, options = {}) {
        this.elements = /* @__PURE__ */ new Map();
        this.disposed = false;
        this.store = store;
        this.view = view;
        this.theme = options.theme ?? DEFAULT_THEME_3D;
        this.unsubscribe = store.subscribe((next, prev) => this.applyDiff(prev, next));
        this.applyDiff(void 0, store.getState());
      }
      ctx() {
        return {
          jxg: this.view,
          resolveRef: (id) => {
            const el = this.elements.get(id);
            if (el === void 0) {
              throw new Error(`[scene] resolveRef: ch\u01B0a render id="${id}"`);
            }
            return el;
          },
          defaults: {}
        };
      }
      create(obj) {
        try {
          const def = getKind(obj.kind);
          const el = def.render(obj, this.ctx());
          this.elements.set(obj.id, el);
        } catch (err) {
          console.warn(`[scene/render] kh\xF4ng render \u0111\u01B0\u1EE3c ${obj.kind} id="${obj.id}":`, err);
        }
      }
      remove(id) {
        const el = this.elements.get(id);
        if (el === void 0) return;
        try {
          this.removeFromView(el);
        } catch (err) {
          console.warn(`[scene/render] kh\xF4ng remove \u0111\u01B0\u1EE3c id="${id}":`, err);
        }
        this.elements.delete(id);
      }
      removeFromView(el) {
        const view = this.view;
        if (el && typeof el === "object") {
          const asObj = el;
          if (Array.isArray(asObj["faces"])) {
            for (const face of asObj["faces"]) {
              view.removeObject?.(face);
            }
            if (Array.isArray(asObj["_verts"])) {
              for (const v of asObj["_verts"]) {
                view.removeObject?.(v);
              }
            }
            return;
          }
        }
        view.removeObject?.(el);
      }
      applyDiff(prev, next) {
        if (this.disposed) return;
        const prevObjs = prev?.objects ?? {};
        const nextObjs = next.objects;
        for (const id of Object.keys(prevObjs)) {
          if (!(id in nextObjs)) {
            this.remove(id);
          }
        }
        for (const id of next.order) {
          const cur = nextObjs[id];
          if (!cur) continue;
          const old = prevObjs[id];
          if (!old) {
            this.create(cur);
            continue;
          }
          if (Object.is(old, cur)) {
            continue;
          }
          let def;
          try {
            def = getKind(cur.kind);
          } catch {
            continue;
          }
          const existing = this.elements.get(id);
          if (def.update && existing !== void 0) {
            try {
              def.update(cur, old, this.ctx(), existing);
              continue;
            } catch (err) {
              console.warn(`[scene/render] update fail, recreate id="${id}":`, err);
            }
          }
          this.remove(id);
          this.create(cur);
        }
      }
      dispose() {
        if (this.disposed) return;
        this.unsubscribe();
        this.disposed = true;
        for (const id of Array.from(this.elements.keys())) {
          this.remove(id);
        }
      }
    };
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
var DEFAULT_VIEW3D, VIEW3D_ATTRS, GROUND_PLANE_ATTRS, GROUND_PLANE_RANGE;
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
      const axisLabel = (color) => ({
        strokeColor: color,
        fontSize: 14,
        offset: [10, 0]
      });
      return {
        az: { slider: { visible: false }, point2: { visible: false } },
        el: { slider: { visible: false } },
        projection: "central",
        // GeoGebra-style: axes pass through origin (0,0,0) instead of bbox border.
        axesPosition: "center",
        xAxis: {
          strokeColor: p.axisX,
          strokeWidth: 2,
          lastArrow: { type: 2, size: 8 },
          name: "x",
          withLabel: true,
          label: axisLabel(p.axisX)
        },
        yAxis: {
          strokeColor: p.axisY,
          strokeWidth: 2,
          lastArrow: { type: 2, size: 8 },
          name: "y",
          withLabel: true,
          label: axisLabel(p.axisY)
        },
        zAxis: {
          strokeColor: p.axisZ,
          strokeWidth: 2,
          lastArrow: { type: 2, size: 8 },
          name: "z",
          withLabel: true,
          label: axisLabel(p.axisZ)
        },
        // GeoGebra-style: hide ALL bbox wall planes; the XY ground plane is drawn
        // explicitly at z=0 via the helper below (so it coincides with Ox/Oy).
        xPlaneRear: { visible: false, mesh3d: { visible: false } },
        yPlaneRear: { visible: false, mesh3d: { visible: false } },
        zPlaneRear: { visible: false, mesh3d: { visible: false } }
      };
    };
    GROUND_PLANE_ATTRS = (isDark) => ({
      fillColor: isDark ? "#2a2a2a" : "#e6e6e6",
      fillOpacity: isDark ? 0.5 : 0.55,
      strokeColor: isDark ? "#3a3a3a" : "#cfcfcf",
      strokeOpacity: 0.7,
      strokeWidth: 1,
      fixed: true,
      highlight: false,
      withLabel: false,
      layer: 0
    });
    GROUND_PLANE_RANGE = [-3, 3];
  }
});

// src/stamps/geometry-3d/render.ts
async function renderGeometry3DSvgFromState(jsonState) {
  let parsed;
  try {
    parsed = parseSerializedBoard3D(JSON.parse(jsonState));
  } catch {
    parsed = parseSerializedBoard3D(null);
  }
  const view3DInfo = parsed.view ?? {
    azimuth: DEFAULT_VIEW3D.azimuth,
    elevation: DEFAULT_VIEW3D.elevation,
    bbox3D: [...DEFAULT_VIEW3D.bbox3D]
  };
  const JXG = (await import('jsxgraph')).default;
  const div = document.createElement("div");
  div.style.cssText = `position:absolute;left:-9999px;top:-9999px;width:${OUTPUT_WIDTH}px;height:${OUTPUT_HEIGHT}px;`;
  document.body.appendChild(div);
  try {
    JXG.Options.text.display = "internal";
    const board = JXG.JSXGraph.initBoard(div, {
      boundingbox: BBOX_2D,
      keepaspectratio: true,
      axis: false,
      showCopyright: false,
      showNavigation: false,
      renderer: "svg"
    });
    const baseAttrs = VIEW3D_ATTRS(false);
    const view = board.create(
      "view3d",
      [
        [-5, -5],
        [10, 10],
        [
          [view3DInfo.bbox3D[0], view3DInfo.bbox3D[3]],
          [view3DInfo.bbox3D[1], view3DInfo.bbox3D[4]],
          [view3DInfo.bbox3D[2], view3DInfo.bbox3D[5]]
        ]
      ],
      {
        ...baseAttrs,
        az: { ...baseAttrs.az, slider: { ...baseAttrs.az.slider, start: view3DInfo.azimuth } },
        el: { ...baseAttrs.el, slider: { ...baseAttrs.el.slider, start: view3DInfo.elevation } }
      }
    );
    try {
      const v = view;
      v?.az_slide?.setValue?.(view3DInfo.azimuth);
      v?.el_slide?.setValue?.(view3DInfo.elevation);
      v?.board?.update?.();
    } catch {
    }
    try {
      view.create(
        "plane3d",
        [
          [0, 0, 0],
          [1, 0, 0],
          [0, 1, 0],
          GROUND_PLANE_RANGE,
          GROUND_PLANE_RANGE
        ],
        GROUND_PLANE_ATTRS(false)
      );
    } catch {
    }
    const store = createStore(parsed.state);
    const renderer = new JxgRenderer3D(store, view);
    try {
      view?.board?.update?.();
    } catch {
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
      renderer.dispose();
    } catch {
    }
    try {
      JXG.JSXGraph.freeBoard(board);
    } catch {
    }
    return { svgString, width: OUTPUT_WIDTH, height: OUTPUT_HEIGHT };
  } finally {
    document.body.removeChild(div);
  }
}
var OUTPUT_WIDTH, OUTPUT_HEIGHT, BBOX_2D;
var init_render3 = __esm({
  "src/stamps/geometry-3d/render.ts"() {
    "use client";
    init_serialize2();
    init_scene();
    init_JxgRenderer3D();
    init_theme2();
    OUTPUT_WIDTH = 1024;
    OUTPUT_HEIGHT = 768;
    BBOX_2D = [-6, 6, 6, -6];
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
function makePointId(store, offset = 1) {
  return `p${store.getState().counter + offset}`;
}
function buildPointObject(store, constraint, options = {}) {
  const id = makePointId(store, options.idOffset ?? 1);
  const state = store.getState();
  const label = options.label ?? nextLabel(state, "point3d");
  return {
    id,
    kind: "point3d",
    label,
    visible: true,
    locked: false,
    layer: "default",
    schemaVersion: 1,
    attrs: { constraint, ...options.color ? { color: options.color } : {} }
  };
}
function addPoint(store, constraint, color) {
  const obj = buildPointObject(store, constraint, {});
  store.dispatch({ type: "ADD", payload: { obj } });
  return obj.id;
}
function ensurePoint(hit, store) {
  if (hit.kind === "existingPoint") return hit.pointId;
  const c = hitToConstraint(hit);
  if (!c) return null;
  return addPoint(store, c);
}
var init_ensurePoint = __esm({
  "src/stamps/geometry-3d/editor/tools/handlers/_ensurePoint.ts"() {
    init_scene();
  }
});

// src/stamps/geometry-3d/editor/tools/handlers/point.ts
function buildPoint(args, store) {
  const hit = args[0]?.hit;
  if (!hit) return null;
  if (hit.kind === "existingPoint") return hit.pointId;
  const c = hitToConstraint(hit);
  if (!c) return null;
  return addPoint(store, c);
}
var buildPointOnObject;
var init_point = __esm({
  "src/stamps/geometry-3d/editor/tools/handlers/point.ts"() {
    init_ensurePoint();
    buildPointOnObject = buildPoint;
  }
});

// src/stamps/geometry-3d/editor/tools/handlers/segment.ts
function makeDerivedId(store, prefix) {
  return `${prefix}${store.getState().counter + 1}`;
}
function addDerived(store, kind, prefix, attrs) {
  const id = makeDerivedId(store, prefix);
  const label = nextLabel(store.getState(), kind);
  const obj = {
    id,
    kind,
    label,
    visible: true,
    locked: false,
    layer: "default",
    schemaVersion: 1,
    attrs
  };
  store.dispatch({ type: "ADD", payload: { obj } });
  return id;
}
function buildSegment(args, store) {
  if (args.length < 2 || !args[0].hit || !args[1].hit) return null;
  const p1 = ensurePoint(args[0].hit, store);
  const p2 = ensurePoint(args[1].hit, store);
  if (!p1 || !p2 || p1 === p2) return null;
  return addDerived(store, "segment3d", "s", { p1, p2 });
}
function buildLine(args, store) {
  if (args.length < 2 || !args[0].hit || !args[1].hit) return null;
  const p1 = ensurePoint(args[0].hit, store);
  const p2 = ensurePoint(args[1].hit, store);
  if (!p1 || !p2 || p1 === p2) return null;
  return addDerived(store, "line3d", "l", { p1, p2 });
}
function buildRay(args, store) {
  if (args.length < 2 || !args[0].hit || !args[1].hit) return null;
  const origin = ensurePoint(args[0].hit, store);
  const through = ensurePoint(args[1].hit, store);
  if (!origin || !through || origin === through) return null;
  return addDerived(store, "ray3d", "r", { origin, through });
}
function buildVector(args, store) {
  if (args.length < 2 || !args[0].hit || !args[1].hit) return null;
  const from = ensurePoint(args[0].hit, store);
  const to = ensurePoint(args[1].hit, store);
  if (!from || !to || from === to) return null;
  return addDerived(store, "vector3d", "v", { from, to });
}
var init_segment = __esm({
  "src/stamps/geometry-3d/editor/tools/handlers/segment.ts"() {
    init_scene();
    init_ensurePoint();
  }
});

// src/stamps/geometry-3d/editor/tools/handlers/polygon.ts
function buildPolygon(args, store) {
  const vertexArgs = args.filter((a) => a.step.type === "point");
  const vertexIds = vertexArgs.map((a) => a.hit ? ensurePoint(a.hit, store) : null).filter((x) => !!x);
  if (vertexIds.length < 3) return null;
  const id = `pg${store.getState().counter + 1}`;
  const label = nextLabel(store.getState(), "polygon3d");
  const obj = {
    id,
    kind: "polygon3d",
    label,
    visible: true,
    locked: false,
    layer: "default",
    schemaVersion: 1,
    attrs: { vertices: vertexIds }
  };
  store.dispatch({ type: "ADD", payload: { obj } });
  return id;
}
var init_polygon = __esm({
  "src/stamps/geometry-3d/editor/tools/handlers/polygon.ts"() {
    init_scene();
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
function getPointWorld(id, state) {
  const obj = state.objects[id];
  if (!obj || obj.kind !== "point3d") {
    throw new Error(`constraintMath: point ${id} not found`);
  }
  const attrs = obj.attrs;
  return constraintToWorld(attrs.constraint, state);
}
function getPlaneBasis(planeObj, state) {
  const p1 = getPointWorld(planeObj.attrs.p1, state);
  const p2 = getPointWorld(planeObj.attrs.p2, state);
  const p3 = getPointWorld(planeObj.attrs.p3, state);
  const basis1 = sub(p2, p1);
  const tmp = sub(p3, p1);
  const normal = normalize(cross(basis1, tmp));
  const basis2 = cross(normal, basis1);
  return { origin: p1, basis1, basis2, normal };
}
function constraintToWorld(c, state) {
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
      const plane = state.objects[c.planeId];
      if (!plane || plane.kind !== "plane3d") throw new Error("onPlane: plane missing");
      const { origin, basis1, basis2 } = getPlaneBasis(plane, state);
      return add(add(origin, scale(basis1, c.u)), scale(basis2, c.v));
    }
    case "onLine": {
      const line = state.objects[c.lineId];
      if (!line) throw new Error("onLine: parent missing");
      let p1Id;
      let p2Id;
      if (line.kind === "line3d" || line.kind === "segment3d") {
        const a = line.attrs;
        p1Id = a.p1;
        p2Id = a.p2;
      } else if (line.kind === "ray3d") {
        const a = line.attrs;
        p1Id = a.origin;
        p2Id = a.through;
      } else if (line.kind === "vector3d") {
        const a = line.attrs;
        p1Id = a.from;
        p2Id = a.to;
      } else {
        throw new Error("onLine: parent kind not supported");
      }
      const p1 = getPointWorld(p1Id, state);
      const p2 = getPointWorld(p2Id, state);
      const dir = sub(p2, p1);
      return add(p1, scale(dir, c.t));
    }
    case "onPolygon": {
      const pg = state.objects[c.polygonId];
      if (!pg || pg.kind !== "polygon3d") throw new Error("onPolygon: parent missing");
      const v = pg.attrs.vertices;
      if (v.length < 3) throw new Error("onPolygon: < 3 vertices");
      const p1 = getPointWorld(v[0], state);
      const p2 = getPointWorld(v[1], state);
      const p3 = getPointWorld(v[2], state);
      const basis1 = sub(p2, p1);
      const tmp = sub(p3, p1);
      const normal = normalize(cross(basis1, tmp));
      const basis2 = cross(normal, basis1);
      return add(add(p1, scale(basis1, c.u)), scale(basis2, c.v));
    }
    case "onSphere": {
      const sph = state.objects[c.sphereId];
      if (!sph || sph.kind !== "sphere3d") throw new Error("onSphere: parent missing");
      const a = sph.attrs;
      const center = getPointWorld(a.center, state);
      const surface = getPointWorld(a.surfacePoint, state);
      const radius = norm(sub(surface, center));
      const x = center[0] + radius * Math.sin(c.phi) * Math.cos(c.theta);
      const y = center[1] + radius * Math.sin(c.phi) * Math.sin(c.theta);
      const z = center[2] + radius * Math.cos(c.phi);
      return [x, y, z];
    }
  }
}
var init_constraintMath = __esm({
  "src/stamps/geometry-3d/editor/scene/constraintMath.ts"() {
  }
});

// src/stamps/geometry-3d/editor/scene/geometryChecks.ts
function getWorld(id, state) {
  const obj = state.objects[id];
  if (!obj || obj.kind !== "point3d") return null;
  const attrs = obj.attrs;
  return constraintToWorld(attrs.constraint, state);
}
function areCollinear3(p1Id, p2Id, p3Id, state) {
  const p1 = getWorld(p1Id, state);
  const p2 = getWorld(p2Id, state);
  const p3 = getWorld(p3Id, state);
  if (!p1 || !p2 || !p3) return true;
  const a = [p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]];
  const b = [p3[0] - p1[0], p3[1] - p1[1], p3[2] - p1[2]];
  const c = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  return Math.hypot(c[0], c[1], c[2]) < EPS;
}
function apexCoplanarWithBase(baseIds, apexId, state) {
  if (baseIds.length < 3) return false;
  const p1 = getWorld(baseIds[0], state);
  const p2 = getWorld(baseIds[1], state);
  const p3 = getWorld(baseIds[2], state);
  const apex = getWorld(apexId, state);
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
function buildPlane(args, store) {
  if (args.length < 3 || !args[0].hit || !args[1].hit || !args[2].hit) return null;
  const p1 = ensurePoint(args[0].hit, store);
  const p2 = ensurePoint(args[1].hit, store);
  const p3 = ensurePoint(args[2].hit, store);
  if (!p1 || !p2 || !p3) return null;
  if (p1 === p2 || p2 === p3 || p1 === p3) return null;
  if (areCollinear3(p1, p2, p3, store.getState())) return null;
  const id = `pl${store.getState().counter + 1}`;
  const label = nextLabel(store.getState(), "plane3d");
  const obj = {
    id,
    kind: "plane3d",
    label,
    visible: true,
    locked: false,
    layer: "default",
    schemaVersion: 1,
    attrs: { p1, p2, p3 }
  };
  store.dispatch({ type: "ADD", payload: { obj } });
  return id;
}
var init_plane = __esm({
  "src/stamps/geometry-3d/editor/tools/handlers/plane.ts"() {
    init_scene();
    init_ensurePoint();
    init_geometryChecks();
  }
});

// src/stamps/geometry-3d/editor/tools/handlers/pyramid.ts
function buildPyramid(args, store) {
  const pointArgs = args.filter((a) => a.step.type === "point");
  const baseArgs = pointArgs.slice(0, -1);
  const apexArg = pointArgs.slice(-1)[0];
  if (baseArgs.length < 3 || !apexArg?.hit) return null;
  const baseIds = baseArgs.map((a) => a.hit ? ensurePoint(a.hit, store) : null).filter((x) => !!x);
  const apexId = ensurePoint(apexArg.hit, store);
  if (!apexId || baseIds.length < 3) return null;
  if (apexCoplanarWithBase(baseIds, apexId, store.getState())) return null;
  const vertices = [...baseIds, apexId];
  const apexIdx = vertices.length - 1;
  const faces = [baseIds.map((_, i) => i)];
  for (let i = 0; i < baseIds.length; i++) {
    faces.push([i, (i + 1) % baseIds.length, apexIdx]);
  }
  const id = `ph${store.getState().counter + 1}`;
  const label = nextLabel(store.getState(), "polyhedron3d");
  const obj = {
    id,
    kind: "polyhedron3d",
    label,
    visible: true,
    locked: false,
    layer: "default",
    schemaVersion: 1,
    attrs: { flavor: "pyramid", vertices, faces }
  };
  store.dispatch({ type: "ADD", payload: { obj } });
  return id;
}
var init_pyramid = __esm({
  "src/stamps/geometry-3d/editor/tools/handlers/pyramid.ts"() {
    init_scene();
    init_ensurePoint();
    init_geometryChecks();
  }
});

// src/stamps/geometry-3d/editor/tools/handlers/prism.ts
function buildPrism(args, store) {
  const baseArgs = args.filter((a) => a.step.type === "point");
  const numberArg = args.find((a) => a.step.type === "number");
  if (baseArgs.length < 3 || !numberArg || typeof numberArg.value !== "number") return null;
  const height = numberArg.value;
  if (height <= 0) return null;
  const baseIds = baseArgs.map((a) => a.hit ? ensurePoint(a.hit, store) : null).filter((x) => !!x);
  if (baseIds.length < 3) return null;
  const topIds = [];
  for (const id2 of baseIds) {
    const state = store.getState();
    const p = state.objects[id2];
    if (!p || p.kind !== "point3d") return null;
    const attrs = p.attrs;
    const w = constraintToWorld(attrs.constraint, state);
    topIds.push(addPoint(store, { kind: "free", x: w[0], y: w[1], z: w[2] + height }));
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
  const id = `ph${store.getState().counter + 1}`;
  const label = nextLabel(store.getState(), "polyhedron3d");
  const obj = {
    id,
    kind: "polyhedron3d",
    label,
    visible: true,
    locked: false,
    layer: "default",
    schemaVersion: 1,
    attrs: { flavor: "prism", vertices, faces }
  };
  store.dispatch({ type: "ADD", payload: { obj } });
  return id;
}
var init_prism = __esm({
  "src/stamps/geometry-3d/editor/tools/handlers/prism.ts"() {
    init_scene();
    init_ensurePoint();
    init_constraintMath();
  }
});

// src/stamps/geometry-3d/editor/tools/handlers/tetrahedron.ts
function buildTetrahedron(args, store) {
  if (args.length < 2 || !args[0].hit || !args[1].hit) return null;
  const p1Id = ensurePoint(args[0].hit, store);
  const p2Id = ensurePoint(args[1].hit, store);
  if (!p1Id || !p2Id || p1Id === p2Id) return null;
  const state0 = store.getState();
  const p1Obj = state0.objects[p1Id];
  const p2Obj = state0.objects[p2Id];
  if (!p1Obj || p1Obj.kind !== "point3d" || !p2Obj || p2Obj.kind !== "point3d") return null;
  const p1 = constraintToWorld(p1Obj.attrs.constraint, state0);
  const p2 = constraintToWorld(p2Obj.attrs.constraint, state0);
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
  const cId = addPoint(store, { kind: "free", x: baseC[0], y: baseC[1], z: baseC[2] });
  const apexId = addPoint(store, { kind: "free", x: apex[0], y: apex[1], z: apex[2] });
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
  const id = `ph${store.getState().counter + 1}`;
  const label = nextLabel(store.getState(), "polyhedron3d");
  const obj = {
    id,
    kind: "polyhedron3d",
    label,
    visible: true,
    locked: false,
    layer: "default",
    schemaVersion: 1,
    attrs: { flavor: "tetrahedron", vertices, faces }
  };
  store.dispatch({ type: "ADD", payload: { obj } });
  return id;
}
var init_tetrahedron = __esm({
  "src/stamps/geometry-3d/editor/tools/handlers/tetrahedron.ts"() {
    init_scene();
    init_ensurePoint();
    init_constraintMath();
  }
});

// src/stamps/geometry-3d/editor/tools/handlers/cube.ts
function buildCube(args, store) {
  if (args.length < 2 || !args[0].hit || !args[1].hit) return null;
  const p1Id = ensurePoint(args[0].hit, store);
  const p2Id = ensurePoint(args[1].hit, store);
  if (!p1Id || !p2Id || p1Id === p2Id) return null;
  const state0 = store.getState();
  const p1Obj = state0.objects[p1Id];
  const p2Obj = state0.objects[p2Id];
  if (!p1Obj || p1Obj.kind !== "point3d" || !p2Obj || p2Obj.kind !== "point3d") return null;
  const p1 = constraintToWorld(p1Obj.attrs.constraint, state0);
  const p2 = constraintToWorld(p2Obj.attrs.constraint, state0);
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
  const p3Id = addPoint(store, { kind: "onGround", x: p3[0], y: p3[1] });
  const p4Id = addPoint(store, { kind: "onGround", x: p4[0], y: p4[1] });
  const t1Id = addPoint(store, { kind: "free", x: t1[0], y: t1[1], z: t1[2] });
  const t2Id = addPoint(store, { kind: "free", x: t2[0], y: t2[1], z: t2[2] });
  const t3Id = addPoint(store, { kind: "free", x: t3[0], y: t3[1], z: t3[2] });
  const t4Id = addPoint(store, { kind: "free", x: t4[0], y: t4[1], z: t4[2] });
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
  const id = `ph${store.getState().counter + 1}`;
  const label = nextLabel(store.getState(), "polyhedron3d");
  const obj = {
    id,
    kind: "polyhedron3d",
    label,
    visible: true,
    locked: false,
    layer: "default",
    schemaVersion: 1,
    attrs: { flavor: "cube", vertices, faces }
  };
  store.dispatch({ type: "ADD", payload: { obj } });
  return id;
}
var init_cube = __esm({
  "src/stamps/geometry-3d/editor/tools/handlers/cube.ts"() {
    init_scene();
    init_ensurePoint();
    init_constraintMath();
  }
});

// src/stamps/geometry-3d/editor/tools/handlers/sphere.ts
function buildSphere(args, store) {
  if (args.length < 2 || !args[0].hit || !args[1].hit) return null;
  const center = ensurePoint(args[0].hit, store);
  const surface = ensurePoint(args[1].hit, store);
  if (!center || !surface || center === surface) return null;
  const id = `sp${store.getState().counter + 1}`;
  const label = nextLabel(store.getState(), "sphere3d");
  const obj = {
    id,
    kind: "sphere3d",
    label,
    visible: true,
    locked: false,
    layer: "default",
    schemaVersion: 1,
    attrs: { center, surfacePoint: surface }
  };
  store.dispatch({ type: "ADD", payload: { obj } });
  return id;
}
var init_sphere = __esm({
  "src/stamps/geometry-3d/editor/tools/handlers/sphere.ts"() {
    init_scene();
    init_ensurePoint();
  }
});

// src/stamps/geometry-3d/editor/tools/handlers/cylinder.ts
function buildCylinder(args, store) {
  const points = args.filter((a) => a.step.type === "point");
  const numberArg = args.find((a) => a.step.type === "number");
  if (points.length < 2 || !points[0].hit || !points[1].hit || !numberArg || typeof numberArg.value !== "number") return null;
  const radius = numberArg.value;
  if (radius <= 0) return null;
  const baseCenter = ensurePoint(points[0].hit, store);
  const topCenter = ensurePoint(points[1].hit, store);
  if (!baseCenter || !topCenter || baseCenter === topCenter) return null;
  const id = `cy${store.getState().counter + 1}`;
  const label = nextLabel(store.getState(), "cylinder3d");
  const obj = {
    id,
    kind: "cylinder3d",
    label,
    visible: true,
    locked: false,
    layer: "default",
    schemaVersion: 1,
    attrs: { baseCenter, topCenter, radius }
  };
  store.dispatch({ type: "ADD", payload: { obj } });
  return id;
}
var init_cylinder = __esm({
  "src/stamps/geometry-3d/editor/tools/handlers/cylinder.ts"() {
    init_scene();
    init_ensurePoint();
  }
});

// src/stamps/geometry-3d/editor/tools/handlers/cone.ts
function buildCone(args, store) {
  const points = args.filter((a) => a.step.type === "point");
  const numberArg = args.find((a) => a.step.type === "number");
  if (points.length < 2 || !points[0].hit || !points[1].hit || !numberArg || typeof numberArg.value !== "number") return null;
  const radius = numberArg.value;
  if (radius <= 0) return null;
  const baseCenter = ensurePoint(points[0].hit, store);
  const apex = ensurePoint(points[1].hit, store);
  if (!baseCenter || !apex || baseCenter === apex) return null;
  const id = `co${store.getState().counter + 1}`;
  const label = nextLabel(store.getState(), "cone3d");
  const obj = {
    id,
    kind: "cone3d",
    label,
    visible: true,
    locked: false,
    layer: "default",
    schemaVersion: 1,
    attrs: { baseCenter, apex, radius }
  };
  store.dispatch({ type: "ADD", payload: { obj } });
  return id;
}
var init_cone = __esm({
  "src/stamps/geometry-3d/editor/tools/handlers/cone.ts"() {
    init_scene();
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
        hintIdle: "Click tr\xEAn m\u1EB7t ph\u1EB3ng Oxy ho\u1EB7c tr\xEAn tr\u1EE5c \u0111\u1EC3 \u0111\u1EB7t \u0111i\u1EC3m",
        steps: [
          {
            type: "point",
            allowExisting: false,
            // GeoGebra-style: a new point must lie on the XY ground plane or on
            // one of the coordinate axes (Oz lets you place points off the plane).
            allowNewOn: ["ground", "axis"],
            hint: "Click tr\xEAn m\u1EB7t ph\u1EB3ng Oxy ho\u1EB7c tr\u1EE5c Ox/Oy/Oz"
          }
        ],
        build: buildPoint,
        repeatAfterBuild: true
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
      constructor(store) {
        this.store = store;
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
          tool.build(this.state.collected, this.store);
          if (tool.repeatAfterBuild) {
            this.state.stepIndex = 0;
            this.state.collected = [];
            this.state.hint = stepHint(tool.steps[0]);
            this.notify();
          } else {
            this.selectTool("move");
          }
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
function findSnapPoint(screen, view, state, pixelRadius = 8) {
  const board = view?.board;
  const ux = typeof board?.unitX === "number" && board.unitX > 0 ? board.unitX : 1;
  const uy = typeof board?.unitY === "number" && board.unitY > 0 ? board.unitY : ux;
  const rxUser = pixelRadius / ux;
  const ryUser = pixelRadius / uy;
  let best = null;
  for (const obj of listObjects(state)) {
    if (obj.kind !== "point3d") continue;
    if (!obj.visible) continue;
    const attrs = obj.attrs;
    const world = constraintToWorld(attrs.constraint, state);
    const proj = view.project3DTo2D?.(world[0], world[1], world[2]);
    if (!proj) continue;
    const dxN = (proj[1] - screen.x) / rxUser;
    const dyN = (proj[2] - screen.y) / ryUser;
    const d2 = dxN * dxN + dyN * dyN;
    if (d2 <= 1 && (best === null || d2 < best.d2)) {
      best = { id: obj.id, d2 };
    }
  }
  return best?.id ?? null;
}
var init_snapping = __esm({
  "src/stamps/geometry-3d/editor/hitTest/snapping.ts"() {
    init_constraintMath();
    init_scene();
  }
});

// src/stamps/geometry-3d/editor/hitTest/hitTest.ts
function hitTest(screen, view, state) {
  const board = view?.board;
  const ux = typeof board?.unitX === "number" && board.unitX > 0 ? board.unitX : 1;
  const axisThresholdUser = AXIS_PIXEL_THRESHOLD / ux;
  const snap = findSnapPoint(screen, view, state);
  if (snap) return { kind: "existingPoint", pointId: snap };
  const ray = screenToRay(screen, view);
  let bestSphere = null;
  for (const obj of listObjects(state)) {
    if (obj.kind !== "sphere3d" || !obj.visible) continue;
    const attrs = obj.attrs;
    const centerPoint = state.objects[attrs.center];
    const surfacePoint = state.objects[attrs.surfacePoint];
    if (!centerPoint || centerPoint.kind !== "point3d") continue;
    if (!surfacePoint || surfacePoint.kind !== "point3d") continue;
    const center = constraintToWorld(centerPoint.attrs.constraint, state);
    const surface = constraintToWorld(surfacePoint.attrs.constraint, state);
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
      if (d <= axisThresholdUser) {
        const hit = rayLineSegment(ray, { a: ax.a, b: ax.b }, 1e3);
        if (hit) {
          const t = ax.axis === "x" ? hit.point[0] : ax.axis === "y" ? hit.point[1] : hit.point[2];
          return { kind: "onAxis", axis: ax.axis, t, world: hit.point };
        }
      }
    }
  }
  let bestPlane = null;
  for (const obj of listObjects(state)) {
    if (obj.kind !== "plane3d" || !obj.visible) continue;
    const basis = planeBasis(obj.attrs, state);
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
    const sph = state.objects[bestSphere.id];
    if (sph && sph.kind === "sphere3d") {
      const centerPt = state.objects[sph.attrs.center];
      if (centerPt && centerPt.kind === "point3d") {
        const center = constraintToWorld(centerPt.attrs.constraint, state);
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
function planeBasis(plane, state) {
  const p1Obj = state.objects[plane.p1];
  const p2Obj = state.objects[plane.p2];
  const p3Obj = state.objects[plane.p3];
  if (!p1Obj || p1Obj.kind !== "point3d") return null;
  if (!p2Obj || p2Obj.kind !== "point3d") return null;
  if (!p3Obj || p3Obj.kind !== "point3d") return null;
  const p1 = constraintToWorld(p1Obj.attrs.constraint, state);
  const p2 = constraintToWorld(p2Obj.attrs.constraint, state);
  const p3 = constraintToWorld(p3Obj.attrs.constraint, state);
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
var init_hitTest2 = __esm({
  "src/stamps/geometry-3d/editor/hitTest/hitTest.ts"() {
    init_rayCast();
    init_intersect();
    init_snapping();
    init_constraintMath();
    init_scene();
    AXIS_PIXEL_THRESHOLD = 12;
  }
});
var MiniBoard3D;
var init_MiniBoard3D = __esm({
  "src/stamps/geometry-3d/editor/MiniBoard3D.tsx"() {
    "use client";
    init_theme2();
    MiniBoard3D = React8__namespace.forwardRef(
      function MiniBoard3D2(props, ref) {
        const containerRef = React8__namespace.useRef(null);
        const boardRef = React8__namespace.useRef(null);
        const viewRef = React8__namespace.useRef(null);
        const {
          isDark,
          onView3DReady,
          onPointerClick,
          onPointerMove,
          onPointerLeave,
          shouldStartPointDrag,
          onPointerDrag,
          onPointerDragEnd
        } = props;
        const onView3DReadyRef = React8__namespace.useRef(onView3DReady);
        const onPointerClickRef = React8__namespace.useRef(onPointerClick);
        const onPointerMoveRef = React8__namespace.useRef(onPointerMove);
        const onPointerLeaveRef = React8__namespace.useRef(onPointerLeave);
        const shouldStartPointDragRef = React8__namespace.useRef(shouldStartPointDrag);
        const onPointerDragRef = React8__namespace.useRef(onPointerDrag);
        const onPointerDragEndRef = React8__namespace.useRef(onPointerDragEnd);
        onView3DReadyRef.current = onView3DReady;
        onPointerClickRef.current = onPointerClick;
        onPointerMoveRef.current = onPointerMove;
        onPointerLeaveRef.current = onPointerLeave;
        shouldStartPointDragRef.current = shouldStartPointDrag;
        onPointerDragRef.current = onPointerDrag;
        onPointerDragEndRef.current = onPointerDragEnd;
        React8__namespace.useImperativeHandle(
          ref,
          () => ({
            getBoard: () => boardRef.current,
            getView3D: () => viewRef.current,
            getSvgElement: () => containerRef.current?.querySelector("svg") ?? null
          }),
          []
        );
        React8__namespace.useEffect(() => {
          const div = containerRef.current;
          if (!div) return;
          let cancelled = false;
          let JXG = null;
          let board = null;
          let svgEl = null;
          let handlePointerDown = null;
          let handlePointerMove = null;
          let handlePointerUp = null;
          let handlePointerLeave = null;
          let handleWheel = null;
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
                renderer: "svg",
                // Wheel zoom được tự xử lý bằng Ctrl/Cmd + wheel ở dưới (Excalidraw-style).
                zoom: { wheel: false }
              });
            } catch {
              return;
            }
            if (cancelled || !board) return;
            boardRef.current = board;
            const wheelBoard = board;
            handleWheel = (e) => {
              if (!e.ctrlKey && !e.metaKey) return;
              e.preventDefault();
              e.stopPropagation();
              let cx;
              let cy;
              try {
                const usr = wheelBoard.getUsrCoordsOfMouse?.(e);
                if (Array.isArray(usr) && usr.length === 2 && Number.isFinite(usr[0]) && Number.isFinite(usr[1])) {
                  cx = usr[0];
                  cy = usr[1];
                }
              } catch {
              }
              try {
                if (e.deltaY < 0) wheelBoard.zoomIn(cx, cy);
                else if (e.deltaY > 0) wheelBoard.zoomOut(cx, cy);
              } catch {
              }
            };
            div.addEventListener("wheel", handleWheel, { passive: false });
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
                  // JSXGraph view3d đọc giá trị khởi tạo từ az.slider.start (không
                  // phải az.value). Pass nhầm `value` → JSXGraph dùng default
                  // 1.0/0.3, khiến DEFAULT_VIEW3D bị bỏ qua.
                  az: { ...baseAttrs.az, slider: { ...baseAttrs.az.slider, start: DEFAULT_VIEW3D.azimuth } },
                  el: { ...baseAttrs.el, slider: { ...baseAttrs.el.slider, start: DEFAULT_VIEW3D.elevation } }
                }
              );
            } catch {
            }
            viewRef.current = view;
            if (view) {
              try {
                view.create(
                  "plane3d",
                  [
                    [0, 0, 0],
                    [1, 0, 0],
                    [0, 1, 0],
                    GROUND_PLANE_RANGE,
                    GROUND_PLANE_RANGE
                  ],
                  GROUND_PLANE_ATTRS(isDark)
                );
              } catch {
              }
              onView3DReadyRef.current?.(view, board);
            }
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
              const DRAG_THRESHOLD = 4;
              const AZ_PER_PX = 0.01;
              const EL_PER_PX = 0.01;
              const EL_LIMIT = Math.PI / 2 - 0.05;
              let dragStart = null;
              let dragging = false;
              let pointDragMode = false;
              let startAz = 0;
              let startEl = 0;
              const readAng = (s) => {
                if (!s) return 0;
                if (typeof s.Value === "function") {
                  try {
                    return s.Value();
                  } catch {
                  }
                }
                return typeof s.value === "number" ? s.value : 0;
              };
              const setAng = (s, v) => {
                if (!s) return;
                if (typeof s.setValue === "function") {
                  try {
                    s.setValue(v);
                    return;
                  } catch {
                  }
                }
                s.value = v;
              };
              handlePointerDown = (e) => {
                if (!svgEl) return;
                dragStart = { x: e.clientX, y: e.clientY };
                dragging = false;
                pointDragMode = false;
                const screen = pixelToUser(e);
                try {
                  pointDragMode = shouldStartPointDragRef.current?.(screen) ?? false;
                } catch {
                  pointDragMode = false;
                }
                if (!pointDragMode) {
                  const v = viewRef.current;
                  startAz = readAng(v?.az_slide ?? v?.az);
                  startEl = readAng(v?.el_slide ?? v?.el);
                }
                try {
                  svgEl.setPointerCapture?.(e.pointerId);
                } catch {
                }
              };
              handlePointerMove = (e) => {
                if (!svgEl) return;
                if (dragStart) {
                  const dx = e.clientX - dragStart.x;
                  const dy = e.clientY - dragStart.y;
                  if (!dragging && Math.hypot(dx, dy) > DRAG_THRESHOLD) dragging = true;
                  if (dragging) {
                    if (pointDragMode) {
                      onPointerDragRef.current?.(pixelToUser(e));
                      return;
                    }
                    const v = viewRef.current;
                    const newAz = startAz + dx * AZ_PER_PX;
                    let newEl = startEl - dy * EL_PER_PX;
                    if (newEl > EL_LIMIT) newEl = EL_LIMIT;
                    if (newEl < -EL_LIMIT) newEl = -EL_LIMIT;
                    setAng(v?.az_slide ?? v?.az, newAz);
                    setAng(v?.el_slide ?? v?.el, newEl);
                    try {
                      v?.board?.update?.();
                    } catch {
                    }
                    return;
                  }
                }
                onPointerMoveRef.current?.(pixelToUser(e));
              };
              handlePointerUp = (e) => {
                if (!svgEl) return;
                const wasDrag = dragging;
                const hadDown = dragStart !== null;
                const wasPointDrag = pointDragMode;
                dragStart = null;
                dragging = false;
                pointDragMode = false;
                try {
                  svgEl.releasePointerCapture?.(e.pointerId);
                } catch {
                }
                if (hadDown && wasPointDrag) {
                  onPointerDragEndRef.current?.(pixelToUser(e));
                  return;
                }
                if (hadDown && !wasDrag) {
                  onPointerClickRef.current?.(pixelToUser(e));
                }
              };
              handlePointerLeave = () => {
                if (pointDragMode) {
                  try {
                    onPointerDragEndRef.current?.({ x: 0, y: 0 });
                  } catch {
                  }
                }
                dragStart = null;
                dragging = false;
                pointDragMode = false;
                onPointerLeaveRef.current?.();
              };
              svgEl.addEventListener("pointerdown", handlePointerDown);
              svgEl.addEventListener("pointermove", handlePointerMove);
              svgEl.addEventListener("pointerup", handlePointerUp);
              svgEl.addEventListener("pointercancel", handlePointerUp);
              svgEl.addEventListener("pointerleave", handlePointerLeave);
            }
          })();
          return () => {
            cancelled = true;
            if (handleWheel) {
              div.removeEventListener("wheel", handleWheel);
              handleWheel = null;
            }
            if (svgEl) {
              if (handlePointerDown) svgEl.removeEventListener("pointerdown", handlePointerDown);
              if (handlePointerMove) svgEl.removeEventListener("pointermove", handlePointerMove);
              if (handlePointerUp) {
                svgEl.removeEventListener("pointerup", handlePointerUp);
                svgEl.removeEventListener("pointercancel", handlePointerUp);
              }
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
var EditorPanel;
var init_EditorPanel2 = __esm({
  "src/stamps/geometry-3d/editor/EditorPanel.tsx"() {
    "use client";
    init_scene();
    init_JxgRenderer3D();
    init_controller();
    init_hitTest2();
    init_rayCast();
    init_intersect();
    init_constraintMath();
    init_ensurePoint();
    init_MiniBoard3D();
    init_StatusHint();
    init_theme2();
    init_serialize2();
    EditorPanel = React8__namespace.forwardRef(
      function EditorPanel2(props, ref) {
        const {
          isDark: isDarkProp,
          initialState,
          store,
          selectedTool,
          onSelectedToolChange,
          showAxis,
          showGrid,
          onReadyChange,
          onHistoryChange
        } = props;
        const isDark = isDarkProp ?? false;
        const controllerRef = React8__namespace.useRef(null);
        if (!controllerRef.current) controllerRef.current = new ToolController(store);
        const [hint, setHint] = React8__namespace.useState("Ch\u1ECDn c\xF4ng c\u1EE5 trong b\u1EA3ng b\xEAn tr\xE1i");
        const [hoverLabel, setHoverLabel] = React8__namespace.useState(null);
        const boardRef = React8__namespace.useRef(null);
        const rendererRef = React8__namespace.useRef(null);
        const onSelectedToolChangeRef = React8__namespace.useRef(onSelectedToolChange);
        onSelectedToolChangeRef.current = onSelectedToolChange;
        const onHistoryChangeRef = React8__namespace.useRef(onHistoryChange);
        onHistoryChangeRef.current = onHistoryChange;
        const selectedToolRef = React8__namespace.useRef(selectedTool);
        selectedToolRef.current = selectedTool;
        const draggedPointRef = React8__namespace.useRef(null);
        const dragStartRef = React8__namespace.useRef(null);
        const dragSnapshotRef = React8__namespace.useRef(null);
        const dragMutatedRef = React8__namespace.useRef(false);
        React8__namespace.useEffect(() => {
          if (initialState?.state) {
            const loaded = initialState.state;
            store.withoutHistory(() => {
              store.dispatch({ type: "LOAD", payload: { state: loaded } });
            });
          }
        }, []);
        React8__namespace.useEffect(() => {
          const ctrl = controllerRef.current;
          const unsub = ctrl.on((state) => {
            setHint(state.hint);
            onSelectedToolChangeRef.current(state.tool?.key ?? "move");
          });
          return unsub;
        }, []);
        React8__namespace.useEffect(() => {
          onHistoryChangeRef.current?.(store.canUndo(), store.canRedo());
          const unsub = store.subscribe(() => {
            onHistoryChangeRef.current?.(store.canUndo(), store.canRedo());
          });
          return unsub;
        }, [store]);
        React8__namespace.useEffect(() => {
          controllerRef.current?.selectTool(selectedTool);
        }, [selectedTool]);
        React8__namespace.useEffect(() => {
          const onKey = (e) => {
            const ae = document.activeElement;
            const inField = !!(ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.isContentEditable));
            if (inField) return;
            if (!(e.metaKey || e.ctrlKey)) return;
            const key = e.key.toLowerCase();
            if (key === "z" && !e.shiftKey) {
              e.preventDefault();
              e.stopPropagation();
              store.undo();
            } else if (key === "z" && e.shiftKey || key === "y" && !e.shiftKey) {
              e.preventDefault();
              e.stopPropagation();
              store.redo();
            }
          };
          window.addEventListener("keydown", onKey, { capture: true });
          return () => window.removeEventListener("keydown", onKey, { capture: true });
        }, [store]);
        React8__namespace.useEffect(() => {
          return () => {
            rendererRef.current?.dispose();
            rendererRef.current = null;
          };
        }, []);
        React8__namespace.useEffect(() => {
          const view = boardRef.current?.getView3D();
          const v = view;
          if (!v || typeof v.setAttribute !== "function") return;
          try {
            v.setAttribute({
              xAxis: { visible: showAxis },
              yAxis: { visible: showAxis },
              zAxis: { visible: showAxis },
              // GeoGebra-style: only the XY ground plane is shown; side walls stay hidden.
              xPlaneRear: { visible: false, mesh3d: { visible: false } },
              yPlaneRear: { visible: false, mesh3d: { visible: false } },
              zPlaneRear: { visible: showGrid, mesh3d: { visible: false } }
            });
            v.board?.update?.();
          } catch {
          }
        }, [showAxis, showGrid]);
        const handleView3DReady = React8__namespace.useCallback((view) => {
          rendererRef.current = new JxgRenderer3D(store, view);
          const savedView = initialState?.view;
          if (savedView) {
            try {
              const v = view;
              v?.az_slide?.setValue?.(savedView.azimuth);
              v?.el_slide?.setValue?.(savedView.elevation);
              v?.board?.update?.();
            } catch {
            }
          }
          onReadyChange?.(true);
        }, [onReadyChange, store, initialState]);
        const handleClick = React8__namespace.useCallback((screen) => {
          const board = boardRef.current;
          if (!board) return;
          const view = board.getView3D();
          if (!view) return;
          try {
            const hit = hitTest(screen, view, store.getState());
            controllerRef.current.consumeHit(hit);
          } catch {
          }
        }, [store]);
        const handleMove2 = React8__namespace.useCallback((screen) => {
          const board = boardRef.current;
          if (!board) return;
          const view = board.getView3D();
          if (!view) return;
          if (draggedPointRef.current) return;
          let hit;
          try {
            hit = hitTest(screen, view, store.getState());
          } catch {
            setHoverLabel(null);
            return;
          }
          if (hit.kind === "empty") setHoverLabel(null);
          else if (hit.kind === "existingPoint") {
            const obj = store.getState().objects[hit.pointId];
            setHoverLabel(obj?.label ?? null);
          } else if (hit.kind === "onGround") setHoverLabel("m\u1EB7t n\u1EC1n");
          else if (hit.kind === "onAxis") setHoverLabel(`tr\u1EE5c ${hit.axis.toUpperCase()}`);
          else if (hit.kind === "onPlane") setHoverLabel(`m\u1EB7t ph\u1EB3ng ${hit.planeId}`);
          else if (hit.kind === "onSphere") setHoverLabel(`m\u1EB7t c\u1EA7u ${hit.sphereId}`);
          else setHoverLabel(null);
        }, [store]);
        const shouldStartPointDrag = React8__namespace.useCallback((screen) => {
          const view = boardRef.current?.getView3D();
          if (!view) return false;
          const tool = selectedToolRef.current;
          if (tool !== "point" && tool !== "move") return false;
          let hit;
          try {
            hit = hitTest(screen, view, store.getState());
          } catch {
            return false;
          }
          if (hit.kind === "existingPoint") {
            const pt = store.getState().objects[hit.pointId];
            if (!pt || pt.kind !== "point3d") return false;
            dragSnapshotRef.current = store.getState();
            dragMutatedRef.current = false;
            draggedPointRef.current = hit.pointId;
            dragStartRef.current = {
              screen,
              world: constraintToWorld(pt.attrs.constraint, store.getState())
            };
            return true;
          }
          if (tool === "point" && (hit.kind === "onGround" || hit.kind === "onAxis")) {
            dragSnapshotRef.current = store.getState();
            dragMutatedRef.current = false;
            const constraint = hitToConstraint(hit);
            if (!constraint) {
              dragSnapshotRef.current = null;
              return false;
            }
            let id = null;
            store.withoutHistory(() => {
              const stateBefore = store.getState();
              const newId = `p${stateBefore.counter + 1}`;
              const label = nextLabel(stateBefore, "point3d");
              store.dispatch({
                type: "ADD",
                payload: {
                  obj: {
                    id: newId,
                    kind: "point3d",
                    label,
                    visible: true,
                    locked: false,
                    layer: "default",
                    schemaVersion: 1,
                    attrs: { constraint }
                  }
                }
              });
              id = newId;
            });
            if (!id) {
              dragSnapshotRef.current = null;
              return false;
            }
            draggedPointRef.current = id;
            dragStartRef.current = {
              screen,
              world: [hit.world[0], hit.world[1], hit.world[2]]
            };
            return true;
          }
          if (tool === "point") {
            dragSnapshotRef.current = null;
            draggedPointRef.current = null;
            dragStartRef.current = null;
            return true;
          }
          return false;
        }, [store]);
        const onPointerDrag = React8__namespace.useCallback((screen) => {
          const pointId = draggedPointRef.current;
          const start = dragStartRef.current;
          if (!pointId || !start) return;
          const view = boardRef.current?.getView3D();
          if (!view) return;
          const tool = selectedToolRef.current;
          let nextWorld;
          if (tool === "point") {
            const dz = screen.y - start.screen.y;
            nextWorld = [start.world[0], start.world[1], start.world[2] + dz];
          } else if (tool === "move") {
            try {
              const ray = screenToRay(screen, view);
              const hit = rayPlane(ray, { point: [0, 0, start.world[2]], normal: [0, 0, 1] });
              if (!hit) return;
              nextWorld = [hit.point[0], hit.point[1], start.world[2]];
            } catch {
              return;
            }
          } else {
            return;
          }
          const obj = store.getState().objects[pointId];
          if (!obj || obj.kind !== "point3d") return;
          const free = { kind: "free", x: nextWorld[0], y: nextWorld[1], z: nextWorld[2] };
          store.withoutHistory(() => {
            store.dispatch({ type: "UPDATE_ATTRS", payload: { id: pointId, patch: { constraint: free } } });
          });
          dragMutatedRef.current = true;
        }, [store]);
        const onPointerDragEnd = React8__namespace.useCallback(() => {
          const snap = dragSnapshotRef.current;
          dragSnapshotRef.current = null;
          draggedPointRef.current = null;
          dragStartRef.current = null;
          dragMutatedRef.current = false;
          if (snap) {
            const current = store.getState();
            store.withoutHistory(() => {
              store.dispatch({ type: "LOAD", payload: { state: snap } });
            });
            store.dispatch({ type: "LOAD", payload: { state: current } });
          }
        }, [store]);
        React8__namespace.useImperativeHandle(
          ref,
          () => ({
            hasContent: () => Object.keys(store.getState().objects).length > 0,
            serialize: () => {
              const view = boardRef.current?.getView3D();
              const v = view;
              const azSlider = v?.az_slide ?? v?.az;
              const elSlider = v?.el_slide ?? v?.el;
              const azimuth = typeof azSlider?.Value === "function" ? azSlider.Value() : 0;
              const elevation = typeof elSlider?.Value === "function" ? elSlider.Value() : 0;
              const viewInfo = {
                azimuth,
                elevation,
                bbox3D: [...DEFAULT_VIEW3D.bbox3D]
              };
              return serializeBoard3D(store.getState(), viewInfo);
            },
            setTool: (k) => controllerRef.current.selectTool(k),
            undo: () => store.undo(),
            redo: () => store.redo()
          }),
          [store]
        );
        return /* @__PURE__ */ jsxRuntime.jsxs(
          "div",
          {
            "data-testid": "editor-panel-3d",
            className: [
              isDark ? "theme--dark " : "",
              "flex h-full w-full min-w-0 flex-col overflow-hidden bg-white"
            ].join(""),
            children: [
              /* @__PURE__ */ jsxRuntime.jsx("div", { className: "min-h-0 flex-1", children: /* @__PURE__ */ jsxRuntime.jsx(
                MiniBoard3D,
                {
                  ref: boardRef,
                  isDark,
                  onView3DReady: handleView3DReady,
                  onPointerClick: handleClick,
                  onPointerMove: handleMove2,
                  onPointerLeave: () => setHoverLabel(null),
                  shouldStartPointDrag,
                  onPointerDrag,
                  onPointerDragEnd
                }
              ) }),
              /* @__PURE__ */ jsxRuntime.jsx(StatusHint, { hint, hoverLabel })
            ]
          }
        );
      }
    );
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
function symbolicFor(obj, state) {
  const n = (id) => state.objects[id]?.label ?? id;
  switch (obj.kind) {
    case "point3d": {
      const c = obj.attrs.constraint;
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
    case "segment3d": {
      const a = obj.attrs;
      return `Segment(${n(a.p1)}, ${n(a.p2)})`;
    }
    case "line3d": {
      const a = obj.attrs;
      return `Line(${n(a.p1)}, ${n(a.p2)})`;
    }
    case "ray3d": {
      const a = obj.attrs;
      return `Ray(${n(a.origin)}, ${n(a.through)})`;
    }
    case "vector3d": {
      const a = obj.attrs;
      return `Vector(${n(a.from)}, ${n(a.to)})`;
    }
    case "polygon3d": {
      const a = obj.attrs;
      return `Polygon(${a.vertices.map(n).join(", ")})`;
    }
    case "plane3d": {
      const a = obj.attrs;
      return `Plane(${n(a.p1)}, ${n(a.p2)}, ${n(a.p3)})`;
    }
    case "sphere3d": {
      const a = obj.attrs;
      return `Sphere(${n(a.center)}, ${n(a.surfacePoint)})`;
    }
    case "polyhedron3d": {
      const a = obj.attrs;
      const flavorVn = {
        pyramid: "Ch\xF3p",
        prism: "L\u0103ng tr\u1EE5",
        tetrahedron: "T\u1EE9 di\u1EC7n",
        cube: "L\u1EADp ph\u01B0\u01A1ng"
      };
      return `${flavorVn[a.flavor]}(${a.vertices.length} \u0111\u1EC9nh)`;
    }
    case "cylinder3d": {
      const a = obj.attrs;
      return `Cylinder(${n(a.baseCenter)}, ${n(a.topCenter)}, r=${a.radius})`;
    }
    case "cone3d": {
      const a = obj.attrs;
      return `Cone(${n(a.baseCenter)}, ${n(a.apex)}, r=${a.radius})`;
    }
  }
  return obj.label;
}
function numericFor(obj, state) {
  if (obj.kind === "point3d") {
    const w = constraintToWorld(obj.attrs.constraint, state);
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
  const [open, setOpen] = React8__namespace.useState(false);
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
  const { obj, state, onDelete } = props;
  const symbolic = symbolicFor(obj, state);
  const numeric = numericFor(obj, state);
  const color = obj.attrs.color ?? "#0066cc";
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
            style: { backgroundColor: color }
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
  const { store } = props;
  const state = React8__namespace.useSyncExternalStore(store.subscribe, store.getState, store.getState);
  const objects = listObjects(state);
  return /* @__PURE__ */ jsxRuntime.jsx(
    "ul",
    {
      "data-testid": "algebra-list",
      className: "flex max-h-[calc(100vh-200px)] flex-col overflow-y-auto",
      children: objects.length === 0 ? /* @__PURE__ */ jsxRuntime.jsx("li", { className: "px-3 py-4 text-center text-xs text-zinc-500", children: "Ch\u01B0a c\xF3 \u0111\u1ED1i t\u01B0\u1EE3ng n\xE0o" }) : objects.map((o) => /* @__PURE__ */ jsxRuntime.jsx(
        AlgebraRow,
        {
          obj: o,
          state,
          onDelete: (id) => store.dispatch({ type: "DELETE", payload: { id } })
        },
        o.id
      ))
    }
  );
}
var init_AlgebraList = __esm({
  "src/stamps/geometry-3d/editor/algebraPanel/AlgebraList.tsx"() {
    "use client";
    init_scene();
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
function RedoIcon2() {
  return /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [
    /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M21 10 L16 5 L16 8 L9 8 A5 5 0 0 0 4 13 L4 16" }),
    /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M21 10 L16 15 L16 12" })
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
  const [hover, setHover] = React8__namespace.useState(null);
  const [portalReady, setPortalReady] = React8__namespace.useState(false);
  const hoverTimerRef = React8__namespace.useRef(null);
  React8__namespace.useEffect(() => {
    setPortalReady(true);
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);
  const showHover = React8__namespace.useCallback((next) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => setHover(next), TOOLTIP_DELAY_MS2);
  }, []);
  const hideHover = React8__namespace.useCallback(() => {
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
    store,
    selectedTool,
    onSelectTool,
    showAxis,
    showGrid,
    onShowAxisChange,
    onShowGridChange,
    onUndo,
    canUndo,
    onRedo,
    canRedo,
    onClose,
    isDark,
    chordGroup
  } = props;
  const [tab, setTab] = React8__namespace.useState("tools");
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
          /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "ml-auto flex items-center gap-0.5", children: [
            /* @__PURE__ */ jsxRuntime.jsx(
              "button",
              {
                type: "button",
                onClick: onUndo,
                disabled: !canUndo,
                title: "Ho\xE0n t\xE1c (Ctrl/Cmd+Z)",
                "aria-label": "Ho\xE0n t\xE1c",
                "data-testid": "undo-btn",
                className: "inline-flex items-center justify-center rounded p-1 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent",
                children: /* @__PURE__ */ jsxRuntime.jsx(UndoIcon2, {})
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
                children: /* @__PURE__ */ jsxRuntime.jsx(RedoIcon2, {})
              }
            )
          ] })
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
      ] }) : /* @__PURE__ */ jsxRuntime.jsx("section", { "data-testid": "algebra-panel", children: /* @__PURE__ */ jsxRuntime.jsx(AlgebraList, { store }) })
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
    onRedo,
    canRedo,
    isDark,
    drawerOpen,
    onDrawerClose
  } = props;
  const groups = React8__namespace.useMemo(
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
          disabled: !canUndo,
          testId: "undo-btn"
        },
        {
          label: "L\xE0m l\u1EA1i",
          title: "L\xE0m l\u1EA1i (Ctrl/Cmd+Shift+Z)",
          icon: /* @__PURE__ */ jsxRuntime.jsx(RedoIcon2, {}),
          onClick: onRedo,
          disabled: !canRedo,
          testId: "redo-btn"
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

// src/stamps/geometry-3d/host.tsx
var host_exports3 = {};
__export(host_exports3, {
  Geometry3DStampHost: () => Geometry3DStampHost
});
function parseInitial(editingElement) {
  if (!editingElement) return null;
  if (!isGeometry3DCustomData(editingElement.customData)) return null;
  try {
    return parseSerializedBoard3D(JSON.parse(editingElement.customData.jsonState));
  } catch {
    return null;
  }
}
var Geometry3DStampHost;
var init_host3 = __esm({
  "src/stamps/geometry-3d/host.tsx"() {
    "use client";
    init_EditorPanel2();
    init_LeftPanel3();
    init_scene();
    init_groups();
    init_useChordShortcut();
    init_insertImage();
    init_useIsMobile();
    init_render3();
    init_serialize2();
    Geometry3DStampHost = React8.forwardRef(
      function Geometry3DStampHost2({ api, editingElement, onClose, isDark }, ref) {
        const editorRef = React8.useRef(null);
        const storeRef = React8.useRef(null);
        if (!storeRef.current) storeRef.current = createStore(createEmptyState("3d"));
        const { isMobile } = useIsMobile();
        const [drawerOpen, setDrawerOpen] = React8.useState(false);
        const [ready, setReady] = React8.useState(false);
        const [selectedTool, setSelectedTool] = React8.useState("move");
        const [showAxis, setShowAxis] = React8.useState(true);
        const [showGrid, setShowGrid] = React8.useState(true);
        const [canUndo, setCanUndo] = React8.useState(false);
        const [canRedo, setCanRedo] = React8.useState(false);
        const [hasContent, setHasContent] = React8.useState(false);
        const handleHistoryChange = React8.useCallback((u, r) => {
          setCanUndo(u);
          setCanRedo(r);
        }, []);
        React8.useEffect(() => {
          const store = storeRef.current;
          if (!store) return;
          const sync = () => setHasContent(Object.keys(store.getState().objects).length > 0);
          sync();
          const unsub = store.subscribe(sync);
          return unsub;
        }, []);
        const handleUndo = React8.useCallback(() => {
          editorRef.current?.undo();
        }, []);
        const handleRedo = React8.useCallback(() => {
          editorRef.current?.redo();
        }, []);
        const initial = React8.useMemo(
          () => parseInitial(editingElement),
          [editingElement]
        );
        const { chordGroup } = useChordShortcut({
          groupOrder: GROUP_ORDER2,
          tools: TOOLS_FLAT,
          onSelect: (key) => {
            setSelectedTool(key);
            editorRef.current?.setTool(key);
          },
          enabled: !isMobile
        });
        const handleSelectTool = React8.useCallback((k) => {
          setSelectedTool(k);
          editorRef.current?.setTool(k);
        }, []);
        const performInsert = React8.useCallback(
          async (board, width, height, svgString) => {
            if (!api) return;
            const jsonState = JSON.stringify(board);
            await insertStampImage(api, {
              svgString,
              makeCustomData: () => ({
                kind: "geometry3d",
                // Bump customData.version vẫn 2 (đã được hỗ trợ ở isGeometry3DCustomData)
                // — payload bên trong là envelope v2 mới của state.
                version: 2,
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
        const tryInsert = React8.useCallback(() => {
          if (!editorRef.current) return false;
          if (!editorRef.current.hasContent()) return false;
          const board = editorRef.current.serialize();
          if (Object.keys(board.state.objects).length === 0) return false;
          void (async () => {
            try {
              const jsonState = JSON.stringify(board);
              const { svgString, width, height } = await renderGeometry3DSvgFromState(jsonState);
              await performInsert(board, width, height, svgString);
            } catch (err) {
              console.error("Geometry3D insert failed:", err);
            }
          })();
          return true;
        }, [performInsert]);
        React8.useImperativeHandle(
          ref,
          () => ({
            tryInsert,
            hasContent: () => editorRef.current?.hasContent() ?? false
          }),
          [tryInsert]
        );
        const handleEditorInsert = React8.useCallback(
          (board, width, height, svgString) => {
            void performInsert(board, width, height, svgString);
          },
          [performInsert]
        );
        const dialogStyle = isMobile ? { position: "fixed", inset: 0, zIndex: 40 } : {
          position: "absolute",
          top: "50%",
          left: "calc(50% + 120px)",
          transform: "translate(-50%, -50%)",
          zIndex: 40
        };
        return /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
          !isMobile && /* @__PURE__ */ jsxRuntime.jsx(
            LeftPanel3,
            {
              store: storeRef.current,
              selectedTool,
              onSelectTool: handleSelectTool,
              showAxis,
              showGrid,
              onShowAxisChange: setShowAxis,
              onShowGridChange: setShowGrid,
              onUndo: handleUndo,
              canUndo,
              onRedo: handleRedo,
              canRedo,
              onClose,
              isDark,
              chordGroup
            }
          ),
          /* @__PURE__ */ jsxRuntime.jsxs(
            "div",
            {
              role: "dialog",
              "aria-label": "D\u1EF1ng h\xECnh h\u1ECDc 3D",
              "data-testid": "geom3d-host",
              "data-stamp-area": "true",
              style: dialogStyle,
              className: [
                isDark ? "theme--dark " : "",
                "flex flex-col overflow-hidden bg-white",
                isMobile ? "h-full w-full" : "h-[600px] max-h-[85vh] w-[800px] max-w-[calc(100vw-320px)] rounded-lg border border-slate-300 shadow-2xl ring-1 ring-black/5"
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
                      disabled: !ready || !hasContent,
                      title: !hasContent ? "V\u1EBD \xEDt nh\u1EA5t m\u1ED9t \u0111\u1ED1i t\u01B0\u1EE3ng tr\u01B0\u1EDBc khi ch\xE8n" : void 0,
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
                    store: storeRef.current,
                    selectedTool,
                    onSelectedToolChange: setSelectedTool,
                    showAxis,
                    showGrid,
                    onReadyChange: setReady,
                    onHistoryChange: handleHistoryChange
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
                        disabled: !ready || !hasContent,
                        title: !hasContent ? "V\u1EBD \xEDt nh\u1EA5t m\u1ED9t \u0111\u1ED1i t\u01B0\u1EE3ng tr\u01B0\u1EDBc khi ch\xE8n" : void 0,
                        "data-testid": "geom3d-insert-btn",
                        className: "rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50",
                        children: "Ch\xE8n"
                      }
                    )
                  ] })
                ] })
              ]
            }
          ),
          isMobile && /* @__PURE__ */ jsxRuntime.jsx(
            LeftPanel3,
            {
              store: storeRef.current,
              selectedTool,
              onSelectTool: handleSelectTool,
              showAxis,
              showGrid,
              onShowAxisChange: setShowAxis,
              onShowGridChange: setShowGrid,
              onUndo: handleUndo,
              canUndo,
              onRedo: handleRedo,
              canRedo,
              onClose,
              isDark,
              isMobile: true,
              drawerOpen,
              onDrawerClose: () => setDrawerOpen(false),
              chordGroup
            }
          )
        ] });
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

// src/stamps/graph-2d/evaluator.ts
function tokenize(src) {
  const tokens = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === " " || ch === "	" || ch === "\n" || ch === "\r") {
      i++;
      continue;
    }
    if (ch >= "0" && ch <= "9" || ch === ".") {
      let j = i;
      let hasDot = false;
      let hasExp = false;
      while (j < src.length) {
        const c = src[j];
        if (c >= "0" && c <= "9") {
          j++;
        } else if (c === "." && !hasDot && !hasExp) {
          hasDot = true;
          j++;
        } else if ((c === "e" || c === "E") && !hasExp) {
          hasExp = true;
          j++;
          if (src[j] === "+" || src[j] === "-") j++;
        } else {
          break;
        }
      }
      const raw = src.slice(i, j);
      if (!/[0-9]/.test(raw)) {
        throw new Error(`S\u1ED1 kh\xF4ng h\u1EE3p l\u1EC7 t\u1EA1i v\u1ECB tr\xED ${i}: "${raw}"`);
      }
      tokens.push({ type: "NUMBER", value: raw, pos: i });
      i = j;
      continue;
    }
    if (ch >= "a" && ch <= "z" || ch >= "A" && ch <= "Z") {
      let j = i;
      while (j < src.length) {
        const c = src[j];
        if (c >= "a" && c <= "z" || c >= "A" && c <= "Z" || c >= "0" && c <= "9" || c === "_") {
          j++;
        } else {
          break;
        }
      }
      tokens.push({ type: "IDENT", value: src.slice(i, j), pos: i });
      i = j;
      continue;
    }
    if (OPERATORS.has(ch)) {
      tokens.push({ type: "OP", value: ch, pos: i });
      i++;
      continue;
    }
    if (ch === "(") {
      tokens.push({ type: "LPAREN", value: ch, pos: i });
      i++;
      continue;
    }
    if (ch === ")") {
      tokens.push({ type: "RPAREN", value: ch, pos: i });
      i++;
      continue;
    }
    if (ch === ",") {
      tokens.push({ type: "COMMA", value: ch, pos: i });
      i++;
      continue;
    }
    throw new Error(`K\xFD t\u1EF1 kh\xF4ng h\u1EE3p l\u1EC7 t\u1EA1i v\u1ECB tr\xED ${i}: "${ch}"`);
  }
  return tokens;
}
function parseAst(src) {
  const tokens = tokenize(src);
  if (tokens.length === 0) throw new Error("Bi\u1EC3u th\u1EE9c r\u1ED7ng");
  const p = new Parser(tokens);
  return p.parseExpression();
}
function evaluate(node, env) {
  switch (node.kind) {
    case "num":
      return node.value;
    case "ident": {
      const name = node.name;
      if (name === "x") return env.x;
      if (Object.prototype.hasOwnProperty.call(ALLOWED_CONSTANTS, name)) {
        return ALLOWED_CONSTANTS[name];
      }
      if (name.length === 1 && Object.prototype.hasOwnProperty.call(env.params, name)) {
        return env.params[name];
      }
      throw new Error(`Identifier kh\xF4ng h\u1EE3p l\u1EC7: "${name}"`);
    }
    case "unary": {
      const v = evaluate(node.arg, env);
      return node.op === "-" ? -v : +v;
    }
    case "binary": {
      const a = evaluate(node.lhs, env);
      const b = evaluate(node.rhs, env);
      switch (node.op) {
        case "+":
          return a + b;
        case "-":
          return a - b;
        case "*":
          return a * b;
        case "/":
          return a / b;
        // có thể trả Infinity/NaN — đúng theo IEEE 754
        case "^":
          return Math.pow(a, b);
      }
      throw new Error(`To\xE1n t\u1EED kh\xF4ng h\u1ED7 tr\u1EE3: "${node.op}"`);
    }
    case "call": {
      const fn = ALLOWED_FUNCTIONS[node.name];
      if (typeof fn !== "function") {
        throw new Error(`H\xE0m kh\xF4ng h\u1EE3p l\u1EC7: "${node.name}"`);
      }
      const args = node.args.map((a) => evaluate(a, env));
      return fn(...args);
    }
  }
}
function collectFreeVars(node, out = /* @__PURE__ */ new Set()) {
  switch (node.kind) {
    case "num":
      return out;
    case "ident": {
      const name = node.name;
      if (name === "x") return out;
      if (Object.prototype.hasOwnProperty.call(ALLOWED_CONSTANTS, name)) return out;
      if (name.length === 1) out.add(name);
      return out;
    }
    case "unary":
      return collectFreeVars(node.arg, out);
    case "binary":
      collectFreeVars(node.lhs, out);
      collectFreeVars(node.rhs, out);
      return out;
    case "call":
      for (const a of node.args) collectFreeVars(a, out);
      return out;
  }
}
function checkIdentifiers(node) {
  switch (node.kind) {
    case "num":
      return null;
    case "ident": {
      const name = node.name;
      if (name === "x") return null;
      if (Object.prototype.hasOwnProperty.call(ALLOWED_CONSTANTS, name)) return null;
      if (name.length === 1) return null;
      return `T\xEAn kh\xF4ng h\u1EE3p l\u1EC7: "${name}"`;
    }
    case "unary":
      return checkIdentifiers(node.arg);
    case "binary":
      return checkIdentifiers(node.lhs) ?? checkIdentifiers(node.rhs);
    case "call": {
      if (!Object.prototype.hasOwnProperty.call(ALLOWED_FUNCTIONS, node.name)) {
        return `T\xEAn h\xE0m kh\xF4ng h\u1EE3p l\u1EC7: "${node.name}"`;
      }
      for (const a of node.args) {
        const e = checkIdentifiers(a);
        if (e) return e;
      }
      return null;
    }
  }
}
var ALLOWED_FUNCTIONS, ALLOWED_CONSTANTS, OPERATORS, Parser, ALLOWED_FUNCTION_NAMES;
var init_evaluator = __esm({
  "src/stamps/graph-2d/evaluator.ts"() {
    ALLOWED_FUNCTIONS = {
      sin: Math.sin,
      cos: Math.cos,
      tan: Math.tan,
      asin: Math.asin,
      acos: Math.acos,
      atan: Math.atan,
      log: Math.log10,
      // log = log10 (khớp với rewriteToJs)
      ln: Math.log,
      // ln = log tự nhiên
      exp: Math.exp,
      sqrt: Math.sqrt,
      abs: Math.abs,
      floor: Math.floor,
      ceil: Math.ceil,
      round: Math.round
    };
    ALLOWED_CONSTANTS = {
      pi: Math.PI,
      e: Math.E
    };
    OPERATORS = /* @__PURE__ */ new Set(["+", "-", "*", "/", "^"]);
    Parser = class {
      constructor(tokens) {
        this.tokens = tokens;
        this.pos = 0;
      }
      peek() {
        return this.tokens[this.pos];
      }
      consume() {
        const t = this.tokens[this.pos++];
        if (!t) throw new Error("C\xFA ph\xE1p: h\u1EBFt token s\u1EDBm");
        return t;
      }
      parseExpression() {
        const node = this.parseAddSub();
        if (this.pos < this.tokens.length) {
          const t = this.tokens[this.pos];
          throw new Error(`C\xFA ph\xE1p: token th\u1EEBa "${t.value}" t\u1EA1i v\u1ECB tr\xED ${t.pos}`);
        }
        return node;
      }
      // + - (left assoc)
      parseAddSub() {
        let lhs = this.parseMulDiv();
        while (true) {
          const t = this.peek();
          if (t && t.type === "OP" && (t.value === "+" || t.value === "-")) {
            this.consume();
            const rhs = this.parseMulDiv();
            lhs = { kind: "binary", op: t.value, lhs, rhs };
          } else {
            break;
          }
        }
        return lhs;
      }
      // * / (left assoc)
      parseMulDiv() {
        let lhs = this.parseUnary();
        while (true) {
          const t = this.peek();
          if (t && t.type === "OP" && (t.value === "*" || t.value === "/")) {
            this.consume();
            const rhs = this.parseUnary();
            lhs = { kind: "binary", op: t.value, lhs, rhs };
          } else {
            break;
          }
        }
        return lhs;
      }
      // unary + - (right assoc) sau đó parsePow
      parseUnary() {
        const t = this.peek();
        if (t && t.type === "OP" && (t.value === "+" || t.value === "-")) {
          this.consume();
          const arg = this.parseUnary();
          return { kind: "unary", op: t.value, arg };
        }
        return this.parsePow();
      }
      // ^ (right assoc)
      parsePow() {
        const lhs = this.parsePrimary();
        const t = this.peek();
        if (t && t.type === "OP" && t.value === "^") {
          this.consume();
          const rhs = this.parseUnary();
          return { kind: "binary", op: "^", lhs, rhs };
        }
        return lhs;
      }
      parsePrimary() {
        const t = this.peek();
        if (!t) throw new Error("C\xFA ph\xE1p: thi\u1EBFu bi\u1EC3u th\u1EE9c");
        if (t.type === "NUMBER") {
          this.consume();
          const v = Number(t.value);
          return { kind: "num", value: v };
        }
        if (t.type === "IDENT") {
          this.consume();
          const next = this.peek();
          if (next && next.type === "LPAREN") {
            this.consume();
            const args = [];
            const lookahead = this.peek();
            if (!lookahead || lookahead.type !== "RPAREN") {
              args.push(this.parseAddSub());
              while (true) {
                const nx = this.peek();
                if (nx && nx.type === "COMMA") {
                  this.consume();
                  args.push(this.parseAddSub());
                } else {
                  break;
                }
              }
            }
            const close = this.peek();
            if (!close || close.type !== "RPAREN") {
              throw new Error(`C\xFA ph\xE1p: thi\u1EBFu ")" sau h\xE0m "${t.value}"`);
            }
            this.consume();
            return { kind: "call", name: t.value, args };
          }
          return { kind: "ident", name: t.value };
        }
        if (t.type === "LPAREN") {
          this.consume();
          const inner = this.parseAddSub();
          const close = this.peek();
          if (!close || close.type !== "RPAREN") {
            throw new Error('C\xFA ph\xE1p: thi\u1EBFu ")"');
          }
          this.consume();
          return inner;
        }
        throw new Error(`C\xFA ph\xE1p: token b\u1EA5t ng\u1EDD "${t.value}" t\u1EA1i v\u1ECB tr\xED ${t.pos}`);
      }
    };
    ALLOWED_FUNCTION_NAMES = new Set(Object.keys(ALLOWED_FUNCTIONS));
    new Set(Object.keys(ALLOWED_CONSTANTS));
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
  let tokens;
  try {
    tokens = tokenize(trimmed);
  } catch {
    return errResult("L\u1ED7i c\xFA ph\xE1p");
  }
  const earlyFree = /* @__PURE__ */ new Set();
  for (const tok of tokens) {
    if (tok.type !== "IDENT") continue;
    const id = tok.value;
    if (id === "x" || id === "pi" || id === "e") continue;
    if (ALLOWED_FUNCTIONS2.has(id)) continue;
    if (id.length === 1) {
      earlyFree.add(id);
      continue;
    }
    const hint = SUGGESTIONS[id];
    return errResult(
      hint ? `T\xEAn h\xE0m kh\xF4ng h\u1EE3p l\u1EC7: "${id}". B\u1EA1n c\xF3 \xFD l\xE0 "${hint}" kh\xF4ng?` : `T\xEAn kh\xF4ng h\u1EE3p l\u1EC7: "${id}"`
    );
  }
  let ast;
  try {
    ast = parseAst(trimmed);
  } catch {
    return errResult("L\u1ED7i c\xFA ph\xE1p");
  }
  const idErr = checkIdentifiers(ast);
  if (idErr) return errResult(idErr);
  const freeVars = collectFreeVars(ast);
  for (const v of earlyFree) freeVars.add(v);
  return { ok: true, freeVars };
}
function compile(expr, paramValues) {
  const v = validate(expr);
  if (!v.ok) return { error: v.error ?? "Invalid" };
  let ast;
  try {
    ast = parseAst(expr.trim());
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
  return (x) => {
    try {
      const y = evaluate(ast, { x, params: paramValues });
      return typeof y === "number" ? y : NaN;
    } catch {
      return NaN;
    }
  };
}
var ALLOWED_FUNCTIONS2, ALLOWED_CHARS, SUGGESTIONS;
var init_parser = __esm({
  "src/stamps/graph-2d/parser.ts"() {
    init_evaluator();
    ALLOWED_FUNCTIONS2 = ALLOWED_FUNCTION_NAMES;
    ALLOWED_CHARS = /^[a-zA-Z0-9_.+\-*/^()\s,]+$/;
    SUGGESTIONS = {
      tg: "tan",
      arcsin: "asin",
      arccos: "acos",
      arctan: "atan"
    };
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
var init_render4 = __esm({
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
var init_types5 = __esm({
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
  const [draft, setDraft] = React8.useState(expression);
  React8.useEffect(() => {
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
  return /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [
    /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M3 10 L8 5 L8 8 L15 8 A5 5 0 0 1 20 13 L20 16" }),
    /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M3 10 L8 15 L8 12" })
  ] });
}
function RedoIcon3() {
  return /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [
    /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M21 10 L16 5 L16 8 L9 8 A5 5 0 0 0 4 13 L4 16" }),
    /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M21 10 L16 15 L16 12" })
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
          "data-testid": "undo-btn",
          className: "inline-flex items-center justify-center rounded p-1 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent",
          children: /* @__PURE__ */ jsxRuntime.jsx(UndoIcon3, {})
        }
      ),
      /* @__PURE__ */ jsxRuntime.jsx(
        "button",
        {
          type: "button",
          onClick: props.onRedo,
          disabled: !props.canRedo,
          title: "L\xE0m l\u1EA1i (Ctrl/Cmd+Shift+Z)",
          "aria-label": "L\xE0m l\u1EA1i",
          "data-testid": "redo-btn",
          className: "inline-flex items-center justify-center rounded p-1 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent",
          children: /* @__PURE__ */ jsxRuntime.jsx(RedoIcon3, {})
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
  const containerRef = React8.useRef(null);
  const boardRef = React8.useRef(null);
  const curvesRef = React8.useRef(/* @__PURE__ */ new Map());
  React8.useEffect(() => {
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
  React8.useEffect(() => {
    if (!boardRef.current) return;
    syncObjects(boardRef.current, graph, curvesRef.current);
  }, [graph]);
  React8.useEffect(() => {
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
    init_render4();
    init_colors();
    init_handlers2();
    GraphEditorPanel = React8.forwardRef(function GraphEditorPanel2(props, ref) {
      const initialGraph = props.initialState ?? EMPTY_GRAPH;
      const graphRef = React8.useRef(initialGraph);
      const [, forceUpdate] = React8.useState(0);
      const [errors, setErrors] = React8.useState({});
      const [tool, setToolState] = React8.useState("move");
      const undoStackRef = React8.useRef([]);
      const redoStackRef = React8.useRef([]);
      const idCounterRef = React8.useRef(1);
      const toolRef = React8.useRef(tool);
      toolRef.current = tool;
      const intersectFirstRef = React8.useRef(null);
      const propsRef = React8.useRef(props);
      propsRef.current = props;
      const initialGraphNotifiedRef = React8.useRef(false);
      const pushUndo = React8.useCallback((g) => {
        undoStackRef.current.push(g);
        if (undoStackRef.current.length > 30) undoStackRef.current.shift();
        redoStackRef.current = [];
      }, []);
      const setErrorsWithNotify = React8.useCallback(
        (updater) => {
          setErrors((prev) => {
            const next = updater(prev);
            propsRef.current.onErrorsChange?.(next);
            return next;
          });
        },
        []
      );
      const notifyStateChange = React8.useCallback((g, t) => {
        propsRef.current.onStateChange({
          tool: t,
          showAxis: g.view.showAxis,
          showGrid: g.view.showGrid,
          canUndo: undoStackRef.current.length > 0,
          canRedo: redoStackRef.current.length > 0
        });
      }, []);
      const updateGraph = React8.useCallback(
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
      const doUndo = React8.useCallback(() => {
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
      const doRedo = React8.useCallback(() => {
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
      React8.useEffect(() => {
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
      const onBoardEvent = React8.useCallback((ev) => {
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
      React8.useImperativeHandle(
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
      React8.useEffect(() => {
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
    init_types5();
    INITIAL_GRAPH_STATE = {
      tool: "move",
      showAxis: true,
      showGrid: true,
      canUndo: false,
      canRedo: false
    };
    Graph2DStampHost = React8.forwardRef(
      function Graph2DStampHost2({ api, editingElement, onClose, isDark }, ref) {
        const panelRef = React8.useRef(null);
        const [graphUIState, setGraphUIState] = React8.useState(INITIAL_GRAPH_STATE);
        const { isMobile } = useIsMobile();
        const [drawerOpen, setDrawerOpen] = React8.useState(false);
        const initialState = React8.useMemo(() => {
          if (!editingElement) return null;
          if (!isGraph2DCustomData(editingElement.customData)) return null;
          return parseSerializedGraph(editingElement.customData.jsonState);
        }, [editingElement]);
        const [graphSnapshot, setGraphSnapshot] = React8.useState(
          initialState ?? EMPTY_GRAPH
        );
        const [errorsSnapshot, setErrorsSnapshot] = React8.useState({});
        const handleInsert = React8.useCallback(
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
        React8.useImperativeHandle(
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
init_types2();
var GeometryStampHost3 = React8.lazy(
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
init_types3();
var LatexStampHost3 = React8.lazy(
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
init_render3();
var Geometry3DStampHost3 = React8.lazy(
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
init_render4();
init_types5();
var Graph2DStampHost3 = React8.lazy(
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
  const [menuMount, setMenuMount] = React8.useState(null);
  const menuMountRef = React8.useRef(null);
  React8.useEffect(() => {
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
    let observedRoot = null;
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
    const attachObserver = () => {
      if (cancelled) return;
      const excalidraw = document.querySelector(".excalidraw");
      const nextRoot = excalidraw ?? document.body;
      if (observedRoot === nextRoot) return;
      observer?.disconnect();
      observedRoot = nextRoot;
      observer = new MutationObserver(onMutation);
      observer.observe(nextRoot, { childList: true, subtree: true });
    };
    const onMutation = () => {
      if (rafId != null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (cancelled) return;
        if (observedRoot !== document.querySelector(".excalidraw")) {
          attachObserver();
        }
        findMenu();
      });
    };
    findMenu();
    attachObserver();
    return () => {
      cancelled = true;
      if (rafId != null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      observer?.disconnect();
      observer = null;
      observedRoot = null;
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
      stamps.map((stamp) => {
        const { displayLabel, shortcut } = splitTitleAndShortcut(
          stamp.toolbarTitle,
          stamp.toolbarLabel
        );
        return /* @__PURE__ */ jsxRuntime.jsx(
          StampMenuItem,
          {
            icon: stamp.toolbarIcon,
            label: displayLabel,
            ariaLabel: stamp.toolbarTitle,
            shortcut,
            active: activeStampKind === stamp.kind,
            onClick: () => {
              onToggle(stamp.kind);
              closePopover();
            },
            dataTestId: stamp.toolbarTestId
          },
          stamp.kind
        );
      }),
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
function splitTitleAndShortcut(title, fallbackShortcut) {
  const match = title.match(/^(.*?)\s*\(([^()]+)\)\s*$/);
  if (match) {
    return { displayLabel: match[1].trim(), shortcut: match[2].trim() };
  }
  return { displayLabel: title, shortcut: fallbackShortcut };
}
function StampMenuItem({
  icon,
  label,
  ariaLabel,
  shortcut,
  active,
  onClick,
  dataTestId
}) {
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
      title: ariaLabel,
      "aria-label": ariaLabel,
      "aria-pressed": active,
      "data-testid": dataTestId,
      className,
      children: [
        /* @__PURE__ */ jsxRuntime.jsx("div", { className: "dropdown-menu-item__icon", "aria-hidden": "true", children: icon }),
        /* @__PURE__ */ jsxRuntime.jsx("div", { className: "dropdown-menu-item__text", children: label }),
        shortcut ? /* @__PURE__ */ jsxRuntime.jsx("div", { className: "dropdown-menu-item__shortcut", children: shortcut }) : null
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
  React8.useEffect(() => {
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
var WRAPPER_ID = "pdf-import-portal-wrapper";
var POPOVER_SELECTOR2 = ".App-toolbar__extra-tools-dropdown .dropdown-menu-container";
function PdfImporterButton({ enabled, onPick }) {
  const [mount, setMount] = React8.useState(null);
  const mountRef = React8.useRef(null);
  const inputRef = React8.useRef(null);
  React8.useEffect(() => {
    if (!enabled) {
      mountRef.current = null;
      setMount(null);
      document.getElementById(WRAPPER_ID)?.remove();
      return;
    }
    let cancelled = false;
    let observer = null;
    let rafId = null;
    let observedRoot = null;
    const apply = (next) => {
      if (cancelled || mountRef.current === next) return;
      mountRef.current = next;
      queueMicrotask(() => {
        if (!cancelled) setMount(next);
      });
    };
    const findMenu = () => {
      if (cancelled) return;
      const container = document.querySelector(POPOVER_SELECTOR2);
      if (!container) {
        apply(null);
        return;
      }
      let wrapper = container.querySelector("#" + WRAPPER_ID);
      if (!wrapper) {
        wrapper = document.createElement("div");
        wrapper.id = WRAPPER_ID;
        wrapper.setAttribute("data-pdf-import", "true");
        wrapper.style.display = "contents";
        container.appendChild(wrapper);
      }
      apply(wrapper);
    };
    const attachObserver = () => {
      if (cancelled) return;
      const excalidraw = document.querySelector(".excalidraw");
      const nextRoot = excalidraw ?? document.body;
      if (observedRoot === nextRoot) return;
      observer?.disconnect();
      observedRoot = nextRoot;
      observer = new MutationObserver(onMutation);
      observer.observe(nextRoot, { childList: true, subtree: true });
    };
    const onMutation = () => {
      if (rafId != null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (cancelled) return;
        if (observedRoot !== document.querySelector(".excalidraw")) {
          attachObserver();
        }
        findMenu();
      });
    };
    findMenu();
    attachObserver();
    return () => {
      cancelled = true;
      if (rafId != null) cancelAnimationFrame(rafId);
      observer?.disconnect();
      document.getElementById(WRAPPER_ID)?.remove();
    };
  }, [enabled]);
  const closePopover = () => {
    const trigger = document.querySelector(
      ".App-toolbar__extra-tools-trigger"
    );
    trigger?.click();
  };
  const handleClick = () => {
    inputRef.current?.click();
  };
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onPick(file);
    e.target.value = "";
    closePopover();
  };
  if (!enabled || !mount) {
    return /* @__PURE__ */ jsxRuntime.jsx(
      "input",
      {
        ref: inputRef,
        type: "file",
        accept: "application/pdf,.pdf",
        style: { display: "none" },
        onChange: handleFileChange
      }
    );
  }
  return /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
    /* @__PURE__ */ jsxRuntime.jsx(
      "input",
      {
        ref: inputRef,
        type: "file",
        accept: "application/pdf,.pdf",
        style: { display: "none" },
        onChange: handleFileChange
      }
    ),
    reactDom.createPortal(
      /* @__PURE__ */ jsxRuntime.jsxs(
        "button",
        {
          type: "button",
          onClick: handleClick,
          title: "Ch\xE8n PDF (P)",
          "aria-label": "Ch\xE8n PDF",
          "data-testid": "pdf-import-button",
          className: "dropdown-menu-item dropdown-menu-item-base",
          children: [
            /* @__PURE__ */ jsxRuntime.jsx("div", { className: "dropdown-menu-item__icon", "aria-hidden": "true", children: /* @__PURE__ */ jsxRuntime.jsx(PdfIcon, {}) }),
            /* @__PURE__ */ jsxRuntime.jsx("div", { className: "dropdown-menu-item__text", children: "Ch\xE8n PDF" }),
            /* @__PURE__ */ jsxRuntime.jsx("div", { className: "dropdown-menu-item__shortcut", children: "P" })
          ]
        }
      ),
      mount
    )
  ] });
}
function PdfIcon() {
  return /* @__PURE__ */ jsxRuntime.jsxs(
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
      children: [
        /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" }),
        /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M14 3v5h5" }),
        /* @__PURE__ */ jsxRuntime.jsx("text", { x: "7.5", y: "17", fontSize: "6", fontFamily: "sans-serif", fontWeight: "700", stroke: "none", fill: "currentColor", children: "PDF" })
      ]
    }
  );
}

// src/pdf/parseRange.ts
function parsePageRange(input, totalPages) {
  if (!Number.isInteger(totalPages) || totalPages <= 0) {
    throw new Error("S\u1ED1 trang ph\u1EA3i l\xE0 s\u1ED1 nguy\xEAn d\u01B0\u01A1ng.");
  }
  const trimmed = input.trim();
  if (trimmed === "") return [];
  const tokens = trimmed.split(/[,\s]+/).map((t) => t.trim()).filter((t) => t.length > 0);
  const set = /* @__PURE__ */ new Set();
  for (const token of tokens) {
    if (token.includes("-")) {
      const parts = token.split("-");
      if (parts.length !== 2) {
        throw new Error(`Kho\u1EA3ng trang kh\xF4ng h\u1EE3p l\u1EC7: "${token}".`);
      }
      const start = parseStrictInt(parts[0]);
      const end = parseStrictInt(parts[1]);
      if (start === null || end === null) {
        throw new Error(`Kho\u1EA3ng trang kh\xF4ng h\u1EE3p l\u1EC7: "${token}".`);
      }
      if (start > end) {
        throw new Error(`Kho\u1EA3ng trang ng\u01B0\u1EE3c: "${token}" (\u0111\u1EA7u > cu\u1ED1i).`);
      }
      if (start < 1 || end > totalPages) {
        throw new Error(
          `Kho\u1EA3ng trang v\u01B0\u1EE3t gi\u1EDBi h\u1EA1n: "${token}". PDF c\xF3 ${totalPages} trang.`
        );
      }
      for (let i = start; i <= end; i++) set.add(i);
    } else {
      const n = parseStrictInt(token);
      if (n === null) {
        throw new Error(`S\u1ED1 trang kh\xF4ng h\u1EE3p l\u1EC7: "${token}".`);
      }
      if (n < 1 || n > totalPages) {
        throw new Error(
          `S\u1ED1 trang v\u01B0\u1EE3t gi\u1EDBi h\u1EA1n: ${n}. PDF c\xF3 ${totalPages} trang.`
        );
      }
      set.add(n);
    }
  }
  return Array.from(set).sort((a, b) => a - b);
}
function parseStrictInt(s) {
  if (!/^-?\d+$/.test(s)) return null;
  const n = Number(s);
  return Number.isInteger(n) ? n : null;
}

// src/pdf/rasterize.ts
var workerSrcOverride = null;
var pdfjsCache = null;
function configurePdfWorker(workerSrc) {
  workerSrcOverride = workerSrc;
  if (pdfjsCache) {
    pdfjsCache.GlobalWorkerOptions.workerSrc = workerSrc;
  }
}
async function loadPdfjs() {
  if (pdfjsCache) return pdfjsCache;
  const mod = await import('pdfjs-dist');
  const workerSrc = workerSrcOverride ?? `https://cdn.jsdelivr.net/npm/pdfjs-dist@${mod.version}/build/pdf.worker.min.mjs`;
  mod.GlobalWorkerOptions.workerSrc = workerSrc;
  pdfjsCache = mod;
  return mod;
}
async function loadPdfDocument(source) {
  const pdfjs = await loadPdfjs();
  const data = source instanceof ArrayBuffer ? source : await source.arrayBuffer();
  const task = pdfjs.getDocument({ data: new Uint8Array(data) });
  return task.promise;
}
async function closePdfDocument(doc) {
  try {
    await doc.cleanup();
    await doc.destroy();
  } catch {
  }
}
async function rasterizePdf(doc, options = {}) {
  const scale3 = options.scale ?? 2;
  const total = doc.numPages;
  const pages = options.pages ?? Array.from({ length: total }, (_, i) => i + 1);
  const signal = options.signal;
  const result = [];
  for (let i = 0; i < pages.length; i++) {
    if (signal?.aborted) {
      throw new DOMException("Rasterize PDF b\u1ECB hu\u1EF7.", "AbortError");
    }
    const pageNum = pages[i];
    const page = await doc.getPage(pageNum);
    try {
      const rendered = await renderPageToPng(page, scale3);
      result.push({ pageNumber: pageNum, mimeType: "image/png", ...rendered });
    } finally {
      page.cleanup();
    }
    options.onProgress?.(i + 1, pages.length);
  }
  return result;
}
async function renderPageToPng(page, scale3) {
  const viewport = page.getViewport({ scale: scale3 });
  const width = Math.ceil(viewport.width);
  const height = Math.ceil(viewport.height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Kh\xF4ng l\u1EA5y \u0111\u01B0\u1EE3c 2D context c\u1EE7a canvas.");
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  const dataURL = canvas.toDataURL("image/png");
  return { dataURL, width, height };
}
async function renderPageThumbnail(page, scale3 = 0.3, quality = 0.7) {
  const viewport = page.getViewport({ scale: scale3 });
  const width = Math.ceil(viewport.width);
  const height = Math.ceil(viewport.height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Kh\xF4ng l\u1EA5y \u0111\u01B0\u1EE3c 2D context c\u1EE7a canvas.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  const dataURL = canvas.toDataURL("image/jpeg", quality);
  return { dataURL, width, height };
}
async function renderAllThumbnails(doc, onEach, options = {}) {
  const total = doc.numPages;
  const scale3 = options.scale ?? 0.3;
  const quality = options.quality ?? 0.7;
  const concurrency = Math.max(1, options.concurrency ?? 3);
  const signal = options.signal;
  let next = 1;
  async function worker() {
    while (true) {
      if (signal?.aborted) return;
      const pageNum = next++;
      if (pageNum > total) return;
      const page = await doc.getPage(pageNum);
      try {
        if (signal?.aborted) return;
        const { dataURL, width, height } = await renderPageThumbnail(page, scale3, quality);
        if (signal?.aborted) return;
        onEach(pageNum, dataURL, width, height);
      } finally {
        page.cleanup();
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, total) }, () => worker())
  );
}
function serializeSelection(pages) {
  if (pages.length === 0) return "";
  const sorted = [...pages].sort((a, b) => a - b);
  const groups = [];
  let start = sorted[0];
  let prev = start;
  for (let i = 1; i < sorted.length; i++) {
    const n = sorted[i];
    if (n === prev + 1) {
      prev = n;
    } else {
      groups.push(start === prev ? `${start}` : `${start}-${prev}`);
      start = n;
      prev = n;
    }
  }
  groups.push(start === prev ? `${start}` : `${start}-${prev}`);
  return groups.join(",");
}
function PageRangeDialog({ doc, fileName, onConfirm, onCancel }) {
  const totalPages = doc.numPages;
  const defaultPages = React8.useMemo(
    () => Array.from({ length: totalPages }, (_, i) => i + 1),
    [totalPages]
  );
  const [selectedSet, setSelectedSet] = React8.useState(
    () => new Set(defaultPages)
  );
  const [inputValue, setInputValue] = React8.useState(serializeSelection(defaultPages));
  const [inputError, setInputError] = React8.useState(null);
  const [thumbs, setThumbs] = React8.useState({});
  const [thumbProgress, setThumbProgress] = React8.useState(0);
  const inputRef = React8.useRef(null);
  React8.useEffect(() => {
    const ctrl = new AbortController();
    void renderAllThumbnails(
      doc,
      (pageNum, dataURL, width, height) => {
        setThumbs((prev) => ({ ...prev, [pageNum]: { dataURL, width, height } }));
        setThumbProgress((prev) => prev + 1);
      },
      { scale: 0.3, quality: 0.7, concurrency: 3, signal: ctrl.signal }
    ).catch((err) => {
      if (ctrl.signal.aborted) return;
      console.warn("[PageRangeDialog] render thumbnails l\u1ED7i:", err);
    });
    return () => ctrl.abort();
  }, [doc]);
  React8.useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onCancel();
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [onCancel]);
  const handleInputChange = (next) => {
    setInputValue(next);
    try {
      const pages = parsePageRange(next, totalPages);
      setInputError(null);
      setSelectedSet(new Set(pages));
    } catch (e) {
      setInputError(e.message);
    }
  };
  const toggleThumb = (pageNum) => {
    setSelectedSet((prev) => {
      const next = new Set(prev);
      if (next.has(pageNum)) next.delete(pageNum);
      else next.add(pageNum);
      const serialized = serializeSelection([...next]);
      setInputValue(serialized);
      setInputError(null);
      return next;
    });
  };
  const selectAll = () => {
    setSelectedSet(new Set(defaultPages));
    setInputValue(serializeSelection(defaultPages));
    setInputError(null);
  };
  const clearAll = () => {
    setSelectedSet(/* @__PURE__ */ new Set());
    setInputValue("");
    setInputError(null);
  };
  const canSubmit = inputError === null && selectedSet.size > 0;
  const sortedSelected = React8.useMemo(
    () => [...selectedSet].sort((a, b) => a - b),
    [selectedSet]
  );
  const handleSubmit = () => {
    if (!canSubmit) return;
    onConfirm(sortedSelected);
  };
  return reactDom.createPortal(
    /* @__PURE__ */ jsxRuntime.jsx(
      "div",
      {
        role: "dialog",
        "aria-modal": "true",
        "aria-labelledby": "pdf-range-title",
        style: {
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1e4
        },
        onClick: (e) => {
          if (e.target === e.currentTarget) onCancel();
        },
        children: /* @__PURE__ */ jsxRuntime.jsxs(
          "div",
          {
            style: {
              background: "var(--popup-bg-color, #fff)",
              color: "var(--text-primary-color, #1b1b1f)",
              borderRadius: 12,
              padding: "20px 22px",
              width: "min(880px, 92vw)",
              maxHeight: "88vh",
              boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
              fontFamily: "inherit",
              display: "flex",
              flexDirection: "column",
              gap: 12
            },
            onClick: (e) => e.stopPropagation(),
            children: [
              /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntime.jsx(
                  "h2",
                  {
                    id: "pdf-range-title",
                    style: { margin: 0, fontSize: 16, fontWeight: 600, lineHeight: 1.3 },
                    children: "Ch\xE8n PDF"
                  }
                ),
                /* @__PURE__ */ jsxRuntime.jsxs("p", { style: { margin: "4px 0 0", fontSize: 12, opacity: 0.7 }, children: [
                  fileName,
                  " \u2014 ",
                  totalPages,
                  " trang",
                  thumbProgress < totalPages && /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
                    " \xB7 \u0111ang t\u1EA3i preview ",
                    thumbProgress,
                    "/",
                    totalPages,
                    "\u2026"
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", alignItems: "flex-start", gap: 10 }, children: [
                /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { flex: 1 }, children: [
                  /* @__PURE__ */ jsxRuntime.jsx(
                    "label",
                    {
                      style: { display: "block", fontSize: 12, marginBottom: 4, opacity: 0.75 },
                      children: "Trang c\u1EA7n ch\xE8n (vd: 1,3,5-10) \u2014 ho\u1EB7c click thumbnail b\xEAn d\u01B0\u1EDBi"
                    }
                  ),
                  /* @__PURE__ */ jsxRuntime.jsx(
                    "input",
                    {
                      ref: inputRef,
                      type: "text",
                      value: inputValue,
                      onChange: (e) => handleInputChange(e.target.value),
                      onKeyDown: (e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleSubmit();
                        }
                      },
                      style: {
                        width: "100%",
                        boxSizing: "border-box",
                        padding: "8px 10px",
                        fontSize: 14,
                        borderRadius: 6,
                        border: `1px solid ${inputError ? "#dc2626" : "rgba(0,0,0,0.2)"}`,
                        outline: "none",
                        background: "var(--input-bg-color, #fff)",
                        color: "inherit",
                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
                      }
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", gap: 6, paddingTop: 18 }, children: [
                  /* @__PURE__ */ jsxRuntime.jsx(
                    "button",
                    {
                      type: "button",
                      onClick: selectAll,
                      style: quickBtnStyle,
                      title: "Ch\u1ECDn t\u1EA5t c\u1EA3 trang",
                      children: "T\u1EA5t c\u1EA3"
                    }
                  ),
                  /* @__PURE__ */ jsxRuntime.jsx(
                    "button",
                    {
                      type: "button",
                      onClick: clearAll,
                      style: quickBtnStyle,
                      title: "B\u1ECF ch\u1ECDn t\u1EA5t c\u1EA3",
                      children: "B\u1ECF h\u1EBFt"
                    }
                  )
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntime.jsx("div", { style: { minHeight: 18, fontSize: 12 }, "data-testid": "pdf-range-status", children: inputError ? /* @__PURE__ */ jsxRuntime.jsx("span", { style: { color: "#dc2626" }, children: inputError }) : /* @__PURE__ */ jsxRuntime.jsxs("span", { style: { opacity: 0.75 }, children: [
                "\u0110\xE3 ch\u1ECDn ",
                /* @__PURE__ */ jsxRuntime.jsx("strong", { children: selectedSet.size }),
                " / ",
                totalPages,
                " trang"
              ] }) }),
              /* @__PURE__ */ jsxRuntime.jsx(
                "div",
                {
                  style: {
                    flex: 1,
                    minHeight: 240,
                    maxHeight: "60vh",
                    overflow: "auto",
                    padding: 8,
                    background: "rgba(0,0,0,0.04)",
                    borderRadius: 8,
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                    gap: 10,
                    alignContent: "start"
                  },
                  children: Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                    const thumb = thumbs[pageNum];
                    const selected = selectedSet.has(pageNum);
                    return /* @__PURE__ */ jsxRuntime.jsx(
                      ThumbnailItem,
                      {
                        pageNum,
                        thumb,
                        selected,
                        onToggle: () => toggleThumb(pageNum)
                      },
                      pageNum
                    );
                  })
                }
              ),
              /* @__PURE__ */ jsxRuntime.jsxs(
                "div",
                {
                  style: {
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 8,
                    paddingTop: 4
                  },
                  children: [
                    /* @__PURE__ */ jsxRuntime.jsx(
                      "button",
                      {
                        type: "button",
                        onClick: onCancel,
                        style: {
                          padding: "8px 14px",
                          fontSize: 13,
                          borderRadius: 6,
                          border: "1px solid rgba(0,0,0,0.15)",
                          background: "transparent",
                          color: "inherit",
                          cursor: "pointer"
                        },
                        children: "Hu\u1EF7"
                      }
                    ),
                    /* @__PURE__ */ jsxRuntime.jsxs(
                      "button",
                      {
                        type: "button",
                        onClick: handleSubmit,
                        disabled: !canSubmit,
                        style: {
                          padding: "8px 16px",
                          fontSize: 13,
                          borderRadius: 6,
                          border: "none",
                          background: canSubmit ? "#4f46e5" : "rgba(0,0,0,0.15)",
                          color: "#fff",
                          cursor: canSubmit ? "pointer" : "not-allowed",
                          fontWeight: 500
                        },
                        children: [
                          "Ch\xE8n ",
                          selectedSet.size > 0 ? `${selectedSet.size} trang` : ""
                        ]
                      }
                    )
                  ]
                }
              )
            ]
          }
        )
      }
    ),
    document.body
  );
}
var quickBtnStyle = {
  padding: "7px 10px",
  fontSize: 12,
  borderRadius: 6,
  border: "1px solid rgba(0,0,0,0.15)",
  background: "transparent",
  color: "inherit",
  cursor: "pointer",
  whiteSpace: "nowrap"
};
function ThumbnailItem({ pageNum, thumb, selected, onToggle }) {
  const aspect = thumb ? thumb.width / thumb.height : 0.77;
  return /* @__PURE__ */ jsxRuntime.jsxs(
    "button",
    {
      type: "button",
      onClick: onToggle,
      "aria-pressed": selected,
      "aria-label": `Trang ${pageNum}${selected ? " (\u0111\xE3 ch\u1ECDn)" : ""}`,
      title: `Trang ${pageNum}`,
      style: {
        position: "relative",
        padding: 0,
        background: "#fff",
        border: `2px solid ${selected ? "#4f46e5" : "rgba(0,0,0,0.12)"}`,
        borderRadius: 6,
        overflow: "hidden",
        cursor: "pointer",
        boxShadow: selected ? "0 0 0 3px rgba(79,70,229,0.18)" : "none",
        transition: "border-color 80ms ease, box-shadow 80ms ease"
      },
      children: [
        /* @__PURE__ */ jsxRuntime.jsx(
          "div",
          {
            style: {
              width: "100%",
              aspectRatio: aspect.toString(),
              background: "#f5f5f5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            },
            children: thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              /* @__PURE__ */ jsxRuntime.jsx(
                "img",
                {
                  src: thumb.dataURL,
                  alt: "",
                  style: { width: "100%", height: "100%", display: "block", objectFit: "contain" },
                  draggable: false
                }
              )
            ) : /* @__PURE__ */ jsxRuntime.jsx("div", { style: { fontSize: 11, opacity: 0.5 }, children: "\u2026" })
          }
        ),
        /* @__PURE__ */ jsxRuntime.jsx(
          "div",
          {
            style: {
              position: "absolute",
              bottom: 4,
              left: 4,
              fontSize: 10,
              fontWeight: 600,
              padding: "2px 6px",
              borderRadius: 4,
              background: selected ? "#4f46e5" : "rgba(0,0,0,0.6)",
              color: "#fff"
            },
            children: pageNum
          }
        ),
        selected && /* @__PURE__ */ jsxRuntime.jsx(
          "div",
          {
            "aria-hidden": "true",
            style: {
              position: "absolute",
              top: 4,
              right: 4,
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "#4f46e5",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 700,
              boxShadow: "0 1px 3px rgba(0,0,0,0.3)"
            },
            children: "\u2713"
          }
        )
      ]
    }
  );
}

// src/pdf/insertPdfPages.ts
var PAGE_GAP = 24;
var DEFAULT_SCALE = 2;
function insertRasterizedPagesIntoScene(api, rendered, options) {
  if (!api) throw new Error("Excalidraw API ch\u01B0a s\u1EB5n s\xE0ng.");
  if (rendered.length === 0) return { insertedElementIds: [], fileIds: [] };
  const { scale: scale3 } = options;
  const filesPayload = rendered.map((p) => ({
    id: generateFileId(),
    dataURL: p.dataURL,
    mimeType: p.mimeType,
    created: Date.now()
  }));
  api.addFiles(filesPayload);
  const origin = options.origin ?? getViewportCenter(api);
  const sceneSizes = rendered.map((p) => pixelsToSceneSize(p.width, p.height, scale3));
  const maxSceneWidth = Math.max(...sceneSizes.map((s) => s.width));
  const baseX = origin.x - maxSceneWidth / 2;
  let cursorY = origin.y - sceneSizes[0].height / 2;
  const newElements = rendered.map((_, i) => {
    const { width, height } = sceneSizes[i];
    const x = baseX + (maxSceneWidth - width) / 2;
    const y = cursorY;
    cursorY = y + height + PAGE_GAP;
    return buildPdfImageElement(filesPayload[i].id, x, y, width, height);
  });
  const existing = api.getSceneElements();
  api.updateScene({
    elements: [...existing, ...newElements],
    appState: { selectedElementIds: {}, croppingElementId: null }
  });
  return {
    insertedElementIds: newElements.map((e) => e.id),
    fileIds: filesPayload.map((f) => f.id)
  };
}
function pixelsToSceneSize(pxWidth, pxHeight, scale3) {
  return { width: pxWidth / scale3, height: pxHeight / scale3 };
}
function buildPdfImageElement(fileId, x, y, width, height) {
  return {
    type: "image",
    id: "pdf_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
    x,
    y,
    width,
    height,
    fileId,
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
function generateFileId() {
  return "pdf_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10);
}
function getViewportCenter(api) {
  const appState = api?.getAppState?.() ?? {
    scrollX: 0,
    scrollY: 0,
    width: 800,
    height: 600,
    zoom: { value: 1 }
  };
  const zoom = appState.zoom?.value ?? 1;
  return {
    x: appState.scrollX + (appState.width ?? 800) / 2 / zoom,
    y: appState.scrollY + (appState.height ?? 600) / 2 / zoom
  };
}
async function insertPdfPages(api, source, options = {}) {
  if (!api) throw new Error("Excalidraw API ch\u01B0a s\u1EB5n s\xE0ng.");
  const scale3 = options.scale ?? DEFAULT_SCALE;
  const doc = await loadPdfDocument(source);
  let rendered;
  try {
    rendered = await rasterizePdf(doc, {
      pages: options.pages,
      scale: scale3,
      onProgress: options.onProgress,
      signal: options.signal
    });
  } finally {
    void closePdfDocument(doc);
  }
  const { insertedElementIds } = insertRasterizedPagesIntoScene(api, rendered, {
    scale: scale3,
    origin: options.origin
  });
  return { insertedElementIds, pages: rendered };
}
var DOUBLE_CLICK_MS = 400;
function useStampDoubleClick({ enabled, stamps, onOpen }) {
  const lastClickRef = React8.useRef({
    time: 0,
    elementId: null
  });
  return React8.useCallback(
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
  const shortcutKeys = React8.useMemo(
    () => new Set(stamps.map((s) => s.shortcutKey.toLowerCase())),
    [stamps]
  );
  React8.useEffect(() => {
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
  React8.useEffect(() => {
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

// src/core/persistence/validation.ts
var STORAGE_KEY_RE = /^[a-zA-Z0-9_-]{1,128}$/;
function validateStorageKey(key) {
  if (typeof key !== "string" || !STORAGE_KEY_RE.test(key)) {
    const sample = key === void 0 ? "undefined" : String(key).slice(0, 32);
    throw new Error(
      `[whiteboard] Invalid storageKey: must match ${STORAGE_KEY_RE} (got: ${sample})`
    );
  }
  return key;
}
var DANGEROUS_KEYS = /* @__PURE__ */ new Set(["__proto__", "constructor", "prototype"]);
function sanitizingReviver(_key, value) {
  if (DANGEROUS_KEYS.has(_key)) return void 0;
  return value;
}
var MAX_NESTED_DEPTH = 64;
function depthExceeds(v, max, depth = 0) {
  if (depth > max) return true;
  if (v === null || typeof v !== "object") return false;
  const children = Array.isArray(v) ? v : Object.values(v);
  for (const child of children) {
    if (depthExceeds(child, max, depth + 1)) return true;
  }
  return false;
}
var ALLOWED_TOP_LEVEL_KEYS = /* @__PURE__ */ new Set(["version", "elements", "appState", "savedAt"]);
function isPlainObject(v) {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function safeParseScene(raw) {
  let parsed;
  try {
    parsed = JSON.parse(raw, sanitizingReviver);
  } catch {
    return null;
  }
  if (!isPlainObject(parsed)) return null;
  if (depthExceeds(parsed, MAX_NESTED_DEPTH)) return null;
  const safe = {};
  for (const k of Object.keys(parsed)) {
    if (ALLOWED_TOP_LEVEL_KEYS.has(k)) safe[k] = parsed[k];
  }
  if (!Array.isArray(safe.elements)) return null;
  for (const el of safe.elements) {
    if (!isPlainObject(el)) return null;
    if (typeof el.id !== "string" || typeof el.type !== "string") return null;
  }
  const appState = isPlainObject(safe.appState) ? safe.appState : {};
  return {
    version: safe.version,
    elements: safe.elements,
    appState,
    savedAt: safe.savedAt
  };
}

// src/core/persistence/sceneStore.ts
var PREFIX = "whiteboard:scene:";
var SCHEMA_VERSION = 1;
function fullKey(key) {
  return PREFIX + key;
}
function readScene(key) {
  const validKey = validateStorageKey(key);
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(fullKey(validKey));
  if (!raw) return null;
  const parsed = safeParseScene(raw);
  if (!parsed) {
    console.warn("[whiteboard] scene parse/validation failed, clear:", validKey);
    try {
      window.localStorage.removeItem(fullKey(validKey));
    } catch {
    }
    return null;
  }
  if (parsed.version !== SCHEMA_VERSION) {
    console.warn(
      `[whiteboard] scene version ${parsed.version} kh\xF4ng kh\u1EDBp ${SCHEMA_VERSION}, b\u1ECF qua.`
    );
    return null;
  }
  return {
    version: SCHEMA_VERSION,
    elements: parsed.elements,
    appState: parsed.appState,
    savedAt: typeof parsed.savedAt === "number" ? parsed.savedAt : Date.now()
  };
}
function writeScene(key, payload) {
  const validKey = validateStorageKey(key);
  if (typeof window === "undefined") return;
  const record = {
    version: SCHEMA_VERSION,
    elements: payload.elements,
    appState: payload.appState,
    savedAt: Date.now()
  };
  try {
    window.localStorage.setItem(fullKey(validKey), JSON.stringify(record));
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
  const validKey = validateStorageKey(storageKey);
  try {
    return await withStore(
      "readonly",
      (store, setResult, fail) => {
        const out = {};
        const req = store.index("storageKey").openCursor(IDBKeyRange.only(validKey));
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
  const validKey = validateStorageKey(storageKey);
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
              storageKey: validKey,
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
  const validKey = validateStorageKey(storageKey);
  try {
    await withStore(
      "readwrite",
      (store, setResult, fail) => {
        const req = store.index("storageKey").openCursor(IDBKeyRange.only(validKey));
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
var Excalidraw2 = React8.lazy(
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
  stamps = DEFAULT_STAMPS,
  initialScene,
  initialFiles
}) {
  const [api, setApi] = React8.useState(null);
  const apiRef = React8.useRef(null);
  const [isDarkTheme, setIsDarkTheme] = React8.useState(false);
  const isDarkThemeRef = React8.useRef(false);
  const knownFileIdsRef = React8.useRef(/* @__PURE__ */ new Set());
  const lastSceneHashRef = React8.useRef("");
  const sceneThrottleRef = React8.useRef(null);
  const fileThrottleRef = React8.useRef(null);
  const pruneThrottleRef = React8.useRef(null);
  const latestSceneRef = React8.useRef(null);
  const pendingFilesRef = React8.useRef({});
  const hashElementsVersionRef = React8.useRef(null);
  const stampsRef = React8.useRef(stamps);
  stampsRef.current = stamps;
  const persistEnabled = typeof storageKey === "string" && storageKey.length > 0;
  const persistKeyRef = React8.useRef(storageKey);
  persistKeyRef.current = storageKey;
  const onSceneChangeRef = React8.useRef(onSceneChange);
  onSceneChangeRef.current = onSceneChange;
  const onFilesChangeRef = React8.useRef(onFilesChange);
  onFilesChangeRef.current = onFilesChange;
  const persistEnabledRef = React8.useRef(persistEnabled);
  persistEnabledRef.current = persistEnabled;
  const persistedInitial = React8.useMemo(
    () => persistEnabled ? readScene(storageKey) : null,
    [persistEnabled, storageKey]
  );
  const effectiveInitialScene = initialScene !== void 0 ? initialScene : persistedInitial ? {
    elements: persistedInitial.elements,
    appState: persistedInitial.appState
  } : null;
  const [activeStamp, setActiveStamp] = React8.useState(null);
  const activeStampRef = React8.useRef(activeStamp);
  activeStampRef.current = activeStamp;
  const [editingElement, setEditingElement] = React8.useState(null);
  const hostRef = React8.useRef(null);
  const [pdfPending, setPdfPending] = React8.useState(null);
  const [pdfBusy, setPdfBusy] = React8.useState(false);
  const handledCropIdRef = React8.useRef(null);
  const prevExcalidrawToolRef = React8.useRef("selection");
  const stampByKind = React8.useMemo(() => {
    const m = /* @__PURE__ */ new Map();
    for (const s of stamps) m.set(s.kind, s);
    return m;
  }, [stamps]);
  const activeStampDef = activeStamp ? stampByKind.get(activeStamp) ?? null : null;
  const HostComponent = activeStampDef?.Host ?? null;
  const openStamp = React8.useCallback(
    (kind, element = null) => {
      if (readOnly) return;
      if (!stampByKind.has(kind)) return;
      setEditingElement(element);
      setActiveStamp(kind);
    },
    [readOnly, stampByKind]
  );
  const closeStamp = React8.useCallback(() => {
    setActiveStamp(null);
    setEditingElement(null);
  }, []);
  const toggleStampByKind = React8.useCallback(
    (kind) => {
      if (activeStamp === kind) closeStamp();
      else openStamp(kind);
    },
    [activeStamp, openStamp, closeStamp]
  );
  const handleChange = React8.useCallback(
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
          try {
            const mod = await import('@excalidraw/excalidraw');
            hashElementsVersionRef.current = mod.hashElementsVersion;
          } catch (err) {
            console.warn("[whiteboard] import excalidraw \u0111\u1EC3 flush scene th\u1EA5t b\u1EA1i:", err);
            return;
          }
          flushSceneRef.current();
        }, SYNC_THROTTLE_MS);
      }
      if (persistEnabled && newIds.length > 0) {
        for (const id of newIds) {
          if (files[id]) pendingFilesRef.current[id] = files[id];
        }
        if (!fileThrottleRef.current) {
          fileThrottleRef.current = setTimeout(() => {
            fileThrottleRef.current = null;
            flushFilesRef.current();
          }, 1e3);
        }
      }
      if (persistEnabled && !pruneThrottleRef.current) {
        pruneThrottleRef.current = setTimeout(() => {
          pruneThrottleRef.current = null;
          flushPruneRef.current();
        }, 2e3);
      }
    },
    [readOnly, api, onSceneChange, onFilesChange, persistEnabled, storageKey, stamps, openStamp]
  );
  const flushSceneRef = React8.useRef(() => void 0);
  flushSceneRef.current = () => {
    try {
      const latestScene = latestSceneRef.current;
      if (!latestScene) return;
      const liveElements = latestScene.elements.filter((e) => !e.isDeleted);
      const liveAppState = pickSyncableAppState(latestScene.appState);
      const hashFn = hashElementsVersionRef.current;
      const elementHash = hashFn ? hashFn(liveElements) : liveElements.map((e) => e.id).join("|");
      const sceneHash = `${elementHash}:${JSON.stringify(liveAppState)}`;
      if (sceneHash === lastSceneHashRef.current) return;
      lastSceneHashRef.current = sceneHash;
      onSceneChangeRef.current?.({ elements: liveElements, appState: liveAppState });
      if (persistEnabledRef.current) {
        writeScene(persistKeyRef.current, {
          elements: liveElements,
          appState: liveAppState
        });
      }
    } catch (err) {
      console.warn("[whiteboard] flushScene th\u1EA5t b\u1EA1i:", err);
    }
  };
  const flushFilesRef = React8.useRef(() => void 0);
  flushFilesRef.current = () => {
    try {
      const pending = pendingFilesRef.current;
      pendingFilesRef.current = {};
      if (Object.keys(pending).length === 0) return;
      const currentElements = apiRef.current?.getSceneElements?.() ?? latestSceneRef.current?.elements ?? [];
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
    } catch (err) {
      console.warn("[whiteboard] flushFiles th\u1EA5t b\u1EA1i:", err);
    }
  };
  const flushPruneRef = React8.useRef(() => void 0);
  flushPruneRef.current = () => {
    try {
      const currentElements = apiRef.current?.getSceneElements?.() ?? latestSceneRef.current?.elements ?? [];
      const keep = /* @__PURE__ */ new Set();
      for (const el of currentElements) {
        const fid = el.fileId;
        if (fid && !isStampElement(el)) keep.add(fid);
      }
      void pruneFiles(persistKeyRef.current, keep);
    } catch (err) {
      console.warn("[whiteboard] flushPrune th\u1EA5t b\u1EA1i:", err);
    }
  };
  const initialFilesAddedRef = React8.useRef(false);
  React8.useEffect(() => {
    if (!api || initialFilesAddedRef.current) return;
    initialFilesAddedRef.current = true;
    if (!initialFiles) return;
    const entries = Object.entries(initialFiles);
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
      console.warn("[whiteboard] addFiles initialFiles th\u1EA5t b\u1EA1i:", err);
    }
  }, [api]);
  React8.useEffect(() => {
    if (!api || !persistEnabled) return;
    let cancelled = false;
    void readFiles(storageKey).then(
      (files) => {
        if (cancelled) return;
        const entries = Object.entries(files);
        if (entries.length === 0) return;
        if (cancelled) return;
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
          if (cancelled) return;
          entries.forEach(([id]) => knownFileIdsRef.current.add(id));
        } catch (err) {
          if (cancelled) return;
          console.warn("[whiteboard] addFiles t\u1EEB IDB th\u1EA5t b\u1EA1i:", err);
        }
      },
      (err) => {
        if (cancelled) return;
        console.warn("[whiteboard] readFiles th\u1EA5t b\u1EA1i:", err);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [api, persistEnabled, storageKey]);
  React8.useEffect(() => {
    if (!api) return;
    let cancelled = false;
    const run = async () => {
      if (cancelled) return;
      try {
        const elements = api.getSceneElements();
        if (!elements || elements.length === 0) return;
        if (cancelled) return;
        await restoreMissingStampFiles(api, elements, stampsRef.current);
      } catch (err) {
        if (cancelled) return;
        console.warn("Math stamp restore pass failed:", err);
      }
    };
    void run();
    const t = setTimeout(() => {
      void run();
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [api, persistedInitial]);
  React8.useEffect(
    () => () => {
      if (sceneThrottleRef.current) {
        clearTimeout(sceneThrottleRef.current);
        sceneThrottleRef.current = null;
        flushSceneRef.current();
      }
      if (fileThrottleRef.current) {
        clearTimeout(fileThrottleRef.current);
        fileThrottleRef.current = null;
        flushFilesRef.current();
      }
      if (pruneThrottleRef.current) {
        clearTimeout(pruneThrottleRef.current);
        pruneThrottleRef.current = null;
        flushPruneRef.current();
      }
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
  React8.useEffect(() => {
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
  React8.useEffect(() => {
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
  const handlePdfPick = React8.useCallback(
    async (file) => {
      if (readOnly || pdfBusy) return;
      setPdfBusy(true);
      try {
        const doc = await loadPdfDocument(file);
        setPdfPending({ doc, fileName: file.name, totalPages: doc.numPages });
      } catch (err) {
        console.warn("[whiteboard] \u0110\u1ECDc PDF th\u1EA5t b\u1EA1i:", err);
        window.alert("Kh\xF4ng \u0111\u1ECDc \u0111\u01B0\u1EE3c PDF. File c\xF3 th\u1EC3 \u0111\xE3 h\u1ECFng ho\u1EB7c b\u1ECB m\u1EADt kh\u1EA9u b\u1EA3o v\u1EC7.");
      } finally {
        setPdfBusy(false);
      }
    },
    [readOnly, pdfBusy]
  );
  const handlePdfConfirm = React8.useCallback(
    async (pages) => {
      if (!pdfPending || !api) return;
      const { doc } = pdfPending;
      setPdfPending(null);
      setPdfBusy(true);
      const scale3 = 2;
      try {
        const rendered = await rasterizePdf(doc, { pages, scale: scale3 });
        await closePdfDocument(doc);
        insertRasterizedPagesIntoScene(api, rendered, { scale: scale3 });
      } catch (err) {
        console.warn("[whiteboard] Ch\xE8n PDF th\u1EA5t b\u1EA1i:", err);
        window.alert("Ch\xE8n PDF th\u1EA5t b\u1EA1i. Xem console \u0111\u1EC3 bi\u1EBFt chi ti\u1EBFt.");
      } finally {
        setPdfBusy(false);
      }
    },
    [pdfPending, api]
  );
  const handlePdfCancel = React8.useCallback(() => {
    if (pdfPending) {
      void closePdfDocument(pdfPending.doc);
    }
    setPdfPending(null);
  }, [pdfPending]);
  React8.useEffect(() => {
    if (readOnly) return;
    const root = document.querySelector(".excalidraw");
    if (!root) return;
    const onDragOver = (e) => {
      const items = e.dataTransfer?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === "file" && items[i].type === "application/pdf") {
          e.preventDefault();
          e.stopPropagation();
          if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
          return;
        }
      }
    };
    const onDrop = (e) => {
      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;
      const pdf = Array.from(files).find((f) => f.type === "application/pdf");
      if (!pdf) return;
      e.preventDefault();
      e.stopPropagation();
      void handlePdfPick(pdf);
    };
    root.addEventListener("dragover", onDragOver, { capture: true });
    root.addEventListener("drop", onDrop, { capture: true });
    return () => {
      root.removeEventListener("dragover", onDragOver, { capture: true });
      root.removeEventListener("drop", onDrop, { capture: true });
    };
  }, [readOnly, handlePdfPick, api]);
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { className: `relative h-full w-full${isDarkTheme ? " theme--dark" : ""}`, children: [
    /* @__PURE__ */ jsxRuntime.jsx(React8.Suspense, { fallback: /* @__PURE__ */ jsxRuntime.jsx(ExcalidrawLoadingFallback, {}), children: /* @__PURE__ */ jsxRuntime.jsx(
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
    /* @__PURE__ */ jsxRuntime.jsx(PdfImporterButton, { enabled: !readOnly, onPick: handlePdfPick }),
    pdfPending && /* @__PURE__ */ jsxRuntime.jsx(
      PageRangeDialog,
      {
        doc: pdfPending.doc,
        fileName: pdfPending.fileName,
        onConfirm: handlePdfConfirm,
        onCancel: handlePdfCancel
      }
    ),
    pdfBusy && !pdfPending && /* @__PURE__ */ jsxRuntime.jsx(
      "div",
      {
        "aria-live": "polite",
        role: "status",
        style: {
          position: "fixed",
          bottom: 16,
          right: 16,
          padding: "8px 14px",
          background: "rgba(0,0,0,0.75)",
          color: "#fff",
          borderRadius: 6,
          fontSize: 12,
          zIndex: 1e4
        },
        children: "\u0110ang x\u1EED l\xFD PDF\u2026"
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
exports.closePdfDocument = closePdfDocument;
exports.configurePdfWorker = configurePdfWorker;
exports.findStampForCustomData = findStampForCustomData;
exports.geometry3dStamp = geometry3dStamp;
exports.geometryStamp = geometryStamp;
exports.graph2dStamp = graph2dStamp;
exports.insertPdfPages = insertPdfPages;
exports.insertRasterizedPagesIntoScene = insertRasterizedPagesIntoScene;
exports.isGeometry3DCustomData = isGeometry3DCustomData;
exports.isGeometryCustomData = isGeometryCustomData;
exports.isGraph2DCustomData = isGraph2DCustomData;
exports.isLatexCustomData = isLatexCustomData;
exports.isStampElement = isStampElement;
exports.latexStamp = latexStamp;
exports.loadPdfDocument = loadPdfDocument;
exports.parsePageRange = parsePageRange;
exports.pickSyncableAppState = pickSyncableAppState;
exports.rasterizePdf = rasterizePdf;
exports.restoreMissingStampFiles = restoreMissingStampFiles;
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map