"use client";
import { produce } from 'immer';

// src/core/scene/types.ts
var EMPTY_STATE = {
  objects: {},
  order: [],
  counter: 0,
  meta: { domain: "3d", version: 1 }
};
function createEmptyState(domain) {
  return { ...EMPTY_STATE, meta: { domain, version: 1 } };
}

// src/core/scene/registry.ts
var registry = /* @__PURE__ */ new Map();
function getKind(type) {
  const def = registry.get(type);
  if (!def) throw new Error(`[scene] unknown kind: ${type}`);
  return def;
}

// src/core/scene/reducer.ts
function collectDependents(state, rootId) {
  const dependents = /* @__PURE__ */ new Set([rootId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const obj of Object.values(state.objects)) {
      if (dependents.has(obj.id)) continue;
      let kindDef;
      try {
        kindDef = getKind(obj.kind);
      } catch {
        continue;
      }
      const refs = kindDef.dependsOn(obj.attrs);
      if (refs.some((r) => dependents.has(r))) {
        dependents.add(obj.id);
        grew = true;
      }
    }
  }
  return dependents;
}
function reduce(draft, action) {
  switch (action.type) {
    case "ADD": {
      const { obj } = action.payload;
      if (draft.objects[obj.id]) throw new Error(`[scene] id "${obj.id}" \u0111\xE3 t\u1ED3n t\u1EA1i`);
      const kindDef = getKind(obj.kind);
      kindDef.validate?.(obj.attrs);
      draft.objects[obj.id] = obj;
      draft.order.push(obj.id);
      draft.counter += 1;
      return;
    }
    case "UPDATE": {
      const { id, patch } = action.payload;
      const obj = draft.objects[id];
      if (!obj) return;
      Object.assign(obj, patch);
      return;
    }
    case "UPDATE_ATTRS": {
      const { id, patch } = action.payload;
      const obj = draft.objects[id];
      if (!obj) return;
      const kindDef = getKind(obj.kind);
      const nextAttrs = { ...obj.attrs, ...patch };
      kindDef.validate?.(nextAttrs);
      obj.attrs = nextAttrs;
      return;
    }
    case "DELETE": {
      const { id } = action.payload;
      if (!draft.objects[id]) return;
      const toDelete = collectDependents(draft, id);
      for (const delId of toDelete) {
        delete draft.objects[delId];
      }
      draft.order = draft.order.filter((x) => !toDelete.has(x));
      return;
    }
    case "RESET": {
      draft.objects = {};
      draft.order = [];
      draft.counter = 0;
      return;
    }
    case "LOAD": {
      const { state } = action.payload;
      draft.objects = { ...state.objects };
      draft.order = [...state.order];
      draft.counter = state.counter;
      draft.meta = { ...state.meta };
      return;
    }
    case "TRANSACTION": {
      for (const sub of action.payload.actions) {
        reduce(draft, sub);
      }
      return;
    }
  }
}

