# Tangent Rework + Shared Toast — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement shared toast infrastructure for stamp editors, then rework geometry-2d tangent tool to handle 3 cases (P inside circle → toast; P on → 1 line; P outside → 2 lines).

**Architecture:** Per-editor `<ToastProvider>` + `<ToastHost />` mounts in each EditorPanel root. Tangent gains `branch?: 0 | 1 | 'on'` discriminator in `LineConstruction`; render dispatches via Thales-circle intersection (branch 0/1) or glider-at-P tangent (branch 'on'). `finalizeShape` classifies P vs circle and dispatches 0/1/2 ADDs accordingly.

**Tech Stack:** React 18 + TypeScript, Tailwind v4, JSXGraph 1.12, Jest 29 + jsdom + ts-jest.

**Spec:** `docs/superpowers/specs/2026-05-22-tangent-and-toast-design.md`

---

## Part 1 — Shared Toast Infrastructure

### Task 1: Toast types

**Files:**
- Create: `src/stamps/shared/Toast/types.ts`

- [ ] **Step 1: Write types module**

```ts
// src/stamps/shared/Toast/types.ts
export type ToastVariant = 'info' | 'warning' | 'error';

export interface ToastOptions {
  /** Color/icon family. Default: 'info'. */
  variant?: ToastVariant;
  /** Auto-dismiss delay in ms. Default: 3000. Pass 0 to make sticky. */
  duration?: number;
  /**
   * Stable id for dedup. If a visible toast already has this id, its message
   * is replaced and timer reset — no duplicate is pushed.
   */
  id?: string;
}

export type ShowToastFn = (message: string, opts?: ToastOptions) => void;
export type DismissToastFn = (id: string) => void;

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS (file is self-contained types, no consumers yet).

- [ ] **Step 3: Commit**

```bash
git add src/stamps/shared/Toast/types.ts
git commit -m "feat(shared/Toast): types module"
```

---

### Task 2: ToastProvider + useToast hook (TDD)

**Files:**
- Create: `src/stamps/shared/Toast/ToastProvider.tsx`
- Create: `src/stamps/shared/Toast/useToast.ts`
- Test: `src/stamps/shared/Toast/__tests__/ToastProvider.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// src/stamps/shared/Toast/__tests__/ToastProvider.test.tsx
import React from 'react';
import { act, render, renderHook } from '@testing-library/react';
import { ToastProvider } from '../ToastProvider';
import { useToast } from '../useToast';

function wrap(maxVisible?: number) {
  return ({ children }: { children: React.ReactNode }) => (
    <ToastProvider maxVisible={maxVisible}>{children}</ToastProvider>
  );
}

