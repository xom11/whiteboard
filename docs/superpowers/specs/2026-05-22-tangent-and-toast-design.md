# Tangent rework + Shared Toast — Design

**Status**: Approved (brainstorm 2026-05-22)
**Scope**: `@xom11/whiteboard` — `src/stamps/shared/Toast/*`, `src/core/scene/kinds/line.ts`, `src/stamps/geometry-2d/editor/{tools.tsx,preview.ts,handlers/finalizeShape.ts,handlers/ctx.ts}`

## Motivation

1. **Tiếp tuyến đường tròn không hoạt động đúng**: Code hiện tại (`kinds/line.ts:123–137`) tạo glider trên đường tròn tại vị trí gần `throughPoint` rồi vẽ tangent ở glider. Khi P ngoài đường tròn, glider rơi vào điểm gần nhất trên circle → tangent vẽ ra KHÔNG đi qua P. Đó là sai semantic ("tiếp tuyến từ điểm P tới đường tròn").
2. **Không có toast UX** trong stamp editor → invalid construction (vd "P trong đường tròn nên không có tiếp tuyến") không thể báo cho user.

## Goals

- Tiếp tuyến hỗ trợ 3 case: P inside → 0 line + toast; P on → 1 line; P outside → 2 line.
- Toast infra dùng được cho cả 3 stamp editor (geometry-2d, geometry-3d, graph-2d) và mở rộng cho các use case tương lai (vd hint "ba điểm thẳng hàng" cho circumcircle).
- Icon tangent mô tả đúng case phổ biến (P outside + 2 tangent).
- Backward-compat: tangent đã lưu trước fix vẫn render (giữ behavior cũ — branch implicit `'on'`).

## Non-Goals

- Mobile-specific toast layout (default bottom-center là đủ cho mobile drawer).
- i18n — chuỗi hard-code tiếng Việt, đồng nhất với phần UI hiện tại.
- Migration bump schemaVersion — default-at-render đủ.
- Mở rộng toast ra Excalidraw canvas (Excalidraw đã có toast riêng).

## Part 1 — Shared Toast Infrastructure

### File layout

```
src/stamps/shared/Toast/
├── index.ts            ← barrel: useToast, ToastHost, ToastProvider, types
├── ToastProvider.tsx   ← context + queue state
├── ToastHost.tsx       ← renders the queue (mounted by each EditorPanel root)
├── Toast.tsx           ← single toast item component
├── useToast.ts         ← hook returning { showToast }
├── types.ts            ← ToastVariant, ToastOptions, ShowToastFn
└── __tests__/
    ├── ToastProvider.test.tsx
    └── Toast.test.tsx
```

### Public API

```ts
type ToastVariant = 'info' | 'warning' | 'error';

interface ToastOptions {
  variant?: ToastVariant;        // default: 'info'
  duration?: number;             // ms, default: 3000; 0 = sticky
  id?: string;                   // dedupe key — repeat showToast with same id resets timer
}

type ShowToastFn = (message: string, opts?: ToastOptions) => void;

function useToast(): { showToast: ShowToastFn; dismiss: (id: string) => void };
```

### Architecture

- **Provider per editor instance** (no global singleton).
  Each `EditorPanel` (geometry-2d / geometry-3d / graph-2d) wraps its panel content in `<ToastProvider><ToastHost />…</ToastProvider>`.
  Reasons: each stamp editor renders in its own portal/overlay; sharing toast state across editors has no use case; provider-scoped state simplifies teardown when editor closes.

- **Queue model**: `useReducer` state in provider, actions `PUSH | DISMISS | TICK_REMOVE`. Max 3 visible; pushing #4 drops oldest (FIFO).

- **Auto-dismiss**: each toast gets a `setTimeout(duration)` registered on push; cleared on early dismiss. `duration: 0` → sticky.

- **Dedup**: when `opts.id` matches an existing visible toast, replace its message + reset timer (no duplicate).

- **ToastHost positioning**: absolute, bottom-center within nearest positioned ancestor (editor panel root); `pointer-events: none` on container, `pointer-events: auto` on each toast.

### Visual spec

- Card: `rounded-lg shadow-md border-l-4 bg-white px-3 py-2 text-sm`
- Border-l color by variant:
  - `info`: `border-l-sky-500`
  - `warning`: `border-l-amber-500`
  - `error`: `border-l-rose-500`
- Icon (left): heroicons-style 14px inline SVG matching variant
- Close button (right): `×` button, focusable
- Stack: `flex flex-col-reverse gap-2` so newest appears on bottom; entrance animation `translate-y-2 opacity-0 → translate-y-0 opacity-100` (200ms ease-out)
- Width: `max-w-sm`, content wraps

