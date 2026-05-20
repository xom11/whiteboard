"use client";
import { migrateState, createEmptyState, getKind, paletteFor, createStore } from './chunk-MBJVQIF6.mjs';

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

// src/core/scene/render/types.ts
var DEFAULT_THEME_3D = {
  point: { size: 4, color: "#1e40af" },
  line: { strokeWidth: 2, color: "#0f172a" },
  plane: { fillOpacity: 0.15, color: "#60a5fa" }
};

// src/core/scene/render/JxgRenderer3D.ts
var JxgRenderer3D = class {
  constructor(store, view, options = {}) {
    this.elements = /* @__PURE__ */ new Map();
    this.disposed = false;
    this.highlightedId = null;
    this.highlightOriginal = null;
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
  highlight(id) {
    if (this.disposed) return;
    if (this.highlightedId && this.highlightOriginal) {
      const prev = this.elements.get(this.highlightedId);
      try {
        prev?.setAttribute?.(this.highlightOriginal);
      } catch (err) {
        console.warn("[scene/render/3d] highlight restore fail:", err);
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
      console.warn("[scene/render/3d] highlight apply fail:", err);
    }
  }
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
var GROUND_PLANE_ATTRS = (isDark) => ({
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
var GROUND_PLANE_RANGE = [-3, 3];

// src/stamps/geometry-3d/render.ts
var OUTPUT_WIDTH = 1024;
var OUTPUT_HEIGHT = 768;
var BBOX_2D = [-6, 6, 6, -6];
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

export { DEFAULT_VIEW3D, GROUND_PLANE_ATTRS, GROUND_PLANE_RANGE, JxgRenderer3D, VIEW3D_ATTRS, isGeometry3DCustomData, paletteFor2 as paletteFor, parseSerializedBoard3D, renderGeometry3DSvgFromState, serializeBoard3D };
//# sourceMappingURL=chunk-7WYGTUBK.mjs.map
//# sourceMappingURL=chunk-7WYGTUBK.mjs.map