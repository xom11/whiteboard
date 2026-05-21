# Shared JSXGraph Offscreen Render Helper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract shared offscreen JSXGraph render boilerplate from 3 stamps (geometry-2d, geometry-3d, graph-2d) into one helper at `src/stamps/shared/jxgOffscreenRender.ts`, and bump intrinsic SVG resolution for geometry-3d + graph-2d so inserted stamps remain sharp when scaled / on retina displays.

**Architecture:** Helper takes `{ bbox, dims, axis, grid, keepAspectRatio, applyOptions, setup, postProcessSvg }` — owns offscreen DIV lifecycle, lazy JSXGraph import, initBoard, board.update, SVG clone+serialize, teardown (renderer.dispose + freeBoard + removeChild). Caller's `setup(board, JXG)` returns a disposable (the renderer) and is the only place per-stamp logic lives (view3d for 3D, attach 2D renderer, etc). Public render function signatures (`renderGeometrySvgFromState`, `renderGeometry3DSvgFromState`, `renderGraphSvgFromState`) stay unchanged for backward compat — refactor is internal.

**Tech Stack:** TypeScript strict, JSXGraph (lazy `await import('jsxgraph')`), Jest 29 + ts-jest + jsdom, existing `JxgRenderer` / `JxgRenderer3D` from `src/core/scene/render/`.

---

## File Structure

**Create:**
- `src/stamps/shared/jxgOffscreenRender.ts` — shared helper (~90 lines)
- `src/stamps/shared/__tests__/jxgOffscreenRender.test.ts` — unit tests with mocked jsxgraph

**Modify:**
- `src/stamps/geometry-2d/render.ts` — delegate to shared helper (intrinsic dim bump already applied earlier in session: PIXELS_PER_UNIT=60, MIN=300, MAX=3600, fallback 1200×900)
- `src/stamps/geometry-3d/render.ts` — delegate to shared helper + bump intrinsic dims 1024×768 → 2048×1536
- `src/stamps/graph-2d/render.ts` — delegate to shared helper + bump default dims 600×400 → 1800×1200

**Untouched:**
- `src/stamps/latex/render.ts` — KaTeX render, not JSXGraph; out of scope
- All call sites (`index.tsx`, `EditorPanel.tsx` for each stamp) — public signatures preserved
- `src/stamps/geometry-2d/renderInline.ts` — still used elsewhere, leave alone

---

## Task 1: Create shared helper module + first test

**Files:**
- Create: `src/stamps/shared/jxgOffscreenRender.ts`
- Create: `src/stamps/shared/__tests__/jxgOffscreenRender.test.ts`

- [ ] **Step 1: Write the failing test (smoke + offscreen DIV lifecycle)**

Create `src/stamps/shared/__tests__/jxgOffscreenRender.test.ts`:

```ts
/**
 * @jest-environment jsdom
 */
import { renderJsxgOffscreen } from '../jxgOffscreenRender';

// Mock jsxgraph: stub initBoard to inject an <svg> into the container div so
// renderJsxgOffscreen can clone+serialize it. freeBoard is a no-op spy.
jest.mock('jsxgraph', () => {
  const freeBoard = jest.fn();
  const initBoard = jest.fn((containerId: string) => {
    const container = document.getElementById(containerId);
    if (!container) throw new Error('container missing');
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', '100');
    svg.setAttribute('height', '50');
    container.appendChild(svg);
    return { update: jest.fn(), __board: true };
  });
  return {
    __esModule: true,
    default: {
      JSXGraph: { initBoard, freeBoard },
      Options: {},
    },
  };
});

describe('renderJsxgOffscreen', () => {
  afterEach(() => {
    // Ensure no leaked offscreen containers
    document.querySelectorAll('[id^="jxg_offscreen_"]').forEach((el) => el.remove());
  });

  it('returns serialized SVG with xmlns and width/height from dims', async () => {
    const disposeSpy = jest.fn();
    const result = await renderJsxgOffscreen({
      bbox: [-10, 10, 10, -10],
      dims: { width: 400, height: 300 },
      setup: () => ({ dispose: disposeSpy }),
    });
    expect(result.width).toBe(400);
    expect(result.height).toBe(300);
    expect(result.svgString).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(disposeSpy).toHaveBeenCalledTimes(1);
  });

  it('removes offscreen container after render (success path)', async () => {
    await renderJsxgOffscreen({
      bbox: [-10, 10, 10, -10],
      dims: { width: 200, height: 200 },
      setup: () => ({ dispose: () => undefined }),
    });
    expect(document.querySelectorAll('[id^="jxg_offscreen_"]').length).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/stamps/shared/__tests__/jxgOffscreenRender.test.ts`
