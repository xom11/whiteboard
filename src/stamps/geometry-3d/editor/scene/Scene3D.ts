import { nextPointLabel, nextDerivedLabel } from './labels';
import type { Constraint, Scene3DObject, ObjectKind } from './types';

type Listener<E> = (event: E) => void;

export type SceneSnapshot = {
  objects: ReadonlyMap<string, Scene3DObject>;
  order: readonly string[];
  counter: number;
};

export class Scene3D {
  private objects = new Map<string, Scene3DObject>();
  private order: string[] = [];
  private counter = 0;
  private listeners = {
    add: new Set<Listener<Scene3DObject>>(),
    change: new Set<Listener<Scene3DObject>>(),
    delete: new Set<Listener<string>>(),
    reset: new Set<Listener<void>>(),
  };

  private historyPast: SceneSnapshot[] = [];
  private historyFuture: SceneSnapshot[] = [];
  private historySuspended = false;

  on(event: 'add', cb: Listener<Scene3DObject>): () => void;
  on(event: 'change', cb: Listener<Scene3DObject>): () => void;
  on(event: 'delete', cb: Listener<string>): () => void;
  on(event: 'reset', cb: Listener<void>): () => void;
  on(event: keyof Scene3D['listeners'], cb: Listener<never>): () => void {
    const set = this.listeners[event] as Set<Listener<never>>;
    set.add(cb);
    return () => {
      set.delete(cb);
    };
  }

  private nextId(prefix: string): string {
    this.counter += 1;
    return `${prefix}${this.counter}`;
  }

  addPoint(constraint: Constraint, label?: string, color?: string): string {
    this.capture();
    const id = this.nextId('p');
    const existingLabels = this.list().filter((o) => o.kind === 'point').map((o) => o.label);
    const autoLabel = label ?? nextPointLabel(existingLabels);
    const obj: Scene3DObject = {
      kind: 'point',
      id,
      label: autoLabel,
      visible: true,
      color,
      constraint,
    };
    this.objects.set(id, obj);
    this.order.push(id);
    this.listeners.add.forEach((cb) => cb(obj));
    return id;
  }

  addObject<K extends Exclude<ObjectKind, 'point'>>(
    kind: K,
    spec: Omit<Extract<Scene3DObject, { kind: K }>, 'id' | 'label' | 'visible' | 'kind'>,
    label?: string,
  ): string {
    this.capture();
    const id = this.nextId(kind[0]);
    const existingLabels = this.list().filter((o) => o.kind === kind).map((o) => o.label);
    const autoLabel = label ?? nextDerivedLabel(kind, existingLabels);
    const obj = { id, label: autoLabel, visible: true, kind, ...spec } as unknown as Scene3DObject;
    this.objects.set(id, obj);
    this.order.push(id);
    this.listeners.add.forEach((cb) => cb(obj));
    return id;
  }

  insert(obj: Scene3DObject): void {
    this.capture();
    if (this.objects.has(obj.id)) {
      throw new Error(`Scene3D.insert: id ${obj.id} already exists`);
    }
    this.objects.set(obj.id, obj);
    this.order.push(obj.id);
    this.listeners.add.forEach((cb) => cb(obj));
  }

  get(id: string): Scene3DObject | undefined {
    return this.objects.get(id);
  }

  list(): Scene3DObject[] {
    return this.order
      .map((id) => this.objects.get(id))
      .filter((obj): obj is Scene3DObject => obj !== undefined);
  }

  private referencedIds(obj: Scene3DObject): string[] {
    switch (obj.kind) {
      case 'point': {
        const c = obj.constraint;
        if (c.kind === 'onPlane') return [c.planeId];
        if (c.kind === 'onLine') return [c.lineId];
        if (c.kind === 'onPolygon') return [c.polygonId];
        if (c.kind === 'onSphere') return [c.sphereId];
        return [];
      }
      case 'segment':
      case 'line': return [obj.p1, obj.p2];
      case 'ray': return [obj.origin, obj.through];
      case 'vector': return [obj.from, obj.to];
      case 'polygon': return obj.vertices;
      case 'plane': return [obj.p1, obj.p2, obj.p3];
      case 'sphere': return [obj.center, obj.surfacePoint];
      case 'polyhedron': return obj.vertices;
      case 'cylinder': return [obj.baseCenter, obj.topCenter];
      case 'cone': return [obj.baseCenter, obj.apex];
    }
  }

  private collectDependents(targetId: string): Set<string> {
    const dependents = new Set<string>([targetId]);
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

  delete(id: string): void {
    if (!this.objects.has(id)) return;
    this.capture();
    const toDelete = this.collectDependents(id);
    for (const dependentId of toDelete) {
      this.objects.delete(dependentId);
      this.order = this.order.filter((x) => x !== dependentId);
      this.listeners.delete.forEach((cb) => cb(dependentId));
    }
  }

  reset(): void {
    this.capture();
    this.objects.clear();
    this.order = [];
    this.counter = 0;
    this.listeners.reset.forEach((cb) => cb());
  }

  reserveId(prefix: string): string {
    return this.nextId(prefix);
  }

  emitChange(id: string): void {
    const obj = this.objects.get(id);
    if (!obj) return;
    this.listeners.change.forEach((cb) => cb(obj));
  }

  snapshot(): SceneSnapshot {
    const cloned = new Map<string, Scene3DObject>();
    for (const [id, obj] of this.objects) {
      cloned.set(id, { ...obj } as Scene3DObject);
    }
    return {
      objects: cloned,
      order: [...this.order],
      counter: this.counter,
    };
  }

  private restore(snap: SceneSnapshot): void {
    this.objects = new Map();
    for (const [id, obj] of snap.objects) {
      this.objects.set(id, { ...obj } as Scene3DObject);
    }
    this.order = [...snap.order];
    this.counter = snap.counter;
    this.listeners.reset.forEach((cb) => cb());
    for (const id of this.order) {
      const obj = this.objects.get(id);
      if (obj) this.listeners.add.forEach((cb) => cb(obj));
    }
  }

  private capture(): void {
    if (this.historySuspended) return;
    this.historyPast.push(this.snapshot());
    this.historyFuture = [];
  }

  canUndo(): boolean {
    return this.historyPast.length > 0;
  }

  canRedo(): boolean {
    return this.historyFuture.length > 0;
  }

  undo(): void {
    const prev = this.historyPast.pop();
    if (!prev) return;
    this.historyFuture.push(this.snapshot());
    this.restore(prev);
  }

  redo(): void {
    const next = this.historyFuture.pop();
    if (!next) return;
    this.historyPast.push(this.snapshot());
    this.restore(next);
  }
}
