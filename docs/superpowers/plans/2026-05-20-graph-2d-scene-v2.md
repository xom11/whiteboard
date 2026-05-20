# Graph 2D — Scene v2 Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xoá `src/stamps/graph-2d/` cũ và rebuild theo Scene v2 conventions với 7 kind mới (function2d/parameter/pointOnCurve/tangent2d/extremum2d/root2d/slope2d), 12 tool GeoGebra Graphing-aligned, tab Công cụ/Đối tượng, undo/redo unified, inline expression + slider editing.

**Architecture:** Reuse `core/scene/` store + reducer + registry + JxgRenderer (extend với kinds graph) + ObjectListPanel (extend với optional renderRow). Thêm `core/scene/expressions/` pure module (parser/evaluator/derivative). Stamp folder `stamps/graph-2d/` rebuild theo pattern geometry-2d (host lift store/selection, EditorPanel orchestrate, MiniBoard subscribe JxgRenderer, LeftPanel dùng LeftPanelShell).

**Tech Stack:** TypeScript strict, JSXGraph 1.12, React 19, immer 10, Jest 29 + jsdom, Playwright 1.60.

**Spec:** `docs/superpowers/specs/2026-05-20-graph-2d-scene-v2-design.md`

---

## File Map

### Files to create

```
src/core/scene/expressions/
├── parser.ts                       ← validate + compile + collectFreeVars
├── evaluator.ts                    ← scanRoots + scanExtrema
├── derivative.ts                   ← numericalDerivative
└── __tests__/
    ├── parser.test.ts
    ├── evaluator.test.ts
    └── derivative.test.ts

src/core/scene/kinds/
├── function2d.ts
├── parameter.ts
├── pointOnCurve.ts
├── tangent2d.ts
├── extremum2d.ts
├── root2d.ts
├── slope2d.ts
└── __tests__/
    ├── function2d.test.ts
    ├── parameter.test.ts
    ├── pointOnCurve.test.ts
    ├── tangent2d.test.ts
    ├── extremum2d.test.ts
    ├── root2d.test.ts
    └── slope2d.test.ts

src/core/scene/render/__tests__/
└── JxgRenderer.graph.test.ts       ← test render cases mới

src/stamps/graph-2d/                ← REBUILD
├── index.tsx                       ← StampType
├── host.tsx                        ← lift store
├── serialize.ts                    ← parseSceneState + stringifySceneState
├── render.ts                       ← offscreen SVG export
├── types.ts                        ← Graph2DCustomData v2
└── editor/
    ├── EditorPanel.tsx
    ├── LeftPanel.tsx
    ├── MiniBoard.tsx
    ├── useToolStateMachine.ts
    ├── tools.ts
    ├── theme.ts
    ├── handlers.ts
    ├── rows/
    │   ├── FunctionRow.tsx
    │   └── ParameterRow.tsx
    └── __tests__/
        ├── EditorPanel.test.tsx
        ├── LeftPanel.test.tsx
        ├── useToolStateMachine.test.ts
        ├── FunctionRow.test.tsx
        └── ParameterRow.test.tsx

src/stamps/graph-2d/__tests__/
├── index.test.tsx
├── host.test.tsx
└── serialize.test.ts

e2e/graph-2d.spec.ts
```

### Files to modify

```
src/core/scene/types.ts             ← extend Domain + meta.view + RenderCtx.paramMap
src/core/scene/kinds/index.ts       ← +7 imports
src/core/scene/render/JxgRenderer.ts ← rebuild paramMap on meta.domain='graph2d'
src/core/scene/ui/kindMeta.ts       ← +7 entries
src/core/scene/ui/ObjectListPanel.tsx ← +renderRow optional prop
src/core/scene/ui/ObjectListPanel.test.tsx ← +test renderRow override
src/core/scene/index.ts             ← re-export expressions/ nếu cần
src/stamps/shared/registry.ts       ← graph2dStamp re-add ở G.5 (PR G.1 tạm thời remove)
src/stamps/index.ts                 ← re-export graph2dStamp + types
src/index.ts                        ← re-export
package.json                        ← bump version 0.14.0 → 0.15.0 ở G.5
```

### Files to delete

```
src/stamps/graph-2d/                ← TOÀN BỘ folder cũ (G.1 step 1)
```

---

## PR G.1 — Kinds + expressions module

**Branch:** `feat/graph-2d-v2-kinds`

### Task G.1.0: Setup branch + capture old code

**Files:** none — chỉ thao tác git.

- [ ] **Step 1: Đảm bảo branch sạch trên main**

Run:
```bash
cd /Users/lenamkhanh/Documents/dev/whiteboard
git status
git checkout main
git pull
git checkout -b feat/graph-2d-v2-kinds
```

Expected: working tree clean, branch tạo.

- [ ] **Step 2: Capture old parser/evaluator code để port**

Run:
```bash
mkdir -p /tmp/graph-2d-old
cp src/stamps/graph-2d/parser.ts /tmp/graph-2d-old/
cp src/stamps/graph-2d/evaluator.ts /tmp/graph-2d-old/
cp src/stamps/graph-2d/colors.ts /tmp/graph-2d-old/
ls /tmp/graph-2d-old/
```

Expected: 3 file ở `/tmp/graph-2d-old/`. Đây là **reference** để port logic — không copy raw.

### Task G.1.1: Delete old graph-2d folder + remove from registry

**Files:**
- Delete: `src/stamps/graph-2d/` (toàn bộ)
- Modify: `src/stamps/shared/registry.ts`
- Modify: `src/stamps/index.ts`
- Modify: `src/index.ts`
- Modify: `package.json` (exports map remove `./graph-2d` entry tạm thời)

- [ ] **Step 1: Xoá folder cũ**

Run:
```bash
rm -rf src/stamps/graph-2d
git status
```

Expected: thấy nhiều deleted files.

- [ ] **Step 2: Sửa `src/stamps/shared/registry.ts`**

Read file rồi edit: xoá 4 lần xuất hiện `graph2dStamp` / `Graph2DCustomData` / `isGraph2DCustomData`. Sau khi sửa nội dung phải là:

```ts
import { geometryStamp } from '../geometry-2d';
import { latexStamp } from '../latex';
import { geometry3dStamp } from '../geometry-3d';
import type { StampType } from './types';

export { geometryStamp, type GeometryCustomData, isGeometryCustomData } from '../geometry-2d';
export { latexStamp, type LatexCustomData, isLatexCustomData } from '../latex';
export {
  geometry3dStamp,
  type Geometry3DCustomData,
  isGeometry3DCustomData,
} from '../geometry-3d';
export type { StampType, BaseStampCustomData } from './types';

/** Stamp ổn định, sẵn sàng production. */
export const STABLE_STAMPS: ReadonlyArray<StampType> = Object.freeze([
  geometryStamp,
  latexStamp,
]);

/** Stamp experimental — chưa ổn định cho production. Consumer phải opt-in. */
export const EXPERIMENTAL_STAMPS: ReadonlyArray<StampType> = Object.freeze([
  geometry3dStamp,
]);

/** Tất cả stamp (stable + experimental). */
export const ALL_STAMPS: ReadonlyArray<StampType> = Object.freeze([
  ...STABLE_STAMPS,
  ...EXPERIMENTAL_STAMPS,
]);

export const DEFAULT_STAMPS: ReadonlyArray<StampType> = ALL_STAMPS;

export function findStampForCustomData(
  data: unknown,
  stamps: ReadonlyArray<StampType> = DEFAULT_STAMPS,
): StampType | null {
  for (const s of stamps) {
    if (s.matchesCustomData(data)) return s;
  }
  return null;
}

export function isStampElement<T extends { customData?: unknown }>(
  element: T,
  stamps: ReadonlyArray<StampType> = DEFAULT_STAMPS,
): boolean {
  return findStampForCustomData(element.customData, stamps) !== null;
}
```

- [ ] **Step 3: Sửa `src/stamps/index.ts`**

Read file. Xoá các re-export `graph2dStamp` / `Graph2DCustomData` / `isGraph2DCustomData` / `./graph-2d`. Giữ lại các re-export của geometry-2d / geometry-3d / latex.

- [ ] **Step 4: Sửa `src/index.ts`**

Read file. Xoá re-export tương tự nếu có.

- [ ] **Step 5: Sửa `package.json`**

Read file. Xoá entry `"./graph-2d": { ... }` khỏi `exports`.

- [ ] **Step 6: Verify typecheck + tests**

Run:
```bash
npm run typecheck
npm test
```

Expected: PASS. Tests cho graph-2d cũ bị xoá theo folder, nên không còn fail.

- [ ] **Step 7: Commit**

Run:
```bash
git add -A
git commit -m "refactor(graph-2d): xoá implementation cũ chuẩn bị rebuild theo Scene v2"
```

### Task G.1.2: Extend `State.meta.domain` để cover 'graph2d' + `RenderCtx.paramMap`

**Files:**
- Modify: `src/core/scene/types.ts`
- Modify: `src/core/scene/__tests__/types.test.ts` (nếu tồn tại, không thì skip)

- [ ] **Step 1: Đọc `src/core/scene/types.ts`**

- [ ] **Step 2: Sửa Domain trong `State.meta` + `createEmptyState` signature**

Tìm dòng:
```ts
readonly meta: { readonly domain: '2d' | '3d'; readonly version: number };
```
Sửa thành:
```ts
readonly meta: {
  readonly domain: '2d' | '3d' | 'graph2d';
  readonly version: number;
  readonly view?: ViewSettings;
};
```

Thêm type `ViewSettings` phía trên `State`:
```ts
export type ViewSettings = {
  readonly xMin: number;
  readonly xMax: number;
  readonly yMin: number;
  readonly yMax: number;
  readonly showAxis: boolean;
  readonly showGrid: boolean;
};
```

Sửa signature `createEmptyState`:
```ts
export function createEmptyState(domain: '2d' | '3d' | 'graph2d'): State {
  const base: State = { ...EMPTY_STATE, meta: { domain, version: 1 } };
  if (domain === 'graph2d') {
    return {
      ...base,
      meta: {
        ...base.meta,
        view: { xMin: -10, xMax: 10, yMin: -10, yMax: 10, showAxis: true, showGrid: true },
      },
    };
  }
  return base;
}
```

- [ ] **Step 3: Thêm `paramMap` optional vào `RenderCtx`**

Tìm:
```ts
export type RenderCtx = {
  jxg: unknown;
  resolveRef: (id: string) => unknown;
  defaults: Readonly<Record<string, unknown>>;
};
```
Sửa thành:
```ts
export type RenderCtx = {
  jxg: unknown;
  resolveRef: (id: string) => unknown;
  defaults: Readonly<Record<string, unknown>>;
  /** Map tham số (parameter.label → parameter.value). Chỉ graph2d dùng. */
  paramMap?: Readonly<Record<string, number>>;
};
```

- [ ] **Step 4: Add action `UPDATE_VIEW`**

Tìm `export type Action =` rồi thêm vào union:
```ts
  | { type: 'UPDATE_VIEW'; payload: { patch: Partial<ViewSettings> } }
```

- [ ] **Step 5: Typecheck**

Run:
```bash
npm run typecheck
```

Expected: có lỗi ở `reducer.ts` (chưa handle UPDATE_VIEW). Sang Task G.1.3 sẽ fix.

### Task G.1.3: Handle `UPDATE_VIEW` trong reducer

**Files:**
- Modify: `src/core/scene/reducer.ts`
- Test: `src/core/scene/__tests__/reducer.updateView.test.ts`

- [ ] **Step 1: Viết failing test**

Create `src/core/scene/__tests__/reducer.updateView.test.ts`:
```ts
import { reduce } from '../reducer';
import { createEmptyState } from '../types';

describe('reducer UPDATE_VIEW', () => {
  it('cập nhật meta.view với patch', () => {
    const state = createEmptyState('graph2d');
    const next = reduce(state, {
      type: 'UPDATE_VIEW',
      payload: { patch: { xMin: -20, xMax: 20 } },
    });
    expect(next.meta.view).toEqual({
      xMin: -20, xMax: 20, yMin: -10, yMax: 10,
      showAxis: true, showGrid: true,
    });
  });

  it('giữ nguyên fields không patch', () => {
    const state = createEmptyState('graph2d');
    const next = reduce(state, {
      type: 'UPDATE_VIEW',
      payload: { patch: { showGrid: false } },
    });
    expect(next.meta.view?.showAxis).toBe(true);
    expect(next.meta.view?.showGrid).toBe(false);
  });

  it('no-op khi domain không có view (2d/3d)', () => {
    const state = createEmptyState('2d');
    const next = reduce(state, {
      type: 'UPDATE_VIEW',
      payload: { patch: { xMin: -20 } },
    });
    expect(next).toBe(state);
  });
});
```

- [ ] **Step 2: Verify fail**

Run: `npx jest src/core/scene/__tests__/reducer.updateView.test.ts`
Expected: FAIL — UPDATE_VIEW case chưa handle.

- [ ] **Step 3: Sửa reducer**

Read `src/core/scene/reducer.ts`. Trong switch chính, thêm case:
```ts
    case 'UPDATE_VIEW': {
      if (!state.meta.view) return state;
      return produce(state, (draft) => {
        Object.assign(draft.meta.view!, action.payload.patch);
      });
    }
```

(Nếu reducer dùng pattern immer khác, adapt cho phù hợp — read file để xem.)

- [ ] **Step 4: Verify pass**

Run: `npx jest src/core/scene/__tests__/reducer.updateView.test.ts`
Expected: PASS.

- [ ] **Step 5: Run full scene tests**

Run: `npx jest src/core/scene`
Expected: tất cả PASS.

- [ ] **Step 6: Commit**

Run:
```bash
git add src/core/scene/types.ts src/core/scene/reducer.ts src/core/scene/__tests__/reducer.updateView.test.ts
git commit -m "feat(scene/types): thêm 'graph2d' domain + meta.view + RenderCtx.paramMap + UPDATE_VIEW"
```

### Task G.1.4: `core/scene/expressions/parser.ts`

**Files:**
- Create: `src/core/scene/expressions/parser.ts`
- Test: `src/core/scene/expressions/__tests__/parser.test.ts`

- [ ] **Step 1: Viết failing test**

Create `src/core/scene/expressions/__tests__/parser.test.ts`:
```ts
import { validate, compile, collectFreeVars, ALLOWED_FUNCTIONS, ALLOWED_CONSTANTS } from '../parser';

describe('expressions/parser', () => {
  describe('validate', () => {
    it('valid expression → ok', () => {
      expect(validate('x^2 + 2*x + 1')).toEqual({ ok: true });
      expect(validate('sin(x) + cos(a)')).toEqual({ ok: true });
      expect(validate('pi * x')).toEqual({ ok: true });
    });

    it('empty → error', () => {
      const r = validate('');
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toMatch(/rỗng|empty/i);
    });

    it('unknown identifier → error', () => {
      const r = validate('unknown_func(x)');
      expect(r.ok).toBe(false);
    });

    it('unsafe operators → error', () => {
      expect(validate('x = 5').ok).toBe(false);
      expect(validate('x; y').ok).toBe(false);
      expect(validate('eval(x)').ok).toBe(false);
    });
  });

  describe('compile', () => {
    it('x^2 with x=3 → 9', () => {
      const fn = compile('x^2', {});
      expect(typeof fn).toBe('function');
      if (typeof fn === 'function') expect(fn(3)).toBe(9);
    });

    it('uses parameter map', () => {
      const fn = compile('a*x + b', { a: 2, b: 1 });
      if (typeof fn === 'function') expect(fn(3)).toBe(7);
    });

    it('uses Math functions', () => {
      const fn = compile('sin(x)', {});
      if (typeof fn === 'function') expect(fn(0)).toBeCloseTo(0);
    });

    it('uses constants', () => {
      const fn = compile('pi', {});
      if (typeof fn === 'function') expect(fn(0)).toBeCloseTo(Math.PI);
    });

    it('returns error string on invalid', () => {
      const r = compile('x +', {});
      expect(typeof r).toBe('string');
    });
  });

  describe('collectFreeVars', () => {
    it('returns [x, a] for "a*x + b" when only a known', () => {
      const vars = collectFreeVars('a*x + b');
      expect(vars).toEqual(expect.arrayContaining(['a', 'b']));
      expect(vars).not.toContain('x');         // x là biến độc lập
      expect(vars).not.toContain('sin');       // sin trong allowed
    });

    it('returns [] for "x^2"', () => {
      expect(collectFreeVars('x^2')).toEqual([]);
    });
  });

  describe('whitelist', () => {
    it('ALLOWED_FUNCTIONS chứa sin/cos/tan/sqrt/log/exp/abs', () => {
      const required = ['sin', 'cos', 'tan', 'sqrt', 'log', 'exp', 'abs', 'pow'];
      for (const fn of required) expect(ALLOWED_FUNCTIONS).toContain(fn);
    });

    it('ALLOWED_CONSTANTS chứa pi và e', () => {
      expect(ALLOWED_CONSTANTS).toContain('pi');
      expect(ALLOWED_CONSTANTS).toContain('e');
    });
  });
});
```

- [ ] **Step 2: Verify fail**

Run: `npx jest src/core/scene/expressions/__tests__/parser.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement parser.ts**

Create `src/core/scene/expressions/parser.ts`:
```ts
// src/core/scene/expressions/parser.ts
// Pure expression parser cho function2d kind. Không import JSXGraph/React.

