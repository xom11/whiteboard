import type { SceneObject, State } from '../../../../core/scene';
import { constraintToWorld } from '../scene/constraintMath';
import type { Point3DAttrs } from '../../../../core/scene/kinds/point3d';
import type { Segment3DAttrs } from '../../../../core/scene/kinds/segment3d';
import type { Line3DAttrs } from '../../../../core/scene/kinds/line3d';
import type { Ray3DAttrs } from '../../../../core/scene/kinds/ray3d';
import type { Vector3DAttrs } from '../../../../core/scene/kinds/vector3d';
import type { Plane3DAttrs } from '../../../../core/scene/kinds/plane3d';
import type { Polygon3DAttrs } from '../../../../core/scene/kinds/polygon3d';
import type { Sphere3DAttrs } from '../../../../core/scene/kinds/sphere3d';
import type { Polyhedron3DAttrs, PolyhedronFlavor } from '../../../../core/scene/kinds/polyhedron3d';
import type { Cylinder3DAttrs } from '../../../../core/scene/kinds/cylinder3d';
import type { Cone3DAttrs } from '../../../../core/scene/kinds/cone3d';

export function symbolicFor(obj: SceneObject, state: State): string {
  const n = (id: string): string => state.objects[id]?.label ?? id;
  switch (obj.kind) {
    case 'point3d': {
      const c = (obj.attrs as Point3DAttrs).constraint;
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
    case 'segment3d': {
      const a = obj.attrs as Segment3DAttrs;
      return `Segment(${n(a.p1)}, ${n(a.p2)})`;
    }
    case 'line3d': {
      const a = obj.attrs as Line3DAttrs;
      return `Line(${n(a.p1)}, ${n(a.p2)})`;
    }
    case 'ray3d': {
      const a = obj.attrs as Ray3DAttrs;
      return `Ray(${n(a.origin)}, ${n(a.through)})`;
    }
    case 'vector3d': {
      const a = obj.attrs as Vector3DAttrs;
      return `Vector(${n(a.from)}, ${n(a.to)})`;
    }
    case 'polygon3d': {
      const a = obj.attrs as Polygon3DAttrs;
      return `Polygon(${a.vertices.map(n).join(', ')})`;
    }
    case 'plane3d': {
      const a = obj.attrs as Plane3DAttrs;
      return `Plane(${n(a.p1)}, ${n(a.p2)}, ${n(a.p3)})`;
    }
    case 'sphere3d': {
      const a = obj.attrs as Sphere3DAttrs;
      return `Sphere(${n(a.center)}, ${n(a.surfacePoint)})`;
    }
    case 'polyhedron3d': {
      const a = obj.attrs as Polyhedron3DAttrs;
      const flavorVn: Record<PolyhedronFlavor, string> = {
        pyramid: 'Chóp', prism: 'Lăng trụ', tetrahedron: 'Tứ diện', cube: 'Lập phương',
      };
      return `${flavorVn[a.flavor]}(${a.vertices.length} đỉnh)`;
    }
    case 'cylinder3d': {
      const a = obj.attrs as Cylinder3DAttrs;
      return `Cylinder(${n(a.baseCenter)}, ${n(a.topCenter)}, r=${a.radius})`;
    }
    case 'cone3d': {
      const a = obj.attrs as Cone3DAttrs;
      return `Cone(${n(a.baseCenter)}, ${n(a.apex)}, r=${a.radius})`;
    }
  }
  return obj.label;
}

/**
 * Compact numeric value display for an object. Free / surface-projected points
 * show their world position; non-points show a summary.
 */
export function numericFor(obj: SceneObject, state: State): string {
  if (obj.kind === 'point3d') {
    const w = constraintToWorld((obj.attrs as Point3DAttrs).constraint, state);
    return `(${round(w[0])}, ${round(w[1])}, ${round(w[2])})`;
  }
  return '';
}

function round(x: number): string {
  return Math.abs(x) < 1e-9 ? '0' : (Math.round(x * 100) / 100).toString();
}
