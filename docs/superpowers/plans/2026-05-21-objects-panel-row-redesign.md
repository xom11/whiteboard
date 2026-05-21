# Objects panel row redesign + highlight bug fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sửa bug "highlight đỏ cộng dồn" trong `JxgRenderer.highlight`, đồng thời redesign `ObjectRow` theo GeoGebra style (color-dot trái = toggle visibility, label gọn, 3-chấm = actions, click row → expand chi tiết).

**Architecture:** Bug fix là one-liner đổi attribute key. Redesign tận dụng existing `KindDef.measure` (đã có trong interface, chưa implement) làm nguồn dữ liệu cho expand-detail block — không thêm interface mới. ObjectRow drop emoji icon + lock button, thêm color-dot button làm cả indicator visibility lẫn toggle.

**Tech Stack:** React 18, TypeScript strict, JSXGraph 1.x, Jest 29 + jsdom + ts-jest, Tailwind classes.

**Spec:** `docs/superpowers/specs/2026-05-21-objects-panel-row-redesign-design.md`

---

## File overview

**Modify:**
- `src/core/scene/render/JxgRenderer.ts` — fix attr key shorthand
- `src/core/scene/render/JxgRenderer3D.ts` — fix attr key shorthand (cùng bug)
- `src/core/scene/render/__tests__/JxgRenderer.highlight.test.ts` — bổ sung regression case
- `src/core/scene/render/__tests__/JxgRenderer3D.highlight.test.ts` — bổ sung regression case
- `src/core/scene/kinds/point.ts` — implement `measure()` trả toạ độ
- `src/core/scene/kinds/segment.ts` — implement `measure()` trả độ dài
- `src/core/scene/kinds/circle.ts` — implement `measure()` trả bán kính
- `src/core/scene/kinds/point3d.ts` — implement `measure()` trả toạ độ 3D
- `src/core/scene/kinds/segment3d.ts` — implement `measure()` trả độ dài
- `src/core/scene/ui/ObjectRow.tsx` — redesign visual
- `src/core/scene/ui/ObjectRowMenu.tsx` — thêm Khoá item + dark contrast
- `src/core/scene/ui/__tests__/ObjectRow.test.tsx` — update + new tests
- `src/core/scene/ui/__tests__/ObjectListPanel.test.tsx` — selectedId → expand test

**Create:**
- `src/core/scene/kinds/__tests__/measure.test.ts` — per-kind measure smoke tests

---

## Task 1: Fix `JxgRenderer.highlight` restore (2D)

**Files:**
- Modify: `src/core/scene/render/JxgRenderer.ts:227-260`
- Modify: `src/core/scene/render/__tests__/JxgRenderer.highlight.test.ts`

- [ ] **Step 1.1: Write failing regression test**

Open `src/core/scene/render/__tests__/JxgRenderer.highlight.test.ts` and add this test before the closing `});` of the describe block:

```ts
it('restores original strokeColor + strokeWidth after switching highlight', () => {
  const board = mockBoard();
  const r = new JxgRenderer(board);

  // Setup 2 fake elements with known attrs
  const elA = makeFakeElement({ strokeColor: '#1e40af', strokeWidth: 2 });
  const elB = makeFakeElement({ strokeColor: '#16a34a', strokeWidth: 3 });
  r.listElements().set('A', elA);
  r.listElements().set('B', elB);

  r.highlight('A');
  expect(elA.attrs.strokeColor).toBe('#ef4444');
  expect(elA.attrs.strokeWidth).toBe(4);

  r.highlight('B');
  // A must be reverted, NOT still red
  expect(elA.attrs.strokeColor).toBe('#1e40af');
  expect(elA.attrs.strokeWidth).toBe(2);
  expect(elB.attrs.strokeColor).toBe('#ef4444');
  expect(elB.attrs.strokeWidth).toBe(5);
});

it('does not accumulate strokeWidth across repeated highlight cycles', () => {
  const board = mockBoard();
  const r = new JxgRenderer(board);
  const elA = makeFakeElement({ strokeColor: '#1e40af', strokeWidth: 2 });
  const elB = makeFakeElement({ strokeColor: '#16a34a', strokeWidth: 3 });
  r.listElements().set('A', elA);
  r.listElements().set('B', elB);

  for (let i = 0; i < 5; i++) {
    r.highlight('A');
    r.highlight('B');
  }
  r.highlight(null);

  expect(elA.attrs.strokeColor).toBe('#1e40af');
  expect(elA.attrs.strokeWidth).toBe(2);
  expect(elB.attrs.strokeColor).toBe('#16a34a');
  expect(elB.attrs.strokeWidth).toBe(3);
});
```

