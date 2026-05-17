"use client";
import './index.css';
import { geometryStamp } from './chunk-5RBNRBFW.mjs';
export { geometryStamp } from './chunk-5RBNRBFW.mjs';
import { geometry3dStamp } from './chunk-IUVV52HO.mjs';
export { geometry3dStamp } from './chunk-IUVV52HO.mjs';
import { latexStamp } from './chunk-7P7SQFOW.mjs';
export { latexStamp } from './chunk-7P7SQFOW.mjs';
import { graph2dStamp } from './chunk-ZVN356JZ.mjs';
export { graph2dStamp } from './chunk-ZVN356JZ.mjs';
export { isGraph2DCustomData } from './chunk-74VEEZBV.mjs';
export { isGeometryCustomData } from './chunk-BJX4YNA5.mjs';
export { isLatexCustomData } from './chunk-X5R72SSJ.mjs';
export { isGeometry3DCustomData } from './chunk-DU2NFHRR.mjs';
import './chunk-HTBLO5JO.mjs';
import './chunk-C6SCVOMC.mjs';
import './chunk-BJTO5JO5.mjs';
import { lazy, useState, useRef, useMemo, useCallback, useEffect, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { jsxs, jsx, Fragment } from 'react/jsx-runtime';
import '@excalidraw/excalidraw/index.css';

// src/serialize.ts
function pickSyncableAppState(s) {
  return {
    viewBackgroundColor: s.viewBackgroundColor,
    zoom: s.zoom,
    scrollX: s.scrollX,
    scrollY: s.scrollY,
    gridSize: s.gridSize ?? null,
    theme: s.theme
  };
}

// src/stamps/shared/registry.ts
var STABLE_STAMPS = Object.freeze([
  geometryStamp,
  latexStamp
]);
var EXPERIMENTAL_STAMPS = Object.freeze([
  geometry3dStamp,
  graph2dStamp
]);
var ALL_STAMPS = Object.freeze([
  ...STABLE_STAMPS,
  ...EXPERIMENTAL_STAMPS
]);
var DEFAULT_STAMPS = ALL_STAMPS;
function findStampForCustomData(data, stamps = DEFAULT_STAMPS) {
  for (const s of stamps) {
    if (s.matchesCustomData(data)) return s;
  }
  return null;
}
function isStampElement(element, stamps = DEFAULT_STAMPS) {
  return findStampForCustomData(element.customData, stamps) !== null;
}
var MENU_WRAPPER_ID = "stamp-menu-portal-wrapper";
var POPOVER_SELECTOR = ".App-toolbar__extra-tools-dropdown .dropdown-menu-container";
function ToolbarInjector({
  enabled,
  activeStampKind,
  onToggle,
  stamps = DEFAULT_STAMPS
}) {
  const [menuMount, setMenuMount] = useState(null);
  const menuMountRef = useRef(null);
  useEffect(() => {
    if (!enabled) {
      if (menuMountRef.current !== null) {
        menuMountRef.current = null;
        setMenuMount(null);
      }
      document.getElementById(MENU_WRAPPER_ID)?.remove();
      return;
    }
    let cancelled = false;
    let observer = null;
    let rafId = null;
    const apply = (next) => {
      if (cancelled || menuMountRef.current === next) return;
      menuMountRef.current = next;
      queueMicrotask(() => {
        if (!cancelled) setMenuMount(next);
      });
    };
    const findMenu = () => {
      if (cancelled) return;
      const container = document.querySelector(POPOVER_SELECTOR);
      if (!container) {
        apply(null);
        return;
      }
      let wrapper = container.querySelector("#" + MENU_WRAPPER_ID);
      if (!wrapper) {
        wrapper = document.createElement("div");
        wrapper.id = MENU_WRAPPER_ID;
        wrapper.setAttribute("data-stamp-menu", "true");
        wrapper.setAttribute("data-stamp-area", "true");
        wrapper.style.display = "contents";
        container.insertBefore(wrapper, container.firstChild);
      }
      apply(wrapper);
    };
    const schedule = () => {
      if (rafId != null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        findMenu();
      });
    };
    findMenu();
    const root = document.querySelector(".excalidraw") ?? document.body;
    observer = new MutationObserver(schedule);
    observer.observe(root, { childList: true, subtree: true });
    return () => {
      cancelled = true;
      if (rafId != null) cancelAnimationFrame(rafId);
      observer?.disconnect();
      document.getElementById(MENU_WRAPPER_ID)?.remove();
    };
  }, [enabled]);
  if (!enabled || !menuMount) return null;
  const closePopover = () => {
    const trigger = document.querySelector(
      ".App-toolbar__extra-tools-trigger"
    );
    trigger?.click();
  };
  return createPortal(
    /* @__PURE__ */ jsxs(Fragment, { children: [
      stamps.map((stamp) => /* @__PURE__ */ jsx(
        StampMenuItem,
        {
          icon: stamp.toolbarIcon,
          label: stamp.toolbarTitle,
          active: activeStampKind === stamp.kind,
          onClick: () => {
            onToggle(stamp.kind);
            closePopover();
          },
          dataTestId: stamp.toolbarTestId
        },
        stamp.kind
      )),
      /* @__PURE__ */ jsx(
        "div",
        {
          "aria-hidden": "true",
          style: {
            height: 1,
            background: "var(--default-border-color, rgba(0,0,0,0.08))",
            margin: "6px 4px"
          }
        }
      )
    ] }),
    menuMount
  );
}
function StampMenuItem({ icon, label, active, onClick, dataTestId }) {
  const className = [
    "dropdown-menu-item",
    "dropdown-menu-item-base",
    active ? "dropdown-menu-item--selected" : ""
  ].filter(Boolean).join(" ");
  return /* @__PURE__ */ jsxs(
    "button",
    {
      type: "button",
      onClick,
      "aria-label": label,
      "aria-pressed": active,
      "data-testid": dataTestId,
      className,
      style: {
        display: "flex",
        alignItems: "center",
        columnGap: "0.625rem",
        width: "100%",
        boxSizing: "border-box",
        background: "transparent",
        border: "1px solid transparent",
        cursor: "pointer",
        fontFamily: "inherit",
        fontSize: "0.875rem",
        color: "var(--color-on-surface)"
      },
      children: [
        /* @__PURE__ */ jsx(
          "span",
          {
            "aria-hidden": "true",
            style: {
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "1rem",
              height: "1rem"
            },
            children: icon
          }
        ),
        /* @__PURE__ */ jsx("span", { children: label })
      ]
    }
  );
}
function isEditableTarget(t) {
  if (!t || !(t instanceof HTMLElement)) return false;
  if (t.isContentEditable) return true;
  const tag = t.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}
