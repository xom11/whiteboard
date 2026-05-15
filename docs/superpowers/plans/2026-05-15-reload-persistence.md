# Reload Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `@xom11/whiteboard` từ classroom-coupled component thành standalone note app + thư viện độc lập có persist client-side mạnh (localStorage cho scene + IndexedDB cho raster files), reload không mất dữ liệu.

**Architecture:** Thay `ExcalidrawWhiteboardView` (453 dòng, có role/roomId/remoteScene/remoteFiles) bằng `Whiteboard` (single component, default-on persist qua `storageKey` prop). Thêm 2 storage module thuần ở `src/core/persistence/`. Bỏ toàn bộ teacher/student logic — consumer như `hoctotbachkhoa` tự xử lý sync qua LiveKit ở repo riêng, dùng `onApi` + `onSceneChange` làm escape hatch.

**Tech Stack:** TypeScript strict, React 18, Excalidraw 0.18, Jest 29 + jsdom, ts-jest, fake-indexeddb (mới).

**Spec:** [`docs/superpowers/specs/2026-05-15-reload-persistence-design.md`](../specs/2026-05-15-reload-persistence-design.md)

---

## File Structure

| Path | Trạng thái | Trách nhiệm |
|---|---|---|
| `src/core/persistence/sceneStore.ts` | **Create** | localStorage wrapper — read/write/clear scene JSON, validate version |
| `src/core/persistence/fileStore.ts` | **Create** | IndexedDB wrapper — read/write/prune/clearAll raster files |
| `src/core/persistence/__tests__/sceneStore.test.ts` | **Create** | Unit test sceneStore |
| `src/core/persistence/__tests__/fileStore.test.ts` | **Create** | Unit test fileStore (fake-indexeddb) |
| `src/Whiteboard.tsx` | **Create** | Replacement component, simplified API, default-on persist |
| `src/__tests__/Whiteboard.test.tsx` | **Create** | Smoke + persist behavior tests |
| `src/index.ts` | **Modify** | Re-export `Whiteboard` thay `ExcalidrawWhiteboardView` |
| `src/ExcalidrawWhiteboardView.tsx` | **Delete** | Thay bằng `Whiteboard.tsx` |
| `src/core/usePersist.ts` | **Delete** | Thay bằng sceneStore + fileStore wiring inline |
| `src/core/__tests__/usePersist.test.tsx` | **Delete** | Hook đã bị xoá |
| `src/__tests__/ExcalidrawWhiteboardView.smoke.test.tsx` | **Delete** | Thay bằng `Whiteboard.test.tsx` |
| `jest.setup.ts` | **Modify** | Load `fake-indexeddb/auto` |
| `package.json` | **Modify** | `"fake-indexeddb": "^6.0.0"` vào devDependencies |

---

## Task 1: Setup fake-indexeddb dev dep + jest config

**Files:**
- Modify: `package.json`
- Modify: `jest.setup.ts`

- [ ] **Step 1: Install fake-indexeddb**

Run: `npm install --save-dev fake-indexeddb@^6.0.0`
Expected: `package.json` được update, `node_modules/fake-indexeddb` có.

- [ ] **Step 2: Load fake-indexeddb tự động trong jest setup**

Edit `jest.setup.ts` từ:

```ts
import '@testing-library/jest-dom';
```

Thành:

```ts
import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';
```

- [ ] **Step 3: Verify jest vẫn chạy được**

Run: `npm test -- --listTests`
Expected: liệt kê test files, không có lỗi import.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json jest.setup.ts
git commit -m "chore: thêm fake-indexeddb cho IndexedDB tests"
```

---

## Task 2: sceneStore (localStorage) — TDD

**Files:**
- Create: `src/core/persistence/sceneStore.ts`
- Create: `src/core/persistence/__tests__/sceneStore.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/core/persistence/__tests__/sceneStore.test.ts`:

```ts
import { readScene, writeScene, clearScene } from '../sceneStore';

beforeEach(() => {
  window.localStorage.clear();
  jest.restoreAllMocks();
});

