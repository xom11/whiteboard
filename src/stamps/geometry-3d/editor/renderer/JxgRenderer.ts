import type { Scene3D } from '../scene/Scene3D';
import type { Scene3DObject, Vec3, Constraint } from '../scene/types';
import { constraintToWorld, worldToConstraint } from '../scene/constraintMath';

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

  constructor(private scene: Scene3D, private view: View3DLike) {
    this.unsubAdd = scene.on('add', (o) => this.handleAdd(o));
    this.unsubChange = scene.on('change', (o) => this.handleChange(o));
    this.unsubDelete = scene.on('delete', (id) => this.handleDelete(id));
    for (const obj of scene.list()) this.handleAdd(obj);
  }

  dispose(): void {
    this.unsubAdd();
    this.unsubChange();
    this.unsubDelete();
    for (const [id, j] of this.map) {
      try { j.remove?.(); } catch { /* swallow */ }
      this.map.delete(id);
    }
  }

  private handleAdd(obj: Scene3DObject): void {
    if (this.map.has(obj.id)) return;
    if (obj.kind === 'point') {
      const world = constraintToWorld(obj.constraint, this.scene);
      const attrs = { id: obj.id, name: obj.label, size: 4, visible: obj.visible };
      const jxg = this.view.create('point3d', world, attrs);
      this.map.set(obj.id, jxg);
      this.attachDragHook(obj.id, jxg);
      return;
    }
    // Non-point kinds — Tasks 3.2-3.4 extend this.
  }

  private attachDragHook(id: string, jxg: JxgObj): void {
    if (typeof jxg.on !== 'function') return;
    jxg.on('drag', () => {
      const obj = this.scene.get(id);
      if (!obj || obj.kind !== 'point') return;
      const world: Vec3 = [jxg.X(), jxg.Y(), jxg.Z()];
      const updated: Constraint = worldToConstraint(obj.constraint, world, this.scene);
      (obj as { constraint: Constraint }).constraint = updated;
      this.scene.emitChange(id);
    });
  }

  private handleChange(obj: Scene3DObject): void {
    const j = this.map.get(obj.id);
    if (!j) return;
    if (obj.kind === 'point' && typeof j.moveTo === 'function') {
      const w = constraintToWorld(obj.constraint, this.scene);
      j.moveTo([w[0], w[1], w[2]]);
    }
  }

  private handleDelete(id: string): void {
    const j = this.map.get(id);
    if (!j) return;
    try { j.remove?.(); } catch { /* swallow */ }
    this.map.delete(id);
  }
}