function useShortcuts({
  enabled,
  onToggle,
  stamps = DEFAULT_STAMPS
}) {
  useEffect(() => {
    if (!enabled) return;
    const keyToKind = /* @__PURE__ */ new Map();
    for (const s of stamps) keyToKind.set(s.shortcutKey, s.kind);
    const handler = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isEditableTarget(e.target)) return;
      const key = e.key.toLowerCase();
      const kind = keyToKind.get(key);
      if (!kind) return;
      e.preventDefault();
      e.stopPropagation();
      onToggle(kind);
    };
    window.addEventListener("keydown", handler, { capture: true });
    return () => window.removeEventListener("keydown", handler, { capture: true });
  }, [enabled, onToggle, stamps]);
}
var DOUBLE_CLICK_MS = 400;
function useStampDoubleClick({ enabled, stamps, onOpen }) {
  const lastClickRef = useRef({
    time: 0,
    elementId: null
  });
  return useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (_activeTool, pointerDownState) => {
      if (!enabled) return;
      const hitElement = pointerDownState?.hit?.element;
      if (!hitElement || hitElement.type !== "image") return;
      const stamp = findStampForCustomData(hitElement.customData, stamps);
      if (!stamp) return;
      const now = Date.now();
      const isDouble = lastClickRef.current.elementId === hitElement.id && now - lastClickRef.current.time < DOUBLE_CLICK_MS;
      lastClickRef.current = { time: now, elementId: hitElement.id };
      if (!isDouble) return;
      onOpen(stamp.kind, {
        id: hitElement.id,
        customData: hitElement.customData
      });
    },
    [enabled, stamps, onOpen]
  );
}
var ALLOWED_KEYS = /* @__PURE__ */ new Set([
  "Tab",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Shift",
  "Control",
  "Alt",
  "Meta",
  "CapsLock",
  "Home",
  "End",
  "PageUp",
  "PageDown"
]);
function isEditable(el) {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}
function useStampShortcutBlocker({ activeStamp, stamps }) {
  const shortcutKeys = useMemo(
    () => new Set(stamps.map((s) => s.shortcutKey.toLowerCase())),
    [stamps]
  );
  useEffect(() => {
    if (!activeStamp) return;
    const blocker = (e) => {
      if (isEditable(e.target)) return;
      if (e.ctrlKey || e.metaKey) return;
      if (ALLOWED_KEYS.has(e.key)) return;
      if (e.key === "Escape") return;
      if (shortcutKeys.has(e.key.toLowerCase())) return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("keydown", blocker, { capture: true });
    return () => window.removeEventListener("keydown", blocker, { capture: true });
  }, [activeStamp, shortcutKeys]);
}
function useStampClickOutside({ activeStamp, hostRef, onClose }) {
  useEffect(() => {
    if (!activeStamp) return;
    let lastFire = 0;
    const handler = (e) => {
      const target = e.target;
      if (!target) return;
      if (target.closest('[data-stamp-area="true"]')) return;
      const now = Date.now();
      if (now - lastFire < 50) return;
      lastFire = now;
      hostRef.current?.tryInsert();
      onClose();
    };
    window.addEventListener("pointerdown", handler, { capture: true });
    window.addEventListener("mousedown", handler, { capture: true });
    return () => {
      window.removeEventListener("pointerdown", handler, { capture: true });
      window.removeEventListener("mousedown", handler, { capture: true });
    };
  }, [activeStamp, hostRef, onClose]);
}

// src/stamps/shared/restoreStampFiles.ts
function svgToDataURL(svg) {
  const utf8 = unescape(encodeURIComponent(svg));
  return "data:image/svg+xml;base64," + btoa(utf8);
}
async function buildFileForStamp(fileId, customData, stamp) {
  try {
    const svg = await stamp.renderSvgFromCustomData(customData);
    return { id: fileId, dataURL: svgToDataURL(svg), mimeType: "image/svg+xml", created: Date.now() };
  } catch (err) {
    console.warn("Stamp restore failed for", fileId, "(" + stamp.kind + ")", err);
    return null;
  }
}
async function restoreMissingStampFiles(api, elements, stamps = DEFAULT_STAMPS) {
  if (!api) return;
  const filesToAdd = [];
  const newPathHandled = /* @__PURE__ */ new Set();
  for (const el of elements) {
    const stamp = findStampForCustomData(el.customData, stamps);
    if (!stamp?.restoreFileFromCustomData) continue;
    const restored = await stamp.restoreFileFromCustomData(el);
    if (!restored) continue;
    newPathHandled.add(el.id);
    filesToAdd.push({
      id: restored.fileId,
      dataURL: restored.dataURL,
      mimeType: restored.mimeType,
      created: Date.now()
    });
  }
  const existing = typeof api.getFiles === "function" ? api.getFiles() : {};
  const seen = /* @__PURE__ */ new Set();
  for (const el of elements) {
    if (newPathHandled.has(el.id)) continue;
    if (el.type !== "image") continue;
    if (!el.fileId) continue;
    if (existing && existing[el.fileId]) continue;
    if (seen.has(el.fileId)) continue;
    const stamp = findStampForCustomData(el.customData, stamps);
    if (!stamp) continue;
    seen.add(el.fileId);
    const built = await buildFileForStamp(el.fileId, el.customData, stamp);
    if (built) filesToAdd.push(built);
  }
  if (filesToAdd.length > 0) {
    try {
      api.addFiles(filesToAdd);
    } catch (err) {
      console.warn("addFiles failed:", err);
    }
  }
}

// src/core/persistence/validation.ts
var STORAGE_KEY_RE = /^[a-zA-Z0-9_-]{1,128}$/;
function validateStorageKey(key) {
  if (typeof key !== "string" || !STORAGE_KEY_RE.test(key)) {
    const sample = key === void 0 ? "undefined" : String(key).slice(0, 32);
    throw new Error(
      `[whiteboard] Invalid storageKey: must match ${STORAGE_KEY_RE} (got: ${sample})`
    );
  }
  return key;
}
var DANGEROUS_KEYS = /* @__PURE__ */ new Set(["__proto__", "constructor", "prototype"]);
function sanitizingReviver(_key, value) {
  if (DANGEROUS_KEYS.has(_key)) return void 0;
  return value;
}
var MAX_NESTED_DEPTH = 64;
function depthExceeds(v, max, depth = 0) {
  if (depth > max) return true;
  if (v === null || typeof v !== "object") return false;
  const children = Array.isArray(v) ? v : Object.values(v);
  for (const child of children) {
    if (depthExceeds(child, max, depth + 1)) return true;
  }
  return false;
}
var ALLOWED_TOP_LEVEL_KEYS = /* @__PURE__ */ new Set(["version", "elements", "appState", "savedAt"]);
function isPlainObject(v) {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function safeParseScene(raw) {
  let parsed;
  try {
    parsed = JSON.parse(raw, sanitizingReviver);
  } catch {
    return null;
  }
  if (!isPlainObject(parsed)) return null;
  if (depthExceeds(parsed, MAX_NESTED_DEPTH)) return null;
  const safe = {};
  for (const k of Object.keys(parsed)) {
    if (ALLOWED_TOP_LEVEL_KEYS.has(k)) safe[k] = parsed[k];
  }
  if (!Array.isArray(safe.elements)) return null;
  for (const el of safe.elements) {
    if (!isPlainObject(el)) return null;
    if (typeof el.id !== "string" || typeof el.type !== "string") return null;
  }
  const appState = isPlainObject(safe.appState) ? safe.appState : {};
  return {
    version: safe.version,
    elements: safe.elements,
    appState,
    savedAt: safe.savedAt
  };
}

// src/core/persistence/sceneStore.ts
var PREFIX = "whiteboard:scene:";
var SCHEMA_VERSION = 1;
function fullKey(key) {
  return PREFIX + key;
}
function readScene(key) {
  const validKey = validateStorageKey(key);
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(fullKey(validKey));
  if (!raw) return null;
  const parsed = safeParseScene(raw);
  if (!parsed) {
    console.warn("[whiteboard] scene parse/validation failed, clear:", validKey);
    try {
      window.localStorage.removeItem(fullKey(validKey));
    } catch {
    }
    return null;
  }
  if (parsed.version !== SCHEMA_VERSION) {
    console.warn(
      `[whiteboard] scene version ${parsed.version} kh\xF4ng kh\u1EDBp ${SCHEMA_VERSION}, b\u1ECF qua.`
    );
    return null;
  }
  return {
    version: SCHEMA_VERSION,
    elements: parsed.elements,
    appState: parsed.appState,
    savedAt: typeof parsed.savedAt === "number" ? parsed.savedAt : Date.now()
  };
}
function writeScene(key, payload) {
  const validKey = validateStorageKey(key);
  if (typeof window === "undefined") return;
  const record = {
    version: SCHEMA_VERSION,
    elements: payload.elements,
    appState: payload.appState,
    savedAt: Date.now()
  };
  try {
    window.localStorage.setItem(fullKey(validKey), JSON.stringify(record));
  } catch (err) {
    console.warn("[whiteboard] scene write failed:", err);
  }
}

// src/core/persistence/fileStore.ts
var DB_NAME = "whiteboard-files";
var DB_VERSION = 1;
var STORE = "files";
var dbPromise = null;
var idbDisabled = false;
function openDb() {
  if (idbDisabled) return Promise.reject(new Error("IndexedDB disabled"));
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      idbDisabled = true;
      reject(new Error("indexedDB undefined"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("storageKey", "storageKey", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      idbDisabled = true;
      reject(req.error ?? new Error("IDB open failed"));
    };
  });
  return dbPromise;
}
async function withStore(mode, fn, fallback) {
  let db;
  try {
    db = await openDb();
  } catch {
    return fallback;
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    let result = fallback;
    try {
      fn(
        store,
        (value) => {
          result = value;
        },
        reject
      );
    } catch (err) {
      reject(err);
      return;
    }
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => {
      console.warn("[whiteboard] IDB tx error:", tx.error);
      reject(tx.error ?? new Error("IDB tx error"));
    };
    tx.onabort = () => reject(tx.error ?? new Error("IDB tx aborted"));
  });
}
async function readFiles(storageKey) {
  const validKey = validateStorageKey(storageKey);
  try {
    return await withStore(
      "readonly",
      (store, setResult, fail) => {
        const out = {};
        const req = store.index("storageKey").openCursor(IDBKeyRange.only(validKey));
        req.onsuccess = () => {
          const cursor = req.result;
          if (!cursor) {
            setResult(out);
            return;
          }
          const record = cursor.value;
          out[record.id] = {
            dataURL: record.dataURL,
            mimeType: record.mimeType,
            created: record.created
          };
          cursor.continue();
        };
        req.onerror = () => fail(req.error);
      },
      {}
    );
  } catch (err) {
    console.warn("[whiteboard] readFiles failed:", err);
    return {};
  }
}
async function writeFiles(storageKey, files) {
  const validKey = validateStorageKey(storageKey);
  const entries = Object.entries(files);
  if (entries.length === 0) return;
  try {
    await withStore(
      "readwrite",
      (store, setResult, fail) => {
        let pending = entries.length;
        const finishOne = () => {
          pending -= 1;
          if (pending === 0) setResult(void 0);
        };
        const now = Date.now();
        for (const [id, f] of entries) {
          const ff = f;
          const getReq = store.get(id);
          getReq.onsuccess = () => {
            if (getReq.result) {
              finishOne();
              return;
            }
            const rec = {
              id,
              storageKey: validKey,
              dataURL: ff.dataURL,
              mimeType: ff.mimeType,
              created: ff.created ?? now,
              savedAt: now
            };
            const putReq = store.put(rec);
            putReq.onsuccess = finishOne;
            putReq.onerror = () => fail(putReq.error);
          };
          getReq.onerror = () => fail(getReq.error);
        }
        ;
      },
      void 0
    );
  } catch (err) {
    console.warn("[whiteboard] writeFiles failed:", err);
  }
}
async function pruneFiles(storageKey, keepIds) {
  const validKey = validateStorageKey(storageKey);
  try {
    await withStore(
      "readwrite",
      (store, setResult, fail) => {
        const req = store.index("storageKey").openCursor(IDBKeyRange.only(validKey));
        req.onsuccess = () => {
          const cursor = req.result;
          if (!cursor) {
            setResult(void 0);
            return;
          }
          const record = cursor.value;
          if (keepIds.has(record.id)) {
            cursor.continue();
            return;
          }
          const deleteReq = cursor.delete();
          deleteReq.onsuccess = () => cursor.continue();
          deleteReq.onerror = () => fail(deleteReq.error);
        };
        req.onerror = () => fail(req.error);
      },
      void 0
    );
  } catch (err) {
    console.warn("[whiteboard] pruneFiles failed:", err);
  }
}
var Excalidraw = lazy(
  () => import('./ExcalidrawWithMenus-EAVPOPJZ.mjs').then((m) => ({ default: m.ExcalidrawWithMenus }))
);
var ExcalidrawLoadingFallback = () => /* @__PURE__ */ jsx("div", { className: "flex h-full items-center justify-center text-sm text-gray-500", children: "\u0110ang t\u1EA3i b\u1EA3ng\u2026" });
var SYNC_THROTTLE_MS = 200;
function Whiteboard({
  storageKey = "default",
  readOnly = false,
  onSceneChange,
  onFilesChange,
  onApi,
  langCode = "vi-VN",
  stamps = DEFAULT_STAMPS
}) {
  const [api, setApi] = useState(null);
  const apiRef = useRef(null);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const isDarkThemeRef = useRef(false);
  const knownFileIdsRef = useRef(/* @__PURE__ */ new Set());
  const lastSceneHashRef = useRef("");
  const sceneThrottleRef = useRef(null);
  const fileThrottleRef = useRef(null);
  const pruneThrottleRef = useRef(null);
  const latestSceneRef = useRef(null);
  const pendingFilesRef = useRef({});
  const hashElementsVersionRef = useRef(null);
  const stampsRef = useRef(stamps);
  stampsRef.current = stamps;
  const persistEnabled = typeof storageKey === "string" && storageKey.length > 0;
  const persistKeyRef = useRef(storageKey);
  persistKeyRef.current = storageKey;
  const onSceneChangeRef = useRef(onSceneChange);
  onSceneChangeRef.current = onSceneChange;
  const onFilesChangeRef = useRef(onFilesChange);
  onFilesChangeRef.current = onFilesChange;
  const persistEnabledRef = useRef(persistEnabled);
  persistEnabledRef.current = persistEnabled;
  const persistedInitial = useMemo(
    () => persistEnabled ? readScene(storageKey) : null,
    [persistEnabled, storageKey]
  );
  const effectiveInitialScene = persistedInitial ? {
    elements: persistedInitial.elements,
    appState: persistedInitial.appState
  } : null;
  const [activeStamp, setActiveStamp] = useState(null);
  const activeStampRef = useRef(activeStamp);
  activeStampRef.current = activeStamp;
  const [editingElement, setEditingElement] = useState(null);
  const hostRef = useRef(null);
  const handledCropIdRef = useRef(null);
  const prevExcalidrawToolRef = useRef("selection");
  const stampByKind = useMemo(() => {
    const m = /* @__PURE__ */ new Map();
    for (const s of stamps) m.set(s.kind, s);
    return m;
  }, [stamps]);
  const activeStampDef = activeStamp ? stampByKind.get(activeStamp) ?? null : null;
  const HostComponent = activeStampDef?.Host ?? null;
  const openStamp = useCallback(
    (kind, element = null) => {
      if (readOnly) return;
      if (!stampByKind.has(kind)) return;
      setEditingElement(element);
      setActiveStamp(kind);
    },
    [readOnly, stampByKind]
  );
  const closeStamp = useCallback(() => {
    setActiveStamp(null);
    setEditingElement(null);
  }, []);
  const toggleStampByKind = useCallback(
    (kind) => {
      if (activeStamp === kind) closeStamp();
      else openStamp(kind);
    },
    [activeStamp, openStamp, closeStamp]
  );
  const handleChange = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (elements, appState, files) => {
      const nextDark = appState?.theme === "dark";
      if (isDarkThemeRef.current !== nextDark) {
        isDarkThemeRef.current = nextDark;
        queueMicrotask(() => setIsDarkTheme(nextDark));
      }
      if (readOnly) return;
      latestSceneRef.current = { elements, appState };
      const cropId = appState?.croppingElementId;
      if (cropId && cropId !== handledCropIdRef.current && api) {
        const el = elements.find((e) => e.id === cropId);
        if (el) {
          const stamp = findStampForCustomData(el.customData, stamps);
          if (stamp) {
            handledCropIdRef.current = cropId;
            const elId = el.id;
            const elCustom = el.customData;
            const stampKind = stamp.kind;
            queueMicrotask(() => {
              try {
                api.updateScene({
                  appState: { croppingElementId: null, selectedElementIds: {} }
                });
              } catch {
              }
              openStamp(stampKind, { id: elId, customData: elCustom });
            });
            return;
          }
        }
      }
      if (!cropId) {
        handledCropIdRef.current = null;
      }
      const fileIds = Object.keys(files);
      const newIds = fileIds.filter((id) => !knownFileIdsRef.current.has(id));
      if (newIds.length > 0) {
        newIds.forEach((id) => knownFileIdsRef.current.add(id));
        onFilesChange?.(files, newIds);
      }
      if (!sceneThrottleRef.current) {
        sceneThrottleRef.current = setTimeout(async () => {
          sceneThrottleRef.current = null;
          try {
            const mod = await import('@excalidraw/excalidraw');
            hashElementsVersionRef.current = mod.hashElementsVersion;
          } catch (err) {
            console.warn("[whiteboard] import excalidraw \u0111\u1EC3 flush scene th\u1EA5t b\u1EA1i:", err);
            return;
          }
          flushSceneRef.current();
        }, SYNC_THROTTLE_MS);
      }
      if (persistEnabled && newIds.length > 0) {
        for (const id of newIds) {
          if (files[id]) pendingFilesRef.current[id] = files[id];
        }
        if (!fileThrottleRef.current) {
          fileThrottleRef.current = setTimeout(() => {
            fileThrottleRef.current = null;
            flushFilesRef.current();
          }, 1e3);
        }
      }
      if (persistEnabled && !pruneThrottleRef.current) {
        pruneThrottleRef.current = setTimeout(() => {
          pruneThrottleRef.current = null;
          flushPruneRef.current();
        }, 2e3);
      }
    },
    [readOnly, api, onSceneChange, onFilesChange, persistEnabled, storageKey, stamps, openStamp]
  );
  const flushSceneRef = useRef(() => void 0);
  flushSceneRef.current = () => {
    try {
      const latestScene = latestSceneRef.current;
      if (!latestScene) return;
      const liveElements = latestScene.elements.filter((e) => !e.isDeleted);
      const liveAppState = pickSyncableAppState(latestScene.appState);
      const hashFn = hashElementsVersionRef.current;
      const elementHash = hashFn ? hashFn(liveElements) : liveElements.map((e) => e.id).join("|");
      const sceneHash = `${elementHash}:${JSON.stringify(liveAppState)}`;
      if (sceneHash === lastSceneHashRef.current) return;
      lastSceneHashRef.current = sceneHash;
      onSceneChangeRef.current?.({ elements: liveElements, appState: liveAppState });
      if (persistEnabledRef.current) {
        writeScene(persistKeyRef.current, {
          elements: liveElements,
          appState: liveAppState
        });
      }
    } catch (err) {
      console.warn("[whiteboard] flushScene th\u1EA5t b\u1EA1i:", err);
    }
  };
  const flushFilesRef = useRef(() => void 0);
  flushFilesRef.current = () => {
    try {
      const pending = pendingFilesRef.current;
      pendingFilesRef.current = {};
      if (Object.keys(pending).length === 0) return;
      const currentElements = apiRef.current?.getSceneElements?.() ?? latestSceneRef.current?.elements ?? [];
      const stampIds = /* @__PURE__ */ new Set();
      for (const el of currentElements) {
        const fid = el.fileId;
        if (fid && isStampElement(el)) stampIds.add(fid);
      }
      const raster = {};
      for (const [id, f] of Object.entries(pending)) {
        if (!stampIds.has(id)) raster[id] = f;
      }
      if (Object.keys(raster).length > 0) {
        void writeFiles(persistKeyRef.current, raster);
      }
    } catch (err) {
      console.warn("[whiteboard] flushFiles th\u1EA5t b\u1EA1i:", err);
    }
  };
  const flushPruneRef = useRef(() => void 0);
  flushPruneRef.current = () => {
    try {
      const currentElements = apiRef.current?.getSceneElements?.() ?? latestSceneRef.current?.elements ?? [];
      const keep = /* @__PURE__ */ new Set();
      for (const el of currentElements) {
        const fid = el.fileId;
        if (fid && !isStampElement(el)) keep.add(fid);
      }
      void pruneFiles(persistKeyRef.current, keep);
    } catch (err) {
      console.warn("[whiteboard] flushPrune th\u1EA5t b\u1EA1i:", err);
    }
  };
  useEffect(() => {
    if (!api || !persistEnabled) return;
    let cancelled = false;
    void readFiles(storageKey).then(
      (files) => {
        if (cancelled) return;
        const entries = Object.entries(files);
        if (entries.length === 0) return;
        if (cancelled) return;
        try {
          api.addFiles(
            entries.map(([id, f]) => ({
              id,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              dataURL: f.dataURL,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              mimeType: f.mimeType,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              created: f.created ?? Date.now()
            }))
          );
          if (cancelled) return;
          entries.forEach(([id]) => knownFileIdsRef.current.add(id));
        } catch (err) {
          if (cancelled) return;
          console.warn("[whiteboard] addFiles t\u1EEB IDB th\u1EA5t b\u1EA1i:", err);
        }
      },
      (err) => {
        if (cancelled) return;
        console.warn("[whiteboard] readFiles th\u1EA5t b\u1EA1i:", err);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [api, persistEnabled, storageKey]);
  useEffect(() => {
    if (!api) return;
    let cancelled = false;
    const run = async () => {
      if (cancelled) return;
      try {
        const elements = api.getSceneElements();
        if (!elements || elements.length === 0) return;
        if (cancelled) return;
        await restoreMissingStampFiles(api, elements, stampsRef.current);
      } catch (err) {
        if (cancelled) return;
        console.warn("Math stamp restore pass failed:", err);
      }
    };
    void run();
    const t = setTimeout(() => {
      void run();
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [api, persistedInitial]);
  useEffect(
    () => () => {
      if (sceneThrottleRef.current) {
        clearTimeout(sceneThrottleRef.current);
        sceneThrottleRef.current = null;
        flushSceneRef.current();
      }
      if (fileThrottleRef.current) {
        clearTimeout(fileThrottleRef.current);
        fileThrottleRef.current = null;
        flushFilesRef.current();
      }
      if (pruneThrottleRef.current) {
        clearTimeout(pruneThrottleRef.current);
        pruneThrottleRef.current = null;
        flushPruneRef.current();
      }
    },
    []
  );
  const handlePointerDown = useStampDoubleClick({
    enabled: !readOnly,
    stamps,
    onOpen: openStamp
  });
  useShortcuts({
    enabled: !readOnly,
    onToggle: toggleStampByKind,
    stamps
  });
  useEffect(() => {
    if (!api) return;
    if (activeStamp) {
      try {
        const cur = api.getAppState?.()?.activeTool?.type ?? "selection";
        if (cur && cur !== "hand") prevExcalidrawToolRef.current = cur;
        api.setActiveTool?.({ type: "hand" });
      } catch {
      }
    } else {
      try {
        api.setActiveTool?.({ type: prevExcalidrawToolRef.current });
      } catch {
      }
    }
  }, [activeStamp, api]);
  useStampShortcutBlocker({ activeStamp, stamps });
  useEffect(() => {
    if (!activeStamp) return;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      const ae = document.activeElement;
      if (ae && (ae.tagName === "TEXTAREA" || ae.isContentEditable)) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      closeStamp();
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [activeStamp, closeStamp]);
  useStampClickOutside({ activeStamp, hostRef, onClose: closeStamp });
  return /* @__PURE__ */ jsxs("div", { className: `relative h-full w-full${isDarkTheme ? " theme--dark" : ""}`, children: [
    /* @__PURE__ */ jsx(Suspense, { fallback: /* @__PURE__ */ jsx(ExcalidrawLoadingFallback, {}), children: /* @__PURE__ */ jsx(
      Excalidraw,
      {
        excalidrawAPI: (a) => {
          if (apiRef.current === a) return;
          apiRef.current = a;
          queueMicrotask(() => {
            setApi(a);
            onApi?.(a);
          });
        },
        langCode,
        viewModeEnabled: readOnly,
        initialData: effectiveInitialScene ? {
          elements: effectiveInitialScene.elements,
          appState: {
            ...effectiveInitialScene.appState,
            gridSize: effectiveInitialScene.appState.gridSize ?? void 0
          }
        } : { appState: { viewBackgroundColor: "#ffffff" } },
        onChange: handleChange,
        onPointerDown: handlePointerDown
      }
    ) }),
    /* @__PURE__ */ jsx(
      ToolbarInjector,
      {
        enabled: !readOnly,
        activeStampKind: activeStamp,
        onToggle: toggleStampByKind,
        stamps
      }
    ),
    HostComponent && /* @__PURE__ */ jsx(
      HostComponent,
      {
        ref: hostRef,
        api,
        editingElement,
        onClose: closeStamp,
        isDark: isDarkTheme
      }
    )
  ] });
}

export { ALL_STAMPS, DEFAULT_STAMPS, EXPERIMENTAL_STAMPS, STABLE_STAMPS, Whiteboard, findStampForCustomData, isStampElement, pickSyncableAppState, restoreMissingStampFiles };
//# sourceMappingURL=index.mjs.map
//# sourceMappingURL=index.mjs.map