### Tests

- `ToastProvider.test.tsx`:
  - `showToast` adds to queue.
  - `dismiss(id)` removes immediately.
  - Auto-dismiss after duration (jest fake timers).
  - Queue overflow drops oldest when 4th push.
  - Dedup by `id` resets timer instead of stacking.
- `Toast.test.tsx`:
  - Renders message + variant icon.
  - Click `×` triggers onDismiss callback.

## Part 2 — Tangent Tool Rework

### Data model (`src/core/scene/kinds/line.ts`)

```ts
// Before
| { kind: 'tangent'; throughPoint: string; toCircle: string };

// After
| { kind: 'tangent'; throughPoint: string; toCircle: string; branch?: 0 | 1 | 'on' };
```

- `branch === undefined`: legacy data — render treats as `'on'`.
- `branch === 'on'`: P on circle → one line via glider-at-P + JXG `tangent` element.
- `branch === 0 | 1`: P outside circle → tangent through P touching circle at intersection point `branch` of the Thales auxiliary circle.

`dependsOn` unchanged: `[throughPoint, toCircle]`.

### Render — `'on'` branch (unchanged from current code)

```ts
const glider = board.create('glider', [through.X(), through.Y(), toCircle], { visible: false, ... });
const tangent = board.create('tangent', [glider], baseOpts);
(tangent as any)._helpers = [glider];
return tangent;
```

### Render — `0 | 1` branch (new)

```ts
// Thales construction:
//   Let O = circle center, P = throughPoint, r = circle radius.
//   M = midpoint(O, P). Circle Thales has center M, passes through O and P.
//   Intersections of Thales circle with original circle → tangent touch points T0, T1.
//   Tangent line = line(P, T_branch).
const O = (toCircle as any).center;        // JXG circle stores center as point
const M = board.create('midpoint', [O, through], { visible: false, withLabel: false, fixed: true, name: '' });
const thales = board.create('circle', [M, through], {
  visible: false, withLabel: false, fixed: true,
  strokeOpacity: 0, fillOpacity: 0,
});
const T = board.create('intersection', [thales, toCircle, c.branch], {
  visible: false, withLabel: false, fixed: true, name: '',
});
const tangent = board.create('line', [through, T], {
  ...baseOpts, straightFirst: true, straightLast: true,
});
(tangent as any)._helpers = [M, thales, T];
return tangent;
```

**Note**: `intersection` element returns a `JXG.Point` whose coords become `NaN` when there are no intersections (P inside circle case at render time). JSXGraph handles `NaN` points gracefully (line is just not drawn). This matches the desired "invalid → no render" behavior if user later drags P inside.

### finalizeShape — classify + dispatch

```ts
// src/stamps/geometry-2d/editor/handlers/finalizeShape.ts
case 'tangent': {
  const throughId = findPickIdByKind(ctx, 'point');
  const circleId = findPickIdByKind(ctx, 'circle');
  if (!throughId || !circleId) return;

  const pos = classifyPointVsCircle(ctx, throughId, circleId);
  // 'inside' | 'on' | 'outside'

  if (pos === 'inside') {
    ctx.toast?.('Điểm nằm trong đường tròn — không có tiếp tuyến', {
      variant: 'warning',
      id: 'tangent-invalid-inside',  // dedupe spammy clicks
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

  // outside → 2 separate scene elements
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
}
```

Helper `classifyPointVsCircle` reads live JXG positions:

```ts
function classifyPointVsCircle(ctx: HandlerCtx, pointId: string, circleId: string): 'inside' | 'on' | 'outside' {
  const point = ctx.jxgRef.current?.objects[pointId] as any;
  const circle = ctx.jxgRef.current?.objects[circleId] as any;
  if (!point || !circle) return 'inside';  // defensive: refuse if state weird
  const dx = point.X() - circle.center.X();
  const dy = point.Y() - circle.center.Y();
  const d = Math.hypot(dx, dy);
  const r = circle.Radius();
  const eps = Math.max(1e-9, 1e-6 * r);
  if (Math.abs(d - r) <= eps) return 'on';
  return d < r ? 'inside' : 'outside';
}
```

### HandlerCtx — inject toast

Add optional `toast?: ShowToastFn` to `HandlerCtx`. Wired from EditorPanel (which has `useToast`).
Optional because handlers run in test contexts that don't mount `ToastProvider`.

### Preview (`preview.ts`)