describe('ToastProvider + useToast', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test('showToast adds item to queue (via useToast)', () => {
    const { result } = renderHook(() => useToast(), { wrapper: wrap() });
    act(() => result.current.showToast('hello'));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].message).toBe('hello');
    expect(result.current.items[0].variant).toBe('info');
  });

  test('auto-dismiss after duration', () => {
    const { result } = renderHook(() => useToast(), { wrapper: wrap() });
    act(() => result.current.showToast('bye', { duration: 1000 }));
    expect(result.current.items).toHaveLength(1);
    act(() => { jest.advanceTimersByTime(1000); });
    expect(result.current.items).toHaveLength(0);
  });

  test('duration=0 makes toast sticky', () => {
    const { result } = renderHook(() => useToast(), { wrapper: wrap() });
    act(() => result.current.showToast('stay', { duration: 0 }));
    act(() => { jest.advanceTimersByTime(10000); });
    expect(result.current.items).toHaveLength(1);
  });

  test('dismiss(id) removes immediately', () => {
    const { result } = renderHook(() => useToast(), { wrapper: wrap() });
    act(() => result.current.showToast('x', { id: 'a', duration: 0 }));
    act(() => result.current.dismiss('a'));
    expect(result.current.items).toHaveLength(0);
  });

  test('queue overflow drops oldest', () => {
    const { result } = renderHook(() => useToast(), { wrapper: wrap(2) });
    act(() => {
      result.current.showToast('1', { duration: 0 });
      result.current.showToast('2', { duration: 0 });
      result.current.showToast('3', { duration: 0 });
    });
    expect(result.current.items.map((i) => i.message)).toEqual(['2', '3']);
  });

  test('dedup by id resets timer instead of stacking', () => {
    const { result } = renderHook(() => useToast(), { wrapper: wrap() });
    act(() => result.current.showToast('first', { id: 'k', duration: 1000 }));
    act(() => { jest.advanceTimersByTime(500); });
    act(() => result.current.showToast('second', { id: 'k', duration: 1000 }));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].message).toBe('second');
    act(() => { jest.advanceTimersByTime(700); }); // 500 + 700 = 1200, but timer was reset at 500
    expect(result.current.items).toHaveLength(1);
    act(() => { jest.advanceTimersByTime(500); }); // total since reset: 1200
    expect(result.current.items).toHaveLength(0);
  });

  test('useToast outside provider throws', () => {
    expect(() => renderHook(() => useToast())).toThrow(/ToastProvider/);
  });

  test('renders children unchanged', () => {
    const { getByText } = render(
      <ToastProvider><div>child</div></ToastProvider>
    );
    expect(getByText('child')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/stamps/shared/Toast/__tests__/ToastProvider.test.tsx`
Expected: FAIL — `Cannot find module '../ToastProvider'`.

- [ ] **Step 3: Implement ToastProvider**

```tsx
// src/stamps/shared/Toast/ToastProvider.tsx
import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import type { ShowToastFn, DismissToastFn, ToastItem, ToastOptions } from './types';

interface ToastContextValue {
  items: ToastItem[];
  showToast: ShowToastFn;
  dismiss: DismissToastFn;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

type Action =
  | { type: 'PUSH'; item: ToastItem; maxVisible: number }
  | { type: 'REPLACE'; item: ToastItem }
  | { type: 'DISMISS'; id: string };

function reducer(state: ToastItem[], action: Action): ToastItem[] {
  switch (action.type) {
    case 'PUSH': {
      const next = [...state, action.item];
      return next.length > action.maxVisible ? next.slice(next.length - action.maxVisible) : next;
    }
    case 'REPLACE':
      return state.map((it) => (it.id === action.item.id ? action.item : it));
    case 'DISMISS':
      return state.filter((it) => it.id !== action.id);
  }
}

interface ToastProviderProps {
  children: React.ReactNode;
  /** Max simultaneously visible toasts. Default: 3. Pushing more drops oldest. */
  maxVisible?: number;
}

let autoIdCounter = 0;

export function ToastProvider({ children, maxVisible = 3 }: ToastProviderProps) {
  const [items, dispatch] = useReducer(reducer, [] as ToastItem[]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const clearTimer = useCallback((id: string) => {
    const t = timersRef.current.get(id);
    if (t) {
      clearTimeout(t);
      timersRef.current.delete(id);
    }
  }, []);

  const dismiss = useCallback<DismissToastFn>((id) => {
    clearTimer(id);
    dispatch({ type: 'DISMISS', id });
  }, [clearTimer]);

  const scheduleAutoDismiss = useCallback((id: string, duration: number) => {
    if (duration <= 0) return;
    const t = setTimeout(() => dismiss(id), duration);
    timersRef.current.set(id, t);
  }, [dismiss]);

  const showToast = useCallback<ShowToastFn>((message, opts: ToastOptions = {}) => {
    const variant = opts.variant ?? 'info';
    const duration = opts.duration ?? 3000;
    const id = opts.id ?? `toast-${++autoIdCounter}`;
    const item: ToastItem = { id, message, variant, duration };
    const existing = itemsRef.current.find((it) => it.id === id);
    if (existing) {
      clearTimer(id);
      dispatch({ type: 'REPLACE', item });
    } else {
      dispatch({ type: 'PUSH', item, maxVisible });
    }
    scheduleAutoDismiss(id, duration);
  }, [clearTimer, maxVisible, scheduleAutoDismiss]);

  useEffect(() => () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current.clear();
  }, []);

  const value = useMemo(() => ({ items, showToast, dismiss }), [items, showToast, dismiss]);
  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}
```

```ts
// src/stamps/shared/Toast/useToast.ts
import { useContext } from 'react';
import { ToastContext } from './ToastProvider';

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used inside <ToastProvider>');
  }
  return ctx;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/stamps/shared/Toast/__tests__/ToastProvider.test.tsx`
Expected: PASS, all 8 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/shared/Toast/ToastProvider.tsx src/stamps/shared/Toast/useToast.ts src/stamps/shared/Toast/__tests__/ToastProvider.test.tsx
git commit -m "feat(shared/Toast): ToastProvider + useToast hook"
```

---

### Task 3: Toast item component (TDD)

**Files:**
- Create: `src/stamps/shared/Toast/Toast.tsx`
- Test: `src/stamps/shared/Toast/__tests__/Toast.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// src/stamps/shared/Toast/__tests__/Toast.test.tsx
import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { Toast } from '../Toast';

describe('Toast item', () => {
  test('renders message + variant class', () => {
    const { container, getByText } = render(
      <Toast id="1" message="hello" variant="warning" onDismiss={() => {}} />
    );
    expect(getByText('hello')).toBeTruthy();
    expect(container.firstChild).toHaveProperty('className', expect.stringContaining('border-l-amber-500'));
  });

  test('clicking close button calls onDismiss with id', () => {
    const onDismiss = jest.fn();
    const { getByLabelText } = render(
      <Toast id="abc" message="x" variant="info" onDismiss={onDismiss} />
    );
    fireEvent.click(getByLabelText('Đóng thông báo'));
    expect(onDismiss).toHaveBeenCalledWith('abc');
  });

  test('error variant uses rose border', () => {
    const { container } = render(
      <Toast id="1" message="oops" variant="error" onDismiss={() => {}} />
    );
    expect(container.firstChild).toHaveProperty('className', expect.stringContaining('border-l-rose-500'));
  });
});
```

NOTE: The first test uses `toHaveProperty` instead of `toHaveClass` because we don't depend on jest-dom matchers being set up. If `@testing-library/jest-dom` is already configured in the project, you can switch to `toHaveClass('border-l-amber-500')`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/stamps/shared/Toast/__tests__/Toast.test.tsx`
Expected: FAIL — `Cannot find module '../Toast'`.

- [ ] **Step 3: Implement Toast component**

```tsx
// src/stamps/shared/Toast/Toast.tsx
import React from 'react';
import type { ToastVariant } from './types';

const VARIANT_CLASS: Record<ToastVariant, string> = {
  info: 'border-l-sky-500',
  warning: 'border-l-amber-500',
  error: 'border-l-rose-500',
};

const VARIANT_ICON: Record<ToastVariant, React.ReactNode> = {
  info: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  warning: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  error: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
};

interface ToastProps {
  id: string;
  message: string;
  variant: ToastVariant;
  onDismiss: (id: string) => void;
}

export function Toast({ id, message, variant, onDismiss }: ToastProps) {
  return (
    <div
      role="status"
      className={[
        'pointer-events-auto flex max-w-sm items-start gap-2 rounded-lg border-l-4 bg-white px-3 py-2 text-sm text-slate-800 shadow-md ring-1 ring-black/5',
        VARIANT_CLASS[variant],
      ].join(' ')}
    >
      <span className="mt-0.5 shrink-0 text-slate-500">{VARIANT_ICON[variant]}</span>
      <span className="flex-1 leading-snug">{message}</span>
      <button
        type="button"
        aria-label="Đóng thông báo"
        onClick={() => onDismiss(id)}
        className="-mr-1 ml-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700"
      >
        ×
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/stamps/shared/Toast/__tests__/Toast.test.tsx`
Expected: PASS, all 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/shared/Toast/Toast.tsx src/stamps/shared/Toast/__tests__/Toast.test.tsx
git commit -m "feat(shared/Toast): Toast item component"
```

---

### Task 4: ToastHost (queue renderer)

**Files:**
- Create: `src/stamps/shared/Toast/ToastHost.tsx`

- [ ] **Step 1: Implement ToastHost**

```tsx
// src/stamps/shared/Toast/ToastHost.tsx
import React from 'react';
import { Toast } from './Toast';
import { useToast } from './useToast';

/**
 * Renders the active toast queue. Mount once near the root of each stamp
 * EditorPanel (inside ToastProvider). Positions itself absolutely at
 * bottom-center of the nearest positioned ancestor.
 */
export function ToastHost() {
  const { items, dismiss } = useToast();
  if (items.length === 0) return null;
  return (
    <div
      aria-live="polite"
      className="pointer-events-none absolute inset-x-0 bottom-3 z-50 flex flex-col items-center gap-2"
    >
      {items.map((it) => (
        <Toast key={it.id} id={it.id} message={it.message} variant={it.variant} onDismiss={dismiss} />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/stamps/shared/Toast/ToastHost.tsx
git commit -m "feat(shared/Toast): ToastHost queue renderer"
```

---

### Task 5: Barrel export

**Files:**
- Create: `src/stamps/shared/Toast/index.ts`

- [ ] **Step 1: Write barrel**

```ts
// src/stamps/shared/Toast/index.ts
export { ToastProvider } from './ToastProvider';
export { ToastHost } from './ToastHost';
export { Toast } from './Toast';
export { useToast } from './useToast';
export type {
  ToastVariant,
  ToastOptions,
  ToastItem,
  ShowToastFn,
  DismissToastFn,
} from './types';
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/stamps/shared/Toast/index.ts
git commit -m "feat(shared/Toast): barrel"
```

---

## Part 2 — Wire ToastProvider into 3 stamp editors

### Task 6: Mount ToastProvider + Host in geometry-2d EditorPanel

**Files:**
- Modify: `src/stamps/geometry-2d/editor/EditorPanel.tsx`

The root `<div role="dialog">` is at line ~160. Already uses Tailwind `relative`-style positioning via flex; need to ensure it's `relative` so absolute ToastHost positions correctly.

- [ ] **Step 1: Inspect and confirm the root container**

Read `src/stamps/geometry-2d/editor/EditorPanel.tsx` around lines 159–250. Identify the outer `<div role="dialog">`.

- [ ] **Step 2: Wrap return with ToastProvider, add ToastHost, ensure root is relative**

Add import near the top:
```tsx
import { ToastProvider, ToastHost } from '../../shared/Toast';
```

Modify the className of the root `<div role="dialog">` to include `relative`:
```tsx
className={[
  isDark ? 'theme--dark ' : '',
  'relative flex flex-col overflow-hidden bg-white',  // ← add `relative`
  isMobile
    ? 'h-full w-full'
    : `${STAMP_PANEL_DESKTOP} rounded-lg border border-slate-300 shadow-2xl ring-1 ring-black/5`,
].join(' ')}
```

Wrap the return JSX:
```tsx
return (
  <ToastProvider>
    <div role="dialog" ...>
      {/* existing header + body */}
      ...
      <ToastHost />
    </div>
  </ToastProvider>
);
```

Place `<ToastHost />` as the LAST child inside the root `<div>` (after the body wrappers, before `</div>`).

- [ ] **Step 3: Verify typecheck + existing tests still pass**

Run: `npm run typecheck && npx jest src/stamps/geometry-2d/`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/stamps/geometry-2d/editor/EditorPanel.tsx
git commit -m "feat(geometry-2d): mount ToastProvider + ToastHost in EditorPanel"
```

---

### Task 7: Mount ToastProvider + Host in geometry-3d EditorPanel

**Files:**
- Modify: `src/stamps/geometry-3d/editor/EditorPanel.tsx`

- [ ] **Step 1: Apply same pattern as Task 6**

Add import:
```tsx
import { ToastProvider, ToastHost } from '../../shared/Toast';
```

Identify the root container `<div>` for the 3D editor. Add `relative` class. Wrap return with `<ToastProvider>`, place `<ToastHost />` as last child of the root `<div>`.

- [ ] **Step 2: Verify typecheck + existing 3d tests**

Run: `npm run typecheck && npx jest src/stamps/geometry-3d/`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/stamps/geometry-3d/editor/EditorPanel.tsx
git commit -m "feat(geometry-3d): mount ToastProvider + ToastHost in EditorPanel"
```

---

### Task 8: Mount ToastProvider + Host in graph-2d EditorPanel

**Files:**
- Modify: `src/stamps/graph-2d/editor/EditorPanel.tsx`

- [ ] **Step 1: Apply same pattern as Task 6**

Add import:
```tsx
import { ToastProvider, ToastHost } from '../../shared/Toast';
```

Identify the root container `<div>`. Add `relative` class. Wrap return with `<ToastProvider>`, place `<ToastHost />` as last child of the root.

- [ ] **Step 2: Verify typecheck + existing graph-2d tests**

Run: `npm run typecheck && npx jest src/stamps/graph-2d/`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/stamps/graph-2d/editor/EditorPanel.tsx
git commit -m "feat(graph-2d): mount ToastProvider + ToastHost in EditorPanel"
```

---

## Part 3 — Tangent Rework

### Task 9: Extend LineConstruction tangent with `branch` + dependsOn tests

**Files:**
- Modify: `src/core/scene/kinds/line.ts:14-20`
- Modify: `src/core/scene/kinds/__tests__/line.test.ts`

- [ ] **Step 1: Write failing test**

Add to `src/core/scene/kinds/__tests__/line.test.ts` inside the `construction discriminator` describe block:

```ts
test('dependsOn tangent ignores branch field', () => {
  const def = getKind('line');
  expect(def.dependsOn({
    construction: { kind: 'tangent', throughPoint: 'P', toCircle: 'C', branch: 0 },
  } as never)).toEqual(['P', 'C']);
  expect(def.dependsOn({
    construction: { kind: 'tangent', throughPoint: 'P', toCircle: 'C', branch: 1 },
  } as never)).toEqual(['P', 'C']);
  expect(def.dependsOn({
    construction: { kind: 'tangent', throughPoint: 'P', toCircle: 'C', branch: 'on' },
  } as never)).toEqual(['P', 'C']);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/core/scene/kinds/__tests__/line.test.ts`
Expected: FAIL — TypeScript may flag `branch: 0` as not assignable to current `LineConstruction['tangent']`. Test will fail to compile.

- [ ] **Step 3: Update LineConstruction tangent type**

In `src/core/scene/kinds/line.ts`, change:
```ts
  | { kind: 'tangent'; throughPoint: string; toCircle: string };
```
to:
```ts
  | { kind: 'tangent'; throughPoint: string; toCircle: string; branch?: 0 | 1 | 'on' };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/core/scene/kinds/__tests__/line.test.ts`
Expected: PASS, all 13 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/core/scene/kinds/line.ts src/core/scene/kinds/__tests__/line.test.ts
git commit -m "feat(scene/kinds/line): tangent gains optional branch discriminator"
```

---

### Task 10: Render branch 0|1 (Thales intersection)

**Files:**
- Modify: `src/core/scene/kinds/line.ts` (the `case 'tangent':` block in `render`)

- [ ] **Step 1: Replace tangent render branch**

Locate the `case 'tangent':` block in the `render:` function (lines ~123–137). Replace with:

```ts
      case 'tangent': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const through = ctx.resolveRef(c.throughPoint) as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const toCircle = ctx.resolveRef(c.toCircle) as any;
        const branch = c.branch ?? 'on';

        if (branch === 'on') {
          // P on circle: glider at P + JXG tangent element. Backward-compat
          // with legacy tangents stored before `branch` existed.
          const glider = board.create('glider', [through.X(), through.Y(), toCircle], {
            visible: false, withLabel: false, fixed: true, name: '',
          });
          const tangent = board.create('tangent', [glider], baseOpts);
          (tangent as Record<string, unknown>)._helpers = [glider];
          return tangent;
        }

        // branch 0 | 1: Thales-circle intersection.
        //   M = midpoint(O, P). Auxiliary circle with center M, radius |MP|
        //   passes through O and P. Its two intersections with the original
        //   circle are the tangent touch points (right angle ∠OTP).
        const center = toCircle.center;
        const mid = board.create('midpoint', [center, through], {
          visible: false, withLabel: false, fixed: true, name: '',
        });
        const thales = board.create('circle', [mid, through], {
          visible: false, withLabel: false, fixed: true,
          strokeOpacity: 0, fillOpacity: 0,
        });
        const touch = board.create('intersection', [thales, toCircle, branch], {
          visible: false, withLabel: false, fixed: true, name: '',
        });
        const tangent = board.create('line', [through, touch], {
          ...baseOpts, straightFirst: true, straightLast: true,
        });
        (tangent as Record<string, unknown>)._helpers = [mid, thales, touch];
        return tangent;
      }
```

- [ ] **Step 2: Verify typecheck + existing tests**

Run: `npm run typecheck && npx jest src/core/scene/kinds/__tests__/line.test.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/core/scene/kinds/line.ts
git commit -m "fix(scene/kinds/line): tangent render via Thales intersection (branch 0|1) + glider (on)"
```

---

### Task 11: `classifyPointVsCircle` helper (TDD)

**Files:**
- Create: `src/stamps/geometry-2d/editor/handlers/classifyPointVsCircle.ts`
- Test: `src/stamps/geometry-2d/editor/handlers/__tests__/classifyPointVsCircle.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/stamps/geometry-2d/editor/handlers/__tests__/classifyPointVsCircle.test.ts
import { classifyPointVsCircle } from '../classifyPointVsCircle';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mkPoint(x: number, y: number): any {
  return { X: () => x, Y: () => y };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mkCircle(cx: number, cy: number, r: number): any {
  return {
    center: mkPoint(cx, cy),
    Radius: () => r,
  };
}

describe('classifyPointVsCircle', () => {
  test('point strictly inside → inside', () => {
    expect(classifyPointVsCircle(mkPoint(0, 0), mkCircle(0, 0, 5))).toBe('inside');
    expect(classifyPointVsCircle(mkPoint(2, 1), mkCircle(0, 0, 5))).toBe('inside');
  });

  test('point exactly on circumference → on', () => {
    expect(classifyPointVsCircle(mkPoint(5, 0), mkCircle(0, 0, 5))).toBe('on');
    expect(classifyPointVsCircle(mkPoint(3, 4), mkCircle(0, 0, 5))).toBe('on');
  });

  test('point strictly outside → outside', () => {
    expect(classifyPointVsCircle(mkPoint(10, 0), mkCircle(0, 0, 5))).toBe('outside');
    expect(classifyPointVsCircle(mkPoint(0, 6), mkCircle(0, 0, 5))).toBe('outside');
  });

  test('within relative epsilon of circumference → on', () => {
    // r = 5, eps = 5e-6. d = 5 + 1e-7 → on
    expect(classifyPointVsCircle(mkPoint(5 + 1e-7, 0), mkCircle(0, 0, 5))).toBe('on');
  });

  test('null inputs → inside (defensive)', () => {
    expect(classifyPointVsCircle(null, mkCircle(0, 0, 5))).toBe('inside');
    expect(classifyPointVsCircle(mkPoint(0, 0), null)).toBe('inside');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/stamps/geometry-2d/editor/handlers/__tests__/classifyPointVsCircle.test.ts`
Expected: FAIL — `Cannot find module '../classifyPointVsCircle'`.

- [ ] **Step 3: Implement helper**

```ts
// src/stamps/geometry-2d/editor/handlers/classifyPointVsCircle.ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JxgObj = any;

export type PointVsCircle = 'inside' | 'on' | 'outside';

/**
 * Classify a JXG point's position relative to a JXG circle.
 *
 * Uses a relative epsilon (max(1e-9, 1e-6 * r)) for the on-circle check so
 * that user-snapped points (which may carry tiny floating-point error)
 * register as on the circle rather than just inside/outside.
 *
 * Defensive: if either argument is null/undefined, returns 'inside' so the
 * caller will refuse to draw rather than risk a wrong tangent.
 */
export function classifyPointVsCircle(point: JxgObj, circle: JxgObj): PointVsCircle {
  if (!point || !circle || !circle.center) return 'inside';
  const dx = point.X() - circle.center.X();
  const dy = point.Y() - circle.center.Y();
  const d = Math.hypot(dx, dy);
  const r = typeof circle.Radius === 'function' ? circle.Radius() : Number(circle.radius);
  if (!Number.isFinite(d) || !Number.isFinite(r)) return 'inside';
  const eps = Math.max(1e-9, 1e-6 * r);
  if (Math.abs(d - r) <= eps) return 'on';
  return d < r ? 'inside' : 'outside';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/stamps/geometry-2d/editor/handlers/__tests__/classifyPointVsCircle.test.ts`
Expected: PASS, all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/editor/handlers/classifyPointVsCircle.ts src/stamps/geometry-2d/editor/handlers/__tests__/classifyPointVsCircle.test.ts
git commit -m "feat(geometry-2d/handlers): classifyPointVsCircle helper"
```

---

### Task 12: Add `toast` field to HandlerCtx + wire from EditorPanel

**Files:**
- Modify: `src/stamps/geometry-2d/editor/handlers/ctx.ts`
- Modify: `src/stamps/geometry-2d/editor/EditorPanel.tsx`
- Modify: `src/stamps/geometry-2d/editor/MiniBoard.tsx` (where HandlerCtx is constructed)

- [ ] **Step 1: Add optional toast field to HandlerCtx**

In `src/stamps/geometry-2d/editor/handlers/ctx.ts`, add the import and field:

```ts
import type { ShowToastFn } from '../../../shared/Toast';
```

Inside the `HandlerCtx` interface, add (anywhere near `flashWarn`):
```ts
  /**
   * Stamp-editor toast. Optional because handler unit tests construct
   * HandlerCtx without a ToastProvider. Use for invalid-construction
   * feedback (e.g. tangent: P inside circle).
   */
  toast?: ShowToastFn;
```

- [ ] **Step 2: Identify HandlerCtx construction site**

Search MiniBoard.tsx for where `HandlerCtx` object literal is built (look for `flashWarn:`).

Run: `grep -n "flashWarn:" src/stamps/geometry-2d/editor/MiniBoard.tsx`

- [ ] **Step 3: Plumb `toast` from EditorPanel through MiniBoard into HandlerCtx**

In MiniBoard.tsx, add `toast` to the props interface (e.g. `MiniBoard2DProps`) as `toast?: ShowToastFn`. Pass it into the HandlerCtx construction site (`toast,` field).

In EditorPanel.tsx, call `useToast()` (inside the component body) and pass `showToast` as the `toast` prop on `<MiniBoard2D toast={showToast} ... />`.

Skeleton:
```tsx
// EditorPanel.tsx
import { useToast } from '../../shared/Toast';

// inside component body, after other hooks:
const { showToast } = useToast();

// in the JSX:
<MiniBoard2D
  // ...existing props
  toast={showToast}
/>
```

```tsx
// MiniBoard.tsx
import type { ShowToastFn } from '../../shared/Toast';

interface MiniBoard2DProps {
  // ...existing
  toast?: ShowToastFn;
}

// in component:
const { toast } = props; // or destructure

// where HandlerCtx is built:
const ctx: HandlerCtx = {
  // ...existing fields
  toast,
};
```

- [ ] **Step 4: Verify typecheck + existing tests**

Run: `npm run typecheck && npx jest src/stamps/geometry-2d/`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/editor/handlers/ctx.ts src/stamps/geometry-2d/editor/EditorPanel.tsx src/stamps/geometry-2d/editor/MiniBoard.tsx
git commit -m "feat(geometry-2d): wire toast into HandlerCtx"
```

---

### Task 13: Rework `finalizeShape` tangent (TDD)

**Files:**
- Create: `src/stamps/geometry-2d/editor/handlers/__tests__/finalizeShape.tangent.test.ts`
- Modify: `src/stamps/geometry-2d/editor/handlers/finalizeShape.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/stamps/geometry-2d/editor/handlers/__tests__/finalizeShape.tangent.test.ts
import { finalizeShape } from '../finalizeShape';
import type { HandlerCtx } from '../ctx';
import { TOOL_DEFS } from '../../tools';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mkPoint(x: number, y: number, id: string): any {
  return { X: () => x, Y: () => y, elType: 'point', _sceneId: id };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mkCircle(cx: number, cy: number, r: number, id: string): any {
  return {
    center: mkPoint(cx, cy, `${id}-center`),
    Radius: () => r,
    elType: 'circle',
    _sceneId: id,
  };
}

function makeCtx(point: unknown, circle: unknown) {
  const dispatched: unknown[] = [];
  const ctx = {
    pendingRef: { current: [point, circle] },
    pendingIdsRef: { current: ['P', 'C'] },
    store: { dispatch: (a: unknown) => dispatched.push(a) },
    nextLabel: (kind: string) => kind === 'line' ? 'l1' : 'X',
    toast: jest.fn(),
    // freshId pulled from utils — it reads counters off ctx
    sceneIdCounters: { current: { t: 0 } },
  } as unknown as HandlerCtx & { sceneIdCounters: { current: Record<string, number> } };
  return { ctx, dispatched, toast: ctx.toast as jest.Mock };
}

const tangentDef = TOOL_DEFS.find((t) => t.key === 'tangent')!;

describe('finalizeShape: tangent', () => {
  test('point inside circle → 0 ADDs + toast warning', () => {
    const p = mkPoint(0, 0, 'P');
    const c = mkCircle(0, 0, 5, 'C');
    const { ctx, dispatched, toast } = makeCtx(p, c);
    finalizeShape(ctx, tangentDef);
    expect(dispatched).toHaveLength(0);
    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast.mock.calls[0][0]).toMatch(/trong đường tròn/);
    expect(toast.mock.calls[0][1]?.variant).toBe('warning');
  });

  test('point on circle → 1 ADD with branch="on"', () => {
    const p = mkPoint(5, 0, 'P');
    const c = mkCircle(0, 0, 5, 'C');
    const { ctx, dispatched } = makeCtx(p, c);
    finalizeShape(ctx, tangentDef);
    expect(dispatched).toHaveLength(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const construction = (dispatched[0] as any).payload.obj.attrs.construction;
    expect(construction.kind).toBe('tangent');
    expect(construction.branch).toBe('on');
    expect(construction.throughPoint).toBe('P');
    expect(construction.toCircle).toBe('C');
  });

  test('point outside circle → 2 ADDs with branch 0 and 1', () => {
    const p = mkPoint(10, 0, 'P');
    const c = mkCircle(0, 0, 5, 'C');
    const { ctx, dispatched } = makeCtx(p, c);
    finalizeShape(ctx, tangentDef);
    expect(dispatched).toHaveLength(2);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const branches = dispatched.map((a) => (a as any).payload.obj.attrs.construction.branch);
    expect(branches.sort()).toEqual([0, 1]);
  });

  test('order-flexible picks (circle first, point second) still works', () => {
    const p = mkPoint(10, 0, 'P');
    const c = mkCircle(0, 0, 5, 'C');
    const { ctx, dispatched, toast } = makeCtx(c, p);
    ctx.pendingIdsRef.current = ['C', 'P'];
    finalizeShape(ctx, tangentDef);
    expect(toast).not.toHaveBeenCalled();
    expect(dispatched).toHaveLength(2);
  });
});
```

NOTE: the exact shape of `freshId` and `mkSceneObj` helpers may need a small adjustment if the test fails because of unwrapping internals. If `freshId` reads counters off a different ref (e.g. `ctx.idCountersRef`), inspect `utils.ts` and update the mock accordingly. Inspect via:

```
grep -n "function freshId\|function mkSceneObj" src/stamps/geometry-2d/editor/handlers/utils.ts
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/stamps/geometry-2d/editor/handlers/__tests__/finalizeShape.tangent.test.ts`
Expected: FAIL — tangent branch logic not implemented yet (current code creates 1 ADD without branch info).

- [ ] **Step 3: Update `finalizeShape` tangent case**

In `src/stamps/geometry-2d/editor/handlers/finalizeShape.ts`, add import:
```ts
import { classifyPointVsCircle } from './classifyPointVsCircle';
```

Replace the existing `case 'tangent':` block (lines ~80-93) with:

```ts
    case 'tangent': {
      const throughId = findPickIdByKind(ctx, 'point');
      const circleId = findPickIdByKind(ctx, 'circle');
      if (!throughId || !circleId) return;
      // Find the JXG objects from pendingRef to classify position. pendingRef
      // mirrors pendingIdsRef 1:1 so we can match by id index.
      const picks = ctx.pendingRef.current;
      const ids = ctx.pendingIdsRef.current;
      const through = picks[ids.indexOf(throughId)];
      const circle = picks[ids.indexOf(circleId)];
      const pos = classifyPointVsCircle(through, circle);
      if (pos === 'inside') {
        ctx.toast?.('Điểm nằm trong đường tròn — không có tiếp tuyến', {
          variant: 'warning',
          id: 'tangent-invalid-inside',
        });
        return;
      }
      if (pos === 'on') {
        const id = freshId(ctx, 't');
        const label = ctx.nextLabel('line');
        ctx.store.dispatch({
          type: 'ADD',
          payload: { obj: mkSceneObj(id, 'line', label, {
            construction: { kind: 'tangent', throughPoint: throughId, toCircle: circleId, branch: 'on' },
          }) },
        });
        return;
      }
      // outside → two scene elements, one per tangent branch
      for (const branch of [0, 1] as const) {
        const id = freshId(ctx, 't');
        const label = ctx.nextLabel('line');
        ctx.store.dispatch({
          type: 'ADD',
          payload: { obj: mkSceneObj(id, 'line', label, {
            construction: { kind: 'tangent', throughPoint: throughId, toCircle: circleId, branch },
          }) },
        });
      }
      return;
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/stamps/geometry-2d/editor/handlers/__tests__/finalizeShape.tangent.test.ts`
Expected: PASS, all 4 tests green.

If tests fail due to `freshId` or `mkSceneObj` accessing fields not in mock ctx, inspect `src/stamps/geometry-2d/editor/handlers/utils.ts` and extend `makeCtx` in the test with the required refs (most likely `sceneIdCountersRef` of some shape).

- [ ] **Step 5: Run the full geometry-2d test suite to confirm no regression**

Run: `npx jest src/stamps/geometry-2d/`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/stamps/geometry-2d/editor/handlers/finalizeShape.ts src/stamps/geometry-2d/editor/handlers/__tests__/finalizeShape.tangent.test.ts
git commit -m "fix(geometry-2d): tangent finalizeShape handles 3 cases (inside/on/outside)"
```

---

### Task 14: Update tangent icon

**Files:**
- Modify: `src/stamps/geometry-2d/editor/tools.tsx:209-216`

- [ ] **Step 1: Replace tangent icon SVG**

In `src/stamps/geometry-2d/editor/tools.tsx`, find the `tangent:` entry inside the `Icon` object (line ~209). Replace with:

```tsx
  tangent: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeLinecap="round">
      <circle cx="9" cy="14" r="5" stroke="currentColor" strokeWidth="1.5"/>
      {/* External point top-right with two tangent lines */}
      <line x1="20" y1="5" x2="11.1" y2="10.6" stroke={C_CONSTRUCT} strokeWidth="1.5"/>
      <line x1="20" y1="5" x2="13.5" y2="17.5" stroke={C_CONSTRUCT} strokeWidth="1.5"/>
      <circle cx="20" cy="5" r="1.7" fill={C_POINT}/>
      <circle cx="11.1" cy="10.6" r="1.1" fill={C_POINT}/>
      <circle cx="13.5" cy="17.5" r="1.1" fill={C_POINT}/>
    </svg>
  ),
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/stamps/geometry-2d/editor/tools.tsx
git commit -m "feat(geometry-2d/tools): tangent icon — external point + 2 tangents"
```

---

## Part 4 — Final verification

### Task 15: Full typecheck + test + manual smoke

- [ ] **Step 1: Run full typecheck**

Run: `npm run typecheck`
Expected: PASS, zero errors.

- [ ] **Step 2: Run full test suite**

Run: `npm test -- --watchAll=false`
Expected: All tests green, including new Toast + tangent tests.

- [ ] **Step 3: Manual browser smoke test**

Build + link, or run the consumer's dev server with this package's `npm run dev`. Open a whiteboard with geometry-2d stamp and verify:

| Scenario | Expected |
|---|---|
| Create circle, pick tangent tool, click point INSIDE circle | Toast "Điểm nằm trong đường tròn — không có tiếp tuyến" appears bottom-center; no line drawn |
| Click point ON circle | 1 tangent line drawn through the picked point, tangent to the circle |
| Click point OUTSIDE circle | 2 tangent lines drawn, each touching the circle at a different point and passing through the picked point |
| Drag external point inside → outside | Tangent lines disappear (NaN intersection), reappear when back outside |
| Reload page (sessionStorage restore) | New 2-tangent constructions restore correctly; legacy tangents still render as before (single line via 'on' branch) |
| Open geometry-3d / graph-2d editors | No tangent UI exists there, but ToastProvider mounted — no errors in console |

- [ ] **Step 4: If smoke passes, no commit needed (no code change in this step)**

If smoke reveals a bug, return to Phase 1 of systematic-debugging.

---

## Out of scope (do not implement)

- Mobile-specific toast positioning override.
- Tangent to ellipse or general conic.
- Migration script to fix existing externally-positioned tangent constructions in saved data.
- Refactoring `flashWarn` to use the new toast (left in place — separate concern, can be unified later).
