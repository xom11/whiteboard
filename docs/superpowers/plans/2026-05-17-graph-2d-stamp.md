# Graph 2D Stamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm stamp mới `graph-2d` cho phép học sinh vẽ đồ thị `y = f(x)` (nhiều hàm, tham số động, slider, điểm trên curve, giao điểm, tiếp tuyến) và chèn ảnh SVG vào whiteboard với khả năng re-edit.

**Architecture:** Stamp plugin mới `src/stamps/graph-2d/` mirror pattern `geometry-2d`. Dùng JSXGraph (dep có sẵn) làm engine vẽ, parser/eval expression bằng `new Function` whitelist, React UI: sidebar trái 280px (tool strip dọc + algebra view) + plot area fill. State source-of-truth là `SerializedGraph` JSON. Insert → SVG image stamp với `customData.jsonState` cho re-edit.

**Tech Stack:** TypeScript strict · React 19 · JSXGraph 1.12 · Jest 29 + jsdom + ts-jest · tsup build · Tailwind v4 (consumer). KHÔNG thêm dep mới.

**Spec:** `docs/superpowers/specs/2026-05-17-graph-2d-stamp-design.md`

---

## File map (sẽ tạo)

```
src/stamps/graph-2d/
├── index.tsx                  Task 15 — StampType + Host + customData guard
├── serialize.ts               Task 4
├── render.ts                  Task 6
├── parser.ts                  Task 2, 3
├── colors.ts                  Task 1
├── __tests__/
│   ├── serialize.test.ts      Task 4
│   ├── parser.test.ts         Task 2, 3
│   ├── colors.test.ts         Task 1
│   ├── render.test.ts         Task 6
│   └── index.test.tsx         Task 15
└── editor/
    ├── EditorPanel.tsx        Task 13
    ├── MiniBoard.tsx          Task 11, 14
    ├── LeftPanel.tsx          Task 12
    ├── AlgebraView.tsx        Task 10
    ├── FunctionRow.tsx        Task 8
    ├── SliderRow.tsx          Task 9
    ├── tools.ts               Task 7
    ├── theme.ts               Task 5
    ├── handlers.ts            Task 14
    └── __tests__/
        ├── EditorPanel.test.tsx
        ├── AlgebraView.test.tsx
        ├── FunctionRow.test.tsx
        ├── SliderRow.test.tsx
        └── MiniBoard.test.tsx
```

Modify:
- `src/stamps/shared/registry.ts` — Task 16
- `src/stamps/index.ts` — Task 16

---

## Task 1: Palette + naming constants

**Files:**
- Create: `src/stamps/graph-2d/colors.ts`
- Create: `src/stamps/graph-2d/__tests__/colors.test.ts`

- [ ] **Step 1: Viết failing tests**

```ts
// src/stamps/graph-2d/__tests__/colors.test.ts
import {
  GRAPH_PALETTE,
  FUNCTION_NAMES,
  MAX_FUNCTIONS,
  nextColor,
  nextFunctionName,
} from '../colors';

describe('graph-2d colors', () => {
  it('palette có đúng 8 màu unique', () => {
    expect(GRAPH_PALETTE).toHaveLength(8);
    expect(new Set(GRAPH_PALETTE).size).toBe(8);
  });

  it('FUNCTION_NAMES có 8 ký tự đơn theo alphabet', () => {
    expect(FUNCTION_NAMES).toEqual(['f', 'g', 'h', 'i', 'j', 'k', 'l', 'm']);
  });

  it('MAX_FUNCTIONS = 8', () => {
    expect(MAX_FUNCTIONS).toBe(8);
  });

  it('nextColor trả màu chưa dùng', () => {
    expect(nextColor([])).toBe(GRAPH_PALETTE[0]);
    expect(nextColor([GRAPH_PALETTE[0]])).toBe(GRAPH_PALETTE[1]);
    expect(nextColor([GRAPH_PALETTE[0], GRAPH_PALETTE[1]])).toBe(GRAPH_PALETTE[2]);
  });

  it('nextColor cycle khi đã dùng hết palette', () => {
    expect(nextColor(GRAPH_PALETTE.slice())).toBe(GRAPH_PALETTE[0]);
  });

  it('nextFunctionName trả tên chưa dùng', () => {
    expect(nextFunctionName([])).toBe('f');
    expect(nextFunctionName(['f'])).toBe('g');
    expect(nextFunctionName(['f', 'g'])).toBe('h');
  });
});
```

- [ ] **Step 2: Chạy test để confirm fail**

Run: `npx jest src/stamps/graph-2d/__tests__/colors.test.ts -v`
Expected: FAIL với "Cannot find module '../colors'".

- [ ] **Step 3: Implement `colors.ts`**

```ts
// src/stamps/graph-2d/colors.ts
export const GRAPH_PALETTE = [
  '#2563eb', // blue
  '#dc2626', // red
  '#16a34a', // green
  '#9333ea', // purple
  '#ea580c', // orange
  '#0891b2', // cyan
  '#db2777', // pink
  '#65a30d', // lime
] as const;

export const FUNCTION_NAMES = ['f', 'g', 'h', 'i', 'j', 'k', 'l', 'm'] as const;

export const MAX_FUNCTIONS = 8;
export const MAX_PARAMETERS = 8;

export function nextColor(usedColors: readonly string[]): string {
  for (const c of GRAPH_PALETTE) {
    if (!usedColors.includes(c)) return c;
  }
  return GRAPH_PALETTE[usedColors.length % GRAPH_PALETTE.length];
}

export function nextFunctionName(usedNames: readonly string[]): string {
  for (const n of FUNCTION_NAMES) {
    if (!usedNames.includes(n)) return n;
  }
  return FUNCTION_NAMES[usedNames.length % FUNCTION_NAMES.length];
}
```

- [ ] **Step 4: Chạy test để confirm pass**

Run: `npx jest src/stamps/graph-2d/__tests__/colors.test.ts -v`
Expected: PASS 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/graph-2d/colors.ts src/stamps/graph-2d/__tests__/colors.test.ts
git commit -m "feat(graph-2d): palette + naming constants"
```

---

## Task 2: Parser — validate

**Files:**
- Create: `src/stamps/graph-2d/parser.ts`
- Create: `src/stamps/graph-2d/__tests__/parser.test.ts`

- [ ] **Step 1: Viết failing tests cho `validate`**

```ts
// src/stamps/graph-2d/__tests__/parser.test.ts
import { validate } from '../parser';

describe('parser.validate', () => {
  it('chấp nhận biểu thức cơ bản', () => {
    expect(validate('x').ok).toBe(true);
    expect(validate('x^2').ok).toBe(true);
    expect(validate('x^2 + 2*x - 3').ok).toBe(true);
    expect(validate('sin(x)').ok).toBe(true);
    expect(validate('log(x) + sqrt(x)').ok).toBe(true);
    expect(validate('pi * x').ok).toBe(true);
    expect(validate('e^x').ok).toBe(true);
  });

  it('reject biểu thức rỗng', () => {
    const r = validate('');
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/rỗng/i);
  });

  it('reject ký tự không hợp lệ', () => {
    expect(validate('x = 1').ok).toBe(false);
    expect(validate('x; y').ok).toBe(false);
    expect(validate('x[0]').ok).toBe(false);
    expect(validate("x + '1'").ok).toBe(false);
  });

  it('reject tên hàm lạ', () => {
    const r = validate('tg(x)');
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/tan/);
  });

  it('reject identifier dài > 1 không phải hàm whitelist', () => {
    const r = validate('foo(x)');
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/foo/);
  });

  it('detect free variables (tham số 1 ký tự)', () => {
    expect([...validate('a*x + b').freeVars].sort()).toEqual(['a', 'b']);
    expect([...validate('m * sin(x)').freeVars]).toEqual(['m']);
    expect([...validate('x^2').freeVars]).toEqual([]);
  });

  it('reject grammar lỗi', () => {
    expect(validate('x +').ok).toBe(false);
    expect(validate('(x').ok).toBe(false);
    expect(validate(')').ok).toBe(false);
  });
});
```

- [ ] **Step 2: Chạy test confirm fail**

Run: `npx jest src/stamps/graph-2d/__tests__/parser.test.ts -v`
Expected: FAIL "Cannot find module '../parser'".

- [ ] **Step 3: Implement `parser.ts` validate + rewriteToJs**

```ts
// src/stamps/graph-2d/parser.ts
const ALLOWED_FUNCTIONS = new Set([
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
  'log', 'ln', 'exp', 'sqrt', 'abs',
  'floor', 'ceil', 'round',
]);

const ALLOWED_CHARS = /^[a-zA-Z0-9_.+\-*/^()\s,]+$/;
const IDENTIFIER_RE = /[a-zA-Z][a-zA-Z0-9_]*/g;

const SUGGESTIONS: Record<string, string> = {
  tg: 'tan',
  cotg: 'cos',
  arcsin: 'asin',
  arccos: 'acos',
  arctan: 'atan',
};

export interface ParseResult {
  ok: boolean;
  error?: string;
  freeVars: Set<string>;
}

function errResult(message: string): ParseResult {
  return { ok: false, error: message, freeVars: new Set() };
}

export function validate(expr: string): ParseResult {
  const trimmed = expr.trim();
  if (!trimmed) return errResult('Biểu thức rỗng');
  if (!ALLOWED_CHARS.test(trimmed)) return errResult('Ký tự không hợp lệ');

  const ids = trimmed.match(IDENTIFIER_RE) ?? [];
  const freeVars = new Set<string>();
  for (const id of ids) {
    if (id === 'x' || id === 'pi' || id === 'e') continue;
    if (ALLOWED_FUNCTIONS.has(id)) continue;
    if (id.length === 1) {
      freeVars.add(id);
      continue;
    }
    const hint = SUGGESTIONS[id];
    return errResult(
      hint
        ? `Tên hàm không hợp lệ: "${id}". Bạn có ý là "${hint}" không?`
        : `Tên không hợp lệ: "${id}"`,
    );
  }

  try {
    const paramSubs = Object.fromEntries([...freeVars].map((v) => [v, 1]));
    const rewritten = rewriteToJs(trimmed, paramSubs);
    new Function('x', `return (${rewritten})`);
  } catch {
    return errResult('Lỗi cú pháp');
  }

  return { ok: true, freeVars };
}

const FUNCTION_REPLACEMENTS: Array<[string, string]> = [
  // longest first để tránh substring conflict (asin trước sin)
  ['asin', 'Math.asin'],
  ['acos', 'Math.acos'],
  ['atan', 'Math.atan'],
  ['sqrt', 'Math.sqrt'],
  ['floor', 'Math.floor'],
  ['round', 'Math.round'],
  ['ceil', 'Math.ceil'],
  ['sin', 'Math.sin'],
  ['cos', 'Math.cos'],
  ['tan', 'Math.tan'],
  ['abs', 'Math.abs'],
  ['exp', 'Math.exp'],
  ['log', 'Math.log10'],
  ['ln', 'Math.log'],
];

export function rewriteToJs(
  expr: string,
  params: Record<string, number>,
): string {
  let s = expr.replace(/\^/g, '**');
  s = s.replace(/\bpi\b/g, 'Math.PI');
  s = s.replace(/\be\b/g, 'Math.E');
  for (const [from, to] of FUNCTION_REPLACEMENTS) {
    s = s.replace(new RegExp(`\\b${from}\\b`, 'g'), to);
  }
  for (const [name, value] of Object.entries(params)) {
    if (name.length !== 1) continue;
    s = s.replace(new RegExp(`\\b${name}\\b`, 'g'), `(${value})`);
  }
  return s;
}
```

- [ ] **Step 4: Chạy test confirm pass**

Run: `npx jest src/stamps/graph-2d/__tests__/parser.test.ts -v`
Expected: PASS 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/graph-2d/parser.ts src/stamps/graph-2d/__tests__/parser.test.ts
git commit -m "feat(graph-2d): parser validate + rewriteToJs"
```

---

## Task 3: Parser — compile

**Files:**
- Modify: `src/stamps/graph-2d/parser.ts` (append `compile`)
- Modify: `src/stamps/graph-2d/__tests__/parser.test.ts` (append tests)

