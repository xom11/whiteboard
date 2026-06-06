# Tool Search Redesign + Icon-less Kinds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Search "Tìm công cụ" hiển thị tên (list mode khi có query) và lộ các DSL kind chưa có icon thành tool vẽ tương tác đầy đủ, gom vào group "Nâng cao".

**Architecture:** (1) `ToolGrid.tsx` (shared) thêm list-mode khi có query. (2) geometry-2d: mỗi kind thiếu tool → thêm vào union `GeomTool` + `TOOLS` (icon/needs/accepts) + `case` trong `finalizeShape.ts`/`transform.ts`. Render đã có sẵn trong `core/scene/kinds/point.ts` cho toàn bộ point kind; `circleCR` đã render; chỉ `incircle` + `excircle` cần wire render mới.

**Tech Stack:** React 18 + TS strict, JSXGraph (qua scene store `core/scene`), Jest 29 + jsdom, zod (DSL schema).

---

## File Structure

**Sửa:**
- `src/stamps/shared/StampLeftPanel/ToolGrid.tsx` — thêm list-mode render (Phase 1).
- `src/stamps/geometry-2d/editor/tools.tsx` — union `GeomTool`, `TOOLS`, group `advanced`, `GROUP_LABELS`, `GROUP_ORDER` (Phase 2–8).
- `src/stamps/geometry-2d/editor/icons.tsx` — icon mới cho tool mới.
- `src/stamps/geometry-2d/editor/handlers/finalizeShape.ts` — case mới cho point/circle tools.
- `src/stamps/geometry-2d/editor/handlers/ctx.ts` — thêm `'circleCR'` vào `TransformToolKey`.
- `src/stamps/geometry-2d/editor/handlers/transform.ts` — case `circleCR` trong `finalizeTransform`.
- `src/stamps/geometry-2d/editor/handlers/pointerDown/multiClick.ts` — popover special-case thêm `circleCR`.
- `src/stamps/geometry-2d/editor/TransformParamPopover.tsx` — `ParamKind` thêm `circleCR`.
- `src/stamps/geometry-2d/editor/EditorPanel.tsx` — render popover cho `circleCR`.
- `src/core/scene/kinds/circle.ts` — render `incircle` + `excircle` (Phase 6–7).

**Tạo:**
- `src/stamps/geometry-2d/dsl/kinds/circles/excircle.ts` — DSL kind mới (Phase 7).

---

## Phase 1 — Search list mode (shared ToolGrid)

### Task 1.1: List-mode render trong ToolGrid

**Files:**
- Modify: `src/stamps/shared/StampLeftPanel/ToolGrid.tsx`
- Test: `src/stamps/shared/StampLeftPanel/__tests__/ToolGrid.test.tsx` (tạo nếu chưa có)

- [ ] **Step 1: Viết test thất bại**

```tsx
// src/stamps/shared/StampLeftPanel/__tests__/ToolGrid.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToolGrid } from '../ToolGrid';

const TOOLS = [
  { key: 'point', label: 'Điểm mới', hint: 'Click để thêm điểm', icon: <span>P</span>, group: 'g1' },
  { key: 'circ', label: 'Đường tròn nội tiếp', hint: 'Click 3 đỉnh', icon: <span>C</span>, group: 'g2' },
] as const;
const groupOrder = ['g1', 'g2'] as const;
const groupLabels = { g1: 'Nhóm 1', g2: 'Nhóm 2' } as Record<string, string>;

function setup() {
  return render(
    <ToolGrid
      tools={TOOLS as never}
      groupOrder={groupOrder as never}
      groupLabels={groupLabels}
      activeTool={'point' as never}
      onToolChange={() => {}}
    />,
  );
}

test('grid mode (no query) ẩn tên, hiện group header', () => {
  setup();
  expect(screen.getByText('Nhóm 1')).toBeInTheDocument();
  // Tên tool KHÔNG render dạng text trong grid (chỉ icon + aria-label/title).
  expect(screen.queryByText('Đường tròn nội tiếp')).not.toBeInTheDocument();
});

test('list mode (có query) hiện tên + hint, bỏ group header', () => {
  setup();
  fireEvent.change(screen.getByTestId('tool-search-input'), { target: { value: 'tròn' } });
  expect(screen.getByText('Đường tròn nội tiếp')).toBeInTheDocument();
  expect(screen.getByText('Click 3 đỉnh')).toBeInTheDocument();
  expect(screen.queryByText('Nhóm 1')).not.toBeInTheDocument();
  // Vẫn là button có data-tool để click chọn tool.
  expect(screen.getByRole('button', { name: 'Đường tròn nội tiếp' })).toHaveAttribute('data-tool', 'circ');
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx jest src/stamps/shared/StampLeftPanel/__tests__/ToolGrid.test.tsx`
Expected: FAIL ở test list mode ("Unable to find an element with the text: Đường tròn nội tiếp").

- [ ] **Step 3: Thêm sub-component `ToolResultList` + nhánh render**

Trong `ToolGrid.tsx`, sau khối `noMatch` (dòng ~123), bọc phần `groupKeys.map(...)` bằng điều kiện. Thêm sub-component trước `export function ToolGrid`:

```tsx
function ToolResultList<TKey extends string, TGroup extends string>(props: {
  tools: ReadonlyArray<StampToolDef<TKey, TGroup>>;
  activeTool: TKey;
  onToolChange: (k: TKey) => void;
}): React.ReactElement {
  const { tools, activeTool, onToolChange } = props;
  return (
    <div className="flex flex-col gap-0.5" data-testid="tool-result-list">
      {tools.map((t) => {
        const active = activeTool === t.key;
        return (
          <button
            key={t.key}
            type="button"
            data-tool={t.key}
            aria-label={t.label}
            aria-pressed={active}
            onClick={() => onToolChange(t.key)}
            className={[
              'flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition',
              active ? 'bg-emerald-600 text-white' : 'text-slate-700 hover:bg-slate-100',
            ].join(' ')}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center">{t.icon}</span>
            <span className="min-w-0">
              <span className="block truncate text-[12px] font-medium leading-tight">{t.label}</span>
              {t.hint && (
                <span className={['block truncate text-[10px] leading-tight', active ? 'text-emerald-50' : 'text-slate-400'].join(' ')}>
                  {t.hint}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
```

Sau đó trong `ToolGrid`, thay khối render group bằng:

```tsx
      {normalizedQuery !== '' && !noMatch ? (
        <ToolResultList tools={filteredTools} activeTool={activeTool} onToolChange={onToolChange} />
      ) : (
        groupKeys.map((group) => {
          // ... GIỮ NGUYÊN toàn bộ nội dung map group hiện tại ...
        })
      )}
```

(Giữ nguyên block tooltip portal phía dưới — list mode không show hover nhưng portal vô hại.)

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `npx jest src/stamps/shared/StampLeftPanel/__tests__/ToolGrid.test.tsx`
Expected: PASS cả 2 test.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/shared/StampLeftPanel/ToolGrid.tsx src/stamps/shared/StampLeftPanel/__tests__/ToolGrid.test.tsx
git commit -m "feat(stamp): search hiển thị list (icon + tên + hint) khi có query"
```

---

## Phase 2 — Group "Nâng cao" infra

### Task 2.1: Thêm group `advanced` vào tools.tsx

**Files:**
- Modify: `src/stamps/geometry-2d/editor/tools.tsx`
- Test: `src/stamps/geometry-2d/editor/__tests__/tools.advanced-group.test.ts` (tạo)

- [ ] **Step 1: Viết test thất bại**

```ts
// src/stamps/geometry-2d/editor/__tests__/tools.advanced-group.test.ts
import { GROUP_LABELS, GROUP_ORDER, letterForGroup } from '../tools';

