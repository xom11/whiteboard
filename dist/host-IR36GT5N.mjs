"use client";
import { serializeBoard3D, isGeometry3DCustomData, parseSerializedBoard3D } from './chunk-BFUP5QTF.mjs';
import { paletteFor } from './chunk-HTBLO5JO.mjs';
import { useIsMobile } from './chunk-P2AOIF7S.mjs';
import { insertStampImage } from './chunk-C6SCVOMC.mjs';
import './chunk-BJTO5JO5.mjs';
import * as React5 from 'react';
import { forwardRef, useRef, useMemo, useCallback, useImperativeHandle } from 'react';
import { jsx, jsxs } from 'react/jsx-runtime';

// src/stamps/geometry-3d/editor/scene/labels.ts
var A = "A".charCodeAt(0);
function nextPointLabel(existing) {
  const used = new Set(existing);
  for (let suffix = 0; suffix < 1e3; suffix++) {
    for (let i = 0; i < 26; i++) {
      const letter = String.fromCharCode(A + i);
      const candidate = suffix === 0 ? letter : `${letter}_${suffix}`;
      if (!used.has(candidate)) return candidate;
    }
  }
  return `P_${used.size}`;
}
var LOWERCASE_KINDS = ["segment", "line", "ray", "vector"];
var PREFIX = {
  sphere: "s",
  polyhedron: "h",
  cylinder: "c",
  cone: "k",
  polygon: "g",
  plane: "\u03C0"
};
function nextDerivedLabel(kind, existing) {
  const used = new Set(existing);
  if (LOWERCASE_KINDS.includes(kind)) {
    for (let i = 0; i < 26; i++) {
      const c = String.fromCharCode("a".charCodeAt(0) + i);
      if (!used.has(c)) return c;
    }
    for (let n = 1; n < 1e3; n++) {
      const c = `a_${n}`;
      if (!used.has(c)) return c;
    }
  }
  const prefix = PREFIX[kind] ?? kind[0];
  for (let n = 1; n < 1e3; n++) {
    const candidate = `${prefix}_${n}`;
    if (!used.has(candidate)) return candidate;
  }
  return `${prefix}_x`;
}

// src/stamps/geometry-3d/editor/scene/Scene3D.ts
var Scene3D = class {
  constructor() {
    this.objects = /* @__PURE__ */ new Map();
    this.order = [];
    this.counter = 0;
    this.listeners = {
      add: /* @__PURE__ */ new Set(),
      change: /* @__PURE__ */ new Set(),
      delete: /* @__PURE__ */ new Set(),
      reset: /* @__PURE__ */ new Set()
    };
  }
  on(event, cb) {
    const set = this.listeners[event];
    set.add(cb);
    return () => {
      set.delete(cb);
    };
  }
  nextId(prefix) {
    this.counter += 1;
    return `${prefix}${this.counter}`;
  }
  addPoint(constraint, label, color) {
    const id = this.nextId("p");
    const existingLabels = this.list().filter((o) => o.kind === "point").map((o) => o.label);
    const autoLabel = label ?? nextPointLabel(existingLabels);
    const obj = {
      kind: "point",
      id,
      label: autoLabel,
      visible: true,
      color,
      constraint
    };
    this.objects.set(id, obj);
    this.order.push(id);
    this.listeners.add.forEach((cb) => cb(obj));
    return id;
  }
  addObject(kind, spec, label) {
    const id = this.nextId(kind[0]);
    const existingLabels = this.list().filter((o) => o.kind === kind).map((o) => o.label);
    const autoLabel = label ?? nextDerivedLabel(kind, existingLabels);
    const obj = { id, label: autoLabel, visible: true, kind, ...spec };
    this.objects.set(id, obj);
    this.order.push(id);
    this.listeners.add.forEach((cb) => cb(obj));
    return id;
  }
  insert(obj) {
    if (this.objects.has(obj.id)) {
      throw new Error(`Scene3D.insert: id ${obj.id} already exists`);
    }
    this.objects.set(obj.id, obj);
    this.order.push(obj.id);
    this.listeners.add.forEach((cb) => cb(obj));
  }
  get(id) {
    return this.objects.get(id);
  }
  list() {
    return this.order.map((id) => this.objects.get(id)).filter((obj) => obj !== void 0);
  }
  referencedIds(obj) {
    switch (obj.kind) {
      case "point": {
        const c = obj.constraint;
        if (c.kind === "onPlane") return [c.planeId];
        if (c.kind === "onLine") return [c.lineId];
        if (c.kind === "onPolygon") return [c.polygonId];
        if (c.kind === "onSphere") return [c.sphereId];
        return [];
      }
      case "segment":
      case "line":
        return [obj.p1, obj.p2];
      case "ray":
        return [obj.origin, obj.through];
      case "vector":
        return [obj.from, obj.to];
      case "polygon":
        return obj.vertices;
      case "plane":
        return [obj.p1, obj.p2, obj.p3];
      case "sphere":
        return [obj.center, obj.surfacePoint];
      case "polyhedron":
        return obj.vertices;
      case "cylinder":
        return [obj.baseCenter, obj.topCenter];
      case "cone":
        return [obj.baseCenter, obj.apex];
    }
  }
  collectDependents(targetId) {
    const dependents = /* @__PURE__ */ new Set([targetId]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const obj of this.objects.values()) {
        if (dependents.has(obj.id)) continue;
        const refs = this.referencedIds(obj);
        if (refs.some((r) => dependents.has(r))) {
          dependents.add(obj.id);
          grew = true;
        }
      }
    }
    return dependents;
  }
  delete(id) {
    if (!this.objects.has(id)) return;
    const toDelete = this.collectDependents(id);
    for (const dependentId of toDelete) {
      this.objects.delete(dependentId);
      this.order = this.order.filter((x) => x !== dependentId);
      this.listeners.delete.forEach((cb) => cb(dependentId));
    }
  }
  reset() {
    this.objects.clear();
    this.order = [];
    this.counter = 0;
    this.listeners.reset.forEach((cb) => cb());
  }
  reserveId(prefix) {
    return this.nextId(prefix);
  }
  emitChange(id) {
    const obj = this.objects.get(id);
    if (!obj) return;
    this.listeners.change.forEach((cb) => cb(obj));
  }
};

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
function ensurePoint(hit, scene) {
  if (hit.kind === "existingPoint") return hit.pointId;
  const c = hitToConstraint(hit);
  if (!c) return null;
  return scene.addPoint(c);
}

// src/stamps/geometry-3d/editor/tools/handlers/point.ts
function buildPoint(args, scene) {
  const hit = args[0]?.hit;
  if (!hit) return null;
  if (hit.kind === "existingPoint") return hit.pointId;
  const c = hitToConstraint(hit);
  if (!c) return null;
  return scene.addPoint(c);
}
var buildPointOnObject = buildPoint;

