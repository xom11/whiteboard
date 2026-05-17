import type { Constraint, Scene3DObject } from './types';

type Listener<E> = (event: E) => void;

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
    const id = this.nextId('p');
    const obj: Scene3DObject = {
      kind: 'point',
      id,
      label: label ?? id,
      visible: true,
      color,
      constraint,
    };
    this.objects.set(id, obj);
    this.order.push(id);
    this.listeners.add.forEach((cb) => cb(obj));
    return id;
  }

  insert(obj: Scene3DObject): void {
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

  delete(id: string): void {
    if (!this.objects.has(id)) return;
    this.objects.delete(id);
    this.order = this.order.filter((x) => x !== id);
    this.listeners.delete.forEach((cb) => cb(id));
  }

  reset(): void {
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
}
