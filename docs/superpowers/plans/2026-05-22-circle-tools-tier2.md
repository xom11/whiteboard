# Circle tools Tier 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm 4 tool vẽ cung/quạt/nửa-đường-tròn vào group `circle` của stamp `geometry-2d`.

**Architecture:** 2 kind mới trong `core/scene/kinds/` (`arc` 3 variants, `sector` 1 variant), 4 entry mới trong `TOOLS` array của `geometry-2d/editor/tools.tsx`, 4 case mới trong `finalizeShape.ts`. multiClick.ts không cần sửa (Mode B lenient đã handle tool-không-có-`accepts`).

**Tech Stack:** TypeScript strict, JSXGraph 1.x, Jest 29 + jsdom, registry-based scene model.

**Worktree:** `/Users/lenamkhanh/Documents/dev/whiteboard-circle-tools` (branch `feature/circle-tools-tier2`).

**Spec:** `docs/superpowers/specs/2026-05-22-circle-tools-tier2-design.md`

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/core/scene/kinds/arc.ts` | Create | Kind `arc` với 3 construction variants (`semicircle`, `byCenter`, `by3Points`) |
| `src/core/scene/kinds/sector.ts` | Create | Kind `sector` với 1 construction variant (`byCenter`) |
| `src/core/scene/kinds/__tests__/arc.test.ts` | Create | Unit test cho arc kind |
| `src/core/scene/kinds/__tests__/sector.test.ts` | Create | Unit test cho sector kind |
| `src/core/scene/kinds/index.ts` | Modify | Thêm 2 dòng import `'./arc'`, `'./sector'` |
| `src/core/scene/render/__tests__/JxgRenderer.test.ts` | Modify | Thêm test render arc 3 variants + sector |
| `src/stamps/geometry-2d/editor/tools.tsx` | Modify | 4 keys vào `GeomTool` union, 4 SVG icons, 4 entries vào `TOOLS` |
| `src/stamps/geometry-2d/editor/__tests__/tools.test.tsx` | Modify (or Create if missing) | Smoke test 4 entries mới có đúng group/needs |
| `src/stamps/geometry-2d/editor/handlers/finalizeShape.ts` | Modify | 4 case mới: `semicircle`, `arcCenter`, `arc3`, `sectorCenter` |
| `src/stamps/geometry-2d/editor/handlers/__tests__/finalizeShape.test.ts` | Modify (or Create if missing) | Unit test 4 case dispatch đúng payload |

---

## Task 1: Kind `arc` — failing test (TDD red)

**Files:**
- Create: `src/core/scene/kinds/__tests__/arc.test.ts`

- [ ] **Step 1: Tạo file test với 6 case (registered, validate 3 variants, dependsOn, describe)**

```ts
// src/core/scene/kinds/__tests__/arc.test.ts
import '../arc';
import { getKind } from '../../registry';
import { mkObj } from './helpers';

describe('kinds/arc (2D)', () => {
  test('registered', () => {
    expect(getKind('arc').schemaVersion).toBe(1);
  });

  describe('semicircle construction', () => {
    const def = getKind('arc');

    test('validate ok khi có p1, p2', () => {
      expect(() => def.validate?.({
        construction: { kind: 'semicircle', p1: 'A', p2: 'B' },
      } as never)).not.toThrow();
    });

    test('validate throw khi thiếu p1/p2', () => {
      expect(() => def.validate?.({
        construction: { kind: 'semicircle', p1: '', p2: 'B' },
      } as never)).toThrow();
    });

    test('dependsOn = [p1, p2]', () => {
      expect(def.dependsOn({
        construction: { kind: 'semicircle', p1: 'A', p2: 'B' },
      } as never)).toEqual(['A', 'B']);
    });

    test('describe nửa đường tròn', () => {
      const obj = mkObj('arc', 'arc1', {
        construction: { kind: 'semicircle', p1: 'A', p2: 'B' },
      });
      expect(def.describe(obj)).toMatch(/nửa.*đường tròn|bán nguyệt/i);
    });
  });

  describe('byCenter construction', () => {
    const def = getKind('arc');

    test('validate ok khi có center, p1, p2', () => {
      expect(() => def.validate?.({
        construction: { kind: 'byCenter', center: 'O', p1: 'A', p2: 'B' },
      } as never)).not.toThrow();
    });

    test('dependsOn = [center, p1, p2]', () => {
      expect(def.dependsOn({
        construction: { kind: 'byCenter', center: 'O', p1: 'A', p2: 'B' },
      } as never)).toEqual(['O', 'A', 'B']);
    });

    test('describe cung tâm', () => {
      const obj = mkObj('arc', 'arc2', {
        construction: { kind: 'byCenter', center: 'O', p1: 'A', p2: 'B' },
      });
      expect(def.describe(obj)).toMatch(/cung.*tâm|tâm O/i);
    });
  });

  describe('by3Points construction', () => {
    const def = getKind('arc');

    test('dependsOn = [p1, p2, p3]', () => {
      expect(def.dependsOn({
        construction: { kind: 'by3Points', p1: 'A', p2: 'B', p3: 'C' },
      } as never)).toEqual(['A', 'B', 'C']);
    });

    test('describe cung qua 3 điểm', () => {
      const obj = mkObj('arc', 'arc3', {
        construction: { kind: 'by3Points', p1: 'A', p2: 'B', p3: 'C' },
      });
      expect(def.describe(obj)).toMatch(/qua ABC|3 điểm/i);
    });
  });
});
```

- [ ] **Step 2: Run test — verify red**

Run: `npm test -- --testPathPattern=arc.test`

Expected: FAIL với "Cannot find module '../arc'" (file chưa tồn tại).

---

## Task 2: Kind `arc` — implementation (TDD green)

**Files:**
- Create: `src/core/scene/kinds/arc.ts`

- [ ] **Step 1: Implement kind `arc`**

```ts
// src/core/scene/kinds/arc.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';
import { labelOf } from './labelOf';