export const ALLOWED_CONSTANTS = ['pi', 'e'] as const;
export const ALLOWED_FUNCTIONS = [
  'sin', 'cos', 'tan',
  'asin', 'acos', 'atan', 'atan2',
  'sinh', 'cosh', 'tanh',
  'exp', 'log', 'log10', 'ln',
  'sqrt', 'cbrt', 'abs',
  'floor', 'ceil', 'round',
  'min', 'max', 'pow',
] as const;

const ID_RE = /[A-Za-z_][A-Za-z0-9_]*/g;
const UNSAFE_RE = /[=;{}]|\beval\b|\bnew\b|\breturn\b|\bthis\b|\bwindow\b|\bdocument\b|\bglobal\b|\bprocess\b/;

const NUMBER_RE = /^[+\-]?(\d+\.?\d*|\.\d+)([eE][+\-]?\d+)?$/;

export type ValidateResult = { ok: true } | { ok: false; error: string };

/** Kiểm tra expression có hợp lệ không. */
export function validate(expression: string): ValidateResult {
  const trimmed = expression.trim();
  if (!trimmed) return { ok: false, error: 'Biểu thức rỗng' };
  if (UNSAFE_RE.test(trimmed)) return { ok: false, error: 'Biểu thức chứa toán tử hoặc identifier không cho phép' };

  // Replace ^ với ** (JS không có ^)
  const jsExpr = trimmed.replace(/\^/g, '**');

  // Check identifiers
  const ids = new Set<string>();
  let m: RegExpExecArray | null;
  ID_RE.lastIndex = 0;
  while ((m = ID_RE.exec(jsExpr)) !== null) ids.add(m[0]);

  for (const id of ids) {
    if (id === 'x') continue;
    if ((ALLOWED_CONSTANTS as readonly string[]).includes(id)) continue;
    if ((ALLOWED_FUNCTIONS as readonly string[]).includes(id)) continue;
    // Remaining identifiers treat as parameter — OK at validate time.
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(id)) {
      return { ok: false, error: `Identifier không hợp lệ: ${id}` };
    }
  }

  // Try syntactic compile (with dummy params) to catch syntax errors.
  try {
    buildFunctionBody(jsExpr, Array.from(ids).filter(
      (id) => id !== 'x' && !(ALLOWED_CONSTANTS as readonly string[]).includes(id) && !(ALLOWED_FUNCTIONS as readonly string[]).includes(id),
    ));
  } catch (err) {
    return { ok: false, error: `Cú pháp lỗi: ${(err as Error).message}` };
  }

  return { ok: true };
}

/**
 * Compile expression thành function (x: number) => number.
 * - `params` map từ identifier → value để inline vào closure.
 * - Trả string error nếu invalid.
 */
export function compile(
  expression: string,
  params: Record<string, number>,
): ((x: number) => number) | string {
  const v = validate(expression);
  if (!v.ok) return v.error;
  const jsExpr = expression.trim().replace(/\^/g, '**');

  const ids = new Set<string>();
  let m: RegExpExecArray | null;
  ID_RE.lastIndex = 0;
  while ((m = ID_RE.exec(jsExpr)) !== null) ids.add(m[0]);

  const paramNames: string[] = [];
  for (const id of ids) {
    if (id === 'x') continue;
    if ((ALLOWED_CONSTANTS as readonly string[]).includes(id)) continue;
    if ((ALLOWED_FUNCTIONS as readonly string[]).includes(id)) continue;
    paramNames.push(id);
  }

  try {
    const body = buildFunctionBody(jsExpr, paramNames);
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    const fn = new Function('x', ...paramNames, body) as (
      x: number,
      ...args: number[]
    ) => number;
    const args = paramNames.map((name) => params[name] ?? NaN);
    return (x: number) => fn(x, ...args);
  } catch (err) {
    return `Compile error: ${(err as Error).message}`;
  }
}

function buildFunctionBody(jsExpr: string, _paramNames: string[]): string {
  // Inline Math constants and functions.
  // sin → Math.sin, pi → Math.PI, e → Math.E, ln → Math.log.
  let body = jsExpr;
  body = body.replace(/\bln\b/g, 'Math.log');
  body = body.replace(/\blog\b/g, 'Math.log10');
  body = body.replace(/\bpi\b/g, '(Math.PI)');
  body = body.replace(/\be\b(?!\w)/g, '(Math.E)');
  for (const fn of ALLOWED_FUNCTIONS) {
    if (fn === 'log' || fn === 'log10') continue;        // already handled
    body = body.replace(new RegExp(`\\b${fn}\\b`, 'g'), `Math.${fn}`);
  }
  return `"use strict"; return (${body});`;
}

/** Liệt kê free identifiers (≠ x, ≠ allowed const/func). */
export function collectFreeVars(expression: string): string[] {
  const v = validate(expression);
  if (!v.ok) return [];
  const ids = new Set<string>();
  let m: RegExpExecArray | null;
  ID_RE.lastIndex = 0;
  while ((m = ID_RE.exec(expression)) !== null) ids.add(m[0]);
  const out: string[] = [];
  for (const id of ids) {
    if (id === 'x') continue;
    if ((ALLOWED_CONSTANTS as readonly string[]).includes(id)) continue;
    if ((ALLOWED_FUNCTIONS as readonly string[]).includes(id)) continue;
    if (NUMBER_RE.test(id)) continue;
    out.push(id);
  }
  return out.sort();
}
```

- [ ] **Step 4: Verify pass**

Run: `npx jest src/core/scene/expressions/__tests__/parser.test.ts`
Expected: PASS (8 test).

- [ ] **Step 5: Commit**

```bash
git add src/core/scene/expressions/parser.ts src/core/scene/expressions/__tests__/parser.test.ts
git commit -m "feat(scene/expressions): parser validate + compile + collectFreeVars"
```

### Task G.1.5: `core/scene/expressions/evaluator.ts`

**Files:**
- Create: `src/core/scene/expressions/evaluator.ts`
- Test: `src/core/scene/expressions/__tests__/evaluator.test.ts`

- [ ] **Step 1: Viết failing test**

```ts
// src/core/scene/expressions/__tests__/evaluator.test.ts
import { scanRoots, scanExtrema } from '../evaluator';

describe('expressions/evaluator', () => {
  describe('scanRoots', () => {
    it('finds root of x → 0', () => {
      const roots = scanRoots((x) => x, -10, 10);
      expect(roots.length).toBe(1);
      expect(roots[0]).toBeCloseTo(0, 3);
    });

    it('finds two roots of x^2-4 → ±2', () => {
      const roots = scanRoots((x) => x * x - 4, -10, 10);
      expect(roots.length).toBe(2);
      expect(roots[0]).toBeCloseTo(-2, 3);
      expect(roots[1]).toBeCloseTo(2, 3);
    });

    it('no roots cho x^2+1', () => {
      const roots = scanRoots((x) => x * x + 1, -10, 10);
      expect(roots).toEqual([]);
    });

    it('handles NaN gracefully', () => {
      const roots = scanRoots((x) => (x === 0 ? NaN : x), -10, 10);
      expect(Array.isArray(roots)).toBe(true);
    });
  });

  describe('scanExtrema', () => {
    it('finds min of x^2 → x=0,y=0', () => {
      const extrema = scanExtrema((x) => x * x, -10, 10);
      const min = extrema.find((e) => e.type === 'min');
      expect(min).toBeDefined();
      expect(min!.x).toBeCloseTo(0, 2);
      expect(min!.y).toBeCloseTo(0, 2);
    });

    it('finds max of -x^2 → x=0,y=0', () => {
      const extrema = scanExtrema((x) => -x * x, -10, 10);
      const max = extrema.find((e) => e.type === 'max');
      expect(max).toBeDefined();
      expect(max!.x).toBeCloseTo(0, 2);
    });

    it('monotone function returns []', () => {
      const extrema = scanExtrema((x) => x, -10, 10);
      expect(extrema).toEqual([]);
    });
  });
});
```

- [ ] **Step 2: Verify fail**

Run: `npx jest src/core/scene/expressions/__tests__/evaluator.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement evaluator.ts**

```ts
// src/core/scene/expressions/evaluator.ts
// Numerical root + extrema scanning. Pure module.

const DEFAULT_SAMPLES = 1000;

/**
 * Quét nghiệm trong [xMin, xMax] bằng sign-change detection + bisection.
 * - Lấy DEFAULT_SAMPLES sample.
 * - Mỗi sub-interval đổi dấu → bisect 30 step.
 */
export function scanRoots(
  fn: (x: number) => number,
  xMin: number,
  xMax: number,
  samples = DEFAULT_SAMPLES,
): number[] {
  if (!Number.isFinite(xMin) || !Number.isFinite(xMax) || xMin >= xMax) return [];
  const out: number[] = [];
  const step = (xMax - xMin) / samples;
  let prev = fn(xMin);
  for (let i = 1; i <= samples; i++) {
    const x = xMin + i * step;
    const cur = fn(x);
    if (Number.isFinite(prev) && Number.isFinite(cur) && prev * cur < 0) {
      const root = bisect(fn, x - step, x);
      if (Number.isFinite(root)) out.push(root);
    }
    prev = cur;
  }
  return out;
}

function bisect(fn: (x: number) => number, a: number, b: number, iters = 30): number {
  let lo = a, hi = b;
  let flo = fn(lo);
  for (let i = 0; i < iters; i++) {
    const mid = (lo + hi) / 2;
    const fmid = fn(mid);
    if (!Number.isFinite(fmid)) return NaN;
    if (flo * fmid <= 0) {
      hi = mid;
    } else {
      lo = mid;
      flo = fmid;
    }
  }
  return (lo + hi) / 2;
}

export interface Extremum {
  x: number;
  y: number;
  type: 'max' | 'min';
}

/**
 * Quét cực trị bằng sample derivative sign-change.
 * - Lấy DEFAULT_SAMPLES sample y = fn(x).
 * - Derivative xấp xỉ Δy / Δx.
 * - Đổi dấu derivative + → - = max, - → + = min.
 */
export function scanExtrema(
  fn: (x: number) => number,
  xMin: number,
  xMax: number,
  samples = DEFAULT_SAMPLES,
): Extremum[] {
  if (!Number.isFinite(xMin) || !Number.isFinite(xMax) || xMin >= xMax) return [];
  const out: Extremum[] = [];
  const step = (xMax - xMin) / samples;

  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i <= samples; i++) {
    const x = xMin + i * step;
    xs.push(x);
    ys.push(fn(x));
  }

  let prevSign = 0;
  for (let i = 1; i < samples; i++) {
    const d = ys[i + 1] - ys[i - 1];
    if (!Number.isFinite(d)) continue;
    const sign = d > 0 ? 1 : d < 0 ? -1 : 0;
    if (sign === 0) continue;
    if (prevSign !== 0 && sign !== prevSign) {
      const type: 'max' | 'min' = prevSign > 0 ? 'max' : 'min';
      out.push({ x: xs[i], y: ys[i], type });
    }
    prevSign = sign;
  }
  return out;
}
```

- [ ] **Step 4: Verify pass**

Run: `npx jest src/core/scene/expressions/__tests__/evaluator.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/scene/expressions/evaluator.ts src/core/scene/expressions/__tests__/evaluator.test.ts
git commit -m "feat(scene/expressions): scanRoots + scanExtrema (numerical scan)"
```

### Task G.1.6: `core/scene/expressions/derivative.ts`

**Files:**
- Create: `src/core/scene/expressions/derivative.ts`
- Test: `src/core/scene/expressions/__tests__/derivative.test.ts`

- [ ] **Step 1: Viết failing test**

```ts
// src/core/scene/expressions/__tests__/derivative.test.ts
import { numericalDerivative } from '../derivative';

describe('numericalDerivative', () => {
  it('d/dx x^2 tại x=1 → 2', () => {
    expect(numericalDerivative('x^2', {}, 1)).toBeCloseTo(2, 4);
  });

  it('d/dx x^3 tại x=2 → 12', () => {
    expect(numericalDerivative('x^3', {}, 2)).toBeCloseTo(12, 3);
  });

  it('d/dx a*x tại x=5 → a', () => {
    expect(numericalDerivative('a*x', { a: 3 }, 5)).toBeCloseTo(3, 4);
  });

  it('d/dx sin(x) tại x=0 → 1', () => {
    expect(numericalDerivative('sin(x)', {}, 0)).toBeCloseTo(1, 3);
  });

  it('NaN cho invalid expression', () => {
    expect(numericalDerivative('x +', {}, 0)).toBeNaN();
  });
});
```

- [ ] **Step 2: Verify fail**

Run: `npx jest src/core/scene/expressions/__tests__/derivative.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// src/core/scene/expressions/derivative.ts
import { compile } from './parser';

/**
 * Numerical derivative bằng central difference.
 * f'(x) ≈ (f(x + h) - f(x - h)) / (2h)
 */
export function numericalDerivative(
  expression: string,
  params: Record<string, number>,
  x: number,
  h = 1e-5,
): number {
  const fn = compile(expression, params);
  if (typeof fn !== 'function') return NaN;
  const yPlus = fn(x + h);
  const yMinus = fn(x - h);
  if (!Number.isFinite(yPlus) || !Number.isFinite(yMinus)) return NaN;
  return (yPlus - yMinus) / (2 * h);
}
```

- [ ] **Step 4: Verify pass**

Run: `npx jest src/core/scene/expressions/__tests__/derivative.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/scene/expressions/derivative.ts src/core/scene/expressions/__tests__/derivative.test.ts
git commit -m "feat(scene/expressions): numericalDerivative (central difference)"
```

### Task G.1.7: kind `function2d`

**Files:**
- Create: `src/core/scene/kinds/function2d.ts`
- Test: `src/core/scene/kinds/__tests__/function2d.test.ts`

- [ ] **Step 1: Viết failing test**

```ts
// src/core/scene/kinds/__tests__/function2d.test.ts
import { getKind } from '../../registry';
import '../function2d';

describe('kind function2d', () => {
  const def = getKind('function2d');

  it('type = "function2d"', () => {
    expect(def.type).toBe('function2d');
  });

  it('validate ok cho expression hợp lệ', () => {
    expect(() => def.validate?.({
      expression: 'x^2', color: '#2563eb', visible: true,
    })).not.toThrow();
  });

  it('validate throw cho expression rỗng', () => {
    expect(() => def.validate?.({
      expression: '', color: '#2563eb', visible: true,
    })).toThrow(/rỗng|empty|invalid/i);
  });

  it('validate throw cho expression syntax error', () => {
    expect(() => def.validate?.({
      expression: 'x +', color: '#2563eb', visible: true,
    })).toThrow();
  });

  it('validate throw cho domain min >= max', () => {
    expect(() => def.validate?.({
      expression: 'x', color: '#2563eb', visible: true,
      domain: { min: 5, max: 3 },
    })).toThrow(/domain|interval/i);
  });

  it('dependsOn → []', () => {
    expect(def.dependsOn({ expression: 'a*x', color: '#000', visible: true })).toEqual([]);
  });

  it('describe trả expression', () => {
    const obj = {
      id: 'f1', kind: 'function2d', label: 'f', visible: true, locked: false,
      layer: 'default', schemaVersion: 1,
      attrs: { expression: 'x^2', color: '#000', visible: true },
    };
    expect(def.describe(obj as never)).toContain('x^2');
  });
});
```

- [ ] **Step 2: Verify fail**

Run: `npx jest src/core/scene/kinds/__tests__/function2d.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// src/core/scene/kinds/function2d.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';
import { validate as validateExpr, compile } from '../expressions/parser';

export interface Function2DAttrs {
  expression: string;
  color: string;
  visible: boolean;
  domain?: { min: number; max: number };
}

const def: KindDef<Function2DAttrs> = {
  type: 'function2d',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    if (!a) throw new Error('function2d: attrs bắt buộc');
    if (typeof a.expression !== 'string' || !a.expression.trim()) {
      throw new Error('function2d: expression rỗng');
    }
    const v = validateExpr(a.expression);
    if (!v.ok) throw new Error(`function2d: expression invalid — ${v.error}`);
    if (typeof a.color !== 'string') throw new Error('function2d: color bắt buộc');
    if (typeof a.visible !== 'boolean') throw new Error('function2d: visible bắt buộc');
    if (a.domain) {
      if (a.domain.min >= a.domain.max) {
        throw new Error('function2d: domain min phải < max');
      }
    }
  },
  dependsOn: () => [],
  describe: (obj) => `${obj.label}(x) = ${obj.attrs.expression}`,
  render: (obj, ctx) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const board = ctx.jxg as any;
    if (!obj.visible || !obj.attrs.visible) return null;
    const paramMap = ctx.paramMap ?? {};
    const fn = compile(obj.attrs.expression, paramMap as Record<string, number>);
    if (typeof fn !== 'function') return null;
    const view = (ctx.defaults.view ?? {}) as { xMin?: number; xMax?: number };
    const xMin = obj.attrs.domain?.min ?? view.xMin ?? -10;
    const xMax = obj.attrs.domain?.max ?? view.xMax ?? 10;
    return board.create('functiongraph', [fn, xMin, xMax], {
      strokeColor: obj.attrs.color,
      strokeWidth: 2,
      name: obj.label,
      withLabel: false,
      highlight: false,
      fixed: true,
    });
  },
};

registerKind(def);
```

- [ ] **Step 4: Verify pass**

Run: `npx jest src/core/scene/kinds/__tests__/function2d.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/scene/kinds/function2d.ts src/core/scene/kinds/__tests__/function2d.test.ts
git commit -m "feat(scene/kinds): function2d (expression + color + domain)"
```

### Task G.1.8: kind `parameter`

**Files:**
- Create: `src/core/scene/kinds/parameter.ts`
- Test: `src/core/scene/kinds/__tests__/parameter.test.ts`

- [ ] **Step 1: Test**

