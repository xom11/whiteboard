# Trang standalone "dán đề → ra hình" (Mức 1) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mở API để repo `hoctotbachkhoa` dựng được trang public "dán đề → ra hình" chạy client-side, bằng cách tách editor hình học 2D khỏi Excalidraw.

**Architecture:** `host.tsx` tách đôi — `GeometryStudio` (generic, commit qua prop `onCommit`) và `GeometryStampHost` (wrapper mỏng, truyền `insertStampImage`). `GeometryStudio` xuất qua subpath **mới** `@xom11/whiteboard/studio` chứ không qua `./geometry-2d`, vì `geometry-2d/index.tsx:17` dùng `React.lazy` để editor không rơi vào bundle gốc. Một cổng bundle trong CI khoá cả hai chiều.

**Tech Stack:** TypeScript strict, React 18, tsup (multi-entry), Jest 29 + jsdom + ts-jest, JSXGraph (mocked trong test).

**Spec:** `docs/superpowers/specs/2026-07-10-standalone-figure-page-design.md`

## Global Constraints

- **Phạm vi = repo `whiteboard` (thư viện).** Trang landing nằm ở repo `hoctotbachkhoa`, KHÔNG thuộc plan này. Plan này chỉ tạo hợp đồng API.
- **Lưới an toàn tuyệt đối:** `src/stamps/geometry-2d/__tests__/Host.chord.test.tsx` và `src/stamps/geometry-2d/__tests__/integration/re-edit-2d.test.tsx` phải xanh **mà không sửa một dòng nào**. Nếu buộc phải sửa chúng ⇒ đường cắt sai ⇒ DỪNG và báo lại, không được sửa test cho vừa code.
- TypeScript strict, tránh `any` khi tránh được. `"use client"` ở mọi file có hook/event handler.
- Commit message tiếng Việt, prefix tiếng Anh (`feat`, `fix`, `refactor`, `test`, `chore`, `ci`).
- **KHÔNG** thêm `Co-Authored-By`.
- Không thêm dependency mới.
- Chạy `npm test` (Jest) và `npm run typecheck` trước mỗi commit.

## File Structure

| File | Trách nhiệm |
|---|---|
| `src/stamps/shared/useStampStore.ts` (sửa) | Tạo scene store, seed lười qua thunk |
| `src/stamps/geometry-2d/studio/GeometryStudio.tsx` (mới) | Editor 2D generic, commit qua prop |
| `src/stamps/geometry-2d/studio/geometryStateToJsonState.ts` (mới) | `State` → chuỗi `jsonState` |
| `src/stamps/geometry-2d/studio/index.ts` (mới) | Barrel cho subpath `/studio` |
| `src/stamps/geometry-2d/host.tsx` (sửa) | Wrapper mỏng: Excalidraw adapter |
| `src/stamps/geometry-2d/insertGeometryStamp.ts` (mới) | `jsonState` → chèn stamp vào scene |
| `scripts/check-bundle-boundaries.mjs` (mới) | Cổng bundle |
| `scripts/measure-figure-perf.ts` (mới) | Đo p95 `handleGenerateFigure` |

---

### Task 1: `useStampStore` nhận thunk lười

**Files:**
- Modify: `src/stamps/shared/useStampStore.ts`
- Modify: `src/stamps/geometry-2d/host.tsx:42`
- Modify: `src/stamps/geometry-3d/host.tsx:51`
- Modify: `src/stamps/graph-2d/host.tsx:82`
- Test: `src/stamps/shared/__tests__/useStampStore.test.tsx` (viết lại)

**Interfaces:**
- Produces: `useStampStore(domain: StampDomain, makeInitialState?: () => State | null): Store`. Thunk chỉ được gọi **đúng một lần**, ở render đầu tiên.
- Xoá export `ParseInitialStateFn` (không còn ai dùng sau task này).

**Vì sao thunk, không phải giá trị:** bản hiện tại gọi `parseInitial` bên trong `if (!ref.current)` nên chỉ parse một lần. Nếu đổi thành `initialState: State | null`, caller sẽ chạy `deserializeBoard` mỗi lần render. Thunk giữ nguyên tính lười.

- [ ] **Step 1: Viết lại test cho chữ ký mới**

Thay toàn bộ nội dung `src/stamps/shared/__tests__/useStampStore.test.tsx`:

```tsx
import { renderHook } from '@testing-library/react';
import { useStampStore } from '../useStampStore';
import type { State } from '../../../core/scene';

describe('useStampStore', () => {
  test('tạo store rỗng khi không truyền thunk', () => {
    const { result } = renderHook(() => useStampStore('2d'));
    expect(Object.keys(result.current.getState().objects)).toHaveLength(0);
    expect(result.current.getState().meta.domain).toBe('2d');
  });

  test('dùng state do thunk trả về', () => {
    const seedState: State = {
      objects: {
        foo: {
          id: 'foo',
          kind: 'function2d',
          label: 'foo',
          visible: true,
          locked: false,
          layer: 'default',
          schemaVersion: 1,
           
          attrs: { expression: 'x', color: '#000', visible: true } as any,
        },
      },
      order: ['foo'],
      counter: 1,
      meta: { domain: 'graph2d', version: 1 },
    };
    const { result } = renderHook(() => useStampStore('graph2d', () => seedState));
    expect(result.current.getState().objects['foo']).toBeDefined();
  });

  test('fallback về state rỗng khi thunk trả null', () => {
    const { result } = renderHook(() => useStampStore('3d', () => null));
    expect(Object.keys(result.current.getState().objects)).toHaveLength(0);
    expect(result.current.getState().meta.domain).toBe('3d');
  });

  test('store identity ổn định qua re-render', () => {
    const { result, rerender } = renderHook(() => useStampStore('2d', () => null));
    const firstStore = result.current;
    rerender();
    rerender();
    expect(result.current).toBe(firstStore);
  });

  test('thunk CHỈ được gọi một lần (bất biến lười)', () => {
    const makeInitial = jest.fn().mockReturnValue(null);
    const { rerender } = renderHook(() => useStampStore('2d', makeInitial));
    rerender();
    rerender();
    expect(makeInitial).toHaveBeenCalledTimes(1);
  });

  test('store hỗ trợ dispatch + undo từ state ban đầu', () => {
    const { result } = renderHook(() => useStampStore('2d'));
    const store = result.current;
    expect(store.canUndo()).toBe(false);
    expect(typeof store.dispatch).toBe('function');
    expect(typeof store.subscribe).toBe('function');
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `npx jest src/stamps/shared/__tests__/useStampStore.test.tsx`
Expected: FAIL — `useStampStore('2d')` thiếu tham số, hoặc thunk bị truyền vào chỗ `editingElement`.

- [ ] **Step 3: Sửa `useStampStore.ts`**

Thay toàn bộ phần sau import comment header của `src/stamps/shared/useStampStore.ts`:

```ts
import { useRef } from 'react';
import { createStore, createEmptyState, type Store } from '../../core/scene';
import type { State } from '../../core/scene/types';

