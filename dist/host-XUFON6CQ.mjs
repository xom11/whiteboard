"use client";
import { isGeometry3DCustomData, parseSerializedBoard3D } from './chunk-DJTBZEAR.mjs';
import { useChordShortcut, MobileToolDrawer } from './chunk-LPM4MM45.mjs';
import { paletteFor } from './chunk-HTBLO5JO.mjs';
import { useIsMobile } from './chunk-P2AOIF7S.mjs';
import { insertStampImage } from './chunk-C6SCVOMC.mjs';
import './chunk-BJTO5JO5.mjs';
import { forwardRef, useId, useRef, useState, useCallback, useEffect, useImperativeHandle, useMemo } from 'react';
import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import { createPortal } from 'react-dom';

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
var TOOLTIP_DELAY_MS = 400;
function Shell({ title, icon, onClose, children, isDark }) {
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
var Geom3DIconHeader = /* @__PURE__ */ jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ jsx("path", { d: "M4 7 L14 4 L20 7 L14 10 Z M4 7 L4 17 L14 20 L14 10 M14 20 L20 17 L20 7" }) });
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
  const { hover, portalReady, showHover, hideHover } = useToolHoverTooltip();
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
    /* @__PURE__ */ jsxs(Shell, { title: "H\xECnh h\u1ECDc 3D", icon: Geom3DIconHeader, onClose, isDark, children: [
      /* @__PURE__ */ jsx(Section, { label: "B\u1ED1 c\u1EE5c", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 flex-wrap text-[11px] text-slate-700", children: [
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
            children: /* @__PURE__ */ jsx(UndoIcon, {})
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
          icon: /* @__PURE__ */ jsx(UndoIcon, {}),
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
function LeftPanel(props) {
  if (props.isMobile) return /* @__PURE__ */ jsx(MobilePanel, { ...props });
  return /* @__PURE__ */ jsx(DesktopPanel, { ...props });
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
        LeftPanel,
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

export { Geometry3DStampHost };
//# sourceMappingURL=host-XUFON6CQ.mjs.map
//# sourceMappingURL=host-XUFON6CQ.mjs.map