test('group advanced tồn tại, label "Nâng cao", đứng cuối GROUP_ORDER', () => {
  expect(GROUP_LABELS.advanced).toBe('Nâng cao');
  expect(GROUP_ORDER[GROUP_ORDER.length - 1]).toBe('advanced');
});

test('letter chord các group cũ không đổi (point vẫn = B)', () => {
  expect(letterForGroup('point')).toBe('B');
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx jest src/stamps/geometry-2d/editor/__tests__/tools.advanced-group.test.ts`
Expected: FAIL ("Property 'advanced' does not exist" hoặc undefined).

- [ ] **Step 3: Thêm `advanced` vào union group, GROUP_LABELS, GROUP_ORDER**

Trong `tools.tsx`, mở rộng union `group` của `ToolDef` (dòng ~64) thêm `| 'advanced'`:

```ts
  group:
    | 'move'
    | 'point'
    | 'line'
    | 'construct'
    | 'polygon'
    | 'circle'
    | 'triangle'
    | 'measure'
    | 'edit'
    | 'transform'
    | 'special'
    | 'advanced';
```

Thêm vào `GROUP_LABELS` (sau `special`):

```ts
  special: 'Hình đặc biệt',
  advanced: 'Nâng cao',
```

Thêm `'advanced'` vào CUỐI `GROUP_ORDER`:

```ts
  'special',
  'advanced',
];
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `npx jest src/stamps/geometry-2d/editor/__tests__/tools.advanced-group.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/editor/tools.tsx src/stamps/geometry-2d/editor/__tests__/tools.advanced-group.test.ts
git commit -m "feat(geometry-2d): thêm group 'Nâng cao' (advanced) cho tool nâng cao"
```

---

## Phase 3 — Point tools refs-only (render đã có)

Các tool này chỉ cần `constraint:{kind,...}` từ id đã pick — render sẵn trong `point.ts`. Mỗi tool: union key + icon + TOOLS entry + finalizeShape case + test.

### Task 3.1: Tool `excenter` (Tâm đường tròn bàng tiếp)

**Files:**
- Modify: `tools.tsx`, `icons.tsx`, `handlers/finalizeShape.ts`
- Test: `src/stamps/geometry-2d/editor/handlers/__tests__/finalizeShape.advanced.test.ts` (tạo, dùng chung Phase 3–4)

- [ ] **Step 1: Viết test thất bại**

```ts
// src/stamps/geometry-2d/editor/handlers/__tests__/finalizeShape.advanced.test.ts
import { finalizeShape } from '../finalizeShape';
import { TOOLS } from '../../tools';

type Disp = { type: string; payload: { obj?: { kind: string; attrs: Record<string, unknown> } } };

function mkCtx(pickKinds: Array<'point' | 'line' | 'circle'>, ids: string[]) {
  const dispatched: Disp[] = [];
  let n = 0;
  const ctx = {
    pendingRef: { current: pickKinds.map((k) => ({ elementClass: k === 'point' ? 1 : k === 'line' ? 2 : 3 })) },
    pendingIdsRef: { current: ids },
    store: {
      getState: () => ({ counter: n, objects: {} }),
      dispatch: (a: Disp) => { n += 1; dispatched.push(a); },
    },
    nextLabel: () => 'X',
    toast: () => {},
  } as never;
  return { ctx, dispatched };
}
const tool = (key: string) => TOOLS.find((t) => t.key === key)!;

test('excenter dispatch point với constraint excenter, opposite = đỉnh đầu', () => {
  const { ctx, dispatched } = mkCtx(['point', 'point', 'point'], ['a', 'b', 'c']);
  finalizeShape(ctx, tool('excenter'));
  expect(dispatched).toHaveLength(1);
  expect(dispatched[0].payload.obj!.kind).toBe('point');
  expect(dispatched[0].payload.obj!.attrs.constraint).toEqual({
    kind: 'excenter', vertices: ['a', 'b', 'c'], opposite: 'a',
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx jest finalizeShape.advanced`
Expected: FAIL (excenter chưa có trong TOOLS → `tool('excenter')` undefined).

- [ ] **Step 3: Thêm key + icon + TOOLS + finalizeShape case**

`tools.tsx` union `GeomTool` thêm `| 'excenter'` (sau `'orthocenter'`).

`icons.tsx` thêm vào object `Icon` (trước dấu `}` đóng):

```tsx
  excenter: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M5 16 L12 5 L19 16 Z" stroke="currentColor" strokeWidth="1.3"/>
      <circle cx="12" cy="20" r="3" fill="none" stroke={C_CONSTRUCT} strokeWidth="1.3"/>
      <circle cx="12" cy="20" r="1.4" fill={C_CONSTRUCT}/>
    </svg>
  ),
```

`tools.tsx` `TOOLS` thêm (trong nhóm advanced, đặt cuối mảng trước `]`):

```ts
  { key: 'excenter', label: 'Tâm đường tròn bàng tiếp', hint: 'Click 3 đỉnh tam giác (đỉnh đầu = đỉnh đối diện)', icon: Icon.excenter, group: 'advanced', needs: 3, accepts: ['point', 'point', 'point'] },
```

`finalizeShape.ts` thêm case (trước `default:`):

```ts
    case 'excenter': {
      const id = freshId(ctx, 'ex');
      const label = ctx.nextLabel('point');
      ctx.store.dispatch({
        type: 'ADD',
        payload: { obj: mkSceneObj(id, 'point', label, {
          constraint: { kind: 'excenter', vertices: [ids[0], ids[1], ids[2]], opposite: ids[0] },
        }) },
      });
      return;
    }
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `npx jest finalizeShape.advanced`
Expected: PASS test excenter.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/editor/tools.tsx src/stamps/geometry-2d/editor/icons.tsx src/stamps/geometry-2d/editor/handlers/finalizeShape.ts src/stamps/geometry-2d/editor/handlers/__tests__/finalizeShape.advanced.test.ts
git commit -m "feat(geometry-2d): tool tâm đường tròn bàng tiếp (excenter)"
```

### Task 3.2: Tool `tangencyPoint` (Tiếp điểm)

**Files:** Modify `tools.tsx`, `icons.tsx`, `finalizeShape.ts`; cùng test file.

- [ ] **Step 1: Thêm test (append vào finalizeShape.advanced.test.ts)**

```ts
test('tangencyPoint dispatch point với constraint tangencyPoint {circle,onLine}', () => {
  const { ctx, dispatched } = mkCtx(['circle', 'line'], ['c1', 'l1']);
  finalizeShape(ctx, tool('tangencyPoint'));
  expect(dispatched[0].payload.obj!.attrs.constraint).toEqual({
    kind: 'tangencyPoint', circle: 'c1', onLine: 'l1',
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL** — Run: `npx jest finalizeShape.advanced` → FAIL.

- [ ] **Step 3: Implement**

`GeomTool` thêm `| 'tangencyPoint'`.

`icons.tsx`:

```tsx
  tangencyPoint: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="10" cy="12" r="6.5" stroke="currentColor" strokeWidth="1.3"/>
      <line x1="16.5" y1="3" x2="16.5" y2="21" stroke="currentColor" strokeWidth="1.3"/>
      <circle cx="16.5" cy="12" r="2.2" fill={C_CONSTRUCT}/>
    </svg>
  ),
