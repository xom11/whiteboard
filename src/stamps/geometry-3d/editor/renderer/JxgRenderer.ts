import type { Scene3D } from '../scene/Scene3D';
import type { Scene3DObject, Vec3 } from '../scene/types';
import { constraintToWorld } from '../scene/constraintMath';
import { cylinderFaces, coneFaces } from './faceted';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JxgObj = any;

export interface View3DLike {
  create(type: string, parents: unknown[], attrs: Record<string, unknown>): JxgObj;
}

export class JxgRenderer {
  private map = new Map<string, JxgObj>();
  private unsubAdd: () => void;
  private unsubChange: () => void;
  private unsubDelete: () => void;
  private unsubReset: () => void;

  constructor(private scene: Scene3D, private view: View3DLike) {
    this.unsubAdd = scene.on('add', (o) => this.handleAdd(o));
    this.unsubChange = scene.on('change', (o) => this.handleChange(o));
    this.unsubDelete = scene.on('delete', (id) => this.handleDelete(id));
    this.unsubReset = scene.on('reset', () => this.handleReset());
    for (const obj of scene.list()) this.handleAdd(obj);
  }

  dispose(): void {
    this.unsubAdd();
    this.unsubChange();
    this.unsubDelete();
    this.unsubReset();
    for (const [id, j] of this.map) {
      try { j.remove?.(); } catch { /* swallow */ }
      this.map.delete(id);
    }
  }