Expected: FAIL — `Cannot find module '../jxgOffscreenRender'`

- [ ] **Step 3: Create the helper module**

Create `src/stamps/shared/jxgOffscreenRender.ts`:

```ts
/**
 * Shared offscreen JSXGraph render pipeline.
 *
 * Each JSXGraph stamp (geometry-2d, geometry-3d, graph-2d) needs the same
 * boilerplate to dump SVG offscreen: lazy import JSXGraph, create a hidden
 * DIV with explicit pixel dimensions, initBoard, attach a scene-store renderer
 * (or create a view3d), force update, clone the SVG node, add xmlns, serialize,
 * then tear everything down. This helper owns that lifecycle so each stamp
 * only writes the unique part — what to render — inside `setup`.
 *
 * Intrinsic SVG resolution matters: Excalidraw loads stamp SVGs via <img> then
 * drawImage onto canvas. The browser rasterizes SVG at its intrinsic
 * width/height, so dims passed here should be generous enough that the bitmap
 * downscales (sharp) instead of upscales (blurry) when the user zooms or views
 * on a retina display.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JxgModule = any;

export interface JxgOffscreenRenderOpts {
  /** JSXGraph bounding box: [xmin, ymax, xmax, ymin]. */
  bbox: [number, number, number, number];
  /** Offscreen container size in CSS pixels. Becomes SVG intrinsic size. */
  dims: { width: number; height: number };
  axis?: boolean;
  grid?: boolean;
  keepAspectRatio?: boolean;
  /** Mutate JXG.Options before initBoard (e.g. text.display='internal', palette). */
  applyOptions?: (JXG: JxgModule) => void;
  /**
   * Build the scene on the board. Return a disposable (typically the
   * `JxgRenderer` or `JxgRenderer3D` instance) — its `dispose()` is invoked
   * during teardown before `freeBoard`.
   */
  setup: (board: unknown, JXG: JxgModule) => { dispose: () => void } | Promise<{ dispose: () => void }>;
  /** Optional mutation on the cloned <svg> before serialization. */
  postProcessSvg?: (clone: SVGElement) => void;
}

export interface JxgOffscreenRenderResult {
  svgString: string;
  width: number;
  height: number;
}

export async function renderJsxgOffscreen(
  opts: JxgOffscreenRenderOpts,
): Promise<JxgOffscreenRenderResult> {
  const { bbox, dims, axis = false, grid = false, keepAspectRatio = true } = opts;
  const JXG: JxgModule = (await import('jsxgraph')).default;

  if (opts.applyOptions) {
    try {
      opts.applyOptions(JXG);
    } catch {
      /* swallow option-apply errors */
    }
  }

  const containerId =
    'jxg_offscreen_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  const container = document.createElement('div');
  container.id = containerId;
  container.style.cssText =
    `position:absolute;top:-99999px;left:-99999px;` +
    `width:${dims.width}px;height:${dims.height}px;` +
    `visibility:hidden;pointer-events:none;`;
  document.body.appendChild(container);

  let board: unknown = null;
  let disposable: { dispose: () => void } | null = null;
  try {
    board = JXG.JSXGraph.initBoard(containerId, {
      boundingbox: bbox,
      axis,
      grid,
      keepAspectRatio,
      showCopyright: false,
      showNavigation: false,
    });
    disposable = await opts.setup(board, JXG);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (board as any)?.update?.();
    } catch {
      /* ignore — board may already be in valid state */
    }

    const svgEl = container.querySelector('svg');
    if (!svgEl) throw new Error('renderJsxgOffscreen: no SVG produced by JSXGraph');
    const clone = svgEl.cloneNode(true) as SVGElement;
    if (!clone.getAttribute('xmlns')) {
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }
    if (opts.postProcessSvg) opts.postProcessSvg(clone);
    const svgString = new XMLSerializer().serializeToString(clone);
    return { svgString, width: dims.width, height: dims.height };
  } finally {
    try {
      disposable?.dispose();
    } catch {
      /* ignore */
    }
    try {
      if (board) JXG.JSXGraph.freeBoard(board);
    } catch {
      /* ignore */
    }
    if (container.parentNode) container.parentNode.removeChild(container);
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/stamps/shared/__tests__/jxgOffscreenRender.test.ts`
Expected: PASS — both `it` blocks green.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/shared/jxgOffscreenRender.ts src/stamps/shared/__tests__/jxgOffscreenRender.test.ts
git commit -m "feat(stamps/shared): extract renderJsxgOffscreen helper"
```

---

## Task 2: Helper — teardown on setup error + postProcessSvg + applyOptions

**Files:**
- Modify: `src/stamps/shared/__tests__/jxgOffscreenRender.test.ts:33-49` (extend describe block)

- [ ] **Step 1: Add three more failing tests inside the existing `describe`**

Append inside the existing `describe('renderJsxgOffscreen', () => { ... })`, after the last `it` block:

```ts
  it('removes offscreen container even when setup throws', async () => {
    await expect(
      renderJsxgOffscreen({
        bbox: [-10, 10, 10, -10],
        dims: { width: 200, height: 200 },
        setup: () => {
          throw new Error('boom');
        },
      }),
    ).rejects.toThrow('boom');
    expect(document.querySelectorAll('[id^="jxg_offscreen_"]').length).toBe(0);
  });

  it('runs applyOptions before initBoard', async () => {
    const calls: string[] = [];
    await renderJsxgOffscreen({
      bbox: [-10, 10, 10, -10],
      dims: { width: 200, height: 200 },
      applyOptions: () => calls.push('apply'),
      setup: () => {
        calls.push('setup');
        return { dispose: () => undefined };
      },
    });
    expect(calls).toEqual(['apply', 'setup']);
  });

  it('runs postProcessSvg on the cloned SVG before serialization', async () => {
    const result = await renderJsxgOffscreen({
      bbox: [-10, 10, 10, -10],
      dims: { width: 200, height: 200 },
      setup: () => ({ dispose: () => undefined }),
      postProcessSvg: (clone) => {
        clone.setAttribute('data-stamp', 'test');
        clone.setAttribute('width', '999');
      },
    });
    expect(result.svgString).toContain('data-stamp="test"');
    expect(result.svgString).toContain('width="999"');
  });