```ts
// src/core/scene/kinds/__tests__/parameter.test.ts
import { getKind } from '../../registry';
import '../parameter';

describe('kind parameter', () => {
  const def = getKind('parameter');

  it('type = "parameter"', () => {
    expect(def.type).toBe('parameter');
  });

  it('validate ok cho slider hợp lệ', () => {
    expect(() => def.validate?.({ value: 1, min: -5, max: 5, step: 0.1 })).not.toThrow();
  });

  it('validate throw khi min >= max', () => {
    expect(() => def.validate?.({ value: 0, min: 5, max: 5, step: 0.1 })).toThrow(/min/i);
  });

  it('validate throw khi value ngoài [min, max]', () => {
    expect(() => def.validate?.({ value: 10, min: -5, max: 5, step: 0.1 })).toThrow(/value/i);
  });

  it('validate throw khi step <= 0', () => {
    expect(() => def.validate?.({ value: 0, min: -5, max: 5, step: 0 })).toThrow(/step/i);
  });

  it('dependsOn → []', () => {
    expect(def.dependsOn({ value: 0, min: -5, max: 5, step: 0.1 })).toEqual([]);
  });

  it('render trả null (parameter không render lên board)', () => {
    const obj = { id: 'a', kind: 'parameter', label: 'a', visible: true, locked: false, layer: 'default', schemaVersion: 1, attrs: { value: 1, min: -5, max: 5, step: 0.1 } };
    const ctx = { jxg: {}, resolveRef: () => null, defaults: {} };
    expect(def.render(obj as never, ctx as never)).toBe(null);
  });
});
```

- [ ] **Step 2: Verify fail** — Run `npx jest src/core/scene/kinds/__tests__/parameter.test.ts`.

- [ ] **Step 3: Implement**

```ts
// src/core/scene/kinds/parameter.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';

export interface ParameterAttrs {
  value: number;
  min: number;
  max: number;
  step: number;
}

const def: KindDef<ParameterAttrs> = {
  type: 'parameter',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    if (!a) throw new Error('parameter: attrs bắt buộc');
    if (typeof a.value !== 'number' || typeof a.min !== 'number' || typeof a.max !== 'number') {
      throw new Error('parameter: value/min/max phải là number');
    }
    if (a.min >= a.max) throw new Error('parameter: min phải < max');
    if (a.value < a.min || a.value > a.max) throw new Error('parameter: value ngoài [min, max]');
    if (typeof a.step !== 'number' || a.step <= 0) throw new Error('parameter: step phải > 0');
  },
  dependsOn: () => [],
  describe: (obj) => `${obj.label} = ${obj.attrs.value}`,
  render: () => null,           // Không render lên board
};

registerKind(def);
```

- [ ] **Step 4: Verify pass** + **Step 5: Commit**

```bash
git add src/core/scene/kinds/parameter.ts src/core/scene/kinds/__tests__/parameter.test.ts
git commit -m "feat(scene/kinds): parameter (slider)"
```

### Task G.1.9: kind `pointOnCurve`

**Files:**
- Create: `src/core/scene/kinds/pointOnCurve.ts`
- Test: `src/core/scene/kinds/__tests__/pointOnCurve.test.ts`

- [ ] **Step 1: Test**

```ts
// src/core/scene/kinds/__tests__/pointOnCurve.test.ts
import { getKind } from '../../registry';
import '../pointOnCurve';

describe('kind pointOnCurve', () => {
  const def = getKind('pointOnCurve');

  it('type = "pointOnCurve"', () => {
    expect(def.type).toBe('pointOnCurve');
  });

  it('validate ok', () => {
    expect(() => def.validate?.({ functionId: 'f1', x: 1.5 })).not.toThrow();
  });

  it('validate throw khi functionId thiếu', () => {
    expect(() => def.validate?.({ functionId: '', x: 0 } as never)).toThrow(/functionId/i);
  });

  it('validate throw khi x không phải number', () => {
    expect(() => def.validate?.({ functionId: 'f1', x: NaN })).toThrow(/x/i);
  });

  it('dependsOn → [functionId]', () => {
    expect(def.dependsOn({ functionId: 'f1', x: 0 })).toEqual(['f1']);
  });
});
```

- [ ] **Step 2: Verify fail.**

- [ ] **Step 3: Implement**

```ts
// src/core/scene/kinds/pointOnCurve.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';

export interface PointOnCurveAttrs {
  functionId: string;
  x: number;
}

const def: KindDef<PointOnCurveAttrs> = {
  type: 'pointOnCurve',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    if (!a || typeof a.functionId !== 'string' || !a.functionId) {
      throw new Error('pointOnCurve: functionId bắt buộc');
    }
    if (typeof a.x !== 'number' || !Number.isFinite(a.x)) {
      throw new Error('pointOnCurve: x phải là finite number');
    }
  },
  dependsOn: (a) => [a.functionId],
  describe: (obj) => `${obj.label} trên ${obj.attrs.functionId} tại x=${obj.attrs.x.toFixed(3)}`,
  render: (obj, ctx) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const board = ctx.jxg as any;
    const curve = ctx.resolveRef(obj.attrs.functionId);
    if (!curve) return null;
    return board.create('glider', [obj.attrs.x, 0, curve], {
      name: obj.label,
      size: 3,
      withLabel: obj.label !== '',
      fillColor: '#000',
      strokeColor: '#000',
    });
  },
};

registerKind(def);
```

- [ ] **Step 4: Verify pass + Step 5: Commit.**

```bash
git add src/core/scene/kinds/pointOnCurve.ts src/core/scene/kinds/__tests__/pointOnCurve.test.ts
git commit -m "feat(scene/kinds): pointOnCurve (glider trên function curve)"
```

### Task G.1.10: kind `tangent2d`

**Files:**
- Create: `src/core/scene/kinds/tangent2d.ts`
- Test: `src/core/scene/kinds/__tests__/tangent2d.test.ts`

- [ ] **Step 1: Test**

```ts
// src/core/scene/kinds/__tests__/tangent2d.test.ts
import { getKind } from '../../registry';
import '../tangent2d';

describe('kind tangent2d', () => {
  const def = getKind('tangent2d');
  it('type = "tangent2d"', () => expect(def.type).toBe('tangent2d'));
  it('validate ok', () => {
    expect(() => def.validate?.({ pointId: 'p1' })).not.toThrow();
  });
  it('validate throw nếu pointId thiếu', () => {
    expect(() => def.validate?.({ pointId: '' } as never)).toThrow();
  });
  it('dependsOn → [pointId]', () => {
    expect(def.dependsOn({ pointId: 'p1' })).toEqual(['p1']);
  });
});
```

- [ ] **Step 2: Verify fail.**

- [ ] **Step 3: Implement**

```ts
// src/core/scene/kinds/tangent2d.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';

export interface Tangent2DAttrs {
  pointId: string;
}

const def: KindDef<Tangent2DAttrs> = {
  type: 'tangent2d',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    if (!a || typeof a.pointId !== 'string' || !a.pointId) {
      throw new Error('tangent2d: pointId bắt buộc');
    }
  },
  dependsOn: (a) => [a.pointId],
  describe: (obj) => `Tiếp tuyến tại ${obj.attrs.pointId}`,
  render: (obj, ctx) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const board = ctx.jxg as any;
    const pt = ctx.resolveRef(obj.attrs.pointId);
    if (!pt) return null;
    return board.create('tangent', [pt], {
      strokeColor: '#65a30d',
      strokeWidth: 1.5,
      dash: 2,
      withLabel: false,
    });
  },
};

registerKind(def);
```

- [ ] **Step 4-5: Verify pass + Commit.**

```bash
git add src/core/scene/kinds/tangent2d.ts src/core/scene/kinds/__tests__/tangent2d.test.ts
git commit -m "feat(scene/kinds): tangent2d (qua pointOnCurve)"
```

### Task G.1.11: kind `extremum2d`

**Files:**
- Create: `src/core/scene/kinds/extremum2d.ts`
- Test: `src/core/scene/kinds/__tests__/extremum2d.test.ts`

- [ ] **Step 1: Test**

```ts
import { getKind } from '../../registry';
import '../extremum2d';

describe('kind extremum2d', () => {
  const def = getKind('extremum2d');
  it('type = "extremum2d"', () => expect(def.type).toBe('extremum2d'));
  it('validate ok cho max', () => {
    expect(() => def.validate?.({ functionId: 'f1', interval: { min: -5, max: 5 }, mode: 'max' })).not.toThrow();
  });
  it('validate throw mode invalid', () => {
    expect(() => def.validate?.({ functionId: 'f1', interval: { min: 0, max: 1 }, mode: 'foo' } as never)).toThrow();
  });
  it('validate throw interval min >= max', () => {
    expect(() => def.validate?.({ functionId: 'f1', interval: { min: 5, max: 5 }, mode: 'min' })).toThrow();
  });
  it('dependsOn → [functionId]', () => {
    expect(def.dependsOn({ functionId: 'f1', interval: { min: 0, max: 1 }, mode: 'min' })).toEqual(['f1']);
  });
});
```

- [ ] **Step 2: Verify fail.**

- [ ] **Step 3: Implement**

```ts
// src/core/scene/kinds/extremum2d.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';
import { scanExtrema } from '../expressions/evaluator';
import { compile } from '../expressions/parser';

export interface Extremum2DAttrs {
  functionId: string;
  interval: { min: number; max: number };
  mode: 'max' | 'min';
}

const def: KindDef<Extremum2DAttrs> = {
  type: 'extremum2d',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    if (!a || typeof a.functionId !== 'string' || !a.functionId) {
      throw new Error('extremum2d: functionId bắt buộc');
    }
    if (!a.interval || a.interval.min >= a.interval.max) {
      throw new Error('extremum2d: interval min phải < max');
    }
    if (a.mode !== 'max' && a.mode !== 'min') {
      throw new Error('extremum2d: mode phải là "max" hoặc "min"');
    }
  },
  dependsOn: (a) => [a.functionId],
  describe: (obj) => `${obj.attrs.mode === 'max' ? 'Cực đại' : 'Cực tiểu'} của ${obj.attrs.functionId} trong [${obj.attrs.interval.min}, ${obj.attrs.interval.max}]`,
  render: (obj, ctx) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const board = ctx.jxg as any;
    // Need expression from function — look up via state if needed.
    // Simplified: use compiled-from-attrs cached in ctx.defaults._functionExpr (renderer populates).
    const expr = (ctx.defaults as { _functionExpr?: Record<string, string> })._functionExpr?.[obj.attrs.functionId];
    if (!expr) return null;
    const fn = compile(expr, (ctx.paramMap ?? {}) as Record<string, number>);
    if (typeof fn !== 'function') return null;
    const extrema = scanExtrema(fn, obj.attrs.interval.min, obj.attrs.interval.max).filter((e) => e.type === obj.attrs.mode);
    return extrema.map((e) => board.create('point', [e.x, e.y], {
      name: obj.label,
      size: 3,
      fillColor: '#dc2626',
      strokeColor: '#dc2626',
      withLabel: obj.label !== '',
    }));
  },
};

registerKind(def);
```

> **Note**: `ctx.defaults._functionExpr` map sẽ được JxgRenderer populate ở Task G.2.x. Đây là dependency cross-PR — không bị fail vì kind validate/dependsOn không cần expr.

- [ ] **Step 4-5: Verify pass + Commit.**

```bash
git add src/core/scene/kinds/extremum2d.ts src/core/scene/kinds/__tests__/extremum2d.test.ts
git commit -m "feat(scene/kinds): extremum2d (max/min trong interval)"
```

### Task G.1.12: kind `root2d`

**Files:**
- Create: `src/core/scene/kinds/root2d.ts`
- Test: `src/core/scene/kinds/__tests__/root2d.test.ts`

- [ ] **Step 1: Test (tương tự extremum2d)**

```ts
import { getKind } from '../../registry';
import '../root2d';

describe('kind root2d', () => {
  const def = getKind('root2d');
  it('type = "root2d"', () => expect(def.type).toBe('root2d'));
  it('validate ok', () => {
    expect(() => def.validate?.({ functionId: 'f1', interval: { min: -5, max: 5 } })).not.toThrow();
  });
  it('validate throw interval invalid', () => {
    expect(() => def.validate?.({ functionId: 'f1', interval: { min: 1, max: 1 } })).toThrow();
  });
  it('dependsOn → [functionId]', () => {
    expect(def.dependsOn({ functionId: 'f1', interval: { min: 0, max: 1 } })).toEqual(['f1']);
  });
});
```

- [ ] **Step 2: Verify fail.**

- [ ] **Step 3: Implement**

```ts
// src/core/scene/kinds/root2d.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';
import { scanRoots } from '../expressions/evaluator';
import { compile } from '../expressions/parser';

export interface Root2DAttrs {
  functionId: string;
  interval: { min: number; max: number };
}

const def: KindDef<Root2DAttrs> = {
  type: 'root2d',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    if (!a || typeof a.functionId !== 'string' || !a.functionId) {
      throw new Error('root2d: functionId bắt buộc');
    }
    if (!a.interval || a.interval.min >= a.interval.max) {
      throw new Error('root2d: interval min phải < max');
    }
  },
  dependsOn: (a) => [a.functionId],
  describe: (obj) => `Nghiệm của ${obj.attrs.functionId} trong [${obj.attrs.interval.min}, ${obj.attrs.interval.max}]`,
  render: (obj, ctx) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const board = ctx.jxg as any;
    const expr = (ctx.defaults as { _functionExpr?: Record<string, string> })._functionExpr?.[obj.attrs.functionId];
    if (!expr) return null;
    const fn = compile(expr, (ctx.paramMap ?? {}) as Record<string, number>);
    if (typeof fn !== 'function') return null;
    const roots = scanRoots(fn, obj.attrs.interval.min, obj.attrs.interval.max);
    return roots.map((x) => board.create('point', [x, 0], {
      name: obj.label,
      size: 3,
      fillColor: '#dc2626',
      strokeColor: '#dc2626',
      withLabel: obj.label !== '',
    }));
  },
};

registerKind(def);
```

- [ ] **Step 4-5: Verify pass + Commit.**

```bash
git add src/core/scene/kinds/root2d.ts src/core/scene/kinds/__tests__/root2d.test.ts
git commit -m "feat(scene/kinds): root2d (zero trong interval)"
```

### Task G.1.13: kind `slope2d`

**Files:**
- Create: `src/core/scene/kinds/slope2d.ts`
- Test: `src/core/scene/kinds/__tests__/slope2d.test.ts`

- [ ] **Step 1: Test**

```ts
import { getKind } from '../../registry';
import '../slope2d';

describe('kind slope2d', () => {
  const def = getKind('slope2d');
  it('type = "slope2d"', () => expect(def.type).toBe('slope2d'));
  it('validate ok', () => {
    expect(() => def.validate?.({ pointId: 'p1' })).not.toThrow();
  });
  it('dependsOn → [pointId]', () => {
    expect(def.dependsOn({ pointId: 'p1' })).toEqual(['p1']);
  });
});
```

- [ ] **Step 2: Verify fail.**

- [ ] **Step 3: Implement**

```ts
// src/core/scene/kinds/slope2d.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';

export interface Slope2DAttrs {
  pointId: string;
}

const def: KindDef<Slope2DAttrs> = {
  type: 'slope2d',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    if (!a || typeof a.pointId !== 'string' || !a.pointId) {
      throw new Error('slope2d: pointId bắt buộc');
    }
  },
  dependsOn: (a) => [a.pointId],
  describe: (obj) => `Slope tại ${obj.attrs.pointId}`,
  render: (obj, ctx) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const board = ctx.jxg as any;
    const pt = ctx.resolveRef(obj.attrs.pointId);
    if (!pt) return null;
    return board.create('slopetriangle', [pt], {
      name: obj.label,
      withLabel: true,
      fillColor: '#9333ea',
      fillOpacity: 0.3,
    });
  },
};

registerKind(def);
```

- [ ] **Step 4-5: Verify pass + Commit.**

```bash
git add src/core/scene/kinds/slope2d.ts src/core/scene/kinds/__tests__/slope2d.test.ts
git commit -m "feat(scene/kinds): slope2d (slope triangle)"
```

### Task G.1.14: Register kinds + kindMeta

**Files:**
- Modify: `src/core/scene/kinds/index.ts`
- Modify: `src/core/scene/ui/kindMeta.ts`
- Modify: `src/core/scene/ui/__tests__/kindMeta.test.ts`

- [ ] **Step 1: Sửa `kinds/index.ts`**

Đọc file rồi thêm 7 imports cuối barrel:
```ts
import './function2d';
import './parameter';
import './pointOnCurve';
import './tangent2d';
import './extremum2d';
import './root2d';
import './slope2d';
```

- [ ] **Step 2: Sửa `kindMeta.ts`**

Read `src/core/scene/ui/kindMeta.ts`. Thêm 7 entries vào `KIND_UI_META`:
```ts
function2d:   { displayName: 'Hàm số',           icon: 'ƒ' },
parameter:    { displayName: 'Tham số',          icon: 'α' },
pointOnCurve: { displayName: 'Điểm trên đồ thị', icon: '◉' },
tangent2d:    { displayName: 'Tiếp tuyến',       icon: '╱' },
extremum2d:   { displayName: 'Cực trị',          icon: '∧' },
root2d:       { displayName: 'Nghiệm',           icon: '0' },
slope2d:      { displayName: 'Hệ số góc',        icon: '△' },
```

- [ ] **Step 3: Update kindMeta test**

