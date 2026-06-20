// src/core/scene/kinds/3d-constraint.ts
export type Vec3 = [number, number, number];

export type Constraint3D =
  | { kind: 'free'; x: number; y: number; z: number }
  | { kind: 'onGround'; x: number; y: number }
  | { kind: 'onAxis'; axis: 'x' | 'y' | 'z'; t: number }
  | { kind: 'onPlane'; planeId: string; u: number; v: number }
  | { kind: 'onLine'; lineId: string; t: number }
  | { kind: 'onPolygon'; polygonId: string; u: number; v: number }
  | { kind: 'onSphere'; sphereId: string; theta: number; phi: number };

export function constraintRefs(c: Constraint3D): string[] {
  switch (c.kind) {
    case 'onPlane': return [c.planeId];
    case 'onLine': return [c.lineId];
    case 'onPolygon': return [c.polygonId];
    case 'onSphere': return [c.sphereId];
    // Kind KHÔNG có ref scene-object (toạ độ literal): liệt kê TƯỜNG MINH để
    // exhaustive never-guard bên dưới buộc khai báo khi thêm constraint kind mới
    // (mô phỏng constraintRefs2D — quên case = cascade-delete/deps sai âm thầm).
    case 'free':
    case 'onGround':
    case 'onAxis':
      return [];
    default: {
      const _exhaustive: never = c;
      void _exhaustive;
      return [];
    }
  }
}