export type ArcConstruction =
  | { kind: 'semicircle'; p1: string; p2: string }
  | { kind: 'byCenter';   center: string; p1: string; p2: string }
  | { kind: 'by3Points';  p1: string; p2: string; p3: string };

export type ArcAttrs = {
  construction: ArcConstruction;
  color?: string;
  width?: number;
  dash?: number;
  showLabel?: boolean;
};

function constructionRefs(c: ArcConstruction): string[] {
  switch (c.kind) {
    case 'semicircle': return [c.p1, c.p2];
    case 'byCenter':   return [c.center, c.p1, c.p2];
    case 'by3Points':  return [c.p1, c.p2, c.p3];
  }
}

const def: KindDef<ArcAttrs> = {
  type: 'arc',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    const c = a?.construction;
    if (!c) throw new Error('arc: construction bắt buộc');
    if (c.kind === 'semicircle') {
      if (!c.p1 || !c.p2) throw new Error('arc.semicircle: p1, p2 bắt buộc');
    } else if (c.kind === 'byCenter') {
      if (!c.center || !c.p1 || !c.p2) throw new Error('arc.byCenter: center, p1, p2 bắt buộc');
    } else if (c.kind === 'by3Points') {
      if (!c.p1 || !c.p2 || !c.p3) throw new Error('arc.by3Points: p1, p2, p3 bắt buộc');
    }
  },
  dependsOn: (a) => constructionRefs(a.construction),
  describe: (obj, state) => {
    const L = (id: string) => labelOf(id, state);
    const c = obj.attrs.construction;
    switch (c.kind) {
      case 'semicircle': return `Nửa đường tròn đường kính ${L(c.p1)}${L(c.p2)}`;
      case 'byCenter':   return `Cung tròn tâm ${L(c.center)} từ ${L(c.p1)} đến ${L(c.p2)}`;
      case 'by3Points':  return `Cung tròn qua ${L(c.p1)}${L(c.p2)}${L(c.p3)}`;
    }
  },
  render: (obj, ctx) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const board = ctx.jxg as any;
    const baseOpts: Record<string, unknown> = {
      name: obj.label,
      withLabel: obj.attrs.showLabel ?? false,
      strokeColor: obj.attrs.color ?? '#0f172a',
      strokeWidth: obj.attrs.width ?? 2,
      dash: obj.attrs.dash ?? 0,
      fillColor: 'none',
      visible: obj.visible,
      fixed: obj.locked,
    };
    const c = obj.attrs.construction;
    if (c.kind === 'semicircle') {
      const p1 = ctx.resolveRef(c.p1);
      const p2 = ctx.resolveRef(c.p2);
      return board.create('semicircle', [p1, p2], baseOpts);
    }
    if (c.kind === 'byCenter') {
      const O = ctx.resolveRef(c.center);
      const A = ctx.resolveRef(c.p1);
      const B = ctx.resolveRef(c.p2);
      return board.create('arc', [O, A, B], baseOpts);
    }
    // by3Points
    const A = ctx.resolveRef(c.p1);
    const B = ctx.resolveRef(c.p2);
    const C = ctx.resolveRef(c.p3);
    return board.create('circumcirclearc', [A, B, C], baseOpts);
  },
};

