# Tier E.1 — Toolbar UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm UI toolbar cho 5 derived primitives đã wire State trong Tier E v0.21.0: perpFoot (group `point`) + 4 triangle centers (group `triangle` mới).

**Architecture:** Single-PR addition. Mở rộng `GeomTool` union + `GeomGroup` + `GROUP_ORDER`, thêm 5 ToolDef entries, 5 SVG icons trong `Icon` object, 5 case mới trong `finalizeShape.ts`. Pattern theo precedent existing (midpoint, perpendicular).

**Tech Stack:** TypeScript strict, React 18 (inline JSX cho icon), Jest 29 + ts-jest.

**Spec:** [`docs/superpowers/specs/2026-05-23-tier-e1-toolbar-ui-design.md`](../specs/2026-05-23-tier-e1-toolbar-ui-design.md)

---

## File Structure

**Modified files (single PR):**
- `src/stamps/geometry-2d/editor/tools.tsx` — types + GROUP_ORDER + GROUP_LABELS + 5 ToolDef + 5 Icon SVG
- `src/stamps/geometry-2d/editor/handlers/finalizeShape.ts` — 5 case mới trong switch
- `src/stamps/geometry-2d/editor/__tests__/tools.test.tsx` — append catalog tests
- `src/stamps/geometry-2d/editor/handlers/__tests__/finalizeShape.test.ts` — append handler tests
- `package.json` — bump 0.21.0 → 0.22.0

**Commits:** 1 PR = 2 commits (feature + release).

---

## Task 1: Type expansion + GROUP_ORDER + GROUP_LABELS

**Files:**
- Modify: `src/stamps/geometry-2d/editor/tools.tsx`
- Test: `src/stamps/geometry-2d/editor/__tests__/tools.test.tsx`

- [ ] **Step 1: Write failing tests**

Append to `src/stamps/geometry-2d/editor/__tests__/tools.test.tsx`:

```ts
import { TOOLS, GROUP_ORDER, GROUP_LABELS, letterForGroup, groupForLetter } from '../tools';

describe('TOOLS — Tier E.1 group expansion', () => {
  test('GROUP_ORDER có 10 entries với triangle tại index 6', () => {
    expect(GROUP_ORDER).toHaveLength(10);
    expect(GROUP_ORDER[6]).toBe('triangle');
  });

  test('GROUP_ORDER giữ thứ tự cũ + chèn triangle sau circle', () => {
    expect(GROUP_ORDER).toEqual([
      'move', 'point', 'line', 'construct', 'polygon', 'circle',
      'triangle', 'measure', 'edit', 'transform',
    ]);
  });

  test('GROUP_LABELS.triangle === "Tam giác"', () => {
    expect(GROUP_LABELS.triangle).toBe('Tam giác');
  });

  test('letterForGroup(triangle) === G', () => {
    expect(letterForGroup('triangle')).toBe('G');
  });

  test('letterForGroup(transform) === J (shifted from I)', () => {
    expect(letterForGroup('transform')).toBe('J');
  });

  test('groupForLetter("G") === triangle', () => {
    expect(groupForLetter('G')).toBe('triangle');
  });
});
```

- [ ] **Step 2: Run failing test**

```bash
npm test -- src/stamps/geometry-2d/editor/__tests__/tools.test.tsx
```

Expected: FAIL — `triangle` không có trong type/order.

- [ ] **Step 3: Expand `GeomGroup` type**

Edit `src/stamps/geometry-2d/editor/tools.tsx`. Trong interface `ToolDef`, mở rộng `group` field:

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
    | 'transform';