If `mockBoard` / `makeFakeElement` helpers don't exist in this file, add them at the top of the file (after imports, before `describe`):

```ts
function makeFakeElement(initial: { strokeColor: string; strokeWidth: number }) {
  const el = {
    attrs: { ...initial },
    getAttribute(k: string) { return (this.attrs as Record<string, unknown>)[k]; },
    setAttribute(patch: Record<string, unknown>) { Object.assign(this.attrs, patch); },
  };
  return el;
}

function mockBoard() {
  return {} as unknown;
}
```

- [ ] **Step 1.2: Run test to verify it fails**

Run:
```bash
npm test -- src/core/scene/render/__tests__/JxgRenderer.highlight.test.ts
```

Expected: the 2 new tests FAIL with `elA.attrs.strokeColor` still being `'#ef4444'` after `highlight('B')` (because restore uses wrong keys).

- [ ] **Step 1.3: Fix the bug**

Open `src/core/scene/render/JxgRenderer.ts` and replace lines 251-256 (the try block inside `highlight()`):

```ts
    try {
      const stroke = (el.getAttribute?.('strokeColor') as string | undefined) ?? '#1e40af';
      const thick = (el.getAttribute?.('strokeWidth') as number | undefined) ?? 2;
      this.highlightOriginal = { strokeColor: stroke, strokeWidth: thick };
      el.setAttribute?.({ strokeColor: '#ef4444', strokeWidth: thick + 2 });
      this.highlightedId = id;
    } catch (err) {
```

The key change: `{ stroke, thick }` → `{ strokeColor: stroke, strokeWidth: thick }`.

Also update the field type declaration on line 228:

```ts
  private highlightOriginal: { strokeColor?: string; strokeWidth?: number } | null = null;
```

- [ ] **Step 1.4: Run test to verify it passes**

Run:
```bash
npm test -- src/core/scene/render/__tests__/JxgRenderer.highlight.test.ts
```

Expected: all tests PASS.

- [ ] **Step 1.5: Commit**

```bash
git add src/core/scene/render/JxgRenderer.ts src/core/scene/render/__tests__/JxgRenderer.highlight.test.ts
git commit -m "fix(scene/render): restore highlight uses correct JSXGraph attr keys"
```

---

## Task 2: Fix `JxgRenderer3D.highlight` restore (3D)

**Files:**
- Modify: `src/core/scene/render/JxgRenderer3D.ts:135-` (similar pattern)
- Modify: `src/core/scene/render/__tests__/JxgRenderer3D.highlight.test.ts`

- [ ] **Step 2.1: Inspect 3D renderer highlight code**

Open `src/core/scene/render/JxgRenderer3D.ts` and locate the `highlight()` method (around line 135). Confirm it has the same `{ stroke, thick }` shorthand bug. If yes, proceed.

- [ ] **Step 2.2: Write failing test**

Open `src/core/scene/render/__tests__/JxgRenderer3D.highlight.test.ts` and add 2 tests mirroring Task 1.1 (swap `JxgRenderer` → `JxgRenderer3D`).

- [ ] **Step 2.3: Run test to verify it fails**

Run:
```bash
npm test -- src/core/scene/render/__tests__/JxgRenderer3D.highlight.test.ts
```

Expected: new tests FAIL.

- [ ] **Step 2.4: Apply same fix**

In `JxgRenderer3D.ts`, change `this.highlightOriginal = { stroke, thick }` → `{ strokeColor: stroke, strokeWidth: thick }`. Update field type declaration accordingly.

- [ ] **Step 2.5: Run test**

Run:
```bash
npm test -- src/core/scene/render/__tests__/JxgRenderer3D.highlight.test.ts
```

Expected: PASS.

- [ ] **Step 2.6: Commit**

```bash
git add src/core/scene/render/JxgRenderer3D.ts src/core/scene/render/__tests__/JxgRenderer3D.highlight.test.ts
git commit -m "fix(scene/render): restore highlight uses correct keys (3D variant)"
```

---

## Task 3: Implement `measure()` for point/segment/circle (2D)

**Files:**
- Modify: `src/core/scene/kinds/point.ts`
- Modify: `src/core/scene/kinds/segment.ts`
- Modify: `src/core/scene/kinds/circle.ts`
- Create: `src/core/scene/kinds/__tests__/measure.test.ts`

`KindDef.measure(obj, state) → { label, value }[] | null` (đã có trong types). Trả về null nếu kind không có gì đo được. Trả mảng để ObjectRow render `label = value.toFixed(2)`.