Read `src/core/scene/ui/__tests__/kindMeta.test.ts`. Sửa array `kinds` trong test "has entries for all N registered kinds" để thêm 7 kinds mới (`function2d`, `parameter`, `pointOnCurve`, `tangent2d`, `extremum2d`, `root2d`, `slope2d`). Update count (19 → 26).

- [ ] **Step 4: Verify**

Run:
```bash
npx jest src/core/scene/kinds
npx jest src/core/scene/ui/__tests__/kindMeta.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/scene/kinds/index.ts src/core/scene/ui/kindMeta.ts src/core/scene/ui/__tests__/kindMeta.test.ts
git commit -m "feat(scene/kinds): register 7 graph kinds + UI metadata"
```

### Task G.1.15: PR G.1 final verify + push

- [ ] **Step 1: Full test suite + typecheck + build**

Run (riêng từng cái để bắt lỗi rõ ràng):
```bash
npm run typecheck
npm test
npm run build
```

Expected: tất cả PASS.

- [ ] **Step 2: Push branch + open PR**

```bash
git push -u origin feat/graph-2d-v2-kinds
gh pr create --title "feat(graph-2d): rebuild kinds + expressions (PR G.1/5)" --body "$(cat <<'EOF'
## Summary
- Xoá toàn bộ `src/stamps/graph-2d/` (rebuild theo Scene v2).
- Thêm `core/scene/expressions/` (parser + evaluator + derivative) pure module.
- Thêm 7 kind mới: function2d, parameter, pointOnCurve, tangent2d, extremum2d, root2d, slope2d.
- Extend `State.meta.domain` thêm 'graph2d' + optional `view`.
- Extend `RenderCtx.paramMap` optional cho graph2d.
- `kindMeta` cover 7 kinds mới.

## Test plan
- [x] `npm run typecheck`
- [x] `npm test`
- [x] `npm run build`
- [ ] PR G.2 wire JxgRenderer cases (next).
EOF
)"
```

---

## PR G.2 — JxgRenderer cases cho graph kinds

**Branch:** `feat/graph-2d-v2-renderer` (sau khi G.1 merge vào main)

### Task G.2.0: Setup branch

- [ ] **Step 1: Tạo branch**

```bash
git checkout main
git pull
git checkout -b feat/graph-2d-v2-renderer
```

### Task G.2.1: JxgRenderer compute paramMap + function expr map

**Files:**
- Modify: `src/core/scene/render/JxgRenderer.ts`
- Test: `src/core/scene/render/__tests__/JxgRenderer.graph.test.ts`

- [ ] **Step 1: Viết failing integration test**

Create `src/core/scene/render/__tests__/JxgRenderer.graph.test.ts`:
```ts
import { JxgRenderer } from '../JxgRenderer';
import { createStore } from '../../store';
import { createEmptyState } from '../../types';
import '../../kinds';

describe('JxgRenderer + graph kinds', () => {
  function mockBoard() {
    const created: { type: string; args: unknown[]; opts: unknown }[] = [];
    return {
      created,
      create: jest.fn((type: string, args: unknown[], opts: unknown) => {
        created.push({ type, args, opts });
        return { _type: type, _args: args, removeObject: jest.fn() };
      }),
      removeObject: jest.fn(),
    };
  }

  it('ADD function2d → board.create("functiongraph", ...)', () => {
    const store = createStore(createEmptyState('graph2d'));
    const board = mockBoard();
    new JxgRenderer(store, board);
    store.dispatch({
      type: 'ADD',
      payload: {
        obj: {
          id: 'f1', kind: 'function2d', label: 'f',
          visible: true, locked: false, layer: 'default', schemaVersion: 1,
          attrs: { expression: 'x^2', color: '#2563eb', visible: true },
        },
      },
    });
    const calls = board.created.filter((c) => c.type === 'functiongraph');
    expect(calls.length).toBe(1);
  });

  it('UPDATE_ATTRS parameter.value → re-render dependent function', () => {
    const store = createStore(createEmptyState('graph2d'));
    const board = mockBoard();
    new JxgRenderer(store, board);
    store.dispatch({
      type: 'ADD',
      payload: {
        obj: { id: 'a', kind: 'parameter', label: 'a', visible: true, locked: false, layer: 'default', schemaVersion: 1, attrs: { value: 1, min: -5, max: 5, step: 0.1 } },
      },
    });
    store.dispatch({
      type: 'ADD',
      payload: {
        obj: { id: 'f1', kind: 'function2d', label: 'f', visible: true, locked: false, layer: 'default', schemaVersion: 1, attrs: { expression: 'a*x', color: '#2563eb', visible: true } },
      },
    });
    const beforeCount = board.created.filter((c) => c.type === 'functiongraph').length;
    store.dispatch({ type: 'UPDATE_ATTRS', payload: { id: 'a', patch: { value: 2 } } });
    const afterCount = board.created.filter((c) => c.type === 'functiongraph').length;
    expect(afterCount).toBeGreaterThan(beforeCount);   // re-render
  });

  it('ADD pointOnCurve → board.create("glider", ...)', () => {
    const store = createStore(createEmptyState('graph2d'));
    const board = mockBoard();
    new JxgRenderer(store, board);
    store.dispatch({
      type: 'ADD',
      payload: {
        obj: { id: 'f1', kind: 'function2d', label: 'f', visible: true, locked: false, layer: 'default', schemaVersion: 1, attrs: { expression: 'x^2', color: '#000', visible: true } },
      },
    });
    store.dispatch({
      type: 'ADD',
      payload: {
        obj: { id: 'P', kind: 'pointOnCurve', label: 'P', visible: true, locked: false, layer: 'default', schemaVersion: 1, attrs: { functionId: 'f1', x: 1 } },
      },
    });
    const calls = board.created.filter((c) => c.type === 'glider');
    expect(calls.length).toBe(1);
  });
});
```

- [ ] **Step 2: Verify fail**

Run: `npx jest src/core/scene/render/__tests__/JxgRenderer.graph.test.ts`
Expected: FAIL — JxgRenderer chưa rebuild paramMap.

- [ ] **Step 3: Sửa JxgRenderer**

Read `src/core/scene/render/JxgRenderer.ts` xong update:

1. Thêm field private:
```ts
private paramMap: Readonly<Record<string, number>> = {};
private functionExpr: Readonly<Record<string, string>> = {};
private parameterDependents = new Set<string>();  // function IDs phụ thuộc bất kỳ param
```

2. Trong `applyDiff`, trước khi diff objects, rebuild `paramMap` + `functionExpr` nếu domain='graph2d':
```ts
private rebuildGraphMaps(state: State): void {
  if (state.meta.domain !== 'graph2d') return;
  const params: Record<string, number> = {};
  const fns: Record<string, string> = {};
  for (const id of state.order) {
    const obj = state.objects[id];
    if (obj.kind === 'parameter') {
      params[obj.label] = (obj.attrs as { value: number }).value;
    } else if (obj.kind === 'function2d') {
      fns[obj.id] = (obj.attrs as { expression: string }).expression;
    }
  }
  this.paramMap = params;
  this.functionExpr = fns;
}
```

3. Update `ctx()` method để include paramMap + functionExpr:
```ts
private ctx(): RenderCtx {
  return {
    jxg: this.board,
    resolveRef: (id) => { /* existing */ },
    defaults: { theme: this.theme, _functionExpr: this.functionExpr },
    paramMap: this.paramMap,
  };
}
```

4. Trong `applyDiff` (sau diff bình thường), nếu domain='graph2d' và có parameter UPDATE_ATTRS:
   - Tìm functions phụ thuộc parameter đó (qua collectFreeVars).
   - Force re-render bằng cách remove + create.

Pseudocode cho parameter dependency:
```ts
private applyDiff(prev: State | undefined, next: State): void {
  this.rebuildGraphMaps(next);
  // ... existing diff for objects ...

  if (next.meta.domain === 'graph2d' && prev) {
    // Detect parameter changes
    const changedParams = new Set<string>();
    for (const id of next.order) {
      const cur = next.objects[id];
      const old = prev.objects[id];
      if (cur.kind === 'parameter' && old?.kind === 'parameter') {
        if ((cur.attrs as { value: number }).value !== (old.attrs as { value: number }).value) {
          changedParams.add(cur.label);
        }
      }
    }
    if (changedParams.size > 0) {
      // Re-render functions whose expressions reference these params
      for (const id of next.order) {
        const obj = next.objects[id];
        if (obj.kind !== 'function2d') continue;
        const expr = (obj.attrs as { expression: string }).expression;
        const refs = require('../expressions/parser').collectFreeVars(expr);
        if ((refs as string[]).some((r: string) => changedParams.has(r))) {
          this.remove(id);
          this.create(obj);
        }
      }
    }
  }
}
```

(Lưu ý: dùng `import` thường không phải `require`. Adapt syntax cho ESM.)

- [ ] **Step 4: Verify pass**

Run: `npx jest src/core/scene/render/__tests__/JxgRenderer.graph.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify không regress geometry-2d/3d tests**

Run:
```bash
npx jest src/core/scene
```

Expected: tất cả PASS.

- [ ] **Step 6: Commit**

```bash
git add src/core/scene/render/JxgRenderer.ts src/core/scene/render/__tests__/JxgRenderer.graph.test.ts
git commit -m "feat(scene/render): JxgRenderer paramMap + function-deps re-render (graph2d)"
```

### Task G.2.2: PR G.2 final verify + push

- [ ] **Step 1: Full check**

```bash
npm run typecheck
npm test
npm run build
```

- [ ] **Step 2: Push + PR**

```bash
git push -u origin feat/graph-2d-v2-renderer
gh pr create --title "feat(graph-2d): JxgRenderer cases cho graph kinds (PR G.2/5)" --body "$(cat <<'EOF'
## Summary
- JxgRenderer rebuild paramMap + functionExpr cho meta.domain='graph2d'.
- Parameter UPDATE_ATTRS → invalidate dependent function2d (re-render).
- Integration test mock JSXGraph cover ADD function2d / parameter / pointOnCurve.

## Test plan
- [x] `npx jest src/core/scene/render`
- [x] `npm test`
- [x] `npm run build`
EOF
)"
```

---

## PR G.3 — MiniBoard + useToolStateMachine + handlers

**Branch:** `feat/graph-2d-v2-miniboard` (sau khi G.2 merge)

### Task G.3.0: Setup branch + folder skeleton

- [ ] **Step 1: Tạo branch + folder**

```bash
git checkout main
git pull
git checkout -b feat/graph-2d-v2-miniboard
mkdir -p src/stamps/graph-2d/editor src/stamps/graph-2d/__tests__ src/stamps/graph-2d/editor/__tests__ src/stamps/graph-2d/editor/rows
```

### Task G.3.1: `tools.ts`

**Files:**
- Create: `src/stamps/graph-2d/editor/tools.ts`
- Test: `src/stamps/graph-2d/editor/__tests__/tools.test.ts`

- [ ] **Step 1: Test**

```ts
// src/stamps/graph-2d/editor/__tests__/tools.test.ts
import { TOOLS, GROUPS, type GraphTool } from '../tools';

describe('graph-2d tools', () => {
  it('exposes 12 tools', () => {
    expect(TOOLS.length).toBe(12);
  });
  it('all tools have group + label + title', () => {
    for (const t of TOOLS) {
      expect(t.id).toBeTruthy();
      expect(t.label).toBeTruthy();
      expect(t.title).toBeTruthy();
      expect(t.group).toBeTruthy();
    }
  });
  it('default tool is move', () => {
    const first: GraphTool = TOOLS[0].id;
    expect(first).toBe('move');
  });
  it('groups defined', () => {
    expect(GROUPS).toEqual(expect.arrayContaining(['basic', 'function', 'analysis', 'draw']));
  });
});
```

- [ ] **Step 2: Verify fail.**

- [ ] **Step 3: Implement**

```ts
// src/stamps/graph-2d/editor/tools.ts
export type GraphTool =
  | 'move'
  | 'point'
  | 'slider'
  | 'pointOnCurve'
  | 'intersect'
  | 'tangent'
  | 'slope'
  | 'extremum'
  | 'root'
  | 'segment'
  | 'line'
  | 'polygon';

export type GraphToolGroup = 'basic' | 'function' | 'analysis' | 'draw';

export interface ToolDef {
  id: GraphTool;
  label: string;
  title: string;
  group: GraphToolGroup;
  shortcut?: string;
}

export const GROUPS: GraphToolGroup[] = ['basic', 'function', 'analysis', 'draw'];

export const GROUP_LABELS: Record<GraphToolGroup, string> = {
  basic:    'Cơ bản',
  function: 'Hàm',
  analysis: 'Phân tích',
  draw:     'Vẽ',
};

export const TOOLS: ToolDef[] = [
  { id: 'move',          label: 'Di chuyển',  title: 'Di chuyển / chọn',  group: 'basic',    shortcut: 'S' },
  { id: 'point',         label: 'Điểm',       title: 'Tạo điểm tự do',     group: 'basic',    shortcut: 'P' },
  { id: 'slider',        label: 'Slider',     title: 'Tạo tham số',        group: 'basic',    shortcut: 'B' },
  { id: 'pointOnCurve',  label: 'Điểm trên đồ thị', title: 'Tạo điểm trên hàm số', group: 'function', shortcut: 'O' },
  { id: 'intersect',     label: 'Giao điểm',  title: 'Giao 2 đồ thị',      group: 'function', shortcut: 'I' },
  { id: 'tangent',       label: 'Tiếp tuyến', title: 'Tiếp tuyến tại điểm', group: 'function', shortcut: 'T' },
  { id: 'slope',         label: 'Hệ số góc',  title: 'Slope triangle',      group: 'function', shortcut: 'K' },
  { id: 'extremum',      label: 'Cực trị',    title: 'Tìm cực trị trong khoảng', group: 'analysis', shortcut: 'E' },
  { id: 'root',          label: 'Nghiệm',     title: 'Tìm nghiệm trong khoảng',  group: 'analysis', shortcut: 'R' },
  { id: 'segment',       label: 'Đoạn thẳng', title: 'Vẽ đoạn thẳng',      group: 'draw',     shortcut: 'M' },
  { id: 'line',          label: 'Đường thẳng', title: 'Vẽ đường thẳng',    group: 'draw',     shortcut: 'L' },
  { id: 'polygon',       label: 'Đa giác',    title: 'Vẽ đa giác',         group: 'draw',     shortcut: 'Y' },
];
```

- [ ] **Step 4-5: Verify + Commit.**

```bash
git add src/stamps/graph-2d/editor/tools.ts src/stamps/graph-2d/editor/__tests__/tools.test.ts
git commit -m "feat(graph-2d): tools.ts với 12 tool (4 group)"
```

### Task G.3.2: `theme.ts`

**Files:**
- Create: `src/stamps/graph-2d/editor/theme.ts`

- [ ] **Step 1: Implement (no test — pure constant)**

```ts
// src/stamps/graph-2d/editor/theme.ts
import type { Theme2D } from '../../../core/scene/render/types2d';
import { DEFAULT_THEME_2D } from '../../../core/scene/render/types2d';

export const GRAPH_THEME_LIGHT: Theme2D = {
  ...DEFAULT_THEME_2D,
};

export const GRAPH_THEME_DARK: Theme2D = {
  ...DEFAULT_THEME_2D,
  // override sang dark nếu cần
};

export function paletteFor(isDark: boolean): Theme2D {
  return isDark ? GRAPH_THEME_DARK : GRAPH_THEME_LIGHT;
}

export const FUNCTION_COLORS = [
  '#2563eb', '#dc2626', '#16a34a', '#9333ea',
  '#ea580c', '#0891b2', '#db2777', '#65a30d',
] as const;

export const FUNCTION_NAMES = ['f', 'g', 'h', 'i', 'j', 'k', 'l', 'm'] as const;
export const PARAMETER_NAMES = ['a', 'b', 'c', 'd', 'k', 't', 'm', 'n'] as const;
```

> Nếu `core/scene/render/types2d` chưa export `Theme2D`, đọc file đó và adapt imports.

- [ ] **Step 2: Commit**

```bash
git add src/stamps/graph-2d/editor/theme.ts
git commit -m "feat(graph-2d): theme.ts (palette light/dark + naming)"
```

### Task G.3.3: `useToolStateMachine.ts`

**Files:**
- Create: `src/stamps/graph-2d/editor/useToolStateMachine.ts`
- Test: `src/stamps/graph-2d/editor/__tests__/useToolStateMachine.test.ts`

- [ ] **Step 1: Test**

```ts
// src/stamps/graph-2d/editor/__tests__/useToolStateMachine.test.ts
import { renderHook, act } from '@testing-library/react';
import { useToolStateMachine } from '../useToolStateMachine';

describe('useToolStateMachine', () => {
  it('default tool = move', () => {
    const { result } = renderHook(() => useToolStateMachine('move'));
    expect(result.current.tool).toBe('move');
    expect(result.current.pendingIds).toEqual([]);
  });
  it('setTool clears pendingIds', () => {
    const { result } = renderHook(() => useToolStateMachine('move'));
    act(() => result.current.pushPending('p1'));
    expect(result.current.pendingIds).toEqual(['p1']);
    act(() => result.current.setTool('intersect'));
    expect(result.current.pendingIds).toEqual([]);
    expect(result.current.tool).toBe('intersect');
  });
  it('pushPending accumulates', () => {
    const { result } = renderHook(() => useToolStateMachine('intersect'));
    act(() => result.current.pushPending('a'));
    act(() => result.current.pushPending('b'));
    expect(result.current.pendingIds).toEqual(['a', 'b']);
  });
  it('clearPending resets', () => {
    const { result } = renderHook(() => useToolStateMachine('intersect'));
    act(() => result.current.pushPending('a'));
    act(() => result.current.clearPending());
    expect(result.current.pendingIds).toEqual([]);
  });
});
```

- [ ] **Step 2: Verify fail.**

- [ ] **Step 3: Implement** (copy pattern từ geometry-2d):

```ts
// src/stamps/graph-2d/editor/useToolStateMachine.ts
import { useCallback, useRef, useState } from 'react';
import type { GraphTool } from './tools';