// src/stamps/geometry-3d/editor/tools/handlers/segment.ts
function buildSegment(args, scene) {
  if (args.length < 2 || !args[0].hit || !args[1].hit) return null;
  const p1 = ensurePoint(args[0].hit, scene);
  const p2 = ensurePoint(args[1].hit, scene);
  if (!p1 || !p2 || p1 === p2) return null;
  return scene.addObject("segment", { p1, p2 });
}
function buildLine(args, scene) {
  if (args.length < 2 || !args[0].hit || !args[1].hit) return null;
  const p1 = ensurePoint(args[0].hit, scene);
  const p2 = ensurePoint(args[1].hit, scene);
  if (!p1 || !p2 || p1 === p2) return null;
  return scene.addObject("line", { p1, p2 });
}
function buildRay(args, scene) {
  if (args.length < 2 || !args[0].hit || !args[1].hit) return null;
  const origin = ensurePoint(args[0].hit, scene);
  const through = ensurePoint(args[1].hit, scene);
  if (!origin || !through || origin === through) return null;
  return scene.addObject("ray", { origin, through });
}
function buildVector(args, scene) {
  if (args.length < 2 || !args[0].hit || !args[1].hit) return null;
  const from = ensurePoint(args[0].hit, scene);
  const to = ensurePoint(args[1].hit, scene);
  if (!from || !to || from === to) return null;
  return scene.addObject("vector", { from, to });
}

// src/stamps/geometry-3d/editor/tools/handlers/polygon.ts
function buildPolygon(args, scene) {
  const vertexArgs = args.filter((a) => a.step.type === "point");
  const vertexIds = vertexArgs.map((a) => a.hit ? ensurePoint(a.hit, scene) : null).filter((x) => !!x);
  if (vertexIds.length < 3) return null;
  return scene.addObject("polygon", { vertices: vertexIds });
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
function getPointWorld(id, scene) {
  const obj = scene.get(id);
  if (!obj || obj.kind !== "point") {
    throw new Error(`constraintMath: point ${id} not found`);
  }
  return constraintToWorld(obj.constraint, scene);
}
function getPlaneBasis(planeObj, scene) {
  const p1 = getPointWorld(planeObj.p1, scene);
  const p2 = getPointWorld(planeObj.p2, scene);
  const p3 = getPointWorld(planeObj.p3, scene);
  const basis1 = sub(p2, p1);
  const tmp = sub(p3, p1);
  const normal = normalize(cross(basis1, tmp));
  const basis2 = cross(normal, basis1);
  return { origin: p1, basis1, basis2, normal };
}
function constraintToWorld(c, scene) {
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
      const plane = scene.get(c.planeId);
      if (!plane || plane.kind !== "plane") throw new Error("onPlane: plane missing");
      const { origin, basis1, basis2 } = getPlaneBasis(plane, scene);
      return add(add(origin, scale(basis1, c.u)), scale(basis2, c.v));
    }
    case "onLine": {
      const line = scene.get(c.lineId);
      if (!line || line.kind !== "line" && line.kind !== "segment" && line.kind !== "ray") {
        throw new Error("onLine: parent missing");
      }
      const p1Id = line.kind === "ray" ? line.origin : line.p1;
      const p2Id = line.kind === "ray" ? line.through : line.p2;
      const p1 = getPointWorld(p1Id, scene);
      const p2 = getPointWorld(p2Id, scene);
      const dir = sub(p2, p1);
      return add(p1, scale(dir, c.t));
    }
    case "onPolygon": {
      const pg = scene.get(c.polygonId);
      if (!pg || pg.kind !== "polygon") throw new Error("onPolygon: parent missing");
      const v = pg.vertices;
      if (v.length < 3) throw new Error("onPolygon: < 3 vertices");
      const p1 = getPointWorld(v[0], scene);
      const p2 = getPointWorld(v[1], scene);
      const p3 = getPointWorld(v[2], scene);
      const basis1 = sub(p2, p1);
      const tmp = sub(p3, p1);
      const normal = normalize(cross(basis1, tmp));
      const basis2 = cross(normal, basis1);
      return add(add(p1, scale(basis1, c.u)), scale(basis2, c.v));
    }
    case "onSphere": {
      const sph = scene.get(c.sphereId);
      if (!sph || sph.kind !== "sphere") throw new Error("onSphere: parent missing");
      const center = getPointWorld(sph.center, scene);
      const surface = getPointWorld(sph.surfacePoint, scene);
      const radius = norm(sub(surface, center));
      const x = center[0] + radius * Math.sin(c.phi) * Math.cos(c.theta);
      const y = center[1] + radius * Math.sin(c.phi) * Math.sin(c.theta);
      const z = center[2] + radius * Math.cos(c.phi);
      return [x, y, z];
    }
  }
}
function worldToConstraint(current, world, scene) {
  switch (current.kind) {
    case "free":
      return { kind: "free", x: world[0], y: world[1], z: world[2] };
    case "onGround":
      return { kind: "onGround", x: world[0], y: world[1] };
    case "onAxis": {
      const t = current.axis === "x" ? world[0] : current.axis === "y" ? world[1] : world[2];
      return { kind: "onAxis", axis: current.axis, t };
    }
    case "onPlane": {
      const plane = scene.get(current.planeId);
      if (!plane || plane.kind !== "plane") return current;
      const { origin, basis1, basis2 } = getPlaneBasis(plane, scene);
      const rel = sub(world, origin);
      const b1n = dot(basis1, basis1);
      const b2n = dot(basis2, basis2);
      const u = b1n === 0 ? 0 : dot(rel, basis1) / b1n;
      const v = b2n === 0 ? 0 : dot(rel, basis2) / b2n;
      return { kind: "onPlane", planeId: current.planeId, u, v };
    }
    case "onLine": {
      const line = scene.get(current.lineId);
      if (!line) return current;
      const p1Id = line.kind === "ray" ? line.origin : line.p1;
      const p2Id = line.kind === "ray" ? line.through : line.p2;
      const p1 = getPointWorld(p1Id, scene);
      const p2 = getPointWorld(p2Id, scene);
      const dir = sub(p2, p1);
      const len2 = dot(dir, dir);
      const t = len2 === 0 ? 0 : dot(sub(world, p1), dir) / len2;
      return { kind: "onLine", lineId: current.lineId, t };
    }
    case "onPolygon": {
      const pg = scene.get(current.polygonId);
      if (!pg || pg.kind !== "polygon" || pg.vertices.length < 3) return current;
      const p1 = getPointWorld(pg.vertices[0], scene);
      const p2 = getPointWorld(pg.vertices[1], scene);
      const p3 = getPointWorld(pg.vertices[2], scene);
      const basis1 = sub(p2, p1);
      const tmp = sub(p3, p1);
      const normal = normalize(cross(basis1, tmp));
      const basis2 = cross(normal, basis1);
      const rel = sub(world, p1);
      const b1n = dot(basis1, basis1);
      const b2n = dot(basis2, basis2);
      const u = b1n === 0 ? 0 : dot(rel, basis1) / b1n;
      const v = b2n === 0 ? 0 : dot(rel, basis2) / b2n;
      return { kind: "onPolygon", polygonId: current.polygonId, u, v };
    }
    case "onSphere": {
      const sph = scene.get(current.sphereId);
      if (!sph || sph.kind !== "sphere") return current;
      const center = getPointWorld(sph.center, scene);
      const rel = sub(world, center);
      const r = norm(rel);
      if (r === 0) return current;
      const phi = Math.acos(rel[2] / r);
      const theta = Math.atan2(rel[1], rel[0]);
      return { kind: "onSphere", sphereId: current.sphereId, theta, phi };
    }
  }
}