export type StampDomain = '2d' | '3d' | 'graph2d';

/**
 * Tạo + giữ scene store tại Host level. `makeInitialState` là THUNK LƯỜI:
 * chỉ gọi đúng một lần ở render đầu, nên caller thoải mái đặt
 * `deserializeBoard(...)` bên trong mà không sợ parse lại mỗi render.
 */
export function useStampStore(
  domain: StampDomain,
  makeInitialState?: () => State | null,
): Store {
  const ref = useRef<Store | null>(null);
  if (!ref.current) {
    ref.current = createStore(makeInitialState?.() ?? createEmptyState(domain));
  }
  return ref.current;
}
```

Lưu ý: xoá import `type { StampHostProps }` và export `ParseInitialStateFn`.

- [ ] **Step 4: Cập nhật 3 call site**

`src/stamps/geometry-2d/host.tsx:42` — thay:
```tsx
    const sceneStore = useStampStore('2d', editingElement, parseInitialState);
```
bằng:
```tsx
    const sceneStore = useStampStore('2d', () =>
      editingElement?.customData ? parseInitialState(editingElement.customData) : null,
    );
```

`src/stamps/geometry-3d/host.tsx:51` — thay:
```tsx
    const sceneStore = useStampStore('3d', editingElement, parseInitialState);
```
bằng:
```tsx
    const sceneStore = useStampStore('3d', () =>
      editingElement?.customData ? parseInitialState(editingElement.customData) : null,
    );
```

`src/stamps/graph-2d/host.tsx:82` — thay:
```tsx
    const sceneStore = useStampStore('graph2d', editingElement, parseInitialState);
```
bằng:
```tsx
    const sceneStore = useStampStore('graph2d', () =>
      editingElement?.customData ? parseInitialState(editingElement.customData) : null,
    );
```

- [ ] **Step 5: Chạy test + typecheck**

Run: `npx jest src/stamps/shared/__tests__/useStampStore.test.tsx && npm run typecheck`
Expected: 6 test PASS, typecheck sạch.

- [ ] **Step 6: Chạy full suite — lưới an toàn**

Run: `npm test`
Expected: toàn bộ xanh. Đặc biệt `Host.chord.test.tsx`, `integration/re-edit-2d.test.tsx`, và test tương ứng của 3d/graph-2d phải xanh **mà không sửa gì**.

- [ ] **Step 7: Commit**

```bash
git add src/stamps/shared/useStampStore.ts src/stamps/shared/__tests__/useStampStore.test.tsx src/stamps/geometry-2d/host.tsx src/stamps/geometry-3d/host.tsx src/stamps/graph-2d/host.tsx
git commit -m "refactor(stamps): useStampStore nhận thunk lười thay vì (editingElement, parseInitial)

Chuẩn bị cho GeometryStudio seed store từ jsonState rời mà không phải bịa
editingElement giả. Thunk giữ nguyên bất biến 'parse chỉ 1 lần' của bản cũ."
```

---

### Task 2: Tách `GeometryStudio` khỏi `host.tsx`

**Files:**
- Create: `src/stamps/geometry-2d/studio/GeometryStudio.tsx`
- Modify: `src/stamps/geometry-2d/host.tsx` (viết lại thành wrapper)
- Test: `src/stamps/geometry-2d/__tests__/GeometryStudio.test.tsx`

**Interfaces:**
- Consumes: `useStampStore(domain, makeInitialState?)` từ Task 1.
- Produces:
  ```ts
  interface GeometryStudioProps {
    initialJsonState?: string;
    /** Trả `false` = CHƯA commit → giữ panel mở. Giá trị khác = đã commit → đóng. */
    onCommit: (jsonState: string, svgString: string) => boolean | void | Promise<boolean | void>;
    onClose: () => void;
    isDark?: boolean;
    api?: unknown;
    generateGeometryFigure?: GenerateGeometryFigure;
    onGeometryDraft?: (draft: GeometryDraftPreview | null) => void;
  }
  const GeometryStudio: React.ForwardRefExoticComponent<
    GeometryStudioProps & React.RefAttributes<StampHostHandle>
  >;
  ```
  `StampHostHandle` = `{ tryInsert(): boolean; hasContent(): boolean }` (đã có ở `shared/types.ts`).

- [ ] **Step 1: Viết test thất bại cho `GeometryStudio`**

Tạo `src/stamps/geometry-2d/__tests__/GeometryStudio.test.tsx`:

```tsx
import { render, act } from '@testing-library/react';
import React, { createRef } from 'react';
import { GeometryStudio } from '../studio/GeometryStudio';
import type { StampHostHandle } from '../../shared/types';
import type { GeometryEditorPanelHandle } from '../editor/EditorPanel';

// Bắt props truyền xuống EditorPanel + cho phép gọi onInsert từ ngoài.
let capturedOnInsert: ((json: string, svg: string) => void) | null = null;
let capturedApi: unknown = 'SENTINEL';

jest.mock('../editor/EditorPanel', () => {
  const actual = jest.requireActual('../editor/EditorPanel');
  const React = jest.requireActual('react');
  const MockPanel = React.forwardRef<
    GeometryEditorPanelHandle,
    { onInsert: (j: string, s: string) => void; api?: unknown }
  >(function MockPanel(props, ref) {
    capturedOnInsert = props.onInsert;
    capturedApi = props.api;
    React.useImperativeHandle(
      ref,
      (): GeometryEditorPanelHandle => ({
        insert: () => true,
        hasContent: () => true,
        selectObject: () => {},
      }),
    );
    return null;
  });
  return { ...actual, GeometryEditorPanel: MockPanel };
});

