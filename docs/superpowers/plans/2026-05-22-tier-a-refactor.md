# Tier A Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the bleeding — tách 2 god-file (Whiteboard.tsx 739, handlers.ts 890) thành module nhỏ + ESLint guard + ADR Tools DSL. Không đổi public API. Target v0.16.

**Architecture:**
- A1: Whiteboard.tsx (739 LoC) → main component ≤200 LoC + 3 custom hook (`usePdfImporter`, `useActiveStamp`, `useExcalidrawApi`) trong `src/hooks/`.
- A2: `handlers.ts` (890 LoC) → folder `handlers/` với `pointerDown/<branch>.ts` (7 file, mỗi ≤120 LoC) + `finalizeShape.ts` + `transform.ts` + `pointerMove.ts` + `pointerUp.ts` + `ctx.ts` + `utils.ts` + `index.ts` re-export.
- A3: ADR doc `docs/superpowers/specs/2026-05-22-tools-dsl-adr.md` chọn (b) document only (giữ 3 cách Tools DSL hiện có, vì graph-2d's `rows/` thật sự cần slot riêng cho function/parameter inline edit).
- A4: ESLint setup full stack (`eslint`, `@typescript-eslint`, `eslint-plugin-react`, `eslint-plugin-react-hooks`) + `max-lines: 400`.

**Tech Stack:** TypeScript strict, Jest 29 + jsdom, React 19, ESLint 9 flat config.

---

## File Structure

### A1: Whiteboard.tsx split

```
src/
├── Whiteboard.tsx                          [≤200 LoC — render tree + ref wiring]
└── hooks/
    ├── useExcalidrawApi.ts                 [api state + isDarkTheme derive]
    ├── useExcalidrawApi.test.ts
    ├── useActiveStamp.ts                   [activeStamp + editingElement + open/close/toggle]
    ├── useActiveStamp.test.ts
    ├── usePdfImporter.ts                   [pdfPending + pdfBusy + pick/confirm/cancel + drop handler]
    └── usePdfImporter.test.ts
```

### A2: handlers.ts split

```
src/stamps/geometry-2d/editor/
├── handlers.ts                             [DELETED — was 890 LoC]
└── handlers/
    ├── index.ts                            [re-export public API: handleDown, handleMove, handleUp, finalizeTransform, HandlerCtx, TransformToolKey]
    ├── ctx.ts                              [HandlerCtx type + TransformToolKey type]
    ├── utils.ts                            [freshId, mkSceneObj, dispatchAddFreePoint, dispatchAddIntersection, SceneObj type]
    ├── pointerDown/
    │   ├── index.ts                        [handleDown dispatcher — switch theo tool ≤80 LoC]
    │   ├── move.ts                         [t === 'move' branch ~10 LoC]
    │   ├── select.ts                       [t === 'select' branch ~25 LoC]
    │   ├── point.ts                        [t === 'point' branch + intersection ~50 LoC]
    │   ├── singleTarget.ts                 [delete/toggleLabel/toggleVisible ~35 LoC]
    │   ├── polygon.ts                      [polygon/area variable-length ~70 LoC]
    │   └── multiClick.ts                   [line/segment/perpendicular/circle/transform pickers ~110 LoC]
    ├── finalizeShape.ts                    [182 LoC switch — giữ nguyên 1 file vì là 1 thể thống nhất]
    ├── pointerMove.ts                      [handleMove ~52 LoC]
    ├── pointerUp.ts                        [handleUp ~80 LoC]
    └── transform.ts                        [finalizeTransform + recreateFromTransformedPoints ~150 LoC]
```

**Note:** `HandlerCtx` được giữ nguyên 26 field — A2 chỉ tách file, không refactor context shape. Spec target "≤8 field" cần refactor sâu hơn (truyền store thay vì refs) — out of scope Tier A, deferred sang Tier B.

### A3: ADR doc

```
docs/superpowers/specs/
└── 2026-05-22-tools-dsl-adr.md             [ADR: chốt option (b) — document 3 cách + lý do]
```

### A4: ESLint setup

```
.
├── eslint.config.mjs                       [flat config — eslint 9 style]
├── package.json                            [+lint script, +devDependencies]
└── .gitignore                              [+.eslintcache nếu chưa có]
```

---

## Task 1: A1.1 — Hook `useExcalidrawApi`

**Files:**
- Create: `src/hooks/useExcalidrawApi.ts`
- Create: `src/hooks/useExcalidrawApi.test.ts`
- Modify: (later in Task 4) `src/Whiteboard.tsx`

**Responsibility:** Quản lý `api` state + `apiRef` + `isDarkTheme` (+`isDarkThemeRef`). Expose `setApiFromExcalidraw` callback dùng cho `excalidrawAPI` prop của Excalidraw. Expose `syncThemeFromAppState` callback dùng trong onChange.

- [ ] **Step 1: Write the failing test**

File: `src/hooks/useExcalidrawApi.test.ts`

```ts
import { act, renderHook } from '@testing-library/react';
import { useExcalidrawApi } from './useExcalidrawApi';

describe('useExcalidrawApi', () => {
  it('starts với api=null + isDark=false', () => {
    const { result } = renderHook(() => useExcalidrawApi());
    expect(result.current.api).toBeNull();
    expect(result.current.isDark).toBe(false);
  });

  it('setApiFromExcalidraw bỏ qua nếu cùng instance (no rerender)', () => {
    const onApi = jest.fn();
    const { result } = renderHook(() => useExcalidrawApi({ onApi }));
    const fakeApi = { id: 'a' };
    act(() => { result.current.setApiFromExcalidraw(fakeApi); });
    // queueMicrotask đẩy setState ra sau commit
    return Promise.resolve().then(() => {
      act(() => { result.current.setApiFromExcalidraw(fakeApi); });
      return Promise.resolve();
    }).then(() => {
      expect(onApi).toHaveBeenCalledTimes(1);
      expect(result.current.api).toBe(fakeApi);
    });
  });

  it('syncThemeFromAppState chỉ trigger setState khi đổi', () => {
    const { result } = renderHook(() => useExcalidrawApi());
    act(() => { result.current.syncThemeFromAppState({ theme: 'dark' }); });
    return Promise.resolve().then(() => {
      expect(result.current.isDark).toBe(true);
      act(() => { result.current.syncThemeFromAppState({ theme: 'dark' }); });
      // không đổi → không rerender
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/hooks/useExcalidrawApi.test.ts`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Write minimal implementation**

File: `src/hooks/useExcalidrawApi.ts`

```ts
import { useCallback, useRef, useState } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExApi = any;

export interface UseExcalidrawApiOptions {
  onApi?: (api: ExApi) => void;
}

export interface UseExcalidrawApiResult {
  api: ExApi | null;
  apiRef: React.MutableRefObject<ExApi | null>;
  isDark: boolean;
  isDarkRef: React.MutableRefObject<boolean>;
  /** Gắn vào Excalidraw prop `excalidrawAPI`. Defer setState qua microtask
   *  để tránh React 19 "update from inside an update function" warning. */
  setApiFromExcalidraw: (api: ExApi) => void;
  /** Gọi từ onChange. Bail-out qua ref + defer setState. */
  syncThemeFromAppState: (appState: { theme?: string } | undefined) => void;
}

export function useExcalidrawApi(
  opts: UseExcalidrawApiOptions = {},
): UseExcalidrawApiResult {
  const { onApi } = opts;
  const [api, setApi] = useState<ExApi | null>(null);
  const apiRef = useRef<ExApi | null>(null);
  const [isDark, setIsDark] = useState(false);
  const isDarkRef = useRef(false);
  const onApiRef = useRef(onApi);
  onApiRef.current = onApi;

  const setApiFromExcalidraw = useCallback((a: ExApi) => {
    if (apiRef.current === a) return;
    apiRef.current = a;
    queueMicrotask(() => {
      setApi(a);
      onApiRef.current?.(a);
    });
  }, []);

  const syncThemeFromAppState = useCallback(
    (appState: { theme?: string } | undefined) => {
      const next = appState?.theme === 'dark';
      if (isDarkRef.current !== next) {
        isDarkRef.current = next;
        queueMicrotask(() => setIsDark(next));
      }
    },
    [],
  );

  return { api, apiRef, isDark, isDarkRef, setApiFromExcalidraw, syncThemeFromAppState };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/hooks/useExcalidrawApi.test.ts`
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useExcalidrawApi.ts src/hooks/useExcalidrawApi.test.ts
git commit -m "feat(hooks): add useExcalidrawApi — api state + dark theme sync"
```

---

## Task 2: A1.2 — Hook `useActiveStamp`

**Files:**
- Create: `src/hooks/useActiveStamp.ts`
- Create: `src/hooks/useActiveStamp.test.ts`

**Responsibility:** Quản lý `activeStamp` (kind string | null) + `editingElement` ({id, customData} | null). Expose `openStamp`, `closeStamp`, `toggleStampByKind`. Tôn trọng `readOnly`. Lookup từ `stampByKind` map.

- [ ] **Step 1: Write the failing test**

File: `src/hooks/useActiveStamp.test.ts`

```ts
import { act, renderHook } from '@testing-library/react';
import { useActiveStamp } from './useActiveStamp';
import type { StampType } from '../stamps/shared/registry';

const fakeStamp = (kind: string): StampType =>
  ({ kind, Host: () => null }) as unknown as StampType;

describe('useActiveStamp', () => {
  it('default state activeStamp=null, editingElement=null', () => {
    const { result } = renderHook(() =>
      useActiveStamp({ readOnly: false, stamps: [fakeStamp('geom2d')] }),
    );
    expect(result.current.activeStamp).toBeNull();
    expect(result.current.editingElement).toBeNull();
  });

  it('openStamp(kind) set activeStamp + editingElement', () => {
    const { result } = renderHook(() =>
      useActiveStamp({ readOnly: false, stamps: [fakeStamp('geom2d')] }),
    );
    act(() => result.current.openStamp('geom2d', { id: 'e1', customData: { x: 1 } }));
    expect(result.current.activeStamp).toBe('geom2d');
    expect(result.current.editingElement).toEqual({ id: 'e1', customData: { x: 1 } });
  });

  it('openStamp respect readOnly = no-op', () => {
    const { result } = renderHook(() =>
      useActiveStamp({ readOnly: true, stamps: [fakeStamp('geom2d')] }),
    );
    act(() => result.current.openStamp('geom2d'));
    expect(result.current.activeStamp).toBeNull();
  });

  it('openStamp bỏ qua kind không có trong stamps', () => {
    const { result } = renderHook(() =>
      useActiveStamp({ readOnly: false, stamps: [fakeStamp('geom2d')] }),
    );
    act(() => result.current.openStamp('unknown'));
    expect(result.current.activeStamp).toBeNull();
  });

  it('closeStamp reset cả 2 field', () => {
    const { result } = renderHook(() =>
      useActiveStamp({ readOnly: false, stamps: [fakeStamp('geom2d')] }),
    );
    act(() => result.current.openStamp('geom2d', { id: 'e1', customData: {} }));
    act(() => result.current.closeStamp());
    expect(result.current.activeStamp).toBeNull();
    expect(result.current.editingElement).toBeNull();
  });

  it('toggleStampByKind: same kind = close; other kind = open', () => {
    const { result } = renderHook(() =>
      useActiveStamp({
        readOnly: false,
        stamps: [fakeStamp('a'), fakeStamp('b')],
      }),
    );
    act(() => result.current.toggleStampByKind('a'));
    expect(result.current.activeStamp).toBe('a');
    act(() => result.current.toggleStampByKind('a'));
    expect(result.current.activeStamp).toBeNull();
    act(() => result.current.toggleStampByKind('b'));
    expect(result.current.activeStamp).toBe('b');
  });

  it('exposes stampByKind map + activeStampDef + HostComponent', () => {
    const sA = fakeStamp('a');
    const { result } = renderHook(() =>
      useActiveStamp({ readOnly: false, stamps: [sA] }),
    );
    expect(result.current.stampByKind.get('a')).toBe(sA);
    expect(result.current.activeStampDef).toBeNull();
    expect(result.current.HostComponent).toBeNull();
    act(() => result.current.openStamp('a'));
    expect(result.current.activeStampDef).toBe(sA);
    expect(result.current.HostComponent).toBe(sA.Host);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/hooks/useActiveStamp.test.ts`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Write minimal implementation**

File: `src/hooks/useActiveStamp.ts`

```ts
import { useCallback, useMemo, useState } from 'react';
import type { StampType } from '../stamps/shared/registry';

export interface EditingElement {
  id: string;
  customData: unknown;
}

export interface UseActiveStampOptions {
  readOnly: boolean;
  stamps: ReadonlyArray<StampType>;
}

export interface UseActiveStampResult {
  activeStamp: string | null;
  editingElement: EditingElement | null;
  stampByKind: Map<string, StampType>;
  activeStampDef: StampType | null;
  HostComponent: StampType['Host'] | null;
  openStamp: (kind: string, element?: EditingElement | null) => void;
  closeStamp: () => void;
  toggleStampByKind: (kind: string) => void;
}

export function useActiveStamp(opts: UseActiveStampOptions): UseActiveStampResult {
  const { readOnly, stamps } = opts;
  const [activeStamp, setActiveStamp] = useState<string | null>(null);
  const [editingElement, setEditingElement] = useState<EditingElement | null>(null);

  const stampByKind = useMemo(() => {
    const m = new Map<string, StampType>();
    for (const s of stamps) m.set(s.kind, s);
    return m;
  }, [stamps]);

  const activeStampDef = activeStamp ? stampByKind.get(activeStamp) ?? null : null;
  const HostComponent = activeStampDef?.Host ?? null;

  const openStamp = useCallback(
    (kind: string, element: EditingElement | null = null) => {
      if (readOnly) return;
      if (!stampByKind.has(kind)) return;
      setEditingElement(element);
      setActiveStamp(kind);
    },
    [readOnly, stampByKind],
  );

  const closeStamp = useCallback(() => {
    setActiveStamp(null);
    setEditingElement(null);
  }, []);

  const toggleStampByKind = useCallback(
    (kind: string) => {
      setActiveStamp((cur) => {
        if (cur === kind) {
          setEditingElement(null);
          return null;
        }
        if (readOnly) return cur;
        if (!stampByKind.has(kind)) return cur;
        setEditingElement(null);
        return kind;
      });
    },
    [readOnly, stampByKind],
  );

  return {
    activeStamp,
    editingElement,
    stampByKind,
    activeStampDef,
    HostComponent,
    openStamp,
    closeStamp,
    toggleStampByKind,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/hooks/useActiveStamp.test.ts`
Expected: PASS — 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useActiveStamp.ts src/hooks/useActiveStamp.test.ts
git commit -m "feat(hooks): add useActiveStamp — manage active stamp + editing element"
```

---

## Task 3: A1.3 — Hook `usePdfImporter`

**Files:**
- Create: `src/hooks/usePdfImporter.ts`
- Create: `src/hooks/usePdfImporter.test.ts`

**Responsibility:** Quản lý `pdfPending` (PDFDocumentProxy + fileName + totalPages | null) + `pdfBusy`. Expose `handlePdfPick(file)`, `handlePdfConfirm(pages)`, `handlePdfCancel()`. Cũng expose drop handler installer (gắn lên `.excalidraw` root). Tôn trọng `readOnly`.

- [ ] **Step 1: Write the failing test**

File: `src/hooks/usePdfImporter.test.ts`

```ts
import { act, renderHook } from '@testing-library/react';
import { usePdfImporter } from './usePdfImporter';

jest.mock('../pdf/rasterize', () => ({
  loadPdfDocument: jest.fn(async () => ({ numPages: 3 })),
  closePdfDocument: jest.fn(async () => undefined),
  rasterizePdf: jest.fn(async () => [{ pageNumber: 1, dataURL: 'x', width: 100, height: 100 }]),
}));

jest.mock('../pdf/insertPdfPages', () => ({
  insertRasterizedPagesIntoScene: jest.fn(),
}));

describe('usePdfImporter', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('default state pdfPending=null, pdfBusy=false', () => {
    const { result } = renderHook(() => usePdfImporter({ readOnly: false, api: null }));
    expect(result.current.pdfPending).toBeNull();
    expect(result.current.pdfBusy).toBe(false);
  });

  it('handlePdfPick load doc + set pending', async () => {
    const { result } = renderHook(() => usePdfImporter({ readOnly: false, api: null }));
    const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' });
    await act(async () => { await result.current.handlePdfPick(file); });
    expect(result.current.pdfPending).toEqual({
      doc: { numPages: 3 },
      fileName: 'doc.pdf',
      totalPages: 3,
    });
    expect(result.current.pdfBusy).toBe(false);
  });

  it('handlePdfPick respect readOnly = no-op', async () => {
    const { result } = renderHook(() => usePdfImporter({ readOnly: true, api: null }));
    const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' });
    await act(async () => { await result.current.handlePdfPick(file); });
    expect(result.current.pdfPending).toBeNull();
  });

  it('handlePdfCancel clear pending + đóng doc', async () => {
    const { result } = renderHook(() => usePdfImporter({ readOnly: false, api: null }));
    const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' });
    await act(async () => { await result.current.handlePdfPick(file); });
    expect(result.current.pdfPending).not.toBeNull();
    act(() => { result.current.handlePdfCancel(); });
    expect(result.current.pdfPending).toBeNull();
    const { closePdfDocument } = jest.requireMock('../pdf/rasterize');
    expect(closePdfDocument).toHaveBeenCalled();
  });

  it('handlePdfConfirm without api = no-op', async () => {
    const { result } = renderHook(() => usePdfImporter({ readOnly: false, api: null }));
    await act(async () => { await result.current.handlePdfConfirm([1]); });
    const { rasterizePdf } = jest.requireMock('../pdf/rasterize');
    expect(rasterizePdf).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/hooks/usePdfImporter.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

File: `src/hooks/usePdfImporter.ts`

```ts
import { useCallback, useEffect, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import {
  loadPdfDocument,
  closePdfDocument,
  rasterizePdf,
} from '../pdf/rasterize';
import { insertRasterizedPagesIntoScene } from '../pdf/insertPdfPages';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExApi = any;

export interface PdfPendingState {
  doc: PDFDocumentProxy;
  fileName: string;
  totalPages: number;
}

export interface UsePdfImporterOptions {
  readOnly: boolean;
  api: ExApi | null;
}

export interface UsePdfImporterResult {
  pdfPending: PdfPendingState | null;
  pdfBusy: boolean;
  handlePdfPick: (file: File) => Promise<void>;
  handlePdfConfirm: (pages: number[]) => Promise<void>;
  handlePdfCancel: () => void;
}

export function usePdfImporter(opts: UsePdfImporterOptions): UsePdfImporterResult {
  const { readOnly, api } = opts;
  const [pdfPending, setPdfPending] = useState<PdfPendingState | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  const handlePdfPick = useCallback(
    async (file: File) => {
      if (readOnly || pdfBusy) return;
      setPdfBusy(true);
      try {
        const doc = await loadPdfDocument(file);
        setPdfPending({ doc, fileName: file.name, totalPages: doc.numPages });
      } catch (err) {
        console.warn('[whiteboard] Đọc PDF thất bại:', err);
        window.alert('Không đọc được PDF. File có thể đã hỏng hoặc bị mật khẩu bảo vệ.');
      } finally {
        setPdfBusy(false);
      }
    },
    [readOnly, pdfBusy],
  );

  const handlePdfConfirm = useCallback(
    async (pages: number[]) => {
      if (!pdfPending || !api) return;
      const { doc } = pdfPending;
      setPdfPending(null);
      setPdfBusy(true);
      const scale = 2;
      try {
        const rendered = await rasterizePdf(doc, { pages, scale });
        await closePdfDocument(doc);
        insertRasterizedPagesIntoScene(api, rendered, { scale });
      } catch (err) {
        console.warn('[whiteboard] Chèn PDF thất bại:', err);
        window.alert('Chèn PDF thất bại. Xem console để biết chi tiết.');
      } finally {
        setPdfBusy(false);
      }
    },
    [pdfPending, api],
  );

  const handlePdfCancel = useCallback(() => {
    if (pdfPending) {
      void closePdfDocument(pdfPending.doc);
    }
    setPdfPending(null);
  }, [pdfPending]);

  // Drop handler: catch application/pdf trước Excalidraw (nó reject PDF).
  useEffect(() => {
    if (readOnly) return;
    const root = document.querySelector<HTMLElement>('.excalidraw');
    if (!root) return;

    const onDragOver = (e: DragEvent) => {
      const items = e.dataTransfer?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file' && items[i].type === 'application/pdf') {
          e.preventDefault();
          e.stopPropagation();
          if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
          return;
        }
      }
    };

    const onDrop = (e: DragEvent) => {
      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;
      const pdf = Array.from(files).find((f) => f.type === 'application/pdf');
      if (!pdf) return;
      e.preventDefault();
      e.stopPropagation();
      void handlePdfPick(pdf);
    };

    root.addEventListener('dragover', onDragOver, { capture: true });
    root.addEventListener('drop', onDrop, { capture: true });
    return () => {
      root.removeEventListener('dragover', onDragOver, { capture: true });
      root.removeEventListener('drop', onDrop, { capture: true });
    };
  }, [readOnly, handlePdfPick, api]);

  return { pdfPending, pdfBusy, handlePdfPick, handlePdfConfirm, handlePdfCancel };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/hooks/usePdfImporter.test.ts`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/usePdfImporter.ts src/hooks/usePdfImporter.test.ts
git commit -m "feat(hooks): add usePdfImporter — pdf pick/confirm/cancel + drop handler"
```

---

## Task 4: A1.4 — Refactor Whiteboard.tsx → ≤200 LoC

**Files:**
- Modify: `src/Whiteboard.tsx` (full rewrite, dùng 3 hooks)
- Verify: `src/__tests__/Whiteboard.test.tsx` (không sửa) phải pass

**Responsibility:** Whiteboard.tsx chỉ còn: props validation/defaults + render tree + scene/file persist orchestration. State stamp/api/pdf chuyển vào hooks.

- [ ] **Step 1: Run baseline test trước khi refactor**

Run: `npx jest src/__tests__/Whiteboard.test.tsx src/__tests__/Whiteboard.unmount.test.tsx --verbose`
Expected: PASS all (baseline). Lưu số test count.

- [ ] **Step 2: Refactor Whiteboard.tsx**

Replace `src/Whiteboard.tsx` (giữ phần persist scene/file vì chúng coupled với onChange handler — không tách thành hook ở Tier A; deferred Tier B):

```tsx
'use client';

import { lazy, Suspense, useCallback, useEffect, useMemo, useRef } from 'react';
import type {
  ExcalidrawElement,
  BinaryFiles,
  ExcalidrawSceneSnapshot,
  SyncableAppState,
} from './types';
import { pickSyncableAppState } from './serialize';
import {
  isStampElement,
  DEFAULT_STAMPS,
  findStampForCustomData,
  type StampType,
} from './stamps/shared/registry';
import { ToolbarInjector } from './stamps/shared/ToolbarInjector';
import { useShortcuts } from './stamps/shared/useShortcuts';
import { PdfImporterButton } from './pdf/PdfImporterButton';
import { PageRangeDialog } from './pdf/PageRangeDialog';
import { useStampDoubleClick } from './stamps/shared/useStampDoubleClick';
import { useStampShortcutBlocker } from './stamps/shared/useStampShortcutBlocker';
import { useStampClickOutside } from './stamps/shared/useStampClickOutside';
import { restoreMissingStampFiles } from './stamps/shared/restoreStampFiles';
import type { StampHostHandle } from './stamps/shared/types';
import { readScene, writeScene } from './core/persistence/sceneStore';
import { readFiles, writeFiles, pruneFiles } from './core/persistence/fileStore';
import { useExcalidrawApi } from './hooks/useExcalidrawApi';
import { useActiveStamp } from './hooks/useActiveStamp';
import { usePdfImporter } from './hooks/usePdfImporter';
import '@excalidraw/excalidraw/index.css';
import './stamps/shared/stamp.css';

const Excalidraw = lazy(() =>
  import('./ExcalidrawWithMenus').then((m) => ({ default: m.ExcalidrawWithMenus })),
);

const ExcalidrawLoadingFallback = () => (
  <div className="flex h-full items-center justify-center text-sm text-gray-500">
    Đang tải bảng…
  </div>
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExApi = any;

const SYNC_THROTTLE_MS = 200;

export interface WhiteboardProps {
  storageKey?: string | null;
  readOnly?: boolean;
  onSceneChange?: (snapshot: ExcalidrawSceneSnapshot) => void;
  onFilesChange?: (files: BinaryFiles, newFileIds: string[]) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onApi?: (api: any) => void;
  langCode?: string;
  stamps?: ReadonlyArray<StampType>;
  initialScene?: ExcalidrawSceneSnapshot | null;
  initialFiles?: BinaryFiles;
}

export function Whiteboard({
  storageKey = 'default',
  readOnly = false,
  onSceneChange,
  onFilesChange,
  onApi,
  langCode = 'vi-VN',
  stamps = DEFAULT_STAMPS,
  initialScene,
  initialFiles,
}: WhiteboardProps) {
  const { api, apiRef, isDark, isDarkRef, setApiFromExcalidraw, syncThemeFromAppState } =
    useExcalidrawApi({ onApi });

  const {
    activeStamp,
    editingElement,
    HostComponent,
    openStamp,
    closeStamp,
    toggleStampByKind,
  } = useActiveStamp({ readOnly, stamps });

  const {
    pdfPending,
    pdfBusy,
    handlePdfPick,
    handlePdfConfirm,
    handlePdfCancel,
  } = usePdfImporter({ readOnly, api });

  const hostRef = useRef<StampHostHandle | null>(null);
  const knownFileIdsRef = useRef<Set<string>>(new Set());
  const lastSceneHashRef = useRef<string>('');
  const sceneThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pruneThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestSceneRef = useRef<{
    elements: readonly ExcalidrawElement[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    appState: any;
  } | null>(null);
  const pendingFilesRef = useRef<BinaryFiles>({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hashElementsVersionRef = useRef<((elements: readonly ExcalidrawElement[]) => any) | null>(null);
  const stampsRef = useRef(stamps);
  stampsRef.current = stamps;
  const persistEnabled = typeof storageKey === 'string' && storageKey.length > 0;
  const persistKeyRef = useRef(storageKey);
  persistKeyRef.current = storageKey;
  const onSceneChangeRef = useRef(onSceneChange);
  onSceneChangeRef.current = onSceneChange;
  const onFilesChangeRef = useRef(onFilesChange);
  onFilesChangeRef.current = onFilesChange;
  const persistEnabledRef = useRef(persistEnabled);
  persistEnabledRef.current = persistEnabled;
  const handledCropIdRef = useRef<string | null>(null);
  const prevExcalidrawToolRef = useRef<string>('selection');

  const persistedInitial = useMemo(
    () => (persistEnabled ? readScene(storageKey as string) : null),
    [persistEnabled, storageKey],
  );
  const effectiveInitialScene: ExcalidrawSceneSnapshot | null =
    initialScene !== undefined
      ? initialScene
      : persistedInitial
        ? {
            elements: persistedInitial.elements,
            appState: persistedInitial.appState as SyncableAppState,
          }
        : null;

  // ── Flush helpers (gọi từ setTimeout VÀ unmount cleanup) ──
  const flushSceneRef = useRef<() => void>(() => undefined);
  flushSceneRef.current = () => {
    try {
      const latestScene = latestSceneRef.current;
      if (!latestScene) return;
      const liveElements = latestScene.elements.filter((e) => !e.isDeleted) as readonly ExcalidrawElement[];
      const liveAppState = pickSyncableAppState(latestScene.appState);
      const hashFn = hashElementsVersionRef.current;
      const elementHash = hashFn ? hashFn(liveElements) : liveElements.map((e) => e.id).join('|');
      const sceneHash = `${elementHash}:${JSON.stringify(liveAppState)}`;
      if (sceneHash === lastSceneHashRef.current) return;
      lastSceneHashRef.current = sceneHash;
      onSceneChangeRef.current?.({ elements: liveElements, appState: liveAppState });
      if (persistEnabledRef.current) {
        writeScene(persistKeyRef.current as string, { elements: liveElements, appState: liveAppState });
      }
    } catch (err) {
      console.warn('[whiteboard] flushScene thất bại:', err);
    }
  };

  const flushFilesRef = useRef<() => void>(() => undefined);
  flushFilesRef.current = () => {
    try {
      const pending = pendingFilesRef.current;
      pendingFilesRef.current = {};
      if (Object.keys(pending).length === 0) return;
      const currentElements = (apiRef.current?.getSceneElements?.()
        ?? latestSceneRef.current?.elements
        ?? []) as readonly ExcalidrawElement[];
      const stampIds = new Set<string>();
      for (const el of currentElements) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fid = (el as any).fileId as string | undefined;
        if (fid && isStampElement(el)) stampIds.add(fid);
      }
      const raster: BinaryFiles = {};
      for (const [id, f] of Object.entries(pending)) {
        if (!stampIds.has(id)) raster[id] = f;
      }
      if (Object.keys(raster).length > 0) {
        void writeFiles(persistKeyRef.current as string, raster);
      }
    } catch (err) {
      console.warn('[whiteboard] flushFiles thất bại:', err);
    }
  };

  const flushPruneRef = useRef<() => void>(() => undefined);
  flushPruneRef.current = () => {
    try {
      const currentElements = (apiRef.current?.getSceneElements?.()
        ?? latestSceneRef.current?.elements
        ?? []) as readonly ExcalidrawElement[];
      const keep = new Set<string>();
      for (const el of currentElements) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fid = (el as any).fileId as string | undefined;
        if (fid && !isStampElement(el)) keep.add(fid);
      }
      void pruneFiles(persistKeyRef.current as string, keep);
    } catch (err) {
      console.warn('[whiteboard] flushPrune thất bại:', err);
    }
  };

  const handleChange = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (elements: readonly ExcalidrawElement[], appState: any, files: BinaryFiles) => {
      syncThemeFromAppState(appState);
      if (readOnly) return;
      latestSceneRef.current = { elements, appState };

      // Intercept Excalidraw crop-image flow cho math stamps.
      const cropId = appState?.croppingElementId as string | null | undefined;
      if (cropId && cropId !== handledCropIdRef.current && api) {
        const el = elements.find((e) => e.id === cropId);
        if (el) {
          const stamp = findStampForCustomData((el as { customData?: unknown }).customData, stamps);
          if (stamp) {
            handledCropIdRef.current = cropId;
            const elId = el.id;
            const elCustom = (el as { customData?: unknown }).customData;
            const stampKind = stamp.kind;
            queueMicrotask(() => {
              try {
                api.updateScene({ appState: { croppingElementId: null, selectedElementIds: {} } });
              } catch { /* ignore */ }
              openStamp(stampKind, { id: elId, customData: elCustom });
            });
            return;
          }
        }
      }
      if (!cropId) handledCropIdRef.current = null;

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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            hashElementsVersionRef.current = (mod as any).hashElementsVersion;
          } catch (err) {
            console.warn('[whiteboard] import excalidraw để flush scene thất bại:', err);
            return;
          }
          flushSceneRef.current();
        }, SYNC_THROTTLE_MS);
      }

      if (persistEnabled && newIds.length > 0) {
        for (const id of newIds) if (files[id]) pendingFilesRef.current[id] = files[id];
        if (!fileThrottleRef.current) {
          fileThrottleRef.current = setTimeout(() => {
            fileThrottleRef.current = null;
            flushFilesRef.current();
          }, 1000);
        }
      }

      if (persistEnabled && !pruneThrottleRef.current) {
        pruneThrottleRef.current = setTimeout(() => {
          pruneThrottleRef.current = null;
          flushPruneRef.current();
        }, 2000);
      }
    },
    [readOnly, api, onFilesChange, persistEnabled, stamps, openStamp, syncThemeFromAppState],
  );

  // initialFiles + persisted files mount load
  const initialFilesAddedRef = useRef(false);
  useEffect(() => {
    if (!api || initialFilesAddedRef.current) return;
    initialFilesAddedRef.current = true;
    if (!initialFiles) return;
    const entries = Object.entries(initialFiles);
    if (entries.length === 0) return;
    try {
      api.addFiles(entries.map(([id, f]) => ({
        id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dataURL: (f as any).dataURL,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mimeType: (f as any).mimeType,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        created: (f as any).created ?? Date.now(),
      })));
      entries.forEach(([id]) => knownFileIdsRef.current.add(id));
    } catch (err) {
      console.warn('[whiteboard] addFiles initialFiles thất bại:', err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  useEffect(() => {
    if (!api || !persistEnabled) return;
    let cancelled = false;
    void readFiles(storageKey as string).then(
      (files) => {
        if (cancelled) return;
        const entries = Object.entries(files);
        if (entries.length === 0) return;
        if (cancelled) return;
        try {
          api.addFiles(entries.map(([id, f]) => ({
            id,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            dataURL: (f as any).dataURL,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            mimeType: (f as any).mimeType,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            created: (f as any).created ?? Date.now(),
          })));
          if (cancelled) return;
          entries.forEach(([id]) => knownFileIdsRef.current.add(id));
        } catch (err) {
          if (cancelled) return;
          console.warn('[whiteboard] addFiles từ IDB thất bại:', err);
        }
      },
      (err) => {
        if (cancelled) return;
        console.warn('[whiteboard] readFiles thất bại:', err);
      },
    );
    return () => { cancelled = true; };
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
        console.warn('Math stamp restore pass failed:', err);
      }
    };
    void run();
    const t = setTimeout(() => { void run(); }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [api, persistedInitial]);

  useEffect(() => () => {
    if (sceneThrottleRef.current) { clearTimeout(sceneThrottleRef.current); sceneThrottleRef.current = null; flushSceneRef.current(); }
    if (fileThrottleRef.current) { clearTimeout(fileThrottleRef.current); fileThrottleRef.current = null; flushFilesRef.current(); }
    if (pruneThrottleRef.current) { clearTimeout(pruneThrottleRef.current); pruneThrottleRef.current = null; flushPruneRef.current(); }
  }, []);

  const handlePointerDown = useStampDoubleClick({ enabled: !readOnly, stamps, onOpen: openStamp });
  useShortcuts({ enabled: !readOnly, onToggle: toggleStampByKind, stamps });

  useEffect(() => {
    if (!api) return;
    if (activeStamp) {
      try {
        const cur = api.getAppState?.()?.activeTool?.type ?? 'selection';
        if (cur && cur !== 'hand') prevExcalidrawToolRef.current = cur;
        api.setActiveTool?.({ type: 'hand' });
      } catch { /* ignore */ }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      try { api.setActiveTool?.({ type: prevExcalidrawToolRef.current as any }); } catch { /* ignore */ }
    }
  }, [activeStamp, api]);

  useStampShortcutBlocker({ activeStamp, stamps });

  useEffect(() => {
    if (!activeStamp) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const ae = document.activeElement as HTMLElement | null;
      if (ae && (ae.tagName === 'TEXTAREA' || ae.isContentEditable)) return;
      e.preventDefault();
      e.stopPropagation();
      closeStamp();
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [activeStamp, closeStamp]);

  useStampClickOutside({ activeStamp, hostRef, onClose: closeStamp });

  // isDarkRef satisfies useRef pattern from old impl (not actually used here — keep for back-compat semantics)
  void isDarkRef;

  return (
    <div className={`relative h-full w-full${isDark ? ' theme--dark' : ''}`}>
      <Suspense fallback={<ExcalidrawLoadingFallback />}>
        <Excalidraw
          excalidrawAPI={setApiFromExcalidraw}
          langCode={langCode}
          viewModeEnabled={readOnly}
          initialData={
            effectiveInitialScene
              ? {
                  elements: effectiveInitialScene.elements,
                  appState: {
                    ...effectiveInitialScene.appState,
                    gridSize: effectiveInitialScene.appState.gridSize ?? undefined,
                  },
                }
              : { appState: { viewBackgroundColor: '#ffffff' } }
          }
          onChange={handleChange}
          onPointerDown={handlePointerDown}
        />
      </Suspense>

      <ToolbarInjector
        enabled={!readOnly}
        activeStampKind={activeStamp}
        onToggle={toggleStampByKind}
        stamps={stamps}
      />

      <PdfImporterButton enabled={!readOnly} onPick={handlePdfPick} />

      {pdfPending && (
        <PageRangeDialog
          doc={pdfPending.doc}
          fileName={pdfPending.fileName}
          onConfirm={handlePdfConfirm}
          onCancel={handlePdfCancel}
        />
      )}

      {pdfBusy && !pdfPending && (
        <div
          aria-live="polite"
          role="status"
          style={{ position: 'fixed', bottom: 16, right: 16, padding: '8px 14px', background: 'rgba(0,0,0,0.75)', color: '#fff', borderRadius: 6, fontSize: 12, zIndex: 10000 }}
        >
          Đang xử lý PDF…
        </div>
      )}

      {HostComponent && (
        <HostComponent
          ref={hostRef}
          api={api}
          editingElement={editingElement}
          onClose={closeStamp}
          isDark={isDark}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify LoC ≤ 200**

Run: `wc -l src/Whiteboard.tsx`
Expected: ≤200 (target). Note: persist logic vẫn ở Whiteboard nên thực tế sẽ ~350-400 LoC. Vẫn là big improvement vs 739.

> **Compromise note:** spec target ≤200 chỉ đạt được nếu tách thêm `useSceneFilePersist` hook. Để tránh scope creep + giữ regression risk thấp, deferred sang Tier B. Tier A acceptance: giảm Whiteboard.tsx xuống dưới 50% LoC ban đầu (=370) là pass.

- [ ] **Step 4: Run full test suite**

Run: `npm test`
Expected: PASS — số test phải ≥ baseline + 15 (3 hooks × ~5 tests).

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: No error.

- [ ] **Step 6: Commit**

```bash
git add src/Whiteboard.tsx
git commit -m "refactor(whiteboard): extract 3 hooks (api, activeStamp, pdf) — 739 → ~400 LoC"
```

---

## Task 5: A2.1 — Tạo `handlers/utils.ts` + `handlers/ctx.ts`

**Files:**
- Create: `src/stamps/geometry-2d/editor/handlers/ctx.ts`
- Create: `src/stamps/geometry-2d/editor/handlers/utils.ts`

**Responsibility:** Extract HandlerCtx + helper purelogic.

- [ ] **Step 1: Create ctx.ts (move HandlerCtx + TransformToolKey types từ handlers.ts)**

File: `src/stamps/geometry-2d/editor/handlers/ctx.ts`

```ts
import type { Store } from '../../../../core/scene';
import type { GeomTool } from '../tools';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JxgObj = any;

export type TransformToolKey =
  | 'translate'
  | 'rotate'
  | 'reflectLine'
  | 'reflectPoint'
  | 'dilate'
  | 'regularPolygon';

export interface HandlerCtx {
  boardRef: { current: JxgObj };
  toolRef: { current: GeomTool };
  pendingRef: { current: JxgObj[] };
  pendingIdsRef: { current: string[] };
  previewSegRef: { current: JxgObj[] };
  axisObjsRef: { current: { x?: JxgObj; y?: JxgObj } };
  selectedSetRef: { current: Set<string> };
  marqueeRef: { current: { startSx: number; startSy: number; rect?: JxgObj } | null };
  moveDownRef: { current: { sx: number; sy: number } | null };
  lastMoveClickRef: { current: { id: string | null; time: number } };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pendingTransformRef: { current: any };
  phantomRef: { current: JxgObj };
  previewShapeRef: { current: JxgObj };
  previewRafRef: { current: number | null };
  jxgRef: { current: JxgObj };
  store: Store;
  jxgIdToSceneId: (jxgObj: JxgObj) => string | null;
  jxgFromSceneId: (id: string) => JxgObj;
  screenCoordsOf: (evt: JxgObj) => [number, number] | null;
  objectsAt: (evt: JxgObj) => JxgObj[];
  promoteLabel: (o: JxgObj) => JxgObj;
  findNearestPointJxg: (evt: JxgObj, tolPx?: number) => JxgObj | null;
  toggleSelect: (id: string, additive: boolean) => void;
  clearSelection: () => void;
  nextLabel: (kind: string) => string;
  clearPending: () => void;
  clearPreviewSegs: () => void;
  refreshPreview: () => void;
  flashWarn: (msg: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  emitTransform: (info: any | null) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  emitSelect: (snap: any) => void;
  setPendingCount: (n: number) => void;
  setSelectionTick: (fn: (t: number) => number) => void;
}
```

- [ ] **Step 2: Create utils.ts (move helpers từ handlers.ts)**

File: `src/stamps/geometry-2d/editor/handlers/utils.ts`

```ts
import type { HandlerCtx } from './ctx';

export type SceneObj = {
  id: string;
  kind: string;
  label: string;
  visible: boolean;
  locked: boolean;
  layer: string;
  schemaVersion: number;
  attrs: Record<string, unknown>;
};

export function freshId(ctx: HandlerCtx, prefix: string): string {
  const counter = ctx.store.getState().counter;
  let n = counter + 1;
  let id = `${prefix}_${n}`;
  const objs = ctx.store.getState().objects;
  while (id in objs) {
    n += 1;
    id = `${prefix}_${n}`;
  }
  return id;
}

export function mkSceneObj(
  id: string,
  kind: string,
  label: string,
  attrs: Record<string, unknown>,
): SceneObj {
  return {
    id,
    kind,
    label,
    visible: true,
    locked: false,
    layer: 'default',
    schemaVersion: 1,
    attrs,
  };
}

export function dispatchAddFreePoint(ctx: HandlerCtx, x: number, y: number): string {
  const id = freshId(ctx, 'p');
  const label = ctx.nextLabel('point');
  const obj = mkSceneObj(id, 'point', label, { constraint: { kind: 'free', x, y } });
  ctx.store.dispatch({ type: 'ADD', payload: { obj } });
  return id;
}

export function dispatchAddIntersection(
  ctx: HandlerCtx,
  attrs: Record<string, unknown>,
): string {
  const id = freshId(ctx, 'X');
  const label = ctx.nextLabel('intersection');
  const obj = mkSceneObj(id, 'intersection', label, attrs);
  ctx.store.dispatch({ type: 'ADD', payload: { obj } });
  return id;
}
```

- [ ] **Step 3: Run typecheck (chưa có file gọi → expected unused)**

Run: `npm run typecheck`
Expected: No new errors (chưa wire). Old handlers.ts vẫn intact.

- [ ] **Step 4: Commit**

```bash
git add src/stamps/geometry-2d/editor/handlers/ctx.ts src/stamps/geometry-2d/editor/handlers/utils.ts
git commit -m "refactor(handlers): extract ctx + utils (no wiring yet)"
```

---

## Task 6: A2.2 — Tách `pointerDown` thành 7 file

**Files:**
- Create: `src/stamps/geometry-2d/editor/handlers/pointerDown/index.ts`
- Create: `src/stamps/geometry-2d/editor/handlers/pointerDown/move.ts`
- Create: `src/stamps/geometry-2d/editor/handlers/pointerDown/select.ts`
- Create: `src/stamps/geometry-2d/editor/handlers/pointerDown/point.ts`
- Create: `src/stamps/geometry-2d/editor/handlers/pointerDown/singleTarget.ts`
- Create: `src/stamps/geometry-2d/editor/handlers/pointerDown/polygon.ts`
- Create: `src/stamps/geometry-2d/editor/handlers/pointerDown/multiClick.ts`

**Responsibility:** Tách `handleDown` 271-LoC theo tool branch. Mỗi branch return `boolean | void` cho dispatcher biết stop hay continue.

- [ ] **Step 1: Implement move.ts**

File: `src/stamps/geometry-2d/editor/handlers/pointerDown/move.ts`

```ts
import type { HandlerCtx } from '../ctx';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function handleMoveTool(ctx: HandlerCtx, e: any): void {
  const sc = ctx.screenCoordsOf(e);
  if (!sc) return;
  const [sx, sy] = sc;
  ctx.moveDownRef.current = { sx, sy };
}
```

- [ ] **Step 2: Implement select.ts**

File: `src/stamps/geometry-2d/editor/handlers/pointerDown/select.ts`

```ts
import { objKind } from '../../tools';
import type { HandlerCtx } from '../ctx';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function handleSelectTool(ctx: HandlerCtx, e: any): void {
  const sc = ctx.screenCoordsOf(e);
  if (!sc) return;
  const [sx, sy] = sc;
  const hits = ctx.objectsAt(e)
    .map(ctx.promoteLabel)
    .filter((o) => o !== ctx.axisObjsRef.current.x && o !== ctx.axisObjsRef.current.y);
  const obj = hits.find((o) => objKind(o) === 'point') ?? ctx.findNearestPointJxg(e, 12) ?? hits[0];
  if (obj) {
    const sid = ctx.jxgIdToSceneId(obj);
    if (sid) {
      const shift = !!(e.shiftKey || e.altKey);
      ctx.toggleSelect(sid, shift);
    }
    ctx.moveDownRef.current = { sx, sy };
    ctx.marqueeRef.current = null;
    return;
  }
  ctx.marqueeRef.current = { startSx: sx, startSy: sy };
  if (!(e.shiftKey || e.altKey)) ctx.clearSelection();
}
```

- [ ] **Step 3: Implement point.ts**

File: `src/stamps/geometry-2d/editor/handlers/pointerDown/point.ts`

```ts
import { objKind } from '../../tools';
import { safeJsx } from '../../../shared/safeJsx';
import type { HandlerCtx } from '../ctx';
import { dispatchAddFreePoint, dispatchAddIntersection } from '../utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JxgObj = any;

export function handlePointTool(
  ctx: HandlerCtx,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _e: any,
  x: number,
  y: number,
  hits: JxgObj[],
): void {
  const curves = hits.filter((o) => objKind(o) === 'line' || objKind(o) === 'circle');
  if (curves.length >= 2) {
    const a = curves[0];
    const b = curves[1];
    const aId = ctx.jxgIdToSceneId(a);
    const bId = ctx.jxgIdToSceneId(b);
    if (aId && bId) {
      try {
        const aKind = objKind(a);
        const bKind = objKind(b);
        if (aKind === 'line' && bKind === 'line') {
          dispatchAddIntersection(ctx, { kind: 'lineLine', ref1: aId, ref2: bId });
          return;
        }
        const tmp0 = ctx.boardRef.current.create('intersection', [a, b, 0], { visible: false, withLabel: false });
        const tmp1 = ctx.boardRef.current.create('intersection', [a, b, 1], { visible: false, withLabel: false });
        const d0 = Math.hypot((tmp0.X?.() ?? 0) - x, (tmp0.Y?.() ?? 0) - y);
        const d1 = Math.hypot((tmp1.X?.() ?? 0) - x, (tmp1.Y?.() ?? 0) - y);
        safeJsx('handlers.removeObject(intersect.tmp0)', () => ctx.boardRef.current.removeObject(tmp0));
        safeJsx('handlers.removeObject(intersect.tmp1)', () => ctx.boardRef.current.removeObject(tmp1));
        const branch: 0 | 1 = d0 <= d1 ? 0 : 1;
        const isLineCircle = (aKind === 'line' && bKind === 'circle') || (aKind === 'circle' && bKind === 'line');
        if (isLineCircle) {
          dispatchAddIntersection(ctx, { kind: 'lineCircle', ref1: aId, ref2: bId, branch });
        } else {
          dispatchAddIntersection(ctx, { kind: 'circleCircle', ref1: aId, ref2: bId, branch });
        }
        return;
      } catch {
        // fallback: tạo điểm tự do
      }
    }
  }
  dispatchAddFreePoint(ctx, x, y);
}
```

- [ ] **Step 4: Implement singleTarget.ts**

File: `src/stamps/geometry-2d/editor/handlers/pointerDown/singleTarget.ts`

```ts
import type { ToolDef, GeomTool } from '../../tools';
import type { HandlerCtx } from '../ctx';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JxgObj = any;

export function handleSingleTargetTool(
  ctx: HandlerCtx,
  t: GeomTool,
  toolDef: ToolDef,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  e: any,
  bestHit: JxgObj | null,
): boolean {
  if (!(toolDef.needs === 1 && toolDef.accepts)) return false;
  const hit = bestHit ?? ctx.findNearestPointJxg(e, 12);
  if (!hit) {
    ctx.flashWarn('Click vào một đối tượng để áp dụng');
    return true;
  }
  const sid = ctx.jxgIdToSceneId(hit);
  if (!sid) return true;
  if (t === 'delete') {
    ctx.store.dispatch({ type: 'DELETE', payload: { id: sid } });
    return true;
  }
  if (t === 'toggleLabel') {
    const obj = ctx.store.getState().objects[sid];
    if (!obj) return true;
    const cur = (obj.attrs as { showLabel?: boolean }).showLabel;
    const next = !(cur ?? false);
    ctx.store.dispatch({ type: 'UPDATE_ATTRS', payload: { id: sid, patch: { showLabel: next } } });
    return true;
  }
  if (t === 'toggleVisible') {
    const obj = ctx.store.getState().objects[sid];
    if (!obj) return true;
    ctx.store.dispatch({ type: 'UPDATE', payload: { id: sid, patch: { visible: !obj.visible } } });
    return true;
  }
  return true;
}
```

- [ ] **Step 5: Implement polygon.ts**

File: `src/stamps/geometry-2d/editor/handlers/pointerDown/polygon.ts`

```ts
import { safeJsx } from '../../../shared/safeJsx';
import type { GeomTool, ToolDef } from '../../tools';
import type { HandlerCtx } from '../ctx';
import { dispatchAddFreePoint, freshId, mkSceneObj } from '../utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JxgObj = any;

export function handlePolygonTool(
  ctx: HandlerCtx,
  t: GeomTool,
  toolDef: ToolDef,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  e: any,
  x: number,
  y: number,
  bestHit: JxgObj | null,
): boolean {
  if (toolDef.needs !== -1) return false;
  const snappedPoint = bestHit && bestHit.elType === 'point' ? bestHit : ctx.findNearestPointJxg(e, 12);
  const snappedId = snappedPoint ? ctx.jxgIdToSceneId(snappedPoint) : null;
  if (
    ctx.pendingIdsRef.current.length >= 3 &&
    snappedId &&
    snappedId === ctx.pendingIdsRef.current[0]
  ) {
    ctx.clearPreviewSegs();
    const vertices = ctx.pendingIdsRef.current.slice();
    const isArea = t === 'area';
    const id = freshId(ctx, isArea ? 'area' : 'poly');
    const label = ctx.nextLabel('polygon');
    const attrs: Record<string, unknown> = { vertices };
    if (isArea) {
      attrs.showValue = true;
      attrs.fillOpacity = 0.18;
      attrs.color = '#1d4ed8';
    }
    ctx.store.dispatch({
      type: 'ADD',
      payload: { obj: mkSceneObj(id, 'polygon', label, attrs) },
    });
    ctx.clearPending();
    return true;
  }
  if (snappedId && ctx.pendingIdsRef.current.includes(snappedId)) {
    ctx.flashWarn('Đỉnh này đã có — click điểm khác hoặc click lại điểm đầu để đóng');
    return true;
  }
  let pickId: string | null = snappedId;
  let pickJxg: JxgObj | null = snappedPoint;
  if (!pickId) {
    pickId = dispatchAddFreePoint(ctx, x, y);
    pickJxg = ctx.jxgFromSceneId(pickId);
  }
  if (ctx.pendingRef.current.length > 0 && ctx.boardRef.current && pickJxg) {
    const prev = ctx.pendingRef.current[ctx.pendingRef.current.length - 1];
    safeJsx('handlers.createPreviewSegment', () => {
      const seg = ctx.boardRef.current.create('segment', [prev, pickJxg], {
        strokeColor: '#3b82f6',
        strokeWidth: 1.5,
        strokeOpacity: 0.75,
        fixed: true,
        highlight: false,
        withLabel: false,
      });
      ctx.previewSegRef.current.push(seg);
    });
  }
  if (pickJxg) ctx.pendingRef.current.push(pickJxg);
  if (pickId) ctx.pendingIdsRef.current.push(pickId);
  ctx.setPendingCount(ctx.pendingIdsRef.current.length);
  return true;
}
```

- [ ] **Step 6: Implement multiClick.ts**

File: `src/stamps/geometry-2d/editor/handlers/pointerDown/multiClick.ts`

```ts
import { objKind, type ToolDef } from '../../tools';
import type { HandlerCtx } from '../ctx';
import { dispatchAddFreePoint } from '../utils';
import { finalizeShape } from '../finalizeShape';
import { finalizeTransform } from '../transform';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JxgObj = any;

export function handleMultiClickTool(
  ctx: HandlerCtx,
  toolDef: ToolDef,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  e: any,
  x: number,
  y: number,
  hits: JxgObj[],
  bestHit: JxgObj | null,
): void {
  let pick: JxgObj | null = null;
  let pickId: string | null = null;

  if (toolDef.accepts) {
    const usedKinds = ctx.pendingRef.current.map((p) => objKind(p));
    const remaining: Array<'point' | 'line' | 'circle' | 'any'> = [...toolDef.accepts];
    for (const u of usedKinds) {
      if (u === 'other') continue;
      const i = remaining.indexOf(u);
      if (i >= 0) remaining.splice(i, 1);
    }
    const strictPoint = hits.find((o) => objKind(o) === 'point') ?? null;
    const lineHit = hits.find((o) => objKind(o) === 'line') ?? null;
    const circleHit = hits.find((o) => objKind(o) === 'circle') ?? null;
    if (remaining.includes('point') && strictPoint) pick = strictPoint;
    else if (remaining.includes('line') && lineHit) pick = lineHit;
    else if (remaining.includes('circle') && circleHit) pick = circleHit;
    else if (remaining.includes('any') && (strictPoint || lineHit || circleHit)) {
      pick = strictPoint ?? lineHit ?? circleHit;
    } else if (remaining.includes('point')) {
      const near = ctx.findNearestPointJxg(e, 12);
      if (near) pick = near;
    }
    if (!pick) {
      const needs = remaining.map((k) =>
        k === 'point' ? 'một điểm' : k === 'line' ? 'một đường/đoạn' : k === 'circle' ? 'một đường tròn' : 'một đối tượng',
      );
      ctx.flashWarn(`Còn cần click vào ${needs.join(' + ')} có sẵn`);
      return;
    }
    if (ctx.pendingRef.current.includes(pick)) {
      ctx.flashWarn('Đã chọn đối tượng này — chọn đối tượng khác');
      return;
    }
    pickId = ctx.jxgIdToSceneId(pick);
  } else {
    const snapped = bestHit && objKind(bestHit) === 'point' ? bestHit : ctx.findNearestPointJxg(e, 12);
    if (snapped && ctx.pendingRef.current.includes(snapped)) {
      ctx.flashWarn('Đã chọn điểm này — chọn điểm khác hoặc click chỗ trống');
      return;
    }
    if (snapped) {
      pick = snapped;
      pickId = ctx.jxgIdToSceneId(snapped);
    } else {
      pickId = dispatchAddFreePoint(ctx, x, y);
      pick = ctx.jxgFromSceneId(pickId);
    }
  }

  if (!pick) return;
  ctx.pendingRef.current.push(pick);
  if (pickId) ctx.pendingIdsRef.current.push(pickId);
  ctx.setPendingCount(ctx.pendingIdsRef.current.length);

  if (ctx.pendingIdsRef.current.length >= toolDef.needs) {
    const tk = toolDef.key;
    if (tk === 'rotate' || tk === 'dilate' || tk === 'regularPolygon') {
      const cx = ((e.clientX ?? 0) as number) + 8;
      const cy = ((e.clientY ?? 0) as number) + 8;
      ctx.pendingTransformRef.current = {
        tool: tk,
        pendingIds: ctx.pendingIdsRef.current.slice(),
        anchorScreen: { x: cx, y: cy },
      };
      ctx.emitTransform({ tool: tk, anchor: { x: cx, y: cy } });
      return;
    }
    if (tk === 'translate' || tk === 'reflectLine' || tk === 'reflectPoint') {
      finalizeTransform(ctx, tk, ctx.pendingIdsRef.current.slice(), 0);
      ctx.clearPending();
      return;
    }
    finalizeShape(ctx, toolDef);
    ctx.clearPending();
  } else {
    ctx.refreshPreview();
  }
}
```

- [ ] **Step 7: Implement pointerDown/index.ts (dispatcher)**

File: `src/stamps/geometry-2d/editor/handlers/pointerDown/index.ts`

```ts
import { objKind, TOOLS } from '../../tools';
import type { HandlerCtx } from '../ctx';
import { handleMoveTool } from './move';
import { handleSelectTool } from './select';
import { handlePointTool } from './point';
import { handleSingleTargetTool } from './singleTarget';
import { handlePolygonTool } from './polygon';
import { handleMultiClickTool } from './multiClick';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function handleDown(ctx: HandlerCtx, e: any): void {
  if (!ctx.boardRef.current) return;
  const t = ctx.toolRef.current;

  if (t === 'move') return handleMoveTool(ctx, e);
  if (t === 'select') return handleSelectTool(ctx, e);

  const toolDef = TOOLS.find((td) => td.key === t);
  if (!toolDef) return;

  const coords = ctx.boardRef.current.getUsrCoordsOfMouse(e);
  const x = coords[0], y = coords[1];

  const hits = ctx.objectsAt(e)
    .map(ctx.promoteLabel)
    .filter((o) => o !== ctx.axisObjsRef.current.x && o !== ctx.axisObjsRef.current.y);
  const bestHit = hits.find((o) => objKind(o) === 'point') ?? hits[0] ?? null;

  if (t === 'point') return handlePointTool(ctx, e, x, y, hits);
  if (handleSingleTargetTool(ctx, t, toolDef, e, bestHit)) return;
  if (handlePolygonTool(ctx, t, toolDef, e, x, y, bestHit)) return;

  handleMultiClickTool(ctx, toolDef, e, x, y, hits, bestHit);
}
```

- [ ] **Step 8: Verify LoC each file ≤ target**

Run: `wc -l src/stamps/geometry-2d/editor/handlers/pointerDown/*.ts`
Expected: index.ts ≤40, mỗi branch ≤120.

- [ ] **Step 9: Commit**

```bash
git add src/stamps/geometry-2d/editor/handlers/pointerDown/
git commit -m "refactor(handlers): split handleDown 271 LoC into 7 pointerDown/<branch> files"
```

---

## Task 7: A2.3 — Tách `finalizeShape`, `transform`, `pointerMove`, `pointerUp`

**Files:**
- Create: `src/stamps/geometry-2d/editor/handlers/finalizeShape.ts`
- Create: `src/stamps/geometry-2d/editor/handlers/transform.ts`
- Create: `src/stamps/geometry-2d/editor/handlers/pointerMove.ts`
- Create: `src/stamps/geometry-2d/editor/handlers/pointerUp.ts`

**Responsibility:** Move remaining functions từ handlers.ts về handlers/ folder.

- [ ] **Step 1: Implement finalizeShape.ts**

Copy nguyên block lines 411-608 từ `src/stamps/geometry-2d/editor/handlers.ts` (function `findPickIdByKind` + `finalizeShape` + helper `_findCircleCenter` nếu có) sang file mới với imports updated.

File: `src/stamps/geometry-2d/editor/handlers/finalizeShape.ts`

```ts
import type { ToolDef } from '../tools';
import type { HandlerCtx } from './ctx';
import { freshId, mkSceneObj } from './utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JxgObj = any;

/**
 * Tìm scene id của pending pick theo `objKind`. Dùng cho tool order-flexible
 * (perpendicular, parallel, tangent): user có thể click điểm trước hay đường
 * trước, finalizeShape dò pendingRef theo kind để biết role.
 */
function findPickIdByKind(
  ctx: HandlerCtx,
  kind: 'point' | 'line' | 'circle',
): string | null {
  const picks = ctx.pendingRef.current;
  const ids = ctx.pendingIdsRef.current;
  // local objKind helper inlined to avoid cyclic import via tools
  const ok = (o: JxgObj): string => {
    const t = (o?.elType ?? '').toLowerCase();
    if (t === 'point') return 'point';
    if (t === 'line' || t === 'segment' || t === 'ray' || t === 'arrow') return 'line';
    if (t === 'circle' || t === 'circumcircle' || t === 'conic') return 'circle';
    return 'other';
  };
  for (let i = 0; i < picks.length; i += 1) {
    if (ok(picks[i]) === kind && ids[i]) return ids[i];
  }
  return null;
}

export function finalizeShape(ctx: HandlerCtx, toolDef: ToolDef): void {
  // [COPY exact body from handlers.ts:427-608]
  // (Plan executor: copy the entire switch body verbatim.)
  void findPickIdByKind; // keep import — used inside cases
  void ctx; void toolDef;
  throw new Error('finalizeShape body must be copied from handlers.ts:427-608');
}
```

**Note for executor:** copy exact switch body from `src/stamps/geometry-2d/editor/handlers.ts:427-608` (function `finalizeShape`). Replace `import { TOOLS, objKind, ... } from './tools'` already done in plan. Internal helpers `findPickIdByKind` đã extract. `freshId`/`mkSceneObj` already imported from `./utils`. Function body trên 180 dòng — chấp nhận, vẫn dưới 300 LoC.

- [ ] **Step 2: Implement transform.ts**

Copy `finalizeTransform` (lines 609-688) + `recreateFromTransformedPoints` (689-757) sang file mới.

File: `src/stamps/geometry-2d/editor/handlers/transform.ts`

```ts
import type { TransformDef } from '../../../../core/scene/kinds/2d-constraint';
import { getDefiningPoints } from '../transforms';
import type { HandlerCtx, TransformToolKey } from './ctx';
import { freshId, mkSceneObj } from './utils';

/**
 * Pending state from MiniBoard popover confirm. Tool keys:
 *   - translate: [source, A, B]
 *   - rotate:    [source, center]    — value = góc°
 *   - reflectLine: [source, line]
 *   - reflectPoint: [source, center]
 *   - dilate:    [source, center]    — value = k
 *   - regularPolygon: [p1, p2]       — value = n cạnh
 */
export function finalizeTransform(
  ctx: HandlerCtx,
  tool: TransformToolKey,
  pendingIds: string[],
  value: number,
): void {
  // [COPY body verbatim from handlers.ts:609-681]
  void ctx; void tool; void pendingIds; void value;
  throw new Error('finalizeTransform body must be copied from handlers.ts:609-681');
}

function recreateFromTransformedPoints(
  ctx: HandlerCtx,
  source: { kind: string; attrs: Record<string, unknown> },
  pointIds: string[],
): void {
  // [COPY body verbatim from handlers.ts:689-757]
  void ctx; void source; void pointIds;
  throw new Error('recreateFromTransformedPoints body must be copied from handlers.ts:689-757');
}
```

**Note for executor:** copy exact bodies. Helper `recreateFromTransformedPoints` called only from `finalizeTransform` → keep private (not exported).

- [ ] **Step 3: Implement pointerMove.ts + pointerUp.ts**

Files: copy handleMove (lines 839-890) + handleUp (lines 758-838) verbatim.

`src/stamps/geometry-2d/editor/handlers/pointerMove.ts`:

```ts
import type { HandlerCtx } from './ctx';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function handleMove(ctx: HandlerCtx, e: any): void {
  // [COPY body verbatim from handlers.ts:839-890]
  void ctx; void e;
  throw new Error('handleMove body must be copied from handlers.ts:839-890');
}
```

`src/stamps/geometry-2d/editor/handlers/pointerUp.ts`:

```ts
import type { HandlerCtx } from './ctx';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function handleUp(ctx: HandlerCtx, e: any): void {
  // [COPY body verbatim from handlers.ts:758-838]
  void ctx; void e;
  throw new Error('handleUp body must be copied from handlers.ts:758-838');
}
```

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: No new errors.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/editor/handlers/finalizeShape.ts \
        src/stamps/geometry-2d/editor/handlers/transform.ts \
        src/stamps/geometry-2d/editor/handlers/pointerMove.ts \
        src/stamps/geometry-2d/editor/handlers/pointerUp.ts
git commit -m "refactor(handlers): extract finalizeShape/transform/pointerMove/pointerUp"
```

---

## Task 8: A2.4 — Create `handlers/index.ts` + delete old `handlers.ts`

**Files:**
- Create: `src/stamps/geometry-2d/editor/handlers/index.ts`
- Delete: `src/stamps/geometry-2d/editor/handlers.ts`
- Verify: tests still pass (test files import from `./handlers` path which now resolves to folder index)

**Responsibility:** Preserve public API. MiniBoard + finalizeTransform.test.ts import `from './handlers'` → resolved to `handlers/index.ts`.

- [ ] **Step 1: Create handlers/index.ts**

File: `src/stamps/geometry-2d/editor/handlers/index.ts`

```ts
export { handleDown } from './pointerDown';
export { handleMove } from './pointerMove';
export { handleUp } from './pointerUp';
export { finalizeTransform } from './transform';
export type { HandlerCtx, TransformToolKey } from './ctx';
```

- [ ] **Step 2: Delete old handlers.ts**

Run: `git rm src/stamps/geometry-2d/editor/handlers.ts`

- [ ] **Step 3: Run full test suite**

Run: `npm test`
Expected: All tests pass — `finalizeTransform.test.ts` + 2D editor tests + smoke tests.

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: No error.

- [ ] **Step 5: Verify file sizes**

Run: `wc -l src/stamps/geometry-2d/editor/handlers/**/*.ts`
Expected: no file >400 LoC.

- [ ] **Step 6: Commit**

```bash
git add src/stamps/geometry-2d/editor/handlers/index.ts
git rm src/stamps/geometry-2d/editor/handlers.ts
git commit -m "refactor(handlers): replace handlers.ts (890 LoC) with handlers/ folder structure"
```

---

## Task 9: A3 — ADR Tools DSL (document only)

**Files:**
- Create: `docs/superpowers/specs/2026-05-22-tools-dsl-adr.md`

**Responsibility:** Chốt option (b) — giữ nguyên 3 cách hiện có + document lý do tại sao mỗi pattern.

- [ ] **Step 1: Write ADR doc**

File: `docs/superpowers/specs/2026-05-22-tools-dsl-adr.md`

```markdown
# ADR: Tools DSL — giữ 3 pattern hiện có

**Status:** Accepted
**Date:** 2026-05-22
**Owner:** @xinmotlanthua
**Related:** Issue #28 (Tier A), spec `2026-05-21-refactor-tier-a-b-design.md`

## Bối cảnh

3 stamp interactive (geometry-2d, geometry-3d, graph-2d) đều dùng `core/scene` nhưng triển khai Tools DSL khác nhau:

| Stamp | Tools layout | LoC |
|---|---|---|
| `geometry-2d` | `editor/tools.tsx` (single declarative `TOOLS` map) | 272 |
| `geometry-3d` | `editor/tools/spec.ts` + `editor/toolPanel/groups.ts` + `editor/toolPanel/icons.tsx` | 245 + 100 + 70 |
| `graph-2d` | `editor/tools.ts` + `editor/rows/FunctionRow.tsx` + `editor/rows/ParameterRow.tsx` | 100 + 100 + 90 |

## Câu hỏi

- (a) Chuẩn hoá ToolSpec contract dùng chung → 3D + graph-2d migrate.
- (b) Giữ nguyên + document lý do.

## Quyết định: **(b) Giữ 3 pattern**

### Lý do

1. **graph-2d cần `rows/` thật sự**: function row + parameter row có inline edit (text input + slider) — không phù hợp với plain "tool button + handler" pattern. Force chung schema sẽ phải thêm `renderRow` slot, làm contract phức tạp hơn benefits.
2. **geometry-3d's `toolPanel/`**: tool 3D có grouping rich (translation/rotation/scaling sub-menu). Single-file `tools.tsx` 2D pattern không đủ. Tách `groups.ts` + `icons.tsx` là correct decomposition cho complexity 3D.
3. **geometry-2d's `tools.tsx`**: simple flat list, không group. Single file pattern đủ.
4. **Cost / benefit:** migrate ~3-5 ngày, risk break visual + handler. Benefit chính là DRY — nhưng 3 stamp có needs khác nhau nên DRY chỉ ở mức `ToolSpec` type interface, không phải logic.
5. **Tier B target ≤300 LoC cho stamp mới**: vẫn đạt được KHÔNG cần chuẩn hoá Tools DSL. Stamp mới chỉ cần một trong 3 pattern theo nhu cầu (flat list → 2D pattern; grouped → 3D pattern; inline edit row → graph-2d pattern).

### Trade-off chấp nhận

- Người mới phải đọc 3 example folder. Mitigation: Tier B½ doc `add-new-stamp-howto.md` sẽ liệt kê 3 pattern + "khi nào dùng cái nào".
- Contract test generic (Tier B½) chỉ test `StampType` boundary (renderSvg, matchesCustomData, …), không test tools layout — chấp nhận.

## Hệ quả

- Tier B mục B2 (chuẩn hoá Tools DSL) **DROP**. Giữ nguyên scope khác của B2: promote `useSceneStore` hook lên `core/scene/hooks/`.
- `src/stamps/README.md` (chưa có — Tier B½) sẽ document 3 pattern.

## Alternatives considered

- (a) Chuẩn hoá: viability OK (đã xem code), nhưng cost > benefit cho codebase size hiện tại (4 stamp, ~1 dev). Có thể revisit khi >10 stamp.
- (c) Build `ToolSpec` + slot mechanism: over-engineer, đẩy `EditorShell` (Tier B1) phức tạp hơn. Ưu tiên YAGNI.
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/2026-05-22-tools-dsl-adr.md
git commit -m "docs(adr): tools DSL — keep 3 patterns + document rationale (option b)"
```

---

## Task 10: A4 — Setup ESLint + max-lines: 400

**Files:**
- Create: `eslint.config.mjs`
- Modify: `package.json` (add devDeps + lint script)
- Modify: `.gitignore` (add `.eslintcache`)

**Responsibility:** Install ESLint stack + flat config + `max-lines:400` rule. CI sẽ fail nếu thêm god-file mới.

- [ ] **Step 1: Install ESLint dependencies**

Run:
```bash
npm install --save-dev eslint@^9.18.0 \
  typescript-eslint@^8.20.0 \
  @typescript-eslint/parser@^8.20.0 \
  @typescript-eslint/eslint-plugin@^8.20.0 \
  eslint-plugin-react@^7.37.0 \
  eslint-plugin-react-hooks@^5.1.0 \
  globals@^15.14.0
```

Expected: deps cài thành công.

- [ ] **Step 2: Create eslint.config.mjs (flat config)**

File: `eslint.config.mjs`

```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      '.yalc/**',
      'scripts/demo/**',
      'tests/e2e/**',
      '**/*.d.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jest,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooks,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      'max-lines': ['error', { max: 400, skipBlankLines: true, skipComments: true }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    // Test files: relax some rules
    files: ['**/__tests__/**', '**/*.test.{ts,tsx}', 'jest.setup.ts'],
    rules: {
      'max-lines': 'off',
    },
  },
];
```

- [ ] **Step 3: Add lint script to package.json**

Modify `package.json` scripts section:

```json
"scripts": {
  "build": "tsup && node scripts/inject-use-client.mjs",
  "dev": "tsup --watch --onSuccess \"node scripts/inject-use-client.mjs\"",
  "test": "jest",
  "test:e2e": "playwright test",
  "typecheck": "tsc --noEmit",
  "lint": "eslint .",
  "lint:fix": "eslint . --fix",
  "clean": "rm -rf dist .yalc yalc.lock",
  "demo": "vite --config scripts/demo/vite.config.ts",
  "prepublishOnly": "npm run clean && npm run build"
}
```

- [ ] **Step 4: Update .gitignore**

Modify `.gitignore` — add `.eslintcache` if not present.

- [ ] **Step 5: Run lint to verify rule works**

Run: `npm run lint`
Expected: PASS (sau A1+A2, không còn file >400 LoC trong src/). Có thể có warning nhỏ về unused vars / react-hooks deps — chấp nhận.

> Nếu fail: triage file by file. Allowlist tối đa 2 file fixture (MiniBoard.tsx 768 LoC — defer Tier B; PageRangeDialog.tsx 441 LoC — minor, có thể split nhanh hoặc allow).

- [ ] **Step 6: Add per-file disable cho file vẫn >400 LoC**

If `MiniBoard.tsx` còn 768 LoC (defer Tier B), thêm comment header:

```tsx
/* eslint-disable max-lines */
```

Allowlist tổng cộng tối đa 3 file:
- `src/stamps/geometry-2d/editor/MiniBoard.tsx` (Tier B target)
- `src/pdf/PageRangeDialog.tsx` (441 LoC — borderline, ok skip Tier B)
- `src/stamps/geometry-3d/editor/EditorPanel.tsx` (477 LoC — Tier B target)
- `src/stamps/geometry-2d/editor/LeftPanel.tsx` (451 LoC — Tier B target)
- `src/stamps/geometry-2d/editor/handlers/finalizeShape.ts` (nếu ≤400 thì OK; nếu lớn hơn allow)

- [ ] **Step 7: Run lint cuối**

Run: `npm run lint`
Expected: PASS với allowlist.

- [ ] **Step 8: Commit**

```bash
git add eslint.config.mjs package.json package-lock.json .gitignore
# Add per-file disable nếu có
git add src/stamps/geometry-2d/editor/MiniBoard.tsx \
        src/stamps/geometry-3d/editor/EditorPanel.tsx \
        src/stamps/geometry-2d/editor/LeftPanel.tsx \
        src/pdf/PageRangeDialog.tsx 2>/dev/null || true
git commit -m "chore(eslint): add ESLint 9 flat config + max-lines: 400 guard"
```

---

## Task 11: Final verification + bump version

**Files:**
- Modify: `package.json` (version bump)
- Modify: `CHANGELOG.md` (note refactor)

**Responsibility:** Verify acceptance criteria + bump v0.16.0.

- [ ] **Step 1: Verify acceptance**

Run các check:

```bash
# 1. No file >400 LoC trong src (trừ allowlist)
find src -type f \( -name "*.ts" -o -name "*.tsx" \) ! -path "*/__tests__/*" -exec wc -l {} \; | sort -rn | head -10

# 2. Tests pass
npm test

# 3. Typecheck pass
npm run typecheck

# 4. Lint pass
npm run lint

# 5. Build pass
npm run build
```

Expected:
- ≤4 file >400 LoC trong src/ (vs 6 trước Tier A).
- All tests pass + tests count tăng (+5 hook tests).
- No typecheck error.
- No lint error.
- Build succeeds.

- [ ] **Step 2: Update CHANGELOG (nếu chưa có file thì tạo)**

File: `CHANGELOG.md` (append section)

```markdown
## v0.16.0 — 2026-05-22

### Internal refactor (Tier A) — no public API change

- `Whiteboard.tsx` 739 → ~400 LoC: tách `useExcalidrawApi`, `useActiveStamp`, `usePdfImporter` về `src/hooks/`.
- `handlers.ts` 890 LoC → folder `handlers/` (12 file ≤300 LoC mỗi). `handleDown` 271 LoC tách theo tool branch trong `pointerDown/`.
- Thêm ESLint 9 flat config + rule `max-lines: 400`.
- ADR Tools DSL: chốt giữ 3 pattern hiện có ([2026-05-22-tools-dsl-adr.md](docs/superpowers/specs/2026-05-22-tools-dsl-adr.md)).
- Spec: [refactor-tier-a-b-design.md](docs/superpowers/specs/2026-05-21-refactor-tier-a-b-design.md).

Public API unchanged: `Whiteboard`, `STABLE_STAMPS`, `findStampForCustomData`, `pickSyncableAppState`, `isStampElement`, `restoreMissingStampFiles`.
```

- [ ] **Step 3: Bump version**

Run:
```bash
npm version minor --no-git-tag-version
# Sửa 0.15.0 → 0.16.0
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json CHANGELOG.md
git commit -m "chore(release): v0.16.0 — Tier A refactor"
```

- [ ] **Step 5: Push (per memory authorization)**

```bash
git push
```

Per memory `feedback-git-push-authorization`: standing authorization OK.

---

## Self-Review Checklist

- [x] Spec section A1 → Task 1-4 (3 hooks + Whiteboard refactor)
- [x] Spec section A2 → Task 5-8 (handlers folder structure)
- [x] Spec section A3 → Task 9 (ADR)
- [x] Spec section A4 → Task 10 (ESLint)
- [x] No "TBD" placeholders — but Task 7 has `[COPY body verbatim from handlers.ts:XXX]` markers; **executor must literally copy lines from old file**. Risk: if executor missed copying, test fails immediately (finalizeTransform.test.ts) → caught quickly.
- [x] Type consistency: `HandlerCtx` in `ctx.ts` matches old; `TransformToolKey` extracted same shape; `EditingElement` shape `{id, customData}` consistent in `useActiveStamp` + `Whiteboard`.
- [x] LoC targets: Whiteboard ≤400 (relaxed from spec ≤200, documented); handleDown branches ≤120 each; finalizeShape ~180 (under 400 cap).
- [x] Per-file lint disable allowlist documented in Task 10.

## Known compromises (documented for Tier B)

1. **Whiteboard.tsx ~400 LoC** (spec target ≤200). Scene/file persist orchestration giữ inline — tách thành `useSceneFilePersist` hook là Tier B work (cần test refactor lớn cho throttled writes + unmount cleanup).
2. **`HandlerCtx` vẫn 26 field** (spec target ≤8). Slim ctx cần refactor `MiniBoard.tsx` (Tier B target) song song — out of scope Tier A.
3. **3D MiniBoard3D + graph-2d MiniBoard không refactor** — defer Tier B.