// src/stamps/geometry-3d/editor/scene/geometryChecks.ts
var EPS = 1e-6;
function getWorld(id, scene) {
  const obj = scene.get(id);
  if (!obj || obj.kind !== "point") return null;
  return constraintToWorld(obj.constraint, scene);
}
function areCollinear3(p1Id, p2Id, p3Id, scene) {
  const p1 = getWorld(p1Id, scene);
  const p2 = getWorld(p2Id, scene);
  const p3 = getWorld(p3Id, scene);
  if (!p1 || !p2 || !p3) return true;
  const a = [p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]];
  const b = [p3[0] - p1[0], p3[1] - p1[1], p3[2] - p1[2]];
  const c = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  return Math.hypot(c[0], c[1], c[2]) < EPS;
}
function apexCoplanarWithBase(baseIds, apexId, scene) {
  if (baseIds.length < 3) return false;
  const p1 = getWorld(baseIds[0], scene);
  const p2 = getWorld(baseIds[1], scene);
  const p3 = getWorld(baseIds[2], scene);
  const apex = getWorld(apexId, scene);
  if (!p1 || !p2 || !p3 || !apex) return false;
  const a = [p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]];
  const b = [p3[0] - p1[0], p3[1] - p1[1], p3[2] - p1[2]];
  const n = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const d = [apex[0] - p1[0], apex[1] - p1[1], apex[2] - p1[2]];
  const dotND = n[0] * d[0] + n[1] * d[1] + n[2] * d[2];
  return Math.abs(dotND) < EPS;
}

// src/stamps/geometry-3d/editor/tools/handlers/plane.ts
function buildPlane(args, scene) {
  if (args.length < 3 || !args[0].hit || !args[1].hit || !args[2].hit) return null;
  const p1 = ensurePoint(args[0].hit, scene);
  const p2 = ensurePoint(args[1].hit, scene);
  const p3 = ensurePoint(args[2].hit, scene);
  if (!p1 || !p2 || !p3) return null;
  if (p1 === p2 || p2 === p3 || p1 === p3) return null;
  if (areCollinear3(p1, p2, p3, scene)) return null;
  return scene.addObject("plane", { p1, p2, p3 });
}

// src/stamps/geometry-3d/editor/tools/handlers/pyramid.ts
function buildPyramid(args, scene) {
  const pointArgs = args.filter((a) => a.step.type === "point");
  const baseArgs = pointArgs.slice(0, -1);
  const apexArg = pointArgs.slice(-1)[0];
  if (baseArgs.length < 3 || !apexArg?.hit) return null;
  const baseIds = baseArgs.map((a) => a.hit ? ensurePoint(a.hit, scene) : null).filter((x) => !!x);
  const apexId = ensurePoint(apexArg.hit, scene);
  if (!apexId || baseIds.length < 3) return null;
  if (apexCoplanarWithBase(baseIds, apexId, scene)) return null;
  const vertices = [...baseIds, apexId];
  const apexIdx = vertices.length - 1;
  const faces = [baseIds.map((_, i) => i)];
  for (let i = 0; i < baseIds.length; i++) {
    faces.push([i, (i + 1) % baseIds.length, apexIdx]);
  }
  return scene.addObject("polyhedron", { flavor: "pyramid", vertices, faces });
}

