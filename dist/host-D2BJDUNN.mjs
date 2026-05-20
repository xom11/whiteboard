"use client";
import { VIEW3D_ATTRS, DEFAULT_VIEW3D, GROUND_PLANE_RANGE, GROUND_PLANE_ATTRS, paletteFor, JxgRenderer3D, nextLabel, serializeBoard3D, createStore, createEmptyState, renderGeometry3DSvgFromState, listObjects, isGeometry3DCustomData, parseSerializedBoard3D } from './chunk-DK357UJ3.mjs';
import { useChordShortcut, MobileToolDrawer } from './chunk-SBDMF4NQ.mjs';
import './chunk-HTBLO5JO.mjs';
import { useIsMobile } from './chunk-P2AOIF7S.mjs';
import { insertStampImage } from './chunk-C6SCVOMC.mjs';
import './chunk-BJTO5JO5.mjs';
import * as React2 from 'react';
import { forwardRef, useRef, useState, useCallback, useEffect, useMemo, useImperativeHandle } from 'react';
import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import { createPortal } from 'react-dom';

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

// src/stamps/geometry-3d/editor/tools/handlers/point.ts
function buildPoint(args, store) {
  const hit = args[0]?.hit;
  if (!hit) return null;
  if (hit.kind === "existingPoint") return hit.pointId;
  const c = hitToConstraint(hit);
  if (!c) return null;
  return addPoint(store, c);
}
var buildPointOnObject = buildPoint;

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

// src/stamps/geometry-3d/editor/scene/geometryChecks.ts
var EPS = 1e-6;
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