// src/core/scene/store.ts
var HISTORY_DEFAULT = 100;
var UNDO_ACTION = { type: "TRANSACTION", payload: { actions: [] } };
var REDO_ACTION = { type: "TRANSACTION", payload: { actions: [] } };
function createStore(initial, options = {}) {
  const limit = options.historyLimit ?? HISTORY_DEFAULT;
  let state = initial;
  const past = [];
  const future = [];
  const listeners = /* @__PURE__ */ new Set();
  let dispatching = false;
  let suspendHistory = false;
  let transactionActions = null;
  function notify(prev, action) {
    listeners.forEach((l) => l(state, prev, action));
  }
  function pushHistory(prev) {
    if (suspendHistory) return;
    past.push(prev);
    if (past.length > limit) past.shift();
    future.length = 0;
  }
  function applyAction(action) {
    const prev = state;
    state = produce(state, (draft) => {
      reduce(draft, action);
    });
    if (state !== prev) {
      pushHistory(prev);
      notify(prev, action);
    }
  }
  return {
    getState: () => state,
    dispatch(action) {
      if (dispatching) throw new Error("[scene] kh\xF4ng \u0111\u01B0\u1EE3c dispatch trong subscriber");
      if (transactionActions) {
        transactionActions.push(action);
        return;
      }
      dispatching = true;
      try {
        applyAction(action);
      } finally {
        dispatching = false;
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    undo() {
      const prev = past.pop();
      if (!prev) return;
      future.push(state);
      const old = state;
      state = prev;
      notify(old, UNDO_ACTION);
    },
    redo() {
      const next = future.pop();
      if (!next) return;
      past.push(state);
      if (past.length > limit) past.shift();
      const old = state;
      state = next;
      notify(old, REDO_ACTION);
    },
    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0,
    transaction(fn) {
      if (transactionActions) throw new Error("[scene] transaction l\u1ED3ng nhau kh\xF4ng h\u1ED7 tr\u1EE3");
      transactionActions = [];
      try {
        fn((a) => {
          transactionActions.push(a);
        });
      } finally {
        const actions = transactionActions;
        transactionActions = null;
        if (actions.length > 0) {
          applyAction({ type: "TRANSACTION", payload: { actions } });
        }
      }
    },
    withoutHistory(fn) {
      const prevSuspend = suspendHistory;
      suspendHistory = true;
      try {
        fn();
      } finally {
        suspendHistory = prevSuspend;
      }
    }
  };
}

// src/core/scene/selectors.ts
function listObjects(state) {
  return state.order.map((id) => state.objects[id]).filter((o) => o !== void 0);
}
function byKind(state, kind) {
  return listObjects(state).filter((o) => o.kind === kind);
}
var ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
function nextLabel(state, kind) {
  const used = new Set(byKind(state, kind).map((o) => o.label));
  for (const c of ALPHABET) if (!used.has(c)) return c;
  let idx = 1;
  while (true) {
    for (const c of ALPHABET) {
      const candidate = `${c}${idx}`;
      if (!used.has(candidate)) return candidate;
    }
    idx += 1;
  }
}

// src/core/scene/migrations/state.ts
var stateMigrations = /* @__PURE__ */ new Map();
function listStateMigrations() {
  return stateMigrations;
}
var CURRENT_STATE_VERSION = 1;

// src/core/scene/migrations/runMigrations.ts
function migrateState(raw) {
  if (!raw || typeof raw !== "object") throw new Error("[scene] invalid state shape");
  let state = raw;
  const currentVersion = state.meta?.version ?? 1;
  const stateMigs = listStateMigrations();
  for (let v = currentVersion + 1; v <= Math.max(CURRENT_STATE_VERSION, ...stateMigs.keys()); v++) {
    const fn = stateMigs.get(v);
    if (fn) state = fn(state);
  }
  const migratedObjects = {};
  for (const [id, obj] of Object.entries(state.objects ?? {})) {
    const def = getKind(obj.kind);
    let cur = obj;
    while ((cur.schemaVersion ?? 0) < def.schemaVersion) {
      const next = (cur.schemaVersion ?? 0) + 1;
      const mig = def.migrate[next];
      if (!mig) throw new Error(`[scene] missing migration cho ${obj.kind} v${next}`);
      cur = mig(cur);
      cur.schemaVersion = next;
    }
    if ((cur.schemaVersion ?? 0) !== def.schemaVersion) {
      throw new Error(
        `[scene] missing migration cho ${obj.kind}: stored v${cur.schemaVersion ?? 0}, current v${def.schemaVersion}`
      );
    }
    migratedObjects[id] = cur;
  }
  return {
    objects: migratedObjects,
    order: state.order ?? [],
    counter: state.counter ?? 0,
    meta: state.meta ?? { domain: "3d", version: CURRENT_STATE_VERSION }
  };
}

// src/stamps/geometry-2d/editor/theme.ts
var themeStroke = (dark) => dark ? "#e2e8f0" : "#0f172a";
var themeAxis = (dark) => dark ? "#cbd5e1" : "#94a3b8";
var themeGrid = (dark) => dark ? "#475569" : "#e2e8f0";
var themeLabel = (dark) => dark ? "#e2e8f0" : "#000000";
function paletteFor(isDark) {
  return {
    stroke: themeStroke(isDark),
    axis: themeAxis(isDark),
    grid: themeGrid(isDark),
    label: themeLabel(isDark)
  };
}

export { createEmptyState, createStore, getKind, listObjects, migrateState, nextLabel, paletteFor, themeAxis, themeGrid, themeLabel };
//# sourceMappingURL=chunk-MBJVQIF6.mjs.map
//# sourceMappingURL=chunk-MBJVQIF6.mjs.map