```

`TOOLS`:

```ts
  { key: 'tangencyPoint', label: 'Tiếp điểm (đường tiếp xúc)', hint: 'Click 1 đường tròn + 1 tiếp tuyến có sẵn', icon: Icon.tangencyPoint, group: 'advanced', needs: 2, accepts: ['circle', 'line'] },
```

`finalizeShape.ts` case (dùng `findPickIdByKind` đã có sẵn trong file):

```ts
    case 'tangencyPoint': {
      const circleId = findPickIdByKind(ctx, 'circle');
      const lineId = findPickIdByKind(ctx, 'line');
      if (!circleId || !lineId) return;
      const id = freshId(ctx, 'tp');
      const label = ctx.nextLabel('point');
      ctx.store.dispatch({
        type: 'ADD',
        payload: { obj: mkSceneObj(id, 'point', label, {
          constraint: { kind: 'tangencyPoint', circle: circleId, onLine: lineId },
        }) },
      });
      return;
    }
```

- [ ] **Step 4: Chạy test PASS** — Run: `npx jest finalizeShape.advanced`.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(geometry-2d): tool tiếp điểm (tangencyPoint)"
```

### Task 3.3: Tool `secondIntersection` (Giao điểm thứ hai)

**Files:** Modify `tools.tsx`, `icons.tsx`, `finalizeShape.ts`; cùng test file.

- [ ] **Step 1: Thêm test**

```ts
test('secondIntersection dispatch point {line,circle,other}', () => {
  const { ctx, dispatched } = mkCtx(['line', 'circle', 'point'], ['l1', 'c1', 'p1']);
  finalizeShape(ctx, tool('secondIntersection'));
  expect(dispatched[0].payload.obj!.attrs.constraint).toEqual({
    kind: 'secondIntersection', line: 'l1', circle: 'c1', other: 'p1',
  });
});
```

- [ ] **Step 2: Chạy test FAIL** — Run: `npx jest finalizeShape.advanced`.

- [ ] **Step 3: Implement**

`GeomTool` thêm `| 'secondIntersection'`.

`icons.tsx`:

```tsx
  secondIntersection: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="12" r="6.5" stroke="currentColor" strokeWidth="1.3"/>
      <line x1="2" y1="8" x2="22" y2="16" stroke="currentColor" strokeWidth="1.3"/>
      <circle cx="6.2" cy="9.6" r="1.6" fill="currentColor"/>
      <circle cx="15.8" cy="14.4" r="2.4" fill={C_CONSTRUCT}/>
    </svg>
  ),
```

`TOOLS`:

```ts
  { key: 'secondIntersection', label: 'Giao điểm thứ hai', hint: 'Click 1 đường + 1 đường tròn + giao điểm đã biết', icon: Icon.secondIntersection, group: 'advanced', needs: 3, accepts: ['line', 'circle', 'point'] },
```

`finalizeShape.ts` case:

```ts
    case 'secondIntersection': {
      const lineId = findPickIdByKind(ctx, 'line');
      const circleId = findPickIdByKind(ctx, 'circle');
      const otherId = findPickIdByKind(ctx, 'point');
      if (!lineId || !circleId || !otherId) return;
      const id = freshId(ctx, 'X');
      const label = ctx.nextLabel('point');
      ctx.store.dispatch({
        type: 'ADD',
        payload: { obj: mkSceneObj(id, 'point', label, {
          constraint: { kind: 'secondIntersection', line: lineId, circle: circleId, other: otherId },
        }) },
      });
      return;
    }
```

- [ ] **Step 4: Chạy test PASS** — Run: `npx jest finalizeShape.advanced`.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(geometry-2d): tool giao điểm thứ hai (secondIntersection)"
```

### Task 3.4: Tool `arcMidpoint` (Điểm giữa cung)

**Files:** Modify `tools.tsx`, `icons.tsx`, `finalizeShape.ts`; cùng test file.

- [ ] **Step 1: Thêm test**

```ts
test('arcMidpoint dispatch point {circle,a,b,notContaining} theo thứ tự click điểm', () => {
  // pick order: circle, A, B, N
  const { ctx, dispatched } = mkCtx(['circle', 'point', 'point', 'point'], ['c1', 'A', 'B', 'N']);
  finalizeShape(ctx, tool('arcMidpoint'));
  expect(dispatched[0].payload.obj!.attrs.constraint).toEqual({
    kind: 'arcMidpoint', circle: 'c1', a: 'A', b: 'B', notContaining: 'N',
  });
});
```

- [ ] **Step 2: Chạy test FAIL** — Run: `npx jest finalizeShape.advanced`.

- [ ] **Step 3: Implement**

`GeomTool` thêm `| 'arcMidpoint'`.

`icons.tsx`:

```tsx
  arcMidpoint: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeLinecap="round">
      <path d="M4 17 A 9 9 0 0 1 20 17" stroke="currentColor" strokeWidth="1.4"/>
      <circle cx="4" cy="17" r="1.6" fill="currentColor"/>
      <circle cx="20" cy="17" r="1.6" fill="currentColor"/>
      <circle cx="12" cy="8.2" r="2.4" fill={C_CONSTRUCT}/>
    </svg>
  ),
```

`TOOLS`:

```ts
  { key: 'arcMidpoint', label: 'Điểm giữa cung', hint: 'Click đường tròn → 2 đầu cung A,B → 1 điểm phía cung KHÔNG chứa', icon: Icon.arcMidpoint, group: 'advanced', needs: 4, accepts: ['circle', 'point', 'point', 'point'] },
```

`finalizeShape.ts` case (lấy điểm theo thứ tự click qua parallel arrays):

```ts
    case 'arcMidpoint': {
      const circleId = findPickIdByKind(ctx, 'circle');
      const picks = ctx.pendingRef.current;
      const allIds = ctx.pendingIdsRef.current;
      const ptIds: string[] = [];
      for (let i = 0; i < picks.length; i += 1) {
        if (objKind(picks[i]) === 'point' && allIds[i]) ptIds.push(allIds[i]);
      }
      if (!circleId || ptIds.length < 3) return;
      const id = freshId(ctx, 'M');
      const label = ctx.nextLabel('point');
      ctx.store.dispatch({
        type: 'ADD',
        payload: { obj: mkSceneObj(id, 'point', label, {
          constraint: { kind: 'arcMidpoint', circle: circleId, a: ptIds[0], b: ptIds[1], notContaining: ptIds[2] },
        }) },
      });
      return;
    }
```

- [ ] **Step 4: Chạy test PASS** — Run: `npx jest finalizeShape.advanced`.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(geometry-2d): tool điểm giữa cung (arcMidpoint)"
```

---

## Phase 4 — Point tools 2 nhánh (which 0/1)

Theo mẫu tool `intersect`/`tangent`: tạo CẢ 2 nhánh để khỏi cần đoán click.

### Task 4.1: Tool `circleIntersection` (Giao 2 đường tròn)

**Files:** Modify `tools.tsx`, `icons.tsx`, `finalizeShape.ts`; cùng test file.

- [ ] **Step 1: Thêm test**

```ts
test('circleIntersection dispatch 2 point (which 0 và 1)', () => {
  const { ctx, dispatched } = mkCtx(['circle', 'circle'], ['c1', 'c2']);
  finalizeShape(ctx, tool('circleIntersection'));
  expect(dispatched).toHaveLength(2);
  expect(dispatched.map((d) => (d.payload.obj!.attrs.constraint as { which: number }).which).sort()).toEqual([0, 1]);
  expect(dispatched[0].payload.obj!.attrs.constraint).toMatchObject({ kind: 'circleIntersection', c1: 'c1', c2: 'c2' });
});
```

