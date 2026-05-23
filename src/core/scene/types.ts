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

// View per domain — narrow theo `state.meta.domain`.
export type View2D = {
  readonly bbox: readonly [number, number, number, number]; // [xmin, ymax, xmax, ymin]
  readonly showAxis: boolean;
  readonly showGrid: boolean;
};

export type View3D = {
  readonly bbox3D: readonly [number, number, number, number, number, number]; // [xmin, xmax, ymin, ymax, zmin, zmax]
  readonly azimuth: number;
  readonly elevation: number;
};

export type ViewGraph2D = {
  readonly xMin: number;
  readonly xMax: number;
  readonly yMin: number;
  readonly yMax: number;
  readonly showAxis: boolean;
  readonly showGrid: boolean;
};

// Union of all view shapes — narrow qua state.meta.domain.
export type SceneView = View2D | View3D | ViewGraph2D;

// Discriminated union: domain narrow → view shape narrow.
export type StateMeta =
  | { readonly domain: '2d';      readonly version: number; readonly view: View2D }
  | { readonly domain: '3d';      readonly version: number; readonly view: View3D }
  | { readonly domain: 'graph2d'; readonly version: number; readonly view: ViewGraph2D };

export type Domain = StateMeta['domain'];

// Backward-compat alias: UPDATE_VIEW patch dùng graph-2d shape (chỉ graph-2d
// dispatch action này hiện tại).
export type ViewSettings = ViewGraph2D;

export type State = {
  readonly objects: Readonly<Record<string, SceneObject>>;
  readonly order: readonly string[];
  readonly counter: number;
  readonly meta: StateMeta;
};

export type Action =
  | { type: 'ADD'; payload: { obj: SceneObject } }
  | { type: 'UPDATE'; payload: { id: string; patch: Partial<Omit<SceneObject, 'id' | 'kind' | 'attrs'>> } }
  | { type: 'UPDATE_ATTRS'; payload: { id: string; patch: Record<string, unknown> } }
  | { type: 'DELETE'; payload: { id: string } }
  | { type: 'RESET' }
  | { type: 'LOAD'; payload: { state: State } }
  | { type: 'TRANSACTION'; payload: { actions: Action[] } }
  | { type: 'UPDATE_VIEW'; payload: { patch: Partial<ViewSettings> } };

export type RenderCtx = {
  jxg: unknown;
  resolveRef: (id: string) => unknown;
  defaults: Readonly<Record<string, unknown>>;
  /** Map tham số (parameter.label → parameter.value). Chỉ graph2d dùng. */
  paramMap?: Readonly<Record<string, number>>;
};

export type KindDef<A = Record<string, unknown>> = {
  type: string;
  schemaVersion: number;
  migrate: Record<number, (prev: any) => any>;
  validate?: (attrs: A) => void;
  dependsOn: (attrs: A) => string[];
  describe: (obj: SceneObject<A>, state?: State) => string;
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

export const DEFAULT_VIEW_2D: View2D = {
  bbox: [-10, 10, 10, -10],
  showAxis: false,
  showGrid: false,
};

export const DEFAULT_VIEW_3D: View3D = {
  bbox3D: [-5, 5, -5, 5, -5, 5],
  azimuth: 60,
  elevation: 30,
};

export const DEFAULT_VIEW_GRAPH2D: ViewGraph2D = {
  xMin: -10, xMax: 10, yMin: -10, yMax: 10,
  showAxis: true, showGrid: true,
};

// EMPTY_STATE giữ shape '3d' (legacy default). Dùng `createEmptyState(domain)`
// khi cần state cụ thể cho domain — đảm bảo meta.view khớp domain.
export const EMPTY_STATE: State = {
  objects: {},
  order: [],
  counter: 0,
  meta: { domain: '3d', version: 1, view: DEFAULT_VIEW_3D },
};

export function createEmptyState(domain: Domain): State {
  const base = { objects: {}, order: [], counter: 0 } as const;
  switch (domain) {
    case '2d':
      return { ...base, meta: { domain: '2d', version: 1, view: DEFAULT_VIEW_2D } };
    case '3d':
      return { ...base, meta: { domain: '3d', version: 1, view: DEFAULT_VIEW_3D } };
    case 'graph2d':
      return { ...base, meta: { domain: 'graph2d', version: 1, view: DEFAULT_VIEW_GRAPH2D } };
  }
}