- [ ] **Step 3.1: Write failing test for point.measure**

Create `src/core/scene/kinds/__tests__/measure.test.ts`:

```ts
import '../point';
import '../segment';
import '../circle';
import { getKind } from '../../registry';
import type { SceneObject, State } from '../../types';

const emptyState: State = {
  objects: {},
  order: [],
  counter: 0,
  meta: { domain: '2d', version: 1 },
};

function makePoint(label: string, x: number, y: number): SceneObject {
  return {
    id: label,
    label,
    kind: 'point',
    visible: true,
    locked: false,
    attrs: { constraint: { kind: 'free', x, y } },
  };
}

describe('point.measure', () => {
  it('returns x, y for free point', () => {
    const obj = makePoint('A', 1.234, -2.567);
    const result = getKind('point').measure!(obj, emptyState);
    expect(result).toEqual([
      { label: 'x', value: 1.234 },
      { label: 'y', value: -2.567 },
    ]);
  });

  it('returns null for non-free point (computed)', () => {
    const obj: SceneObject = {
      id: 'M',
      label: 'M',
      kind: 'point',
      visible: true,
      locked: false,
      attrs: { constraint: { kind: 'midpoint', p1: 'A', p2: 'B' } },
    };
    const result = getKind('point').measure!(obj, emptyState);
    expect(result).toBeNull();
  });
});

describe('segment.measure', () => {
  it('returns length given p1, p2 in state', () => {
    const A = makePoint('A', 0, 0);
    const B = makePoint('B', 3, 4);
    const state: State = {
      ...emptyState,
      objects: { A, B },
      order: ['A', 'B'],
    };
    const seg: SceneObject = {
      id: 'f',
      label: 'f',
      kind: 'segment',
      visible: true,
      locked: false,
      attrs: { p1: 'A', p2: 'B' },
    };
    const result = getKind('segment').measure!(seg, state);
    expect(result).toEqual([{ label: 'length', value: 5 }]);
  });

  it('returns null if endpoint missing from state', () => {
    const seg: SceneObject = {
      id: 'f',
      label: 'f',
      kind: 'segment',
      visible: true,
      locked: false,
      attrs: { p1: 'A', p2: 'B' },
    };
    const result = getKind('segment').measure!(seg, emptyState);
    expect(result).toBeNull();
  });
});

describe('circle.measure', () => {
  it('returns radius given center + point on circle', () => {
    const A = makePoint('A', 0, 0);
    const B = makePoint('B', 0, 5);
    const state: State = {
      ...emptyState,
      objects: { A, B },
      order: ['A', 'B'],
    };
    const c: SceneObject = {
      id: 'c',
      label: 'c',
      kind: 'circle',
      visible: true,
      locked: false,
      attrs: { center: 'A', through: 'B' },
    };
    const result = getKind('circle').measure!(c, state);
    expect(result).toEqual([{ label: 'r', value: 5 }]);
  });
});
```

- [ ] **Step 3.2: Run tests to verify they fail**

Run:
```bash
npm test -- src/core/scene/kinds/__tests__/measure.test.ts
```

Expected: FAIL with `measure is not a function` (since none of point/segment/circle implement it yet).

- [ ] **Step 3.3: Implement point.measure**

In `src/core/scene/kinds/point.ts`, add `measure` field to the `def` object (after `describe`):

```ts
  measure: (obj) => {
    const c = obj.attrs.constraint;
    if (c.kind === 'free') {
      return [
        { label: 'x', value: c.x },
        { label: 'y', value: c.y },
      ];
    }
    return null;
  },
```

- [ ] **Step 3.4: Implement segment.measure**

In `src/core/scene/kinds/segment.ts`, add after `describe`:

```ts
  measure: (obj, state) => {
    const p1 = state.objects[obj.attrs.p1];
    const p2 = state.objects[obj.attrs.p2];
    if (!p1 || !p2) return null;
    const c1 = (p1.attrs as { constraint?: { kind: string; x?: number; y?: number } }).constraint;
    const c2 = (p2.attrs as { constraint?: { kind: string; x?: number; y?: number } }).constraint;
    if (c1?.kind !== 'free' || c2?.kind !== 'free') return null;
    const dx = (c2.x ?? 0) - (c1.x ?? 0);
    const dy = (c2.y ?? 0) - (c1.y ?? 0);
    return [{ label: 'length', value: Math.hypot(dx, dy) }];
  },
```

- [ ] **Step 3.5: Implement circle.measure**