```

- [ ] **Step 4: Add `GROUP_LABELS.triangle` entry**

Edit `GROUP_LABELS` object:

```ts
export const GROUP_LABELS: Record<ToolDef['group'], string> = {
  move: 'Cơ bản',
  point: 'Điểm',
  line: 'Đường',
  construct: 'Dựng hình',
  polygon: 'Đa giác',
  circle: 'Đường tròn',
  triangle: 'Tam giác',
  measure: 'Đo lường',
  edit: 'Chỉnh sửa',
  transform: 'Phép biến hình',
};
```

- [ ] **Step 5: Update `GROUP_ORDER` to insert `'triangle'` after `'circle'`**

```ts
export const GROUP_ORDER: GeomGroup[] = [
  'move',
  'point',
  'line',
  'construct',
  'polygon',
  'circle',
  'triangle',
  'measure',
  'edit',
  'transform',
];
```

- [ ] **Step 6: Run tests, verify pass**

```bash
npm test -- src/stamps/geometry-2d/editor/__tests__/tools.test.tsx
```

Expected: PASS (6 new tests).

---

## Task 2: GeomTool union expansion + 5 ToolDef entries

**Files:**
- Modify: `src/stamps/geometry-2d/editor/tools.tsx`
- Test: `src/stamps/geometry-2d/editor/__tests__/tools.test.tsx`

- [ ] **Step 1: Write failing tests**

Append to `tools.test.tsx`:

```ts
describe('TOOLS — Tier E.1 catalog entries', () => {
  test('perpFoot thuộc group point với accepts [point, line]', () => {
    const t = TOOLS.find((x) => x.key === 'perpFoot');
    expect(t).toBeTruthy();
    expect(t!.group).toBe('point');
    expect(t!.needs).toBe(2);
    expect(t!.accepts).toEqual(['point', 'line']);
    expect(t!.label).toBe('Chân đường vuông góc');
  });

  test('group triangle có 4 centers', () => {
    const triangleTools = TOOLS.filter((t) => t.group === 'triangle');
    expect(triangleTools.map((t) => t.key).sort()).toEqual([
      'centroid', 'circumcenter', 'incenter', 'orthocenter',
    ]);
  });

  test('4 centers đều needs 3 + accepts 3 point', () => {
    for (const k of ['centroid', 'circumcenter', 'incenter', 'orthocenter'] as const) {
      const t = TOOLS.find((x) => x.key === k)!;
      expect(t.needs).toBe(3);
      expect(t.accepts).toEqual(['point', 'point', 'point']);
    }
  });

  test('thứ tự group point: point → midpoint → perpFoot → intersect', () => {
    const pointTools = TOOLS.filter((t) => t.group === 'point').map((t) => t.key);
    expect(pointTools).toEqual(['point', 'midpoint', 'perpFoot', 'intersect']);
  });

  test('thứ tự group triangle: centroid → circumcenter → incenter → orthocenter', () => {
    const triangleTools = TOOLS.filter((t) => t.group === 'triangle').map((t) => t.key);
    expect(triangleTools).toEqual([
      'centroid', 'circumcenter', 'incenter', 'orthocenter',
    ]);
  });

  test('labels tiếng Việt đúng', () => {
    const labels: Record<string, string> = {
      perpFoot: 'Chân đường vuông góc',
      centroid: 'Trọng tâm tam giác',
      circumcenter: 'Tâm đường tròn ngoại tiếp',
      incenter: 'Tâm đường tròn nội tiếp',
      orthocenter: 'Trực tâm tam giác',
    };
    for (const [k, v] of Object.entries(labels)) {
      expect(TOOLS.find((t) => t.key === k)!.label).toBe(v);
    }
  });
});
```

- [ ] **Step 2: Run failing tests**

```bash
npm test -- src/stamps/geometry-2d/editor/__tests__/tools.test.tsx
```

Expected: FAIL — `perpFoot` và 4 centers chưa có trong TOOLS.

- [ ] **Step 3: Expand `GeomTool` union**

Edit `tools.tsx`. Thêm 5 keys vào `GeomTool`:

```ts
export type GeomTool =
  | 'move'
  | 'select'
  | 'point'
  | 'midpoint'
  | 'perpFoot'
  | 'intersect'
  | 'segment'
  | 'line'
  | 'ray'
  | 'vector'
  | 'perpendicular'
  | 'parallel'
  | 'perpBisector'
  | 'angleBisector'
  | 'polygon'
  | 'regularPolygon'
  | 'circleCenter'
  | 'semicircle'
  | 'arcCenter'
  | 'arc3'
  | 'sectorCenter'
  | 'circle3'
  | 'tangent'
  | 'centroid'
  | 'circumcenter'
  | 'incenter'
  | 'orthocenter'
  | 'angle'
  | 'distance'
  | 'area'
  | 'toggleLabel'
  | 'toggleVisible'
  | 'delete'
  | 'translate'
  | 'rotate'
  | 'reflectLine'
  | 'reflectPoint'
  | 'dilate';