describe('sceneStore', () => {
  test('roundtrip read/write', () => {
    writeScene('k1', {
      elements: [{ id: 'a', type: 'rectangle' } as never],
      appState: { theme: 'light', viewBackgroundColor: '#fff' } as never,
    });
    const got = readScene('k1');
    expect(got).not.toBeNull();
    expect(got!.elements).toHaveLength(1);
    expect(got!.appState.theme).toBe('light');
    expect(got!.version).toBe(1);
    expect(typeof got!.savedAt).toBe('number');
  });

  test('read trên key chưa có → null', () => {
    expect(readScene('nope')).toBeNull();
  });

  test('clearScene xoá key', () => {
    writeScene('k', { elements: [], appState: {} as never });
    clearScene('k');
    expect(readScene('k')).toBeNull();
  });

  test('malformed JSON → null + clear', () => {
    window.localStorage.setItem('whiteboard:scene:bad', '{{not json');
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(readScene('bad')).toBeNull();
    expect(window.localStorage.getItem('whiteboard:scene:bad')).toBeNull();
    warn.mockRestore();
  });

  test('version lớn hơn → null + warn', () => {
    window.localStorage.setItem(
      'whiteboard:scene:future',
      JSON.stringify({ version: 99, elements: [], appState: {}, savedAt: 0 }),
    );
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(readScene('future')).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  test('missing elements field → null', () => {
    window.localStorage.setItem(
      'whiteboard:scene:bad2',
      JSON.stringify({ version: 1, appState: {}, savedAt: 0 }),
    );
    expect(readScene('bad2')).toBeNull();
  });

  test('quota error nuốt, không throw', () => {
    const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => writeScene('q', { elements: [], appState: {} as never })).not.toThrow();
    expect(warn).toHaveBeenCalled();
    setItem.mockRestore();
    warn.mockRestore();
  });
});
```

- [ ] **Step 2: Run tests — expected FAIL (module chưa có)**

Run: `npm test -- sceneStore`
Expected: Cannot find module `../sceneStore`.

- [ ] **Step 3: Implement sceneStore**

Create `src/core/persistence/sceneStore.ts`:

```ts
import type { ExcalidrawElement, SyncableAppState } from '../../types';

const PREFIX = 'whiteboard:scene:';
const SCHEMA_VERSION = 1;

export interface StoredScene {
  version: number;
  elements: readonly ExcalidrawElement[];
  appState: Partial<SyncableAppState>;
  savedAt: number;
}

function fullKey(key: string): string {
  return PREFIX + key;
}

export function readScene(key: string): StoredScene | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(fullKey(key));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredScene>;
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.version !== SCHEMA_VERSION) {
      console.warn(
        `[whiteboard] scene version ${parsed.version} không khớp ${SCHEMA_VERSION}, bỏ qua.`,
      );
      return null;
    }
    if (!Array.isArray(parsed.elements)) return null;
    return {
      version: SCHEMA_VERSION,
      elements: parsed.elements,
      appState: (parsed.appState ?? {}) as Partial<SyncableAppState>,
      savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : Date.now(),
    };
  } catch (err) {
    console.warn('[whiteboard] scene parse error, clear:', err);
    try {
      window.localStorage.removeItem(fullKey(key));
    } catch { /* ignore */ }
    return null;
  }
}

export function writeScene(
  key: string,
  payload: { elements: readonly ExcalidrawElement[]; appState: Partial<SyncableAppState> },
): void {
  if (typeof window === 'undefined') return;
  const record: StoredScene = {
    version: SCHEMA_VERSION,
    elements: payload.elements,
    appState: payload.appState,
    savedAt: Date.now(),
  };
  try {
    window.localStorage.setItem(fullKey(key), JSON.stringify(record));
  } catch (err) {
    console.warn('[whiteboard] scene write failed:', err);
  }
}

export function clearScene(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(fullKey(key));
  } catch { /* ignore */ }
}
```

- [ ] **Step 4: Run tests — expected PASS**

Run: `npm test -- sceneStore`
Expected: 7 passed.

- [ ] **Step 5: Commit**

```bash
git add src/core/persistence/sceneStore.ts src/core/persistence/__tests__/sceneStore.test.ts
git commit -m "feat(persist): sceneStore — localStorage wrapper cho scene snapshot"
```

---

## Task 3: fileStore (IndexedDB) — TDD

**Files:**
- Create: `src/core/persistence/fileStore.ts`
- Create: `src/core/persistence/__tests__/fileStore.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/core/persistence/__tests__/fileStore.test.ts`:

```ts
import { readFiles, writeFiles, pruneFiles, clearAll } from '../fileStore';
import type { BinaryFiles } from '../../../types';

const mkFile = (overrides: Partial<{ dataURL: string; mimeType: string; created: number }> = {}) => ({
  dataURL: 'data:image/png;base64,AAA',
  mimeType: 'image/png',
  created: 1700000000000,
  ...overrides,
});

beforeEach(async () => {
  // fake-indexeddb tự reset giữa mỗi test? Không — phải clearAll thủ công.
  await clearAll('k1');
  await clearAll('k2');
});

describe('fileStore', () => {
  test('roundtrip readFiles/writeFiles', async () => {
    const files: BinaryFiles = {
      f1: mkFile() as never,
      f2: mkFile({ mimeType: 'image/jpeg' }) as never,
    };
    await writeFiles('k1', files);
    const got = await readFiles('k1');
    expect(Object.keys(got).sort()).toEqual(['f1', 'f2']);
    expect((got.f1 as { mimeType: string }).mimeType).toBe('image/png');
    expect((got.f2 as { mimeType: string }).mimeType).toBe('image/jpeg');
  });

  test('readFiles trên storageKey trống → {}', async () => {
    const got = await readFiles('empty');
    expect(got).toEqual({});
  });

  test('writeFiles skip id đã tồn tại', async () => {
    await writeFiles('k1', { f1: mkFile({ dataURL: 'AAA' }) as never });
    await writeFiles('k1', { f1: mkFile({ dataURL: 'BBB' }) as never });
    const got = await readFiles('k1');
    expect((got.f1 as { dataURL: string }).dataURL).toBe('data:image/png;base64,AAA');
  });

  test('pruneFiles giữ keepIds, xoá phần còn lại', async () => {
    await writeFiles('k1', { f1: mkFile() as never, f2: mkFile() as never, f3: mkFile() as never });
    await pruneFiles('k1', new Set(['f2']));
    const got = await readFiles('k1');
    expect(Object.keys(got)).toEqual(['f2']);
  });

  test('clearAll xoá toàn bộ records của storageKey, không đụng key khác', async () => {
    await writeFiles('k1', { f1: mkFile() as never });
    await writeFiles('k2', { g1: mkFile() as never });
    await clearAll('k1');
    expect(await readFiles('k1')).toEqual({});
    const k2 = await readFiles('k2');
    expect(Object.keys(k2)).toEqual(['g1']);
  });
});
```

- [ ] **Step 2: Run tests — expected FAIL**

Run: `npm test -- fileStore`
Expected: Cannot find module `../fileStore`.

- [ ] **Step 3: Implement fileStore**

Create `src/core/persistence/fileStore.ts`:

```ts
import type { BinaryFiles } from '../../types';