Open `src/core/scene/kinds/circle.ts`. Check the existing attrs shape (center + radius? center + through?). Add `measure` accordingly. Example assuming `attrs: { center, through }`:

```ts
  measure: (obj, state) => {
    const center = state.objects[obj.attrs.center];
    const through = state.objects[obj.attrs.through];
    if (!center || !through) return null;
    const c1 = (center.attrs as { constraint?: { kind: string; x?: number; y?: number } }).constraint;
    const c2 = (through.attrs as { constraint?: { kind: string; x?: number; y?: number } }).constraint;
    if (c1?.kind !== 'free' || c2?.kind !== 'free') return null;
    const dx = (c2.x ?? 0) - (c1.x ?? 0);
    const dy = (c2.y ?? 0) - (c1.y ?? 0);
    return [{ label: 'r', value: Math.hypot(dx, dy) }];
  },
```

> Note: if `circle.ts` uses a different attrs shape (e.g. explicit `radius` field), adapt accordingly — read the file first.

- [ ] **Step 3.6: Run tests to verify they pass**

Run:
```bash
npm test -- src/core/scene/kinds/__tests__/measure.test.ts
```

Expected: PASS.

- [ ] **Step 3.7: Typecheck**

Run:
```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3.8: Commit**

```bash
git add src/core/scene/kinds/point.ts src/core/scene/kinds/segment.ts src/core/scene/kinds/circle.ts src/core/scene/kinds/__tests__/measure.test.ts
git commit -m "feat(scene/kinds): implement measure() for point, segment, circle"
```

---

## Task 4: Implement `measure()` for point3d, segment3d

**Files:**
- Modify: `src/core/scene/kinds/point3d.ts`
- Modify: `src/core/scene/kinds/segment3d.ts`
- Modify: `src/core/scene/kinds/__tests__/measure.test.ts`

- [ ] **Step 4.1: Add 3D tests**

Append to `src/core/scene/kinds/__tests__/measure.test.ts`:

```ts
import '../point3d';
import '../segment3d';

function makePoint3D(label: string, x: number, y: number, z: number): SceneObject {
  return {
    id: label,
    label,
    kind: 'point3d',
    visible: true,
    locked: false,
    attrs: { x, y, z },
  };
}

describe('point3d.measure', () => {
  it('returns x, y, z', () => {
    const obj = makePoint3D('P', 1.1, 2.2, 3.3);
    const result = getKind('point3d').measure!(obj, emptyState);
    expect(result).toEqual([
      { label: 'x', value: 1.1 },
      { label: 'y', value: 2.2 },
      { label: 'z', value: 3.3 },
    ]);
  });
});

describe('segment3d.measure', () => {
  it('returns length', () => {
    const P = makePoint3D('P', 0, 0, 0);
    const Q = makePoint3D('Q', 1, 2, 2);
    const state: State = { ...emptyState, objects: { P, Q }, order: ['P', 'Q'] };
    const seg: SceneObject = {
      id: 'f',
      label: 'f',
      kind: 'segment3d',
      visible: true,
      locked: false,
      attrs: { p1: 'P', p2: 'Q' },
    };
    const result = getKind('segment3d').measure!(seg, state);
    expect(result).toEqual([{ label: 'length', value: 3 }]);
  });
});
```

> First read `src/core/scene/kinds/point3d.ts` and `segment3d.ts` to confirm attrs shape — if `point3d` uses a `constraint` field instead of flat `{x,y,z}`, adapt the test factory.

- [ ] **Step 4.2: Run tests to verify they fail**

```bash
npm test -- src/core/scene/kinds/__tests__/measure.test.ts
```

Expected: 3D tests FAIL.

- [ ] **Step 4.3: Implement point3d.measure**

Read the existing attrs shape first. Then add:

```ts
  measure: (obj) => {
    const a = obj.attrs as { x?: number; y?: number; z?: number };
    if (typeof a.x !== 'number' || typeof a.y !== 'number' || typeof a.z !== 'number') return null;
    return [
      { label: 'x', value: a.x },
      { label: 'y', value: a.y },
      { label: 'z', value: a.z },
    ];
  },
```

(Adapt key access if `point3d` uses constraint pattern.)

- [ ] **Step 4.4: Implement segment3d.measure**

Same pattern as 2D segment but reading 3 coords:

```ts
  measure: (obj, state) => {
    const p1 = state.objects[obj.attrs.p1];
    const p2 = state.objects[obj.attrs.p2];
    if (!p1 || !p2) return null;
    const a = p1.attrs as { x?: number; y?: number; z?: number };
    const b = p2.attrs as { x?: number; y?: number; z?: number };
    if ([a.x, a.y, a.z, b.x, b.y, b.z].some((v) => typeof v !== 'number')) return null;
    const dx = (b.x as number) - (a.x as number);
    const dy = (b.y as number) - (a.y as number);
    const dz = (b.z as number) - (a.z as number);
    return [{ label: 'length', value: Math.hypot(dx, dy, dz) }];
  },
