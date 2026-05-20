"use client";
import { getKind, paletteFor, createStore, migrateState, createEmptyState } from './chunk-MBJVQIF6.mjs';

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

// src/core/scene/render/types2d.ts
var DEFAULT_THEME_2D = {
  stroke: "#0f172a",
  fill: "#60a5fa",
  label: "#0f172a",
  axis: "#94a3b8",
  grid: "#e2e8f0",
  pointFill: "#1e40af"
};

// src/core/scene/render/JxgRenderer.ts
var JxgRenderer = class {
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

// src/stamps/geometry-2d/render.ts
var PIXELS_PER_UNIT = 20;
var MIN_DIM = 100;
var MAX_DIM = 1200;
var FALLBACK_W = 400;
var FALLBACK_H = 300;
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

// src/stamps/geometry-2d/types.ts
function isGeometryCustomData(data) {
  if (!data || typeof data !== "object") return false;
  const d = data;
  return d.kind === "geometry" && d.version === 1 && typeof d.jsonState === "string";
}

export { JxgRenderer, isGeometryCustomData, renderGeometrySvgFromState, safeJsx, serializeBoard };
//# sourceMappingURL=chunk-7FCFYGPI.mjs.map
//# sourceMappingURL=chunk-7FCFYGPI.mjs.map