- [ ] **Step 2: Chạy test FAIL** — Run: `npx jest finalizeShape.advanced`.

- [ ] **Step 3: Implement**

`GeomTool` thêm `| 'circleIntersection'`.

`icons.tsx`:

```tsx
  circleIntersection: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="9" cy="12" r="6" stroke="currentColor" strokeWidth="1.3"/>
      <circle cx="15" cy="12" r="6" stroke="currentColor" strokeWidth="1.3"/>
      <circle cx="12" cy="7.6" r="2" fill={C_CONSTRUCT}/>
      <circle cx="12" cy="16.4" r="2" fill={C_CONSTRUCT}/>
    </svg>
  ),
```

`TOOLS`:

```ts
  { key: 'circleIntersection', label: 'Giao 2 đường tròn', hint: 'Click 2 đường tròn (tạo cả 2 giao điểm)', icon: Icon.circleIntersection, group: 'advanced', needs: 2, accepts: ['circle', 'circle'] },
```

`finalizeShape.ts` case:

```ts
    case 'circleIntersection': {
      for (const which of [0, 1] as const) {
        const id = freshId(ctx, 'X');
        const label = ctx.nextLabel('point');
        ctx.store.dispatch({
          type: 'ADD',
          payload: { obj: mkSceneObj(id, 'point', label, {
            constraint: { kind: 'circleIntersection', c1: ids[0], c2: ids[1], which },
          }) },
        });
      }
      return;
    }
```

- [ ] **Step 4: Chạy test PASS** — Run: `npx jest finalizeShape.advanced`.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(geometry-2d): tool giao 2 đường tròn (circleIntersection)"
```

### Task 4.2: Tool `tangentPointExt` (Tiếp điểm từ điểm ngoài)

**Files:** Modify `tools.tsx`, `icons.tsx`, `finalizeShape.ts`; cùng test file.

- [ ] **Step 1: Thêm test**

```ts
test('tangentPointExt dispatch 2 point (which 0 và 1) {from,circle}', () => {
  const { ctx, dispatched } = mkCtx(['point', 'circle'], ['P', 'c1']);
  finalizeShape(ctx, tool('tangentPointExt'));
  expect(dispatched).toHaveLength(2);
  expect(dispatched[0].payload.obj!.attrs.constraint).toMatchObject({ kind: 'tangentPointExt', from: 'P', circle: 'c1' });
  expect(dispatched.map((d) => (d.payload.obj!.attrs.constraint as { which: number }).which).sort()).toEqual([0, 1]);
});
```

- [ ] **Step 2: Chạy test FAIL** — Run: `npx jest finalizeShape.advanced`.

- [ ] **Step 3: Implement**

`GeomTool` thêm `| 'tangentPointExt'`.

`icons.tsx`:

```tsx
  tangentPointExt: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeLinecap="round">
      <circle cx="14" cy="12" r="6" stroke="currentColor" strokeWidth="1.3"/>
      <circle cx="3.5" cy="12" r="1.8" fill={C_POINT}/>
      <line x1="3.5" y1="12" x2="17.5" y2="7.5" stroke="currentColor" strokeWidth="1.2"/>
      <line x1="3.5" y1="12" x2="17.5" y2="16.5" stroke="currentColor" strokeWidth="1.2"/>
      <circle cx="17.5" cy="7.5" r="1.8" fill={C_CONSTRUCT}/>
      <circle cx="17.5" cy="16.5" r="1.8" fill={C_CONSTRUCT}/>
    </svg>
  ),
```

`TOOLS`:

```ts
  { key: 'tangentPointExt', label: 'Tiếp điểm từ điểm ngoài', hint: 'Click 1 điểm ngoài + 1 đường tròn (tạo cả 2 tiếp điểm)', icon: Icon.tangentPointExt, group: 'advanced', needs: 2, accepts: ['point', 'circle'] },
```

`finalizeShape.ts` case:

```ts
    case 'tangentPointExt': {
      const fromId = findPickIdByKind(ctx, 'point');
      const circleId = findPickIdByKind(ctx, 'circle');
      if (!fromId || !circleId) return;
      for (const which of [0, 1] as const) {
        const id = freshId(ctx, 'T');
        const label = ctx.nextLabel('point');
        ctx.store.dispatch({
          type: 'ADD',
          payload: { obj: mkSceneObj(id, 'point', label, {
            constraint: { kind: 'tangentPointExt', from: fromId, circle: circleId, which },
          }) },
        });
      }
      return;
    }
```

- [ ] **Step 4: Chạy test PASS** — Run: `npx jest finalizeShape.advanced`.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(geometry-2d): tool tiếp điểm từ điểm ngoài (tangentPointExt)"
```

---

## Phase 5 — Tool `circleCR` (đường tròn tâm + bán kính, popover)

### Task 5.1: Wire circleCR qua param popover

**Files:**
- Modify: `tools.tsx`, `icons.tsx`, `handlers/ctx.ts`, `handlers/transform.ts`, `handlers/pointerDown/multiClick.ts`, `TransformParamPopover.tsx`, `EditorPanel.tsx`
- Test: `src/stamps/geometry-2d/editor/handlers/__tests__/finalizeTransform.circleCR.test.ts` (tạo)

- [ ] **Step 1: Viết test thất bại**

```ts
// src/stamps/geometry-2d/editor/handlers/__tests__/finalizeTransform.circleCR.test.ts
import { finalizeTransform } from '../transform';

test('finalizeTransform circleCR dispatch circle {center, radius}', () => {
  const dispatched: { payload: { obj?: { kind: string; attrs: Record<string, unknown> } } }[] = [];
  let n = 0;
  const ctx = {
    store: { getState: () => ({ counter: n, objects: {} }), dispatch: (a: never) => { n += 1; dispatched.push(a as never); } },
    nextLabel: () => 'c',
    flashWarn: () => {},
  } as never;
  finalizeTransform(ctx, 'circleCR', ['ctr1'], 3.5);
  expect(dispatched[0].payload.obj!.kind).toBe('circle');
  expect(dispatched[0].payload.obj!.attrs).toMatchObject({ center: 'ctr1', radius: 3.5 });
});
```

- [ ] **Step 2: Chạy test FAIL** — Run: `npx jest finalizeTransform.circleCR`
Expected: FAIL (TS: `'circleCR'` không gán được cho `TransformToolKey`).

- [ ] **Step 3: Mở rộng TransformToolKey + finalizeTransform**

`handlers/ctx.ts` `TransformToolKey` thêm `| 'circleCR'`:

```ts
export type TransformToolKey =
  | 'translate'
  | 'rotate'
  | 'reflectLine'
  | 'reflectPoint'
  | 'dilate'
  | 'regularPolygon'
  | 'circleCR';
```

`handlers/transform.ts` thêm ở đầu `finalizeTransform` (sau khối `regularPolygon`):

```ts
  if (tool === 'circleCR') {
    const r = Math.abs(value);
    if (!(r > 0)) { ctx.flashWarn('Bán kính phải > 0'); return; }
    const id = freshId(ctx, 'c');
    const label = ctx.nextLabel('circle');
    ctx.store.dispatch({
      type: 'ADD',
      payload: { obj: mkSceneObj(id, 'circle', label, { center: pendingIds[0], radius: r }) },
    });
    return;
  }
```