jest.mock('../../shared/StampLeftPanel', () => ({
  StampLeftPanel: () => null,
}));

describe('GeometryStudio', () => {
  beforeEach(() => {
    capturedOnInsert = null;
    capturedApi = 'SENTINEL';
  });

  test('gọi onCommit đúng (jsonState, svgString) khi editor insert', async () => {
    const onCommit = jest.fn();
    render(<GeometryStudio onCommit={onCommit} onClose={() => {}} />);

    await act(async () => {
      capturedOnInsert!('{"objects":{}}', '<svg/>');
    });

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith('{"objects":{}}', '<svg/>');
  });

  test('gọi onClose sau khi commit xong', async () => {
    const onClose = jest.fn();
    render(<GeometryStudio onCommit={() => {}} onClose={onClose} />);

    await act(async () => {
      capturedOnInsert!('{}', '<svg/>');
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('thiếu api không làm vỡ — vẫn commit được', async () => {
    const onCommit = jest.fn();
    render(<GeometryStudio onCommit={onCommit} onClose={() => {}} />);

    expect(capturedApi).toBeUndefined();
    await act(async () => {
      capturedOnInsert!('{}', '<svg/>');
    });
    expect(onCommit).toHaveBeenCalled();
  });

  test('ref expose tryInsert + hasContent', () => {
    const ref = createRef<StampHostHandle>();
    render(<GeometryStudio ref={ref} onCommit={() => {}} onClose={() => {}} />);
    expect(ref.current!.tryInsert()).toBe(true);
    expect(ref.current!.hasContent()).toBe(true);
  });

  test('onCommit lỗi vẫn đóng panel, không ném ra ngoài', async () => {
    const onClose = jest.fn();
    const onCommit = jest.fn().mockRejectedValue(new Error('boom'));
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    render(<GeometryStudio onCommit={onCommit} onClose={onClose} />);

    await act(async () => {
      capturedOnInsert!('{}', '<svg/>');
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `npx jest src/stamps/geometry-2d/__tests__/GeometryStudio.test.tsx`
Expected: FAIL — `Cannot find module '../studio/GeometryStudio'`.

- [ ] **Step 3: Tạo `src/stamps/geometry-2d/studio/GeometryStudio.tsx`**

Đây là `host.tsx` cũ, đổi ba chỗ: bỏ `insertStampImage`/`editingElement`, thêm `onCommit`/`initialJsonState`, `api` thành optional.

```tsx
'use client';

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StampLeftPanel } from '../../shared/StampLeftPanel';
import { GeometryIconHeader } from '../editor/icons';
import {
  GeometryEditorPanel,
  type GeometryEditorPanelHandle,
} from '../editor/EditorPanel';
import type { GeomTool } from '../editor/MiniBoard';
import { GROUP_ORDER, GROUP_LABELS, TOOLS, letterForGroup, type GeomGroup } from '../editor/tools';
import { useChordShortcut } from '../../shared/useChordShortcut';
import { deserializeBoard } from '../serialize';
import { DEFAULT_VIEW_2D } from '../../../core/scene';
import type { StampHostHandle, GenerateGeometryFigure } from '../../shared/types';
import type { GeometryDraftPreview } from '../../shared/draftTypes';
import { useIsMobile } from '../../shared/useIsMobile';
import { useStampStore } from '../../shared/useStampStore';
import { makeDslRenderRow } from '../editor/dslRenderRow';

export interface GeometryStudioProps {
  /** Seed store lúc mount. Vắng = board trống. */
  initialJsonState?: string;
  /** Thay cho insertStampImage. Editor gọi khi user bấm "Chèn". */
  onCommit: (jsonState: string, svgString: string) => void | Promise<void>;
  onClose: () => void;
  isDark?: boolean;
  /** Chỉ để EditorPanel đọc viewport khi dựng draft. Vắng = bỏ qua draft. */
  api?: unknown;
  generateGeometryFigure?: GenerateGeometryFigure;
  onGeometryDraft?: (draft: GeometryDraftPreview | null) => void;
}

export const GeometryStudio = forwardRef<StampHostHandle, GeometryStudioProps>(
  function GeometryStudio(
    { initialJsonState, onCommit, onClose, isDark, api, generateGeometryFigure, onGeometryDraft },
    ref,
  ) {
    const panelRef = useRef<GeometryEditorPanelHandle | null>(null);
    const { isMobile } = useIsMobile();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const sceneStore = useStampStore('2d', () =>
      initialJsonState ? deserializeBoard(initialJsonState) : null,
    );

    const initialMeta = sceneStore.getState().meta;
    const initialView = initialMeta.domain === '2d' ? initialMeta.view : DEFAULT_VIEW_2D;
    const [selectedTool, setSelectedTool] = useState<GeomTool>('move');
    const [showAxis, setShowAxis] = useState<boolean>(initialView.showAxis);
    const [showGrid, setShowGrid] = useState<boolean>(initialView.showGrid);
    const [canUndo, setCanUndo] = useState<boolean>(false);
    const [canRedo, setCanRedo] = useState<boolean>(false);
    const [selectedObjectId, setSelectedObjectId] = useState<string | undefined>(undefined);

    const handleHistoryChange = useCallback((u: boolean, r: boolean) => {
      setCanUndo(u);
      setCanRedo(r);
    }, []);

    const handleUndo = useCallback(() => sceneStore.undo(), [sceneStore]);
    const handleRedo = useCallback(() => sceneStore.redo(), [sceneStore]);

    const { chordGroup } = useChordShortcut({
      groupOrder: GROUP_ORDER,
      tools: TOOLS,
      onSelect: (key) => setSelectedTool(key as GeomTool),
      enabled: !isMobile,
    });

    const renderRow = useMemo(() => makeDslRenderRow(sceneStore), [sceneStore]);

    const handleInsert = useCallback(
      async (jsonState: string, svgString: string) => {
        try {
          const committed = await onCommit(jsonState, svgString);
          if (committed === false) return; // chưa commit → giữ panel mở
        } catch (err) {
          console.error('Geometry commit failed:', err);
        }
        onClose();
      },
      [onCommit, onClose],
    );

    useImperativeHandle(
      ref,
      () => ({
        tryInsert: () => panelRef.current?.insert() ?? false,
        hasContent: () => panelRef.current?.hasContent() ?? false,
      }),
      [],
    );

    return (
      <>
        <StampLeftPanel<GeomTool, GeomGroup>
          title="Hình học"
          icon={GeometryIconHeader}
          onClose={onClose}
          isDark={isDark}
          testId="stamp-left-panel"
          tools={TOOLS}
          groupOrder={GROUP_ORDER}
          groupLabels={GROUP_LABELS}
          activeTool={selectedTool}
          onToolChange={setSelectedTool}
          view={{
            showAxis,
            showGrid,
            onShowAxisChange: setShowAxis,
            onShowGridChange: setShowGrid,
          }}
          history={{
            onUndo: handleUndo,
            canUndo,
            onRedo: handleRedo,
            canRedo,
          }}
          chord={{ activeGroup: chordGroup, letterForGroup }}
          objects={{
            store: sceneStore,
            selectedObjectId,
            onObjectSelect: (id) => {
              setSelectedObjectId(id ?? undefined);
              panelRef.current?.selectObject(id);
            },
            renderRow,
          }}
          isMobile={isMobile}
          drawerOpen={drawerOpen}
          onDrawerClose={() => setDrawerOpen(false)}
        />
        <GeometryEditorPanel
          ref={panelRef}
          store={sceneStore}
          onInsert={handleInsert}
          onClose={onClose}
          selectedTool={selectedTool}
          showAxis={showAxis}
          showGrid={showGrid}
          onHistoryChange={handleHistoryChange}
          withLeftPanel={!isMobile}
          isDark={isDark}
          isMobile={isMobile}
          onOpenDrawer={() => setDrawerOpen(true)}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={canUndo}
          canRedo={canRedo}
          onSelectionChange={setSelectedObjectId}
          generateGeometryFigure={generateGeometryFigure}
          api={api}
          onGeometryDraft={onGeometryDraft}
        />
      </>
    );
  },
);
```

`isDark` là `boolean | undefined` ở cả `StampLeftPanelProps` (`shared/StampLeftPanel/types.ts:79`) lẫn `EditorPanel` (`editor/EditorPanel.tsx:33`), nên truyền thẳng, không cần `?? false`.

- [ ] **Step 4: Chạy test `GeometryStudio` để xác nhận PASS**

Run: `npx jest src/stamps/geometry-2d/__tests__/GeometryStudio.test.tsx`
Expected: 5 test PASS.

- [ ] **Step 5: Viết lại `host.tsx` thành wrapper mỏng**

Thay toàn bộ `src/stamps/geometry-2d/host.tsx`:

```tsx
'use client';

import { forwardRef, useCallback } from 'react';
import { GeometryStudio } from './studio/GeometryStudio';
import { insertStampImage } from '../shared/insertImage';
import { isGeometryCustomData, type GeometryCustomData } from './types';
import type { StampHostProps, StampHostHandle } from '../shared/types';

/** Adapter Excalidraw cho GeometryStudio. Toàn bộ điều phối editor nằm ở Studio. */
export const GeometryStampHost = forwardRef<StampHostHandle, StampHostProps>(
  function GeometryStampHost(
    { api, editingElement, onClose, isDark, generateGeometryFigure, onGeometryDraft },
    ref,
  ) {
    const initialJsonState = isGeometryCustomData(editingElement?.customData)
      ? editingElement.customData.jsonState
      : undefined;

    const handleCommit = useCallback(
      async (jsonState: string, svgString: string): Promise<boolean> => {
        if (!api) return false; // api chưa sẵn sàng → Studio giữ panel mở
        await insertStampImage(api, {
          svgString,
          makeCustomData: (): GeometryCustomData => ({
            kind: 'geometry',
            version: 1,
            jsonState,
          }),
          editingElementId: editingElement?.id ?? null,
          preserveExistingSize: true,
        });
        return true;
      },
      [api, editingElement?.id],
    );

    return (
      <GeometryStudio
        ref={ref}
        initialJsonState={initialJsonState}
        onCommit={handleCommit}
        onClose={onClose}
        isDark={isDark}
        api={api}
        generateGeometryFigure={generateGeometryFigure}
        onGeometryDraft={onGeometryDraft}
      />
    );
  },
);
```

Ghi chú hành vi (SỬA sau review Task 2 — bản đầu của plan có bug):

- Lỗi: bản cũ bọc `try/catch` quanh `insertStampImage`, log `'Geometry insert failed:'`, rồi vẫn `onClose()`. Nay Studio bọc `try/catch` quanh `onCommit`, log `'Geometry commit failed:'`, rồi vẫn `onClose()`. Giữ nguyên.
- **`api` chưa sẵn sàng:** bản cũ có `if (!api) return;` là câu lệnh ĐẦU TIÊN của `handleInsert` ⇒ **không** gọi `onClose()` ⇒ panel ở lại, user bấm lại được. Nếu host chỉ `return;` trong `handleCommit`, promise resolve bình thường và Studio sẽ đóng panel, **xoá mất hình đang dựng**. Vì thế `onCommit` trả `false` để báo "chưa commit". Nhánh này chạm tới được thật: `Whiteboard.tsx:312` render `<HostComponent api={api}>` không gate theo `api`, mà `api` đến bất đồng bộ (`Whiteboard.tsx:255`).
- Hai test bắt buộc, vì đây chính là chỗ hồi quy lọt lưới: `GeometryStudio.test.tsx` — `onCommit` trả `false` ⇒ KHÔNG gọi `onClose`; `__tests__/Host.noApi.test.tsx` — render `GeometryStampHost` thiếu `api`, bấm chèn ⇒ KHÔNG gọi `onClose`.

- [ ] **Step 6: Chạy lưới an toàn**

Run: `npx jest src/stamps/geometry-2d`
Expected: `Host.chord.test.tsx` và `integration/re-edit-2d.test.tsx` PASS **không sửa dòng nào**.

Nếu FAIL: đọc kỹ lỗi. Nếu nguyên nhân là mock `../editor/EditorPanel` không còn được `host.tsx` import trực tiếp (giờ nó import qua `studio/GeometryStudio`), thì mock vẫn hoạt động vì Jest mock theo **module path đã resolve**, và `GeometryStudio.tsx` import đúng module đó (`../editor/EditorPanel`). Trường hợp vẫn hỏng ⇒ DỪNG, báo lại — không sửa test.

- [ ] **Step 7: Full suite + typecheck**

Run: `npm test && npm run typecheck`
Expected: tất cả xanh.

- [ ] **Step 8: Commit**

```bash
git add src/stamps/geometry-2d/studio/GeometryStudio.tsx src/stamps/geometry-2d/host.tsx src/stamps/geometry-2d/__tests__/GeometryStudio.test.tsx
git commit -m "refactor(geometry-2d): tách GeometryStudio khỏi Excalidraw

host.tsx co lại thành adapter: truyền onCommit=insertStampImage. Toàn bộ
điều phối editor (tool state, undo/redo, chord, left panel) chuyển sang
GeometryStudio — dùng được ngoài Excalidraw. Host.chord + re-edit-2d xanh
không sửa dòng nào."
```

---

### Task 3: `geometryStateToJsonState`

**Files:**
- Create: `src/stamps/geometry-2d/studio/geometryStateToJsonState.ts`
- Test: `src/stamps/geometry-2d/__tests__/geometryStateToJsonState.test.ts`

**Interfaces:**
- Consumes: `serializeBoard(state, view)` (`geometry-2d/serialize.ts:10`), `DEFAULT_VIEW_2D` (`core/scene`).
- Produces: `geometryStateToJsonState(state: State): string`

Trang landing nhận `state` từ `handleGenerateFigure` nhưng không có `View2D` để gọi `serializeBoard`. Helper này lấy view từ `state.meta.view` khi `domain === '2d'`, else `DEFAULT_VIEW_2D`.

- [ ] **Step 1: Viết test thất bại**

Tạo `src/stamps/geometry-2d/__tests__/geometryStateToJsonState.test.ts`:

```ts
import { geometryStateToJsonState } from '../studio/geometryStateToJsonState';
import { deserializeBoard } from '../serialize';
import { createEmptyState, DEFAULT_VIEW_2D, type State } from '../../../core/scene';

describe('geometryStateToJsonState', () => {
  test('roundtrip: state → jsonState → state', () => {
    const state = createEmptyState('2d');
    const json = geometryStateToJsonState(state);
    const back = deserializeBoard(json);
    expect(back.objects).toEqual(state.objects);
    expect(back.order).toEqual(state.order);
    expect(back.meta.domain).toBe('2d');
  });

  test('giữ nguyên view có sẵn trong state.meta', () => {
    const base = createEmptyState('2d');
    const custom = { ...DEFAULT_VIEW_2D, showAxis: !DEFAULT_VIEW_2D.showAxis };
    const state: State = { ...base, meta: { domain: '2d', version: base.meta.version, view: custom } };

    const back = deserializeBoard(geometryStateToJsonState(state));
    expect(back.meta.domain).toBe('2d');
    if (back.meta.domain === '2d') {
      expect(back.meta.view.showAxis).toBe(custom.showAxis);
    }
  });

  test('dùng DEFAULT_VIEW_2D khi state không phải domain 2d', () => {
    const state = createEmptyState('graph2d');
    const back = deserializeBoard(geometryStateToJsonState(state));
    expect(back.meta.domain).toBe('2d');
    if (back.meta.domain === '2d') {
      expect(back.meta.view).toEqual(DEFAULT_VIEW_2D);
    }
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `npx jest src/stamps/geometry-2d/__tests__/geometryStateToJsonState.test.ts`
Expected: FAIL — `Cannot find module '../studio/geometryStateToJsonState'`.

- [ ] **Step 3: Implement**

Tạo `src/stamps/geometry-2d/studio/geometryStateToJsonState.ts`:

```ts
import { serializeBoard } from '../serialize';
import { DEFAULT_VIEW_2D, type State } from '../../../core/scene';

/**
 * `State` → chuỗi `jsonState` dùng được cho `deserializeBoard`,
 * `renderGeometrySvgFromState`, `GeometryStudio.initialJsonState` và
 * `insertGeometryStampIntoScene`.
 *
 * Tồn tại vì `serializeBoard` đòi thêm `View2D` mà consumer (trang landing,
 * chỉ có `state` từ `handleGenerateFigure`) không cầm sẵn.
 */
export function geometryStateToJsonState(state: State): string {
  const view = state.meta.domain === '2d' ? state.meta.view : DEFAULT_VIEW_2D;
  return serializeBoard(state, view);
}
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `npx jest src/stamps/geometry-2d/__tests__/geometryStateToJsonState.test.ts`
Expected: 3 test PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/studio/geometryStateToJsonState.ts src/stamps/geometry-2d/__tests__/geometryStateToJsonState.test.ts
git commit -m "feat(geometry-2d): thêm geometryStateToJsonState (State → jsonState)"
```

---

### Task 4: `insertGeometryStampIntoScene`

**Files:**
- Create: `src/stamps/geometry-2d/insertGeometryStamp.ts`
- Test: `src/stamps/geometry-2d/__tests__/insertGeometryStamp.test.ts`

**Interfaces:**
- Consumes: `renderGeometrySvgFromState(jsonState)` (`geometry-2d/render.ts:99`), `insertStampImage(api, opts)` (`shared/insertImage.ts:109`).
- Produces: `insertGeometryStampIntoScene(api: unknown, jsonState: string): Promise<void>`

Trang `/whiteboard` bên hoctotbachkhoa đọc `jsonState` từ sessionStorage rồi cần chèn thành stamp. `insertStampImage` không nằm trong public API — helper này là mảnh nối.

- [ ] **Step 1: Viết test thất bại**

Tạo `src/stamps/geometry-2d/__tests__/insertGeometryStamp.test.ts`:

```ts
import { insertGeometryStampIntoScene } from '../insertGeometryStamp';

jest.mock('../render', () => ({
  renderGeometrySvgFromState: jest.fn().mockResolvedValue('<svg width="10" height="10"/>'),
}));

const insertStampImage = jest.fn().mockResolvedValue({ fileId: 'f1' });
jest.mock('../../shared/insertImage', () => ({
  insertStampImage: (...args: unknown[]) => insertStampImage(...args),
}));

describe('insertGeometryStampIntoScene', () => {
  beforeEach(() => {
    insertStampImage.mockClear();
  });

  test('render SVG từ jsonState rồi gọi insertStampImage', async () => {
    const api = { addFiles: jest.fn(), updateScene: jest.fn(), getSceneElements: () => [] };
    await insertGeometryStampIntoScene(api, '{"objects":{}}');

    expect(insertStampImage).toHaveBeenCalledTimes(1);
    const [passedApi, opts] = insertStampImage.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(passedApi).toBe(api);
    expect(opts.svgString).toBe('<svg width="10" height="10"/>');
    expect(opts.editingElementId).toBeNull();
  });

  test('customData mang đúng kind + jsonState để re-edit được', async () => {
    const api = { addFiles: jest.fn(), updateScene: jest.fn(), getSceneElements: () => [] };
    await insertGeometryStampIntoScene(api, '{"objects":{}}');

    const [, opts] = insertStampImage.mock.calls[0] as [unknown, { makeCustomData: () => unknown }];
    expect(opts.makeCustomData()).toEqual({
      kind: 'geometry',
      version: 1,
      jsonState: '{"objects":{}}',
    });
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `npx jest src/stamps/geometry-2d/__tests__/insertGeometryStamp.test.ts`
Expected: FAIL — `Cannot find module '../insertGeometryStamp'`.

- [ ] **Step 3: Implement**

Tạo `src/stamps/geometry-2d/insertGeometryStamp.ts`:

```ts
import { renderGeometrySvgFromState } from './render';
import { insertStampImage } from '../shared/insertImage';
import type { GeometryCustomData } from './types';

/**
 * Chèn một hình học (dạng `jsonState`) vào Excalidraw scene như một stamp
 * re-edit được. Dùng cho handoff "Mở trong bảng trắng": trang landing ghi
 * `jsonState` vào sessionStorage, trang /whiteboard đọc ra rồi gọi hàm này.
 *
 * `api` là `ExcalidrawImperativeAPI` — để `unknown` ở public API cho consumer
 * không phải khớp type Excalidraw.
 */
export async function insertGeometryStampIntoScene(
  api: unknown,
  jsonState: string,
): Promise<void> {
  const svgString = await renderGeometrySvgFromState(jsonState);
   
  await insertStampImage(api as any, {
    svgString,
    makeCustomData: (): GeometryCustomData => ({
      kind: 'geometry',
      version: 1,
      jsonState,
    }),
    editingElementId: null,
  });
}
```

`preserveExistingSize` cố ý KHÔNG truyền: nó chỉ có nghĩa khi re-edit (`shared/insertImage.ts:22-23`), còn đây luôn là chèn mới.

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `npx jest src/stamps/geometry-2d/__tests__/insertGeometryStamp.test.ts`
Expected: 2 test PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/insertGeometryStamp.ts src/stamps/geometry-2d/__tests__/insertGeometryStamp.test.ts
git commit -m "feat(geometry-2d): thêm insertGeometryStampIntoScene cho handoff sang bảng trắng"
```

---

### Task 5: Subpath `@xom11/whiteboard/studio`

**Files:**
- Create: `src/stamps/geometry-2d/studio/index.ts`
- Modify: `tsup.config.ts`
- Modify: `package.json` (`exports`)
- Modify: `src/index.ts` (thêm `insertGeometryStampIntoScene`)

**Interfaces:**
- Consumes: Task 2 (`GeometryStudio`), Task 3 (`geometryStateToJsonState`), Task 4 (`insertGeometryStampIntoScene`).
- Produces: subpath `@xom11/whiteboard/studio` export `GeometryStudio`, `GeometryStudioProps`, `renderGeometrySvgFromState`, `geometryStateToJsonState`. Root export thêm `insertGeometryStampIntoScene`.

**KHÔNG được export `GeometryStudio` từ `src/stamps/geometry-2d/index.tsx`** — file đó nằm trên đường `src/index.ts` → `stamps/index.ts`, và `Host` ở đó cố tình bọc `React.lazy` (`geometry-2d/index.tsx:17`) để editor không vào bundle gốc. Một export tĩnh sẽ phá điều đó.

- [ ] **Step 1: Tạo barrel `src/stamps/geometry-2d/studio/index.ts`**

```ts
// Subpath @xom11/whiteboard/studio — editor hình học 2D dùng được ngoài Excalidraw.
// KHÔNG re-export từ đây vào ../index.tsx (sẽ kéo editor vào bundle gốc).

export { GeometryStudio, type GeometryStudioProps } from './GeometryStudio';
export { geometryStateToJsonState } from './geometryStateToJsonState';
export { renderGeometrySvgFromState } from '../render';
```

- [ ] **Step 2: Thêm entry vào `tsup.config.ts`**

Trong object `entry`, thêm một dòng sau `'graph-2d'`:

```ts
    studio: 'src/stamps/geometry-2d/studio/index.ts',
```

- [ ] **Step 3: Thêm subpath vào `package.json` → `exports`**

Chèn sau block `"./graph-2d"`:

```json
    "./studio": {
      "types": "./dist/studio.d.ts",
      "import": "./dist/studio.mjs",
      "require": "./dist/studio.js"
    },
```

- [ ] **Step 4: Export `insertGeometryStampIntoScene` từ root**

Trong `src/index.ts`, sau block export PDF, thêm:

```ts
// Chèn hình học (jsonState) vào scene — dùng cho handoff từ trang standalone.
export { insertGeometryStampIntoScene } from './stamps/geometry-2d/insertGeometryStamp';
```

- [ ] **Step 5: Build + kiểm tra artifact**

Run:
```bash
npm run build && ls -la dist/studio.mjs dist/studio.d.ts && node -e "const s=require('fs').readFileSync('dist/studio.mjs','utf8'); console.log('excalidraw:', s.includes('@excalidraw')); console.log('bytes:', s.length)"
```
Expected: cả hai file tồn tại; `excalidraw: false`.

- [ ] **Step 6: Kiểm tra `geometry-2d.mjs` vẫn là shim mỏng**

Run:
```bash
node -e "const s=require('fs').readFileSync('dist/geometry-2d.mjs','utf8'); console.log('bytes:', s.length, 'excalidraw:', s.includes('@excalidraw'), 'jsxgraph:', s.includes('jsxgraph'))"
```
Expected: `bytes` vẫn cỡ vài trăm (baseline 459), `excalidraw: false`, `jsxgraph: false`.

Nếu `bytes` nhảy lên hàng chục KB ⇒ editor đã rơi vào bundle gốc ⇒ DỪNG, kiểm tra lại xem có ai re-export `GeometryStudio` từ `geometry-2d/index.tsx` không.

- [ ] **Step 7: Full suite + typecheck**

Run: `npm test && npm run typecheck`
Expected: xanh.

- [ ] **Step 8: Commit**

```bash
git add tsup.config.ts package.json src/index.ts src/stamps/geometry-2d/studio/index.ts
git commit -m "feat(build): subpath @xom11/whiteboard/studio + export insertGeometryStampIntoScene

Entry riêng để GeometryStudio KHÔNG rơi vào bundle gốc — geometry-2d/index.tsx
dùng React.lazy có chủ đích."
```

---

### Task 6: Cổng bundle

**Files:**
- Create: `scripts/check-bundle-boundaries.mjs`
- Modify: `package.json` (script `check:bundle`, `prepublishOnly`)
- Modify: `.github/workflows/release.yml`

**Interfaces:**
- Consumes: `dist/` sau `npm run build`.
- Produces: lệnh `npm run check:bundle`, thoát mã 1 khi vi phạm.

Repo chỉ có `release.yml` (trigger `workflow_dispatch`), không có CI on-push. Nên cổng gắn vào **cả** `prepublishOnly` (chặn publish hỏng) và một step tường minh trong `release.yml` (báo lỗi sớm, trước `semantic-release`).

- [ ] **Step 1: Viết script**

Tạo `scripts/check-bundle-boundaries.mjs`:

```js
// Cổng bundle: khoá hai bất biến kích thước/phụ thuộc sau mỗi build.
//
//  1. dist/studio.mjs KHÔNG được chứa "@excalidraw" — trang landing standalone
//     không bao giờ được kéo Excalidraw vào.
//  2. dist/geometry-2d.mjs phải giữ nguyên dạng shim mỏng (Host bọc React.lazy).
//     Nếu ai đó re-export GeometryStudio từ geometry-2d/index.tsx, file này
//     phình lên và MỌI consumer <Whiteboard> phải tải cả editor.
//
// Baseline đo ngày 2026-07-10: geometry-2d.mjs = 459 byte.
import { readFileSync, existsSync } from 'node:fs';

const SHIM_MAX_BYTES = 4096; // baseline 459B, nới rộng cho thay đổi lành tính

const checks = [
  {
    file: 'dist/studio.mjs',
    forbid: ['@excalidraw'],
    maxBytes: null,
  },
  {
    file: 'dist/geometry-2d.mjs',
    forbid: ['@excalidraw', 'jsxgraph'],
    maxBytes: SHIM_MAX_BYTES,
  },
];

const failures = [];

for (const { file, forbid, maxBytes } of checks) {
  if (!existsSync(file)) {
    failures.push(`${file}: KHÔNG tồn tại — chạy \`npm run build\` trước.`);
    continue;
  }
  const src = readFileSync(file, 'utf8');

  for (const needle of forbid) {
    if (src.includes(needle)) {
      failures.push(`${file}: chứa "${needle}" — vi phạm ranh giới bundle.`);
    }
  }

  if (maxBytes !== null && src.length > maxBytes) {
    failures.push(
      `${file}: ${src.length} byte > ngưỡng ${maxBytes}. ` +
        `Nghi ngờ có export tĩnh kéo editor vào bundle gốc (React.lazy bị phá).`,
    );
  }
}

if (failures.length > 0) {
  console.error('\n[check-bundle-boundaries] THẤT BẠI:\n');
  for (const f of failures) console.error('  ✗ ' + f);
  console.error('');
  process.exit(1);
}

console.log('[check-bundle-boundaries] OK — ranh giới bundle nguyên vẹn.');
```

- [ ] **Step 2: Chạy để xác nhận PASS trên cây hiện tại**

Run: `npm run build && node scripts/check-bundle-boundaries.mjs`
Expected: `[check-bundle-boundaries] OK — ranh giới bundle nguyên vẹn.`

- [ ] **Step 3: Chứng minh cổng thật sự bắt được vi phạm**

Tạm thêm dòng này vào cuối `src/stamps/geometry-2d/index.tsx`:
```ts
export { GeometryStudio } from './studio/GeometryStudio';
```

Run: `npm run build && node scripts/check-bundle-boundaries.mjs`
Expected: EXIT 1, in ra `dist/geometry-2d.mjs: ... byte > ngưỡng 4096`.

Sau đó **xoá dòng vừa thêm** và chạy lại để về trạng thái OK:
Run: `npm run build && node scripts/check-bundle-boundaries.mjs`
Expected: OK.

(Bước này bắt buộc — một cổng chưa bao giờ đỏ là một cổng chưa được kiểm chứng.)

- [ ] **Step 4: Nối vào `package.json`**

Thêm script:
```json
    "check:bundle": "node scripts/check-bundle-boundaries.mjs",
```

Đổi:
```json
    "prepublishOnly": "npm run clean && npm run build"
```
thành:
```json
    "prepublishOnly": "npm run clean && npm run build && npm run check:bundle"
```

- [ ] **Step 5: Nối vào `release.yml`**

Trong `.github/workflows/release.yml`, chèn sau step `- run: npm test`:

```yaml
      - run: npm run build
      - run: npm run check:bundle
```

- [ ] **Step 6: Chạy lại toàn bộ**

Run: `npm run build && npm run check:bundle && npm test && npm run typecheck`
Expected: tất cả xanh.

- [ ] **Step 7: Commit**

```bash
git add scripts/check-bundle-boundaries.mjs package.json .github/workflows/release.yml
git commit -m "ci(bundle): cổng khoá ranh giới bundle studio/geometry-2d

studio.mjs không được chứa @excalidraw; geometry-2d.mjs phải giữ dạng shim
mỏng (<4KB) để React.lazy tiếp tục giữ editor ngoài bundle gốc."
```

---

### Task 7: Đo p95 `handleGenerateFigure` (spec §8.1)

**Files:**
- Create: `scripts/measure-figure-perf.ts`
- Modify: `package.json` (script `perf:figure`)

**Interfaces:**
- Consumes: `handleGenerateFigure` (`src/stamps/geometry-2d/ai/handleGenerateFigure.ts`), dataset `docs/datasets/tong-hop-hinh-phang-vao10-2018-2019.txt`.
- Produces: lệnh `npm run perf:figure` in ra p50/p95/max (ms) + số bài.

Rule engine chạy đồng bộ trên main thread. Đây là bước **đo**, không tối ưu. Nếu p95 > 100ms thì mở task Web Worker ở Mức 2; nếu không, đóng rủi ro.

- [ ] **Step 1: Viết script đo**

Tạo `scripts/measure-figure-perf.ts`:

```ts
// Đo thời gian handleGenerateFigure trên dataset đề vào-10.
// Rule engine là CPU thuần chạy đồng bộ → nếu p95 cao sẽ làm khựng UI trang
// landing. Đây là bước ĐO (spec 2026-07-10 §8.1), không phải bước tối ưu.
//
//   npm run perf:figure
import { readFileSync } from 'node:fs';
import { handleGenerateFigure } from '../src/stamps/geometry-2d/ai/handleGenerateFigure';

const FILE = 'docs/datasets/tong-hop-hinh-phang-vao10-2018-2019.txt';
const HEAD_RE = /^Câu\s+(\d+):/;

/** Cắt phần dựng hình (trước "Chứng minh"/"Tính"/"a)") — giống scripts/diag-all.ts. */
function introBeforeProof(text: string): string {
  const idx = text.search(/(Chứng minh|Chứng tỏ|CMR|C\/m|Tính|Gọi[^.]*\?|(?<![\p{L}])a\))/iu);
  return (idx >= 0 ? text.slice(0, idx) : text).trim();
}

function parseProblems(raw: string): string[] {
  const out: string[] = [];
  let cur: string | null = null;
  for (const line of raw.split('\n')) {
    if (HEAD_RE.test(line)) {
      if (cur !== null) out.push(cur);
      cur = line.replace(HEAD_RE, '').trim();
    } else if (cur !== null) {
      cur += '\n' + line;
    }
  }
  if (cur !== null) out.push(cur);
  return out;
}

function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

async function main() {
  const problems = parseProblems(readFileSync(FILE, 'utf8')).map(introBeforeProof);
  const timings: number[] = [];

  for (const problem of problems) {
    if (!problem) continue;
    const t0 = performance.now();
    await handleGenerateFigure({ problem });
    timings.push(performance.now() - t0);
  }

  timings.sort((a, b) => a - b);
  const fmt = (n: number) => n.toFixed(1).padStart(7);

  console.log(`\nĐo handleGenerateFigure trên ${timings.length} đề (${FILE})\n`);
  console.log(`  p50 ${fmt(quantile(timings, 0.5))} ms`);
  console.log(`  p95 ${fmt(quantile(timings, 0.95))} ms`);
  console.log(`  max ${fmt(timings[timings.length - 1])} ms`);
  console.log(`\nNgưỡng spec §8.1: p95 > 100ms ⇒ cân nhắc Web Worker ở Mức 2.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Thêm script vào `package.json`**

```json
    "perf:figure": "tsx scripts/measure-figure-perf.ts",
```

- [ ] **Step 3: Chạy và ghi lại số đo**

Run: `npm run perf:figure`
Expected: in ra p50/p95/max trên ~118 đề, không ném lỗi.

- [ ] **Step 4: Ghi kết luận vào spec**

Mở `docs/superpowers/specs/2026-07-10-standalone-figure-page-design.md`, mục `### 8.1`, thêm một dòng ở cuối với số đo thật, theo mẫu:

```markdown
**Đo ngày <YYYY-MM-DD>:** p50 = <x> ms, p95 = <y> ms, max = <z> ms trên 118 đề.
Kết luận: <ĐÓNG rủi ro (p95 < 100ms)> hoặc <MỞ task Web Worker ở Mức 2 (p95 ≥ 100ms)>.
```

- [ ] **Step 5: Commit**

```bash
git add scripts/measure-figure-perf.ts package.json docs/superpowers/specs/2026-07-10-standalone-figure-page-design.md
git commit -m "perf(ai): script đo p95 handleGenerateFigure trên dataset vao10

Đóng/mở rủi ro §8.1 của spec bằng số đo thật thay vì phỏng đoán."
```

---

## Ngoài phạm vi plan này

Thuộc repo `hoctotbachkhoa`, dùng hợp đồng API mà plan này tạo ra:

- Trang `/ve-hinh`: máy trạng thái `idle → generating → (figure | error)`, `figure → editing`.
- Chuyển SVG → PNG bằng canvas (spec §4.4 — jsdom không có `canvas.toBlob` nên không test được ở repo này).
- Handoff sessionStorage khoá `htbk:figure-handoff:v1`, xoá sau khi đọc, bỏ qua bản ghi > 5 phút.
- Banner miss dùng **nguyên văn** `partial.message`.
- Telemetry qua `onResult(result, attempt)` → log `reason` + nguyên văn đề.
- Đo gzip route sau `next build` (spec §8.2). Nếu phần AI > 100KB gzip ⇒ mở task thêm entry gọn `@xom11/whiteboard/ai/figure`.

Cũng ngoài phạm vi Mức 1: OCR ảnh, LLM fallback, share link, DB, đăng nhập, 118 trang SEO, hình học 3D.