registerKind(def);
```

- [ ] **Step 2: Run test — verify green**

Run: `npm test -- --testPathPattern=arc.test`

Expected: PASS — all 10 tests.

- [ ] **Step 3: Commit**

```bash
git add src/core/scene/kinds/arc.ts src/core/scene/kinds/__tests__/arc.test.ts
git commit -m "feat(core/scene): thêm kind 'arc' với 3 construction variants

semicircle, byCenter, by3Points — backed by JSXGraph 'semicircle',
'arc', 'circumcirclearc' element. Test cover register, validate,
dependsOn, describe cho cả 3 variants."
```

---

## Task 3: Kind `sector` — test + impl (TDD red→green)

**Files:**
- Create: `src/core/scene/kinds/__tests__/sector.test.ts`
- Create: `src/core/scene/kinds/sector.ts`

- [ ] **Step 1: Tạo failing test**

```ts
// src/core/scene/kinds/__tests__/sector.test.ts
import '../sector';
import { getKind } from '../../registry';
import { mkObj } from './helpers';

describe('kinds/sector (2D)', () => {
  test('registered', () => {
    expect(getKind('sector').schemaVersion).toBe(1);
  });

  test('validate ok byCenter', () => {
    const def = getKind('sector');
    expect(() => def.validate?.({
      construction: { kind: 'byCenter', center: 'O', p1: 'A', p2: 'B' },
    } as never)).not.toThrow();
  });

  test('validate throw khi thiếu refs', () => {
    const def = getKind('sector');
    expect(() => def.validate?.({
      construction: { kind: 'byCenter', center: '', p1: 'A', p2: 'B' },
    } as never)).toThrow();
  });

  test('dependsOn = [center, p1, p2]', () => {
    expect(getKind('sector').dependsOn({
      construction: { kind: 'byCenter', center: 'O', p1: 'A', p2: 'B' },
    } as never)).toEqual(['O', 'A', 'B']);
  });

  test('describe hình quạt', () => {
    const obj = mkObj('sector', 's1', {
      construction: { kind: 'byCenter', center: 'O', p1: 'A', p2: 'B' },
    });
    expect(getKind('sector').describe(obj)).toMatch(/quạt|hình quạt/i);
  });
});
```

- [ ] **Step 2: Run test — verify red**

Run: `npm test -- --testPathPattern=sector.test`

Expected: FAIL với "Cannot find module '../sector'".

- [ ] **Step 3: Implement kind `sector`**

```ts
// src/core/scene/kinds/sector.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';
import { labelOf } from './labelOf';

export type SectorConstruction =
  | { kind: 'byCenter'; center: string; p1: string; p2: string };

export type SectorAttrs = {
  construction: SectorConstruction;
  color?: string;
  width?: number;
  fillColor?: string;
  fillOpacity?: number;
  showLabel?: boolean;
};

const def: KindDef<SectorAttrs> = {
  type: 'sector',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    const c = a?.construction;
    if (!c) throw new Error('sector: construction bắt buộc');
    if (c.kind === 'byCenter') {
      if (!c.center || !c.p1 || !c.p2) {
        throw new Error('sector.byCenter: center, p1, p2 bắt buộc');
      }
    }
  },
  dependsOn: (a) => {
    const c = a.construction;
    return [c.center, c.p1, c.p2];
  },
  describe: (obj, state) => {
    const L = (id: string) => labelOf(id, state);
    const c = obj.attrs.construction;
    return `Hình quạt tâm ${L(c.center)} ${L(c.p1)}${L(c.p2)}`;
  },
  render: (obj, ctx) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const board = ctx.jxg as any;
    const c = obj.attrs.construction;
    const O = ctx.resolveRef(c.center);
    const A = ctx.resolveRef(c.p1);
    const B = ctx.resolveRef(c.p2);
    return board.create('sector', [O, A, B], {
      name: obj.label,
      withLabel: obj.attrs.showLabel ?? false,
      strokeColor: obj.attrs.color ?? '#0f172a',
      strokeWidth: obj.attrs.width ?? 2,
      fillColor: obj.attrs.fillColor ?? '#f59e0b',
      fillOpacity: obj.attrs.fillOpacity ?? 0.18,
      visible: obj.visible,
      fixed: obj.locked,
    });
  },
};