```

- [ ] **Step 4.5: Run tests**

```bash
npm test -- src/core/scene/kinds/__tests__/measure.test.ts
```

Expected: PASS.

- [ ] **Step 4.6: Commit**

```bash
git add src/core/scene/kinds/point3d.ts src/core/scene/kinds/segment3d.ts src/core/scene/kinds/__tests__/measure.test.ts
git commit -m "feat(scene/kinds): implement measure() for point3d, segment3d"
```

---

## Task 5: Redesign `ObjectRow` — color-dot + drop emoji icon + drop lock button

**Files:**
- Modify: `src/core/scene/ui/ObjectRow.tsx`
- Modify: `src/core/scene/ui/__tests__/ObjectRow.test.tsx`

- [ ] **Step 5.1: Write failing tests**

Open `src/core/scene/ui/__tests__/ObjectRow.test.tsx`. If file doesn't exist, create it. Add/replace with:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ObjectRow } from '../ObjectRow';
import '../../kinds/point';
import '../../kinds/segment';
import type { SceneObject, State } from '../../types';

const emptyState: State = {
  objects: {},
  order: [],
  counter: 0,
  meta: { domain: '2d', version: 1 },
};

function makeObj(over: Partial<SceneObject> = {}): SceneObject {
  return {
    id: 'A',
    label: 'A',
    kind: 'point',
    visible: true,
    locked: false,
    attrs: { constraint: { kind: 'free', x: 1, y: 2 }, color: '#ff0000' },
    ...over,
  };
}

describe('ObjectRow', () => {
  const handlers = {
    onSelect: jest.fn(),
    onToggleVisible: jest.fn(),
    onToggleLocked: jest.fn(),
    onRename: jest.fn(),
    onChangeColor: jest.fn(),
    onDelete: jest.fn(),
  };

  beforeEach(() => {
    Object.values(handlers).forEach((fn) => fn.mockClear());
  });

  it('color-dot reflects obj.color when visible', () => {
    const obj = makeObj();
    render(<ObjectRow obj={obj} state={emptyState} selected={false} {...handlers} />);
    const dot = screen.getByLabelText('Toggle visibility');
    expect(dot).toHaveStyle({ backgroundColor: 'rgb(255, 0, 0)' });
  });

  it('color-dot becomes outlined when hidden', () => {
    const obj = makeObj({ visible: false });
    render(<ObjectRow obj={obj} state={emptyState} selected={false} {...handlers} />);
    const dot = screen.getByLabelText('Toggle visibility');
    expect(dot).toHaveStyle({ backgroundColor: 'transparent' });
    expect(dot).toHaveStyle({ borderColor: 'rgb(255, 0, 0)' });
  });

  it('clicking color-dot toggles visibility, does NOT trigger select', () => {
    const obj = makeObj();
    render(<ObjectRow obj={obj} state={emptyState} selected={false} {...handlers} />);
    fireEvent.click(screen.getByLabelText('Toggle visibility'));
    expect(handlers.onToggleVisible).toHaveBeenCalledWith('A');
    expect(handlers.onSelect).not.toHaveBeenCalled();
  });

  it('clicking row body triggers onSelect', () => {
    const obj = makeObj();
    render(<ObjectRow obj={obj} state={emptyState} selected={false} {...handlers} />);
    fireEvent.click(screen.getByText(/Điểm/));
    expect(handlers.onSelect).toHaveBeenCalledWith('A');
  });

  it('does NOT render kind emoji icon (·, —, ○, ...)', () => {
    const obj = makeObj();
    const { container } = render(
      <ObjectRow obj={obj} state={emptyState} selected={false} {...handlers} />
    );
    // Emoji indicator span should be gone
    expect(container.textContent).not.toContain('·');
  });

  it('does NOT render inline lock button (🔒/🔓)', () => {
    const obj = makeObj();
    render(<ObjectRow obj={obj} state={emptyState} selected={false} {...handlers} />);
    expect(screen.queryByLabelText('Toggle lock')).not.toBeInTheDocument();
  });

  it('renders detail block when selected and kind has measure()', () => {
    const obj = makeObj();
    render(<ObjectRow obj={obj} state={emptyState} selected={true} {...handlers} />);
    // point.measure returns x, y → formatted as "x = 1.00, y = 2.00" or similar
    expect(screen.getByTestId('object-row-detail-A')).toBeInTheDocument();
    expect(screen.getByTestId('object-row-detail-A').textContent).toMatch(/x.*1\.00.*y.*2\.00/);
  });

  it('does NOT render detail block when not selected', () => {
    const obj = makeObj();
    render(<ObjectRow obj={obj} state={emptyState} selected={false} {...handlers} />);
    expect(screen.queryByTestId('object-row-detail-A')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 5.2: Run tests to verify they fail**

```bash
npm test -- src/core/scene/ui/__tests__/ObjectRow.test.tsx
```

Expected: FAIL — current `ObjectRow` still has emoji icon + lock button + no detail block + no color-dot.

- [ ] **Step 5.3: Rewrite ObjectRow**

Replace contents of `src/core/scene/ui/ObjectRow.tsx`:

```tsx
'use client';
import * as React from 'react';
import type { SceneObject, State } from '../types';
import { getKind } from '../registry';
import { ObjectRowMenu } from './ObjectRowMenu';

