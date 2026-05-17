import type { Constraint, Vec3, Scene3DObject } from './types';
import type { Scene3D } from './Scene3D';

function sub(a: Vec3, b: Vec3): Vec3 { return [a[0]-b[0], a[1]-b[1], a[2]-b[2]]; }
function add(a: Vec3, b: Vec3): Vec3 { return [a[0]+b[0], a[1]+b[1], a[2]+b[2]]; }
function scale(a: Vec3, k: number): Vec3 { return [a[0]*k, a[1]*k, a[2]*k]; }
function dot(a: Vec3, b: Vec3): number { return a[0]*b[0] + a[1]*b[1] + a[2]*b[2]; }
function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
}
function norm(a: Vec3): number { return Math.sqrt(dot(a, a)); }
function normalize(a: Vec3): Vec3 { const n = norm(a); return n === 0 ? a : scale(a, 1/n); }

function getPointWorld(id: string, scene: Scene3D): Vec3 {
  const obj = scene.get(id);
  if (!obj || obj.kind !== 'point') {
    throw new Error(`constraintMath: point ${id} not found`);
  }
  return constraintToWorld(obj.constraint, scene);
}

function getPlaneBasis(planeObj: Extract<Scene3DObject, { kind: 'plane' }>, scene: Scene3D): {
  origin: Vec3; basis1: Vec3; basis2: Vec3; normal: Vec3;
} {
  const p1 = getPointWorld(planeObj.p1, scene);
  const p2 = getPointWorld(planeObj.p2, scene);
  const p3 = getPointWorld(planeObj.p3, scene);
  const basis1 = sub(p2, p1);
  const tmp = sub(p3, p1);
  const normal = normalize(cross(basis1, tmp));
  const basis2 = cross(normal, basis1);
  return { origin: p1, basis1, basis2, normal };
}

export function constraintToWorld(c: Constraint, scene: Scene3D): Vec3 {
  switch (c.kind) {
    case 'free': return [c.x, c.y, c.z];
    case 'onGround': return [c.x, c.y, 0];
    case 'onAxis': {
      if (c.axis === 'x') return [c.t, 0, 0];
      if (c.axis === 'y') return [0, c.t, 0];
      return [0, 0, c.t];
    }
    case 'onPlane': {
      const plane = scene.get(c.planeId);
      if (!plane || plane.kind !== 'plane') throw new Error('onPlane: plane missing');
      const { origin, basis1, basis2 } = getPlaneBasis(plane, scene);
      return add(add(origin, scale(basis1, c.u)), scale(basis2, c.v));
    }
    case 'onLine': {
      const line = scene.get(c.lineId);
      if (!line || (line.kind !== 'line' && line.kind !== 'segment' && line.kind !== 'ray')) {
        throw new Error('onLine: parent missing');
      }
      const p1Id = line.kind === 'ray' ? line.origin : line.p1;
      const p2Id = line.kind === 'ray' ? line.through : line.p2;
      const p1 = getPointWorld(p1Id, scene);
      const p2 = getPointWorld(p2Id, scene);
      const dir = sub(p2, p1);
      return add(p1, scale(dir, c.t));
    }
    case 'onPolygon': {
      const pg = scene.get(c.polygonId);
      if (!pg || pg.kind !== 'polygon') throw new Error('onPolygon: parent missing');
      const v = pg.vertices;
      if (v.length < 3) throw new Error('onPolygon: < 3 vertices');
      const p1 = getPointWorld(v[0], scene);
      const p2 = getPointWorld(v[1], scene);
      const p3 = getPointWorld(v[2], scene);
      const basis1 = sub(p2, p1);
      const tmp = sub(p3, p1);
      const normal = normalize(cross(basis1, tmp));
      const basis2 = cross(normal, basis1);
      return add(add(p1, scale(basis1, c.u)), scale(basis2, c.v));
    }
    case 'onSphere': {
      const sph = scene.get(c.sphereId);
      if (!sph || sph.kind !== 'sphere') throw new Error('onSphere: parent missing');
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

export function worldToConstraint(current: Constraint, world: Vec3, scene: Scene3D): Constraint {
  switch (current.kind) {
    case 'free': return { kind: 'free', x: world[0], y: world[1], z: world[2] };
    case 'onGround': return { kind: 'onGround', x: world[0], y: world[1] };
    case 'onAxis': {
      const t = current.axis === 'x' ? world[0] : current.axis === 'y' ? world[1] : world[2];
      return { kind: 'onAxis', axis: current.axis, t };
    }
    case 'onPlane': {
      const plane = scene.get(current.planeId);
      if (!plane || plane.kind !== 'plane') return current;
      const { origin, basis1, basis2 } = getPlaneBasis(plane, scene);
      const rel = sub(world, origin);
      const b1n = dot(basis1, basis1);
      const b2n = dot(basis2, basis2);
      const u = b1n === 0 ? 0 : dot(rel, basis1) / b1n;
      const v = b2n === 0 ? 0 : dot(rel, basis2) / b2n;
      return { kind: 'onPlane', planeId: current.planeId, u, v };
    }
    case 'onLine': {
      const line = scene.get(current.lineId);
      if (!line) return current;
      const p1Id = line.kind === 'ray' ? line.origin : (line as { p1: string }).p1;
      const p2Id = line.kind === 'ray' ? line.through : (line as { p2: string }).p2;
      const p1 = getPointWorld(p1Id, scene);
      const p2 = getPointWorld(p2Id, scene);
      const dir = sub(p2, p1);
      const len2 = dot(dir, dir);
      const t = len2 === 0 ? 0 : dot(sub(world, p1), dir) / len2;
      return { kind: 'onLine', lineId: current.lineId, t };
    }
    case 'onPolygon': {
      const pg = scene.get(current.polygonId);
      if (!pg || pg.kind !== 'polygon' || pg.vertices.length < 3) return current;
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
      return { kind: 'onPolygon', polygonId: current.polygonId, u, v };
    }
    case 'onSphere': {
      const sph = scene.get(current.sphereId);
      if (!sph || sph.kind !== 'sphere') return current;
      const center = getPointWorld(sph.center, scene);
      const rel = sub(world, center);
      const r = norm(rel);
      if (r === 0) return current;
      const phi = Math.acos(rel[2] / r);
      const theta = Math.atan2(rel[1], rel[0]);
      return { kind: 'onSphere', sphereId: current.sphereId, theta, phi };
    }
  }
}