// src/stamps/geometry-3d/editor/tools/handlers/prism.ts
function buildPrism(args, scene) {
  const baseArgs = args.filter((a) => a.step.type === "point");
  const numberArg = args.find((a) => a.step.type === "number");
  if (baseArgs.length < 3 || !numberArg || typeof numberArg.value !== "number") return null;
  const height = numberArg.value;
  if (height <= 0) return null;
  const baseIds = baseArgs.map((a) => a.hit ? ensurePoint(a.hit, scene) : null).filter((x) => !!x);
  if (baseIds.length < 3) return null;
  const topIds = [];
  for (const id of baseIds) {
    const p = scene.get(id);
    if (!p || p.kind !== "point") return null;
    const w = constraintToWorld(p.constraint, scene);
    topIds.push(scene.addPoint({ kind: "free", x: w[0], y: w[1], z: w[2] + height }));
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
  return scene.addObject("polyhedron", { flavor: "prism", vertices, faces });
}

// src/stamps/geometry-3d/editor/tools/handlers/tetrahedron.ts
function buildTetrahedron(args, scene) {
  if (args.length < 2 || !args[0].hit || !args[1].hit) return null;
  const p1Id = ensurePoint(args[0].hit, scene);
  const p2Id = ensurePoint(args[1].hit, scene);
  if (!p1Id || !p2Id || p1Id === p2Id) return null;
  const p1Obj = scene.get(p1Id);
  const p2Obj = scene.get(p2Id);
  if (!p1Obj || p1Obj.kind !== "point" || !p2Obj || p2Obj.kind !== "point") return null;
  const p1 = constraintToWorld(p1Obj.constraint, scene);
  const p2 = constraintToWorld(p2Obj.constraint, scene);
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
  const cId = scene.addPoint({ kind: "free", x: baseC[0], y: baseC[1], z: baseC[2] });
  const apexId = scene.addPoint({ kind: "free", x: apex[0], y: apex[1], z: apex[2] });
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
  return scene.addObject("polyhedron", { flavor: "tetrahedron", vertices, faces });
}

// src/stamps/geometry-3d/editor/tools/handlers/cube.ts
function buildCube(args, scene) {
  if (args.length < 2 || !args[0].hit || !args[1].hit) return null;
  const p1Id = ensurePoint(args[0].hit, scene);
  const p2Id = ensurePoint(args[1].hit, scene);
  if (!p1Id || !p2Id || p1Id === p2Id) return null;
  const p1Obj = scene.get(p1Id);
  const p2Obj = scene.get(p2Id);
  if (!p1Obj || p1Obj.kind !== "point" || !p2Obj || p2Obj.kind !== "point") return null;
  const p1 = constraintToWorld(p1Obj.constraint, scene);
  const p2 = constraintToWorld(p2Obj.constraint, scene);
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
  const p3Id = scene.addPoint({ kind: "onGround", x: p3[0], y: p3[1] });
  const p4Id = scene.addPoint({ kind: "onGround", x: p4[0], y: p4[1] });
  const t1Id = scene.addPoint({ kind: "free", x: t1[0], y: t1[1], z: t1[2] });
  const t2Id = scene.addPoint({ kind: "free", x: t2[0], y: t2[1], z: t2[2] });
  const t3Id = scene.addPoint({ kind: "free", x: t3[0], y: t3[1], z: t3[2] });
  const t4Id = scene.addPoint({ kind: "free", x: t4[0], y: t4[1], z: t4[2] });
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
  return scene.addObject("polyhedron", { flavor: "cube", vertices, faces });
}

// src/stamps/geometry-3d/editor/tools/handlers/sphere.ts
function buildSphere(args, scene) {
  if (args.length < 2 || !args[0].hit || !args[1].hit) return null;
  const center = ensurePoint(args[0].hit, scene);
  const surface = ensurePoint(args[1].hit, scene);
  if (!center || !surface || center === surface) return null;
  return scene.addObject("sphere", { center, surfacePoint: surface });
}

// src/stamps/geometry-3d/editor/tools/handlers/cylinder.ts
function buildCylinder(args, scene) {
  const points = args.filter((a) => a.step.type === "point");
  const numberArg = args.find((a) => a.step.type === "number");
  if (points.length < 2 || !points[0].hit || !points[1].hit || !numberArg || typeof numberArg.value !== "number") return null;
  const radius = numberArg.value;
  if (radius <= 0) return null;
  const baseCenter = ensurePoint(points[0].hit, scene);
  const topCenter = ensurePoint(points[1].hit, scene);
  if (!baseCenter || !topCenter || baseCenter === topCenter) return null;
  return scene.addObject("cylinder", { baseCenter, topCenter, radius });
}

// src/stamps/geometry-3d/editor/tools/handlers/cone.ts
function buildCone(args, scene) {
  const points = args.filter((a) => a.step.type === "point");
  const numberArg = args.find((a) => a.step.type === "number");
  if (points.length < 2 || !points[0].hit || !points[1].hit || !numberArg || typeof numberArg.value !== "number") return null;
  const radius = numberArg.value;
  if (radius <= 0) return null;
  const baseCenter = ensurePoint(points[0].hit, scene);
  const apex = ensurePoint(points[1].hit, scene);
  if (!baseCenter || !apex || baseCenter === apex) return null;
  return scene.addObject("cone", { baseCenter, apex, radius });
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
    hintIdle: "Ch\u1ECDn m\u1EB7t ph\u1EB3ng / \u0111\u01B0\u1EDDng / m\u1EB7t c\u1EA7u \u0111\u1EC3 \u0111\u1EB7t \u0111i\u1EC3m",
    steps: [{ type: "point", allowExisting: false, allowNewOn: ALL_SURFACES, hint: "Ch\u1ECDn v\u1ECB tr\xED \u0111\u1EC3 \u0111\u1EB7t \u0111i\u1EC3m" }],
    build: buildPoint
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
var TOOL_GROUPS = {
  "C\u01A1 b\u1EA3n": ["move", "point", "segment", "line", "plane"],
  "\u0110i\u1EC3m": ["point", "pointOnObject"],
  "\u0110\u01B0\u1EDDng th\u1EB3ng": ["segment", "line", "ray", "vector", "polygon"],
  "M\u1EB7t ph\u1EB3ng": ["plane"],
  "Kh\u1ED1i \u0111a di\u1EC7n": ["pyramid", "prism", "tetrahedron", "cube"],
  "Kh\u1ED1i cong": ["sphere", "cylinder", "cone"]
};

// src/stamps/geometry-3d/editor/tools/controller.ts
function stepHint(step) {
  return step.type === "number" ? step.prompt : step.hint;
}
var ToolController = class {
  constructor(scene) {
    this.scene = scene;
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
      tool.build(this.state.collected, this.scene);
      this.selectTool("move");
      return;
    }
    this.state.hint = stepHint(tool.steps[this.state.stepIndex]);
    this.notify();
  }
  notify() {
    for (const cb of this.listeners) cb(this.state);
  }
};

// src/stamps/geometry-3d/editor/renderer/faceted.ts
var CURVED_SEGMENTS = 16;
function cylinderFaces(center, top, radius) {
  const baseRing = [];
  const topRing = [];
  for (let i = 0; i < CURVED_SEGMENTS; i++) {
    const theta = i / CURVED_SEGMENTS * Math.PI * 2;
    const dx = radius * Math.cos(theta);
    const dy = radius * Math.sin(theta);
    baseRing.push([center[0] + dx, center[1] + dy, center[2]]);
    topRing.push([top[0] + dx, top[1] + dy, top[2]]);
  }
  const vertices = [...baseRing, ...topRing];
  const faces = [];
  faces.push(baseRing.map((_, i) => i));
  faces.push(topRing.map((_, i) => CURVED_SEGMENTS + i));
  for (let i = 0; i < CURVED_SEGMENTS; i++) {
    const next = (i + 1) % CURVED_SEGMENTS;
    faces.push([i, next, CURVED_SEGMENTS + next, CURVED_SEGMENTS + i]);
  }
  return { vertices, faces };
}
function coneFaces(baseCenter, apex, radius) {
  const baseRing = [];
  for (let i = 0; i < CURVED_SEGMENTS; i++) {
    const theta = i / CURVED_SEGMENTS * Math.PI * 2;
    baseRing.push([
      baseCenter[0] + radius * Math.cos(theta),
      baseCenter[1] + radius * Math.sin(theta),
      baseCenter[2]
    ]);
  }
  const apexIdx = baseRing.length;
  const vertices = [...baseRing, apex];
  const faces = [baseRing.map((_, i) => i)];
  for (let i = 0; i < CURVED_SEGMENTS; i++) {
    faces.push([i, (i + 1) % CURVED_SEGMENTS, apexIdx]);
  }
  return { vertices, faces };
}

// src/stamps/geometry-3d/editor/renderer/JxgRenderer.ts
var JxgRenderer = class {
  constructor(scene, view) {
    this.scene = scene;
    this.view = view;
    this.map = /* @__PURE__ */ new Map();
    this.unsubAdd = scene.on("add", (o) => this.handleAdd(o));
    this.unsubChange = scene.on("change", (o) => this.handleChange(o));
    this.unsubDelete = scene.on("delete", (id) => this.handleDelete(id));
    for (const obj of scene.list()) this.handleAdd(obj);
  }
  dispose() {
    this.unsubAdd();
    this.unsubChange();
    this.unsubDelete();
    for (const [id, j] of this.map) {
      try {
        j.remove?.();
      } catch {
      }
      this.map.delete(id);
    }
  }
  handleAdd(obj) {
    if (this.map.has(obj.id)) return;
    if (obj.kind === "point") {
      const world = constraintToWorld(obj.constraint, this.scene);
      const attrs = { id: obj.id, name: obj.label, size: 4, visible: obj.visible };
      const jxg = this.view.create("point3d", world, attrs);
      this.map.set(obj.id, jxg);
      this.attachDragHook(obj.id, jxg);
      return;
    }
    if (obj.kind === "segment") {
      const a = this.map.get(obj.p1);
      const b = this.map.get(obj.p2);
      const attrs = {
        id: obj.id,
        straightFirst: false,
        straightLast: false,
        visible: obj.visible,
        strokeColor: obj.color ?? "#0066cc",
        strokeWidth: 2
      };
      this.map.set(obj.id, this.view.create("line3d", [a, b], attrs));
      return;
    }
    if (obj.kind === "line") {
      const attrs = {
        id: obj.id,
        visible: obj.visible,
        strokeColor: obj.color ?? "#0066cc",
        strokeWidth: 2
      };
      this.map.set(
        obj.id,
        this.view.create("line3d", [this.map.get(obj.p1), this.map.get(obj.p2)], attrs)
      );
      return;
    }
    if (obj.kind === "ray") {
      const attrs = { id: obj.id, straightFirst: false, visible: obj.visible };
      this.map.set(
        obj.id,
        this.view.create("line3d", [this.map.get(obj.origin), this.map.get(obj.through)], attrs)
      );
      return;
    }
    if (obj.kind === "vector") {
      const attrs = {
        id: obj.id,
        lastArrow: true,
        straightFirst: false,
        straightLast: false,
        visible: obj.visible
      };
      this.map.set(
        obj.id,
        this.view.create("line3d", [this.map.get(obj.from), this.map.get(obj.to)], attrs)
      );
      return;
    }
    if (obj.kind === "plane") {
      const attrs = { id: obj.id, fillOpacity: 0.2, visible: obj.visible };
      this.map.set(
        obj.id,
        this.view.create(
          "plane3d",
          [this.map.get(obj.p1), this.map.get(obj.p2), this.map.get(obj.p3)],
          attrs
        )
      );
      return;
    }
    if (obj.kind === "polygon") {
      const refs = obj.vertices.map((v) => this.map.get(v));
      const attrs = { id: obj.id, fillOpacity: 0.3, visible: obj.visible };
      this.map.set(obj.id, this.view.create("polygon3d", [refs], attrs));
      return;
    }
    if (obj.kind === "sphere") {
      const attrs = { id: obj.id, fillOpacity: 0.25, visible: obj.visible };
      this.map.set(
        obj.id,
        this.view.create("sphere3d", [this.map.get(obj.center), this.map.get(obj.surfacePoint)], attrs)
      );
      return;
    }
    if (obj.kind === "polyhedron") {
      const verts = obj.vertices.map((id) => this.map.get(id));
      const faceJxgs = obj.faces.map(
        (face) => this.view.create("polygon3d", [face.map((idx) => verts[idx])], {
          id: `${obj.id}.face${face.join("-")}`,
          fillOpacity: 0.25,
          strokeColor: "#0066cc",
          strokeWidth: 1.5,
          visible: obj.visible
        })
      );
      this.map.set(obj.id, {
        _faces: faceJxgs,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        remove: () => faceJxgs.forEach((f) => f.remove?.())
      });
      return;
    }
    if (obj.kind === "cylinder" || obj.kind === "cone") {
      const baseCenterPt = this.scene.get(obj.baseCenter);
      if (!baseCenterPt || baseCenterPt.kind !== "point") return;
      const base = constraintToWorld(baseCenterPt.constraint, this.scene);
      let secondPt;
      if (obj.kind === "cylinder") {
        const topCenterPt = this.scene.get(obj.topCenter);
        if (!topCenterPt || topCenterPt.kind !== "point") return;
        secondPt = constraintToWorld(topCenterPt.constraint, this.scene);
      } else {
        const apexPt = this.scene.get(obj.apex);
        if (!apexPt || apexPt.kind !== "point") return;
        secondPt = constraintToWorld(apexPt.constraint, this.scene);
      }
      const geom = obj.kind === "cylinder" ? cylinderFaces(base, secondPt, obj.radius) : coneFaces(base, secondPt, obj.radius);
      const vertJxgs = geom.vertices.map(
        (v, i) => this.view.create("point3d", v, {
          id: `${obj.id}.v${i}`,
          visible: false,
          fixed: true,
          withLabel: false
        })
      );
      const faceJxgs = geom.faces.map(
        (face) => this.view.create("polygon3d", [face.map((idx) => vertJxgs[idx])], {
          id: `${obj.id}.face${face.join("-")}`,
          fillOpacity: 0.25,
          strokeColor: "#0066cc",
          strokeWidth: 1.5,
          visible: obj.visible
        })
      );
      this.map.set(obj.id, {
        _verts: vertJxgs,
        _faces: faceJxgs,
        remove: () => {
          faceJxgs.forEach((f) => f.remove?.());
          vertJxgs.forEach((v) => v.remove?.());
        }
      });
      return;
    }
  }
  attachDragHook(id, jxg) {
    if (typeof jxg.on !== "function") return;
    jxg.on("drag", () => {
      const obj = this.scene.get(id);
      if (!obj || obj.kind !== "point") return;
      const world = [jxg.X(), jxg.Y(), jxg.Z()];
      const updated = worldToConstraint(obj.constraint, world, this.scene);
      obj.constraint = updated;
      this.scene.emitChange(id);
    });
  }
  handleChange(obj) {
    const j = this.map.get(obj.id);
    if (!j) return;
    if (obj.kind === "point" && typeof j.moveTo === "function") {
      const w = constraintToWorld(obj.constraint, this.scene);
      j.moveTo([w[0], w[1], w[2]]);
    }
  }
  handleDelete(id) {
    const j = this.map.get(id);
    if (!j) return;
    try {
      j.remove?.();
    } catch {
    }
    this.map.delete(id);
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
function findSnapPoint(screen, view, scene, pixelRadius = 8) {
  let best = null;
  const r2 = pixelRadius * pixelRadius;
  for (const obj of scene.list()) {
    if (obj.kind !== "point") continue;
    if (!obj.visible) continue;
    const world = constraintToWorld(obj.constraint, scene);
    const proj = view.project3DTo2D?.(world[0], world[1], world[2]);
    if (!proj) continue;
    const dx = proj[1] - screen.x;
    const dy = proj[2] - screen.y;
    const d2 = dx * dx + dy * dy;
    if (d2 <= r2 && (best === null || d2 < best.d2)) {
      best = { id: obj.id, d2 };
    }
  }
  return best?.id ?? null;
}

// src/stamps/geometry-3d/editor/hitTest/hitTest.ts
var AXIS_PIXEL_THRESHOLD = 12;
function hitTest(screen, view, scene) {
  const snap = findSnapPoint(screen, view, scene);
  if (snap) return { kind: "existingPoint", pointId: snap };
  const ray = screenToRay(screen, view);
  let bestSphere = null;
  for (const obj of scene.list()) {
    if (obj.kind !== "sphere" || !obj.visible) continue;
    const centerPoint = scene.get(obj.center);
    const surfacePoint = scene.get(obj.surfacePoint);
    if (!centerPoint || centerPoint.kind !== "point") continue;
    if (!surfacePoint || surfacePoint.kind !== "point") continue;
    const center = constraintToWorld(centerPoint.constraint, scene);
    const surface = constraintToWorld(surfacePoint.constraint, scene);
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
      if (d <= AXIS_PIXEL_THRESHOLD) {
        const hit = rayLineSegment(ray, { a: ax.a, b: ax.b }, 1e3);
        if (hit) {
          const t = ax.axis === "x" ? hit.point[0] : ax.axis === "y" ? hit.point[1] : hit.point[2];
          return { kind: "onAxis", axis: ax.axis, t, world: hit.point };
        }
      }
    }
  }
  let bestPlane = null;
  for (const obj of scene.list()) {
    if (obj.kind !== "plane" || !obj.visible) continue;
    const basis = planeBasis(obj, scene);
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
    const sph = scene.get(bestSphere.id);
    if (sph && sph.kind === "sphere") {
      const centerPt = scene.get(sph.center);
      if (centerPt && centerPt.kind === "point") {
        const center = constraintToWorld(centerPt.constraint, scene);
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
function planeBasis(planeObj, scene) {
  const p1Obj = scene.get(planeObj.p1);
  const p2Obj = scene.get(planeObj.p2);
  const p3Obj = scene.get(planeObj.p3);
  if (!p1Obj || p1Obj.kind !== "point") return null;
  if (!p2Obj || p2Obj.kind !== "point") return null;
  if (!p3Obj || p3Obj.kind !== "point") return null;
  const p1 = constraintToWorld(p1Obj.constraint, scene);
  const p2 = constraintToWorld(p2Obj.constraint, scene);
  const p3 = constraintToWorld(p3Obj.constraint, scene);
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
function ToolButton(props) {
  const { toolKey, label, selected, onClick, icon } = props;
  return /* @__PURE__ */ jsxs(
    "button",
    {
      type: "button",
      "data-tool-key": toolKey,
      "aria-pressed": selected,
      onClick: () => onClick(toolKey),
      className: "flex flex-col items-center justify-center gap-1 rounded-md border p-2 text-xs " + (selected ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200" : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"),
      style: { width: 80, height: 72 },
      children: [
        /* @__PURE__ */ jsx("span", { "aria-hidden": true, className: "text-lg", children: icon ?? "\u2B1B" }),
        /* @__PURE__ */ jsx("span", { className: "text-center leading-tight", children: label })
      ]
    }
  );
}
var ICONS = {
  move: "\u2196",
  point: "\xB7",
  pointOnObject: "\u2299",
  segment: "\u2014",
  line: "\u27F7",
  ray: "\u2192",
  vector: "\u2197",
  polygon: "\u2B20",
  plane: "\u2B1C",
  pyramid: "\u25B3",
  prism: "\u25A6",
  tetrahedron: "\u25EC",
  cube: "\u2B1B",
  sphere: "\u25CF",
  cylinder: "\u232D",
  cone: "\u23F6"
};
function ToolPalette(props) {
  const { selected, onSelect } = props;
  return /* @__PURE__ */ jsx("div", { "data-testid": "tool-palette", className: "flex flex-col gap-4 p-3", children: Object.entries(TOOL_GROUPS).map(([groupLabel, keys]) => /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsx("h4", { className: "mb-1 text-xs font-semibold text-zinc-600 dark:text-zinc-400", children: groupLabel }),
    /* @__PURE__ */ jsx("div", { className: "grid grid-cols-3 gap-1.5", children: keys.map((k) => {
      const tool = TOOLS.find((t) => t.key === k);
      return /* @__PURE__ */ jsx(
        ToolButton,
        {
          toolKey: k,
          label: tool.label,
          selected: selected === k,
          onClick: onSelect,
          icon: ICONS[k]
        },
        k
      );
    }) })
  ] }, groupLabel)) });
}

// src/stamps/geometry-3d/editor/algebraPanel/symbolic.ts
function symbolicFor(obj, scene) {
  const n = (id) => scene.get(id)?.label ?? id;
  switch (obj.kind) {
    case "point": {
      const c = obj.constraint;
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
    case "segment":
      return `Segment(${n(obj.p1)}, ${n(obj.p2)})`;
    case "line":
      return `Line(${n(obj.p1)}, ${n(obj.p2)})`;
    case "ray":
      return `Ray(${n(obj.origin)}, ${n(obj.through)})`;
    case "vector":
      return `Vector(${n(obj.from)}, ${n(obj.to)})`;
    case "polygon":
      return `Polygon(${obj.vertices.map(n).join(", ")})`;
    case "plane":
      return `Plane(${n(obj.p1)}, ${n(obj.p2)}, ${n(obj.p3)})`;
    case "sphere":
      return `Sphere(${n(obj.center)}, ${n(obj.surfacePoint)})`;
    case "polyhedron": {
      const flavorVn = {
        pyramid: "Ch\xF3p",
        prism: "L\u0103ng tr\u1EE5",
        tetrahedron: "T\u1EE9 di\u1EC7n",
        cube: "L\u1EADp ph\u01B0\u01A1ng"
      };
      return `${flavorVn[obj.flavor]}(${obj.vertices.length} \u0111\u1EC9nh)`;
    }
    case "cylinder":
      return `Cylinder(${n(obj.baseCenter)}, ${n(obj.topCenter)}, r=${obj.radius})`;
    case "cone":
      return `Cone(${n(obj.baseCenter)}, ${n(obj.apex)}, r=${obj.radius})`;
  }
}
function numericFor(obj, scene) {
  if (obj.kind === "point") {
    const w = constraintToWorld(obj.constraint, scene);
    return `(${round(w[0])}, ${round(w[1])}, ${round(w[2])})`;
  }
  return "";
}
function round(x) {
  return Math.abs(x) < 1e-9 ? "0" : (Math.round(x * 100) / 100).toString();
}
function RowMenu(props) {
  const [open, setOpen] = React5.useState(false);
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
  const { obj, scene, onDelete } = props;
  const symbolic = symbolicFor(obj, scene);
  const numeric = numericFor(obj, scene);
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
            style: { backgroundColor: obj.color ?? "#0066cc" }
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
  const { scene } = props;
  const [, forceUpdate] = React5.useReducer((x) => x + 1, 0);
  React5.useEffect(() => {
    const unsubAdd = scene.on("add", () => forceUpdate());
    const unsubChange = scene.on("change", () => forceUpdate());
    const unsubDelete = scene.on("delete", () => forceUpdate());
    const unsubReset = scene.on("reset", () => forceUpdate());
    return () => {
      unsubAdd();
      unsubChange();
      unsubDelete();
      unsubReset();
    };
  }, [scene]);
  const objects = scene.list();
  return /* @__PURE__ */ jsx(
    "ul",
    {
      "data-testid": "algebra-list",
      className: "flex max-h-[calc(100vh-200px)] flex-col overflow-y-auto",
      children: objects.length === 0 ? /* @__PURE__ */ jsx("li", { className: "px-3 py-4 text-center text-xs text-zinc-500", children: "Ch\u01B0a c\xF3 \u0111\u1ED1i t\u01B0\u1EE3ng n\xE0o" }) : objects.map((o) => /* @__PURE__ */ jsx(AlgebraRow, { obj: o, scene, onDelete: (id) => scene.delete(id) }, o.id))
    }
  );
}
function LeftPanel(props) {
  const { scene, selectedTool, onSelectTool } = props;
  const [tab, setTab] = React5.useState("tools");
  return /* @__PURE__ */ jsxs(
    "div",
    {
      "data-testid": "left-panel",
      className: "flex h-full w-[280px] flex-col border-r border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900",
      children: [
        /* @__PURE__ */ jsxs("div", { className: "flex border-b border-zinc-200 dark:border-zinc-700", children: [
          /* @__PURE__ */ jsx(TabButton, { active: tab === "tools", onClick: () => setTab("tools"), children: "\u{1F9F0} Tools" }),
          /* @__PURE__ */ jsx(TabButton, { active: tab === "algebra", onClick: () => setTab("algebra"), children: "\u{1F4D0} Algebra" })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "flex-1 overflow-y-auto", children: tab === "tools" ? /* @__PURE__ */ jsx(ToolPalette, { selected: selectedTool, onSelect: onSelectTool }) : /* @__PURE__ */ jsx(AlgebraList, { scene }) })
      ]
    }
  );
}
function TabButton({
  active,
  onClick,
  children
}) {
  return /* @__PURE__ */ jsx(
    "button",
    {
      type: "button",
      onClick,
      "aria-pressed": active,
      className: "flex-1 px-3 py-2 text-sm font-medium " + (active ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"),
      children
    }
  );
}

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
var MiniBoard3D = React5.forwardRef(
  function MiniBoard3D2(props, ref) {
    const containerRef = React5.useRef(null);
    const boardRef = React5.useRef(null);
    const viewRef = React5.useRef(null);
    const { isDark, onView3DReady, onPointerClick, onPointerMove, onPointerLeave } = props;
    const onView3DReadyRef = React5.useRef(onView3DReady);
    const onPointerClickRef = React5.useRef(onPointerClick);
    const onPointerMoveRef = React5.useRef(onPointerMove);
    const onPointerLeaveRef = React5.useRef(onPointerLeave);
    onView3DReadyRef.current = onView3DReady;
    onPointerClickRef.current = onPointerClick;
    onPointerMoveRef.current = onPointerMove;
    onPointerLeaveRef.current = onPointerLeave;
    React5.useImperativeHandle(
      ref,
      () => ({
        getBoard: () => boardRef.current,
        getView3D: () => viewRef.current,
        getSvgElement: () => containerRef.current?.querySelector("svg") ?? null
      }),
      []
    );
    React5.useEffect(() => {
      const div = containerRef.current;
      if (!div) return;
      let cancelled = false;
      let JXG = null;
      let board = null;
      let svgEl = null;
      let handlePointerDown = null;
      let handlePointerMove = null;
      let handlePointerLeave = null;
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
            renderer: "svg"
          });
        } catch {
          return;
        }
        if (cancelled || !board) return;
        boardRef.current = board;
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
              az: { ...baseAttrs.az, value: DEFAULT_VIEW3D.azimuth },
              el: { ...baseAttrs.el, value: DEFAULT_VIEW3D.elevation }
            }
          );
        } catch {
        }
        viewRef.current = view;
        if (view) onView3DReadyRef.current?.(view, board);
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
          handlePointerDown = (e) => {
            if (!svgEl) return;
            onPointerClickRef.current?.(pixelToUser(e));
          };
          handlePointerMove = (e) => {
            if (!svgEl) return;
            onPointerMoveRef.current?.(pixelToUser(e));
          };
          handlePointerLeave = () => onPointerLeaveRef.current?.();
          svgEl.addEventListener("pointerdown", handlePointerDown);
          svgEl.addEventListener("pointermove", handlePointerMove);
          svgEl.addEventListener("pointerleave", handlePointerLeave);
        }
      })();
      return () => {
        cancelled = true;
        if (svgEl) {
          if (handlePointerDown) svgEl.removeEventListener("pointerdown", handlePointerDown);
          if (handlePointerMove) svgEl.removeEventListener("pointermove", handlePointerMove);
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

// src/stamps/geometry-3d/editor/scene/persistence.ts
function sceneToBoard(scene, view, bbox) {
  const elements = [];
  for (const obj of scene.list()) {
    const els = sceneObjectToElements(obj, scene);
    elements.push(...els);
  }
  return { version: 2, bbox, view, showAxes: true, showMesh: true, elements };
}
function sceneObjectToElements(obj, scene) {
  const baseAttrs = { label: obj.label, visible: obj.visible, color: obj.color };
  switch (obj.kind) {
    case "point": {
      let w;
      try {
        w = constraintToWorld(obj.constraint, scene);
      } catch {
        w = [0, 0, 0];
      }
      return [{
        type: "point3d",
        parents: [w[0], w[1], w[2]],
        attributes: { id: obj.id, ...baseAttrs },
        id: obj.id,
        label: obj.label,
        constraint: obj.constraint
      }];
    }
    case "segment":
    case "line":
    case "ray":
    case "vector":
    case "plane":
    case "sphere":
    case "polygon":
    case "polyhedron":
    case "cylinder":
    case "cone": {
      return [{
        type: pickJxgType(obj.kind),
        parents: [],
        attributes: { id: obj.id, ...baseAttrs, sceneKind: obj.kind, sceneSpec: encodeSpec(obj) },
        id: obj.id,
        label: obj.label
      }];
    }
  }
}
function pickJxgType(kind) {
  switch (kind) {
    case "point":
      return "point3d";
    case "segment":
    case "line":
    case "ray":
    case "vector":
      return "line3d";
    case "plane":
      return "plane3d";
    case "sphere":
      return "sphere3d";
    case "polygon":
    case "polyhedron":
    case "cylinder":
    case "cone":
      return "polygon3d";
  }
}
function encodeSpec(obj) {
  const rest = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k === "id" || k === "label" || k === "visible" || k === "color" || k === "kind") continue;
    rest[k] = v;
  }
  return rest;
}
function boardToScene(board) {
  const scene = new Scene3D();
  for (const el of board.elements) {
    if (el.type === "point3d") {
      const constraint = el.constraint ?? {
        kind: "free",
        x: Number(el.parents[0] ?? 0),
        y: Number(el.parents[1] ?? 0),
        z: Number(el.parents[2] ?? 0)
      };
      const color2 = el.attributes["color"];
      const visible2 = el.attributes["visible"] !== false;
      try {
        scene.insert({
          kind: "point",
          id: el.id,
          label: el.label ?? el.id,
          visible: visible2,
          color: color2,
          constraint
        });
      } catch {
      }
      continue;
    }
    const sceneKind = el.attributes["sceneKind"];
    const sceneSpec = el.attributes["sceneSpec"];
    if (!sceneKind || !sceneSpec) continue;
    const color = el.attributes["color"];
    const visible = el.attributes["visible"] !== false;
    const obj = {
      id: el.id,
      label: el.label ?? el.id,
      visible,
      color,
      kind: sceneKind,
      ...sceneSpec
    };
    try {
      scene.insert(obj);
    } catch {
    }
  }
  return scene;
}
var EditorPanel = React5.forwardRef(
  function EditorPanel2(props, ref) {
    const isDark = props.isDark ?? false;
    const sceneRef = React5.useRef(null);
    if (!sceneRef.current) sceneRef.current = new Scene3D();
    const controllerRef = React5.useRef(null);
    if (!controllerRef.current) controllerRef.current = new ToolController(sceneRef.current);
    const [selectedTool, setSelectedTool] = React5.useState("move");
    const [hint, setHint] = React5.useState("Ch\u1ECDn c\xF4ng c\u1EE5 trong b\u1EA3ng b\xEAn tr\xE1i");
    const [hoverLabel, setHoverLabel] = React5.useState(null);
    const boardRef = React5.useRef(null);
    const rendererRef = React5.useRef(null);
    React5.useEffect(() => {
      if (props.initialState && sceneRef.current) {
        const loaded = boardToScene(props.initialState);
        sceneRef.current.reset();
        for (const obj of loaded.list()) {
          sceneRef.current.insert(obj);
        }
      }
    }, []);
    React5.useEffect(() => {
      const ctrl = controllerRef.current;
      const unsub = ctrl.on((state) => {
        setHint(state.hint);
        setSelectedTool(state.tool?.key ?? "move");
      });
      return unsub;
    }, []);
    React5.useEffect(() => {
      return () => {
        rendererRef.current?.dispose();
        rendererRef.current = null;
      };
    }, []);
    const handleView3DReady = React5.useCallback((view) => {
      if (!sceneRef.current) return;
      rendererRef.current = new JxgRenderer(sceneRef.current, view);
    }, []);
    const handleClick = React5.useCallback((screen) => {
      const board = boardRef.current;
      if (!board) return;
      const view = board.getView3D();
      if (!view) return;
      try {
        const hit = hitTest(screen, view, sceneRef.current);
        controllerRef.current.consumeHit(hit);
      } catch {
      }
    }, []);
    const handleMove = React5.useCallback((screen) => {
      const board = boardRef.current;
      if (!board) return;
      const view = board.getView3D();
      if (!view) return;
      let hit;
      try {
        hit = hitTest(screen, view, sceneRef.current);
      } catch {
        setHoverLabel(null);
        return;
      }
      if (hit.kind === "empty") setHoverLabel(null);
      else if (hit.kind === "existingPoint") {
        const obj = sceneRef.current.get(hit.pointId);
        setHoverLabel(obj?.label ?? null);
      } else if (hit.kind === "onGround") setHoverLabel("m\u1EB7t n\u1EC1n");
      else if (hit.kind === "onAxis") setHoverLabel(`tr\u1EE5c ${hit.axis.toUpperCase()}`);
      else if (hit.kind === "onPlane") setHoverLabel(`m\u1EB7t ph\u1EB3ng ${hit.planeId}`);
      else if (hit.kind === "onSphere") setHoverLabel(`m\u1EB7t c\u1EA7u ${hit.sphereId}`);
      else setHoverLabel(null);
    }, []);
    React5.useImperativeHandle(
      ref,
      () => ({
        hasContent: () => (sceneRef.current?.list().length ?? 0) > 0,
        serialize: () => {
          const view = boardRef.current?.getView3D();
          const v = view;
          const azimuth = typeof v?.az?.Value === "function" ? v.az.Value() : 0;
          const elevation = typeof v?.el?.Value === "function" ? v.el.Value() : 0;
          return sceneToBoard(
            sceneRef.current,
            { azimuth, elevation, bbox3D: [-5, -5, -5, 5, 5, 5] },
            [-6, -6, 6, 6]
          );
        }
      }),
      []
    );
    return /* @__PURE__ */ jsxs(
      "div",
      {
        "data-testid": "editor-panel-3d",
        className: [
          isDark ? "theme--dark " : "",
          "flex h-full w-full overflow-hidden bg-white dark:bg-zinc-950"
        ].join(""),
        children: [
          /* @__PURE__ */ jsx(
            LeftPanel,
            {
              scene: sceneRef.current,
              selectedTool,
              onSelectTool: (k) => controllerRef.current.selectTool(k)
            }
          ),
          /* @__PURE__ */ jsxs("div", { className: "flex min-w-0 flex-1 flex-col", children: [
            /* @__PURE__ */ jsx("div", { className: "min-h-0 flex-1", children: /* @__PURE__ */ jsx(
              MiniBoard3D,
              {
                ref: boardRef,
                isDark,
                onView3DReady: handleView3DReady,
                onPointerClick: handleClick,
                onPointerMove: handleMove,
                onPointerLeave: () => setHoverLabel(null)
              }
            ) }),
            /* @__PURE__ */ jsx(StatusHint, { hint, hoverLabel })
          ] })
        ]
      }
    );
  }
);
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
    const initial = useMemo(
      () => parseInitial(editingElement),
      [editingElement]
    );
    const performInsert = useCallback(
      async (board, width, height, svgString) => {
        if (!api) return;
        const jsonState = serializeBoard3D(board);
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
    const tryInsert = useCallback(() => {
      if (!editorRef.current) return false;
      if (!editorRef.current.hasContent()) return false;
      const board = editorRef.current.serialize();
      if (board.elements.length === 0) return false;
      void performInsert(board, 0, 0, "");
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
    const wrapperStyle = isMobile ? { position: "fixed", inset: 0, zIndex: 40 } : {
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      zIndex: 40
    };
    return /* @__PURE__ */ jsxs(
      "div",
      {
        role: "dialog",
        "aria-label": "D\u1EF1ng h\xECnh h\u1ECDc 3D",
        "data-testid": "geom3d-host",
        "data-stamp-area": "true",
        style: wrapperStyle,
        className: [
          isDark ? "theme--dark " : "",
          "flex flex-col overflow-hidden bg-white",
          isMobile ? "h-full w-full" : "h-[600px] max-h-[85vh] w-[1040px] max-w-[calc(100vw-80px)] rounded-lg border border-slate-300 shadow-2xl ring-1 ring-black/5"
        ].join(" "),
        children: [
          /* @__PURE__ */ jsxs("header", { className: "flex items-center gap-2 border-b border-slate-200 bg-gradient-to-r from-blue-600 to-cyan-600 px-3 py-2 text-white", children: [
            /* @__PURE__ */ jsxs("h3", { className: "flex flex-1 items-center gap-2 text-sm font-semibold", children: [
              /* @__PURE__ */ jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ jsx("path", { d: "M4 7 L14 4 L20 7 L14 10 Z M4 7 L4 17 L14 20 L14 10 M14 20 L20 17 L20 7" }) }),
              "H\xECnh h\u1ECDc kh\xF4ng gian (3D)"
            ] }),
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: tryInsert,
                "data-testid": "geom3d-insert-btn",
                className: "rounded bg-white/15 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/25",
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
              onClose
            }
          ) })
        ]
      }
    );
  }
);

export { Geometry3DStampHost };
//# sourceMappingURL=host-IR36GT5N.mjs.map
//# sourceMappingURL=host-IR36GT5N.mjs.map