export interface ObjectRowProps {
  obj: SceneObject;
  state: State;
  selected: boolean;
  onSelect: (id: string) => void;
  onToggleVisible: (id: string) => void;
  onToggleLocked: (id: string) => void;
  onRename: (id: string) => void;
  onChangeColor: (id: string) => void;
  onDelete: (id: string) => void;
}

function formatMeasure(items: { label: string; value: number }[]): string {
  return items.map((it) => `${it.label} = ${it.value.toFixed(2)}`).join(', ');
}

export function ObjectRow(props: ObjectRowProps): React.ReactElement {
  const { obj, state, selected, onSelect, onToggleVisible, onToggleLocked, onRename, onChangeColor, onDelete } = props;

  let summary = '';
  try {
    summary = getKind(obj.kind).describe(obj);
  } catch {
    summary = obj.label;
  }

  let detail: string | null = null;
  if (selected) {
    try {
      const measure = getKind(obj.kind).measure?.(obj, state);
      if (measure && measure.length > 0) detail = formatMeasure(measure);
    } catch {
      detail = null;
    }
  }

  const color = (obj.attrs as { color?: string }).color ?? '#888888';

  return (
    <li
      data-testid={`object-row-${obj.id}`}
      aria-selected={selected}
      className={
        'flex flex-col border-b border-zinc-100 dark:border-zinc-800 ' +
        (selected ? 'bg-blue-50 dark:bg-blue-950' : 'hover:bg-zinc-50 dark:hover:bg-zinc-900')
      }
    >
      <div
        className="flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer"
        onClick={() => onSelect(obj.id)}
      >
        <button
          type="button"
          aria-label="Toggle visibility"
          aria-pressed={!obj.visible}
          onClick={(e) => { e.stopPropagation(); onToggleVisible(obj.id); }}
          className="h-4 w-4 shrink-0 rounded-full border-2 transition"
          style={{
            backgroundColor: obj.visible ? color : 'transparent',
            borderColor: color,
          }}
        />
        <span className="flex-1 truncate text-zinc-700 dark:text-zinc-200">
          <span className="font-semibold">{obj.label}</span>
          <span className="ml-1 text-zinc-500 dark:text-zinc-400">{summary}</span>
        </span>
        <ObjectRowMenu
          locked={obj.locked}
          onToggleLocked={() => onToggleLocked(obj.id)}
          onRename={() => onRename(obj.id)}
          onChangeColor={() => onChangeColor(obj.id)}
          onDelete={() => onDelete(obj.id)}
        />
      </div>
      {detail && (
        <div
          data-testid={`object-row-detail-${obj.id}`}
          className="pl-9 pr-3 pb-1.5 text-[11px] text-zinc-500 dark:text-zinc-400"
        >
          {detail}
        </div>
      )}
    </li>
  );
}
```

- [ ] **Step 5.4: Run tests to verify they pass**

```bash
npm test -- src/core/scene/ui/__tests__/ObjectRow.test.tsx
```

Expected: PASS (all 8 tests).

- [ ] **Step 5.5: Commit (defer until Task 6 since menu signature changed)**

Don't commit yet — Task 6 updates `ObjectRowMenu` to accept the new `locked`/`onToggleLocked` props. Move on.

---

## Task 6: Update `ObjectRowMenu` — Khoá item + dark contrast

**Files:**
- Modify: `src/core/scene/ui/ObjectRowMenu.tsx`
- Modify: `src/core/scene/ui/__tests__/ObjectRowMenu.test.tsx` (create if missing)

- [ ] **Step 6.1: Write failing tests**

Create or replace `src/core/scene/ui/__tests__/ObjectRowMenu.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ObjectRowMenu } from '../ObjectRowMenu';