export type ToolStateMachine = {
  tool: GraphTool;
  pendingIds: string[];
  toolRef: { readonly current: GraphTool };
  pendingIdsRef: { readonly current: string[] };
  setTool: (t: GraphTool) => void;
  pushPending: (id: string) => void;
  clearPending: () => void;
};

export function useToolStateMachine(initial: GraphTool = 'move'): ToolStateMachine {
  const [tool, setToolState] = useState<GraphTool>(initial);
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const toolRef = useRef<GraphTool>(initial);
  const pendingIdsRef = useRef<string[]>([]);

  const setTool = useCallback((t: GraphTool) => {
    toolRef.current = t;
    pendingIdsRef.current = [];
    setToolState(t);
    setPendingIds([]);
  }, []);

  const pushPending = useCallback((id: string) => {
    pendingIdsRef.current = [...pendingIdsRef.current, id];
    setPendingIds(pendingIdsRef.current);
  }, []);

  const clearPending = useCallback(() => {
    pendingIdsRef.current = [];
    setPendingIds([]);
  }, []);

  return { tool, pendingIds, toolRef, pendingIdsRef, setTool, pushPending, clearPending };
}
```

- [ ] **Step 4-5: Verify + Commit.**

```bash
git add src/stamps/graph-2d/editor/useToolStateMachine.ts src/stamps/graph-2d/editor/__tests__/useToolStateMachine.test.ts
git commit -m "feat(graph-2d): useToolStateMachine (12 tool pending picks)"
```

### Task G.3.4: `handlers.ts` — pointer routing per tool

**Files:**
- Create: `src/stamps/graph-2d/editor/handlers.ts`
- Test: `src/stamps/graph-2d/editor/__tests__/handlers.test.ts`

- [ ] **Step 1: Test với mock store + board**

```ts
// src/stamps/graph-2d/editor/__tests__/handlers.test.ts
import { handleDown, type HandlerCtx } from '../handlers';
import { createStore } from '../../../../core/scene/store';
import { createEmptyState } from '../../../../core/scene/types';
import '../../../../core/scene/kinds';

function makeCtx(tool: HandlerCtx['toolRef']['current']): HandlerCtx {
  const store = createStore(createEmptyState('graph2d'));
  return {
    store,
    toolRef:        { current: tool },
    pendingIdsRef:  { current: [] },
    pushPending:    jest.fn(),
    clearPending:   jest.fn(),
    setTool:        jest.fn(),
    nextLabel:      (k) => `${k}1`,
    getNearestFunctionId: () => null,
    getHitObjectId: () => null,
  };
}

describe('handleDown', () => {
  it('tool=point click empty → ADD point free', () => {
    const ctx = makeCtx('point');
    handleDown(ctx, { x: 1.5, y: 2.5 });
    const state = ctx.store.getState();
    const objs = Object.values(state.objects);
    expect(objs.length).toBe(1);
    expect(objs[0].kind).toBe('point');
    expect((objs[0].attrs as { x: number }).x).toBeCloseTo(1.5);
  });

  it('tool=pointOnCurve click trên curve → ADD pointOnCurve', () => {
    const ctx = makeCtx('pointOnCurve');
    ctx.getNearestFunctionId = () => 'f1';
    handleDown(ctx, { x: 2, y: 4 });
    const state = ctx.store.getState();
    const objs = Object.values(state.objects);
    expect(objs.length).toBe(1);
    expect(objs[0].kind).toBe('pointOnCurve');
  });

  it('tool=intersect click 2 curves → ADD intersection', () => {
    const ctx = makeCtx('intersect');
    ctx.getNearestFunctionId = () => 'f1';
    handleDown(ctx, { x: 1, y: 1 });
    expect(ctx.pushPending).toHaveBeenCalledWith('f1');
    ctx.pendingIdsRef.current = ['f1'];
    ctx.getNearestFunctionId = () => 'f2';
    handleDown(ctx, { x: 2, y: 2 });
    // Expect intersection added
  });
});
```

- [ ] **Step 2: Verify fail.**

- [ ] **Step 3: Implement**

```ts
// src/stamps/graph-2d/editor/handlers.ts
import type { Store } from '../../../core/scene/store';
import type { GraphTool } from './tools';

export interface HandlerCtx {
  store: Store;
  toolRef: { current: GraphTool };
  pendingIdsRef: { current: string[] };
  pushPending: (id: string) => void;
  clearPending: () => void;
  setTool: (t: GraphTool) => void;
  nextLabel: (kind: string) => string;
  /** Lookup nearest function2d id within hit tolerance. */
  getNearestFunctionId: (coord: { x: number; y: number }) => string | null;
  /** Lookup any object at coord (pointOnCurve, etc.). */
  getHitObjectId: (coord: { x: number; y: number }) => string | null;
}

export interface Coord { x: number; y: number; }

export function handleDown(ctx: HandlerCtx, coord: Coord): void {
  const tool = ctx.toolRef.current;
  switch (tool) {
    case 'move':
      return;
    case 'point':
      addFreePoint(ctx, coord);
      return;
    case 'slider':
      // Opens dialog separately — handled in EditorPanel. Reset tool.
      ctx.setTool('move');
      return;
    case 'pointOnCurve':
      addPointOnCurve(ctx, coord);
      return;
    case 'intersect':
      handleIntersect(ctx, coord);
      return;
    case 'tangent':
      handleTangent(ctx, coord);
      return;
    case 'slope':
      handleSlope(ctx, coord);
      return;
    case 'extremum':
    case 'root':
      handleAnalysisTool(ctx, coord, tool);
      return;
    case 'segment':
    case 'line':
      handleTwoPointTool(ctx, coord, tool);
      return;
    case 'polygon':
      handlePolygonTool(ctx, coord);
      return;
  }
}

function addFreePoint(ctx: HandlerCtx, coord: Coord): void {
  const id = ctx.nextLabel('point');
  ctx.store.dispatch({
    type: 'ADD',
    payload: {
      obj: {
        id, kind: 'point', label: id, visible: true, locked: false,
        layer: 'default', schemaVersion: 1,
        attrs: { constraint: { kind: 'free', x: coord.x, y: coord.y } },
      },
    },
  });
  ctx.setTool('move');
}

function addPointOnCurve(ctx: HandlerCtx, coord: Coord): void {
  const fid = ctx.getNearestFunctionId(coord);
  if (!fid) return;
  const id = ctx.nextLabel('pointOnCurve');
  ctx.store.dispatch({
    type: 'ADD',
    payload: {
      obj: {
        id, kind: 'pointOnCurve', label: id, visible: true, locked: false,
        layer: 'default', schemaVersion: 1,
        attrs: { functionId: fid, x: coord.x },
      },
    },
  });
  ctx.setTool('move');
}

function handleIntersect(ctx: HandlerCtx, coord: Coord): void {
  const fid = ctx.getNearestFunctionId(coord);
  if (!fid) return;
  if (ctx.pendingIdsRef.current.length === 0) {
    ctx.pushPending(fid);
    return;
  }
  const fa = ctx.pendingIdsRef.current[0];
  if (fa === fid) return;
  const id = ctx.nextLabel('intersection');
  ctx.store.dispatch({
    type: 'ADD',
    payload: {
      obj: {
        id, kind: 'intersection', label: id, visible: true, locked: false,
        layer: 'default', schemaVersion: 1,
        attrs: { kind: 'lineLine', ref1: fa, ref2: fid },
      },
    },
  });
  ctx.clearPending();
  ctx.setTool('move');
}

function handleTangent(ctx: HandlerCtx, coord: Coord): void {
  const hitId = ctx.getHitObjectId(coord);
  if (!hitId) return;
  const obj = ctx.store.getState().objects[hitId];
  if (!obj || obj.kind !== 'pointOnCurve') return;
  const id = ctx.nextLabel('tangent2d');
  ctx.store.dispatch({
    type: 'ADD',
    payload: {
      obj: {
        id, kind: 'tangent2d', label: id, visible: true, locked: false,
        layer: 'default', schemaVersion: 1, attrs: { pointId: hitId },
      },
    },
  });
  ctx.setTool('move');
}

function handleSlope(ctx: HandlerCtx, coord: Coord): void {
  const hitId = ctx.getHitObjectId(coord);
  if (!hitId) return;
  const obj = ctx.store.getState().objects[hitId];
  if (!obj || obj.kind !== 'pointOnCurve') return;
  const id = ctx.nextLabel('slope2d');
  ctx.store.dispatch({
    type: 'ADD',
    payload: {
      obj: {
        id, kind: 'slope2d', label: id, visible: true, locked: false,
        layer: 'default', schemaVersion: 1, attrs: { pointId: hitId },
      },
    },
  });
  ctx.setTool('move');
}

function handleAnalysisTool(ctx: HandlerCtx, coord: Coord, tool: 'extremum' | 'root'): void {
  const fid = ctx.getNearestFunctionId(coord);
  if (!fid) return;
  // For MVP: use full visible domain as interval. Future: drag to specify interval.
  // Take default [-10, 10] — UI can override via PropertiesPopover post-creation.
  const id = ctx.nextLabel(tool === 'extremum' ? 'extremum2d' : 'root2d');
  if (tool === 'extremum') {
    ctx.store.dispatch({
      type: 'ADD',
      payload: {
        obj: {
          id, kind: 'extremum2d', label: id, visible: true, locked: false,
          layer: 'default', schemaVersion: 1,
          attrs: { functionId: fid, interval: { min: -10, max: 10 }, mode: 'min' },
        },
      },
    });
  } else {
    ctx.store.dispatch({
      type: 'ADD',
      payload: {
        obj: {
          id, kind: 'root2d', label: id, visible: true, locked: false,
          layer: 'default', schemaVersion: 1,
          attrs: { functionId: fid, interval: { min: -10, max: 10 } },
        },
      },
    });
  }
  ctx.setTool('move');
}

function handleTwoPointTool(ctx: HandlerCtx, coord: Coord, tool: 'segment' | 'line'): void {
  const hitId = ctx.getHitObjectId(coord);
  const pid = hitId ?? (() => {
    // Auto-add free point
    const id = ctx.nextLabel('point');
    ctx.store.dispatch({
      type: 'ADD',
      payload: {
        obj: { id, kind: 'point', label: id, visible: true, locked: false, layer: 'default', schemaVersion: 1, attrs: { constraint: { kind: 'free', x: coord.x, y: coord.y } } },
      },
    });
    return id;
  })();
  if (ctx.pendingIdsRef.current.length === 0) {
    ctx.pushPending(pid);
    return;
  }
  const p1 = ctx.pendingIdsRef.current[0];
  if (p1 === pid) return;
  const id = ctx.nextLabel(tool);
  ctx.store.dispatch({
    type: 'ADD',
    payload: {
      obj: {
        id, kind: tool, label: id, visible: true, locked: false,
        layer: 'default', schemaVersion: 1, attrs: { p1, p2: pid },
      },
    },
  });
  ctx.clearPending();
  ctx.setTool('move');
}

function handlePolygonTool(ctx: HandlerCtx, coord: Coord): void {
  const hitId = ctx.getHitObjectId(coord);
  // Close polygon nếu click vào first pending point
  if (hitId && ctx.pendingIdsRef.current[0] === hitId && ctx.pendingIdsRef.current.length >= 3) {
    const id = ctx.nextLabel('polygon');
    ctx.store.dispatch({
      type: 'ADD',
      payload: {
        obj: {
          id, kind: 'polygon', label: id, visible: true, locked: false,
          layer: 'default', schemaVersion: 1, attrs: { points: [...ctx.pendingIdsRef.current] },
        },
      },
    });
    ctx.clearPending();
    ctx.setTool('move');
    return;
  }
  // Otherwise add point + push pending
  const pid = hitId ?? (() => {
    const id = ctx.nextLabel('point');
    ctx.store.dispatch({
      type: 'ADD',
      payload: {
        obj: { id, kind: 'point', label: id, visible: true, locked: false, layer: 'default', schemaVersion: 1, attrs: { constraint: { kind: 'free', x: coord.x, y: coord.y } } },
      },
    });
    return id;
  })();
  ctx.pushPending(pid);
}
```

- [ ] **Step 4-5: Verify + Commit.**

```bash
git add src/stamps/graph-2d/editor/handlers.ts src/stamps/graph-2d/editor/__tests__/handlers.test.ts
git commit -m "feat(graph-2d): handlers.ts pointer routing 12 tool"
```

### Task G.3.5: `MiniBoard.tsx`

**Files:**
- Create: `src/stamps/graph-2d/editor/MiniBoard.tsx`

- [ ] **Step 1: Implement (copy pattern từ geometry-2d MiniBoard, adapt cho graph2d)**

Read `src/stamps/geometry-2d/editor/MiniBoard.tsx` carefully. Tạo `MiniBoard.tsx` cho graph-2d với những điểm khác:
- `createEmptyState('graph2d')` thay vì `'2d'`
- Init view từ `state.meta.view` (default `[-10, 10]`)
- Add `getNearestFunctionId(coord)` helper dùng JSXGraph hasPoint
- Tools dùng `GRAPH_TOOLS` từ `./tools`
- `subscribe` để emit state changes lên parent

Skeleton:
```tsx
// src/stamps/graph-2d/editor/MiniBoard.tsx
'use client';
import React, { useCallback, useEffect, useId, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { JxgRenderer } from '../../../core/scene/render/JxgRenderer';
import { createEmptyState, listObjects, nextLabel as sceneNextLabel, type State } from '../../../core/scene';
import { useSceneStore } from '../../geometry-2d/editor/useSceneStore';   // reuse hook
import { useToolStateMachine } from './useToolStateMachine';
import { paletteFor } from './theme';
import { handleDown, type HandlerCtx, type Coord } from './handlers';
import { TOOLS, type GraphTool, type ToolDef } from './tools';
import { safeJsx } from '../../shared/safeJsx';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JxgObj = any;

export interface MiniBoardHandle {
  getState: () => State;
  getStore: () => import('../../../core/scene/store').Store;
  setTool: (t: GraphTool) => void;
  getTool: () => GraphTool;
  getShowAxis: () => boolean;
  getShowGrid: () => boolean;
  setShowAxis: (b: boolean) => void;
  setShowGrid: (b: boolean) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  subscribe: (cb: () => void) => () => void;
  highlight: (id: string | null) => void;
  getContainer: () => HTMLDivElement | null;
  getBbox: () => [number, number, number, number];
}

interface MiniBoardProps {
  initialState: State | null;
  isDark?: boolean;
  onReady?: () => void;
  onSelectionChange?: (id: string | undefined) => void;
}

export const MiniBoard = React.forwardRef<MiniBoardHandle, MiniBoardProps>(
  function MiniBoard({ initialState, isDark, onReady, onSelectionChange }, ref) {
    const containerId = useId().replace(/:/g, '_') + '_graph_jxg';
    const containerRef = useRef<HTMLDivElement>(null);
    const boardRef = useRef<JxgObj>(null);
    const rendererRef = useRef<JxgRenderer | null>(null);

    const init = useMemo<State>(
      () => initialState ?? createEmptyState('graph2d'),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [],
    );
    const { store } = useSceneStore(init);
    const toolSM = useToolStateMachine('move');
    const [showAxis, setShowAxis] = useState(init.meta.view?.showAxis ?? true);
    const [showGrid, setShowGrid] = useState(init.meta.view?.showGrid ?? true);

    // Init JSXGraph board
    useEffect(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const JXG = require('jsxgraph');
      const board = JXG.JSXGraph.initBoard(containerId, {
        boundingbox: [-10, 10, 10, -10],
        axis: showAxis,
        grid: showGrid,
        showCopyright: false,
        showNavigation: false,
        zoom: { factorX: 1.1, factorY: 1.1, wheel: true, needShift: false },
        pan: { enabled: true, needShift: false },
        keepAspectRatio: false,
      });
      boardRef.current = board;
      rendererRef.current = new JxgRenderer(store, board, { theme: paletteFor(!!isDark) });

      // Pointer event handlers
      const onDown = (evt: PointerEvent) => {
        const board = boardRef.current;
        if (!board || toolSM.toolRef.current === 'move') return;
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const usrCoord = board.getUsrCoordsOfMouse(evt);
        const ctx: HandlerCtx = {
          store,
          toolRef: toolSM.toolRef,
          pendingIdsRef: toolSM.pendingIdsRef,
          pushPending: toolSM.pushPending,
          clearPending: toolSM.clearPending,
          setTool: toolSM.setTool,
          nextLabel: (kind) => sceneNextLabel(store.getState(), kind),
          getNearestFunctionId: ({ x, y }) => findNearestFunction(board, x, y),
          getHitObjectId: ({ x, y }) => findHitObject(board, x, y, rendererRef.current),
        };
        handleDown(ctx, { x: usrCoord[1], y: usrCoord[2] });
      };
      const el = containerRef.current;
      el?.addEventListener('pointerdown', onDown);
      onReady?.();
      return () => {
        el?.removeEventListener('pointerdown', onDown);
        rendererRef.current?.dispose();
        if (board && JXG.JSXGraph.freeBoard) JXG.JSXGraph.freeBoard(board);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        getState: () => store.getState(),
        getStore: () => store,
        setTool: toolSM.setTool,
        getTool: () => toolSM.toolRef.current,
        getShowAxis: () => showAxis,
        getShowGrid: () => showGrid,
        setShowAxis: (b) => {
          setShowAxis(b);
          store.dispatch({ type: 'UPDATE_VIEW', payload: { patch: { showAxis: b } } });
        },
        setShowGrid: (b) => {
          setShowGrid(b);
          store.dispatch({ type: 'UPDATE_VIEW', payload: { patch: { showGrid: b } } });
        },
        undo: () => store.undo(),
        redo: () => store.redo(),
        canUndo: () => store.canUndo(),
        canRedo: () => store.canRedo(),
        subscribe: (cb) => store.subscribe(() => cb()),
        highlight: (id) => rendererRef.current?.highlight(id),
        getContainer: () => containerRef.current,
        getBbox: () => boardRef.current?.getBoundingBox() ?? [-10, 10, 10, -10],
      }),
      [store, toolSM, showAxis, showGrid],
    );

    return <div ref={containerRef} id={containerId} className="h-full w-full" data-testid="graph-miniboard" />;
  },
);