registerKind(def);
```

- [ ] **Step 4: Run test — verify green**

Run: `npm test -- --testPathPattern=sector.test`

Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/core/scene/kinds/sector.ts src/core/scene/kinds/__tests__/sector.test.ts
git commit -m "feat(core/scene): thêm kind 'sector' (byCenter)

Hình quạt tâm O qua A đến B — JSXGraph 'sector' element với fill
orange (#f59e0b @ opacity 0.18) khớp design system."
```

---

## Task 4: Register 2 kinds + JxgRenderer integration tests

**Files:**
- Modify: `src/core/scene/kinds/index.ts` (thêm 2 import)
- Modify: `src/core/scene/render/__tests__/JxgRenderer.test.ts` (thêm 4 test)

- [ ] **Step 1: Register kinds**

File `src/core/scene/kinds/index.ts` — thêm 2 dòng sau dòng `import './circle';`:

```ts
import './circle';
import './arc';
import './sector';
import './polygon';
```

- [ ] **Step 2: Thêm integration tests vào JxgRenderer.test.ts**

Append tests vào cuối describe block `'JxgRenderer (2D)'`:

```ts
  test('ADD arc semicircle → board.create("semicircle", [pA, pB], ...)', () => {
    const store = createStore(createEmptyState('2d'));
    const { board, created } = mockBoard();
    new JxgRenderer(store, board as never);
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('A', 0, 0) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('B', 2, 0) } });
    store.dispatch({ type: 'ADD', payload: { obj: {
      id: 'arc1', kind: 'arc', label: 'arc1', visible: true, locked: false,
      layer: 'default', schemaVersion: 1,
      attrs: { construction: { kind: 'semicircle', p1: 'A', p2: 'B' } },
    } } });
    const arcEl = created.find((e) => e.type === 'semicircle');
    expect(arcEl).toBeTruthy();
    expect(arcEl.parents).toHaveLength(2);
  });

  test('ADD arc byCenter → board.create("arc", [O, A, B], ...)', () => {
    const store = createStore(createEmptyState('2d'));
    const { board, created } = mockBoard();
    new JxgRenderer(store, board as never);
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('O', 0, 0) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('A', 2, 0) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('B', 0, 2) } });
    store.dispatch({ type: 'ADD', payload: { obj: {
      id: 'arc2', kind: 'arc', label: 'arc2', visible: true, locked: false,
      layer: 'default', schemaVersion: 1,
      attrs: { construction: { kind: 'byCenter', center: 'O', p1: 'A', p2: 'B' } },
    } } });
    const arcEl = created.find((e) => e.type === 'arc');
    expect(arcEl).toBeTruthy();
    expect(arcEl.parents).toHaveLength(3);
  });

  test('ADD arc by3Points → board.create("circumcirclearc", [A, B, C], ...)', () => {
    const store = createStore(createEmptyState('2d'));
    const { board, created } = mockBoard();
    new JxgRenderer(store, board as never);
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('A', 0, 0) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('B', 1, 1) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('C', 2, 0) } });
    store.dispatch({ type: 'ADD', payload: { obj: {
      id: 'arc3', kind: 'arc', label: 'arc3', visible: true, locked: false,
      layer: 'default', schemaVersion: 1,
      attrs: { construction: { kind: 'by3Points', p1: 'A', p2: 'B', p3: 'C' } },
    } } });
    const arcEl = created.find((e) => e.type === 'circumcirclearc');
    expect(arcEl).toBeTruthy();
    expect(arcEl.parents).toHaveLength(3);
  });

  test('ADD sector byCenter → board.create("sector", [O, A, B], ...)', () => {
    const store = createStore(createEmptyState('2d'));
    const { board, created } = mockBoard();
    new JxgRenderer(store, board as never);
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('O', 0, 0) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('A', 2, 0) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('B', 0, 2) } });
    store.dispatch({ type: 'ADD', payload: { obj: {
      id: 'sec1', kind: 'sector', label: 'sec1', visible: true, locked: false,
      layer: 'default', schemaVersion: 1,
      attrs: { construction: { kind: 'byCenter', center: 'O', p1: 'A', p2: 'B' } },
    } } });
    const secEl = created.find((e) => e.type === 'sector');
    expect(secEl).toBeTruthy();
    expect(secEl.parents).toHaveLength(3);
    expect(secEl.attrs.fillColor).toBe('#f59e0b');
  });
```