- [ ] **Step 1: Viết failing tests cho `compile`**

Append vào `parser.test.ts`:

```ts
import { compile } from '../parser';

describe('parser.compile', () => {
  it('compile expression cơ bản', () => {
    const fn = compile('x^2', {});
    expect(typeof fn).toBe('function');
    expect((fn as (x: number) => number)(3)).toBe(9);
  });

  it('substitute parameters', () => {
    const fn = compile('a*x + b', { a: 2, b: 5 });
    expect((fn as (x: number) => number)(3)).toBe(11);
  });

  it('hàm số học', () => {
    const fn = compile('sin(x)', {}) as (x: number) => number;
    expect(fn(0)).toBeCloseTo(0);
    expect(fn(Math.PI / 2)).toBeCloseTo(1);
  });

  it('hằng pi và e', () => {
    expect((compile('pi', {}) as (x: number) => number)(0)).toBeCloseTo(Math.PI);
    expect((compile('e', {}) as (x: number) => number)(0)).toBeCloseTo(Math.E);
  });

  it('trả NaN khi runtime ném exception', () => {
    const fn = compile('sqrt(x)', {}) as (x: number) => number;
    expect(fn(4)).toBeCloseTo(2);
    expect(Number.isNaN(fn(-1))).toBe(true);
  });

  it('reject expression invalid trả { error }', () => {
    const r = compile('foo(x)', {});
    expect(typeof r).toBe('object');
    expect((r as { error: string }).error).toBeTruthy();
  });

  it('log = log10, ln = log tự nhiên', () => {
    const lg = compile('log(x)', {}) as (x: number) => number;
    const ln = compile('ln(x)', {}) as (x: number) => number;
    expect(lg(100)).toBeCloseTo(2);
    expect(ln(Math.E)).toBeCloseTo(1);
  });
});
```

- [ ] **Step 2: Chạy test confirm fail**

Run: `npx jest src/stamps/graph-2d/__tests__/parser.test.ts -v`
Expected: FAIL với "compile is not exported".

- [ ] **Step 3: Append `compile` vào `parser.ts`**

```ts
export function compile(
  expr: string,
  paramValues: Record<string, number>,
): ((x: number) => number) | { error: string } {
  const v = validate(expr);
  if (!v.ok) return { error: v.error ?? 'Invalid' };
  try {
    const rewritten = rewriteToJs(expr, paramValues);
    const raw = new Function('x', `return (${rewritten})`) as (x: number) => number;
    return (x: number) => {
      try {
        const y = raw(x);
        return typeof y === 'number' ? y : NaN;
      } catch {
        return NaN;
      }
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
```

- [ ] **Step 4: Chạy test confirm pass**

Run: `npx jest src/stamps/graph-2d/__tests__/parser.test.ts -v`
Expected: PASS 14 tests tổng cộng.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/graph-2d/parser.ts src/stamps/graph-2d/__tests__/parser.test.ts
git commit -m "feat(graph-2d): parser compile to JS callable"
```

---

## Task 4: Serialize types + parse/stringify

**Files:**
- Create: `src/stamps/graph-2d/serialize.ts`
- Create: `src/stamps/graph-2d/__tests__/serialize.test.ts`

- [ ] **Step 1: Viết failing tests**

```ts
// src/stamps/graph-2d/__tests__/serialize.test.ts
import {
  EMPTY_GRAPH,
  parseSerializedGraph,
  stringifySerializedGraph,
  type SerializedGraph,
} from '../serialize';

describe('serialize.EMPTY_GRAPH', () => {
  it('có view mặc định [-10, 10] x [-10, 10] với axis+grid', () => {
    expect(EMPTY_GRAPH.version).toBe(1);
    expect(EMPTY_GRAPH.view.xMin).toBe(-10);
    expect(EMPTY_GRAPH.view.xMax).toBe(10);
    expect(EMPTY_GRAPH.view.yMin).toBe(-10);
    expect(EMPTY_GRAPH.view.yMax).toBe(10);
    expect(EMPTY_GRAPH.view.showAxis).toBe(true);
    expect(EMPTY_GRAPH.view.showGrid).toBe(true);
    expect(EMPTY_GRAPH.functions).toEqual([]);
    expect(EMPTY_GRAPH.parameters).toEqual([]);
  });
});

describe('serialize round-trip', () => {
  it('stringify → parse trả về data tương đương', () => {
    const original: SerializedGraph = {
      ...EMPTY_GRAPH,
      functions: [
        { id: 'f1', name: 'f', expression: 'x^2', color: '#2563eb', visible: true },
      ],
      parameters: [{ name: 'a', value: 1, min: -5, max: 5, step: 0.1 }],
    };
    const s = stringifySerializedGraph(original);
    const parsed = parseSerializedGraph(s);
    expect(parsed).toEqual(original);
  });
});

describe('parseSerializedGraph error handling', () => {
  it('JSON corrupt trả null', () => {
    expect(parseSerializedGraph('{not json')).toBeNull();
  });

  it('version mismatch trả null', () => {
    const bad = JSON.stringify({ ...EMPTY_GRAPH, version: 99 });
    expect(parseSerializedGraph(bad)).toBeNull();
  });

  it('thiếu view trả null', () => {
    const bad = JSON.stringify({ version: 1, functions: [] });
    expect(parseSerializedGraph(bad)).toBeNull();
  });

  it('thiếu array fields trả null', () => {
    const bad = JSON.stringify({ version: 1, view: EMPTY_GRAPH.view });
    expect(parseSerializedGraph(bad)).toBeNull();
  });

  it('input không phải object trả null', () => {
    expect(parseSerializedGraph('null')).toBeNull();
    expect(parseSerializedGraph('"string"')).toBeNull();
    expect(parseSerializedGraph('123')).toBeNull();
  });
});
```

- [ ] **Step 2: Chạy test confirm fail**

Run: `npx jest src/stamps/graph-2d/__tests__/serialize.test.ts -v`
Expected: FAIL "Cannot find module '../serialize'".

- [ ] **Step 3: Implement `serialize.ts`**

```ts
// src/stamps/graph-2d/serialize.ts
export interface SerializedGraph {
  version: 1;
  view: {
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
    showAxis: boolean;
    showGrid: boolean;
  };
  functions: SerializedFunction[];
  parameters: SerializedParameter[];
  points: SerializedPoint[];
  intersections: SerializedIntersection[];
  tangents: SerializedTangent[];
}

export interface SerializedFunction {
  id: string;
  name: string;
  expression: string;
  color: string;
  visible: boolean;
  domain?: { min: number; max: number };
}

export interface SerializedParameter {
  name: string;
  value: number;
  min: number;
  max: number;
  step: number;
}

export interface SerializedPoint {
  id: string;
  functionId: string;
  x: number;
  label?: string;
}

export interface SerializedIntersection {
  id: string;
  functionIdA: string;
  functionIdB: string;
}

export interface SerializedTangent {
  id: string;
  pointId: string;
}

export const EMPTY_GRAPH: SerializedGraph = {
  version: 1,
  view: { xMin: -10, xMax: 10, yMin: -10, yMax: 10, showAxis: true, showGrid: true },
  functions: [],
  parameters: [],
  points: [],
  intersections: [],
  tangents: [],
};

export function stringifySerializedGraph(graph: SerializedGraph): string {
  return JSON.stringify(graph);
}