```

- [ ] **Step 2: Run the test file to confirm new tests fail OR pass**

Run: `npx jest src/stamps/shared/__tests__/jxgOffscreenRender.test.ts`
Expected: All 5 tests PASS (helper already implements these behaviors; tests lock them in as contracts).

If any test fails, fix the helper (not the test) — the helper's `finally` block must run for setup errors; `applyOptions` must precede `initBoard`; `postProcessSvg` must run on the clone before `XMLSerializer.serializeToString`.

- [ ] **Step 3: Commit**

```bash
git add src/stamps/shared/__tests__/jxgOffscreenRender.test.ts
git commit -m "test(stamps/shared): cover setup error teardown, applyOptions order, postProcessSvg"
```

---

## Task 3: Migrate geometry-2d render to shared helper

**Files:**
- Modify: `src/stamps/geometry-2d/render.ts` (full body of `renderGeometrySvgFromState`)
- Tests: `src/stamps/geometry-2d/__tests__/render.test.ts` already exists (dim helper only — keep as-is)

- [ ] **Step 1: Confirm dim test still passes (baseline)**

Run: `npx jest src/stamps/geometry-2d/__tests__/render.test.ts`
Expected: 8 PASS (already updated earlier in session with bumped constants).

- [ ] **Step 2: Replace `renderGeometrySvgFromState` body with shared helper call**

In `src/stamps/geometry-2d/render.ts`, replace the entire `renderGeometrySvgFromState` function (currently lines 63-123) with:

```ts
export async function renderGeometrySvgFromState(jsonState: string): Promise<string> {
  const parsed = deserializeBoard(JSON.parse(jsonState));
  // Stamps inserted vào Excalidraw canvas → luôn dùng light palette.
  // Excalidraw's THEME_FILTER tự đảo nét trong dark mode.
  const palette = paletteFor(false);
  const dims = containerDimsForBbox(parsed.bbox);
  const { svgString } = await renderJsxgOffscreen({
    bbox: parsed.bbox,
    dims,
    axis: !!parsed.showAxis,
    grid: !!parsed.showGrid,
    keepAspectRatio: true,
    applyOptions: (JXG) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const opts = (JXG as any).Options;
      if (!opts) return;
      opts.text = opts.text || {};
      opts.text.display = 'internal';
      opts.text.useASCIIMathML = false;
      opts.text.useMathJax = false;
      opts.text.useKatex = false;
      opts.text.strokeColor = palette.label;
      opts.label = opts.label || {};
      opts.label.display = 'internal';
      opts.label.strokeColor = palette.label;
      opts.axis = opts.axis || {};
      opts.axis.strokeColor = palette.axis;
      opts.grid = opts.grid || {};
      opts.grid.strokeColor = palette.grid;
    },
    setup: (board) => {
      const store = createStore(parsed.state);
      return new JxgRenderer(store, board);
    },
  });
  return svgString;
}
```

- [ ] **Step 3: Replace imports at top of file**

In `src/stamps/geometry-2d/render.ts`, replace the import block (currently lines 1-6):

```ts
import { renderGeometryToSvg } from './renderInline';
import { deserializeBoard } from './serialize';
import { paletteFor } from './editor/theme';
import { safeJsx } from '../shared/safeJsx';
import { createStore } from '../../core/scene';
import { JxgRenderer } from '../../core/scene/render/JxgRenderer';
```

with (drop `renderGeometryToSvg` and `safeJsx` — both no longer used here; add the shared helper):

```ts
import { deserializeBoard } from './serialize';
import { paletteFor } from './editor/theme';
import { createStore } from '../../core/scene';
import { JxgRenderer } from '../../core/scene/render/JxgRenderer';
import { renderJsxgOffscreen } from '../shared/jxgOffscreenRender';
```

- [ ] **Step 4: Run typecheck + geometry-2d tests**

Run: `npm run typecheck && npx jest src/stamps/geometry-2d`
Expected: typecheck PASS, jest PASS for all geometry-2d tests (render dim helper + any other geometry-2d unit tests).

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/render.ts
git commit -m "refactor(stamps/geometry-2d): use shared renderJsxgOffscreen helper"
```