- [ ] **Step 3: Run renderer tests — verify green**

Run: `npm test -- --testPathPattern=JxgRenderer.test`

Expected: PASS — including 4 new tests.

- [ ] **Step 4: Run full typecheck**

Run: `npm run typecheck`

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/core/scene/kinds/index.ts src/core/scene/render/__tests__/JxgRenderer.test.ts
git commit -m "feat(core/scene): register arc + sector kinds, add JxgRenderer tests

4 test mới verify ADD action cho arc 3 variants (semicircle/byCenter/
by3Points) và sector byCenter dispatch đúng JSXGraph element type và
parent count."
```

---

## Task 5: Tool icons + TOOLS entries trong geometry-2d

**Files:**
- Modify: `src/stamps/geometry-2d/editor/tools.tsx`
- Modify (or Create): `src/stamps/geometry-2d/editor/__tests__/tools.test.tsx`

- [ ] **Step 1: Thêm 4 keys vào `GeomTool` union**

Sửa `src/stamps/geometry-2d/editor/tools.tsx` dòng 12–41 — thêm 4 keys sau `circle3`:

```ts
export type GeomTool =
  | 'move'
  | 'select'
  | 'point'
  | 'midpoint'
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
  | 'semicircle'      // NEW
  | 'arcCenter'       // NEW
  | 'arc3'            // NEW
  | 'sectorCenter'    // NEW
  | 'circle3'
  | 'tangent'
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

- [ ] **Step 2: Thêm 4 SVG icons vào `Icon` const (sau `circle3` ~line 216, trước `tangent`)**

```tsx
  semicircle: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeLinecap="round">
      {/* Nửa đường tròn emerald-arc, 2 endpoint blue ở đáy */}
      <path d="M 4 16 A 8 8 0 0 1 20 16" stroke={C_ARC} strokeWidth="1.6" fill="none"/>
      <line x1="4" y1="16" x2="20" y2="16" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 1.6"/>
      <circle cx="4" cy="16" r="1.9" fill={C_POINT}/>
      <circle cx="20" cy="16" r="1.9" fill={C_POINT}/>
    </svg>
  ),
  arcCenter: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeLinecap="round">
      {/* Tâm blue (lớn) + cung emerald + 2 đầu cung blue (nhỏ), 2 bán kính nét đứt */}
      <path d="M 6 6 A 9 9 0 0 1 18 18" stroke={C_ARC} strokeWidth="1.7" fill="none"/>
      <line x1="12" y1="12" x2="6" y2="6" stroke="currentColor" strokeWidth="1" strokeDasharray="1.5 1.5" opacity="0.5"/>
      <line x1="12" y1="12" x2="18" y2="18" stroke="currentColor" strokeWidth="1" strokeDasharray="1.5 1.5" opacity="0.5"/>
      <circle cx="12" cy="12" r="2" fill={C_POINT}/>
      <circle cx="6" cy="6" r="1.4" fill={C_POINT}/>
      <circle cx="18" cy="18" r="1.4" fill={C_POINT}/>
    </svg>
  ),
  arc3: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeLinecap="round">
      {/* 3 điểm blue + cung emerald đi qua */}
      <path d="M 4 18 Q 12 4 20 18" stroke={C_ARC} strokeWidth="1.7" fill="none"/>
      <circle cx="4" cy="18" r="1.7" fill={C_POINT}/>
      <circle cx="12" cy="7.5" r="1.7" fill={C_POINT}/>
      <circle cx="20" cy="18" r="1.7" fill={C_POINT}/>
    </svg>
  ),
  sectorCenter: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeLinejoin="round">
      {/* Tâm blue + 2 bán kính + cung emerald + fill orange */}
      <path d="M 12 12 L 5 7 A 8.6 8.6 0 0 1 19 7 Z"
            fill={C_FILL} fillOpacity="0.25"
            stroke={C_ARC} strokeWidth="1.6"/>
      <line x1="12" y1="12" x2="5" y2="7" stroke="currentColor" strokeWidth="1.3"/>
      <line x1="12" y1="12" x2="19" y2="7" stroke="currentColor" strokeWidth="1.3"/>
      <circle cx="12" cy="12" r="1.8" fill={C_POINT}/>
      <circle cx="5" cy="7" r="1.4" fill={C_POINT}/>
      <circle cx="19" cy="7" r="1.4" fill={C_POINT}/>
    </svg>
  ),
```