const DB_NAME = 'whiteboard-files';
const DB_VERSION = 1;
const STORE = 'files';

interface FileRecord {
  id: string;
  storageKey: string;
  dataURL: string;
  mimeType: string;
  created: number;
  savedAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;
let idbDisabled = false;

function openDb(): Promise<IDBDatabase> {
  if (idbDisabled) return Promise.reject(new Error('IndexedDB disabled'));
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      idbDisabled = true;
      reject(new Error('indexedDB undefined'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('storageKey', 'storageKey', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      idbDisabled = true;
      reject(req.error ?? new Error('IDB open failed'));
    };
  });
  return dbPromise;
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => Promise<T> | T,
): Promise<T> {
  let db: IDBDatabase;
  try {
    db = await openDb();
  } catch {
    return undefined as unknown as T;
  }
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    let result: T;
    Promise.resolve(fn(store))
      .then((r) => {
        result = r;
      })
      .catch(reject);
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => {
      console.warn('[whiteboard] IDB tx error:', tx.error);
      reject(tx.error ?? new Error('IDB tx error'));
    };
    tx.onabort = () => reject(tx.error ?? new Error('IDB tx aborted'));
  });
}

function cursorAllByIndex(
  store: IDBObjectStore,
  indexName: string,
  key: IDBValidKey,
): Promise<FileRecord[]> {
  return new Promise((resolve, reject) => {
    const out: FileRecord[] = [];
    const req = store.index(indexName).openCursor(IDBKeyRange.only(key));
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        out.push(cursor.value as FileRecord);
        cursor.continue();
      } else {
        resolve(out);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

export async function readFiles(storageKey: string): Promise<BinaryFiles> {
  try {
    const records = await withStore('readonly', (store) =>
      cursorAllByIndex(store, 'storageKey', storageKey),
    );
    if (!records) return {};
    const out: BinaryFiles = {};
    for (const r of records) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (out as any)[r.id] = {
        dataURL: r.dataURL,
        mimeType: r.mimeType,
        created: r.created,
      };
    }
    return out;
  } catch (err) {
    console.warn('[whiteboard] readFiles failed:', err);
    return {};
  }
}

export async function writeFiles(storageKey: string, files: BinaryFiles): Promise<void> {
  const entries = Object.entries(files);
  if (entries.length === 0) return;
  try {
    await withStore('readwrite', async (store) => {
      const existing = await new Promise<Set<string>>((resolve, reject) => {
        const req = store.index('storageKey').getAllKeys(IDBKeyRange.only(storageKey));
        req.onsuccess = () => resolve(new Set(req.result as string[]));
        req.onerror = () => reject(req.error);
      });
      const now = Date.now();
      for (const [id, f] of entries) {
        if (existing.has(id)) continue;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ff = f as any;
        const rec: FileRecord = {
          id,
          storageKey,
          dataURL: ff.dataURL,
          mimeType: ff.mimeType,
          created: ff.created ?? now,
          savedAt: now,
        };
        store.put(rec);
      }
    });
  } catch (err) {
    console.warn('[whiteboard] writeFiles failed:', err);
  }
}

export async function pruneFiles(
  storageKey: string,
  keepIds: ReadonlySet<string>,
): Promise<void> {
  try {
    await withStore('readwrite', async (store) => {
      const keys = await new Promise<string[]>((resolve, reject) => {
        const req = store.index('storageKey').getAllKeys(IDBKeyRange.only(storageKey));
        req.onsuccess = () => resolve(req.result as string[]);
        req.onerror = () => reject(req.error);
      });
      for (const id of keys) {
        if (!keepIds.has(id)) store.delete(id);
      }
    });
  } catch (err) {
    console.warn('[whiteboard] pruneFiles failed:', err);
  }
}

export async function clearAll(storageKey: string): Promise<void> {
  try {
    await withStore('readwrite', async (store) => {
      const keys = await new Promise<string[]>((resolve, reject) => {
        const req = store.index('storageKey').getAllKeys(IDBKeyRange.only(storageKey));
        req.onsuccess = () => resolve(req.result as string[]);
        req.onerror = () => reject(req.error);
      });
      for (const id of keys) store.delete(id);
    });
  } catch (err) {
    console.warn('[whiteboard] clearAll failed:', err);
  }
}
```

- [ ] **Step 4: Run tests — expected PASS**

Run: `npm test -- fileStore`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add src/core/persistence/fileStore.ts src/core/persistence/__tests__/fileStore.test.ts
git commit -m "feat(persist): fileStore — IndexedDB wrapper cho raster files"
```

---

## Task 4: Tạo `Whiteboard.tsx` mới (copy + simplify từ ExcalidrawWhiteboardView)

**Files:**
- Create: `src/Whiteboard.tsx`

- [ ] **Step 1: Copy file gốc làm starting point**

Run: `cp src/ExcalidrawWhiteboardView.tsx src/Whiteboard.tsx`

- [ ] **Step 2: Sửa imports và đổi tên component**

Mở `src/Whiteboard.tsx`. Thay 6 dòng import đầu:

```tsx
'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  ExcalidrawElement,
  BinaryFiles,
  ExcalidrawSceneSnapshot,
  SyncableAppState,
} from './types';
import { pickSyncableAppState } from './serialize';
import {
  ToolbarStampInjector,
  useStampShortcuts,
  isMathStamp,
  restoreMissingMathStampFiles,
  DEFAULT_STAMPS,
  findStampForCustomData,
  type StampType,
} from './stamp';
import type { StampHostHandle } from './stamp/registry/types';
import { usePersist, writePersisted } from './core/usePersist';
import '@excalidraw/excalidraw/index.css';
import './stamp/stamp.css';
```

Bằng:

```tsx
'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  ExcalidrawElement,
  BinaryFiles,
  ExcalidrawSceneSnapshot,
  SyncableAppState,
} from './types';
import { pickSyncableAppState } from './serialize';
import {
  ToolbarStampInjector,
  useStampShortcuts,
  isMathStamp,
  restoreMissingMathStampFiles,
  DEFAULT_STAMPS,
  findStampForCustomData,
  type StampType,
} from './stamp';
import type { StampHostHandle } from './stamp/registry/types';
import { readScene, writeScene } from './core/persistence/sceneStore';
import { readFiles, writeFiles, pruneFiles } from './core/persistence/fileStore';
import '@excalidraw/excalidraw/index.css';
import './stamp/stamp.css';
```

- [ ] **Step 3: Thay block prop interface (lines 50-80 cũ)**

Tìm `export interface ExcalidrawWhiteboardViewProps {` và thay toàn bộ interface (đến `}` đóng) bằng:

```tsx
export interface WhiteboardProps {
  /**
   * Storage key cho persist client-side.
   * - Scene → localStorage['whiteboard:scene:'+storageKey]
   * - Files raster → IndexedDB 'whiteboard-files' index theo storageKey
   * - Default: 'default'
   * - Truyền `null` để tắt persist (consumer drive state qua onApi).
   */
  storageKey?: string | null;

  /** View-only (Excalidraw viewModeEnabled). Default false. */
  readOnly?: boolean;

  /** Local edits → consumer broadcast. Optional. */
  onSceneChange?: (snapshot: ExcalidrawSceneSnapshot) => void;
  onFilesChange?: (files: BinaryFiles, newFileIds: string[]) => void;

  /** Excalidraw imperative API. Consumer dùng inject remote scene khi cần. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onApi?: (api: any) => void;

  /** Excalidraw UI lang. Default 'vi-VN'. */
  langCode?: string;

  /** Stamps registry. Default DEFAULT_STAMPS. */
  stamps?: ReadonlyArray<StampType>;
}
```

- [ ] **Step 4: Thay signature function + body khởi tạo**

Tìm `export function ExcalidrawWhiteboardView({` và thay block:

```tsx
export function ExcalidrawWhiteboardView({
  role,
  initialScene,
  remoteScene,
  remoteFiles,
  onSceneChange,
  onFilesChange,
  langCode = 'vi-VN',
  persistKey,
  stamps = DEFAULT_STAMPS,
  onApi,
}: ExcalidrawWhiteboardViewProps) {
  const [api, setApi] = useState<ExApi | null>(null);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const knownFileIdsRef = useRef<Set<string>>(new Set());
  const lastElementsHashRef = useRef<string>('');
  const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { persistedInitial } = usePersist(persistKey, api, (id) =>
    knownFileIdsRef.current.add(id),
  );
  const effectiveInitialScene: ExcalidrawSceneSnapshot | null =
    persistedInitial
      ? { elements: persistedInitial.elements, appState: persistedInitial.appState as SyncableAppState }
      : initialScene;
```

Bằng:

```tsx
export function Whiteboard({
  storageKey = 'default',
  readOnly = false,
  onSceneChange,
  onFilesChange,
  onApi,
  langCode = 'vi-VN',
  stamps = DEFAULT_STAMPS,
}: WhiteboardProps) {
  const [api, setApi] = useState<ExApi | null>(null);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const knownFileIdsRef = useRef<Set<string>>(new Set());
  const lastElementsHashRef = useRef<string>('');
  const sceneThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pruneThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingFilesRef = useRef<BinaryFiles>({});
  const persistEnabled = typeof storageKey === 'string' && storageKey.length > 0;
  const persistKeyRef = useRef(storageKey);
  persistKeyRef.current = storageKey;

  const persistedInitial = useMemo(
    () => (persistEnabled ? readScene(storageKey as string) : null),
    [persistEnabled, storageKey],
  );
  const effectiveInitialScene: ExcalidrawSceneSnapshot | null = persistedInitial
    ? {
        elements: persistedInitial.elements,
        appState: persistedInitial.appState as SyncableAppState,
      }
    : null;
```

- [ ] **Step 5: Xoá `isTeacher` constant + replace guards**

Tìm và xoá dòng:

```tsx
  const isTeacher = role === 'teacher';
```

Tìm tất cả `if (!isTeacher) return;` trong các handler (sẽ có ~3 chỗ) và thay bằng:

```tsx
  if (readOnly) return;
```

Tìm `if (isTeacher && ...)` và `!isTeacher` đảo lại logic tương ứng (search file để tìm hết).

Trong `openStamp`:

```tsx
  const openStamp = useCallback(
    (kind: string, element: EditingElement | null = null) => {
      if (!isTeacher) return;       // ← thay
      if (!stampByKind.has(kind)) return;
```

Thành:

```tsx
  const openStamp = useCallback(
    (kind: string, element: EditingElement | null = null) => {
      if (readOnly) return;
      if (!stampByKind.has(kind)) return;
```

(cập nhật deps array của `useCallback` từ `[isTeacher, stampByKind]` thành `[readOnly, stampByKind]`)

- [ ] **Step 6: Replace persist write trong `handleChange`**

Tìm block:

```tsx
        if (persistKey) {
          // Bỏ qua file của math-stamp (sẽ regenerate). Giữ lại file raster
          // (user-paste image) để reload không mất ảnh.
          const stampFileIds = new Set<string>();
          for (const el of liveElements) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const fid = (el as any).fileId as string | undefined;
            if (fid && isMathStamp(el)) stampFileIds.add(fid);
          }
          const rasterFiles: BinaryFiles = {};
          for (const [fid, f] of Object.entries(files)) {
            if (!stampFileIds.has(fid)) rasterFiles[fid] = f;
          }
          writePersisted(persistKey, {
            elements: liveElements,
            appState: liveAppState,
            files: rasterFiles,
          });
        }
```

Thay bằng:

```tsx
        if (persistEnabled) {
          writeScene(storageKey as string, {
            elements: liveElements,
            appState: liveAppState,
          });
        }
```

Đổi tên `throttleTimerRef` → `sceneThrottleRef` (search-replace trong handleChange + useEffect cleanup ở bottom).

- [ ] **Step 7: Thêm file throttle (raster files vào IDB) ngay dưới scene throttle**

Trong `handleChange`, sau block `setIsDarkTheme(...)` và trước scene throttle, thêm:

```tsx
      const fileIds = Object.keys(files);
      const newIds = fileIds.filter((id) => !knownFileIdsRef.current.has(id));
      if (newIds.length > 0) {
        newIds.forEach((id) => knownFileIdsRef.current.add(id));
        onFilesChange?.(files, newIds);
      }
```

(Thay cho block tương tự cũ — đổi `onFilesChange(files, newIds)` thành `onFilesChange?.(files, newIds)` vì giờ optional.)

Sau scene throttle (timeout đã set), thêm file throttle:

```tsx
      // File throttle (1s) — lưu raster vào IDB, bỏ math-stamp files.
      if (persistEnabled && newIds.length > 0) {
        for (const id of newIds) {
          if (files[id]) pendingFilesRef.current[id] = files[id];
        }
        if (!fileThrottleRef.current) {
          fileThrottleRef.current = setTimeout(() => {
            fileThrottleRef.current = null;
            const pending = pendingFilesRef.current;
            pendingFilesRef.current = {};
            const currentElements = (api?.getSceneElements?.() ?? elements) as readonly ExcalidrawElement[];
            const stampIds = new Set<string>();
            for (const el of currentElements) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const fid = (el as any).fileId as string | undefined;
              if (fid && isMathStamp(el)) stampIds.add(fid);
            }
            const raster: BinaryFiles = {};
            for (const [id, f] of Object.entries(pending)) {
              if (!stampIds.has(id)) raster[id] = f;
            }
            void writeFiles(persistKeyRef.current as string, raster);
          }, 1000);
        }
      }

      // Prune throttle (2s edge) — dọn orphan sau khi xoá element.
      if (persistEnabled && !pruneThrottleRef.current) {
        pruneThrottleRef.current = setTimeout(() => {
          pruneThrottleRef.current = null;
          const currentElements = (api?.getSceneElements?.() ?? elements) as readonly ExcalidrawElement[];
          const keep = new Set<string>();
          for (const el of currentElements) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const fid = (el as any).fileId as string | undefined;
            if (fid && !isMathStamp(el)) keep.add(fid);
          }
          void pruneFiles(persistKeyRef.current as string, keep);
        }, 2000);
      }
```

- [ ] **Step 8: Thay onSceneChange call**

Trong scene throttle, đổi:

```tsx
        onSceneChange({ elements: liveElements, appState: liveAppState });
```

Thành:

```tsx
        onSceneChange?.({ elements: liveElements, appState: liveAppState });
```

- [ ] **Step 9: Update deps array của handleChange**

Đổi:

```tsx
    [isTeacher, api, onSceneChange, onFilesChange, persistKey, stamps, openStamp],
```

Thành:

```tsx
    [readOnly, api, onSceneChange, onFilesChange, persistEnabled, storageKey, stamps, openStamp],
```

- [ ] **Step 10: Xoá 2 useEffect remote sync (student)**

Tìm và xoá nguyên block:

```tsx
  // ---- Student path: apply remote scene ----
  useEffect(() => {
    if (isTeacher || !api || !remoteScene) return;
    api.updateScene({
      elements: remoteScene.elements,
      appState: remoteScene.appState as Partial<SyncableAppState>,
    });
  }, [isTeacher, api, remoteScene]);

  useEffect(() => {
    if (isTeacher || !api || !remoteFiles) return;
    const entries = Object.entries(remoteFiles);
    if (entries.length === 0) return;
    api.addFiles(
      entries.map(([id, f]) => ({
        id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dataURL: (f as any).dataURL,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mimeType: (f as any).mimeType,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        created: (f as any).created ?? Date.now(),
      })),
    );
  }, [isTeacher, api, remoteFiles]);
```

- [ ] **Step 11: Thêm useEffect load files từ IDB ở mount**

Sau khi xoá 2 block trên, ở vị trí đó thêm:

```tsx
  // ---- Mount: load persisted raster files từ IDB → addFiles ----
  useEffect(() => {
    if (!api || !persistEnabled) return;
    let cancelled = false;
    void readFiles(storageKey as string).then((files) => {
      if (cancelled) return;
      const entries = Object.entries(files);
      if (entries.length === 0) return;
      try {
        api.addFiles(
          entries.map(([id, f]) => ({
            id,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            dataURL: (f as any).dataURL,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            mimeType: (f as any).mimeType,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            created: (f as any).created ?? Date.now(),
          })),
        );
        entries.forEach(([id]) => knownFileIdsRef.current.add(id));
      } catch (err) {
        console.warn('[whiteboard] addFiles từ IDB thất bại:', err);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [api, persistEnabled, storageKey]);
```

- [ ] **Step 12: Update math-stamp restore deps array**

Tìm:

```tsx
  }, [api, initialScene, remoteScene, stamps]);
```

Thay bằng:

```tsx
  }, [api, persistedInitial, stamps]);
```

- [ ] **Step 13: Cleanup all throttle timers ở unmount**

Tìm:

```tsx
  useEffect(
    () => () => {
      if (throttleTimerRef.current) clearTimeout(throttleTimerRef.current);
    },
    [],
  );
```

Thay bằng:

```tsx
  useEffect(
    () => () => {
      if (sceneThrottleRef.current) clearTimeout(sceneThrottleRef.current);
      if (fileThrottleRef.current) clearTimeout(fileThrottleRef.current);
      if (pruneThrottleRef.current) clearTimeout(pruneThrottleRef.current);
    },
    [],
  );
```

- [ ] **Step 14: Update handlePointerDown guard**

Trong `handlePointerDown`, đổi:

```tsx
      if (!isTeacher) return;
```

Thành:

```tsx
      if (readOnly) return;
```

Update deps: `[isTeacher, stamps, openStamp]` → `[readOnly, stamps, openStamp]`.

- [ ] **Step 15: Update `useStampShortcuts` call**

```tsx
  useStampShortcuts({
    enabled: isTeacher,
    onToggle: toggleStampByKind,
    stamps,
  });
```

Thành:

```tsx
  useStampShortcuts({
    enabled: !readOnly,
    onToggle: toggleStampByKind,
    stamps,
  });
```

- [ ] **Step 16: Update JSX bottom**

Tìm:

```tsx
      <Excalidraw
        excalidrawAPI={(a: ExApi) => { setApi(a); onApi?.(a); }}
        langCode={langCode}
        viewModeEnabled={!isTeacher}
        initialData={
```

Thay `viewModeEnabled={!isTeacher}` bằng `viewModeEnabled={readOnly}`.

Trong `ToolbarStampInjector`:

```tsx
      <ToolbarStampInjector
        enabled={isTeacher}
```

Thành:

```tsx
      <ToolbarStampInjector
        enabled={!readOnly}
```

- [ ] **Step 17: Verify typecheck**

Run: `npm run typecheck`
Expected: 0 errors. Nếu còn `isTeacher`/`role`/`remoteScene`/`remoteFiles`/`persistKey`/`initialScene` undefined → quay lại các step trên search-replace cho hết.

- [ ] **Step 18: Commit**

```bash
git add src/Whiteboard.tsx
git commit -m "feat: Whiteboard component — strip classroom logic + wire sceneStore/fileStore"
```

---

## Task 5: Update `src/index.ts` exports

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Replace exports**

Thay nội dung `src/index.ts`:

```ts
export { ExcalidrawWhiteboardView } from './ExcalidrawWhiteboardView';
export type { ExcalidrawWhiteboardViewProps } from './ExcalidrawWhiteboardView';
export { pickSyncableAppState } from './serialize';
export type {
  ExcalidrawElement,
  NonDeletedExcalidrawElement,
  AppState,
  BinaryFiles,
  SyncableAppState,
  ExcalidrawSceneSnapshot,
} from './types';
```

Bằng:

```ts
export { Whiteboard } from './Whiteboard';
export type { WhiteboardProps } from './Whiteboard';
export { pickSyncableAppState } from './serialize';
export type {
  ExcalidrawElement,
  NonDeletedExcalidrawElement,
  AppState,
  BinaryFiles,
  SyncableAppState,
  ExcalidrawSceneSnapshot,
} from './types';
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/index.ts
git commit -m "feat: export Whiteboard thay ExcalidrawWhiteboardView"
```

---

## Task 6: Xoá files cũ (ExcalidrawWhiteboardView + usePersist + tests)

**Files:**
- Delete: `src/ExcalidrawWhiteboardView.tsx`
- Delete: `src/core/usePersist.ts`
- Delete: `src/core/__tests__/usePersist.test.tsx`
- Delete: `src/__tests__/ExcalidrawWhiteboardView.smoke.test.tsx`

- [ ] **Step 1: Xoá file**

Run:

```bash
rm src/ExcalidrawWhiteboardView.tsx \
   src/core/usePersist.ts \
   src/core/__tests__/usePersist.test.tsx \
   src/__tests__/ExcalidrawWhiteboardView.smoke.test.tsx
```

- [ ] **Step 2: Verify không còn ref nào tới file cũ**

Run: `grep -r "ExcalidrawWhiteboardView\|usePersist\|writePersisted" src/ docs/ || echo "clean"`
Expected: `clean` (hoặc chỉ docs/specs).

Nếu vẫn còn import: tìm và xoá / sửa.

- [ ] **Step 3: Verify typecheck + run tests**

Run: `npm run typecheck && npm test`
Expected: typecheck 0 errors. Test pass (chỉ còn sceneStore + fileStore + serialize + insertStampImage tests).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: xoá ExcalidrawWhiteboardView + usePersist (đã thay bằng Whiteboard + persistence modules)"
```

---

## Task 7: Component tests cho `Whiteboard`

**Files:**
- Create: `src/__tests__/Whiteboard.test.tsx`

- [ ] **Step 1: Write failing test file**

Create `src/__tests__/Whiteboard.test.tsx`:

```tsx
import React from 'react';
import { render, act } from '@testing-library/react';
import { Whiteboard } from '../Whiteboard';

// Mock Excalidraw — giữ y hệt mock cũ ở ExcalidrawWhiteboardView.smoke.test.tsx.
jest.mock('@excalidraw/excalidraw', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  const NoopChildren = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children);
  const DefaultItem = () => null;
  const MainMenu = Object.assign(NoopChildren, {
    DefaultItems: {
      LoadScene: DefaultItem,
      SaveAsImage: DefaultItem,
      ClearCanvas: DefaultItem,
      ToggleTheme: DefaultItem,
    },
  });
  // Capture latest props để test introspect.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).__excProps = null;
  return {
    Excalidraw: (props: {
      excalidrawAPI?: (api: unknown) => void;
      children?: React.ReactNode;
      viewModeEnabled?: boolean;
      initialData?: unknown;
    }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).__excProps = props;
      React.useEffect(() => {
        props.excalidrawAPI?.({
          updateScene: jest.fn(),
          addFiles: jest.fn(),
          getSceneElements: () => [],
          getFiles: () => ({}),
          getAppState: () => ({ zoom: { value: 1 }, scrollX: 0, scrollY: 0, width: 800, height: 600 }),
        });
      }, []);
      return React.createElement(
        'div',
        { 'data-testid': 'excalidraw-mock', className: 'excalidraw' },
        React.createElement(
          'div',
          { className: 'App-toolbar' },
          React.createElement('div', { className: 'Stack Stack_horizontal' }),
        ),
        props.children,
      );
    },
    MainMenu,
    Footer: NoopChildren,
    WelcomeScreen: NoopChildren,
    hashElementsVersion: (els: { length: number }[]) => `h${els.length}`,
  };
});