// src/stamps/geometry-3d/editor/tools/spec.ts
var stubBuild = () => null;
var ALL_SURFACES = ["ground", "axis", "plane", "line", "polygon", "sphere"];
var OBJECT_ONLY = ["plane", "line", "polygon", "sphere"];
var NO_SURFACE = ["ground", "axis", "plane"];
var TOOLS = [
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

// src/stamps/geometry-3d/editor/tools/controller.ts
function stepHint(step) {
  return step.type === "number" ? step.prompt : step.hint;
}
var ToolController = class {
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
    const tool = TOOLS.find((t) => t.key === key) ?? TOOLS.find((t) => t.key === "move");
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

// src/stamps/geometry-3d/editor/hitTest/intersect.ts
var EPS2 = 1e-9;
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

// src/stamps/geometry-3d/editor/hitTest/hitTest.ts
var AXIS_PIXEL_THRESHOLD = 12;
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
var MiniBoard3D = React2.forwardRef(
  function MiniBoard3D2(props, ref) {
    const containerRef = React2.useRef(null);
    const boardRef = React2.useRef(null);
    const viewRef = React2.useRef(null);
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
    const onView3DReadyRef = React2.useRef(onView3DReady);
    const onPointerClickRef = React2.useRef(onPointerClick);
    const onPointerMoveRef = React2.useRef(onPointerMove);
    const onPointerLeaveRef = React2.useRef(onPointerLeave);
    const shouldStartPointDragRef = React2.useRef(shouldStartPointDrag);
    const onPointerDragRef = React2.useRef(onPointerDrag);
    const onPointerDragEndRef = React2.useRef(onPointerDragEnd);
    onView3DReadyRef.current = onView3DReady;
    onPointerClickRef.current = onPointerClick;
    onPointerMoveRef.current = onPointerMove;
    onPointerLeaveRef.current = onPointerLeave;
    shouldStartPointDragRef.current = shouldStartPointDrag;
    onPointerDragRef.current = onPointerDrag;
    onPointerDragEndRef.current = onPointerDragEnd;
    React2.useImperativeHandle(
      ref,
      () => ({
        getBoard: () => boardRef.current,
        getView3D: () => viewRef.current,
        getSvgElement: () => containerRef.current?.querySelector("svg") ?? null
      }),
      []
    );
    React2.useEffect(() => {
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
          const p2 = paletteFor(isDark);
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
    const p = paletteFor(isDark);
    return /* @__PURE__ */ jsx(
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
function StatusHint(props) {
  const { hint, hoverLabel } = props;
  return /* @__PURE__ */ jsxs(
    "div",
    {
      "data-testid": "status-hint",
      className: "border-t border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300",
      children: [
        /* @__PURE__ */ jsxs("span", { children: [
          "\u{1F4D0} ",
          hint || "Ch\u1ECDn c\xF4ng c\u1EE5 trong b\u1EA3ng b\xEAn tr\xE1i"
        ] }),
        hoverLabel ? /* @__PURE__ */ jsxs("span", { className: "ml-3 text-zinc-500", children: [
          "\u2014 \u0111ang tr\xEAn: ",
          hoverLabel
        ] }) : null
      ]
    }
  );
}
var EditorPanel = React2.forwardRef(
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
    const controllerRef = React2.useRef(null);
    if (!controllerRef.current) controllerRef.current = new ToolController(store);
    const [hint, setHint] = React2.useState("Ch\u1ECDn c\xF4ng c\u1EE5 trong b\u1EA3ng b\xEAn tr\xE1i");
    const [hoverLabel, setHoverLabel] = React2.useState(null);
    const boardRef = React2.useRef(null);
    const rendererRef = React2.useRef(null);
    const onSelectedToolChangeRef = React2.useRef(onSelectedToolChange);
    onSelectedToolChangeRef.current = onSelectedToolChange;
    const onHistoryChangeRef = React2.useRef(onHistoryChange);
    onHistoryChangeRef.current = onHistoryChange;
    const selectedToolRef = React2.useRef(selectedTool);
    selectedToolRef.current = selectedTool;
    const draggedPointRef = React2.useRef(null);
    const dragStartRef = React2.useRef(null);
    const dragSnapshotRef = React2.useRef(null);
    const dragMutatedRef = React2.useRef(false);
    React2.useEffect(() => {
      if (initialState?.state) {
        const loaded = initialState.state;
        store.withoutHistory(() => {
          store.dispatch({ type: "LOAD", payload: { state: loaded } });
        });
      }
    }, []);
    React2.useEffect(() => {
      const ctrl = controllerRef.current;
      const unsub = ctrl.on((state) => {
        setHint(state.hint);
        onSelectedToolChangeRef.current(state.tool?.key ?? "move");
      });
      return unsub;
    }, []);
    React2.useEffect(() => {
      onHistoryChangeRef.current?.(store.canUndo(), store.canRedo());
      const unsub = store.subscribe(() => {
        onHistoryChangeRef.current?.(store.canUndo(), store.canRedo());
      });
      return unsub;
    }, [store]);
    React2.useEffect(() => {
      controllerRef.current?.selectTool(selectedTool);
    }, [selectedTool]);
    React2.useEffect(() => {
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
    React2.useEffect(() => {
      return () => {
        rendererRef.current?.dispose();
        rendererRef.current = null;
      };
    }, []);
    React2.useEffect(() => {
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
    const handleView3DReady = React2.useCallback((view) => {
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
    const handleClick = React2.useCallback((screen) => {
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
    const handleMove = React2.useCallback((screen) => {
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
    const shouldStartPointDrag = React2.useCallback((screen) => {
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
    const onPointerDrag = React2.useCallback((screen) => {
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
    const onPointerDragEnd = React2.useCallback(() => {
      const snap = dragSnapshotRef.current;
      const mutated = dragMutatedRef.current;
      dragSnapshotRef.current = null;
      draggedPointRef.current = null;
      dragStartRef.current = null;
      dragMutatedRef.current = false;
      if (snap && mutated) {
        const current = store.getState();
        store.withoutHistory(() => {
          store.dispatch({ type: "LOAD", payload: { state: snap } });
        });
        store.dispatch({ type: "LOAD", payload: { state: current } });
      }
    }, [store]);
    React2.useImperativeHandle(
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
    return /* @__PURE__ */ jsxs(
      "div",
      {
        "data-testid": "editor-panel-3d",
        className: [
          isDark ? "theme--dark " : "",
          "flex h-full w-full min-w-0 flex-col overflow-hidden bg-white"
        ].join(""),
        children: [
          /* @__PURE__ */ jsx("div", { className: "min-h-0 flex-1", children: /* @__PURE__ */ jsx(
            MiniBoard3D,
            {
              ref: boardRef,
              isDark,
              onView3DReady: handleView3DReady,
              onPointerClick: handleClick,
              onPointerMove: handleMove,
              onPointerLeave: () => setHoverLabel(null),
              shouldStartPointDrag,
              onPointerDrag,
              onPointerDragEnd
            }
          ) }),
          /* @__PURE__ */ jsx(StatusHint, { hint, hoverLabel })
        ]
      }
    );
  }
);
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
  return /* @__PURE__ */ jsxs(
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
        /* @__PURE__ */ jsx("span", { "aria-hidden": true, className: "inline-flex", children: icon ?? null }),
        chordNum != null && /* @__PURE__ */ jsx(
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
var wrap = (children) => /* @__PURE__ */ jsx(
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
var dot4 = (cx, cy, r = 1.4) => /* @__PURE__ */ jsx("circle", { cx, cy, r, fill: "currentColor", stroke: "none" });
var ToolIcons = {
  move: wrap(
    /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsx("path", { d: "M5 4 L5 14 L8 11 L10 16 L13 15 L11 10 L15 10 Z" }) })
  ),
  point: wrap(
    /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsx("circle", { cx: "12", cy: "12", r: "2.4", fill: "currentColor", stroke: "none" }) })
  ),
  pointOnObject: wrap(
    /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("path", { d: "M3 16 L21 12" }),
      /* @__PURE__ */ jsx("circle", { cx: "12", cy: "13.5", r: "2.4", fill: "currentColor", stroke: "none" })
    ] })
  ),
  segment: wrap(
    /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("line", { x1: "4", y1: "18", x2: "20", y2: "6" }),
      dot4(4, 18, 1.6),
      dot4(20, 6, 1.6)
    ] })
  ),
  line: wrap(
    /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("line", { x1: "3", y1: "18", x2: "21", y2: "6" }),
      dot4(8, 14.5, 1.4),
      dot4(16, 9.5, 1.4)
    ] })
  ),
  ray: wrap(
    /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("line", { x1: "5", y1: "18", x2: "19", y2: "7" }),
      /* @__PURE__ */ jsx("path", { d: "M19 7 L15 6 M19 7 L18 11" }),
      dot4(5, 18, 1.6)
    ] })
  ),
  vector: wrap(
    /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("line", { x1: "5", y1: "18", x2: "18", y2: "7" }),
      /* @__PURE__ */ jsx("path", { d: "M18 7 L13 7 M18 7 L18 12" }),
      dot4(5, 18, 1.6)
    ] })
  ),
  polygon: wrap(
    /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsx("polygon", { points: "12,4 20,10 17,19 7,19 4,10" }) })
  ),
  plane: wrap(
    /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsx("polygon", { points: "3,9 14,5 21,11 10,15" }) })
  ),
  pyramid: wrap(
    /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("path", { d: "M4 19 L20 19 L12 4 Z" }),
      /* @__PURE__ */ jsx("path", { d: "M4 19 L12 16 L20 19" }),
      /* @__PURE__ */ jsx("path", { d: "M12 4 L12 16", strokeDasharray: "2 2" })
    ] })
  ),
  prism: wrap(
    /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("path", { d: "M4 8 L4 19 L14 19 L14 8 Z" }),
      /* @__PURE__ */ jsx("path", { d: "M4 8 L10 4 L20 4 L14 8" }),
      /* @__PURE__ */ jsx("path", { d: "M14 8 L14 19 L20 15 L20 4" }),
      /* @__PURE__ */ jsx("path", { d: "M4 8 L14 8" })
    ] })
  ),
  tetrahedron: wrap(
    /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("path", { d: "M4 19 L20 19 L12 5 Z" }),
      /* @__PURE__ */ jsx("path", { d: "M4 19 L15 12 L20 19" }),
      /* @__PURE__ */ jsx("path", { d: "M15 12 L12 5" })
    ] })
  ),
  cube: wrap(
    /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("path", { d: "M4 8 L4 19 L14 19 L14 8 Z" }),
      /* @__PURE__ */ jsx("path", { d: "M4 8 L10 4 L20 4 L14 8" }),
      /* @__PURE__ */ jsx("path", { d: "M14 8 L14 19 L20 15 L20 4" })
    ] })
  ),
  sphere: wrap(
    /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("circle", { cx: "12", cy: "12", r: "8" }),
      /* @__PURE__ */ jsx("ellipse", { cx: "12", cy: "12", rx: "8", ry: "3" }),
      dot4(12, 12, 1.2)
    ] })
  ),
  cylinder: wrap(
    /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("ellipse", { cx: "12", cy: "6", rx: "6", ry: "2" }),
      /* @__PURE__ */ jsx("path", { d: "M6 6 L6 18" }),
      /* @__PURE__ */ jsx("path", { d: "M18 6 L18 18" }),
      /* @__PURE__ */ jsx("ellipse", { cx: "12", cy: "18", rx: "6", ry: "2" })
    ] })
  ),
  cone: wrap(
    /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("line", { x1: "5", y1: "18", x2: "12", y2: "4" }),
      /* @__PURE__ */ jsx("line", { x1: "19", y1: "18", x2: "12", y2: "4" }),
      /* @__PURE__ */ jsx("ellipse", { cx: "12", cy: "18", rx: "7", ry: "2" })
    ] })
  )
};