- [ ] **Step 3: Thêm 4 entries vào `TOOLS` array (chèn giữa `circleCenter` và `circle3` ~line 332–334)**

Trước:
```ts
  { key: 'circleCenter', label: 'Đường tròn (tâm + điểm)', hint: 'Click tâm rồi 1 điểm trên đường tròn', icon: Icon.circleCenter, group: 'circle', needs: 2 },
  { key: 'circle3', label: 'Đường tròn qua 3 điểm', hint: 'Click 3 điểm', icon: Icon.circle3, group: 'circle', needs: 3 },
  { key: 'tangent', label: 'Tiếp tuyến', hint: 'Click 1 điểm + 1 đường tròn có sẵn', icon: Icon.tangent, group: 'circle', needs: 2, accepts: ['point', 'circle'] },
```

Sau:
```ts
  { key: 'circleCenter', label: 'Đường tròn (tâm + điểm)', hint: 'Click tâm rồi 1 điểm trên đường tròn', icon: Icon.circleCenter, group: 'circle', needs: 2 },
  { key: 'semicircle', label: 'Nửa đường tròn (đường kính)', hint: 'Click 2 điểm — bán nguyệt qua đường kính', icon: Icon.semicircle, group: 'circle', needs: 2 },
  { key: 'arcCenter', label: 'Cung tròn (tâm + 2 điểm)', hint: 'Click tâm O → A → B (cung từ A đến B)', icon: Icon.arcCenter, group: 'circle', needs: 3 },
  { key: 'arc3', label: 'Cung tròn qua 3 điểm', hint: 'Click 3 điểm trên cung', icon: Icon.arc3, group: 'circle', needs: 3 },
  { key: 'sectorCenter', label: 'Hình quạt (tâm + 2 điểm)', hint: 'Click tâm O → A → B (quạt OAB)', icon: Icon.sectorCenter, group: 'circle', needs: 3 },
  { key: 'circle3', label: 'Đường tròn qua 3 điểm', hint: 'Click 3 điểm', icon: Icon.circle3, group: 'circle', needs: 3 },
  { key: 'tangent', label: 'Tiếp tuyến', hint: 'Click 1 điểm + 1 đường tròn có sẵn', icon: Icon.tangent, group: 'circle', needs: 2, accepts: ['point', 'circle'] },
```

- [ ] **Step 4: Thêm smoke test**

Check trước có file test:
```bash
ls src/stamps/geometry-2d/editor/__tests__/tools.test.tsx 2>/dev/null
```

Nếu chưa có, tạo mới. Nếu có, append. Test content:

```ts
import { TOOLS } from '../tools';

describe('TOOLS (geometry-2d)', () => {
  test('có 4 circle tool mới (Tier 2)', () => {
    const newKeys = ['semicircle', 'arcCenter', 'arc3', 'sectorCenter'] as const;
    for (const k of newKeys) {
      const t = TOOLS.find((x) => x.key === k);
      expect(t).toBeTruthy();
      expect(t!.group).toBe('circle');
    }
  });

  test('semicircle needs 2 picks, không có accepts (lenient mode)', () => {
    const t = TOOLS.find((x) => x.key === 'semicircle')!;
    expect(t.needs).toBe(2);
    expect(t.accepts).toBeUndefined();
  });

  test('arcCenter / arc3 / sectorCenter needs 3 picks, không có accepts', () => {
    for (const k of ['arcCenter', 'arc3', 'sectorCenter'] as const) {
      const t = TOOLS.find((x) => x.key === k)!;
      expect(t.needs).toBe(3);
      expect(t.accepts).toBeUndefined();
    }
  });

  test('thứ tự circle group: circleCenter → semicircle → arcCenter → arc3 → sectorCenter → circle3 → tangent', () => {
    const circleTools = TOOLS.filter((t) => t.group === 'circle').map((t) => t.key);
    expect(circleTools).toEqual([
      'circleCenter', 'semicircle', 'arcCenter', 'arc3', 'sectorCenter', 'circle3', 'tangent',
    ]);
  });
});
```

- [ ] **Step 5: Run tests**

Run: `npm test -- --testPathPattern=tools.test && npm run typecheck`

Expected: PASS + no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/stamps/geometry-2d/editor/tools.tsx src/stamps/geometry-2d/editor/__tests__/tools.test.tsx
git commit -m "feat(stamps/geometry-2d): 4 circle tool entries + SVG icons

