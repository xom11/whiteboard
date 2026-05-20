// Pure constraint math — không phụ thuộc Scene3D nữa, nhận State của core/scene.
import type { State, SceneObject } from '../../../../core/scene';
import type { Constraint3D } from '../../../../core/scene/kinds/3d-constraint';
import type { Point3DAttrs } from '../../../../core/scene/kinds/point3d';
import type { Segment3DAttrs } from '../../../../core/scene/kinds/segment3d';
import type { Line3DAttrs } from '../../../../core/scene/kinds/line3d';
import type { Ray3DAttrs } from '../../../../core/scene/kinds/ray3d';
import type { Vector3DAttrs } from '../../../../core/scene/kinds/vector3d';
import type { Plane3DAttrs } from '../../../../core/scene/kinds/plane3d';
import type { Polygon3DAttrs } from '../../../../core/scene/kinds/polygon3d';
import type { Sphere3DAttrs } from '../../../../core/scene/kinds/sphere3d';

export type Vec3 = [number, number, number];

function sub(a: Vec3, b: Vec3): Vec3 { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function add(a: Vec3, b: Vec3): Vec3 { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function scale(a: Vec3, k: number): Vec3 { return [a[0] * k, a[1] * k, a[2] * k]; }
function dot(a: Vec3, b: Vec3): number { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function norm(a: Vec3): number { return Math.sqrt(dot(a, a)); }
function normalize(a: Vec3): Vec3 { const n = norm(a); return n === 0 ? a : scale(a, 1 / n); }

function getPointWorld(id: string, state: State): Vec3 {
  const obj = state.objects[id];
  if (!obj || obj.kind !== 'point3d') {
    throw new Error(`constraintMath: point ${id} not found`);
  }
  const attrs = obj.attrs as Point3DAttrs;
  return constraintToWorld(attrs.constraint, state);
}

function getPlaneBasis(
  planeObj: SceneObject<Plane3DAttrs>,
  state: State,
): { origin: Vec3; basis1: Vec3; basis2: Vec3; normal: Vec3 } {
  const p1 = getPointWorld(planeObj.attrs.p1, state);
  const p2 = getPointWorld(planeObj.attrs.p2, state);
  const p3 = getPointWorld(planeObj.attrs.p3, state);
  const basis1 = sub(p2, p1);
  const tmp = sub(p3, p1);
  const normal = normalize(cross(basis1, tmp));
  const basis2 = cross(normal, basis1);
  return { origin: p1, basis1, basis2, normal };
}

export function constraintToWorld(c: Constraint3D, state: State): Vec3 {
  switch (c.kind) {
    case 'free': return [c.x, c.y, c.z];
    case 'onGround': return [c.x, c.y, 0];
    case 'onAxis': {
      if (c.axis === 'x') return [c.t, 0, 0];
      if (c.axis === 'y') return [0, c.t, 0];
      return [0, 0, c.t];
    }
    case 'onPlane': {
      const plane = state.objects[c.planeId];
      if (!plane || plane.kind !== 'plane3d') throw new Error('onPlane: plane missing');
      const { origin, basis1, basis2 } = getPlaneBasis(plane as SceneObject<Plane3DAttrs>, state);
      return add(add(origin, scale(basis1, c.u)), scale(basis2, c.v));
    }
    case 'onLine': {
      const line = state.objects[c.lineId];
      if (!line) throw new Error('onLine: parent missing');
      let p1Id: string;
      let p2Id: string;
      if (line.kind === 'line3d' || line.kind === 'segment3d') {
        const a = line.attrs as Segment3DAttrs | Line3DAttrs;
        p1Id = a.p1; p2Id = a.p2;
      } else if (line.kind === 'ray3d') {
        const a = line.attrs as Ray3DAttrs;
        p1Id = a.origin; p2Id = a.through;
      } else if (line.kind === 'vector3d') {
        const a = line.attrs as Vector3DAttrs;
        p1Id = a.from; p2Id = a.to;
      } else {
        throw new Error('onLine: parent kind not supported');
      }
      const p1 = getPointWorld(p1Id, state);
      const p2 = getPointWorld(p2Id, state);
      const dir = sub(p2, p1);
      return add(p1, scale(dir, c.t));
    }
    case 'onPolygon': {
      const pg = state.objects[c.polygonId];
      if (!pg || pg.kind !== 'polygon3d') throw new Error('onPolygon: parent missing');
      const v = (pg.attrs as Polygon3DAttrs).vertices;
      if (v.length < 3) throw new Error('onPolygon: < 3 vertices');
      const p1 = getPointWorld(v[0], state);
      const p2 = getPointWorld(v[1], state);
      const p3 = getPointWorld(v[2], state);
      const basis1 = sub(p2, p1);
      const tmp = sub(p3, p1);
      const normal = normalize(cross(basis1, tmp));
      const basis2 = cross(normal, basis1);
      return add(add(p1, scale(basis1, c.u)), scale(basis2, c.v));
    }
    case 'onSphere': {
      const sph = state.objects[c.sphereId];
      if (!sph || sph.kind !== 'sphere3d') throw new Error('onSphere: parent missing');
      const a = sph.attrs as Sphere3DAttrs;
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

export function worldToConstraint(current: Constraint3D, world: Vec3, state: State): Constraint3D {
  switch (current.kind) {
    case 'free': return { kind: 'free', x: world[0], y: world[1], z: world[2] };
    case 'onGround': return { kind: 'onGround', x: world[0], y: world[1] };
    case 'onAxis': {
      const t = current.axis === 'x' ? world[0] : current.axis === 'y' ? world[1] : world[2];
      return { kind: 'onAxis', axis: current.axis, t };
    }
    case 'onPlane': {
      const plane = state.objects[current.planeId];
      if (!plane || plane.kind !== 'plane3d') return current;
      const { origin, basis1, basis2 } = getPlaneBasis(plane as SceneObject<Plane3DAttrs>, state);
      const rel = sub(world, origin);
      const b1n = dot(basis1, basis1);
      const b2n = dot(basis2, basis2);
      const u = b1n === 0 ? 0 : dot(rel, basis1) / b1n;
      const v = b2n === 0 ? 0 : dot(rel, basis2) / b2n;
      return { kind: 'onPlane', planeId: current.planeId, u, v };
    }
    case 'onLine': {
      const line = state.objects[current.lineId];
      if (!line) return current;
      let p1Id: string;
      let p2Id: string;
      if (line.kind === 'line3d' || line.kind === 'segment3d') {
        const a = line.attrs as Segment3DAttrs | Line3DAttrs;
        p1Id = a.p1; p2Id = a.p2;
      } else if (line.kind === 'ray3d') {
        const a = line.attrs as Ray3DAttrs;
        p1Id = a.origin; p2Id = a.through;
      } else if (line.kind === 'vector3d') {
        const a = line.attrs as Vector3DAttrs;
        p1Id = a.from; p2Id = a.to;
      } else {
        return current;
      }
      const p1 = getPointWorld(p1Id, state);
      const p2 = getPointWorld(p2Id, state);
      const dir = sub(p2, p1);
      const len2 = dot(dir, dir);
      const t = len2 === 0 ? 0 : dot(sub(world, p1), dir) / len2;
      return { kind: 'onLine', lineId: current.lineId, t };
    }
    case 'onPolygon': {
      const pg = state.objects[current.polygonId];
      if (!pg || pg.kind !== 'polygon3d') return current;
      const vertices = (pg.attrs as Polygon3DAttrs).vertices;
      if (vertices.length < 3) return current;
      const p1 = getPointWorld(vertices[0], state);
      const p2 = getPointWorld(vertices[1], state);
      const p3 = getPointWorld(vertices[2], state);
      const basis1 = sub(p2, p1);
      const tmp = sub(p3, p1);
      const normal = normalize(cross(basis1, tmp));
      const basis2 = cross(normal, basis1);
      const rel = sub(world, p1);
      const b1n = dot(basis1, basis1);
      const b2n = dot(basis2, basis2);
      const u = b1n === 0 ? 0 : dot(rel, basis1) / b1n;
      const v = b2n === 0 ? 0 : dot(rel, basis2) / b2n;
      return { kind: 'onPolygon', polygonId: current.polygonId, u, v };
    }
    case 'onSphere': {
      const sph = state.objects[current.sphereId];
      if (!sph || sph.kind !== 'sphere3d') return current;
      const center = getPointWorld((sph.attrs as Sphere3DAttrs).center, state);
      const rel = sub(world, center);
      const r = norm(rel);
      if (r === 0) return current;
      const phi = Math.acos(rel[2] / r);
      const theta = Math.atan2(rel[1], rel[0]);
      return { kind: 'onSphere', sphereId: current.sphereId, theta, phi };
    }
  }
}