function findNearestFunction(board: JxgObj, x: number, y: number): string | null {
  // Iterate board.objects; check functiongraph elements; compute y(x); return scene id (stored via name).
  // Simplified placeholder — implementation reads from JxgRenderer.elements map via getStore lookup.
  // For MVP: return first function2d object id within vertical tolerance.
  return null; // implementation in next task
}

function findHitObject(board: JxgObj, x: number, y: number, renderer: JxgRenderer | null): string | null {
  return null; // implementation in next task
}
```

> **Note**: `findNearestFunction` / `findHitObject` cần access vào `renderer.elements` map (scene id → JxgObj). Vì map private, có thể extend `JxgRenderer` với public method `getElement(id)` hoặc `nearestObjectId(coord, kindFilter)` ở task tiếp theo. Đối với plan: PR G.3.6 thêm method, PR G.3.7 wire vào MiniBoard.

- [ ] **Step 2: Commit (build có thể warn nhưng không fail)**

```bash
git add src/stamps/graph-2d/editor/MiniBoard.tsx
git commit -m "feat(graph-2d): MiniBoard skeleton (JxgRenderer wire + pointer events)"
```

### Task G.3.6: JxgRenderer expose helpers cho hit-test

**Files:**
- Modify: `src/core/scene/render/JxgRenderer.ts`
- Test: `src/core/scene/render/__tests__/JxgRenderer.hitTest.test.ts`

- [ ] **Step 1: Test**

```ts
// src/core/scene/render/__tests__/JxgRenderer.hitTest.test.ts
import { JxgRenderer } from '../JxgRenderer';
import { createStore } from '../../store';
import { createEmptyState } from '../../types';
import '../../kinds';