- Picks = 1 (only point picked): no preview (we'd need circle to project tangent — too indeterminate).
- Picks = 1 (only circle picked, phantom = cursor): keep existing glider+tangent preview (approximate, conveys "tangent at this circle"). This is acceptable since preview is just a hint; finalize will branch correctly.
- After point + circle picked: tool finalizes immediately (no further preview).

No behavioral change here; current preview code stays.

### Icon (`tools.tsx`)

Replace current single-tangent icon with external-point + 2-tangent depiction:

```tsx
tangent: (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeLinecap="round">
    <circle cx="9" cy="14" r="5" stroke="currentColor" strokeWidth="1.5"/>
    {/* External point top-right */}
    <line x1="20" y1="5" x2="11.1" y2="10.6" stroke={C_CONSTRUCT} strokeWidth="1.5"/>
    <line x1="20" y1="5" x2="13.5" y2="17.5" stroke={C_CONSTRUCT} strokeWidth="1.5"/>
    <circle cx="20" cy="5" r="1.7" fill={C_POINT}/>
    {/* Touch points */}
    <circle cx="11.1" cy="10.6" r="1.1" fill={C_POINT}/>
    <circle cx="13.5" cy="17.5" r="1.1" fill={C_POINT}/>
  </svg>
),
```

Tangent endpoints are pre-computed to actually touch the circle (Thales construction with center (9,14) r=5, point (20,5)). Touch points: T1≈(11.1,10.6), T2≈(13.5,17.5).

## Migration

- Existing tangents in saved sessionStorage / DB have `branch === undefined` → render falls through to `'on'` branch (same JXG calls as before).
- No `KindDef.migrate` entry needed; no schemaVersion bump.
- Caveat (documented): legacy tangents where user picked an EXTERNAL point will continue to render the wrong way (tangent at nearest circle point). User must re-draw tangent to get correct 2-line behavior. This is acceptable — existing data was already broken.

## Test plan

- **Unit**:
  - `kinds/line.test.ts`: add cases for `branch: 0 | 1 | 'on' | undefined` — `dependsOn` returns same array.
  - `handlers/finalizeShape.test.ts` (new file): mock board + 3 scenarios; verify `store.dispatch` call counts (2 ADDs for outside, 1 for on, 0 for inside + toast call). Mock `ctx.toast`.
  - `Toast/__tests__/*`: covered in Part 1.
- **Manual smoke (browser)**:
  - Open geometry-2d editor; create circle; pick tangent tool; click point INSIDE → toast appears, no line. Click ON → 1 line. Click OUTSIDE → 2 lines.
  - Drag external point: when crossing into circle, both lines disappear; crossing out, reappear.
  - Re-open via double-click stamp: existing tangents restore (legacy single-tangent + new dual).

## Out of scope

- Toast positioning override per editor (default bottom-center used everywhere).
- Tangent from external point to non-circle conics (ellipse) — not requested.
- Tool to label the 2 tangents differently (`t1`, `t2`) — labelOf default sequencing is fine.

## File-change summary

| File | Change |
|---|---|
| `src/stamps/shared/Toast/types.ts` | New |
| `src/stamps/shared/Toast/ToastProvider.tsx` | New |
| `src/stamps/shared/Toast/ToastHost.tsx` | New |
| `src/stamps/shared/Toast/Toast.tsx` | New |
| `src/stamps/shared/Toast/useToast.ts` | New |
| `src/stamps/shared/Toast/index.ts` | New (barrel) |
| `src/stamps/shared/Toast/__tests__/ToastProvider.test.tsx` | New |
| `src/stamps/shared/Toast/__tests__/Toast.test.tsx` | New |
| `src/stamps/geometry-2d/editor/EditorPanel.tsx` | Wrap content in `<ToastProvider><ToastHost />…</ToastProvider>` |
| `src/stamps/geometry-3d/editor/EditorPanel.tsx` | Same wrap |
| `src/stamps/graph-2d/editor/EditorPanel.tsx` | Same wrap |
| `src/core/scene/kinds/line.ts` | Add `branch` to tangent type; render switch for `'on'` vs `0|1` |
| `src/stamps/geometry-2d/editor/handlers/ctx.ts` | Add optional `toast?: ShowToastFn` field |
| `src/stamps/geometry-2d/editor/handlers/finalizeShape.ts` | Tangent: classify + dispatch 0/1/2 ADDs |
| `src/stamps/geometry-2d/editor/EditorPanel.tsx` | Wire `useToast` into HandlerCtx ref |
| `src/stamps/geometry-2d/editor/tools.tsx` | Replace tangent SVG icon |
| `src/core/scene/kinds/__tests__/line.test.ts` | Add tangent branch dependsOn cases |
| `src/stamps/geometry-2d/editor/handlers/__tests__/finalizeShape.test.ts` | New: 3 tangent scenarios |