jest.mock('../stamp/renderLatexToSvg', () => ({
  renderLatexToSvg: jest.fn(async () => '<svg>mock</svg>'),
}));

jest.mock('next/dynamic', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function dynamicMock(loader: () => Promise<any>) {
    const Comp = (props: Record<string, unknown>) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [Resolved, setResolved]: [any, (v: any) => void] = React.useState(null);
      React.useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        void loader().then((mod: any) => {
          const Ctor = typeof mod === 'function' ? mod : mod.default;
          setResolved(() => Ctor);
        });
      }, []);
      if (!Resolved) return null;
      return React.createElement(Resolved, props);
    };
    return Comp;
  };
});

// Sau mỗi test, dọn localStorage để không nhiễm xuyên test.
beforeEach(() => {
  window.localStorage.clear();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).__excProps = null;
});

const getExcProps = () =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).__excProps as {
    viewModeEnabled?: boolean;
    initialData?: { elements?: unknown[] };
  } | null;

describe('Whiteboard', () => {
  test('smoke: render Excalidraw mock', async () => {
    const { findByTestId } = render(React.createElement(Whiteboard, {}));
    expect(await findByTestId('excalidraw-mock')).toBeInTheDocument();
  });

  test('readOnly={true} → viewModeEnabled=true', async () => {
    const { findByTestId } = render(React.createElement(Whiteboard, { readOnly: true }));
    await findByTestId('excalidraw-mock');
    expect(getExcProps()?.viewModeEnabled).toBe(true);
  });

  test('readOnly default false → viewModeEnabled=false', async () => {
    const { findByTestId } = render(React.createElement(Whiteboard, {}));
    await findByTestId('excalidraw-mock');
    expect(getExcProps()?.viewModeEnabled).toBe(false);
  });

  test('teacher mặc định: G/L buttons inject vào toolbar', async () => {
    const { findByLabelText } = render(React.createElement(Whiteboard, {}));
    expect(await findByLabelText(/chèn hình học/i)).toBeInTheDocument();
    expect(await findByLabelText(/chèn công thức/i)).toBeInTheDocument();
  });

  test('readOnly: G/L buttons không inject', async () => {
    const { findByTestId, queryByLabelText } = render(
      React.createElement(Whiteboard, { readOnly: true }),
    );
    await findByTestId('excalidraw-mock');
    expect(queryByLabelText(/chèn hình học/i)).toBeNull();
    expect(queryByLabelText(/chèn công thức/i)).toBeNull();
  });

  test('pre-seed localStorage → initialData nhận elements', async () => {
    window.localStorage.setItem(
      'whiteboard:scene:default',
      JSON.stringify({
        version: 1,
        elements: [{ id: 'el1', type: 'rectangle' }],
        appState: { theme: 'light' },
        savedAt: Date.now(),
      }),
    );
    const { findByTestId } = render(React.createElement(Whiteboard, {}));
    await findByTestId('excalidraw-mock');
    expect(getExcProps()?.initialData?.elements).toEqual([{ id: 'el1', type: 'rectangle' }]);
  });

  test('storageKey=null → không đọc localStorage', async () => {
    window.localStorage.setItem(
      'whiteboard:scene:default',
      JSON.stringify({
        version: 1,
        elements: [{ id: 'el1', type: 'rectangle' }],
        appState: {},
        savedAt: 0,
      }),
    );
    const { findByTestId } = render(
      React.createElement(Whiteboard, { storageKey: null }),
    );
    await findByTestId('excalidraw-mock');
    // initialData phải là null/empty appState — KHÔNG có elements pre-seed.
    expect(getExcProps()?.initialData?.elements).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests — expected PASS (component đã có từ Task 4)**

Run: `npm test -- Whiteboard`
Expected: 7 passed.

Nếu fail vì mock chưa đủ field hoặc `getAppState()` thiếu — debug và bổ sung. Nếu fail vì component logic — xem lại Task 4.

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/Whiteboard.test.tsx
git commit -m "test: Whiteboard component — smoke + persist behavior"
```

---

## Task 8: Final verification — typecheck + build + manual smoke

**Files:** không tạo mới.

- [ ] **Step 1: Typecheck sạch**

Run: `npm run typecheck`
Expected: 0 errors.

- [ ] **Step 2: Full test suite pass**

Run: `npm test`
Expected: tất cả test pass — sceneStore, fileStore, Whiteboard, serialize, insertStampImage, các stamp tests.

- [ ] **Step 3: Build sạch**

Run: `npm run build`
Expected: `dist/` được generate. Kiểm tra:

```bash
head -1 dist/index.mjs
head -1 dist/Whiteboard.mjs
```

Expected: cả 2 file đầu dòng là `"use client";` (postbuild script `scripts/inject-use-client.mjs` đã chạy).

- [ ] **Step 4: Manual smoke (optional, nếu có consumer app sẵn)**

Trong consumer app `hoctotbachkhoa`:

```tsx
// apps/web/app/whiteboard/page.tsx
'use client';
import { Whiteboard } from '@xom11/whiteboard';
export default function Page() {
  return <div style={{ height: '100vh', width: '100vw' }}><Whiteboard /></div>;
}
```

Chạy dev, mở `/whiteboard`:
- Vẽ vài stroke + paste 1 ảnh + insert 1 geometry stamp + 1 LaTeX stamp
- Pan + zoom + đổi theme dark
- Reload trang → tất cả còn nguyên
- Đóng tab, mở lại → tất cả còn nguyên
- DevTools → Application → Local Storage → `whiteboard:scene:default` có data
- DevTools → IndexedDB → `whiteboard-files` → store `files` có entry của ảnh

- [ ] **Step 5: Commit (nếu có chỉnh sửa nhỏ trong manual smoke)**

```bash
# Nếu không có thay đổi: skip step này.
# Nếu có: git add ... && git commit -m "fix: ..."
```

- [ ] **Step 6: Bump version + push (theo workflow trong CLAUDE.md)**

```bash
npm run build
git add dist/
git commit -am "release: standalone whiteboard + reload persistence"
npm version minor      # 0.3.0 → 0.4.0 (breaking API change: bỏ role/remote*)
git push --follow-tags
```

Sau đó consumer (`hoctotbachkhoa`) update tag pin trong `package.json`:

```json
"@xom11/whiteboard": "github:xom11/whiteboard#v0.4.0"
```

---

## Acceptance Criteria (rút từ spec)

- [ ] `<Whiteboard />` render ở route /whiteboard, không cần prop bắt buộc.
- [ ] Vẽ + paste ảnh + 2 loại stamp + pan/zoom + dark theme → reload → còn nguyên.
- [ ] Đóng tab/browser, mở lại → còn nguyên.
- [ ] `<Whiteboard storageKey={null} />` không ghi localStorage / IDB (DevTools verify).
- [ ] `<Whiteboard readOnly />` không cho vẽ + không inject toolbar G/L.
- [ ] `npm test` pass — sceneStore (7) + fileStore (5) + Whiteboard (7) + tests cũ vẫn pass.
- [ ] `npm run typecheck` 0 errors.
- [ ] `npm run build` clean, `dist/Whiteboard.mjs` có `"use client"` prefix.