describe('JxgRenderer hit-test helpers', () => {
  function mockBoard() {
    return {
      created: [] as { type: string }[],
      create: jest.fn((type: string) => {
        const el = { _type: type, hasPoint: () => false };
        return el;
      }),
      removeObject: jest.fn(),
    };
  }
  it('getElement returns scene-rendered element', () => {
    const store = createStore(createEmptyState('graph2d'));
    const board = mockBoard();
    const r = new JxgRenderer(store, board);
    store.dispatch({
      type: 'ADD',
      payload: {
        obj: { id: 'f1', kind: 'function2d', label: 'f', visible: true, locked: false, layer: 'default', schemaVersion: 1, attrs: { expression: 'x', color: '#000', visible: true } },
      },
    });
    expect(r.getElement('f1')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Verify fail.**

- [ ] **Step 3: Sửa JxgRenderer**

Add public method:
```ts
getElement(id: string): unknown {
  return this.elements.get(id) ?? null;
}

listElements(): Map<string, unknown> {
  return this.elements;
}
```

- [ ] **Step 4-5: Verify + Commit.**

```bash
git add src/core/scene/render/JxgRenderer.ts src/core/scene/render/__tests__/JxgRenderer.hitTest.test.ts
git commit -m "feat(scene/render): JxgRenderer.getElement + listElements (hit-test support)"
```

### Task G.3.7: MiniBoard wire findNearestFunction + findHitObject

**Files:**
- Modify: `src/stamps/graph-2d/editor/MiniBoard.tsx`

- [ ] **Step 1: Implement helpers (no separate test — covered ở G.4 integration)**

Replace placeholder functions với real impl:
```ts
function findNearestFunction(
  board: JxgObj,
  store: Store,
  renderer: JxgRenderer | null,
  x: number,
  y: number,
  tolY = 0.5,
): string | null {
  if (!renderer) return null;
  const state = store.getState();
  let bestId: string | null = null;
  let bestDist = Infinity;
  for (const id of state.order) {
    const obj = state.objects[id];
    if (obj.kind !== 'function2d') continue;
    const el = renderer.getElement(id) as { Y?: (x: number) => number } | null;
    if (!el || typeof el.Y !== 'function') continue;
    const fy = el.Y(x);
    if (!Number.isFinite(fy)) continue;
    const d = Math.abs(y - fy);
    if (d < tolY && d < bestDist) {
      bestDist = d;
      bestId = id;
    }
  }
  return bestId;
}

function findHitObject(
  board: JxgObj,
  store: Store,
  renderer: JxgRenderer | null,
  x: number,
  y: number,
): string | null {
  if (!renderer) return null;
  // pointOnCurve / point / etc. — use JSXGraph hasPoint
  const screen = board.create('point', [x, y], { visible: false });
  for (const [id, el] of renderer.listElements().entries()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const e = el as any;
    if (e?.hasPoint?.(screen.X(), screen.Y())) {
      board.removeObject(screen);
      return id;
    }
  }
  board.removeObject(screen);
  return null;
}
```

Update import của Store + JxgRenderer ở đầu file.

- [ ] **Step 2: Wire helpers vào onDown handler ctx**

Trong `onDown`:
```ts
getNearestFunctionId: ({ x, y }) => findNearestFunction(board, store, rendererRef.current, x, y),
getHitObjectId:      ({ x, y }) => findHitObject(board, store, rendererRef.current, x, y),
```

- [ ] **Step 3: Verify typecheck**

```bash
npm run typecheck
```

- [ ] **Step 4: Commit**

```bash
git add src/stamps/graph-2d/editor/MiniBoard.tsx
git commit -m "feat(graph-2d): MiniBoard findNearestFunction + findHitObject"
```

### Task G.3.8: PR G.3 final verify + push

- [ ] **Step 1: Full check**

```bash
npm run typecheck
npm test
npm run build
```

- [ ] **Step 2: Push + PR**

```bash
git push -u origin feat/graph-2d-v2-miniboard
gh pr create --title "feat(graph-2d): MiniBoard + tool state machine + handlers (PR G.3/5)" --body "..."
```

---

## PR G.4 — EditorPanel + LeftPanel + per-kind rows

**Branch:** `feat/graph-2d-v2-editor`

### Task G.4.0: Setup branch

```bash
git checkout main && git pull && git checkout -b feat/graph-2d-v2-editor
```

### Task G.4.1: Extend `ObjectListPanel` với `renderRow` optional

**Files:**
- Modify: `src/core/scene/ui/ObjectListPanel.tsx`
- Modify: `src/core/scene/ui/__tests__/ObjectListPanel.test.tsx`

- [ ] **Step 1: Add failing test**

Append vào `ObjectListPanel.test.tsx`:
```tsx
import { render, fireEvent } from '@testing-library/react';
import React from 'react';
import { ObjectListPanel } from '../ObjectListPanel';
import { createStore } from '../../store';
import { createEmptyState } from '../../types';
import '../../kinds';

describe('ObjectListPanel.renderRow', () => {
  function setup() {
    const store = createStore(createEmptyState('graph2d'));
    store.dispatch({
      type: 'ADD',
      payload: {
        obj: { id: 'f1', kind: 'function2d', label: 'f', visible: true, locked: false, layer: 'default', schemaVersion: 1, attrs: { expression: 'x^2', color: '#000', visible: true } },
      },
    });
    return store;
  }
  it('renderRow override default row', () => {
    const store = setup();
    const renderRow = jest.fn((obj) => (
      <div key={obj.id} data-testid={`custom-row-${obj.id}`}>{obj.label}</div>
    ));
    const { getByTestId, queryByTestId } = render(
      <ObjectListPanel store={store} renderRow={renderRow} />
    );
    expect(getByTestId('custom-row-f1')).toBeInTheDocument();
    expect(queryByTestId('object-row-f1')).toBeNull();
    expect(renderRow).toHaveBeenCalled();
  });
  it('default row khi renderRow undefined', () => {
    const store = setup();
    const { getByTestId } = render(<ObjectListPanel store={store} />);
    expect(getByTestId('object-row-f1')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Verify fail.**

- [ ] **Step 3: Sửa ObjectListPanel**

Read file. Update props interface + render:
```tsx
import type { SceneObject } from '../types';

export interface ObjectListPanelProps {
  store: Store;
  selectedId?: string;
  onSelect?: (id: string) => void;
  renderRow?: (
    obj: SceneObject,
    defaults: { selected: boolean; onClick: () => void },
  ) => React.ReactNode;
}

// In render:
{objects.map((obj) => {
  const selected = obj.id === selectedId;
  const onClick = () => onSelect?.(obj.id);
  if (renderRow) {
    return <React.Fragment key={obj.id}>{renderRow(obj, { selected, onClick })}</React.Fragment>;
  }
  return <ObjectRow key={obj.id} obj={obj} selected={selected} onClick={onClick} />;
})}
```

- [ ] **Step 4-5: Verify + Commit.**

```bash
git add src/core/scene/ui/ObjectListPanel.tsx src/core/scene/ui/__tests__/ObjectListPanel.test.tsx
git commit -m "feat(scene/ui): ObjectListPanel renderRow optional prop"
```

### Task G.4.2: `FunctionRow.tsx`

**Files:**
- Create: `src/stamps/graph-2d/editor/rows/FunctionRow.tsx`
- Test: `src/stamps/graph-2d/editor/rows/__tests__/FunctionRow.test.tsx`

- [ ] **Step 1: Test**

```tsx
// src/stamps/graph-2d/editor/rows/__tests__/FunctionRow.test.tsx
import { render, fireEvent, act } from '@testing-library/react';
import { FunctionRow } from '../FunctionRow';
import { createStore } from '../../../../core/scene/store';
import { createEmptyState } from '../../../../core/scene/types';
import '../../../../core/scene/kinds';

function makeStore() {
  const store = createStore(createEmptyState('graph2d'));
  store.dispatch({
    type: 'ADD',
    payload: {
      obj: { id: 'f1', kind: 'function2d', label: 'f', visible: true, locked: false, layer: 'default', schemaVersion: 1, attrs: { expression: 'x^2', color: '#2563eb', visible: true } },
    },
  });
  return store;
}

describe('FunctionRow', () => {
  it('renders expression in input', () => {
    const store = makeStore();
    const obj = store.getState().objects.f1;
    const { getByDisplayValue } = render(
      <FunctionRow obj={obj as never} store={store} selected={false} onClick={() => {}} />
    );
    expect(getByDisplayValue('x^2')).toBeInTheDocument();
  });

  it('Enter dispatches UPDATE_ATTRS', () => {
    const store = makeStore();
    const obj = store.getState().objects.f1;
    const { getByDisplayValue } = render(
      <FunctionRow obj={obj as never} store={store} selected={false} onClick={() => {}} />
    );
    const input = getByDisplayValue('x^2');
    fireEvent.change(input, { target: { value: 'x^3' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect((store.getState().objects.f1.attrs as { expression: string }).expression).toBe('x^3');
  });

  it('invalid expression → border red, no dispatch', () => {
    const store = makeStore();
    const obj = store.getState().objects.f1;
    const { getByDisplayValue, getByTestId } = render(
      <FunctionRow obj={obj as never} store={store} selected={false} onClick={() => {}} />
    );
    const input = getByDisplayValue('x^2');
    fireEvent.change(input, { target: { value: 'x +' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect((store.getState().objects.f1.attrs as { expression: string }).expression).toBe('x^2');
    expect(getByTestId('function-row-error-f1')).toBeInTheDocument();
  });

  it('toggle visibility', () => {
    const store = makeStore();
    const obj = store.getState().objects.f1;
    const { getByTestId } = render(
      <FunctionRow obj={obj as never} store={store} selected={false} onClick={() => {}} />
    );
    fireEvent.click(getByTestId('function-row-visibility-f1'));
    expect((store.getState().objects.f1.attrs as { visible: boolean }).visible).toBe(false);
  });
});
```

- [ ] **Step 2: Verify fail.**

- [ ] **Step 3: Implement**

```tsx
// src/stamps/graph-2d/editor/rows/FunctionRow.tsx
'use client';
import React, { useCallback, useState } from 'react';
import type { Store } from '../../../../core/scene/store';
import type { SceneObject } from '../../../../core/scene/types';
import { validate } from '../../../../core/scene/expressions/parser';
import type { Function2DAttrs } from '../../../../core/scene/kinds/function2d';

interface Props {
  obj: SceneObject<Function2DAttrs>;
  store: Store;
  selected: boolean;
  onClick: () => void;
}

export function FunctionRow({ obj, store, selected, onClick }: Props): React.ReactElement {
  const [local, setLocal] = useState(obj.attrs.expression);
  const [error, setError] = useState<string | null>(null);

  const commit = useCallback((value: string) => {
    const v = validate(value);
    if (!v.ok) { setError(v.error); return; }
    setError(null);
    store.dispatch({ type: 'UPDATE_ATTRS', payload: { id: obj.id, patch: { expression: value } } });
  }, [obj.id, store]);

  const toggleVisibility = useCallback(() => {
    store.dispatch({ type: 'UPDATE_ATTRS', payload: { id: obj.id, patch: { visible: !obj.attrs.visible } } });
  }, [obj.id, obj.attrs.visible, store]);

  return (
    <div
      onClick={onClick}
      aria-selected={selected}
      role="option"
      data-testid={`object-row-${obj.id}`}
      className={`flex items-center gap-1.5 px-2 py-1.5 text-xs ${selected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
    >
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); toggleVisibility(); }}
        data-testid={`function-row-visibility-${obj.id}`}
        className="h-4 w-4 shrink-0"
        title={obj.attrs.visible ? 'Ẩn' : 'Hiện'}
      >
        {obj.attrs.visible ? '👁' : '✕'}
      </button>
      <span
        className="h-3 w-3 shrink-0 rounded-full"
        style={{ backgroundColor: obj.attrs.color }}
      />
      <span className="font-mono text-slate-700">{obj.label}(x) =</span>
      <input
        type="text"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(local); }}
        onBlur={() => commit(local)}
        className={`min-w-0 flex-1 rounded border px-1.5 py-0.5 font-mono text-xs outline-none focus:ring-1 ${error ? 'border-red-500 focus:ring-red-300' : 'border-slate-300 focus:ring-blue-300'}`}
        data-testid={`function-row-input-${obj.id}`}
      />
      {error && (
        <span
          data-testid={`function-row-error-${obj.id}`}
          className="text-[10px] text-red-600"
          title={error}
        >⚠</span>
      )}
    </div>
  );
}
```

- [ ] **Step 4-5: Verify + Commit.**

```bash
git add src/stamps/graph-2d/editor/rows/FunctionRow.tsx src/stamps/graph-2d/editor/rows/__tests__/FunctionRow.test.tsx
git commit -m "feat(graph-2d): FunctionRow inline expression editor"
```

### Task G.4.3: `ParameterRow.tsx`

**Files:**
- Create: `src/stamps/graph-2d/editor/rows/ParameterRow.tsx`
- Test: `src/stamps/graph-2d/editor/rows/__tests__/ParameterRow.test.tsx`

- [ ] **Step 1: Test**

```tsx
import { render, fireEvent } from '@testing-library/react';
import { ParameterRow } from '../ParameterRow';
import { createStore } from '../../../../core/scene/store';
import { createEmptyState } from '../../../../core/scene/types';
import '../../../../core/scene/kinds';

function makeStore() {
  const store = createStore(createEmptyState('graph2d'));
  store.dispatch({
    type: 'ADD',
    payload: {
      obj: { id: 'a', kind: 'parameter', label: 'a', visible: true, locked: false, layer: 'default', schemaVersion: 1, attrs: { value: 1, min: -5, max: 5, step: 0.1 } },
    },
  });
  return store;
}

describe('ParameterRow', () => {
  it('renders slider with current value', () => {
    const store = makeStore();
    const obj = store.getState().objects.a;
    const { getByDisplayValue, getByText } = render(
      <ParameterRow obj={obj as never} store={store} selected={false} onClick={() => {}} />
    );
    expect(getByDisplayValue('1')).toBeInTheDocument();
    expect(getByText(/a/)).toBeInTheDocument();
  });

  it('slider drag dispatches UPDATE_ATTRS', () => {
    const store = makeStore();
    const obj = store.getState().objects.a;
    const { getByTestId } = render(
      <ParameterRow obj={obj as never} store={store} selected={false} onClick={() => {}} />
    );
    const slider = getByTestId('parameter-row-slider-a');
    fireEvent.change(slider, { target: { value: '2.5' } });
    expect((store.getState().objects.a.attrs as { value: number }).value).toBeCloseTo(2.5);
  });
});
```

- [ ] **Step 2: Verify fail.**

- [ ] **Step 3: Implement**

```tsx
// src/stamps/graph-2d/editor/rows/ParameterRow.tsx
'use client';
import React, { useCallback } from 'react';
import type { Store } from '../../../../core/scene/store';
import type { SceneObject } from '../../../../core/scene/types';
import type { ParameterAttrs } from '../../../../core/scene/kinds/parameter';

interface Props {
  obj: SceneObject<ParameterAttrs>;
  store: Store;
  selected: boolean;
  onClick: () => void;
}

export function ParameterRow({ obj, store, selected, onClick }: Props): React.ReactElement {
  const onChange = useCallback((value: number) => {
    store.dispatch({ type: 'UPDATE_ATTRS', payload: { id: obj.id, patch: { value } } });
  }, [obj.id, store]);

  const { value, min, max, step } = obj.attrs;
  return (
    <div
      onClick={onClick}
      aria-selected={selected}
      role="option"
      data-testid={`object-row-${obj.id}`}
      className={`flex items-center gap-1.5 px-2 py-1.5 text-xs ${selected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
    >
      <span className="font-mono text-slate-700 w-12">{obj.label} =</span>
      <input
        type="text"
        value={value.toFixed(2)}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (Number.isFinite(v)) onChange(v);
        }}
        className="w-14 rounded border border-slate-300 px-1 py-0.5 font-mono text-xs"
        data-testid={`parameter-row-input-${obj.id}`}
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1"
        data-testid={`parameter-row-slider-${obj.id}`}
      />
    </div>
  );
}
```

- [ ] **Step 4-5: Verify + Commit.**

```bash
git add src/stamps/graph-2d/editor/rows/ParameterRow.tsx src/stamps/graph-2d/editor/rows/__tests__/ParameterRow.test.tsx
git commit -m "feat(graph-2d): ParameterRow inline slider"
```

### Task G.4.4: `LeftPanel.tsx`

**Files:**
- Create: `src/stamps/graph-2d/editor/LeftPanel.tsx`
- Test: `src/stamps/graph-2d/editor/__tests__/LeftPanel.test.tsx`

- [ ] **Step 1: Implement (cấu trúc mirror geometry-2d LeftPanel)**

```tsx
// src/stamps/graph-2d/editor/LeftPanel.tsx
'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { LeftPanelShell } from '../../../core/scene/ui/LeftPanelShell';
import { ObjectListPanel } from '../../../core/scene/ui/ObjectListPanel';
import type { Store } from '../../../core/scene/store';
import type { SceneObject } from '../../../core/scene/types';
import { TOOLS, GROUPS, GROUP_LABELS, type GraphTool } from './tools';
import { FunctionRow } from './rows/FunctionRow';
import { ParameterRow } from './rows/ParameterRow';
import type { Function2DAttrs } from '../../../core/scene/kinds/function2d';
import type { ParameterAttrs } from '../../../core/scene/kinds/parameter';

const TABS = [
  { key: 'tools' as const,   label: '🧰 Công cụ',  testId: 'tab-tools' },
  { key: 'objects' as const, label: '📐 Đối tượng', testId: 'tab-objects' },
];

export interface GraphLeftPanelProps {
  activeTool: GraphTool;
  onToolChange: (t: GraphTool) => void;
  showAxis: boolean;
  showGrid: boolean;
  onShowAxisChange: (b: boolean) => void;
  onShowGridChange: (b: boolean) => void;
  onUndo: () => void;
  canUndo: boolean;
  onRedo: () => void;
  canRedo: boolean;
  onClose: () => void;
  isDark?: boolean;
  store?: Store;
  selectedObjectId?: string;
  onObjectSelect?: (id: string) => void;
  /** Mở dialog "Thêm hàm" */
  onAddFunction?: () => void;
  /** Mở dialog "Thêm tham số" */
  onAddParameter?: () => void;
}

function GraphIcon() {
  return <span aria-hidden="true">📈</span>;
}

export function GraphLeftPanel(props: GraphLeftPanelProps): React.ReactElement {
  const { activeTool, onToolChange, showAxis, showGrid, onShowAxisChange, onShowGridChange,
          onUndo, canUndo, onRedo, canRedo, onClose, isDark, store, selectedObjectId,
          onObjectSelect, onAddFunction, onAddParameter } = props;
  const [tab, setTab] = useState<'tools' | 'objects'>('tools');
  const hasStore = !!store;
  useEffect(() => { if (!hasStore && tab === 'objects') setTab('tools'); }, [hasStore, tab]);

  const grouped = useMemo(() => {
    const acc: Record<string, typeof TOOLS> = {};
    for (const t of TOOLS) (acc[t.group] ??= []).push(t);
    return acc;
  }, []);

  const renderRow = useMemo(() => (
    obj: SceneObject,
    defaults: { selected: boolean; onClick: () => void },
  ) => {
    if (obj.kind === 'function2d') {
      return <FunctionRow obj={obj as SceneObject<Function2DAttrs>} store={store!} {...defaults} />;
    }
    if (obj.kind === 'parameter') {
      return <ParameterRow obj={obj as SceneObject<ParameterAttrs>} store={store!} {...defaults} />;
    }
    return null; // fallback default ObjectRow handled by ObjectListPanel
  }, [store]);

  return (
    <LeftPanelShell
      title="Đồ thị 2D"
      icon={<GraphIcon />}
      onClose={onClose}
      isDark={isDark}
      testId="stamp-left-panel"
      tabs={hasStore ? TABS : undefined}
      activeTab={hasStore ? tab : undefined}
      onTabChange={hasStore ? setTab : undefined}
    >
      {(!hasStore || tab === 'tools') ? (
        <div className="flex flex-col gap-3 p-3 text-xs">
          <div className="flex items-center gap-2">
            <label><input type="checkbox" checked={showAxis} onChange={(e) => onShowAxisChange(e.target.checked)} /> Trục</label>
            <label><input type="checkbox" checked={showGrid} onChange={(e) => onShowGridChange(e.target.checked)} /> Lưới</label>
            <button onClick={onUndo} disabled={!canUndo} className="ml-auto">↶</button>
            <button onClick={onRedo} disabled={!canRedo}>↷</button>
          </div>
          <div className="flex gap-2">
            <button onClick={onAddFunction} className="rounded bg-blue-600 px-2 py-1 text-white text-[11px]">+ Hàm</button>
            <button onClick={onAddParameter} className="rounded bg-slate-600 px-2 py-1 text-white text-[11px]">+ Tham số</button>
          </div>
          {GROUPS.map((g) => (
            <div key={g}>
              <div className="text-[10px] font-semibold uppercase text-slate-500">{GROUP_LABELS[g]}</div>
              <div className="mt-1 grid grid-cols-2 gap-1">
                {(grouped[g] ?? []).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onToolChange(t.id)}
                    title={t.title}
                    data-testid={`tool-${t.id}`}
                    className={`rounded border px-1.5 py-1 text-[11px] ${activeTool === t.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <ObjectListPanel
          store={store!}
          selectedId={selectedObjectId}
          onSelect={onObjectSelect}
          renderRow={renderRow}
        />
      )}
    </LeftPanelShell>
  );
}
```

- [ ] **Step 2: Test smoke**

```tsx
// src/stamps/graph-2d/editor/__tests__/LeftPanel.test.tsx
import { render, fireEvent } from '@testing-library/react';
import { GraphLeftPanel } from '../LeftPanel';

describe('GraphLeftPanel', () => {
  function defaultProps() {
    return {
      activeTool: 'move' as const,
      onToolChange: jest.fn(),
      showAxis: true, showGrid: true,
      onShowAxisChange: jest.fn(), onShowGridChange: jest.fn(),
      onUndo: jest.fn(), canUndo: false,
      onRedo: jest.fn(), canRedo: false,
      onClose: jest.fn(),
    };
  }
  it('shows 12 tools', () => {
    const { getAllByTestId } = render(<GraphLeftPanel {...defaultProps()} />);
    // expect tools listed
    expect(getAllByTestId(/^tool-/).length).toBe(12);
  });
  it('click tool calls onToolChange', () => {
    const props = defaultProps();
    const { getByTestId } = render(<GraphLeftPanel {...props} />);
    fireEvent.click(getByTestId('tool-point'));
    expect(props.onToolChange).toHaveBeenCalledWith('point');
  });
});
```

- [ ] **Step 3-4: Verify + Commit.**

```bash
git add src/stamps/graph-2d/editor/LeftPanel.tsx src/stamps/graph-2d/editor/__tests__/LeftPanel.test.tsx
git commit -m "feat(graph-2d): LeftPanel với tab Công cụ/Đối tượng"
```

### Task G.4.5: `EditorPanel.tsx` orchestrator

**Files:**
- Create: `src/stamps/graph-2d/editor/EditorPanel.tsx`
- Test: `src/stamps/graph-2d/editor/__tests__/EditorPanel.test.tsx`

- [ ] **Step 1: Implement (orchestrator)**

```tsx
// src/stamps/graph-2d/editor/EditorPanel.tsx
'use client';
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { MiniBoard, type MiniBoardHandle } from './MiniBoard';
import { GraphLeftPanel } from './LeftPanel';
import type { GraphTool } from './tools';
import type { State } from '../../../core/scene';
import type { Store } from '../../../core/scene/store';
import { stringifySceneState } from '../serialize';
import { renderGraphSvgFromState } from '../render';

export interface GraphEditorState {
  tool: GraphTool;
  showAxis: boolean;
  showGrid: boolean;
  canUndo: boolean;
  canRedo: boolean;
}

export interface GraphEditorPanelHandle {
  insert: () => boolean;
  hasContent: () => boolean;
  selectObject: (id: string) => void;
  undo: () => void;
  redo: () => void;
  setShowAxis: (b: boolean) => void;
  setShowGrid: (b: boolean) => void;
}

interface Props {
  initialState: State | null;
  onInsert: (sceneJson: string, svgString: string) => void;
  onClose: () => void;
  isDark?: boolean;
  isMobile?: boolean;
  onStoreReady?: (store: Store) => void;
  onSelectionChange?: (id: string | undefined) => void;
  onStateChange?: (s: GraphEditorState) => void;
}

export const GraphEditorPanel = forwardRef<GraphEditorPanelHandle, Props>(
  function GraphEditorPanel(
    { initialState, onInsert, onClose, isDark, onStoreReady, onSelectionChange, onStateChange },
    ref,
  ) {
    const miniRef = useRef<MiniBoardHandle | null>(null);
    const [tool, setTool] = useState<GraphTool>('move');
    const [showAxis, setShowAxis] = useState(true);
    const [showGrid, setShowGrid] = useState(true);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);
    const [selectedObjectId, setSelectedObjectId] = useState<string | undefined>();

    const emit = useCallback(() => {
      const h = miniRef.current;
      if (!h) return;
      setTool(h.getTool());
      setShowAxis(h.getShowAxis());
      setShowGrid(h.getShowGrid());
      setCanUndo(h.canUndo());
      setCanRedo(h.canRedo());
      onStateChange?.({
        tool: h.getTool(), showAxis: h.getShowAxis(), showGrid: h.getShowGrid(),
        canUndo: h.canUndo(), canRedo: h.canRedo(),
      });
    }, [onStateChange]);

    useEffect(() => {
      const h = miniRef.current;
      if (!h) return;
      const unsub = h.subscribe(emit);
      onStoreReady?.(h.getStore());
      emit();
      return unsub;
    }, [emit, onStoreReady]);

    useImperativeHandle(ref, () => ({
      insert: () => {
        const h = miniRef.current;
        if (!h) return false;
        const state = h.getState();
        if (Object.keys(state.objects).length === 0) return false;
        const sceneJson = stringifySceneState(state);
        renderGraphSvgFromState(state, !!isDark)
          .then((svg) => onInsert(sceneJson, svg))
          .catch((err) => console.error('graph-2d insert SVG fail:', err));
        return true;
      },
      hasContent: () => {
        const h = miniRef.current;
        return !!h && Object.keys(h.getState().objects).length > 0;
      },
      selectObject: (id) => {
        setSelectedObjectId(id);
        miniRef.current?.highlight(id);
      },
      undo: () => miniRef.current?.undo(),
      redo: () => miniRef.current?.redo(),
      setShowAxis: (b) => miniRef.current?.setShowAxis(b),
      setShowGrid: (b) => miniRef.current?.setShowGrid(b),
    }), [isDark, onInsert]);

    const handleAddFunction = useCallback(() => {
      const h = miniRef.current;
      if (!h) return;
      const store = h.getStore();
      const id = `f${Object.values(store.getState().objects).filter((o) => o.kind === 'function2d').length + 1}`;
      store.dispatch({
        type: 'ADD',
        payload: {
          obj: { id, kind: 'function2d', label: id, visible: true, locked: false, layer: 'default', schemaVersion: 1, attrs: { expression: 'x', color: '#2563eb', visible: true } },
        },
      });
    }, []);

    const handleAddParameter = useCallback(() => {
      const h = miniRef.current;
      if (!h) return;
      const store = h.getStore();
      const id = `a${Object.values(store.getState().objects).filter((o) => o.kind === 'parameter').length + 1}`;
      store.dispatch({
        type: 'ADD',
        payload: {
          obj: { id, kind: 'parameter', label: id, visible: true, locked: false, layer: 'default', schemaVersion: 1, attrs: { value: 1, min: -5, max: 5, step: 0.1 } },
        },
      });
    }, []);

    return (
      <div className="flex h-full w-full">
        <GraphLeftPanel
          activeTool={tool}
          onToolChange={(t) => miniRef.current?.setTool(t)}
          showAxis={showAxis}
          showGrid={showGrid}
          onShowAxisChange={(b) => miniRef.current?.setShowAxis(b)}
          onShowGridChange={(b) => miniRef.current?.setShowGrid(b)}
          onUndo={() => miniRef.current?.undo()}
          canUndo={canUndo}
          onRedo={() => miniRef.current?.redo()}
          canRedo={canRedo}
          onClose={onClose}
          isDark={isDark}
          store={miniRef.current?.getStore()}
          selectedObjectId={selectedObjectId}
          onObjectSelect={(id) => {
            setSelectedObjectId(id);
            miniRef.current?.highlight(id);
            onSelectionChange?.(id);
          }}
          onAddFunction={handleAddFunction}
          onAddParameter={handleAddParameter}
        />
        <div className="flex-1">
          <MiniBoard
            ref={miniRef}
            initialState={initialState}
            isDark={isDark}
            onReady={emit}
            onSelectionChange={(id) => {
              setSelectedObjectId(id);
              onSelectionChange?.(id);
            }}
          />
        </div>
      </div>
    );
  },
);
```

- [ ] **Step 2: Smoke test**

```tsx
// src/stamps/graph-2d/editor/__tests__/EditorPanel.test.tsx
// jest.mock('jsxgraph', () => ({ JSXGraph: { initBoard: () => ({ getBoundingBox: () => [-10,10,10,-10] }) } }));
// Note: integration test for EditorPanel deferred to G.5 — này smoke render shell only.
import { render } from '@testing-library/react';
import { GraphEditorPanel } from '../EditorPanel';

jest.mock('jsxgraph', () => ({
  JSXGraph: {
    initBoard: () => ({
      getBoundingBox: () => [-10, 10, 10, -10],
      create: () => ({ removeObject: jest.fn() }),
      removeObject: jest.fn(),
      getUsrCoordsOfMouse: () => [0, 0, 0],
    }),
    freeBoard: jest.fn(),
  },
}));

describe('GraphEditorPanel smoke', () => {
  it('renders LeftPanel + MiniBoard', () => {
    const { getByTestId } = render(
      <GraphEditorPanel initialState={null} onInsert={() => {}} onClose={() => {}} />
    );
    expect(getByTestId('stamp-left-panel')).toBeInTheDocument();
    expect(getByTestId('graph-miniboard')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3-4: Verify + Commit.**

```bash
git add src/stamps/graph-2d/editor/EditorPanel.tsx src/stamps/graph-2d/editor/__tests__/EditorPanel.test.tsx
git commit -m "feat(graph-2d): EditorPanel orchestrator + add function/parameter buttons"
```

### Task G.4.6: `serialize.ts` + `render.ts`

**Files:**
- Create: `src/stamps/graph-2d/serialize.ts`
- Create: `src/stamps/graph-2d/render.ts`
- Test: `src/stamps/graph-2d/__tests__/serialize.test.ts`

- [ ] **Step 1: Test serialize**

```ts
// src/stamps/graph-2d/__tests__/serialize.test.ts
import { stringifySceneState, parseSceneState } from '../serialize';
import { createEmptyState } from '../../../core/scene/types';

describe('graph-2d/serialize', () => {
  it('roundtrip empty state', () => {
    const s = createEmptyState('graph2d');
    const json = stringifySceneState(s);
    const parsed = parseSceneState(json);
    expect(parsed?.meta.domain).toBe('graph2d');
  });
  it('parseSceneState returns null on garbage', () => {
    expect(parseSceneState('{}')).toBeNull();
    expect(parseSceneState('not json')).toBeNull();
  });
});
```

- [ ] **Step 2: Verify fail.**

- [ ] **Step 3: Implement**

```ts
// src/stamps/graph-2d/serialize.ts
import type { State } from '../../core/scene/types';

export function stringifySceneState(state: State): string {
  return JSON.stringify(state);
}

export function parseSceneState(json: string): State | null {
  try {
    const raw = JSON.parse(json);
    if (!raw || typeof raw !== 'object') return null;
    if (raw.meta?.domain !== 'graph2d') return null;
    if (raw.meta?.version !== 1) return null;
    if (typeof raw.counter !== 'number') return null;
    if (!Array.isArray(raw.order)) return null;
    if (!raw.objects || typeof raw.objects !== 'object') return null;
    return raw as State;
  } catch {
    return null;
  }
}
```

```ts
// src/stamps/graph-2d/render.ts
import type { State } from '../../core/scene/types';
import { createStore } from '../../core/scene/store';
import { JxgRenderer } from '../../core/scene/render/JxgRenderer';

/**
 * Render state thành SVG string một lần. Dùng cho insert/restore.
 * - Tạo offscreen container 600x400.
 * - Mount JSXGraph board.
 * - JxgRenderer subscribe LOAD action → render.
 * - serialize SVG.
 */
export async function renderGraphSvgFromState(
  state: State,
  _isDark: boolean,
  width = 600,
  height = 400,
): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const JXG = require('jsxgraph');
  const div = document.createElement('div');
  div.style.width = `${width}px`;
  div.style.height = `${height}px`;
  div.style.position = 'absolute';
  div.style.left = '-99999px';
  div.id = `__graph2d_offscreen_${Date.now()}`;
  document.body.appendChild(div);

  const view = state.meta.view;
  const board = JXG.JSXGraph.initBoard(div.id, {
    boundingbox: [
      view?.xMin ?? -10,
      view?.yMax ?? 10,
      view?.xMax ?? 10,
      view?.yMin ?? -10,
    ],
    axis: view?.showAxis ?? true,
    grid: view?.showGrid ?? true,
    showCopyright: false,
    showNavigation: false,
  });

  const store = createStore(state);
  const renderer = new JxgRenderer(store, board);
  await new Promise((r) => requestAnimationFrame(() => r(null)));

  const svgEl = div.querySelector('svg');
  const svgString = svgEl ? new XMLSerializer().serializeToString(svgEl) : '';

  renderer.dispose();
  if (JXG.JSXGraph.freeBoard) JXG.JSXGraph.freeBoard(board);
  document.body.removeChild(div);

  return svgString;
}
```

- [ ] **Step 4-5: Verify + Commit.**

```bash
git add src/stamps/graph-2d/serialize.ts src/stamps/graph-2d/render.ts src/stamps/graph-2d/__tests__/serialize.test.ts
git commit -m "feat(graph-2d): serialize + render (offscreen SVG export)"
```

### Task G.4.7: PR G.4 final verify + push

- [ ] **Step 1: Full check**

```bash
npm run typecheck
npm test
npm run build
```

- [ ] **Step 2: Push + PR**

```bash
git push -u origin feat/graph-2d-v2-editor
gh pr create --title "feat(graph-2d): EditorPanel + LeftPanel + rows (PR G.4/5)" --body "..."
```

---

## PR G.5 — Host + StampType + registry + e2e

**Branch:** `feat/graph-2d-v2-host`

### Task G.5.0: Setup branch

```bash
git checkout main && git pull && git checkout -b feat/graph-2d-v2-host
```

### Task G.5.1: `types.ts`

**Files:**
- Create: `src/stamps/graph-2d/types.ts`

- [ ] **Step 1: Implement**

```ts
// src/stamps/graph-2d/types.ts
import type { BaseStampCustomData } from '../shared/types';

export interface Graph2DCustomData extends BaseStampCustomData {
  kind: 'graph2d';
  version: 2;
  sceneJson: string;
  svgWidth: number;
  svgHeight: number;
}

export function isGraph2DCustomData(data: unknown): data is Graph2DCustomData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Partial<Graph2DCustomData>;
  return d.kind === 'graph2d' && d.version === 2 && typeof d.sceneJson === 'string';
}
```

- [ ] **Step 2: Commit**

```bash
git add src/stamps/graph-2d/types.ts
git commit -m "feat(graph-2d): types.ts (Graph2DCustomData v2)"
```

### Task G.5.2: `host.tsx`

**Files:**
- Create: `src/stamps/graph-2d/host.tsx`

- [ ] **Step 1: Implement** (mirror geometry-2d host)

```tsx
// src/stamps/graph-2d/host.tsx
'use client';
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { GraphLeftPanel } from './editor/LeftPanel';
import { GraphEditorPanel, type GraphEditorPanelHandle, type GraphEditorState } from './editor/EditorPanel';
import { insertStampImage } from '../shared/insertImage';
import { parseSceneState } from './serialize';
import type { State } from '../../core/scene';
import type { Store } from '../../core/scene/store';
import type { StampHostProps, StampHostHandle } from '../shared/types';
import { useIsMobile } from '../shared/useIsMobile';
import { isGraph2DCustomData, type Graph2DCustomData } from './types';

const INITIAL: GraphEditorState = {
  tool: 'move', showAxis: true, showGrid: true, canUndo: false, canRedo: false,
};

export const Graph2DStampHost = forwardRef<StampHostHandle, StampHostProps>(
  function Graph2DStampHost({ api, editingElement, onClose, isDark }, ref) {
    const panelRef = useRef<GraphEditorPanelHandle | null>(null);
    const [editorState, setEditorState] = useState<GraphEditorState>(INITIAL);
    const [store, setStore] = useState<Store | null>(null);
    const [selectedObjectId, setSelectedObjectId] = useState<string | undefined>();
    const { isMobile } = useIsMobile();

    const initialState = useMemo<State | null>(() => {
      if (!editingElement) return null;
      if (!isGraph2DCustomData(editingElement.customData)) return null;
      return parseSceneState(editingElement.customData.sceneJson);
    }, [editingElement]);

    const handleInsert = useCallback(
      async (sceneJson: string, svgString: string) => {
        if (!api) return;
        try {
          await insertStampImage(api, {
            svgString,
            makeCustomData: (width, height): Graph2DCustomData => ({
              kind: 'graph2d', version: 2, sceneJson, svgWidth: width, svgHeight: height,
            }),
            editingElementId: editingElement?.id ?? null,
          });
        } catch (err) {
          console.error('Graph2D insert failed:', err);
        }
        onClose();
      },
      [api, editingElement?.id, onClose],
    );

    useImperativeHandle(ref, () => ({
      tryInsert: () => panelRef.current?.insert() ?? false,
      hasContent: () => panelRef.current?.hasContent() ?? false,
    }), []);

    return (
      <GraphEditorPanel
        ref={panelRef}
        initialState={initialState}
        onInsert={handleInsert}
        onClose={onClose}
        isDark={isDark}
        isMobile={isMobile}
        onStoreReady={setStore}
        onSelectionChange={setSelectedObjectId}
        onStateChange={setEditorState}
      />
    );
  },
);
```

- [ ] **Step 2: Smoke test** (defer to e2e — host renders via Whiteboard not standalone)

- [ ] **Step 3: Commit**

```bash
git add src/stamps/graph-2d/host.tsx
git commit -m "feat(graph-2d): Host lift store/selection (mirror geometry-2d)"
```

### Task G.5.3: `index.tsx` + StampType + registry wire-up

**Files:**
- Create: `src/stamps/graph-2d/index.tsx`
- Modify: `src/stamps/shared/registry.ts`
- Modify: `src/stamps/index.ts`
- Modify: `src/index.ts`
- Modify: `package.json` (add `./graph-2d` export)
- Test: `src/stamps/graph-2d/__tests__/index.test.tsx`

- [ ] **Step 1: Test**

```tsx
// src/stamps/graph-2d/__tests__/index.test.tsx
import { graph2dStamp, isGraph2DCustomData } from '../index';

describe('graph2dStamp', () => {
  it('kind = "graph2d"', () => {
    expect(graph2dStamp.kind).toBe('graph2d');
  });
  it('matchesCustomData accepts v2', () => {
    expect(graph2dStamp.matchesCustomData({ kind: 'graph2d', version: 2, sceneJson: '{}' })).toBe(true);
  });
  it('matchesCustomData rejects v1', () => {
    expect(graph2dStamp.matchesCustomData({ kind: 'graph2d', version: 1, jsonState: '{}' })).toBe(false);
  });
  it('isGraph2DCustomData guard', () => {
    expect(isGraph2DCustomData({ kind: 'graph2d', version: 2, sceneJson: '{}' })).toBe(true);
    expect(isGraph2DCustomData({ kind: 'graph2d', version: 1 })).toBe(false);
  });
});
```

- [ ] **Step 2: Verify fail.**

- [ ] **Step 3: Implement `index.tsx`**

```tsx
// src/stamps/graph-2d/index.tsx
'use client';
import { Graph2DStampHost } from './host';
import { isGraph2DCustomData, type Graph2DCustomData } from './types';
import { renderGraphSvgFromState } from './render';
import { parseSceneState } from './serialize';
import type { StampType, RestoredStampFile } from '../shared/types';
import { svgToImage } from '../shared/svgToImage';

export { Graph2DCustomData, isGraph2DCustomData };

export const graph2dStamp: StampType = {
  kind: 'graph2d',
  toolbarLabel: '📈',
  toolbarTitle: 'Chèn đồ thị 2D',
  toolbarTestId: 'graph2d-stamp',
  shortcutKey: 'h',
  HostComponent: Graph2DStampHost,
  matchesCustomData: isGraph2DCustomData,
  restoreFileFromCustomData: async (element): Promise<RestoredStampFile | null> => {
    const data = element.customData;
    if (!isGraph2DCustomData(data)) return null;
    const state = parseSceneState(data.sceneJson);
    if (!state) return null;
    const svg = await renderGraphSvgFromState(state, false);
    return svgToImage(svg, data.svgWidth, data.svgHeight);
  },
};
```

- [ ] **Step 4: Wire registry**

Read `src/stamps/shared/registry.ts`. Add lại:
```ts
import { graph2dStamp } from '../graph-2d';
// ...
export { graph2dStamp, type Graph2DCustomData, isGraph2DCustomData } from '../graph-2d';
// ...
export const EXPERIMENTAL_STAMPS: ReadonlyArray<StampType> = Object.freeze([
  geometry3dStamp,
  graph2dStamp,
]);
```

Sửa `src/stamps/index.ts` + `src/index.ts` để re-export.

Sửa `package.json` thêm:
```json
"./graph-2d": {
  "types": "./dist/graph-2d.d.ts",
  "import": "./dist/graph-2d.mjs",
  "require": "./dist/graph-2d.js"
},
```

- [ ] **Step 5: Verify**

```bash
npx jest src/stamps/graph-2d/__tests__/index.test.tsx
npm run typecheck
npm test
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/stamps/graph-2d/index.tsx src/stamps/shared/registry.ts src/stamps/index.ts src/index.ts package.json src/stamps/graph-2d/__tests__/index.test.tsx
git commit -m "feat(graph-2d): StampType + wire vào registry (EXPERIMENTAL)"
```

### Task G.5.4: E2E Playwright smoke

**Files:**
- Create: `e2e/graph-2d.spec.ts`

- [ ] **Step 1: Đọc cấu trúc e2e hiện tại**

```bash
ls e2e/ 2>/dev/null
```

Nếu chưa có folder e2e, check `playwright.config.ts` để tìm test root.

- [ ] **Step 2: Implement test**

```ts
// e2e/graph-2d.spec.ts
import { test, expect } from '@playwright/test';

test('graph-2d stamp full flow', async ({ page }) => {
  await page.goto('http://localhost:5173/');     // playground demo URL
  // open graph2d editor via toolbar
  await page.click('[data-testid="graph2d-stamp"]');
  await expect(page.locator('[data-testid="stamp-left-panel"]')).toBeVisible();

  // add function
  await page.click('button:has-text("+ Hàm")');
  const input = page.locator('[data-testid="function-row-input-f1"]');
  await input.fill('x^2');
  await input.press('Enter');

  // tab Đối tượng shows row
  await page.click('[data-testid="tab-objects"]');
  await expect(page.locator('[data-testid="object-row-f1"]')).toBeVisible();

  // insert
  await page.click('button:has-text("Chèn")');
  // verify image exists (Excalidraw scene)
  await expect(page.locator('canvas')).toBeVisible();
});
```

- [ ] **Step 3: Run**

```bash
npm run test:e2e -- e2e/graph-2d.spec.ts
```

> Nếu e2e infra chưa chạy được, skip — test sẽ chạy ở CI hoặc manual smoke ở step sau.

- [ ] **Step 4: Commit**

```bash
git add e2e/graph-2d.spec.ts
git commit -m "test(e2e): graph-2d full flow smoke"
```

### Task G.5.5: Playground demo + manual verify

**Files:**
- Modify: `scripts/demo/*` (playground)

- [ ] **Step 1: Đọc playground**

```bash
ls scripts/demo/
cat scripts/demo/App.tsx 2>/dev/null || ls scripts/demo/
```

- [ ] **Step 2: Verify graph2dStamp xuất hiện auto via DEFAULT_STAMPS**

Run:
```bash
npm run demo
```

Mở browser tại URL print ra. Verify:

1. Toolbar có 4 stamp: 📐 G, ∑ L, 📐 3, 📈 H.
2. Click 📈 → editor mở.
3. Click "+ Hàm" → row `f(x) = x` xuất hiện trong tab Đối tượng.
4. Sửa input thành `x^2 + a` + Enter → tab Đối tượng vẫn show f1.
5. Click "+ Tham số" → row `a` xuất hiện với slider.
6. Drag slider → curve cập nhật.
7. Click tool "Điểm trên đồ thị" → click trên curve → point xuất hiện.
8. Click "Tiếp tuyến" → click point → tangent line vẽ.
9. Click "Chèn" → editor đóng, ảnh chèn vào board.
10. Double-click ảnh → editor mở lại với cùng state (function + slider).
11. Refresh page → ảnh vẫn còn (restoreFileFromCustomData hoạt động).
12. Ctrl+Z trong editor undo expression change.

Document kết quả manual test (PASS/FAIL ở từng step). Nếu có lỗi nào, fix trước khi tiếp.

- [ ] **Step 3: Commit playground updates nếu có**

### Task G.5.6: Bump version + publish

- [ ] **Step 1: Bump version**

```bash
npm version minor       # 0.14.0 → 0.15.0
```

- [ ] **Step 2: Final full check**

```bash
npm run clean
npm run build
npm test
npm run typecheck
```

Expected: ALL PASS.

- [ ] **Step 3: Push + PR**

```bash
git push --follow-tags origin feat/graph-2d-v2-host
gh pr create --title "feat(graph-2d): Host + registry + e2e + bump 0.15 (PR G.5/5)" --body "$(cat <<'EOF'
## Summary

Final PR cho refactor graph-2d sang Scene v2.

- Tạo `host.tsx` + `index.tsx` + `types.ts` (Graph2DCustomData v2).
- Wire `graph2dStamp` vào `EXPERIMENTAL_STAMPS`.
- Re-export public API.
- E2E Playwright smoke.
- Bump version 0.14.0 → 0.15.0.

## Test plan
- [x] Unit + integration: `npm test`
- [x] Typecheck: `npm run typecheck`
- [x] Build: `npm run build`
- [ ] E2E: `npm run test:e2e`
- [ ] Manual smoke (12 checkpoints).

Closes refactor outlined in `docs/superpowers/specs/2026-05-20-graph-2d-scene-v2-design.md`.
EOF
)"
```

- [ ] **Step 4: Sau khi PR merge — publish npm**

```bash
git checkout main && git pull
npm publish --access public
```

---

## Spec Coverage Check

Quick map từ spec requirements → tasks:

| Spec section | Coverage |
|---|---|
| 2.G1 Xoá `src/stamps/graph-2d/` cũ | G.1.1 |
| 2.G2 Store unified `meta.domain='graph2d'` | G.1.2 |
| 2.G3 7 kinds mới | G.1.7–G.1.13 |
| 2.G4 12 tool palette | G.3.1 |
| 2.G5 useToolStateMachine riêng | G.3.3 |
| 2.G6 Inline expression/slider editing | G.4.2 + G.4.3 |
| 2.G7 JxgRenderer extend | G.2.1 |
| 2.G8 Undo/redo unified | Inherits scene store (no separate task) |
| 2.G9 Persistence v2 | G.4.6 + G.5.1 |
| 2.G10 Mobile LeftPanelShell + MobileToolDrawer | G.4.4 LeftPanel (drawer auto via LeftPanelShell) |
| 4.4 RenderCtx.paramMap | G.1.2 |
| 4.5 Meta.view | G.1.2 + G.1.3 |
| 5.5 Undo cover view | G.1.3 (UPDATE_VIEW in store) |
| 6.2 P3 SVG export | G.4.6 (render.ts) |
| 6.3 Restore reload | G.5.3 (restoreFileFromCustomData) |
| 6.4 Re-edit dblclick | Existing Whiteboard intercept (no graph-2d-specific change) |
| 7. Expression parser | G.1.4 |
| 9. ObjectListPanel renderRow | G.4.1 |
| 10. Mobile UX | LeftPanelShell tự handle (no separate task) |
| 11. Error handling | Embedded in FunctionRow (G.4.2) + parser validate |
| 12. Testing strategy | Tests embedded in mỗi task; e2e ở G.5.4 |
| 13. PR phases | G.1–G.5 |

**Open items đã check ở self-review:**
- Type consistency: `Graph2DCustomData` shape khớp giữa `types.ts` (G.5.1) và `host.tsx` (G.5.2). ✓
- `useSceneStore` reuse từ geometry-2d (path `'../../geometry-2d/editor/useSceneStore'`) — đảm bảo file đó vẫn còn tồn tại sau G.1.1 (chỉ xoá graph-2d, không đụng geometry-2d). ✓
- `RenderCtx.paramMap` được set bởi JxgRenderer (G.2.1) và đọc bởi function2d.render (G.1.7). ✓
- `getElement` / `listElements` exposed bởi G.3.6 và dùng bởi G.3.7 MiniBoard. ✓
- E2E selector `[data-testid="graph2d-stamp"]` khớp `toolbarTestId` trong G.5.3. ✓
- `tool-${id}` selectors khớp button data-testid trong G.4.4 LeftPanel. ✓
- `function-row-input-f1` khớp G.4.2 FunctionRow. ✓
