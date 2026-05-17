export type Vec3 = [number, number, number];

export type Constraint =
  | { kind: 'free'; x: number; y: number; z: number }
  | { kind: 'onGround'; x: number; y: number }
  | { kind: 'onAxis'; axis: 'x' | 'y' | 'z'; t: number }
  | { kind: 'onPlane'; planeId: string; u: number; v: number }
  | { kind: 'onLine'; lineId: string; t: number }
  | { kind: 'onPolygon'; polygonId: string; u: number; v: number }
  | { kind: 'onSphere'; sphereId: string; theta: number; phi: number };

export interface SceneObjectBase {
  id: string;
  label: string;
  visible: boolean;
  color?: string;
}

export type Scene3DObject =
  | (SceneObjectBase & { kind: 'point'; constraint: Constraint })
  | (SceneObjectBase & { kind: 'segment'; p1: string; p2: string })
  | (SceneObjectBase & { kind: 'line'; p1: string; p2: string })
  | (SceneObjectBase & { kind: 'ray'; origin: string; through: string })
  | (SceneObjectBase & { kind: 'vector'; from: string; to: string })
  | (SceneObjectBase & { kind: 'polygon'; vertices: string[] })
  | (SceneObjectBase & { kind: 'plane'; p1: string; p2: string; p3: string })
  | (SceneObjectBase & { kind: 'sphere'; center: string; surfacePoint: string })
  | (SceneObjectBase & {
      kind: 'polyhedron';
      flavor: 'pyramid' | 'prism' | 'tetrahedron' | 'cube';
      vertices: string[];
      faces: number[][];
    })
  | (SceneObjectBase & { kind: 'cylinder'; baseCenter: string; topCenter: string; radius: number })
  | (SceneObjectBase & { kind: 'cone'; baseCenter: string; apex: string; radius: number });

export type ObjectKind = Scene3DObject['kind'];
