import type { Scene3DObject } from '../scene/types';
import type { Scene3D } from '../scene/Scene3D';
import { constraintToWorld } from '../scene/constraintMath';

export function symbolicFor(obj: Scene3DObject, scene: Scene3D): string {
  const n = (id: string): string => scene.get(id)?.label ?? id;
  switch (obj.kind) {
    case 'point': {
      const c = obj.constraint;
      switch (c.kind) {
        case 'free': return 'Point';
        case 'onGround': return 'Point(xyPlane)';
        case 'onAxis': return `Point(${c.axis}Axis)`;
        case 'onPlane': return `Point(${n(c.planeId)})`;
        case 'onLine': return `Point(${n(c.lineId)})`;
        case 'onPolygon': return `Point(${n(c.polygonId)})`;
        case 'onSphere': return `Point(${n(c.sphereId)})`;
      }
      return 'Point';
    }
    case 'segment': return `Segment(${n(obj.p1)}, ${n(obj.p2)})`;
    case 'line':    return `Line(${n(obj.p1)}, ${n(obj.p2)})`;
    case 'ray':     return `Ray(${n(obj.origin)}, ${n(obj.through)})`;
    case 'vector':  return `Vector(${n(obj.from)}, ${n(obj.to)})`;
    case 'polygon': return `Polygon(${obj.vertices.map(n).join(', ')})`;
    case 'plane':   return `Plane(${n(obj.p1)}, ${n(obj.p2)}, ${n(obj.p3)})`;
    case 'sphere':  return `Sphere(${n(obj.center)}, ${n(obj.surfacePoint)})`;
    case 'polyhedron': {
      const flavorVn: Record<typeof obj.flavor, string> = {
        pyramid: 'Chóp', prism: 'Lăng trụ', tetrahedron: 'Tứ diện', cube: 'Lập phương',
      };
      return `${flavorVn[obj.flavor]}(${obj.vertices.length} đỉnh)`;
    }
    case 'cylinder': return `Cylinder(${n(obj.baseCenter)}, ${n(obj.topCenter)}, r=${obj.radius})`;
    case 'cone':     return `Cone(${n(obj.baseCenter)}, ${n(obj.apex)}, r=${obj.radius})`;
  }
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