- [ ] **Step 4: Chạy test PASS** — Run: `npx jest finalizeTransform.circleCR`.

- [ ] **Step 5: Wire UI (multiClick popover + ParamPopover + EditorPanel + TOOLS + icon)**

`multiClick.ts`: thêm `circleCR` vào điều kiện popover (dòng `if (tk === 'rotate' || tk === 'dilate' || tk === 'regularPolygon')`):

```ts
    if (tk === 'rotate' || tk === 'dilate' || tk === 'regularPolygon' || tk === 'circleCR') {
```

`TransformParamPopover.tsx`: `ParamKind` thêm `| 'circleCR'`; `LABELS` thêm entry:

```ts
export type ParamKind = 'rotate' | 'dilate' | 'regularPolygon' | 'circleCR';
// ...
  circleCR: { aria: 'Bán kính đường tròn', label: 'Bán kính', step: 0.5, min: 0 },
```

`EditorPanel.tsx` dòng ~396 — thêm `circleCR` vào điều kiện render popover và defaultValue:

```tsx
        {transformPopover && (transformPopover.tool === 'rotate' || transformPopover.tool === 'dilate' || transformPopover.tool === 'regularPolygon' || transformPopover.tool === 'circleCR') && (
          <TransformParamPopover
            kind={transformPopover.tool}
            anchor={transformPopover.anchor}
            defaultValue={
              transformPopover.tool === 'rotate' ? 90
              : transformPopover.tool === 'regularPolygon' ? 5
              : transformPopover.tool === 'circleCR' ? 3
              : 2
            }
            // ... onConfirm/onCancel giữ nguyên ...
```

(Nếu defaultValue hiện dùng dạng khác, chỉ cần thêm nhánh `circleCR ? 3`.)

`tools.tsx` union `GeomTool` thêm `| 'circleCR'`; `icons.tsx`:

```tsx
  circleCR: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="1.3"/>
      <circle cx="12" cy="12" r="1.8" fill={C_POINT}/>
      <line x1="12" y1="12" x2="19.5" y2="12" stroke={C_CONSTRUCT} strokeWidth="1.3"/>
    </svg>
  ),
```

`TOOLS` (nhóm circle):

```ts
  { key: 'circleCR', label: 'Đường tròn (tâm + bán kính)', hint: 'Click tâm rồi nhập bán kính', icon: Icon.circleCR, group: 'circle', needs: 1, accepts: ['point'] },
```

- [ ] **Step 6: Chạy typecheck + test liên quan**

Run: `npm run typecheck && npx jest finalizeTransform.circleCR src/stamps/geometry-2d/editor/__tests__`
Expected: typecheck PASS, test PASS.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(geometry-2d): tool đường tròn tâm + bán kính (circleCR) qua popover"
```

---

## Phase 6 — incircle (wire render + tool)

### Task 6.1: Render incircle trong circle.ts

**Files:**
- Modify: `src/core/scene/kinds/circle.ts`
- Test: `src/core/scene/kinds/__tests__/circle.incircle.test.ts` (tạo)

- [ ] **Step 1: Viết test thất bại**

```ts
// src/core/scene/kinds/__tests__/circle.incircle.test.ts
import '../circle';
import { getKind } from '../../registry';

test('circle kind: construction incircle → board.create("incircle", [A,B,C])', () => {
  const def = getKind('circle')!;
  const created: { type: string; parents: unknown[] }[] = [];
  const board = { create: (type: string, parents: unknown[]) => { created.push({ type, parents }); return { type }; } };
  const refs: Record<string, { id: string }> = { A: { id: 'A' }, B: { id: 'B' }, C: { id: 'C' } };
  const obj = {
    id: 'c1', kind: 'circle', label: 'w', visible: true, locked: false, layer: 'd', schemaVersion: 1,
    attrs: { construction: { kind: 'incircle', p1: 'A', p2: 'B', p3: 'C' } },
  } as never;
  def.render(obj, { jxg: board, resolveRef: (id: string) => refs[id] } as never);
  expect(created[0].type).toBe('incircle');
  expect(created[0].parents).toEqual([{ id: 'A' }, { id: 'B' }, { id: 'C' }]);
});

test('dependsOn incircle trả 3 đỉnh', () => {
  const def = getKind('circle')!;
  expect(def.dependsOn({ construction: { kind: 'incircle', p1: 'A', p2: 'B', p3: 'C' } } as never)).toEqual(['A', 'B', 'C']);
});
```

> Nếu `getKind` không phải tên export thực tế, dùng API registry hiện có (xem `src/core/scene/registry.ts`) — test chỉ cần lấy được `def`.

- [ ] **Step 2: Chạy test FAIL** — Run: `npx jest circle.incircle`
Expected: FAIL (incircle chưa được xử lý → created[0].type !== 'incircle').

- [ ] **Step 3: Thêm incircle vào CircleConstruction + refs + render**

`circle.ts`:

```ts
export type CircleConstruction =
  | { kind: 'circumscribed'; p1: string; p2: string; p3: string }
  | { kind: 'incircle'; p1: string; p2: string; p3: string };
```

`constructionRefs`:

```ts
function constructionRefs(c: CircleConstruction): string[] {
  switch (c.kind) {
    case 'circumscribed': return [c.p1, c.p2, c.p3];
    case 'incircle': return [c.p1, c.p2, c.p3];
  }
}
```

Trong `render`, sau khối `circumscribed`:

```ts
    if (c?.kind === 'incircle') {
      const p1 = ctx.resolveRef(c.p1);
      const p2 = ctx.resolveRef(c.p2);
      const p3 = ctx.resolveRef(c.p3);
      return board.create('incircle', [p1, p2, p3], baseOpts);
    }
```

Trong `describe`, sau khối `circumscribed`:

```ts
    if (c?.kind === 'incircle') {
      return `Đường tròn nội tiếp Δ${L(c.p1)}${L(c.p2)}${L(c.p3)}`;
    }
```

- [ ] **Step 4: Chạy test PASS** — Run: `npx jest circle.incircle`.

- [ ] **Step 5: Commit**

```bash
git add src/core/scene/kinds/circle.ts src/core/scene/kinds/__tests__/circle.incircle.test.ts
git commit -m "feat(scene): render đường tròn nội tiếp (construction incircle)"
```

### Task 6.2: Tool incircle

**Files:** Modify `tools.tsx`, `icons.tsx`, `finalizeShape.ts`; cùng test file `finalizeShape.advanced.test.ts`.

- [ ] **Step 1: Thêm test**

```ts
test('incircle dispatch circle với construction incircle (3 đỉnh)', () => {
  const { ctx, dispatched } = mkCtx(['point', 'point', 'point'], ['A', 'B', 'C']);
  finalizeShape(ctx, tool('incircle'));
  expect(dispatched[0].payload.obj!.kind).toBe('circle');
  expect(dispatched[0].payload.obj!.attrs.construction).toEqual({ kind: 'incircle', p1: 'A', p2: 'B', p3: 'C' });
});
```

- [ ] **Step 2: Chạy test FAIL** — Run: `npx jest finalizeShape.advanced`.

- [ ] **Step 3: Implement**

`GeomTool` thêm `| 'incircle'`.

`icons.tsx`:

```tsx
  incircle: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M3 19 L12 4 L21 19 Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
      <circle cx="12" cy="14" r="4.2" fill="none" stroke={C_CONSTRUCT} strokeWidth="1.3"/>
    </svg>
  ),