```

- [ ] **Step 4: Add `perpFoot` entry to `TOOLS` array**

Trong `TOOLS` array, chèn `perpFoot` sau dòng `midpoint`:

```ts
  { key: 'midpoint', label: 'Trung điểm', hint: 'Click 2 điểm có sẵn', icon: Icon.midpoint, group: 'point', needs: 2, accepts: ['point', 'point'] },
  { key: 'perpFoot', label: 'Chân đường vuông góc', hint: 'Click 1 điểm + 1 đường có sẵn', icon: Icon.perpFoot, group: 'point', needs: 2, accepts: ['point', 'line'] },
  { key: 'intersect', label: 'Giao điểm của 2 đối tượng', hint: 'Click 2 đường/đường tròn có sẵn', icon: Icon.intersect, group: 'point', needs: 2, accepts: ['lineOrCircle', 'lineOrCircle'] },
```

**Note:** Tham chiếu `Icon.perpFoot` chưa tồn tại — TypeScript sẽ error. Sẽ được fix trong Task 3 khi thêm Icon. Tạm thời nếu test fail vì TS error, OK; sẽ fix khi Task 3 xong.

- [ ] **Step 5: Add 4 triangle center entries to `TOOLS` array**

Chèn 4 entries sau `tangent` (cuối group 'circle'), trước `angle` (group 'measure'):

```ts
  { key: 'tangent', label: 'Tiếp tuyến', hint: 'Click 1 điểm + 1 đường tròn có sẵn', icon: Icon.tangent, group: 'circle', needs: 2, accepts: ['point', 'circle'] },
  { key: 'centroid',     label: 'Trọng tâm tam giác',           hint: 'Click 3 đỉnh tam giác', icon: Icon.centroid,     group: 'triangle', needs: 3, accepts: ['point', 'point', 'point'] },
  { key: 'circumcenter', label: 'Tâm đường tròn ngoại tiếp',    hint: 'Click 3 đỉnh tam giác', icon: Icon.circumcenter, group: 'triangle', needs: 3, accepts: ['point', 'point', 'point'] },
  { key: 'incenter',     label: 'Tâm đường tròn nội tiếp',      hint: 'Click 3 đỉnh tam giác', icon: Icon.incenter,     group: 'triangle', needs: 3, accepts: ['point', 'point', 'point'] },
  { key: 'orthocenter',  label: 'Trực tâm tam giác',            hint: 'Click 3 đỉnh tam giác', icon: Icon.orthocenter,  group: 'triangle', needs: 3, accepts: ['point', 'point', 'point'] },
  { key: 'angle', label: 'Góc', ... },
```

- [ ] **Step 6: Run tests (skip-typecheck mode)**

```bash
npm test -- src/stamps/geometry-2d/editor/__tests__/tools.test.tsx 2>&1 | tail -20
```

Expected: nếu Icon.X chưa định nghĩa, tests có thể fail với "Cannot read property 'perpFoot' of undefined". Sẽ fix sau Task 3.

---

## Task 3: 5 SVG icons trong `Icon` object

**Files:**
- Modify: `src/stamps/geometry-2d/editor/tools.tsx`

No new test — icons là visual, smoke test qua catalog tests đã có.

- [ ] **Step 1: Add `Icon.perpFoot`**

Trong `Icon` object trong `tools.tsx`, sau `Icon.midpoint`, thêm:

```tsx
  perpFoot: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeLinecap="round">
      {/* Base line ngang (input — currentColor) */}
      <line x1="2" y1="17" x2="22" y2="17" stroke="currentColor" strokeWidth="1.5"/>
      {/* Vertical dashed line từ BLUE point xuống chân (construct/red) */}
      <line x1="9" y1="5" x2="9" y2="17" stroke={C_CONSTRUCT} strokeWidth="1.4" strokeDasharray="2.5 2"/>
      {/* Right-angle mark tại chân */}
      <rect x="9" y="13.5" width="3.5" height="3.5" fill="none" stroke="currentColor" strokeWidth="1"/>
      {/* BLUE point gốc */}
      <circle cx="9" cy="5" r="2" fill={C_POINT}/>
      {/* RED point chân (output) */}
      <circle cx="9" cy="17" r="2.4" fill={C_CONSTRUCT}/>
    </svg>
  ),