  private handleAdd(obj: Scene3DObject): void {
    if (this.map.has(obj.id)) return;

    if (obj.kind === 'point') {
      const world = constraintToWorld(obj.constraint, this.scene);
      // fixed: true disables JSXGraph's native drag. Drag of existing points
      // is handled exclusively by MiniBoard3D.shouldStartPointDrag +
      // EditorPanel.onPointerDrag so the constraint math (Z-only in Point
      // mode, XY raycast in Move mode) is the single source of truth.
      const attrs = { id: obj.id, name: obj.label, size: 4, visible: obj.visible, fixed: true };
      const jxg = this.view.create('point3d', world, attrs);
      this.map.set(obj.id, jxg);
      return;
    }

    if (obj.kind === 'segment') {
      const a = this.map.get(obj.p1);
      const b = this.map.get(obj.p2);
      const attrs = {
        id: obj.id,
        straightFirst: false,
        straightLast: false,
        visible: obj.visible,
        strokeColor: obj.color ?? '#0066cc',
        strokeWidth: 2,
      };
      this.map.set(obj.id, this.view.create('line3d', [a, b], attrs));
      return;
    }

    if (obj.kind === 'line') {
      const attrs = {
        id: obj.id,
        visible: obj.visible,
        strokeColor: obj.color ?? '#0066cc',
        strokeWidth: 2,
      };
      this.map.set(
        obj.id,
        this.view.create('line3d', [this.map.get(obj.p1), this.map.get(obj.p2)], attrs),
      );
      return;
    }

    if (obj.kind === 'ray') {
      const attrs = { id: obj.id, straightFirst: false, visible: obj.visible };
      this.map.set(
        obj.id,
        this.view.create('line3d', [this.map.get(obj.origin), this.map.get(obj.through)], attrs),
      );
      return;
    }

    if (obj.kind === 'vector') {
      const attrs = {
        id: obj.id,
        lastArrow: true,
        straightFirst: false,
        straightLast: false,
        visible: obj.visible,
      };
      this.map.set(
        obj.id,
        this.view.create('line3d', [this.map.get(obj.from), this.map.get(obj.to)], attrs),
      );
      return;
    }

    if (obj.kind === 'plane') {
      const attrs = { id: obj.id, fillOpacity: 0.2, visible: obj.visible };
      this.map.set(
        obj.id,
        this.view.create(
          'plane3d',
          [this.map.get(obj.p1), this.map.get(obj.p2), this.map.get(obj.p3)],
          attrs,
        ),
      );
      return;
    }

    if (obj.kind === 'polygon') {
      const refs = obj.vertices.map((v) => this.map.get(v));
      const attrs = { id: obj.id, fillOpacity: 0.3, visible: obj.visible };
      this.map.set(obj.id, this.view.create('polygon3d', [refs], attrs));
      return;
    }

    if (obj.kind === 'sphere') {
      const attrs = { id: obj.id, fillOpacity: 0.25, visible: obj.visible };
      this.map.set(
        obj.id,
        this.view.create('sphere3d', [this.map.get(obj.center), this.map.get(obj.surfacePoint)], attrs),
      );
      return;
    }

    if (obj.kind === 'polyhedron') {
      const verts = obj.vertices.map((id) => this.map.get(id));
      const faceJxgs = obj.faces.map((face) =>
        this.view.create('polygon3d', [face.map((idx) => verts[idx])], {
          id: `${obj.id}.face${face.join('-')}`,
          fillOpacity: 0.25,
          strokeColor: '#0066cc',
          strokeWidth: 1.5,
          visible: obj.visible,
        }),
      );
      // Composite: store an object with _faces array + a remove() that disposes each face.
      this.map.set(obj.id, {
        _faces: faceJxgs,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        remove: () => faceJxgs.forEach((f: any) => f.remove?.()),
      });
      return;
    }

    if (obj.kind === 'cylinder' || obj.kind === 'cone') {
      const baseCenterPt = this.scene.get(obj.baseCenter);
      if (!baseCenterPt || baseCenterPt.kind !== 'point') return;
      const base = constraintToWorld(baseCenterPt.constraint, this.scene);
      let secondPt: Vec3;
      if (obj.kind === 'cylinder') {
        const topCenterPt = this.scene.get(obj.topCenter);
        if (!topCenterPt || topCenterPt.kind !== 'point') return;
        secondPt = constraintToWorld(topCenterPt.constraint, this.scene);
      } else {
        const apexPt = this.scene.get(obj.apex);
        if (!apexPt || apexPt.kind !== 'point') return;
        secondPt = constraintToWorld(apexPt.constraint, this.scene);
      }
      const geom =
        obj.kind === 'cylinder'
          ? cylinderFaces(base, secondPt, obj.radius)
          : coneFaces(base, secondPt, obj.radius);
      // Create vertex point3d's (hidden), then polygon3d per face.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const vertJxgs: any[] = geom.vertices.map((v, i) =>
        this.view.create('point3d', v, {
          id: `${obj.id}.v${i}`,
          visible: false,
          fixed: true,
          withLabel: false,
        }),
      );
      const faceJxgs = geom.faces.map((face) =>
        this.view.create('polygon3d', [face.map((idx) => vertJxgs[idx])], {
          id: `${obj.id}.face${face.join('-')}`,
          fillOpacity: 0.25,
          strokeColor: '#0066cc',
          strokeWidth: 1.5,
          visible: obj.visible,
        }),
      );
      this.map.set(obj.id, {
        _verts: vertJxgs,
        _faces: faceJxgs,
        remove: () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          faceJxgs.forEach((f: any) => f.remove?.());
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          vertJxgs.forEach((v: any) => v.remove?.());
        },
      });
      return;
    }
  }

  private handleChange(obj: Scene3DObject): void {
    const j = this.map.get(obj.id);
    if (!j) return;
    if (obj.kind === 'point' && typeof j.moveTo === 'function') {
      const w = constraintToWorld(obj.constraint, this.scene);
      // time=0 → instant teleport. Without it some JSXGraph builds tween the
      // move, which under fast successive drag updates manifests as flicker.
      try { j.moveTo([w[0], w[1], w[2]], 0); } catch { /* swallow */ }
    }
  }

  private handleDelete(id: string): void {
    const j = this.map.get(id);
    if (!j) return;
    try { j.remove?.(); } catch { /* swallow */ }
    this.map.delete(id);
  }

  private handleReset(): void {
    for (const [, j] of this.map) {
      try { j.remove?.(); } catch { /* swallow */ }
    }
    this.map.clear();
  }
}