export function parseSerializedGraph(jsonState: string): SerializedGraph | null {
  let raw: unknown;
  try {
    raw = JSON.parse(jsonState);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (r.version !== 1) return null;
  if (!r.view || typeof r.view !== 'object') return null;
  const v = r.view as Record<string, unknown>;
  if (
    typeof v.xMin !== 'number' ||
    typeof v.xMax !== 'number' ||
    typeof v.yMin !== 'number' ||
    typeof v.yMax !== 'number' ||
    typeof v.showAxis !== 'boolean' ||
    typeof v.showGrid !== 'boolean'
  ) {
    return null;
  }
  for (const key of ['functions', 'parameters', 'points', 'intersections', 'tangents']) {
    if (!Array.isArray(r[key])) return null;
  }
  return raw as SerializedGraph;
}
```

- [ ] **Step 4: Chạy test confirm pass**

Run: `npx jest src/stamps/graph-2d/__tests__/serialize.test.ts -v`
Expected: PASS 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/graph-2d/serialize.ts src/stamps/graph-2d/__tests__/serialize.test.ts
git commit -m "feat(graph-2d): SerializedGraph types + parse/stringify"
```

---

## Task 5: Theme palette

**Files:**
- Create: `src/stamps/graph-2d/editor/theme.ts`

> Theme tương tự `geometry-2d/editor/theme.ts` nhưng đơn giản hơn — không cần sentinel resolve vì màu function lưu thẳng trong `SerializedFunction.color`. Chỉ cần axis/grid/label theo theme.

- [ ] **Step 1: Implement `theme.ts`** (không TDD vì pure constants, smoke-test ở Task 6 dùng render)

```ts
// src/stamps/graph-2d/editor/theme.ts
export interface GraphPalette {
  axis: string;
  grid: string;
  label: string;
  background: string;
}

export function graphPaletteFor(isDark: boolean): GraphPalette {
  return {
    axis: isDark ? '#cbd5e1' : '#94a3b8',
    grid: isDark ? '#475569' : '#e2e8f0',
    label: isDark ? '#e2e8f0' : '#0f172a',
    background: isDark ? '#0f172a' : '#ffffff',
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/stamps/graph-2d/editor/theme.ts
git commit -m "feat(graph-2d): theme palette (axis/grid/label)"
```

---

## Task 6: Render SVG từ state

**Files:**
- Create: `src/stamps/graph-2d/render.ts`
- Create: `src/stamps/graph-2d/__tests__/render.test.ts`

- [ ] **Step 1: Viết failing tests**

```ts
// src/stamps/graph-2d/__tests__/render.test.ts
import { renderGraph2dSvgFromState } from '../render';
import { EMPTY_GRAPH, stringifySerializedGraph } from '../serialize';

describe('renderGraph2dSvgFromState', () => {
  it('trả SVG string non-empty cho EMPTY_GRAPH', async () => {
    const svg = await renderGraph2dSvgFromState(stringifySerializedGraph(EMPTY_GRAPH));
    expect(typeof svg).toBe('string');
    expect(svg).toMatch(/^<svg/);
  });

  it('render đồ thị y = x^2 chứa path', async () => {
    const state = stringifySerializedGraph({
      ...EMPTY_GRAPH,
      functions: [
        { id: 'f1', name: 'f', expression: 'x^2', color: '#2563eb', visible: true },
      ],
    });
    const svg = await renderGraph2dSvgFromState(state);
    expect(svg).toContain('path');
  });

  it('skip function visible=false', async () => {
    const state = stringifySerializedGraph({
      ...EMPTY_GRAPH,
      functions: [
        { id: 'f1', name: 'f', expression: 'x^2', color: '#ff0000', visible: false },
      ],
    });
    const svg = await renderGraph2dSvgFromState(state);
    expect(svg).not.toContain('#ff0000');
  });

  it('throw nếu jsonState corrupt', async () => {
    await expect(renderGraph2dSvgFromState('{bad')).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Chạy test confirm fail**

Run: `npx jest src/stamps/graph-2d/__tests__/render.test.ts -v`
Expected: FAIL "Cannot find module '../render'".

- [ ] **Step 3: Implement `render.ts`**

```ts
// src/stamps/graph-2d/render.ts
import { parseSerializedGraph, type SerializedGraph } from './serialize';
import { compile } from './parser';
import { graphPaletteFor } from './editor/theme';

/**
 * Re-render SVG cho graph-2d stamp từ jsonState đã serialize.
 *
 * Dùng cho:
 *   1. Insert vào whiteboard (lúc user nhấn Chèn).
 *   2. Restore stamp file sau khi reload (Excalidraw không persist binary).
 *
 * Pattern mirror `geometry-2d/render.ts`:
 *   - LUÔN dùng light palette. Excalidraw apply CSS invert filter trong dark mode.
 *   - Đặt JXG.Options.text.display='internal' để label render dưới dạng SVG, không HTML overlay.
 *   - Offscreen div 600×400 cố định; cleanup sau khi clone SVG outerHTML.
 */
export async function renderGraph2dSvgFromState(jsonState: string): Promise<string> {
  const parsed = parseSerializedGraph(jsonState);
  if (!parsed) throw new Error('renderGraph2dSvgFromState: jsonState corrupt');

  const palette = graphPaletteFor(false);
  const JXG = (await import('jsxgraph')).default;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const opts = (JXG as any).Options;
  if (opts) {
    opts.text = opts.text || {};
    opts.text.display = 'internal';
    opts.text.useASCIIMathML = false;
    opts.text.useMathJax = false;
    opts.text.useKatex = false;
    opts.label = opts.label || {};
    opts.label.display = 'internal';
  }

  const container = document.createElement('div');
  container.id = `jxg_graph2d_off_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  container.style.cssText =
    'position:absolute;top:-99999px;left:-99999px;width:600px;height:400px;visibility:hidden;pointer-events:none;';
  document.body.appendChild(container);

  let board: unknown = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    board = (JXG as any).JSXGraph.initBoard(container.id, {
      boundingbox: [parsed.view.xMin, parsed.view.yMax, parsed.view.xMax, parsed.view.yMin],
      axis: parsed.view.showAxis,
      grid: parsed.view.showGrid,
      showCopyright: false,
      showNavigation: false,
      keepAspectRatio: false,
    });
    renderFunctions(board, parsed, palette);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (board as any).update();
    const svgEl = container.querySelector('svg');
    if (!svgEl) throw new Error('renderGraph2dSvgFromState: no svg generated');
    return svgEl.outerHTML;
  } finally {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (board) (JXG as any).JSXGraph.freeBoard(board);
    } catch {
      /* ignore */
    }
    if (container.parentNode) container.parentNode.removeChild(container);
  }
}

function renderFunctions(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  board: any,
  graph: SerializedGraph,
  palette: { axis: string; grid: string; label: string; background: string },
): void {
  const paramMap: Record<string, number> = {};
  for (const p of graph.parameters) paramMap[p.name] = p.value;

  for (const f of graph.functions) {
    if (!f.visible) continue;
    const compiled = compile(f.expression, paramMap);
    if (typeof compiled !== 'function') continue;
    const domain = f.domain ?? { min: graph.view.xMin, max: graph.view.xMax };
    board.create(
      'functiongraph',
      [compiled, domain.min, domain.max],
      {
        strokeColor: f.color,
        strokeWidth: 2,
        name: f.name,
        withLabel: false,
        highlight: false,
      },
    );
  }
}
```

- [ ] **Step 4: Chạy test confirm pass**

Run: `npx jest src/stamps/graph-2d/__tests__/render.test.ts -v`
Expected: PASS 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/graph-2d/render.ts src/stamps/graph-2d/__tests__/render.test.ts
git commit -m "feat(graph-2d): SVG render from SerializedGraph"
```

---

## Task 7: Tools enum

**Files:**
- Create: `src/stamps/graph-2d/editor/tools.ts`

> Pure types — không cần test riêng, sẽ test gián tiếp ở Task 12 (LeftPanel).

- [ ] **Step 1: Implement `tools.ts`**

```ts
// src/stamps/graph-2d/editor/tools.ts
export type GraphTool = 'move' | 'point-on-curve' | 'intersect' | 'tangent';

export interface GraphToolMeta {
  id: GraphTool;
  label: string;
  title: string;
  shortcutKey?: string;
}

export const GRAPH_TOOLS: GraphToolMeta[] = [
  { id: 'move',           label: 'Di chuyển',     title: 'Di chuyển / chọn' },
  { id: 'point-on-curve', label: 'Điểm trên curve', title: 'Tạo điểm cố định trên đồ thị' },
  { id: 'intersect',      label: 'Giao điểm',     title: 'Đánh dấu giao điểm 2 đồ thị' },
  { id: 'tangent',        label: 'Tiếp tuyến',    title: 'Vẽ tiếp tuyến tại điểm trên đồ thị' },
];
```

- [ ] **Step 2: Commit**

```bash
git add src/stamps/graph-2d/editor/tools.ts
git commit -m "feat(graph-2d): GraphTool enum + metadata"
```

---

## Task 8: FunctionRow component

**Files:**
- Create: `src/stamps/graph-2d/editor/FunctionRow.tsx`
- Create: `src/stamps/graph-2d/editor/__tests__/FunctionRow.test.tsx`

- [ ] **Step 1: Viết failing tests**

```tsx
// src/stamps/graph-2d/editor/__tests__/FunctionRow.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { FunctionRow } from '../FunctionRow';

describe('FunctionRow', () => {
  const defaultProps = {
    id: 'f1',
    name: 'f',
    expression: 'x^2',
    color: '#2563eb',
    visible: true,
    error: null,
    onExpressionCommit: jest.fn(),
    onToggleVisible: jest.fn(),
    onRemove: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('hiển thị tên, biểu thức và màu', () => {
    render(<FunctionRow {...defaultProps} />);
    expect(screen.getByLabelText(/biểu thức/i)).toHaveValue('x^2');
    expect(screen.getByTestId('graph-function-name-f1')).toHaveTextContent('f');
  });

  it('Enter trên input fire onExpressionCommit', () => {
    render(<FunctionRow {...defaultProps} />);
    const input = screen.getByLabelText(/biểu thức/i);
    fireEvent.change(input, { target: { value: 'sin(x)' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(defaultProps.onExpressionCommit).toHaveBeenCalledWith('sin(x)');
  });

  it('Blur fire onExpressionCommit nếu giá trị đổi', () => {
    render(<FunctionRow {...defaultProps} />);
    const input = screen.getByLabelText(/biểu thức/i);
    fireEvent.change(input, { target: { value: 'sin(x)' } });
    fireEvent.blur(input);
    expect(defaultProps.onExpressionCommit).toHaveBeenCalledWith('sin(x)');
  });

  it('Click eye fire onToggleVisible', () => {
    render(<FunctionRow {...defaultProps} />);
    fireEvent.click(screen.getByLabelText(/ẩn\/hiện/i));
    expect(defaultProps.onToggleVisible).toHaveBeenCalled();
  });

  it('hiển thị error UI khi prop error truthy', () => {
    render(<FunctionRow {...defaultProps} error="Lỗi cú pháp" />);
    expect(screen.getByText('Lỗi cú pháp')).toBeInTheDocument();
  });

  it('Click remove fire onRemove', () => {
    render(<FunctionRow {...defaultProps} />);
    fireEvent.click(screen.getByLabelText(/xoá/i));
    expect(defaultProps.onRemove).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Chạy test confirm fail**

Run: `npx jest src/stamps/graph-2d/editor/__tests__/FunctionRow.test.tsx -v`
Expected: FAIL "Cannot find module '../FunctionRow'".

- [ ] **Step 3: Implement `FunctionRow.tsx`**

```tsx
// src/stamps/graph-2d/editor/FunctionRow.tsx
'use client';

import { useEffect, useState, type KeyboardEvent, type FocusEvent } from 'react';

export interface FunctionRowProps {
  id: string;
  name: string;
  expression: string;
  color: string;
  visible: boolean;
  error: string | null;
  onExpressionCommit: (expr: string) => void;
  onToggleVisible: () => void;
  onRemove: () => void;
}

export function FunctionRow(props: FunctionRowProps): JSX.Element {
  const { id, name, expression, color, visible, error } = props;
  const [draft, setDraft] = useState(expression);

  useEffect(() => {
    setDraft(expression);
  }, [expression]);

  const commit = () => {
    if (draft !== expression) props.onExpressionCommit(draft);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      setDraft(expression);
      (e.target as HTMLInputElement).blur();
    }
  };

  const handleBlur = (_: FocusEvent<HTMLInputElement>) => commit();

  return (
    <div className={`graph-function-row${error ? ' is-error' : ''}`} data-testid={`graph-function-row-${id}`}>
      <span
        className="graph-function-color"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <span className="graph-function-name" data-testid={`graph-function-name-${id}`}>
        {name}(x) =
      </span>
      <input
        aria-label="Biểu thức"
        className="graph-function-input"
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
      />
      <button
        type="button"
        aria-label="Ẩn/hiện đồ thị"
        className={`graph-function-eye${visible ? '' : ' is-hidden'}`}
        onClick={props.onToggleVisible}
      >
        {visible ? '👁' : '⊘'}
      </button>
      <button
        type="button"
        aria-label="Xoá đồ thị"
        className="graph-function-remove"
        onClick={props.onRemove}
      >
        ✕
      </button>
      {error ? <div className="graph-function-error">{error}</div> : null}
    </div>
  );
}
```

- [ ] **Step 4: Chạy test confirm pass**

Run: `npx jest src/stamps/graph-2d/editor/__tests__/FunctionRow.test.tsx -v`
Expected: PASS 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/graph-2d/editor/FunctionRow.tsx src/stamps/graph-2d/editor/__tests__/FunctionRow.test.tsx
git commit -m "feat(graph-2d): FunctionRow component"
```

---

## Task 9: SliderRow component

**Files:**
- Create: `src/stamps/graph-2d/editor/SliderRow.tsx`
- Create: `src/stamps/graph-2d/editor/__tests__/SliderRow.test.tsx`

- [ ] **Step 1: Viết failing tests**

```tsx
// src/stamps/graph-2d/editor/__tests__/SliderRow.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { SliderRow } from '../SliderRow';

describe('SliderRow', () => {
  const props = {
    name: 'a',
    value: 1,
    min: -5,
    max: 5,
    step: 0.1,
    onChange: jest.fn(),
    onRemove: jest.fn(),
    onRangeChange: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('hiển thị tên và giá trị', () => {
    render(<SliderRow {...props} />);
    expect(screen.getByText(/^a$/)).toBeInTheDocument();
    expect(screen.getByLabelText(/slider a/i)).toHaveValue('1');
  });

  it('Drag slider fire onChange với số mới', () => {
    render(<SliderRow {...props} />);
    fireEvent.change(screen.getByLabelText(/slider a/i), { target: { value: '2.5' } });
    expect(props.onChange).toHaveBeenCalledWith(2.5);
  });

  it('range input đúng min/max/step', () => {
    render(<SliderRow {...props} />);
    const slider = screen.getByLabelText(/slider a/i);
    expect(slider).toHaveAttribute('min', '-5');
    expect(slider).toHaveAttribute('max', '5');
    expect(slider).toHaveAttribute('step', '0.1');
  });

  it('Click remove fire onRemove', () => {
    render(<SliderRow {...props} />);
    fireEvent.click(screen.getByLabelText(/xoá tham số a/i));
    expect(props.onRemove).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Chạy test confirm fail**

Run: `npx jest src/stamps/graph-2d/editor/__tests__/SliderRow.test.tsx -v`
Expected: FAIL.

- [ ] **Step 3: Implement `SliderRow.tsx`**

```tsx
// src/stamps/graph-2d/editor/SliderRow.tsx
'use client';

export interface SliderRowProps {
  name: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  onRemove: () => void;
  onRangeChange: (min: number, max: number, step: number) => void;
}

export function SliderRow(props: SliderRowProps): JSX.Element {
  const { name, value, min, max, step } = props;
  return (
    <div className="graph-slider-row" data-testid={`graph-slider-row-${name}`}>
      <div className="graph-slider-header">
        <span className="graph-slider-name">{name}</span>
        <span className="graph-slider-value">= {value.toFixed(2)}</span>
        <button
          type="button"
          aria-label={`Xoá tham số ${name}`}
          className="graph-slider-remove"
          onClick={props.onRemove}
        >
          ✕
        </button>
      </div>
      <input
        type="range"
        aria-label={`Slider ${name}`}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => props.onChange(parseFloat(e.target.value))}
        className="graph-slider-input"
      />
      <div className="graph-slider-range">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Chạy test confirm pass**

Run: `npx jest src/stamps/graph-2d/editor/__tests__/SliderRow.test.tsx -v`
Expected: PASS 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/graph-2d/editor/SliderRow.tsx src/stamps/graph-2d/editor/__tests__/SliderRow.test.tsx
git commit -m "feat(graph-2d): SliderRow component"
```

---

## Task 10: AlgebraView container

**Files:**
- Create: `src/stamps/graph-2d/editor/AlgebraView.tsx`
- Create: `src/stamps/graph-2d/editor/__tests__/AlgebraView.test.tsx`

- [ ] **Step 1: Viết failing tests**

```tsx
// src/stamps/graph-2d/editor/__tests__/AlgebraView.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { AlgebraView } from '../AlgebraView';
import { EMPTY_GRAPH } from '../../serialize';

describe('AlgebraView', () => {
  const baseHandlers = {
    onAddFunctionDraft: jest.fn(),
    onCommitFunctionExpr: jest.fn(),
    onToggleFunctionVisible: jest.fn(),
    onRemoveFunction: jest.fn(),
    onParameterChange: jest.fn(),
    onParameterRangeChange: jest.fn(),
    onRemoveParameter: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('render rỗng cho EMPTY_GRAPH có nút thêm hàm', () => {
    render(<AlgebraView graph={EMPTY_GRAPH} errors={{}} {...baseHandlers} />);
    expect(screen.getByLabelText(/thêm hàm/i)).toBeInTheDocument();
  });

  it('render mỗi function thành 1 row', () => {
    const graph = {
      ...EMPTY_GRAPH,
      functions: [
        { id: 'f1', name: 'f', expression: 'x^2', color: '#2563eb', visible: true },
        { id: 'f2', name: 'g', expression: 'sin(x)', color: '#dc2626', visible: true },
      ],
    };
    render(<AlgebraView graph={graph} errors={{}} {...baseHandlers} />);
    expect(screen.getByTestId('graph-function-row-f1')).toBeInTheDocument();
    expect(screen.getByTestId('graph-function-row-f2')).toBeInTheDocument();
  });

  it('render mỗi parameter thành 1 slider row', () => {
    const graph = {
      ...EMPTY_GRAPH,
      parameters: [
        { name: 'a', value: 1, min: -5, max: 5, step: 0.1 },
      ],
    };
    render(<AlgebraView graph={graph} errors={{}} {...baseHandlers} />);
    expect(screen.getByTestId('graph-slider-row-a')).toBeInTheDocument();
  });

  it('Click "thêm hàm" fire onAddFunctionDraft', () => {
    render(<AlgebraView graph={EMPTY_GRAPH} errors={{}} {...baseHandlers} />);
    fireEvent.click(screen.getByLabelText(/thêm hàm/i));
    expect(baseHandlers.onAddFunctionDraft).toHaveBeenCalled();
  });

  it('Disable nút thêm khi đạt MAX_FUNCTIONS', () => {
    const funcs = Array.from({ length: 8 }, (_, i) => ({
      id: `f${i}`, name: 'f', expression: 'x', color: '#000', visible: true,
    }));
    render(<AlgebraView graph={{ ...EMPTY_GRAPH, functions: funcs }} errors={{}} {...baseHandlers} />);
    expect(screen.getByLabelText(/thêm hàm/i)).toBeDisabled();
  });
});
```

- [ ] **Step 2: Chạy test confirm fail**

Run: `npx jest src/stamps/graph-2d/editor/__tests__/AlgebraView.test.tsx -v`
Expected: FAIL.

- [ ] **Step 3: Implement `AlgebraView.tsx`**

```tsx
// src/stamps/graph-2d/editor/AlgebraView.tsx
'use client';

import { FunctionRow } from './FunctionRow';
import { SliderRow } from './SliderRow';
import type { SerializedGraph } from '../serialize';
import { MAX_FUNCTIONS } from '../colors';

export interface AlgebraViewProps {
  graph: SerializedGraph;
  errors: Record<string, string | null>;
  onAddFunctionDraft: () => void;
  onCommitFunctionExpr: (id: string, expr: string) => void;
  onToggleFunctionVisible: (id: string) => void;
  onRemoveFunction: (id: string) => void;
  onParameterChange: (name: string, value: number) => void;
  onParameterRangeChange: (name: string, min: number, max: number, step: number) => void;
  onRemoveParameter: (name: string) => void;
}

export function AlgebraView(props: AlgebraViewProps): JSX.Element {
  const { graph, errors } = props;
  const atMax = graph.functions.length >= MAX_FUNCTIONS;

  return (
    <div className="graph-algebra-view">
      <div className="graph-algebra-section">
        {graph.functions.map((f) => (
          <FunctionRow
            key={f.id}
            id={f.id}
            name={f.name}
            expression={f.expression}
            color={f.color}
            visible={f.visible}
            error={errors[f.id] ?? null}
            onExpressionCommit={(expr) => props.onCommitFunctionExpr(f.id, expr)}
            onToggleVisible={() => props.onToggleFunctionVisible(f.id)}
            onRemove={() => props.onRemoveFunction(f.id)}
          />
        ))}
        <button
          type="button"
          aria-label="Thêm hàm số"
          className="graph-algebra-add"
          onClick={props.onAddFunctionDraft}
          disabled={atMax}
        >
          + Thêm hàm
        </button>
      </div>

      {graph.parameters.length > 0 ? (
        <div className="graph-algebra-section graph-algebra-parameters">
          {graph.parameters.map((p) => (
            <SliderRow
              key={p.name}
              name={p.name}
              value={p.value}
              min={p.min}
              max={p.max}
              step={p.step}
              onChange={(v) => props.onParameterChange(p.name, v)}
              onRangeChange={(min, max, step) =>
                props.onParameterRangeChange(p.name, min, max, step)
              }
              onRemove={() => props.onRemoveParameter(p.name)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: Chạy test confirm pass**

Run: `npx jest src/stamps/graph-2d/editor/__tests__/AlgebraView.test.tsx -v`
Expected: PASS 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/graph-2d/editor/AlgebraView.tsx src/stamps/graph-2d/editor/__tests__/AlgebraView.test.tsx
git commit -m "feat(graph-2d): AlgebraView container"
```

---

## Task 11: MiniBoard — render functions only

**Files:**
- Create: `src/stamps/graph-2d/editor/MiniBoard.tsx`
- Create: `src/stamps/graph-2d/editor/__tests__/MiniBoard.test.tsx`

> Khi mount: tạo JSXGraph board, render functions theo `graph` prop. Khi `graph` đổi: diff functions theo `id` (thêm/xoá/sửa) thay vì recreate board. Tools tương tác wire ở Task 14.

- [ ] **Step 1: Viết failing smoke test**

```tsx
// src/stamps/graph-2d/editor/__tests__/MiniBoard.test.tsx
import { render } from '@testing-library/react';
import { MiniBoard } from '../MiniBoard';
import { EMPTY_GRAPH } from '../../serialize';

jest.mock('jsxgraph', () => {
  const create = jest.fn(() => ({ remove: jest.fn() }));
  const board = {
    create,
    setBoundingBox: jest.fn(),
    update: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    objects: {},
    containerObj: document.createElement('div'),
  };
  return {
    __esModule: true,
    default: {
      JSXGraph: {
        initBoard: jest.fn(() => board),
        freeBoard: jest.fn(),
      },
      Options: { text: {}, label: {} },
    },
  };
});

describe('MiniBoard', () => {
  it('mount với EMPTY_GRAPH không crash', () => {
    const { container } = render(
      <MiniBoard graph={EMPTY_GRAPH} activeTool="move" isDark={false} onBoardEvent={jest.fn()} />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('mount với functions không crash', () => {
    const graph = {
      ...EMPTY_GRAPH,
      functions: [
        { id: 'f1', name: 'f', expression: 'x^2', color: '#2563eb', visible: true },
      ],
    };
    const { container } = render(
      <MiniBoard graph={graph} activeTool="move" isDark={false} onBoardEvent={jest.fn()} />,
    );
    expect(container.firstChild).toBeTruthy();
  });
});
```

- [ ] **Step 2: Chạy test confirm fail**

Run: `npx jest src/stamps/graph-2d/editor/__tests__/MiniBoard.test.tsx -v`
Expected: FAIL.

- [ ] **Step 3: Implement `MiniBoard.tsx`**

```tsx
// src/stamps/graph-2d/editor/MiniBoard.tsx
'use client';

import { useEffect, useRef } from 'react';
import type { SerializedGraph } from '../serialize';
import { compile } from '../parser';
import { graphPaletteFor } from './theme';
import type { GraphTool } from './tools';

export interface BoardEvent {
  type: 'click-curve' | 'click-empty' | 'view-change';
  functionId?: string;
  x?: number;
  y?: number;
  view?: SerializedGraph['view'];
}

export interface MiniBoardProps {
  graph: SerializedGraph;
  activeTool: GraphTool;
  isDark: boolean;
  onBoardEvent: (e: BoardEvent) => void;
}

interface CurveRef {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  obj: any;
  expression: string;
  color: string;
  visible: boolean;
  paramSignature: string;
}

export function MiniBoard({ graph, activeTool, isDark, onBoardEvent }: MiniBoardProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const boardRef = useRef<any>(null);
  const curvesRef = useRef<Map<string, CurveRef>>(new Map());
  const palette = graphPaletteFor(isDark);

  // Init board on mount
  useEffect(() => {
    let cancelled = false;
    let createdBoard: unknown = null;
    const containerEl = containerRef.current;
    if (!containerEl) return;
    const containerId = `jxg_graph2d_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    containerEl.id = containerId;

    (async () => {
      const JXG = (await import('jsxgraph')).default;
      if (cancelled) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const opts = (JXG as any).Options;
      if (opts) {
        opts.text = opts.text || {};
        opts.text.display = 'internal';
        opts.label = opts.label || {};
        opts.label.display = 'internal';
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const board = (JXG as any).JSXGraph.initBoard(containerId, {
        boundingbox: [graph.view.xMin, graph.view.yMax, graph.view.xMax, graph.view.yMin],
        axis: graph.view.showAxis,
        grid: graph.view.showGrid,
        showCopyright: false,
        showNavigation: true,
        pan: { enabled: true, needShift: false },
        zoom: { wheel: true, needShift: false },
        keepAspectRatio: false,
      });
      boardRef.current = board;
      createdBoard = board;
      syncCurves(board, graph, curvesRef.current);
      board.on('boundingbox', () => {
        const bb = board.getBoundingBox();
        onBoardEvent({
          type: 'view-change',
          view: {
            xMin: bb[0],
            xMax: bb[2],
            yMax: bb[1],
            yMin: bb[3],
            showAxis: graph.view.showAxis,
            showGrid: graph.view.showGrid,
          },
        });
      });
    })().catch((err) => console.error('MiniBoard init failed:', err));

    return () => {
      cancelled = true;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (createdBoard) (require('jsxgraph') as any).default.JSXGraph.freeBoard(createdBoard);
      } catch { /* ignore */ }
      boardRef.current = null;
      curvesRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync curves khi graph thay đổi
  useEffect(() => {
    if (!boardRef.current) return;
    syncCurves(boardRef.current, graph, curvesRef.current);
  }, [graph]);

  // Suppress unused warnings - activeTool/palette wired ở Task 14
  void activeTool;
  void palette;

  return (
    <div
      ref={containerRef}
      className="graph-miniboard"
      style={{ width: '100%', height: '100%', minHeight: '300px' }}
      data-testid="graph-miniboard"
    />
  );
}

function paramSig(graph: SerializedGraph): string {
  return graph.parameters.map((p) => `${p.name}=${p.value}`).join(',');
}

function syncCurves(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  board: any,
  graph: SerializedGraph,
  curves: Map<string, CurveRef>,
): void {
  const sig = paramSig(graph);
  const paramMap: Record<string, number> = {};
  for (const p of graph.parameters) paramMap[p.name] = p.value;

  const wantedIds = new Set(graph.functions.map((f) => f.id));
  // Remove stale curves
  for (const [id, ref] of curves) {
    if (!wantedIds.has(id)) {
      try { board.removeObject(ref.obj); } catch { /* ignore */ }
      curves.delete(id);
    }
  }
  for (const f of graph.functions) {
    const existing = curves.get(f.id);
    const needsRecreate =
      !existing ||
      existing.expression !== f.expression ||
      existing.color !== f.color ||
      existing.visible !== f.visible ||
      existing.paramSignature !== sig;
    if (!needsRecreate) continue;
    if (existing) {
      try { board.removeObject(existing.obj); } catch { /* ignore */ }
    }
    if (!f.visible) {
      curves.delete(f.id);
      continue;
    }
    const compiled = compile(f.expression, paramMap);
    if (typeof compiled !== 'function') continue;
    const domain = f.domain ?? { min: graph.view.xMin, max: graph.view.xMax };
    const obj = board.create('functiongraph', [compiled, domain.min, domain.max], {
      strokeColor: f.color,
      strokeWidth: 2,
      name: f.name,
      withLabel: false,
      highlight: false,
    });
    curves.set(f.id, {
      obj,
      expression: f.expression,
      color: f.color,
      visible: f.visible,
      paramSignature: sig,
    });
  }
  board.update();
}
```

- [ ] **Step 4: Chạy test confirm pass**

Run: `npx jest src/stamps/graph-2d/editor/__tests__/MiniBoard.test.tsx -v`
Expected: PASS 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/graph-2d/editor/MiniBoard.tsx src/stamps/graph-2d/editor/__tests__/MiniBoard.test.tsx
git commit -m "feat(graph-2d): MiniBoard render functions với diff-update"
```

---

## Task 12: LeftPanel — tool strip + algebra view

**Files:**
- Create: `src/stamps/graph-2d/editor/LeftPanel.tsx`

> Smoke test integrated, không TDD riêng — sẽ test gián tiếp ở Task 13 EditorPanel.

- [ ] **Step 1: Implement `LeftPanel.tsx`**

```tsx
// src/stamps/graph-2d/editor/LeftPanel.tsx
'use client';

import { GRAPH_TOOLS, type GraphTool } from './tools';
import { AlgebraView, type AlgebraViewProps } from './AlgebraView';

export interface GraphLeftPanelProps extends AlgebraViewProps {
  activeTool: GraphTool;
  onToolChange: (t: GraphTool) => void;
  showAxis: boolean;
  showGrid: boolean;
  onShowAxisChange: (b: boolean) => void;
  onShowGridChange: (b: boolean) => void;
  onResetView: () => void;
  onUndo: () => void;
  canUndo: boolean;
  onClose: () => void;
  isDark: boolean;
  isMobile: boolean;
  drawerOpen: boolean;
  onDrawerClose: () => void;
}

export function GraphLeftPanel(props: GraphLeftPanelProps): JSX.Element {
  const { activeTool, onToolChange, showAxis, showGrid, canUndo } = props;

  return (
    <aside
      className={`graph-left-panel${props.isMobile ? ' is-mobile' : ''}${props.isMobile && !props.drawerOpen ? ' is-closed' : ''}`}
      aria-hidden={props.isMobile && !props.drawerOpen}
    >
      <div className="graph-tool-strip">
        {GRAPH_TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-label={t.title}
            title={t.title}
            className={`graph-tool-btn${activeTool === t.id ? ' is-active' : ''}`}
            onClick={() => onToolChange(t.id)}
            data-testid={`graph-tool-${t.id}`}
          >
            {t.label.slice(0, 1)}
          </button>
        ))}
        <div className="graph-tool-strip-sep" />
        <button
          type="button"
          aria-label="Bật/tắt trục"
          className={`graph-tool-btn${showAxis ? ' is-active' : ''}`}
          onClick={() => props.onShowAxisChange(!showAxis)}
        >
          ⊥
        </button>
        <button
          type="button"
          aria-label="Bật/tắt lưới"
          className={`graph-tool-btn${showGrid ? ' is-active' : ''}`}
          onClick={() => props.onShowGridChange(!showGrid)}
        >
          ▦
        </button>
        <button
          type="button"
          aria-label="Đặt lại tầm nhìn"
          className="graph-tool-btn"
          onClick={props.onResetView}
        >
          ⊕
        </button>
        <button
          type="button"
          aria-label="Hoàn tác"
          className="graph-tool-btn"
          onClick={props.onUndo}
          disabled={!canUndo}
        >
          ↶
        </button>
      </div>
      <AlgebraView
        graph={props.graph}
        errors={props.errors}
        onAddFunctionDraft={props.onAddFunctionDraft}
        onCommitFunctionExpr={props.onCommitFunctionExpr}
        onToggleFunctionVisible={props.onToggleFunctionVisible}
        onRemoveFunction={props.onRemoveFunction}
        onParameterChange={props.onParameterChange}
        onParameterRangeChange={props.onParameterRangeChange}
        onRemoveParameter={props.onRemoveParameter}
      />
      <div className="graph-left-panel-footer">
        <button type="button" className="graph-btn-cancel" onClick={props.onClose}>
          Hủy
        </button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/stamps/graph-2d/editor/LeftPanel.tsx
git commit -m "feat(graph-2d): LeftPanel với tool strip + algebra view"
```

---

## Task 13: EditorPanel — orchestrator

**Files:**
- Create: `src/stamps/graph-2d/editor/EditorPanel.tsx`
- Create: `src/stamps/graph-2d/editor/__tests__/EditorPanel.test.tsx`

> EditorPanel quản lý:
> - State `SerializedGraph` (single source of truth)
> - Undo stack
> - Errors per function
> - Mutation methods exposed qua ref handle
> - Render MiniBoard + báo `state.canUndo` cho parent qua `onStateChange`

- [ ] **Step 1: Viết failing test**

```tsx
// src/stamps/graph-2d/editor/__tests__/EditorPanel.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { createRef } from 'react';
import { GraphEditorPanel, type GraphEditorPanelHandle } from '../EditorPanel';
import { EMPTY_GRAPH } from '../../serialize';

jest.mock('jsxgraph', () => ({
  __esModule: true,
  default: {
    JSXGraph: {
      initBoard: jest.fn(() => ({
        create: jest.fn(() => ({})),
        update: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
        getBoundingBox: () => [-10, 10, 10, -10],
        objects: {},
        removeObject: jest.fn(),
      })),
      freeBoard: jest.fn(),
    },
    Options: { text: {}, label: {} },
  },
}));

describe('GraphEditorPanel', () => {
  it('mount với initialState=null tạo empty graph', () => {
    const ref = createRef<GraphEditorPanelHandle>();
    render(
      <GraphEditorPanel
        ref={ref}
        initialState={null}
        onInsert={jest.fn()}
        onClose={jest.fn()}
        onStateChange={jest.fn()}
        withLeftPanel={false}
        isDark={false}
        isMobile={false}
        onOpenDrawer={jest.fn()}
      />,
    );
    expect(ref.current?.hasContent()).toBe(false);
  });

  it('addFunction valid: thêm vào graph, hasContent → true', () => {
    const ref = createRef<GraphEditorPanelHandle>();
    const onStateChange = jest.fn();
    render(
      <GraphEditorPanel
        ref={ref}
        initialState={null}
        onInsert={jest.fn()}
        onClose={jest.fn()}
        onStateChange={onStateChange}
        withLeftPanel={false}
        isDark={false}
        isMobile={false}
        onOpenDrawer={jest.fn()}
      />,
    );
    const result = ref.current?.addFunction('x^2');
    expect(result?.ok).toBe(true);
    expect(ref.current?.hasContent()).toBe(true);
  });

  it('addFunction invalid: trả { ok: false, error }', () => {
    const ref = createRef<GraphEditorPanelHandle>();
    render(
      <GraphEditorPanel
        ref={ref}
        initialState={null}
        onInsert={jest.fn()}
        onClose={jest.fn()}
        onStateChange={jest.fn()}
        withLeftPanel={false}
        isDark={false}
        isMobile={false}
        onOpenDrawer={jest.fn()}
      />,
    );
    const result = ref.current?.addFunction('foo(x)');
    expect(result?.ok).toBe(false);
  });

  it('initialState là SerializedGraph có sẵn: load đúng', () => {
    const ref = createRef<GraphEditorPanelHandle>();
    render(
      <GraphEditorPanel
        ref={ref}
        initialState={{
          ...EMPTY_GRAPH,
          functions: [
            { id: 'f1', name: 'f', expression: 'sin(x)', color: '#000', visible: true },
          ],
        }}
        onInsert={jest.fn()}
        onClose={jest.fn()}
        onStateChange={jest.fn()}
        withLeftPanel={false}
        isDark={false}
        isMobile={false}
        onOpenDrawer={jest.fn()}
      />,
    );
    expect(ref.current?.hasContent()).toBe(true);
  });
});
```

- [ ] **Step 2: Chạy test confirm fail**

Run: `npx jest src/stamps/graph-2d/editor/__tests__/EditorPanel.test.tsx -v`
Expected: FAIL.

- [ ] **Step 3: Implement `EditorPanel.tsx`**

```tsx
// src/stamps/graph-2d/editor/EditorPanel.tsx
'use client';

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
} from 'react';
import { MiniBoard } from './MiniBoard';
import {
  EMPTY_GRAPH,
  stringifySerializedGraph,
  type SerializedFunction,
  type SerializedGraph,
  type SerializedParameter,
} from '../serialize';
import { validate } from '../parser';
import { renderGraph2dSvgFromState } from '../render';
import { nextColor, nextFunctionName, MAX_FUNCTIONS, MAX_PARAMETERS } from '../colors';
import type { GraphTool } from './tools';

export interface GraphState {
  tool: GraphTool;
  showAxis: boolean;
  showGrid: boolean;
  canUndo: boolean;
}

export interface GraphEditorPanelHandle {
  insert(): boolean;
  hasContent(): boolean;
  setTool(t: GraphTool): void;
  setShowAxis(b: boolean): void;
  setShowGrid(b: boolean): void;
  resetView(): void;
  undo(): void;

  addFunction(expr: string): { ok: true; id: string } | { ok: false; error: string };
  commitFunctionExpression(id: string, expr: string): void;
  toggleFunctionVisible(id: string): void;
  removeFunction(id: string): void;

  setParameter(name: string, value: number): void;
  setParameterRange(name: string, min: number, max: number, step: number): void;
  removeParameter(name: string): void;

  getGraph(): SerializedGraph;
  getErrors(): Record<string, string | null>;
}

export interface GraphEditorPanelProps {
  initialState: SerializedGraph | null;
  onInsert: (jsonState: string, svgString: string) => void;
  onClose: () => void;
  onStateChange: (state: GraphState) => void;
  withLeftPanel: boolean;
  isDark: boolean;
  isMobile: boolean;
  onOpenDrawer: () => void;
}

export const GraphEditorPanel = forwardRef(function GraphEditorPanel(
  props: GraphEditorPanelProps,
  ref: Ref<GraphEditorPanelHandle>,
): JSX.Element {
  const [graph, setGraph] = useState<SerializedGraph>(
    props.initialState ?? EMPTY_GRAPH,
  );
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [tool, setTool] = useState<GraphTool>('move');
  const undoStackRef = useRef<SerializedGraph[]>([]);
  const idCounterRef = useRef(1);

  const pushUndo = useCallback((g: SerializedGraph) => {
    undoStackRef.current.push(g);
    if (undoStackRef.current.length > 30) undoStackRef.current.shift();
  }, []);

  const updateGraph = useCallback(
    (mutator: (prev: SerializedGraph) => SerializedGraph) => {
      setGraph((prev) => {
        pushUndo(prev);
        const next = mutator(prev);
        props.onStateChange({
          tool,
          showAxis: next.view.showAxis,
          showGrid: next.view.showGrid,
          canUndo: undoStackRef.current.length > 0,
        });
        return next;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tool, pushUndo],
  );

  const handle: GraphEditorPanelHandle = {
    insert: () => {
      if (graph.functions.length === 0) return false;
      const jsonState = stringifySerializedGraph(graph);
      renderGraph2dSvgFromState(jsonState)
        .then((svg) => props.onInsert(jsonState, svg))
        .catch((err) => console.error('Graph2D insert render failed:', err));
      return true;
    },
    hasContent: () => graph.functions.length > 0,
    setTool: (t) => {
      setTool(t);
      props.onStateChange({ tool: t, showAxis: graph.view.showAxis, showGrid: graph.view.showGrid, canUndo: undoStackRef.current.length > 0 });
    },
    setShowAxis: (b) => updateGraph((g) => ({ ...g, view: { ...g.view, showAxis: b } })),
    setShowGrid: (b) => updateGraph((g) => ({ ...g, view: { ...g.view, showGrid: b } })),
    resetView: () => updateGraph((g) => ({
      ...g,
      view: { ...g.view, xMin: -10, xMax: 10, yMin: -10, yMax: 10 },
    })),
    undo: () => {
      const prev = undoStackRef.current.pop();
      if (!prev) return;
      setGraph(prev);
      props.onStateChange({ tool, showAxis: prev.view.showAxis, showGrid: prev.view.showGrid, canUndo: undoStackRef.current.length > 0 });
    },
    addFunction: (expr) => {
      if (graph.functions.length >= MAX_FUNCTIONS) {
        return { ok: false, error: `Tối đa ${MAX_FUNCTIONS} hàm` };
      }
      const v = validate(expr);
      if (!v.ok) return { ok: false, error: v.error ?? 'Invalid' };
      const id = `f${idCounterRef.current++}`;
      const usedNames = graph.functions.map((f) => f.name);
      const usedColors = graph.functions.map((f) => f.color);
      const newFn: SerializedFunction = {
        id,
        name: nextFunctionName(usedNames),
        expression: expr,
        color: nextColor(usedColors),
        visible: true,
      };
      const usedParamNames = new Set(graph.parameters.map((p) => p.name));
      const newParams: SerializedParameter[] = [];
      for (const v2 of v.freeVars) {
        if (usedParamNames.has(v2)) continue;
        if (graph.parameters.length + newParams.length >= MAX_PARAMETERS) break;
        newParams.push({ name: v2, value: 1, min: -5, max: 5, step: 0.1 });
      }
      updateGraph((g) => ({
        ...g,
        functions: [...g.functions, newFn],
        parameters: [...g.parameters, ...newParams],
      }));
      setErrors((e) => ({ ...e, [id]: null }));
      return { ok: true, id };
    },
    commitFunctionExpression: (id, expr) => {
      const v = validate(expr);
      if (!v.ok) {
        setErrors((e) => ({ ...e, [id]: v.error ?? 'Invalid' }));
        return;
      }
      const usedParamNames = new Set(graph.parameters.map((p) => p.name));
      const newParams: SerializedParameter[] = [];
      for (const v2 of v.freeVars) {
        if (usedParamNames.has(v2)) continue;
        if (graph.parameters.length + newParams.length >= MAX_PARAMETERS) break;
        newParams.push({ name: v2, value: 1, min: -5, max: 5, step: 0.1 });
      }
      updateGraph((g) => ({
        ...g,
        functions: g.functions.map((f) =>
          f.id === id ? { ...f, expression: expr } : f,
        ),
        parameters: [...g.parameters, ...newParams],
      }));
      setErrors((e) => ({ ...e, [id]: null }));
    },
    toggleFunctionVisible: (id) =>
      updateGraph((g) => ({
        ...g,
        functions: g.functions.map((f) =>
          f.id === id ? { ...f, visible: !f.visible } : f,
        ),
      })),
    removeFunction: (id) =>
      updateGraph((g) => ({
        ...g,
        functions: g.functions.filter((f) => f.id !== id),
      })),
    setParameter: (name, value) =>
      setGraph((g) => ({
        ...g,
        parameters: g.parameters.map((p) =>
          p.name === name ? { ...p, value } : p,
        ),
      })),
    setParameterRange: (name, min, max, step) =>
      updateGraph((g) => ({
        ...g,
        parameters: g.parameters.map((p) =>
          p.name === name ? { ...p, min, max, step, value: Math.min(max, Math.max(min, p.value)) } : p,
        ),
      })),
    removeParameter: (name) =>
      updateGraph((g) => ({
        ...g,
        parameters: g.parameters.filter((p) => p.name !== name),
      })),
    getGraph: () => graph,
    getErrors: () => errors,
  };

  useImperativeHandle(ref, () => handle, [handle]);

  return (
    <div className="graph-editor-panel">
      <MiniBoard
        graph={graph}
        activeTool={tool}
        isDark={props.isDark}
        onBoardEvent={() => { /* TODO Task 14: wire tool events */ }}
      />
      {props.isMobile ? (
        <button
          type="button"
          aria-label="Mở bảng đại số"
          className="graph-drawer-toggle"
          onClick={props.onOpenDrawer}
        >
          ☰
        </button>
      ) : null}
      <div className="graph-editor-footer">
        <button type="button" className="graph-btn-insert" onClick={() => handle.insert()}>
          Chèn
        </button>
      </div>
    </div>
  );
});
```

- [ ] **Step 4: Chạy test confirm pass**

Run: `npx jest src/stamps/graph-2d/editor/__tests__/EditorPanel.test.tsx -v`
Expected: PASS 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/graph-2d/editor/EditorPanel.tsx src/stamps/graph-2d/editor/__tests__/EditorPanel.test.tsx
git commit -m "feat(graph-2d): EditorPanel orchestrator + state machine"
```

---

## Task 14: Tool interactions — handlers + MiniBoard wiring

**Files:**
- Create: `src/stamps/graph-2d/editor/handlers.ts`
- Modify: `src/stamps/graph-2d/editor/MiniBoard.tsx` (wire tool events)
- Modify: `src/stamps/graph-2d/editor/EditorPanel.tsx` (consume events, add point/intersect/tangent objects)

- [ ] **Step 1: Implement `handlers.ts`**

```ts
// src/stamps/graph-2d/editor/handlers.ts
import type { SerializedGraph, SerializedPoint, SerializedIntersection, SerializedTangent } from '../serialize';
import { compile } from '../parser';

export interface ClickContext {
  x: number;
  y: number;
  functionId?: string;
}

export function addPointOnCurve(
  graph: SerializedGraph,
  ctx: ClickContext,
  idFactory: () => string,
): SerializedGraph {
  if (!ctx.functionId) return graph;
  const point: SerializedPoint = {
    id: idFactory(),
    functionId: ctx.functionId,
    x: ctx.x,
  };
  return { ...graph, points: [...graph.points, point] };
}

export function addIntersection(
  graph: SerializedGraph,
  functionIdA: string,
  functionIdB: string,
  idFactory: () => string,
): SerializedGraph {
  if (functionIdA === functionIdB) return graph;
  // Avoid duplicates regardless of order
  const exists = graph.intersections.some(
    (i) =>
      (i.functionIdA === functionIdA && i.functionIdB === functionIdB) ||
      (i.functionIdA === functionIdB && i.functionIdB === functionIdA),
  );
  if (exists) return graph;
  const intersection: SerializedIntersection = {
    id: idFactory(),
    functionIdA,
    functionIdB,
  };
  return { ...graph, intersections: [...graph.intersections, intersection] };
}

export function addTangent(
  graph: SerializedGraph,
  pointId: string,
  idFactory: () => string,
): SerializedGraph {
  const exists = graph.tangents.some((t) => t.pointId === pointId);
  if (exists) return graph;
  const tangent: SerializedTangent = { id: idFactory(), pointId };
  return { ...graph, tangents: [...graph.tangents, tangent] };
}

/**
 * Numerical derivative via centered difference. Dùng cho tangent tool.
 */
export function numericalDerivative(
  expression: string,
  paramValues: Record<string, number>,
  x: number,
  h = 1e-4,
): number {
  const fn = compile(expression, paramValues);
  if (typeof fn !== 'function') return NaN;
  const y1 = fn(x - h);
  const y2 = fn(x + h);
  return (y2 - y1) / (2 * h);
}
```

- [ ] **Step 2: Tests cho handlers**

Create `src/stamps/graph-2d/editor/__tests__/handlers.test.ts`:

```ts
import { addPointOnCurve, addIntersection, addTangent, numericalDerivative } from '../handlers';
import { EMPTY_GRAPH } from '../../serialize';

const idFactory = () => 'gen-id-' + Math.random().toString(36).slice(2, 6);

describe('handlers', () => {
  it('addPointOnCurve thêm point với functionId', () => {
    const g = addPointOnCurve(EMPTY_GRAPH, { x: 2, y: 4, functionId: 'f1' }, () => 'p1');
    expect(g.points).toHaveLength(1);
    expect(g.points[0]).toMatchObject({ id: 'p1', functionId: 'f1', x: 2 });
  });

  it('addPointOnCurve không-op nếu thiếu functionId', () => {
    const g = addPointOnCurve(EMPTY_GRAPH, { x: 2, y: 4 }, idFactory);
    expect(g.points).toHaveLength(0);
  });

  it('addIntersection thêm pair', () => {
    const g = addIntersection(EMPTY_GRAPH, 'f1', 'f2', () => 'i1');
    expect(g.intersections).toHaveLength(1);
  });

  it('addIntersection skip duplicate', () => {
    let g = addIntersection(EMPTY_GRAPH, 'f1', 'f2', () => 'i1');
    g = addIntersection(g, 'f2', 'f1', () => 'i2');
    expect(g.intersections).toHaveLength(1);
  });

  it('addIntersection skip same function', () => {
    const g = addIntersection(EMPTY_GRAPH, 'f1', 'f1', idFactory);
    expect(g.intersections).toHaveLength(0);
  });

  it('addTangent thêm tangent từ point', () => {
    const g = addTangent(EMPTY_GRAPH, 'p1', () => 't1');
    expect(g.tangents).toHaveLength(1);
  });

  it('numericalDerivative tính f\'(x) = 2x cho x^2', () => {
    expect(numericalDerivative('x^2', {}, 3)).toBeCloseTo(6, 2);
  });
});
```

Run: `npx jest src/stamps/graph-2d/editor/__tests__/handlers.test.ts -v`
Expected: PASS 7 tests.

- [ ] **Step 3: Wire pointer events trong `MiniBoard.tsx`**

Replace handler stub trong useEffect setup của `MiniBoard.tsx` (sau khi `boardRef.current = board;` và `syncCurves(...)` đầu tiên) bằng:

```ts
      board.on('down', (ev: { clientX?: number; clientY?: number }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const [x, y] = (board as any).getUsrCoordsOfMouse(ev as unknown as MouseEvent);
        // Tìm curve dưới chuột
        let functionId: string | undefined;
        for (const [id, ref] of curvesRef.current) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if ((ref.obj as any).hasPoint && (ref.obj as any).hasPoint(ev.clientX ?? 0, ev.clientY ?? 0)) {
            functionId = id;
            break;
          }
        }
        if (functionId) onBoardEvent({ type: 'click-curve', functionId, x, y });
        else onBoardEvent({ type: 'click-empty', x, y });
      });
```

> Lưu ý: JSXGraph API `hasPoint(clientX, clientY)` dùng pixel coords. Adjust nếu API thực tế khác — test thủ công ở playground sẽ verify.

- [ ] **Step 4: Wire tool events trong `EditorPanel.tsx`**

Trong EditorPanel, thay `onBoardEvent={() => {}}` của MiniBoard thành state machine theo `tool`. Thêm refs để giữ "đã chọn curve A cho intersect":

```tsx
  const intersectFirstRef = useRef<string | null>(null);

  const onBoardEvent = useCallback((ev: BoardEvent) => {
    if (tool === 'point-on-curve' && ev.type === 'click-curve' && ev.functionId !== undefined && ev.x !== undefined) {
      updateGraph((g) => addPointOnCurve(g, { x: ev.x!, y: ev.y ?? 0, functionId: ev.functionId }, () => `p${idCounterRef.current++}`));
      setTool('move');
    } else if (tool === 'intersect' && ev.type === 'click-curve' && ev.functionId) {
      if (!intersectFirstRef.current) {
        intersectFirstRef.current = ev.functionId;
      } else {
        const a = intersectFirstRef.current;
        const b = ev.functionId;
        intersectFirstRef.current = null;
        updateGraph((g) => addIntersection(g, a, b, () => `i${idCounterRef.current++}`));
        setTool('move');
      }
    } else if (tool === 'tangent' && ev.type === 'click-curve' && ev.functionId !== undefined && ev.x !== undefined) {
      // Add a point + tangent atomically
      const pointId = `p${idCounterRef.current++}`;
      const tangentId = `t${idCounterRef.current++}`;
      updateGraph((g) => ({
        ...g,
        points: [...g.points, { id: pointId, functionId: ev.functionId!, x: ev.x! }],
        tangents: [...g.tangents, { id: tangentId, pointId }],
      }));
      setTool('move');
    }
  }, [tool, updateGraph]);
```

Import: `import { addPointOnCurve, addIntersection } from './handlers';` và `import type { BoardEvent } from './MiniBoard';`.

Truyền `onBoardEvent={onBoardEvent}` vào MiniBoard thay vì stub.

- [ ] **Step 5: Render points/intersections/tangents trong MiniBoard sync**

Mở rộng `syncCurves` (rename thành `syncObjects`) trong MiniBoard để cũng render `graph.points`, `graph.intersections`, `graph.tangents`:

```ts
// Trong syncObjects, sau khi xử lý functions:
for (const point of graph.points) {
  const fn = graph.functions.find((f) => f.id === point.functionId);
  if (!fn || !fn.visible) continue;
  const compiled = compile(fn.expression, paramMap);
  if (typeof compiled !== 'function') continue;
  const y = compiled(point.x);
  // Render point — simple version, không stable diff (recreate mỗi lần)
  board.create('point', [point.x, y], { name: point.label ?? '', size: 3, fillColor: fn.color, strokeColor: fn.color });
}
for (const inter of graph.intersections) {
  const fa = graph.functions.find((f) => f.id === inter.functionIdA);
  const fb = graph.functions.find((f) => f.id === inter.functionIdB);
  if (!fa || !fb || !fa.visible || !fb.visible) continue;
  const cfa = compile(fa.expression, paramMap);
  const cfb = compile(fb.expression, paramMap);
  if (typeof cfa !== 'function' || typeof cfb !== 'function') continue;
  // Brute scan domain để tìm tất cả roots của (fa-fb)
  const roots = scanRoots((x: number) => cfa(x) - cfb(x), graph.view.xMin, graph.view.xMax);
  for (const x of roots) {
    board.create('point', [x, cfa(x)], { size: 3, fillColor: '#000', strokeColor: '#000' });
  }
}
for (const tan of graph.tangents) {
  const pt = graph.points.find((p) => p.id === tan.pointId);
  if (!pt) continue;
  const fn = graph.functions.find((f) => f.id === pt.functionId);
  if (!fn || !fn.visible) continue;
  const slope = numericalDerivative(fn.expression, paramMap, pt.x);
  const cfn = compile(fn.expression, paramMap);
  if (typeof cfn !== 'function' || !Number.isFinite(slope)) continue;
  const y0 = cfn(pt.x);
  // y = slope*(x - pt.x) + y0  → 2 points đủ để vẽ line
  const x1 = graph.view.xMin;
  const x2 = graph.view.xMax;
  board.create('line', [[x1, slope * (x1 - pt.x) + y0], [x2, slope * (x2 - pt.x) + y0]], {
    strokeColor: fn.color,
    strokeWidth: 1,
    dash: 2,
    straightFirst: false,
    straightLast: false,
  });
}
```

Add helper `scanRoots` ở cuối file:

```ts
function scanRoots(fn: (x: number) => number, xMin: number, xMax: number, samples = 200): number[] {
  const roots: number[] = [];
  const step = (xMax - xMin) / samples;
  let prevX = xMin;
  let prevY = fn(prevX);
  for (let i = 1; i <= samples; i++) {
    const x = xMin + i * step;
    const y = fn(x);
    if (Number.isFinite(prevY) && Number.isFinite(y) && prevY * y < 0) {
      // bisection
      let a = prevX, b = x;
      for (let j = 0; j < 30; j++) {
        const m = (a + b) / 2;
        const ym = fn(m);
        if (Math.abs(ym) < 1e-6) { a = b = m; break; }
        if (prevY * ym < 0) b = m;
        else { a = m; prevY = ym; }
      }
      roots.push((a + b) / 2);
    }
    prevX = x;
    prevY = y;
  }
  return roots;
}
```

Import bổ sung trong MiniBoard.tsx:

```ts
import { numericalDerivative } from './handlers';
```

- [ ] **Step 6: Chạy toàn bộ tests**

Run: `npx jest src/stamps/graph-2d -v`
Expected: PASS toàn bộ. MiniBoard mock đủ rộng để render không crash.

- [ ] **Step 7: Commit**

```bash
git add src/stamps/graph-2d/editor/handlers.ts src/stamps/graph-2d/editor/__tests__/handlers.test.ts src/stamps/graph-2d/editor/MiniBoard.tsx src/stamps/graph-2d/editor/EditorPanel.tsx
git commit -m "feat(graph-2d): tool interactions (point-on-curve, intersect, tangent)"
```

---

## Task 15: Host + StampType (index.tsx)

**Files:**
- Create: `src/stamps/graph-2d/index.tsx`
- Create: `src/stamps/graph-2d/__tests__/index.test.tsx`

- [ ] **Step 1: Viết failing test**

```tsx
// src/stamps/graph-2d/__tests__/index.test.tsx
import { graph2dStamp, isGraph2DCustomData } from '../index';

describe('graph2dStamp', () => {
  it('kind = "graph2d"', () => {
    expect(graph2dStamp.kind).toBe('graph2d');
  });
  it('shortcutKey = "h"', () => {
    expect(graph2dStamp.shortcutKey).toBe('h');
  });
  it('matchesCustomData true cho data hợp lệ', () => {
    expect(graph2dStamp.matchesCustomData({ kind: 'graph2d', version: 1, jsonState: '{}' })).toBe(true);
  });
  it('matchesCustomData false cho data sai kind', () => {
    expect(graph2dStamp.matchesCustomData({ kind: 'geometry', version: 1 })).toBe(false);
  });
  it('isGraph2DCustomData guard', () => {
    expect(isGraph2DCustomData({ kind: 'graph2d', version: 1, jsonState: '{}' })).toBe(true);
    expect(isGraph2DCustomData({ kind: 'graph2d', version: 2, jsonState: '{}' })).toBe(false);
    expect(isGraph2DCustomData(null)).toBe(false);
    expect(isGraph2DCustomData(undefined)).toBe(false);
  });
});
```

- [ ] **Step 2: Chạy test confirm fail**

Run: `npx jest src/stamps/graph-2d/__tests__/index.test.tsx -v`
Expected: FAIL.

- [ ] **Step 3: Implement `index.tsx`**

```tsx
// src/stamps/graph-2d/index.tsx
'use client';

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { GraphLeftPanel } from './editor/LeftPanel';
import { GraphEditorPanel, type GraphEditorPanelHandle, type GraphState } from './editor/EditorPanel';
import { insertStampImage } from '../shared/insertImage';
import { renderGraph2dSvgFromState } from './render';
import { parseSerializedGraph, type SerializedGraph } from './serialize';
import type {
  BaseStampCustomData,
  RestoredStampFile,
  StampHostProps,
  StampHostHandle,
  StampType,
} from '../shared/types';
import { useIsMobile } from '../shared/useIsMobile';

export interface Graph2DCustomData extends BaseStampCustomData {
  kind: 'graph2d';
  version: 1;
  jsonState: string;
  svgWidth: number;
  svgHeight: number;
}

export function isGraph2DCustomData(data: unknown): data is Graph2DCustomData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Partial<Graph2DCustomData>;
  return d.kind === 'graph2d' && d.version === 1 && typeof d.jsonState === 'string';
}

const INITIAL_GRAPH_STATE: GraphState = {
  tool: 'move',
  showAxis: true,
  showGrid: true,
  canUndo: false,
};

const Graph2DStampHost = forwardRef<StampHostHandle, StampHostProps>(
  function Graph2DStampHost({ api, editingElement, onClose, isDark }, ref) {
    const panelRef = useRef<GraphEditorPanelHandle | null>(null);
    const [graphUIState, setGraphUIState] = useState<GraphState>(INITIAL_GRAPH_STATE);
    const { isMobile } = useIsMobile();
    const [drawerOpen, setDrawerOpen] = useState(false);

    const initialState = useMemo<SerializedGraph | null>(() => {
      if (!editingElement) return null;
      if (!isGraph2DCustomData(editingElement.customData)) return null;
      return parseSerializedGraph(editingElement.customData.jsonState);
    }, [editingElement]);

    const handleInsert = useCallback(
      async (jsonState: string, svgString: string) => {
        if (!api) return;
        try {
          await insertStampImage(api, {
            svgString,
            makeCustomData: (width, height): Graph2DCustomData => ({
              kind: 'graph2d',
              version: 1,
              jsonState,
              svgWidth: width,
              svgHeight: height,
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
        <GraphLeftPanel
          activeTool={graphUIState.tool}
          onToolChange={(t) => panelRef.current?.setTool(t)}
          showAxis={graphUIState.showAxis}
          showGrid={graphUIState.showGrid}
          onShowAxisChange={(b) => panelRef.current?.setShowAxis(b)}
          onShowGridChange={(b) => panelRef.current?.setShowGrid(b)}
          onResetView={() => panelRef.current?.resetView()}
          onUndo={() => panelRef.current?.undo()}
          canUndo={graphUIState.canUndo}
          onClose={onClose}
          isDark={isDark}
          isMobile={isMobile}
          drawerOpen={drawerOpen}
          onDrawerClose={() => setDrawerOpen(false)}
          graph={panelRef.current?.getGraph() ?? { version: 1, view: { xMin: -10, xMax: 10, yMin: -10, yMax: 10, showAxis: true, showGrid: true }, functions: [], parameters: [], points: [], intersections: [], tangents: [] }}
          errors={panelRef.current?.getErrors() ?? {}}
          onAddFunctionDraft={() => {
            const result = panelRef.current?.addFunction('x');
            if (result && !result.ok) console.warn('addFunction failed:', result.error);
          }}
          onCommitFunctionExpr={(id, expr) => panelRef.current?.commitFunctionExpression(id, expr)}
          onToggleFunctionVisible={(id) => panelRef.current?.toggleFunctionVisible(id)}
          onRemoveFunction={(id) => panelRef.current?.removeFunction(id)}
          onParameterChange={(name, v) => panelRef.current?.setParameter(name, v)}
          onParameterRangeChange={(name, min, max, step) =>
            panelRef.current?.setParameterRange(name, min, max, step)
          }
          onRemoveParameter={(name) => panelRef.current?.removeParameter(name)}
        />
        <GraphEditorPanel
          ref={panelRef}
          initialState={initialState}
          onInsert={handleInsert}
          onClose={onClose}
          onStateChange={setGraphUIState}
          withLeftPanel={!isMobile}
          isDark={isDark}
          isMobile={isMobile}
          onOpenDrawer={() => setDrawerOpen(true)}
        />
      </>
    );
  },
);

const Graph2DIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 21 V3" />
    <path d="M3 21 H21" />
    <path d="M5 19 C8 5, 14 5, 19 17" />
  </svg>
);

export const graph2dStamp: StampType = {
  kind: 'graph2d',
  shortcutKey: 'h',
  toolbarLabel: 'H',
  toolbarTitle: 'Chèn đồ thị 2D (H)',
  toolbarIcon: Graph2DIcon,
  toolbarTestId: 'stamp-toolbar-graph2d',
  matchesCustomData: isGraph2DCustomData,
  async renderSvgFromCustomData(data) {
    if (!isGraph2DCustomData(data)) {
      throw new Error('graph2dStamp.renderSvgFromCustomData: customData không phải graph2d');
    }
    return renderGraph2dSvgFromState(data.jsonState);
  },
  async restoreFileFromCustomData(element): Promise<RestoredStampFile | null> {
    const data = element.customData as Graph2DCustomData | undefined;
    const fileId = (element as { fileId?: string | null }).fileId;
    if (!data || !fileId) return null;
    if (!isGraph2DCustomData(data)) return null;
    const svgString = await renderGraph2dSvgFromState(data.jsonState);
    const utf8 = unescape(encodeURIComponent(svgString));
    const dataURL =
      'data:image/svg+xml;base64,' +
      (typeof btoa !== 'undefined' ? btoa(utf8) : Buffer.from(utf8).toString('base64'));
    return { fileId, dataURL, mimeType: 'image/svg+xml' };
  },
  Host: Graph2DStampHost,
};
```

> Lưu ý: Host pass `panelRef.current?.getGraph()` vào LeftPanel, nhưng khi đầu render ref chưa có. Vì vậy fallback empty graph là cần thiết. Một cải tiến sau khi MVP chạy là refactor LeftPanel để subscribe state qua props từ EditorPanel `onStateChange`. Để chạy được phase 1, dùng workaround re-render: thêm 1 state `graphSnapshot` trong Host, update qua callback từ EditorPanel.

Refactor: thay `panelRef.current?.getGraph()` bằng state `graphSnapshot` + thêm callback `onGraphChange` vào EditorPanel.

Modify `EditorPanel.tsx`:

```ts
// Thêm prop:
onGraphChange?: (g: SerializedGraph) => void;

// Trong updateGraph + setParameter + setGraph wrappers, gọi:
props.onGraphChange?.(next);
```

Modify `index.tsx`:

```tsx
const [graphSnapshot, setGraphSnapshot] = useState<SerializedGraph>(initialState ?? EMPTY_GRAPH /* import từ serialize */);
const [errorsSnapshot, setErrorsSnapshot] = useState<Record<string, string | null>>({});

// Pass:
graph={graphSnapshot}
errors={errorsSnapshot}

// EditorPanel:
onGraphChange={setGraphSnapshot}
onErrorsChange={setErrorsSnapshot}
```

Modify `EditorPanel.tsx`: thêm prop `onErrorsChange` và call sau mỗi `setErrors`.

> Đây là pattern lift-up state — Host cần biết graph để render AlgebraView. Done correctly, không cần ref hack.

- [ ] **Step 4: Chạy tests**

Run: `npx jest src/stamps/graph-2d -v`
Expected: PASS toàn bộ.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/graph-2d/index.tsx src/stamps/graph-2d/__tests__/index.test.tsx src/stamps/graph-2d/editor/EditorPanel.tsx
git commit -m "feat(graph-2d): Host + StampType + customData guard"
```

---

## Task 16: Registry wire-up + public API

**Files:**
- Modify: `src/stamps/shared/registry.ts`
- Modify: `src/stamps/index.ts`

- [ ] **Step 1: Edit `registry.ts`**

```ts
// src/stamps/shared/registry.ts
import { geometryStamp } from '../geometry-2d';
import { latexStamp } from '../latex';
import { geometry3dStamp } from '../geometry-3d';
import { graph2dStamp } from '../graph-2d';
import type { StampType } from './types';

export { geometryStamp, type GeometryCustomData, isGeometryCustomData } from '../geometry-2d';
export { latexStamp, type LatexCustomData, isLatexCustomData } from '../latex';
export {
  geometry3dStamp,
  type Geometry3DCustomData,
  isGeometry3DCustomData,
} from '../geometry-3d';
export { graph2dStamp, type Graph2DCustomData, isGraph2DCustomData } from '../graph-2d';
export type { StampType, BaseStampCustomData } from './types';

export const DEFAULT_STAMPS: ReadonlyArray<StampType> = Object.freeze([
  geometryStamp,
  latexStamp,
  geometry3dStamp,
  graph2dStamp,
]);

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

- [ ] **Step 2: Edit `src/stamps/index.ts`** (re-export)

Add nếu chưa có:

```ts
export {
  graph2dStamp,
  type Graph2DCustomData,
  isGraph2DCustomData,
} from './graph-2d';
```

- [ ] **Step 3: Chạy typecheck + tests**

```bash
npm run typecheck
npm test
```
Expected: PASS toàn bộ.

- [ ] **Step 4: Commit**

```bash
git add src/stamps/shared/registry.ts src/stamps/index.ts
git commit -m "feat(graph-2d): wire vào registry + public API"
```

---

## Task 17: CSS + visual polish

**Files:**
- Modify: `src/stamps/shared/stamp.css` (append)

> Append styling cho `.graph-*` classes — mirror conventions geometry-2d. Pull palette từ CSS variables Excalidraw nếu có, fallback hex.

- [ ] **Step 1: Append vào `src/stamps/shared/stamp.css`**

```css
/* === graph-2d styles === */
.graph-left-panel {
  display: flex;
  flex-direction: column;
  width: 280px;
  flex-shrink: 0;
  background: var(--color-surface-low, #f9fafb);
  border-right: 1px solid var(--color-border, #e5e7eb);
  font-family: var(--ui-font, system-ui);
}
.graph-left-panel.is-mobile {
  position: fixed;
  top: 0; left: 0; bottom: 0;
  z-index: 50;
  box-shadow: 2px 0 8px rgba(0,0,0,0.2);
  transition: transform 0.2s ease;
}
.graph-left-panel.is-mobile.is-closed {
  transform: translateX(-100%);
}
.graph-tool-strip {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 4px;
  padding: 8px;
  border-bottom: 1px solid var(--color-border, #e5e7eb);
}
.graph-tool-btn {
  width: 36px; height: 36px;
  display: flex; align-items: center; justify-content: center;
  background: white;
  border: 1px solid var(--color-border, #d1d5db);
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}
.graph-tool-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.graph-tool-btn.is-active {
  background: #dbeafe;
  border-color: #2563eb;
}
.graph-tool-strip-sep {
  width: 100%; height: 1px; background: var(--color-border, #e5e7eb); margin: 4px 0;
}
.graph-algebra-view {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}
.graph-algebra-section { margin-bottom: 12px; }
.graph-function-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 4px;
  border-bottom: 1px solid var(--color-border-light, #f3f4f6);
  font-family: ui-monospace, Menlo, monospace;
  font-size: 12px;
  position: relative;
}
.graph-function-row.is-error { background: #fef2f2; }
.graph-function-color {
  width: 10px; height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.graph-function-name { white-space: nowrap; }
.graph-function-input {
  flex: 1; min-width: 0;
  background: white;
  border: 1px solid var(--color-border, #d1d5db);
  border-radius: 3px;
  padding: 2px 4px;
  font-family: ui-monospace, monospace;
  font-size: 12px;
}
.graph-function-eye, .graph-function-remove {
  width: 22px; height: 22px;
  background: transparent;
  border: none;
  cursor: pointer;
  opacity: 0.6;
}
.graph-function-eye.is-hidden { opacity: 1; color: #999; }
.graph-function-error {
  position: absolute;
  left: 24px; right: 24px;
  bottom: -16px;
  font-size: 10px;
  color: #b91c1c;
}
.graph-algebra-add {
  width: 100%;
  padding: 6px;
  background: white;
  border: 1px dashed var(--color-border, #9ca3af);
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  margin-top: 8px;
}
.graph-algebra-add:disabled { opacity: 0.4; cursor: not-allowed; }
.graph-slider-row {
  padding: 6px 4px;
  border-bottom: 1px solid var(--color-border-light, #f3f4f6);
}
.graph-slider-header {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-family: ui-monospace, monospace;
}
.graph-slider-name { font-weight: 600; }
.graph-slider-value { color: #6b7280; }
.graph-slider-remove {
  margin-left: auto;
  width: 18px; height: 18px;
  background: transparent;
  border: none;
  cursor: pointer;
  opacity: 0.5;
}
.graph-slider-input {
  width: 100%;
  margin-top: 4px;
}
.graph-slider-range {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #9ca3af;
}
.graph-editor-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  background: white;
}
.graph-miniboard { flex: 1; min-height: 0; }
.graph-editor-footer {
  display: flex;
  justify-content: flex-end;
  padding: 8px;
  border-top: 1px solid var(--color-border, #e5e7eb);
  gap: 8px;
}
.graph-btn-insert {
  background: #2563eb;
  color: white;
  border: none;
  padding: 6px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
}
.graph-btn-cancel {
  background: white;
  border: 1px solid #d1d5db;
  padding: 6px 16px;
  border-radius: 4px;
  cursor: pointer;
}
.graph-drawer-toggle {
  position: absolute;
  top: 8px; left: 8px;
  z-index: 10;
  width: 36px; height: 36px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  cursor: pointer;
  font-size: 18px;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/stamps/shared/stamp.css
git commit -m "feat(graph-2d): CSS styling"
```

---

## Task 18: Playground demo + end-to-end manual verification

**Files:**
- Modify: `playground/<demo file>` — add example invoking graph-2d stamp
- Run: dev server + manual verify

> Pattern: tìm trong `playground/` file demo hiện tại của geometry-2d. Add 1 ví dụ tương tự cho graph-2d.

- [ ] **Step 1: Khám phá playground hiện tại**

Run: `ls playground/ && find playground -name "*.tsx" -type f | head -10`

Đọc file demo chính (thường `playground/App.tsx` hoặc tương tự). Note pattern khởi tạo stamp.

- [ ] **Step 2: Add demo nút "Insert graph"**

Trong file demo chính, add 1 nút (hoặc note rằng toolbar đã có sẵn từ DEFAULT_STAMPS) hướng dẫn user nhấn `H` để mở graph editor.

> Nếu playground tự động hiển thị toolbar từ registry thì không cần edit file nào — graph-2d sẽ tự xuất hiện.

- [ ] **Step 3: Run dev server**

```bash
npm run demo
```

Mở browser. Verify (ghi screenshot mỗi step để confirm):

1. Toolbar có 4 stamp button: 📐 G, ∑ L, 📐 3, 📈 H.
2. Nhấn `H` → editor mở fullscreen.
3. Click "+ Thêm hàm" → row hiện với expression `x`.
4. Sửa expression thành `x^2` + Enter → curve hiện trên board.
5. Sửa thành `a*x + b` + Enter → row mới + 2 sliders cho `a, b`.
6. Drag slider `a` → curve cập nhật real-time.
7. Toggle axis/grid button → board cập nhật.
8. Drag empty area trên board → pan.
9. Wheel zoom → ok.
10. Nhấn "Chèn" → editor đóng, ảnh xuất hiện trên whiteboard.
11. Double-click ảnh → editor mở lại với state cũ (graph + sliders).
12. Sửa, nhấn Chèn → ảnh cũ được replace.
13. Reload page → ảnh vẫn còn (restoreFileFromCustomData).
14. Switch dark/light → ảnh thay đổi.
15. Test interactive tools: `point-on-curve`, `intersect`, `tangent`.

- [ ] **Step 4: Run full test suite + typecheck + build**

```bash
npm test
npm run typecheck
npm run build
```

Expected: tất cả PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(graph-2d): playground demo + end-to-end verification"
```

- [ ] **Step 6: Final summary**

Tag release nếu muốn:

```bash
npm version minor                # 0.6.2 → 0.7.0
git push --follow-tags
```

---

## Spec coverage check

| Spec section | Implemented in task(s) |
|---|---|
| §3.1 Vị trí registry | Task 16 |
| §3.2 Cây file | Task 1–17 |
| §4.1 SerializedGraph types | Task 4 |
| §4.2 Quy tắc lưu trữ (cap 8) | Task 1 (constants) + Task 13 (enforce) |
| §4.3 Custom data | Task 15 |
| §4.4 Versioning | Task 4 (parseSerializedGraph reject version mismatch) |
| §5.1 Cây component | Task 8–15 |
| §5.2 Host responsibilities | Task 15 |
| §5.3 EditorPanel handle | Task 13 |
| §5.4 Mutation flow thêm function | Task 13 (addFunction) |
| §5.5 Tool state machine | Task 7 (enum) + Task 14 (wiring) |
| §5.6 Undo | Task 13 (undoStackRef) |
| §6.1 Insert flow | Task 13 (insert) + Task 15 (handleInsert) |
| §6.2 Restore flow | Task 15 (restoreFileFromCustomData) |
| §6.3 Re-edit flow | Task 15 (initialState parse) |
| §7 Parser | Task 2, 3 |
| §8 Error handling | Task 8 (FunctionRow error), Task 13 (errors map), Task 6 (parse fail) |
| §9 Mobile UX | Task 12 (LeftPanel mobile flag) + Task 15 (drawer state) |
| §10 Testing | Task 1–15 (mỗi task có test) |
| §11 Implementation order | Plan này |
| §12 Risks | §7.3 documented in code comments |
| §13 Quyết định nhỏ (palette, cap, auto-name) | Task 1, 13 |
| §14 Public API | Task 16 |