```

`TOOLS` (nhóm triangle, cạnh incenter):

```ts
  { key: 'incircle', label: 'Đường tròn nội tiếp', hint: 'Click 3 đỉnh tam giác', icon: Icon.incircle, group: 'triangle', needs: 3, accepts: ['point', 'point', 'point'] },
```

`finalizeShape.ts` case:

```ts
    case 'incircle': {
      const id = freshId(ctx, 'ic');
      const label = ctx.nextLabel('circle');
      ctx.store.dispatch({
        type: 'ADD',
        payload: { obj: mkSceneObj(id, 'circle', label, {
          construction: { kind: 'incircle', p1: ids[0], p2: ids[1], p3: ids[2] },
        }) },
      });
      return;
    }
```

- [ ] **Step 4: Chạy test PASS** — Run: `npx jest finalizeShape.advanced`.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(geometry-2d): tool đường tròn nội tiếp (incircle)"
```

---

## Phase 7 — excircle (đường tròn bàng tiếp): DSL kind + render + tool

### Task 7.1: DSL kind module excircle

**Files:**
- Create: `src/stamps/geometry-2d/dsl/kinds/circles/excircle.ts`
- Modify: `src/stamps/geometry-2d/dsl/kinds/registry.ts` (thêm vào ALL_MODULES), `src/stamps/geometry-2d/dsl/schema.ts` (thêm vào union DslShape)
- Test: `src/stamps/geometry-2d/dsl/kinds/__tests__/excircle.test.ts` (tạo)

- [ ] **Step 1: Viết test thất bại**

```ts
// src/stamps/geometry-2d/dsl/kinds/__tests__/excircle.test.ts
import { excircleModule } from '../circles/excircle';

test('excircle module emit circle với construction excircle', () => {
  const ctx = { resolveId: (n: string) => `id_${n}` } as never;
  const out = excircleModule.emit(
    { name: 'w', kind: 'excircle', vertices: ['A', 'B', 'C'], opposite: 'A' } as never,
    ctx,
  );
  expect(out[0].object.kind).toBe('circle');
  expect(out[0].object.attrs).toMatchObject({
    construction: { kind: 'excircle', p1: 'id_A', p2: 'id_B', p3: 'id_C', opposite: 'id_A' },
  });
});
```

- [ ] **Step 2: Chạy test FAIL** — Run: `npx jest dsl/kinds/__tests__/excircle`
Expected: FAIL (module chưa tồn tại).

- [ ] **Step 3: Tạo module excircle**

```ts
// src/stamps/geometry-2d/dsl/kinds/circles/excircle.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslShapeT } from '../../schema';
import { defineModule } from '../_types';
import { SHAPE_BASE_FIELDS } from '../_shared';

type Input = Extract<DslShapeT, { kind: 'excircle' }>;

export const excircleModule = defineModule<'excircle', Input>({
  kind: 'excircle',
  role: 'circle',
  category: 'circles',
  prefix: 'c',
  schema: z.object({
    name: NameZ,
    kind: z.literal('excircle'),
    vertices: z.tuple([NameZ, NameZ, NameZ]),
    opposite: NameZ,
  }),
  collectRefs: (e) => [...e.vertices],
  emit: (e, ctx) => [{
    role: 'primary',
    object: {
      id: ctx.resolveId(e.name),
      kind: 'circle',
      label: e.name,
      ...SHAPE_BASE_FIELDS,
      attrs: {
        construction: {
          kind: 'excircle',
          p1: ctx.resolveId(e.vertices[0]),
          p2: ctx.resolveId(e.vertices[1]),
          p3: ctx.resolveId(e.vertices[2]),
          opposite: ctx.resolveId(e.opposite),
        },
      },
    },
  }],
});
```

`schema.ts`: thêm vào union `DslShape` (tìm chỗ khai báo các shape circle như `circleCR`/`incircle`) một biến thể:

```ts
  z.object({ name: NameZ, kind: z.literal('excircle'), vertices: z.tuple([NameZ, NameZ, NameZ]), opposite: NameZ }),
```

`kinds/registry.ts`: import `excircleModule` và thêm vào mảng `ALL_MODULES` cạnh `incircleModule`.

- [ ] **Step 4: Chạy test PASS + registry test**

Run: `npx jest dsl/kinds/__tests__/excircle dsl/kinds/__tests__/registry`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(dsl): kind excircle (đường tròn bàng tiếp) + đăng ký registry/schema"
```

### Task 7.2: Render excircle trong circle.ts

**Files:**
- Modify: `src/core/scene/kinds/circle.ts`
- Test: `src/core/scene/kinds/__tests__/circle.excircle.test.ts` (tạo)

- [ ] **Step 1: Viết test thất bại**

```ts
// src/core/scene/kinds/__tests__/circle.excircle.test.ts
import '../circle';
import { getKind } from '../../registry';

test('excircle render: tạo incircle của tam giác mở rộng (dùng excenter + tiếp tuyến)', () => {
  const def = getKind('circle')!;
  const created: { type: string }[] = [];
  const board = { create: (type: string) => { created.push({ type }); return { type, X: () => 0, Y: () => 0 }; } };
  const refs: Record<string, { X: () => number; Y: () => number }> = {
    A: { X: () => 0, Y: () => 0 }, B: { X: () => 4, Y: () => 0 }, C: { X: () => 0, Y: () => 3 },
  };
  const obj = {
    id: 'c1', kind: 'circle', label: 'w', visible: true, locked: false, layer: 'd', schemaVersion: 1,
    attrs: { construction: { kind: 'excircle', p1: 'A', p2: 'B', p3: 'C', opposite: 'A' } },
  } as never;
  const out = def.render(obj, { jxg: board, resolveRef: (id: string) => refs[id] } as never);
  // Render tạo 1 circle function-based (tâm = excenter, bán kính = k.cách tới 1 cạnh).
  expect(created.some((c) => c.type === 'circle')).toBe(true);
  expect(out).toBeTruthy();
});
```

- [ ] **Step 2: Chạy test FAIL** — Run: `npx jest circle.excircle`.

- [ ] **Step 3: Thêm excircle vào CircleConstruction + render (function-based circle: tâm excenter, r = khoảng cách tới cạnh đối)**

`circle.ts` mở rộng union + refs:

```ts
export type CircleConstruction =
  | { kind: 'circumscribed'; p1: string; p2: string; p3: string }
  | { kind: 'incircle'; p1: string; p2: string; p3: string }
  | { kind: 'excircle'; p1: string; p2: string; p3: string; opposite: string };