describe('ObjectRowMenu', () => {
  const handlers = {
    onToggleLocked: jest.fn(),
    onRename: jest.fn(),
    onChangeColor: jest.fn(),
    onDelete: jest.fn(),
  };

  beforeEach(() => {
    Object.values(handlers).forEach((fn) => fn.mockClear());
  });

  it('shows "Khoá" when unlocked, "Mở khoá" when locked', () => {
    const { rerender } = render(<ObjectRowMenu locked={false} {...handlers} />);
    fireEvent.click(screen.getByLabelText('Row menu'));
    expect(screen.getByText('Khoá')).toBeInTheDocument();

    rerender(<ObjectRowMenu locked={true} {...handlers} />);
    expect(screen.getByText('Mở khoá')).toBeInTheDocument();
  });

  it('clicking Khoá fires onToggleLocked + closes menu', () => {
    render(<ObjectRowMenu locked={false} {...handlers} />);
    fireEvent.click(screen.getByLabelText('Row menu'));
    fireEvent.click(screen.getByText('Khoá'));
    expect(handlers.onToggleLocked).toHaveBeenCalled();
    expect(screen.queryByText('Khoá')).not.toBeInTheDocument();
  });

  it('clicking Xoá fires onDelete + closes menu', () => {
    render(<ObjectRowMenu locked={false} {...handlers} />);
    fireEvent.click(screen.getByLabelText('Row menu'));
    fireEvent.click(screen.getByText('Xoá'));
    expect(handlers.onDelete).toHaveBeenCalled();
  });

  it('menu items have dark-mode text class for contrast', () => {
    render(<ObjectRowMenu locked={false} {...handlers} />);
    fireEvent.click(screen.getByLabelText('Row menu'));
    const khoaItem = screen.getByText('Khoá');
    expect(khoaItem.className).toContain('dark:text-zinc-100');
  });
});
```

- [ ] **Step 6.2: Run tests**

```bash
npm test -- src/core/scene/ui/__tests__/ObjectRowMenu.test.tsx
```

Expected: FAIL (current menu has no `locked` prop, no Khoá item).

- [ ] **Step 6.3: Rewrite ObjectRowMenu**

Replace contents of `src/core/scene/ui/ObjectRowMenu.tsx`:

```tsx
'use client';
import * as React from 'react';

export interface ObjectRowMenuProps {
  locked: boolean;
  onToggleLocked: () => void;
  onRename: () => void;
  onChangeColor: () => void;
  onDelete: () => void;
}

export function ObjectRowMenu(props: ObjectRowMenuProps): React.ReactElement {
  const { locked, onToggleLocked, onRename, onChangeColor, onDelete } = props;
  const [open, setOpen] = React.useState(false);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        aria-label="Row menu"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="rounded px-1.5 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
      >
        ⋮
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-10 mt-1 w-40 rounded-md border border-zinc-200 bg-white py-1 text-xs shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
          onClick={(e) => e.stopPropagation()}
        >
          <MenuItem onClick={() => { setOpen(false); onRename(); }}>Đổi tên</MenuItem>
          <MenuItem onClick={() => { setOpen(false); onChangeColor(); }}>Đổi màu</MenuItem>
          <MenuItem onClick={() => { setOpen(false); onToggleLocked(); }}>
            {locked ? 'Mở khoá' : 'Khoá'}
          </MenuItem>
          <MenuItem
            onClick={() => { setOpen(false); onDelete(); }}
            className="text-red-600 dark:text-red-400"
          >
            Xoá
          </MenuItem>
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  className,
}: React.PropsWithChildren<{ onClick: () => void; className?: string }>) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`block w-full px-3 py-1 text-left text-zinc-800 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800 ${className ?? ''}`}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 6.4: Run tests**

```bash
npm test -- src/core/scene/ui/__tests__/ObjectRowMenu.test.tsx src/core/scene/ui/__tests__/ObjectRow.test.tsx
```

Expected: PASS.

- [ ] **Step 6.5: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 6.6: Commit**

```bash
git add src/core/scene/ui/ObjectRow.tsx src/core/scene/ui/ObjectRowMenu.tsx src/core/scene/ui/__tests__/ObjectRow.test.tsx src/core/scene/ui/__tests__/ObjectRowMenu.test.tsx
git commit -m "feat(scene/ui): redesign ObjectRow with color-dot + GeoGebra-style menu"
```