---

## Task 4: Migrate graph-2d render to shared helper + bump default dims

**Files:**
- Modify: `src/stamps/graph-2d/render.ts` (full body)

- [ ] **Step 1: Replace file contents**

Overwrite `src/stamps/graph-2d/render.ts` with:

```ts
// src/stamps/graph-2d/render.ts
// Offscreen SVG export từ graph2d State. Dùng cho insert/restore stamp.
//
// LƯU Ý: Luôn dùng light palette — Excalidraw tự invert trong dark mode.
// Intrinsic dims default 1800×1200 (bumped từ 600×400) để stamp sắc nét khi
// zoom hoặc trên màn retina; caller có thể override qua args.
import type { State } from '../../core/scene/types';
import { createStore } from '../../core/scene/store';
import { JxgRenderer } from '../../core/scene/render/JxgRenderer';
import { paletteFor } from './editor/theme';
import { renderJsxgOffscreen } from '../shared/jxgOffscreenRender';

const DEFAULT_WIDTH = 1800;
const DEFAULT_HEIGHT = 1200;

export async function renderGraphSvgFromState(
  state: State,
  _isDark: boolean,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
): Promise<string> {
  const palette = paletteFor(false);
  const view = state.meta.view;
  const bbox: [number, number, number, number] = [
    view?.xMin ?? -10,
    view?.yMax ?? 10,
    view?.xMax ?? 10,
    view?.yMin ?? -10,
  ];
  try {
    const { svgString } = await renderJsxgOffscreen({
      bbox,
      dims: { width, height },
      axis: view?.showAxis ?? true,
      grid: view?.showGrid ?? true,
      keepAspectRatio: false,
      applyOptions: (JXG) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const opts = (JXG as any).Options;
        if (!opts) return;
        opts.text = opts.text || {};
        opts.text.display = 'internal';
        opts.text.useASCIIMathML = false;
        opts.text.useMathJax = false;
        opts.text.useKatex = false;
        opts.text.strokeColor = palette.label;
        opts.label = opts.label || {};
        opts.label.display = 'internal';
        opts.label.strokeColor = palette.label;
        opts.axis = opts.axis || {};
        opts.axis.strokeColor = palette.axis;
        opts.grid = opts.grid || {};
        opts.grid.strokeColor = palette.grid;
      },
      setup: (board) => {
        const store = createStore(state);
        return new JxgRenderer(store, board);
      },
    });
    return svgString;
  } catch {
    // Match old contract: callers expect '' when no SVG produced.
    return '';
  }
}
```