semicircle (2 click), arcCenter / arc3 / sectorCenter (3 click).
KHÔNG có 'accepts' field → multiClick Mode B lenient cho phép click
empty area tạo free point (giống circleCenter/circle3). Icon design
match design system (4 màu accent C_POINT/C_ARC/C_FILL/currentColor)."
```

---

## Task 6: finalizeShape — 4 case mới

**Files:**
- Modify: `src/stamps/geometry-2d/editor/handlers/finalizeShape.ts`
- Modify (or Create): `src/stamps/geometry-2d/editor/handlers/__tests__/finalizeShape.test.ts`

- [ ] **Step 1: Thêm 4 case vào switch statement**

Sửa `src/stamps/geometry-2d/editor/handlers/finalizeShape.ts` — chèn 4 case mới SAU case `circle3` (sau dòng 167), TRƯỚC case `midpoint`:

```ts
    case 'semicircle': {
      const id = freshId(ctx, 'arc');
      const label = ctx.nextLabel('arc');
      ctx.store.dispatch({
        type: 'ADD',
        payload: {
          obj: mkSceneObj(id, 'arc', label, {
            construction: { kind: 'semicircle', p1: ids[0], p2: ids[1] },
          }),
        },
      });
      return;
    }
    case 'arcCenter': {
      const id = freshId(ctx, 'arc');
      const label = ctx.nextLabel('arc');
      ctx.store.dispatch({
        type: 'ADD',
        payload: {
          obj: mkSceneObj(id, 'arc', label, {
            construction: { kind: 'byCenter', center: ids[0], p1: ids[1], p2: ids[2] },
          }),
        },
      });
      return;
    }
    case 'arc3': {
      const id = freshId(ctx, 'arc');
      const label = ctx.nextLabel('arc');
      ctx.store.dispatch({
        type: 'ADD',
        payload: {
          obj: mkSceneObj(id, 'arc', label, {
            construction: { kind: 'by3Points', p1: ids[0], p2: ids[1], p3: ids[2] },
          }),
        },
      });
      return;
    }
    case 'sectorCenter': {
      const id = freshId(ctx, 'sec');
      const label = ctx.nextLabel('sector');
      ctx.store.dispatch({
        type: 'ADD',
        payload: {
          obj: mkSceneObj(id, 'sector', label, {
            construction: { kind: 'byCenter', center: ids[0], p1: ids[1], p2: ids[2] },
          }),
        },
      });
      return;
    }
```

- [ ] **Step 2: Thêm finalizeShape tests**

Check existing test file:
```bash
ls src/stamps/geometry-2d/editor/handlers/__tests__/finalizeShape.test.ts 2>/dev/null
```

Nếu có file đã tồn tại, append. Nếu chưa có, tạo mới với boilerplate. Test content:

```ts
import { finalizeShape } from '../finalizeShape';
import type { HandlerCtx } from '../ctx';