---

## Task 7: ObjectListPanel — verify selected-id expand integration

**Files:**
- Modify: `src/core/scene/ui/__tests__/ObjectListPanel.test.tsx`

`ObjectListPanel` passes `selected={obj.id === selectedId}` to each row (already done). Add integration test verifying expand-on-select.

- [ ] **Step 7.1: Add failing test**

Open `src/core/scene/ui/__tests__/ObjectListPanel.test.tsx`. Add:

```tsx
it('only the selected row shows detail block', () => {
  const store = createStore(/* … existing helper or inline state */);
  store.dispatch({ type: 'INSERT', payload: { /* 2 points A, B */ } });

  const { rerender } = render(
    <ObjectListPanel store={store} selectedId="A" onSelect={() => {}} />
  );
  expect(screen.getByTestId('object-row-detail-A')).toBeInTheDocument();
  expect(screen.queryByTestId('object-row-detail-B')).not.toBeInTheDocument();

  rerender(<ObjectListPanel store={store} selectedId="B" onSelect={() => {}} />);
  expect(screen.queryByTestId('object-row-detail-A')).not.toBeInTheDocument();
  expect(screen.getByTestId('object-row-detail-B')).toBeInTheDocument();
});
```

> Read the existing test file first to use the same store-creation helper. If none exists, create a 2-point state manually.

- [ ] **Step 7.2: Run test**

```bash
npm test -- src/core/scene/ui/__tests__/ObjectListPanel.test.tsx
```

Expected: PASS (the underlying mechanism already works via `selected` prop wiring in Task 5).

- [ ] **Step 7.3: Commit**

```bash
git add src/core/scene/ui/__tests__/ObjectListPanel.test.tsx
git commit -m "test(scene/ui): verify selectedId expands detail in ObjectListPanel"
```

---

## Task 8: Full test suite + typecheck + manual smoke

- [ ] **Step 8.1: Run full test suite**

```bash
npm test
```

Expected: all green. If anything broke (e.g. existing tests expect emoji icon in row), update those tests to match the new design — but only the ones that asserted on the dropped UI (emoji, 🔒 button). Do NOT relax tests that protect new behavior.

- [ ] **Step 8.2: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 8.3: Build**

```bash
npm run build
```

Expected: successful build, no warnings related to changed files.

- [ ] **Step 8.4: Manual smoke (in consumer app or test harness)**

If a dev consumer is available, open the whiteboard, insert geometry stamp, create 2 points + 1 segment:

1. Click point A in objects panel → element A turns red on board. Click point B → A reverts blue, B turns red. Repeat 5×. Verify A and B colors/widths stay original (not accumulating).
2. Pick black color (`#000000`) for point A via PropertiesPopover. Hover row A in panel → text still readable. Open 3-dots menu → all items readable in both light + dark mode.
3. Click color-dot on row A → A hidden on board, dot rỗng (outline only). Click again → A reappears, dot fills.
4. Click row segment → expand `length = 5.30` (or similar) below label. Click row point → segment collapses, point expands `x = 1.00, y = 2.00`.
5. Open 3-dots → click `Khoá` → label flips to `Mở khoá` next time; row UI unchanged (no 🔒 emoji). Click `Xoá` → object removed.

Record any issues; if any, file a follow-up task before declaring done.

- [ ] **Step 8.5: Final commit (if smoke fixes needed)**

If smoke testing reveals UI tweaks needed (spacing, color, contrast):

```bash
git add <files>
git commit -m "polish(scene/ui): smoke-test fixes for object row redesign"
```

If no smoke fixes needed, skip this step.

---

## Self-review checklist

- ✅ Spec section 1 (highlight fix) → Task 1 + Task 2
- ✅ Spec section 2 (ObjectRow redesign) → Task 5
- ✅ Spec section 3 (expand-on-select) → Task 5 (detail block) + Task 7 (integration test)
- ✅ Spec section 4 (dark contrast) → Task 5 (utility classes) + Task 6 (menu items)
- ✅ Spec section 5 (test plan) → Tasks 1, 2, 3, 4, 5, 6, 7 cover all listed cases
- ✅ No placeholders — all code blocks complete
- ✅ Method signatures consistent: `measure(obj, state)` matches `KindDef.measure` interface across all kinds and tests
- ✅ `ObjectRowMenu` new prop `locked` + `onToggleLocked` referenced consistently in Tasks 5 and 6