```

- [ ] **Step 2: Add 4 triangle center icons**

Trong `Icon` object, sau `Icon.tangent` (cuối Circle section), thêm section comment + 4 icons:

```tsx
  // ===== Triangle centers =====
  centroid: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeLinejoin="round">
      {/* Tam giác outline + fill orange nhạt */}
      <polygon points="4,20 20,20 12,4" fill={C_FILL} fillOpacity="0.18" stroke="currentColor" strokeWidth="1.4"/>
      {/* 3 medians: vertex → midpoint cạnh đối diện (xám dashed) */}
      <line x1="12" y1="4"  x2="12" y2="20" stroke="#94a3b8" strokeWidth="1" strokeDasharray="1.5 1.5"/>
      <line x1="4"  y1="20" x2="16" y2="12" stroke="#94a3b8" strokeWidth="1" strokeDasharray="1.5 1.5"/>
      <line x1="20" y1="20" x2="8"  y2="12" stroke="#94a3b8" strokeWidth="1" strokeDasharray="1.5 1.5"/>
      {/* 3 đỉnh BLUE */}
      <circle cx="4"  cy="20" r="1.5" fill={C_POINT}/>
      <circle cx="20" cy="20" r="1.5" fill={C_POINT}/>
      <circle cx="12" cy="4"  r="1.5" fill={C_POINT}/>
      {/* Trọng tâm RED tại giao 3 medians */}
      <circle cx="12" cy="14.67" r="2.4" fill={C_CONSTRUCT}/>
    </svg>
  ),
  circumcenter: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      {/* Đường tròn ngoại tiếp */}
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.4"/>
      {/* Tam giác nội tiếp */}
      <polygon points="12,3 21,16 3,16" fill="none" stroke="currentColor" strokeWidth="1.3"/>
      {/* 3 đỉnh BLUE */}
      <circle cx="12" cy="3"  r="1.6" fill={C_POINT}/>
      <circle cx="21" cy="16" r="1.6" fill={C_POINT}/>
      <circle cx="3"  cy="16" r="1.6" fill={C_POINT}/>
      {/* Tâm ngoại tiếp RED */}
      <circle cx="12" cy="12" r="2.4" fill={C_CONSTRUCT}/>
    </svg>
  ),
  incenter: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      {/* Tam giác outline */}
      <polygon points="3,20 21,20 12,4" fill="none" stroke="currentColor" strokeWidth="1.4"/>
      {/* Đường tròn nội tiếp */}
      <circle cx="12" cy="14" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
      {/* 3 đỉnh BLUE */}
      <circle cx="3"  cy="20" r="1.6" fill={C_POINT}/>
      <circle cx="21" cy="20" r="1.6" fill={C_POINT}/>
      <circle cx="12" cy="4"  r="1.6" fill={C_POINT}/>
      {/* Tâm nội tiếp RED */}
      <circle cx="12" cy="14" r="2.2" fill={C_CONSTRUCT}/>
    </svg>
  ),
  orthocenter: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeLinecap="round">
      {/* Tam giác outline */}
      <polygon points="3,20 21,20 8,5" fill="none" stroke="currentColor" strokeWidth="1.4"/>
      {/* 2 altitudes (dashed red) — đủ giao điểm */}
      <line x1="8" y1="5"  x2="8"    y2="20"   stroke={C_CONSTRUCT} strokeWidth="1.2" strokeDasharray="2 1.6"/>
      <line x1="3" y1="20" x2="14.5" y2="11.5" stroke={C_CONSTRUCT} strokeWidth="1.2" strokeDasharray="2 1.6"/>
      {/* 3 đỉnh BLUE */}
      <circle cx="3"  cy="20"  r="1.6" fill={C_POINT}/>
      <circle cx="21" cy="20"  r="1.6" fill={C_POINT}/>
      <circle cx="8"  cy="5"   r="1.6" fill={C_POINT}/>
      {/* Trực tâm RED — giao 2 altitudes */}
      <circle cx="8"  cy="14.5" r="2.4" fill={C_CONSTRUCT}/>
    </svg>
  ),