function mkCtx(ids: string[]): { ctx: HandlerCtx; dispatched: any[] } {
  const dispatched: any[] = [];
  const objects: Record<string, any> = {};
  const ctx = {
    pendingRef: { current: ids.map(() => ({ elementClass: 1 })) },
    pendingIdsRef: { current: [...ids] },
    store: {
      getState: () => ({ counter: 0, objects, order: [], meta: { domain: '2d', version: 1 } }),
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

describe('finalizeShape — circle tools Tier 2', () => {
  test('semicircle → ADD arc kind với construction semicircle', () => {
    const { ctx, dispatched } = mkCtx(['A', 'B']);
    finalizeShape(ctx, { key: 'semicircle', label: '', hint: '', icon: null as any, group: 'circle', needs: 2 });
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0].type).toBe('ADD');
    expect(dispatched[0].payload.obj.kind).toBe('arc');
    expect(dispatched[0].payload.obj.attrs.construction).toEqual({ kind: 'semicircle', p1: 'A', p2: 'B' });
  });

  test('arcCenter → ADD arc kind với construction byCenter', () => {
    const { ctx, dispatched } = mkCtx(['O', 'A', 'B']);
    finalizeShape(ctx, { key: 'arcCenter', label: '', hint: '', icon: null as any, group: 'circle', needs: 3 });
    expect(dispatched[0].payload.obj.kind).toBe('arc');
    expect(dispatched[0].payload.obj.attrs.construction).toEqual({ kind: 'byCenter', center: 'O', p1: 'A', p2: 'B' });
  });

  test('arc3 → ADD arc kind với construction by3Points', () => {
    const { ctx, dispatched } = mkCtx(['A', 'B', 'C']);
    finalizeShape(ctx, { key: 'arc3', label: '', hint: '', icon: null as any, group: 'circle', needs: 3 });
    expect(dispatched[0].payload.obj.kind).toBe('arc');
    expect(dispatched[0].payload.obj.attrs.construction).toEqual({ kind: 'by3Points', p1: 'A', p2: 'B', p3: 'C' });
  });

  test('sectorCenter → ADD sector kind với construction byCenter', () => {
    const { ctx, dispatched } = mkCtx(['O', 'A', 'B']);
    finalizeShape(ctx, { key: 'sectorCenter', label: '', hint: '', icon: null as any, group: 'circle', needs: 3 });
    expect(dispatched[0].payload.obj.kind).toBe('sector');
    expect(dispatched[0].payload.obj.attrs.construction).toEqual({ kind: 'byCenter', center: 'O', p1: 'A', p2: 'B' });
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npm test -- --testPathPattern=finalizeShape.test && npm run typecheck`

Expected: PASS + no type errors.

- [ ] **Step 4: Commit**

```bash
git add src/stamps/geometry-2d/editor/handlers/finalizeShape.ts src/stamps/geometry-2d/editor/handlers/__tests__/finalizeShape.test.ts
git commit -m "feat(stamps/geometry-2d): finalize 4 circle tool dispatch

semicircle, arcCenter, arc3, sectorCenter → dispatch ADD action với
scene object kind 'arc' (3 variants) hoặc 'sector' (1 variant) khớp
schema đã định nghĩa ở core/scene/kinds. multiClick.ts Mode B đã
handle accept-lenient nên không cần sửa."
```

---

## Task 7: Manual QA + finalize

- [ ] **Step 1: Run full test suite**

Run: `npm test && npm run typecheck`

Expected: ALL PASS, no type errors.

- [ ] **Step 2: Run dev server + manual QA**

Run: `npm run dev` (trong worktree; nếu không có script dev, dùng consumer app như hoctotbachkhoa).

Test matrix manually:
- [ ] Mở stamp `geometry-2d`, group `Đường tròn` show 7 tool theo thứ tự đúng
- [ ] `semicircle`: click 2 điểm → vẽ nửa đường tròn đường kính (cung emerald, không có fill)
- [ ] `arcCenter`: click 3 điểm (O, A, B) → cung tròn tâm O từ A đến B (CCW)
- [ ] `arc3`: click 3 điểm không thẳng hàng → cung đi qua 3 điểm
- [ ] `arc3` với 3 điểm gần thẳng hàng → JSXGraph behavior (acceptable nếu chỉ render bất thường, không crash)
- [ ] `sectorCenter`: click 3 điểm (O, A, B) → hình quạt có fill orange nhẹ
- [ ] Hover/select hoạt động trên 4 element mới (commit `288ab5f` fix đã apply qua jxgIdToSceneId)
- [ ] Click empty area trong khi tool active → tạo free point (Mode B lenient)
- [ ] Insert vào Excalidraw, double-click image → reopen editor với state cũ → 4 element restored đúng

- [ ] **Step 3: Build npm package**

Run: `npm run build`

Expected: dist/ generated, no warnings.

- [ ] **Step 4: Push branch + open PR (hoặc fast-forward merge nếu solo)**

```bash
git push -u origin feature/circle-tools-tier2
# Solo workflow: fast-forward merge vào main
# git checkout main && git merge --ff-only feature/circle-tools-tier2 && git push
```

- [ ] **Step 5: Cleanup worktree (sau khi merge)**

```bash
# Từ main worktree (/Users/lenamkhanh/Documents/dev/whiteboard):
git worktree remove ../whiteboard-circle-tools
git branch -d feature/circle-tools-tier2  # local branch
```

---

## Verification checklist (end of plan)

- [ ] 4 tool mới hiển thị trong LeftPanel group "Đường tròn"
- [ ] 5 file source mới + 4 file source modified, không hơn không kém
- [ ] 6 commit semantic (`feat(core/scene)` ×2 + `feat(core/scene): register` + `feat(stamps/geometry-2d)` ×2 + manual-QA)
- [ ] Tests xanh: arc.test, sector.test, JxgRenderer.test, tools.test, finalizeShape.test
- [ ] Typecheck pass
- [ ] Manual QA pass — 4 tool draw + roundtrip persist OK
- [ ] No `Co-Authored-By` lines trong commit messages