```

```ts
function constructionRefs(c: CircleConstruction): string[] {
  switch (c.kind) {
    case 'circumscribed': return [c.p1, c.p2, c.p3];
    case 'incircle': return [c.p1, c.p2, c.p3];
    case 'excircle': return [c.p1, c.p2, c.p3];
  }
}
```

Trong `render`, thêm (import `excenter` từ pointConstructions ở đầu file: `import { excenter } from './pointConstructions';`):

```ts
    if (c?.kind === 'excircle') {
      const P = [ctx.resolveRef(c.p1), ctx.resolveRef(c.p2), ctx.resolveRef(c.p3)] as any[];
      const ids = [c.p1, c.p2, c.p3];
      const oppIdx = Math.max(0, ids.indexOf(c.opposite)) as 0 | 1 | 2;
      // Tâm = excenter; bán kính = khoảng cách từ tâm tới đường thẳng chứa cạnh
      // KHÔNG kề đỉnh đối (cạnh đối diện đỉnh `opposite`).
      const verts = () => [
        [P[0].X(), P[0].Y()], [P[1].X(), P[1].Y()], [P[2].X(), P[2].Y()],
      ] as [[number, number], [number, number], [number, number]];
      const ctr = () => excenter(verts(), oppIdx);
      const radius = () => {
        const [I] = [ctr()];
        // cạnh đối diện `opposite` = 2 đỉnh còn lại.
        const others = [0, 1, 2].filter((i) => i !== oppIdx);
        const v = verts();
        const a = v[others[0]]; const b = v[others[1]];
        const dx = b[0] - a[0]; const dy = b[1] - a[1];
        const len = Math.hypot(dx, dy) || 1;
        // khoảng cách điểm I tới đường thẳng ab.
        return Math.abs((I[0] - a[0]) * dy - (I[1] - a[1]) * dx) / len;
      };
      const center = board.create('point', [() => ctr()[0], () => ctr()[1]], { visible: false, withLabel: false, fixed: true, name: '' });
      const circ: any = board.create('circle', [center, () => radius()], baseOpts);
      circ._helpers = [center];
      return circ;
    }
```

Trong `describe`:

```ts
    if (c?.kind === 'excircle') {
      return `Đường tròn bàng tiếp Δ${L(c.p1)}${L(c.p2)}${L(c.p3)} đối diện ${L(c.opposite)}`;
    }
```

- [ ] **Step 4: Chạy test PASS** — Run: `npx jest circle.excircle`.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(scene): render đường tròn bàng tiếp (construction excircle)"
```

### Task 7.3: Tool excircle

**Files:** Modify `tools.tsx`, `icons.tsx`, `finalizeShape.ts`; cùng test file `finalizeShape.advanced.test.ts`.

- [ ] **Step 1: Thêm test**

```ts
test('excircle dispatch circle với construction excircle, opposite = đỉnh đầu', () => {
  const { ctx, dispatched } = mkCtx(['point', 'point', 'point'], ['A', 'B', 'C']);
  finalizeShape(ctx, tool('excircle'));
  expect(dispatched[0].payload.obj!.kind).toBe('circle');
  expect(dispatched[0].payload.obj!.attrs.construction).toEqual({ kind: 'excircle', p1: 'A', p2: 'B', p3: 'C', opposite: 'A' });
});
```

- [ ] **Step 2: Chạy test FAIL** — Run: `npx jest finalizeShape.advanced`.

- [ ] **Step 3: Implement**

`GeomTool` thêm `| 'excircle'`.

`icons.tsx`:

```tsx
  excircle: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M6 9 L14 4 L18 13 Z" stroke="currentColor" strokeWidth="1.2"/>
      <circle cx="9" cy="17" r="4.6" fill="none" stroke={C_CONSTRUCT} strokeWidth="1.3"/>
    </svg>
  ),
```

`TOOLS` (nhóm advanced):

```ts
  { key: 'excircle', label: 'Đường tròn bàng tiếp', hint: 'Click 3 đỉnh tam giác (đỉnh đầu = đỉnh đối diện)', icon: Icon.excircle, group: 'advanced', needs: 3, accepts: ['point', 'point', 'point'] },
```

`finalizeShape.ts` case:

```ts
    case 'excircle': {
      const id = freshId(ctx, 'exc');
      const label = ctx.nextLabel('circle');
      ctx.store.dispatch({
        type: 'ADD',
        payload: { obj: mkSceneObj(id, 'circle', label, {
          construction: { kind: 'excircle', p1: ids[0], p2: ids[1], p3: ids[2], opposite: ids[0] },
        }) },
      });
      return;
    }
```

- [ ] **Step 4: Chạy test PASS** — Run: `npx jest finalizeShape.advanced`.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(geometry-2d): tool đường tròn bàng tiếp (excircle)"
```

---

## Phase 8 — Tool `pointOn` (điểm trên đối tượng / glider)

Render glider `onLine/onSegment/onCircle` đã có trong `point.ts` nhưng seed bằng `(t,t)`/`(cosθ,sinθ)` — không bám toạ độ click cho đường tròn lệch gốc. Task 8.1 sửa render seed faithful; 8.2 thêm tool truyền toạ độ click qua finalizeShape.

### Task 8.1: Render glider seed bám toạ độ thực

**Files:**
- Modify: `src/core/scene/kinds/point.ts`
- Test: `src/core/scene/kinds/__tests__/point.glider-seed.test.ts` (tạo)

- [ ] **Step 1: Viết test thất bại**

```ts
// src/core/scene/kinds/__tests__/point.glider-seed.test.ts
import '../point';
import { getKind } from '../../registry';

function renderGlider(constraint: Record<string, unknown>, circle: unknown) {
  const def = getKind('point')!;
  const created: { type: string; parents: unknown[] }[] = [];
  const board = { create: (type: string, parents: unknown[]) => { created.push({ type, parents }); return {}; } };
  const obj = { id: 'p', kind: 'point', label: 'P', visible: true, locked: false, layer: 'd', schemaVersion: 1, attrs: { constraint } } as never;
  def.render(obj, { jxg: board, resolveRef: () => circle } as never);
  return created[0];
}

test('onCircle seed dọc tia tâm→theta (tâm lệch gốc)', () => {
  // circle tâm (10,10) bán kính 5; theta = 0 → seed phải nằm bên phải tâm (x>10).
  const circle = { center: { X: () => 10, Y: () => 10 } };
  const g = renderGlider({ kind: 'onCircle', circleId: 'c', theta: 0 }, circle);
  expect(g.type).toBe('glider');
  const [sx] = g.parents as [number, number, unknown];
  expect(sx).toBeGreaterThan(10);
});
```

- [ ] **Step 2: Chạy test FAIL** — Run: `npx jest point.glider-seed`
Expected: FAIL (seed hiện = `cos(0)=1`, không > 10).

- [ ] **Step 3: Sửa render onCircle/onLine/onSegment seed**

Trong `point.ts` `render`, thay 3 nhánh glider:

```ts
    if (c.kind === 'onLine') {
      const line = ctx.resolveRef(c.lineId) as any;
      const p1 = line.point1; const p2 = line.point2;
      const sx = (p1 && p2) ? p1.X() + c.t * (p2.X() - p1.X()) : c.t;
      const sy = (p1 && p2) ? p1.Y() + c.t * (p2.Y() - p1.Y()) : c.t;
      return board.create('glider', [sx, sy, line], opts);
    }
    if (c.kind === 'onSegment') {
      const seg = ctx.resolveRef(c.segmentId) as any;
      const p1 = seg.point1; const p2 = seg.point2;
      const sx = (p1 && p2) ? p1.X() + c.t * (p2.X() - p1.X()) : c.t;
      const sy = (p1 && p2) ? p1.Y() + c.t * (p2.Y() - p1.Y()) : c.t;
      return board.create('glider', [sx, sy, seg], opts);
    }
    if (c.kind === 'onCircle') {
      const circle = ctx.resolveRef(c.circleId) as any;
      const O = circle.center ?? circle.midpoint;
      const ox = O ? O.X() : 0; const oy = O ? O.Y() : 0;
      return board.create('glider', [ox + Math.cos(c.theta), oy + Math.sin(c.theta), circle], opts);
    }