- [ ] **Step 2: Run typecheck + graph-2d tests**

Run: `npm run typecheck && npx jest src/stamps/graph-2d`
Expected: typecheck PASS, jest PASS (no existing render.test.ts for graph-2d; other graph-2d tests must remain green).

- [ ] **Step 3: Commit**

```bash
git add src/stamps/graph-2d/render.ts
git commit -m "refactor(stamps/graph-2d): use shared helper + bump intrinsic dims 600x400 -> 1800x1200"
```

---

## Task 5: Migrate geometry-3d render to shared helper + bump intrinsic dims

**Files:**
- Modify: `src/stamps/geometry-3d/render.ts` (full body)

- [ ] **Step 1: Replace file contents**

Overwrite `src/stamps/geometry-3d/render.ts` with:

```ts
"use client";

import { parseSerializedBoard3D, type SerializedView3D } from './serialize';
import { createStore } from '../../core/scene';
import { JxgRenderer3D } from '../../core/scene/render/JxgRenderer3D';
import { DEFAULT_VIEW3D, GROUND_PLANE_ATTRS, GROUND_PLANE_RANGE, VIEW3D_ATTRS } from './editor/theme';
import { renderJsxgOffscreen } from '../shared/jxgOffscreenRender';

export interface RenderResult {
  svgString: string;
  width: number;
  height: number;
}

// Bumped từ 1024×768 → 2048×1536 (2x) để stamp sắc nét trên retina + khi zoom.
// SVG intrinsic size truyền vào <img> rồi drawImage; upscale từ bitmap nội tại
// nhỏ là nguyên nhân chính của mờ.
const OUTPUT_WIDTH = 2048;
const OUTPUT_HEIGHT = 1536;
const BBOX_2D: [number, number, number, number] = [-6, 6, 6, -6];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JxgObj = any;

export async function renderGeometry3DSvgFromState(jsonState: string): Promise<RenderResult> {
  let parsed: { state: ReturnType<typeof parseSerializedBoard3D>['state']; view?: SerializedView3D };
  try {
    parsed = parseSerializedBoard3D(JSON.parse(jsonState));
  } catch {
    parsed = parseSerializedBoard3D(null);
  }
  const view3DInfo: SerializedView3D = parsed.view ?? {
    azimuth: DEFAULT_VIEW3D.azimuth,
    elevation: DEFAULT_VIEW3D.elevation,
    bbox3D: [...DEFAULT_VIEW3D.bbox3D] as [number, number, number, number, number, number],
  };

  const { svgString } = await renderJsxgOffscreen({
    bbox: BBOX_2D,
    dims: { width: OUTPUT_WIDTH, height: OUTPUT_HEIGHT },
    axis: false,
    grid: false,
    keepAspectRatio: true,
    applyOptions: (JXG) => {
      JXG.Options.text.display = 'internal';
    },
    setup: (board) => {
      const baseAttrs = VIEW3D_ATTRS(false);
      const view: JxgObj = (board as { create: (k: string, p: unknown[], a: unknown) => JxgObj }).create(
        'view3d',
        [
          [-5, -5],
          [10, 10],
          [
            [view3DInfo.bbox3D[0], view3DInfo.bbox3D[3]],
            [view3DInfo.bbox3D[1], view3DInfo.bbox3D[4]],
            [view3DInfo.bbox3D[2], view3DInfo.bbox3D[5]],
          ],
        ],
        {
          ...baseAttrs,
          az: { ...baseAttrs.az, slider: { ...baseAttrs.az.slider, start: view3DInfo.azimuth } },
          el: { ...baseAttrs.el, slider: { ...baseAttrs.el.slider, start: view3DInfo.elevation } },
        },
      );

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const v = view as any;
        v?.az_slide?.setValue?.(view3DInfo.azimuth);
        v?.el_slide?.setValue?.(view3DInfo.elevation);
        v?.board?.update?.();
      } catch {
        /* older JSXGraph may not expose az_slide on view3d */
      }

      try {
        (view as { create: (k: string, p: unknown[], a: unknown) => JxgObj }).create(
          'plane3d',
          [
            [0, 0, 0],
            [1, 0, 0],
            [0, 1, 0],
            GROUND_PLANE_RANGE,
            GROUND_PLANE_RANGE,
          ],
          GROUND_PLANE_ATTRS(false),
        );
      } catch {
        /* swallow */
      }

      const store = createStore(parsed.state);
      const renderer = new JxgRenderer3D(store, view);

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (view as any)?.board?.update?.();
      } catch {
        /* swallow */
      }

      return renderer;
    },
    postProcessSvg: (clone) => {
      clone.setAttribute('width', String(OUTPUT_WIDTH));
      clone.setAttribute('height', String(OUTPUT_HEIGHT));
    },
  });

  return { svgString, width: OUTPUT_WIDTH, height: OUTPUT_HEIGHT };
}
```