// src/stamps/geometry-3d/editor/toolPanel/groups.ts
var GROUP_ORDER = [
  "basic",
  "point",
  "line",
  "plane",
  "polyhedron",
  "curve"
];
var GROUP_LABELS = {
  basic: "C\u01A1 b\u1EA3n",
  point: "\u0110i\u1EC3m",
  line: "\u0110\u01B0\u1EDDng th\u1EB3ng",
  plane: "M\u1EB7t ph\u1EB3ng",
  polyhedron: "Kh\u1ED1i \u0111a di\u1EC7n",
  curve: "Kh\u1ED1i cong"
};
var TOOLS_BY_GROUP = {
  basic: ["move"],
  point: ["point", "pointOnObject"],
  line: ["segment", "line", "ray", "vector", "polygon"],
  plane: ["plane"],
  polyhedron: ["pyramid", "prism", "tetrahedron", "cube"],
  curve: ["sphere", "cylinder", "cone"]
};
var SPEC_BY_KEY = TOOLS.reduce(
  (acc, t) => {
    acc[t.key] = t;
    return acc;
  },
  {}
);
var TOOLS_FLAT = GROUP_ORDER.flatMap(
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
var A_CODE = "A".charCodeAt(0);
function letterForGroup(g) {
  const idx = GROUP_ORDER.indexOf(g);
  return idx >= 0 ? String.fromCharCode(A_CODE + idx) : "";
}
function ToolPalette(props) {
  const { selected, onSelect, chordGroup = null, onHoverTool } = props;
  return /* @__PURE__ */ jsx("div", { "data-testid": "tool-palette", className: "flex flex-col gap-3", children: GROUP_ORDER.map((group) => {
    const keys = TOOLS_BY_GROUP[group];
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
          /* @__PURE__ */ jsx("div", { className: "grid grid-cols-4 gap-1", children: keys.map((k, i) => {
            const tool = TOOLS.find((t) => t.key === k);
            return /* @__PURE__ */ jsx(
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
function RowMenu(props) {
  const [open, setOpen] = React2.useState(false);
  return /* @__PURE__ */ jsxs("div", { className: "relative inline-block", children: [
    /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        "aria-label": "Row menu",
        onClick: () => setOpen((v) => !v),
        className: "rounded px-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800",
        children: "\u22EE"
      }
    ),
    open ? /* @__PURE__ */ jsxs(
      "div",
      {
        role: "menu",
        className: "absolute right-0 z-10 mt-1 w-40 rounded-md border border-zinc-200 bg-white py-1 text-xs shadow-lg dark:border-zinc-700 dark:bg-zinc-900",
        children: [
          /* @__PURE__ */ jsx(MenuItem, { onClick: () => {
            setOpen(false);
            props.onRename();
          }, children: "\u0110\u1ED5i t\xEAn" }),
          /* @__PURE__ */ jsx(MenuItem, { onClick: () => {
            setOpen(false);
            props.onChangeColor();
          }, children: "\u0110\u1ED5i m\xE0u" }),
          /* @__PURE__ */ jsx(MenuItem, { onClick: () => {
            setOpen(false);
            props.onToggleVisibility();
          }, children: props.visible ? "\u1EA8n" : "Hi\u1EC7n" }),
          /* @__PURE__ */ jsx(MenuItem, { onClick: () => {
            setOpen(false);
            props.onDelete();
          }, className: "text-red-600", children: "Xo\xE1" })
        ]
      }
    ) : null
  ] });
}
function MenuItem({ children, onClick, className }) {
  return /* @__PURE__ */ jsx(
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
function AlgebraRow(props) {
  const { obj, state, onDelete } = props;
  const symbolic = symbolicFor(obj, state);
  const numeric = numericFor(obj, state);
  const color = obj.attrs.color ?? "#0066cc";
  return /* @__PURE__ */ jsxs(
    "li",
    {
      "data-testid": `algebra-row-${obj.id}`,
      className: "flex items-center gap-2 border-b border-zinc-100 px-3 py-1.5 text-xs dark:border-zinc-800",
      children: [
        /* @__PURE__ */ jsx(
          "span",
          {
            "aria-hidden": true,
            className: "inline-block size-3 rounded-full border",
            style: { backgroundColor: color }
          }
        ),
        /* @__PURE__ */ jsx("span", { className: "min-w-[3ch] font-semibold", children: obj.label }),
        /* @__PURE__ */ jsx("span", { className: "text-zinc-500", children: "=" }),
        /* @__PURE__ */ jsx("span", { className: "flex-1 truncate font-mono", children: symbolic }),
        numeric ? /* @__PURE__ */ jsx("span", { className: "truncate text-zinc-500", children: numeric }) : null,
        /* @__PURE__ */ jsx(
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
function AlgebraList(props) {
  const { store } = props;
  const state = React2.useSyncExternalStore(store.subscribe, store.getState, store.getState);
  const objects = listObjects(state);
  return /* @__PURE__ */ jsx(
    "ul",
    {
      "data-testid": "algebra-list",
      className: "flex max-h-[calc(100vh-200px)] flex-col overflow-y-auto",
      children: objects.length === 0 ? /* @__PURE__ */ jsx("li", { className: "px-3 py-4 text-center text-xs text-zinc-500", children: "Ch\u01B0a c\xF3 \u0111\u1ED1i t\u01B0\u1EE3ng n\xE0o" }) : objects.map((o) => /* @__PURE__ */ jsx(
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
var TOOLTIP_DELAY_MS = 400;
var Geom3DIconHeader = /* @__PURE__ */ jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [
  /* @__PURE__ */ jsx("path", { d: "M4 9 L4 20 L14 20 L14 9 Z" }),
  /* @__PURE__ */ jsx("path", { d: "M4 9 L10 4 L20 4 L14 9 Z" }),
  /* @__PURE__ */ jsx("path", { d: "M14 9 L20 4 L20 15 L14 20 Z" })
] });
function AxisIcon() {
  return /* @__PURE__ */ jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [
    /* @__PURE__ */ jsx("line", { x1: "4", y1: "20", x2: "20", y2: "20" }),
    /* @__PURE__ */ jsx("line", { x1: "4", y1: "20", x2: "4", y2: "4" }),
    /* @__PURE__ */ jsx("line", { x1: "4", y1: "20", x2: "16", y2: "8" })
  ] });
}
function GridIcon() {
  return /* @__PURE__ */ jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [
    /* @__PURE__ */ jsx("path", { d: "M4 8 L20 4" }),
    /* @__PURE__ */ jsx("path", { d: "M4 14 L20 10" }),
    /* @__PURE__ */ jsx("path", { d: "M4 20 L20 16" }),
    /* @__PURE__ */ jsx("path", { d: "M4 8 L4 20" }),
    /* @__PURE__ */ jsx("path", { d: "M12 6 L12 18" }),
    /* @__PURE__ */ jsx("path", { d: "M20 4 L20 16" })
  ] });
}
function UndoIcon() {
  return /* @__PURE__ */ jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [
    /* @__PURE__ */ jsx("path", { d: "M3 10 L8 5 L8 8 L15 8 A5 5 0 0 1 20 13 L20 16" }),
    /* @__PURE__ */ jsx("path", { d: "M3 10 L8 15 L8 12" })
  ] });
}
function RedoIcon() {
  return /* @__PURE__ */ jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [
    /* @__PURE__ */ jsx("path", { d: "M21 10 L16 5 L16 8 L9 8 A5 5 0 0 0 4 13 L4 16" }),
    /* @__PURE__ */ jsx("path", { d: "M21 10 L16 15 L16 12" })
  ] });
}
function CloseIcon() {
  return /* @__PURE__ */ jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [
    /* @__PURE__ */ jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" }),
    /* @__PURE__ */ jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" })
  ] });
}
function Shell({ title, icon, onClose, children, isDark }) {
  return /* @__PURE__ */ jsxs(
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
        /* @__PURE__ */ jsx("div", { className: "min-h-0 flex-1 overflow-y-auto p-3 space-y-3", children })
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
function useToolHoverTooltip() {
  const [hover, setHover] = React2.useState(null);
  const [portalReady, setPortalReady] = React2.useState(false);
  const hoverTimerRef = React2.useRef(null);
  React2.useEffect(() => {
    setPortalReady(true);
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);
  const showHover = React2.useCallback((next) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => setHover(next), TOOLTIP_DELAY_MS);
  }, []);
  const hideHover = React2.useCallback(() => {
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
  const [tab, setTab] = React2.useState("tools");
  const { hover, portalReady, showHover, hideHover } = useToolHoverTooltip();
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsxs(Shell, { title: "H\xECnh h\u1ECDc 3D", icon: Geom3DIconHeader, onClose, isDark, children: [
      /* @__PURE__ */ jsxs("div", { className: "flex gap-1 rounded-md bg-slate-100 p-0.5", children: [
        /* @__PURE__ */ jsx(TabPill, { active: tab === "tools", onClick: () => setTab("tools"), testId: "tab-tools", children: "\u{1F9F0} C\xF4ng c\u1EE5" }),
        /* @__PURE__ */ jsx(TabPill, { active: tab === "algebra", onClick: () => setTab("algebra"), testId: "tab-algebra", children: "\u{1F4D0} \u0110\u1ED1i t\u01B0\u1EE3ng" })
      ] }),
      tab === "tools" ? /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx(Section, { label: "G\xF3c nh\xECn", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 text-[11px] text-slate-700", children: [
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
            "Tr\u1EE5c"
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
          /* @__PURE__ */ jsxs("div", { className: "ml-auto flex items-center gap-0.5", children: [
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: onUndo,
                disabled: !canUndo,
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
                onClick: onRedo,
                disabled: !canRedo,
                title: "L\xE0m l\u1EA1i (Ctrl/Cmd+Shift+Z)",
                "aria-label": "L\xE0m l\u1EA1i",
                "data-testid": "redo-btn",
                className: "inline-flex items-center justify-center rounded p-1 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent",
                children: /* @__PURE__ */ jsx(RedoIcon, {})
              }
            )
          ] })
        ] }) }),
        /* @__PURE__ */ jsx(
          ToolPalette,
          {
            selected: selectedTool,
            onSelect: onSelectTool,
            chordGroup: chordGroup ?? null,
            onHoverTool: (info) => info ? showHover(info) : hideHover()
          }
        ),
        chordGroup && /* @__PURE__ */ jsxs(
          "div",
          {
            "data-testid": "chord-hint",
            className: "rounded border border-emerald-200 bg-emerald-50/60 px-2 py-1 text-[11px] leading-snug text-slate-600",
            children: [
              /* @__PURE__ */ jsx("span", { className: "font-mono font-semibold text-emerald-700", children: letterForGroup(chordGroup) }),
              /* @__PURE__ */ jsxs("span", { className: "ml-1.5", children: [
                "\u2192 ",
                GROUP_LABELS[chordGroup],
                ". B\u1EA5m s\u1ED1 1-9 \u0111\u1EC3 ch\u1ECDn c\xF4ng c\u1EE5, Esc hu\u1EF7."
              ] })
            ]
          }
        )
      ] }) : /* @__PURE__ */ jsx("section", { "data-testid": "algebra-panel", children: /* @__PURE__ */ jsx(AlgebraList, { store }) })
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
function TabPill({
  active,
  onClick,
  testId,
  children
}) {
  return /* @__PURE__ */ jsx(
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
  const groups = React2.useMemo(
    () => GROUP_ORDER.map((group) => {
      const keys = TOOLS_BY_GROUP[group];
      return {
        group,
        groupLabel: GROUP_LABELS[group],
        tools: keys.map((k) => {
          const tool = TOOLS.find((t) => t.key === k);
          return { key: k, label: tool.label, icon: ToolIcons[k] };
        })
      };
    }),
    []
  );
  return /* @__PURE__ */ jsx(
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
          disabled: !canUndo,
          testId: "undo-btn"
        },
        {
          label: "L\xE0m l\u1EA1i",
          title: "L\xE0m l\u1EA1i (Ctrl/Cmd+Shift+Z)",
          icon: /* @__PURE__ */ jsx(RedoIcon, {}),
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
function LeftPanel(props) {
  if (props.isMobile) return /* @__PURE__ */ jsx(MobilePanel, { ...props });
  return /* @__PURE__ */ jsx(DesktopPanel, { ...props });
}
function parseInitial(editingElement) {
  if (!editingElement) return null;
  if (!isGeometry3DCustomData(editingElement.customData)) return null;
  try {
    return parseSerializedBoard3D(JSON.parse(editingElement.customData.jsonState));
  } catch {
    return null;
  }
}
var Geometry3DStampHost = forwardRef(
  function Geometry3DStampHost2({ api, editingElement, onClose, isDark }, ref) {
    const editorRef = useRef(null);
    const storeRef = useRef(null);
    if (!storeRef.current) storeRef.current = createStore(createEmptyState("3d"));
    const { isMobile } = useIsMobile();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [ready, setReady] = useState(false);
    const [selectedTool, setSelectedTool] = useState("move");
    const [showAxis, setShowAxis] = useState(true);
    const [showGrid, setShowGrid] = useState(true);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);
    const [hasContent, setHasContent] = useState(false);
    const handleHistoryChange = useCallback((u, r) => {
      setCanUndo(u);
      setCanRedo(r);
    }, []);
    useEffect(() => {
      const store = storeRef.current;
      if (!store) return;
      const sync = () => setHasContent(Object.keys(store.getState().objects).length > 0);
      sync();
      const unsub = store.subscribe(sync);
      return unsub;
    }, []);
    const handleUndo = useCallback(() => {
      editorRef.current?.undo();
    }, []);
    const handleRedo = useCallback(() => {
      editorRef.current?.redo();
    }, []);
    const initial = useMemo(
      () => parseInitial(editingElement),
      [editingElement]
    );
    const { chordGroup } = useChordShortcut({
      groupOrder: GROUP_ORDER,
      tools: TOOLS_FLAT,
      onSelect: (key) => {
        setSelectedTool(key);
        editorRef.current?.setTool(key);
      },
      enabled: !isMobile
    });
    const handleSelectTool = useCallback((k) => {
      setSelectedTool(k);
      editorRef.current?.setTool(k);
    }, []);
    const performInsert = useCallback(
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
    const tryInsert = useCallback(() => {
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
    useImperativeHandle(
      ref,
      () => ({
        tryInsert,
        hasContent: () => editorRef.current?.hasContent() ?? false
      }),
      [tryInsert]
    );
    const handleEditorInsert = useCallback(
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
    return /* @__PURE__ */ jsxs(Fragment, { children: [
      !isMobile && /* @__PURE__ */ jsx(
        LeftPanel,
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
      /* @__PURE__ */ jsxs(
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
            /* @__PURE__ */ jsxs("header", { className: "flex items-center gap-2 border-b border-slate-200 bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-2 text-white", children: [
              isMobile && /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  onClick: () => setDrawerOpen(true),
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
                /* @__PURE__ */ jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ jsx("path", { d: "M4 9 L4 20 L14 20 L14 9 Z M4 9 L10 4 L20 4 L14 9 Z M14 9 L20 4 L20 15 L14 20 Z" }) }),
                "D\u1EF1ng h\xECnh h\u1ECDc kh\xF4ng gian"
              ] }),
              isMobile && /* @__PURE__ */ jsx(
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
            /* @__PURE__ */ jsx("div", { className: "min-h-0 flex-1", children: /* @__PURE__ */ jsx(
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
      isMobile && /* @__PURE__ */ jsx(
        LeftPanel,
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

export { Geometry3DStampHost };
//# sourceMappingURL=host-D2BJDUNN.mjs.map
//# sourceMappingURL=host-D2BJDUNN.mjs.map