```

- [ ] **Step 4: Chạy test PASS** — Run: `npx jest point.glider-seed`.

- [ ] **Step 5: Chạy regression point/onLine/onCircle test cũ**

Run: `npx jest src/core/scene/kinds/__tests__`
Expected: PASS (nếu có snapshot cũ assert `[t,t]` thì cập nhật cho khớp seed mới — đây là cải thiện đúng).

- [ ] **Step 6: Commit**

```bash
git add src/core/scene/kinds/point.ts src/core/scene/kinds/__tests__/point.glider-seed.test.ts
git commit -m "fix(scene): glider onLine/onSegment/onCircle seed bám toạ độ thực (placement faithful)"
```

### Task 8.2: Tool pointOn + truyền toạ độ click

**Files:**
- Modify: `handlers/finalizeShape.ts` (signature + case), `handlers/pointerDown/multiClick.ts` (truyền clickXY), `tools.tsx`, `icons.tsx`
- Test: `finalizeShape.advanced.test.ts`

- [ ] **Step 1: Thêm test (truyền clickXY qua tham số thứ 3)**

```ts
test('pointOn trên circle → constraint onCircle theta từ click (atan2 từ tâm)', () => {
  const dispatched: { payload: { obj?: { attrs: Record<string, unknown> } } }[] = [];
  let n = 0;
  // circle tâm (0,0); JXG obj có center.X/Y.
  const circleObj = { elementClass: 3, center: { X: () => 0, Y: () => 0 } };
  const ctx = {
    pendingRef: { current: [circleObj] },
    pendingIdsRef: { current: ['c1'] },
    store: { getState: () => ({ counter: n, objects: {} }), dispatch: (a: never) => { n += 1; dispatched.push(a as never); } },
    nextLabel: () => 'P',
  } as never;
  // click tại (0,5) → theta = atan2(5,0) = π/2.
  finalizeShape(ctx, tool('pointOn'), { x: 0, y: 5 });
  const con = dispatched[0].payload.obj!.attrs.constraint as { kind: string; circleId: string; theta: number };
  expect(con.kind).toBe('onCircle');
  expect(con.circleId).toBe('c1');
  expect(con.theta).toBeCloseTo(Math.PI / 2, 5);
});
```

- [ ] **Step 2: Chạy test FAIL** — Run: `npx jest finalizeShape.advanced`
Expected: FAIL (signature finalizeShape chưa nhận tham số 3 + chưa có pointOn).

- [ ] **Step 3: Mở rộng signature finalizeShape + case pointOn**

`finalizeShape.ts` đổi signature:

```ts
export function finalizeShape(ctx: HandlerCtx, toolDef: ToolDef, clickXY?: { x: number; y: number }): void {
```

Thêm case (dùng `objKind` + helper hình học inline):

```ts
    case 'pointOn': {
      const obj = ctx.pendingRef.current[0];
      const objId = ctx.pendingIdsRef.current[0];
      if (!obj || !objId) return;
      const kind = objKind(obj);
      const id = freshId(ctx, 'p');
      const label = ctx.nextLabel('point');
      const cx = clickXY?.x ?? 0;
      const cy = clickXY?.y ?? 0;
      let constraint: Record<string, unknown> | null = null;
      if (kind === 'circle') {
        const o = (obj as any).center ?? (obj as any).midpoint;
        const ox = o ? o.X() : 0; const oy = o ? o.Y() : 0;
        constraint = { kind: 'onCircle', circleId: objId, theta: Math.atan2(cy - oy, cx - ox) };
      } else if (kind === 'line') {
        // segment vs line: elType phân biệt để chọn onSegment/onLine.
        const elType = ((obj as any).elType || '').toString().toLowerCase();
        const p1 = (obj as any).point1; const p2 = (obj as any).point2;
        let t = 0;
        if (p1 && p2) {
          const dx = p2.X() - p1.X(); const dy = p2.Y() - p1.Y();
          const len2 = dx * dx + dy * dy || 1;
          t = ((cx - p1.X()) * dx + (cy - p1.Y()) * dy) / len2;
        }
        constraint = elType === 'segment'
          ? { kind: 'onSegment', segmentId: objId, t }
          : { kind: 'onLine', lineId: objId, t };
      }
      if (!constraint) return;
      ctx.store.dispatch({ type: 'ADD', payload: { obj: mkSceneObj(id, 'point', label, { constraint }) } });
      return;
    }
```

`multiClick.ts`: ở nhánh cuối `finalizeShape(ctx, toolDef)` (không-transform), truyền toạ độ click `x, y`:

```ts
    finalizeShape(ctx, toolDef, { x, y });
```

(Có 1 call `finalizeShape(ctx, toolDef)` cho angleBisector 2-line mode — để nguyên, không cần clickXY.)

`tools.tsx` `GeomTool` thêm `| 'pointOn'`; `icons.tsx`:

```tsx
  pointOn: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="1.3"/>
      <circle cx="17.3" cy="6.7" r="2.4" fill={C_POINT}/>
    </svg>
  ),
```

`TOOLS` (nhóm point):

```ts
  { key: 'pointOn', label: 'Điểm trên đối tượng', hint: 'Click 1 đường/đoạn/đường tròn có sẵn', icon: Icon.pointOn, group: 'point', needs: 1, accepts: ['lineOrCircle'] },
```

- [ ] **Step 4: Chạy test PASS** — Run: `npx jest finalizeShape.advanced`.

- [ ] **Step 5: typecheck + full geometry-2d test**

Run: `npm run typecheck && npx jest src/stamps/geometry-2d`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(geometry-2d): tool điểm trên đối tượng (pointOn glider) bám click"
```

---

## Phase 9 — Verify tổng

### Task 9.1: Typecheck + full suite + smoke

- [ ] **Step 1: Typecheck toàn repo**

Run: `npm run typecheck`
Expected: 0 lỗi.

- [ ] **Step 2: Full test suite**

Run: `npm test`
Expected: tất cả xanh (bao gồm các test mới + không regression).

- [ ] **Step 3: Kiểm tra eval/DSL không vỡ do thêm kind excircle**

Run: `npx jest src/stamps/geometry-2d/dsl`
Expected: PASS (schema/registry round-trip OK với excircle).

- [ ] **Step 4: Commit (nếu có fix lặt vặt)**

```bash
git add -A && git commit -m "test: ổn định suite sau khi thêm tool search redesign + kind mới"
```

---

## Self-Review Notes (đã chạy)

- **Spec coverage:** Req1 (search list) = Phase 1. Req2 (vẽ tương tác đầy đủ Tier 1+2) = Phase 3–8 (excenter, tangencyPoint, secondIntersection, arcMidpoint, circleIntersection, tangentPointExt, circleCR, incircle, excircle, pointOn). Group "Nâng cao" = Phase 2. Render gap incircle/excircle = Phase 6/7.
- **Type consistency:** Tất cả constraint shape khớp `Constraint2D` trong `2d-constraint.ts` (excenter/tangencyPoint/secondIntersection/arcMidpoint/circleIntersection/tangentPointExt/onCircle/onLine/onSegment); circle construction `incircle`/`excircle` thêm mới khớp render thêm ở `circle.ts`.
- **Placeholder:** không có TODO/TBD; mọi step có code thật + lệnh chạy.
- **Lưu ý khi thực thi:** vài đường dẫn registry/schema (`schema.ts` union, `kinds/registry.ts` ALL_MODULES) cần khớp tên export thực tế — đọc file trước khi sửa (Task 7.1). Nếu test cũ assert glider seed `(t,t)` thì cập nhật theo seed faithful mới (Task 8.1 Step 5).