- [ ] **Step 2: Run typecheck + geometry-3d tests + full test suite**

Run: `npm run typecheck && npx jest`
Expected: typecheck PASS, full jest suite green (all existing tests including geometry-3d host/serialize tests).

- [ ] **Step 3: Commit**

```bash
git add src/stamps/geometry-3d/render.ts
git commit -m "refactor(stamps/geometry-3d): use shared helper + bump intrinsic dims 1024x768 -> 2048x1536"
```

---

## Task 6: Final verification + manual visual check

**Files:** none (verification only)

- [ ] **Step 1: Run full typecheck + test suite + build**

Run: `npm run typecheck && npm test && npm run build`
Expected: typecheck PASS, all tests PASS, build emits `dist/` without errors. If build fails on a `dist/` import, the helper barrel might need updating — but `src/stamps/shared/jxgOffscreenRender.ts` is imported directly by relative path so no barrel update needed.

- [ ] **Step 2: Spot-check `git diff main --stat` for unexpected churn**

Run: `git diff main --stat`
Expected: only the 5 files touched by this plan (`src/stamps/shared/jxgOffscreenRender.ts`, `src/stamps/shared/__tests__/jxgOffscreenRender.test.ts`, the 3 stamp `render.ts` files) plus possibly the test file in geometry-2d if commit history splits earlier.

- [ ] **Step 3: Manual visual check (user-run, not automated)**

Defer to the user:
1. `npm run dev` (or run consumer app referencing this package via npm link).
2. Insert a 2D geometry stamp, a 3D geometry stamp, and a 2D graph stamp into the whiteboard.
3. Zoom the Excalidraw canvas to ~200% and verify edges/text on each stamp look noticeably sharper than before this refactor.
4. Reload the page → confirm stamp SVGs regenerate without errors (sessionStorage roundtrip).

Note in the PR description that visual verification is manual and was confirmed by the user.

- [ ] **Step 4: Final commit if anything was tweaked during verification**

If no changes needed, skip. Otherwise:

```bash
git add -p
git commit -m "chore(stamps): post-verification tweaks"
```
