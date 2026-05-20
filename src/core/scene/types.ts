// src/core/scene/types.ts

export type SceneObject<A = Record<string, unknown>> = {
  id: string;
  kind: string;
  label: string;
  visible: boolean;
  locked: boolean;
  layer: string;
  schemaVersion: number;
  attrs: A;
};

export type State = {
  readonly objects: Readonly<Record<string, SceneObject>>;
  readonly order: readonly string[];
  readonly counter: number;
  readonly meta: { readonly domain: '2d' | '3d'; readonly version: number };
};

export type Action =
  | { type: 'ADD'; payload: { obj: SceneObject } }
  | { type: 'UPDATE'; payload: { id: string; patch: Partial<Omit<SceneObject, 'id' | 'kind' | 'attrs'>> } }
  | { type: 'UPDATE_ATTRS'; payload: { id: string; patch: Record<string, unknown> } }
  | { type: 'DELETE'; payload: { id: string } }
  | { type: 'RESET' }
  | { type: 'LOAD'; payload: { state: State } }
  | { type: 'TRANSACTION'; payload: { actions: Action[] } };

export type RenderCtx = {
  jxg: unknown;
  resolveRef: (id: string) => unknown;
  defaults: Readonly<Record<string, unknown>>;
};

export type KindDef<A = Record<string, unknown>> = {
  type: string;
  schemaVersion: number;
  migrate: Record<number, (prev: any) => any>;
  validate?: (attrs: A) => void;
  dependsOn: (attrs: A) => string[];
  describe: (obj: SceneObject<A>) => string;
  measure?: (obj: SceneObject<A>, state: State) =>
    | { label: string; value: number }[]
    | null;
  render: (obj: SceneObject<A>, ctx: RenderCtx) => unknown;
  update?: (
    obj: SceneObject<A>,
    prev: SceneObject<A>,
    ctx: RenderCtx,
    existing: unknown,
  ) => void;
};

export const EMPTY_STATE: State = {
  objects: {},
  order: [],
  counter: 0,
  meta: { domain: '3d', version: 1 },
};

export function createEmptyState(domain: '2d' | '3d'): State {
  return { ...EMPTY_STATE, meta: { domain, version: 1 } };
}