```

- [ ] **Step 3: Run tests, verify pass**

```bash
npm test -- src/stamps/geometry-2d/editor/__tests__/tools.test.tsx
```

Expected: PASS (all Task 1 + Task 2 tests).

- [ ] **Step 4: Run typecheck**

```bash
npm run typecheck
```

Expected: clean. Nếu có error, fix theo TypeScript error message.

---

## Task 4: perpFoot finalize handler

**Files:**
- Modify: `src/stamps/geometry-2d/editor/handlers/finalizeShape.ts`
- Test: `src/stamps/geometry-2d/editor/handlers/__tests__/finalizeShape.test.ts`

- [ ] **Step 1: Write failing test**

Append to `src/stamps/geometry-2d/editor/handlers/__tests__/finalizeShape.test.ts`:

```ts
describe('finalizeShape — Tier E.1 perpFoot', () => {
  // mkCtx helper với mix point/line types (point=1, line=2 — JSXGraph elementClass).
  function mkCtxMixed(picks: Array<{ id: string; cls: 1 | 2 }>): { ctx: HandlerCtx; dispatched: any[] } {
    const dispatched: any[] = [];
    const ctx = {
      pendingRef: { current: picks.map((p) => ({ elementClass: p.cls })) },
      pendingIdsRef: { current: picks.map((p) => p.id) },
      store: {
        getState: () => ({ counter: 0, objects: {}, order: [], meta: { domain: '2d', version: 1 } }),
        dispatch: (a: any) => dispatched.push(a),
      },
      nextLabel: (kind: string) => `${kind}_label`,
      flashWarn: jest.fn(),
      refreshPreview: jest.fn(),
      findNearestPointJxg: jest.fn(),
      emitTransform: jest.fn(),
      setPendingCount: jest.fn(),
      clearPending: jest.fn(),
      pendingTransformRef: { current: null },
      jxgIdToSceneId: jest.fn(),
      jxgFromSceneId: jest.fn(),
      toast: jest.fn(),
    } as unknown as HandlerCtx;
    return { ctx, dispatched };
  }

  test('perpFoot → ADD point với constraint perpFoot (point trước line)', () => {
    const { ctx, dispatched } = mkCtxMixed([
      { id: 'A', cls: 1 }, // point
      { id: 'l1', cls: 2 }, // line
    ]);
    finalizeShape(ctx, { key: 'perpFoot', label: '', hint: '', icon: null as any, group: 'point', needs: 2, accepts: ['point', 'line'] });
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0].type).toBe('ADD');
    expect(dispatched[0].payload.obj.kind).toBe('point');
    expect(dispatched[0].payload.obj.attrs.constraint).toEqual({
      kind: 'perpFoot', from: 'A', onLine: 'l1',
    });
  });

  test('perpFoot → order-flexible (line trước point)', () => {
    const { ctx, dispatched } = mkCtxMixed([
      { id: 'l1', cls: 2 }, // line trước
      { id: 'A', cls: 1 }, // point sau
    ]);
    finalizeShape(ctx, { key: 'perpFoot', label: '', hint: '', icon: null as any, group: 'point', needs: 2, accepts: ['point', 'line'] });
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0].payload.obj.attrs.constraint).toEqual({
      kind: 'perpFoot', from: 'A', onLine: 'l1',
    });
  });

  test('perpFoot → no-op nếu thiếu point hoặc line', () => {
    const { ctx, dispatched } = mkCtxMixed([
      { id: 'A', cls: 1 }, // chỉ có point
      { id: 'B', cls: 1 }, // 2 point, không có line
    ]);
    finalizeShape(ctx, { key: 'perpFoot', label: '', hint: '', icon: null as any, group: 'point', needs: 2, accepts: ['point', 'line'] });
    expect(dispatched).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run failing test**

```bash
npm test -- src/stamps/geometry-2d/editor/handlers/__tests__/finalizeShape.test.ts
```

Expected: FAIL — `perpFoot` case chưa có trong switch.

- [ ] **Step 3: Add `perpFoot` case to `finalizeShape`**

Edit `src/stamps/geometry-2d/editor/handlers/finalizeShape.ts`. Trong switch, sau `case 'midpoint': { ... }` (line ~264-274), thêm:

```ts
    case 'perpFoot': {
      const fromPoint = findPickIdByKind(ctx, 'point');
      const onLine = findPickIdByKind(ctx, 'line');
      if (!fromPoint || !onLine) return;
      const id = freshId(ctx, 'h');
      const label = ctx.nextLabel('point');
      ctx.store.dispatch({
        type: 'ADD',
        payload: { obj: mkSceneObj(id, 'point', label, {
          constraint: { kind: 'perpFoot', from: fromPoint, onLine },
        }) },
      });
      return;
    }
```

- [ ] **Step 4: Run test, verify pass**

```bash
npm test -- src/stamps/geometry-2d/editor/handlers/__tests__/finalizeShape.test.ts
```

Expected: PASS (3 new perpFoot tests).

---

## Task 5: 4 triangle center finalize handlers

**Files:**
- Modify: `src/stamps/geometry-2d/editor/handlers/finalizeShape.ts`
- Test: `src/stamps/geometry-2d/editor/handlers/__tests__/finalizeShape.test.ts`

- [ ] **Step 1: Write failing tests**

Append to `finalizeShape.test.ts`:

```ts
describe('finalizeShape — Tier E.1 triangle centers', () => {
  // Reuse mkCtx (3 points) — không cần mixed-type vì 4 centers chỉ nhận point.
  function mkCtxPoints(ids: string[]): { ctx: HandlerCtx; dispatched: any[] } {
    const dispatched: any[] = [];
    const ctx = {
      pendingRef: { current: ids.map(() => ({ elementClass: 1 })) },
      pendingIdsRef: { current: [...ids] },
      store: {
        getState: () => ({ counter: 0, objects: {}, order: [], meta: { domain: '2d', version: 1 } }),
        dispatch: (a: any) => dispatched.push(a),
      },
      nextLabel: (kind: string) => `${kind}_label`,
      flashWarn: jest.fn(),
      refreshPreview: jest.fn(),
      findNearestPointJxg: jest.fn(),
      emitTransform: jest.fn(),
      setPendingCount: jest.fn(),
      clearPending: jest.fn(),
      pendingTransformRef: { current: null },
      jxgIdToSceneId: jest.fn(),
      jxgFromSceneId: jest.fn(),
      toast: jest.fn(),
    } as unknown as HandlerCtx;
    return { ctx, dispatched };
  }

  test('centroid → ADD point với constraint centroid', () => {
    const { ctx, dispatched } = mkCtxPoints(['A', 'B', 'C']);
    finalizeShape(ctx, { key: 'centroid', label: '', hint: '', icon: null as any, group: 'triangle', needs: 3, accepts: ['point', 'point', 'point'] });
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0].payload.obj.kind).toBe('point');
    expect(dispatched[0].payload.obj.attrs.constraint).toEqual({
      kind: 'centroid', vertices: ['A', 'B', 'C'],
    });
  });

  test('circumcenter → ADD point với constraint circumcenter', () => {
    const { ctx, dispatched } = mkCtxPoints(['A', 'B', 'C']);
    finalizeShape(ctx, { key: 'circumcenter', label: '', hint: '', icon: null as any, group: 'triangle', needs: 3, accepts: ['point', 'point', 'point'] });
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0].payload.obj.attrs.constraint).toEqual({
      kind: 'circumcenter', vertices: ['A', 'B', 'C'],
    });
  });

  test('incenter → ADD point với constraint incenter', () => {
    const { ctx, dispatched } = mkCtxPoints(['A', 'B', 'C']);
    finalizeShape(ctx, { key: 'incenter', label: '', hint: '', icon: null as any, group: 'triangle', needs: 3, accepts: ['point', 'point', 'point'] });
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0].payload.obj.attrs.constraint).toEqual({
      kind: 'incenter', vertices: ['A', 'B', 'C'],
    });
  });

  test('orthocenter → ADD point với constraint orthocenter', () => {
    const { ctx, dispatched } = mkCtxPoints(['A', 'B', 'C']);
    finalizeShape(ctx, { key: 'orthocenter', label: '', hint: '', icon: null as any, group: 'triangle', needs: 3, accepts: ['point', 'point', 'point'] });
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0].payload.obj.attrs.constraint).toEqual({
      kind: 'orthocenter', vertices: ['A', 'B', 'C'],
    });
  });
});
```

- [ ] **Step 2: Run failing tests**

```bash
npm test -- src/stamps/geometry-2d/editor/handlers/__tests__/finalizeShape.test.ts
```

Expected: FAIL — 4 cases chưa có trong switch.

- [ ] **Step 3: Add 4 triangle center cases to `finalizeShape`**

Edit `finalizeShape.ts`. Sau `case 'perpFoot'` từ Task 4, thêm 4 cases:

```ts
    case 'centroid': {
      const ids = ctx.pendingIdsRef.current;
      const id = freshId(ctx, 'g');
      const label = ctx.nextLabel('point');
      ctx.store.dispatch({
        type: 'ADD',
        payload: { obj: mkSceneObj(id, 'point', label, {
          constraint: { kind: 'centroid', vertices: [ids[0], ids[1], ids[2]] },
        }) },
      });
      return;
    }
    case 'circumcenter': {
      const ids = ctx.pendingIdsRef.current;
      const id = freshId(ctx, 'o');
      const label = ctx.nextLabel('point');
      ctx.store.dispatch({
        type: 'ADD',
        payload: { obj: mkSceneObj(id, 'point', label, {
          constraint: { kind: 'circumcenter', vertices: [ids[0], ids[1], ids[2]] },
        }) },
      });
      return;
    }
    case 'incenter': {
      const ids = ctx.pendingIdsRef.current;
      const id = freshId(ctx, 'i');
      const label = ctx.nextLabel('point');
      ctx.store.dispatch({
        type: 'ADD',
        payload: { obj: mkSceneObj(id, 'point', label, {
          constraint: { kind: 'incenter', vertices: [ids[0], ids[1], ids[2]] },
        }) },
      });
      return;
    }
    case 'orthocenter': {
      const ids = ctx.pendingIdsRef.current;
      const id = freshId(ctx, 'h');
      const label = ctx.nextLabel('point');
      ctx.store.dispatch({
        type: 'ADD',
        payload: { obj: mkSceneObj(id, 'point', label, {
          constraint: { kind: 'orthocenter', vertices: [ids[0], ids[1], ids[2]] },
        }) },
      });
      return;
    }
```

**Note:** `case 'perpFoot'` ở line ~275 đã có `ids` từ outer scope (Task 4 đã thêm). Nhưng 4 case mới này declare local `const ids = ctx.pendingIdsRef.current;` để tránh phụ thuộc outer-scope (defensive — outer `ids` ở line 23 dùng cho các tool khác).

Actually — kiểm tra lại: outer `ids` đã được declare tại line 23 (`const ids = ctx.pendingIdsRef.current;`) và shared cho mọi case. Nên 4 case mới CÓ THỂ dùng outer `ids` thay vì redeclare. Để đồng nhất với pattern hiện tại (xem `case 'midpoint'`, `case 'angle'`, `case 'distance'` không redeclare), nên dùng outer `ids`. Sửa lại bằng cách bỏ `const ids = ...` trong 4 case.

Code đúng cho từng case (không redeclare):

```ts
    case 'centroid': {
      const id = freshId(ctx, 'g');
      const label = ctx.nextLabel('point');
      ctx.store.dispatch({
        type: 'ADD',
        payload: { obj: mkSceneObj(id, 'point', label, {
          constraint: { kind: 'centroid', vertices: [ids[0], ids[1], ids[2]] },
        }) },
      });
      return;
    }
    // tương tự circumcenter, incenter, orthocenter — dùng outer `ids`
```

- [ ] **Step 4: Run tests, verify pass**

```bash
npm test -- src/stamps/geometry-2d/editor/handlers/__tests__/finalizeShape.test.ts
```

Expected: PASS (4 new center tests).

---

## Task 6: Chord shortcut conflict check + release commit

**Files:**
- Modify: `package.json`
- Verify: `src/stamps/shared/useChordShortcut.ts` + `useChordShortcut.test.tsx`

- [ ] **Step 1: Verify no chord shortcut conflict for letter G hoặc J**

Vì group 'triangle' = letter G, transform = letter J (shifted from I). Cần đảm bảo không có chord 2-key reserve những letters này cho hành động khác.

Run:

```bash
grep -rn "letterForGroup\|'G'\|'J'\|chordKey\|GROUP_LETTER" src/stamps --include="*.ts" --include="*.tsx" | grep -v __tests__ | grep -v ".test." | head -20
```

Đọc kết quả. `letterForGroup` được dùng trong:
- `src/stamps/shared/StampLeftPanel/ToolGrid.tsx` — render letter badge trên button (visualization, OK)
- `src/stamps/shared/useChordShortcut.ts` — bind keyboard chord (cần check)

Mở `src/stamps/shared/useChordShortcut.ts` xem có hardcode letter G/J nào trong logic xử lý 3D / graph-2d không.

Expected: `useChordShortcut` dùng `groupForLetter(ch)` để map letter → group (dynamic), không hardcode letter cụ thể. Letter G/J sẽ chỉ trigger nếu group tương ứng tồn tại trong stamp đó.

**Lưu ý 3D stamp:** có file `geometry-3d/editor/toolPanel/groups.ts` định nghĩa groups riêng cho 3D. Letter assignment cho 3D có thể độc lập với 2D. Confirm bằng grep:

```bash
grep -n "GROUP_ORDER\|letterForGroup" src/stamps/geometry-3d/editor/toolPanel/groups.ts 2>/dev/null
```

Nếu 3D tự define GROUP_ORDER riêng, không bị ảnh hưởng bởi 2D thay đổi.

**Nếu phát hiện conflict** (hardcode letter cụ thể trong handler 2D code), document ở step 4 và defer fix.

- [ ] **Step 2: Run full test suite**

```bash
npm test
```

Expected: tất cả test pass (bao gồm pre-existing + 6 tools tests + 7 handler tests).

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: no error.

- [ ] **Step 4: Bump version + commit feature**

```bash
git add src/stamps/geometry-2d/editor/tools.tsx \
        src/stamps/geometry-2d/editor/handlers/finalizeShape.ts \
        src/stamps/geometry-2d/editor/__tests__/tools.test.tsx \
        src/stamps/geometry-2d/editor/handlers/__tests__/finalizeShape.test.ts

git commit -m "feat(stamps): toolbar UI cho 5 derived primitives — Tier E.1

Thêm UI tool cho perpFoot (group 'point') + 4 triangle centers
(centroid/circumcenter/incenter/orthocenter — group 'triangle' mới).
HS dùng được 5 primitives của Tier E v0.21.0 bằng tay, không cần
chờ AI feature. Letter shortcut: G = Tam giác, J = Phép biến hình
(shifted từ I)."
```

- [ ] **Step 5: Bump version → 0.22.0**

Edit `package.json`:

```json
  "version": "0.22.0",
```

```bash
git add package.json
git commit -m "chore: release v0.22.0 — Tier E.1 (toolbar UI)"
git tag -a v0.22.0 -m "v0.22.0 — Tier E.1 (toolbar UI cho 5 derived primitives)"
```

- [ ] **Step 6: Push commits + tag**

```bash
git push origin main --follow-tags 2>&1 | tail -10
```

Expected: 2 commits + 1 tag pushed.

---

## Verification checklist

Sau khi xong, verify manual trong consumer app (out of automated test scope):

- [ ] `npm run dev` (whiteboard package watch build) — không error
- [ ] Trong consumer app, mở geometry-2d editor
- [ ] Toolbar có nhóm "Tam giác" (letter G) với 4 button đầy đủ icon
- [ ] Nhóm "Điểm" có thêm "Chân đường vuông góc" sau "Trung điểm"
- [ ] Click tool "Chân ⟂" → click 1 điểm → click 1 line → điểm chân xuất hiện
- [ ] Kéo điểm gốc → chân ⟂ di chuyển theo
- [ ] Tương tự cho 4 centers: click 3 đỉnh → center xuất hiện → kéo đỉnh → center theo
- [ ] Letter shortcut: nhấn 2 phím "G" + key đầu của 1 trong 4 center → activate đúng tool

---

## Self-Review Notes

**Spec coverage:**
- ✅ Type expansion (GeomTool + GeomGroup): Task 1 (group) + Task 2 (key)
- ✅ GROUP_ORDER + GROUP_LABELS: Task 1
- ✅ Letter shortcut update (G triangle, J transform): Task 1 (tests verify)
- ✅ 5 ToolDef entries: Task 2
- ✅ 5 SVG icons: Task 3
- ✅ 5 finalize handler cases: Task 4 (perpFoot) + Task 5 (4 centers)
- ✅ Tests catalog + handler: Tasks 1, 2, 4, 5
- ✅ Chord shortcut conflict check: Task 6 step 1
- ✅ Release v0.22.0: Task 6 steps 4-6

**Placeholder scan:** Tất cả code blocks complete. Không có TBD/TODO.

**Type consistency:** Field naming nhất quán cross-task:
- `perpFoot` accepts `['point', 'line']`, needs 2
- 4 centers accepts `['point', 'point', 'point']`, needs 3, group 'triangle'
- Helper `findPickIdByKind` reused từ existing pattern (perpendicular/parallel)

**Out of scope (per spec):**
- Decorations (right-angle mark ⊥, length label, angle marker) — defer phase 2
- Auto-create polygon triangle khi click 3 đỉnh — defer
- Tutorial / onboarding — defer
- Snapshot UI / E2E tests — manual smoke trong consumer app
