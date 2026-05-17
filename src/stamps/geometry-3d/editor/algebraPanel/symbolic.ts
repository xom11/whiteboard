import type { Scene3DObject } from '../scene/types';
import type { Scene3D } from '../scene/Scene3D';
import { constraintToWorld } from '../scene/constraintMath';

export function symbolicFor(obj: Scene3DObject, _scene: Scene3D): string {
  switch (obj.kind) {
    case 'point': {
      const c = obj.constraint;
      switch (c.kind) {
        case 'free': return 'Point';
        case 'onGround': return 'Point(xyPlane)';
        case 'onAxis': return `Point(${c.axis}Axis)`;
        case 'onPlane': return `Point(${c.planeId})`;
        case 'onLine': return `Point(${c.lineId})`;
        case 'onPolygon': return `Point(${c.polygonId})`;
        case 'onSphere': return `Point(${c.sphereId})`;
      }
      return 'Point';
    }
    case 'segment': return `Segment(${nameOf(obj.p1)}, ${nameOf(obj.p2)})`;
    case 'line':    return `Line(${nameOf(obj.p1)}, ${nameOf(obj.p2)})`;
    case 'ray':     return `Ray(${nameOf(obj.origin)}, ${nameOf(obj.through)})`;
    case 'vector':  return `Vector(${nameOf(obj.from)}, ${nameOf(obj.to)})`;
    case 'polygon': return `Polygon(${obj.vertices.map(nameOf).join(', ')})`;
    case 'plane':   return `Plane(${nameOf(obj.p1)}, ${nameOf(obj.p2)}, ${nameOf(obj.p3)})`;
    case 'sphere':  return `Sphere(${nameOf(obj.center)}, ${nameOf(obj.surfacePoint)})`;
    case 'polyhedron': {
      const flavorVn: Record<typeof obj.flavor, string> = {
        pyramid: 'Chóp', prism: 'Lăng trụ', tetrahedron: 'Tứ diện', cube: 'Lập phương',
      };
      return `${flavorVn[obj.flavor]}(${obj.vertices.length} đỉnh)`;
    }
    case 'cylinder': return `Cylinder(${nameOf(obj.baseCenter)}, ${nameOf(obj.topCenter)}, r=${obj.radius})`;
    case 'cone':     return `Cone(${nameOf(obj.baseCenter)}, ${nameOf(obj.apex)}, r=${obj.radius})`;
  }
}

function nameOf(id: string): string {
  return id;
}

/**
 * Compact numeric value display for an object. Free / surface-projected points
 * show their world position; non-points show a summary.
 */
export function numericFor(obj: Scene3DObject, scene: Scene3D): string {
  if (obj.kind === 'point') {
    const w = constraintToWorld(obj.constraint, scene);
    return `(${round(w[0])}, ${round(w[1])}, ${round(w[2])})`;
  }
  return '';
}

function round(x: number): string {
  return Math.abs(x) < 1e-9 ? '0' : (Math.round(x * 100) / 100).toString();
}
