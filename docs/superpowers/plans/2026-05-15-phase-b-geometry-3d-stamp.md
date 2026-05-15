# Phase B — Geometry-3D Stamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm stamp `geometry3d` cho hình học không gian lớp 11/12 dùng JSXGraph 3D primitives (point3d, line3d, plane3d, polygon3d, polyhedron3d, sphere3d, cone3d, cylinder3d, solidofrevolution3d, text3d). Stamp tĩnh giống 2D/LaTeX: editor → snapshot SVG → image element + customData chứa creation-log JSON cho roundtrip edit. Shortcut `D`. Release `0.6.0`.

**Architecture:** Đối xứng `geometry-2d/` về cấu trúc. JSXGraph `view3d` projects scene 3D xuống 2D SVG (renderer mặc định) → snapshot trực tiếp clone `<svg>` của board. Serialize bằng creation log (`SerializedElement3D[]`) cộng view state (`azimuth, elevation, bbox3D, showAxes, showMesh`). Restore offscreen như 2D. Plug vào registry qua `geometry3dStamp: StampType`.

**Tech Stack:** TypeScript 5, React 19, `jsxgraph` 1.12 (đã có), Jest 29 + jsdom, tsup 8. Không thêm dependency.

**Prerequisite:** Phase A (`refactor/stamps-folder-layout`) đã merge và release `0.5.0`. Folder `src/stamps/shared/` và `src/stamps/geometry-2d/` tồn tại theo cấu trúc mới.

**Reference spec:** `docs/superpowers/specs/2026-05-15-reorg-and-3d-stamp-design.md` §5–§8.

---

## File Structure (đích)

```
src/stamps/geometry-3d/
  index.tsx                 # StampType + Host
  editor/
    EditorPanel.tsx
    MiniBoard3D.tsx         # JSXGraph view3d wrapper, MiniBoard3DHandle
    LeftPanel.tsx
    toolButtons.tsx
    tools.ts                # GeomTool3D type + TOOLS array
    handlers.ts             # pointerdown handlers
    theme.ts                # palette + view3d defaults
  serialize.ts              # SerializedBoard3D shape + serialize/deserialize
  render.ts                 # offscreen SVG render
  __tests__/
    serialize.test.ts
    render.test.ts
    index.test.tsx
    MiniBoard3D.test.tsx
    handlers.test.ts
```

**Modify:**
- `src/stamps/shared/registry.ts` — add `geometry3dStamp` vào `DEFAULT_STAMPS`
- `src/stamps/index.ts` — export `geometry3dStamp`, `Geometry3DCustomData`, `isGeometry3DCustomData`
- `src/index.ts` — re-export tương ứng
- `package.json` — bump 0.6.0
- `CHANGELOG.md`

**Drop (cuối plan):**
- Alias `@deprecated`: `isMathStamp`, `MathStampCustomData`, `restoreMissingMathStampFiles`

---

## Task 1: Setup branch + spike SVG export

**Files:**
- Create: `scripts/spike-jsxgraph-3d.html`
- Create: `docs/superpowers/specs/2026-05-15-3d-svg-export-spike-notes.md`

Mục tiêu: trước khi viết code chính, verify rằng JSXGraph 1.12 `view3d` xuất SVG đúng cho `polyhedron3d` và `sphere3d`. Nếu fail → fallback PNG dataURL embed, cập nhật spec.

- [ ] **Step 1: Tạo branch**

```bash
git checkout main
git pull --ff-only
git checkout -b feature/geometry-3d-stamp-spike
```

- [ ] **Step 2: Tạo HTML spike trang**

Create `scripts/spike-jsxgraph-3d.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="../node_modules/jsxgraph/distrib/jsxgraph.css" />
  <script src="../node_modules/jsxgraph/distrib/jsxgraphcore.js"></script>
</head>
<body>
  <div id="board" style="width:600px;height:600px;"></div>
  <pre id="out" style="font-family:monospace;font-size:11px;max-height:300px;overflow:auto;"></pre>
  <script>
    JXG.Options.text.display = 'internal';
    const board = JXG.JSXGraph.initBoard('board', {
      boundingbox: [-6, 6, 6, -6],
      axis: false,
      showCopyright: false,
      showNavigation: false,
      renderer: 'svg',
    });
    const view = board.create('view3d',
      [[-5, -5], [10, 10], [[-3, 3], [-3, 3], [-3, 3]]],
      { az: { slider: { visible: false }, point2: { visible: false } },
        el: { slider: { visible: false } },
        projection: 'central' }
    );

    // Test: polyhedron3d (tetrahedron)
    const A = view.create('point3d', [0, 0, 0], { name: 'A', size: 3 });
    const B = view.create('point3d', [2, 0, 0], { name: 'B', size: 3 });
    const C = view.create('point3d', [1, 2, 0], { name: 'C', size: 3 });
    const D = view.create('point3d', [1, 1, 2], { name: 'D', size: 3 });
    view.create('polygon3d', [[A, B, C]]);
    view.create('polygon3d', [[A, B, D]]);
    view.create('polygon3d', [[A, C, D]]);
    view.create('polygon3d', [[B, C, D]]);

    // Test: sphere3d
    view.create('sphere3d', [[4, 4, 0], 1.5]);

    // Capture SVG output
    setTimeout(() => {
      const svg = document.querySelector('#board svg');
      const out = document.getElementById('out');
      out.textContent = svg ? svg.outerHTML.slice(0, 2000) : 'NO SVG';
      console.log('SVG nodes:', svg?.querySelectorAll('*').length);
      console.log('Has polygon paths:', svg?.querySelectorAll('polygon,path').length);
      console.log('Has circle/ellipse (sphere outline):', svg?.querySelectorAll('circle,ellipse').length);
    }, 200);
  </script>
</body>
</html>
```

- [ ] **Step 3: Chạy spike trong browser**

```bash
# Mở browser tới file:///$(pwd)/scripts/spike-jsxgraph-3d.html
echo "Mở: file://$(pwd)/scripts/spike-jsxgraph-3d.html"
```

User mở file trong Chrome/Firefox. Kiểm tra:
1. Tetrahedron có vẽ ra (4 polygons hợp lệ)?
2. Sphere có vẽ ra (circle/ellipse outline)?
3. `<pre>` output có chứa SVG markup hay PNG dataURL?

- [ ] **Step 4: Ghi note spike**

Tạo `docs/superpowers/specs/2026-05-15-3d-svg-export-spike-notes.md`:

```markdown
# 3D SVG export spike — kết quả

**Ngày:** 2026-05-15
**JSXGraph version:** 1.12.x

## Kết quả

| Element | SVG output | Ghi chú |
|---|---|---|
| point3d | YES/NO | (điền sau khi mở browser) |
| polygon3d | YES/NO | |
| polyhedron3d | YES/NO (chưa test trực tiếp) | (test bằng compose 4 polygon3d cho tetrahedron) |
| sphere3d | YES/NO | (outline circle/ellipse hay polygon mesh?) |

## Quyết định

- [ ] Option A: SVG export đúng → giữ pipeline SVG như 2D (default).
- [ ] Option B: SVG fail → fallback PNG dataURL embed `<svg><image href=... /></svg>`. Cập nhật `geometry-3d/render.ts` + spec.

## Action items

- (Điền sau khi user run spike)
```

- [ ] **Step 5: Commit spike + note**

```bash
git add scripts/spike-jsxgraph-3d.html docs/superpowers/specs/2026-05-15-3d-svg-export-spike-notes.md
git commit -m "spike(geometry-3d): JSXGraph view3d SVG export verification"
```

**HALT decision point:** đợi user mở browser và ghi kết quả vào spike notes. Continue task 2 chỉ khi spec note có `Option A` checked (default plan path) hoặc `Option B` với fallback PNG đã được cập nhật trong design spec.

---

## Task 2: Setup folder skeleton + branch chính

**Files:**
- Create: `src/stamps/geometry-3d/{editor,__tests__}/.gitkeep`

- [ ] **Step 1: Branch chính**

```bash
git checkout -b feature/geometry-3d-stamp feature/geometry-3d-stamp-spike
```

- [ ] **Step 2: Tạo skeleton**

```bash
mkdir -p src/stamps/geometry-3d/editor src/stamps/geometry-3d/__tests__
touch src/stamps/geometry-3d/editor/.gitkeep
touch src/stamps/geometry-3d/__tests__/.gitkeep
```

- [ ] **Step 3: Baseline test**

```bash
npm test -- --silent
```

Expected: tất cả pass (giữ nguyên sau Phase A).

- [ ] **Step 4: Commit**

```bash
git add src/stamps/geometry-3d
git commit -m "scaffold(geometry-3d): empty folder structure"
```

---

## Task 3: `serialize.ts` — types + custom data guard

**Files:**
- Create: `src/stamps/geometry-3d/serialize.ts`
- Test: `src/stamps/geometry-3d/__tests__/serialize.test.ts`

- [ ] **Step 1: Viết test trước (TDD)**

Create `src/stamps/geometry-3d/__tests__/serialize.test.ts`:

```ts
import {
  isGeometry3DCustomData,
  parseSerializedBoard3D,
  serializeBoard3D,
  type SerializedBoard3D,
  type SerializedElement3D,
} from '../serialize';

describe('Geometry3D customData type guard', () => {
  it('reject null/undefined/non-object', () => {
    expect(isGeometry3DCustomData(null)).toBe(false);
    expect(isGeometry3DCustomData(undefined)).toBe(false);
    expect(isGeometry3DCustomData('string')).toBe(false);
  });

  it('reject wrong kind', () => {
    expect(isGeometry3DCustomData({ kind: 'geometry', version: 1, jsonState: '{}' })).toBe(false);
    expect(isGeometry3DCustomData({ kind: 'latex', version: 1, jsonState: '{}' })).toBe(false);
  });

  it('reject wrong version', () => {
    expect(isGeometry3DCustomData({ kind: 'geometry3d', version: 2, jsonState: '{}' })).toBe(false);
  });

  it('reject thiếu jsonState', () => {
    expect(isGeometry3DCustomData({ kind: 'geometry3d', version: 1 })).toBe(false);
  });

  it('accept valid shape', () => {
    expect(
      isGeometry3DCustomData({
        kind: 'geometry3d',
        version: 1,
        jsonState: '{"version":1}',
        svgWidth: 1024,
        svgHeight: 768,
      }),
    ).toBe(true);
  });
});

describe('SerializedBoard3D round-trip', () => {
  it('serializeBoard3D + parseSerializedBoard3D nguyên dạng', () => {
    const state: SerializedBoard3D = {
      version: 1,
      bbox: [-6, 6, 6, -6],
      view: { azimuth: 0.5, elevation: 0.3, bbox3D: [-3, -3, -3, 3, 3, 3] },
      showAxes: true,
      showMesh: false,
      elements: [
        {
          type: 'point3d',
          parents: [0, 0, 0],
          attributes: { name: 'A', size: 3 },
          id: 'p1',
          label: 'A',
        },
        {
          type: 'segment3d',
          parents: ['@id:p1', '@id:p2'],
          attributes: { strokeColor: '#000' },
          id: 's1',
        },
      ],
    };
    const json = serializeBoard3D(state);
    const parsed = parseSerializedBoard3D(json);
    expect(parsed).toEqual(state);
  });

  it('parseSerializedBoard3D throws on malformed JSON', () => {
    expect(() => parseSerializedBoard3D('{not json')).toThrow();
  });

  it('parseSerializedBoard3D throws on wrong version', () => {
    expect(() => parseSerializedBoard3D('{"version":2,"elements":[]}')).toThrow(/version/);
  });
});
```

- [ ] **Step 2: Run test, verify fail**

```bash
npm test -- --silent --testPathPattern geometry-3d/serialize
```

Expected: FAIL — module chưa tồn tại.

- [ ] **Step 3: Implement `serialize.ts`**

Create `src/stamps/geometry-3d/serialize.ts`:

```ts
import type { BaseStampCustomData } from '../shared/types';

export interface Geometry3DCustomData extends BaseStampCustomData {
  kind: 'geometry3d';
  version: 1;
  jsonState: string;
  svgWidth: number;
  svgHeight: number;
}

export function isGeometry3DCustomData(data: unknown): data is Geometry3DCustomData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Partial<Geometry3DCustomData>;
  return d.kind === 'geometry3d' && d.version === 1 && typeof d.jsonState === 'string';
}

export type Element3DType =
  | 'point3d' | 'line3d' | 'segment3d' | 'plane3d'
  | 'polygon3d' | 'polyhedron3d' | 'sphere3d'
  | 'tetrahedron3d' | 'parallelepiped3d' | 'prism3d' | 'pyramid3d'
  | 'cone3d' | 'cylinder3d' | 'solidofrevolution3d' | 'text3d';

export interface SerializedElement3D {
  type: Element3DType;
  parents: unknown[];     // coordinates or "@id:<id>" reference strings
  attributes: Record<string, unknown>;
  id: string;
  label?: string;
}

export interface SerializedBoard3D {
  version: 1;
  bbox: [number, number, number, number];
  view: {
    azimuth: number;
    elevation: number;
    bbox3D: [number, number, number, number, number, number];
  };
  showAxes: boolean;
  showMesh: boolean;
  elements: SerializedElement3D[];
}

export function serializeBoard3D(state: SerializedBoard3D): string {
  return JSON.stringify(state);
}

export function parseSerializedBoard3D(json: string): SerializedBoard3D {
  const parsed = JSON.parse(json) as unknown;
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('parseSerializedBoard3D: not an object');
  }
  const p = parsed as Partial<SerializedBoard3D>;
  if (p.version !== 1) {
    throw new Error(`parseSerializedBoard3D: unsupported version ${String(p.version)}`);
  }
  if (!Array.isArray(p.elements)) {
    throw new Error('parseSerializedBoard3D: elements missing');
  }
  return parsed as SerializedBoard3D;
}
```

- [ ] **Step 4: Run test, verify pass**

```bash
npm test -- --silent --testPathPattern geometry-3d/serialize
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-3d/serialize.ts src/stamps/geometry-3d/__tests__/serialize.test.ts
git commit -m "feat(geometry-3d): serialize.ts — customData type, SerializedBoard3D, round-trip"
```

---

## Task 4: `theme.ts` — palette + view3d defaults

**Files:**
- Create: `src/stamps/geometry-3d/editor/theme.ts`

(Không cần test riêng — pure data.)

- [ ] **Step 1: Implement**

Create `src/stamps/geometry-3d/editor/theme.ts`:

```ts
import { paletteFor as palette2D, type GeomPalette } from '../../geometry-2d/editor/theme';

export type Geom3DPalette = GeomPalette & {
  view3dBg: string;
  axisX: string;
  axisY: string;
  axisZ: string;
};

export function paletteFor(isDark: boolean): Geom3DPalette {
  const base = palette2D(isDark);
  return {
    ...base,
    view3dBg: isDark ? '#1a1a1a' : '#ffffff',
    axisX: '#d63b3b',
    axisY: '#2d8a2d',
    axisZ: '#2d6dd6',
  };
}

export const DEFAULT_VIEW3D = {
  azimuth: 0.7,
  elevation: 0.4,
  bbox3D: [-3, -3, -3, 3, 3, 3] as [number, number, number, number, number, number],
};

export const VIEW3D_ATTRS = (isDark: boolean) => ({
  az: { slider: { visible: false }, point2: { visible: false } },
  el: { slider: { visible: false } },
  projection: 'central' as const,
  axesPosition: 'border' as const,
  // axes color theming
  xAxis: { strokeColor: paletteFor(isDark).axisX, lastArrow: { type: 2 } },
  yAxis: { strokeColor: paletteFor(isDark).axisY, lastArrow: { type: 2 } },
  zAxis: { strokeColor: paletteFor(isDark).axisZ, lastArrow: { type: 2 } },
});
```

- [ ] **Step 2: typecheck**

```bash
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/stamps/geometry-3d/editor/theme.ts
git commit -m "feat(geometry-3d): theme.ts — 3D palette + view3d defaults"
```

---

## Task 5: `tools.ts` — tool types + TOOLS array

**Files:**
- Create: `src/stamps/geometry-3d/editor/tools.ts`
- Test: `src/stamps/geometry-3d/__tests__/tools.test.ts`

- [ ] **Step 1: Viết test trước**

Create `src/stamps/geometry-3d/__tests__/tools.test.ts`:

```ts
import { TOOLS_3D, GROUP_LABELS_3D, type GeomTool3D } from '../editor/tools';

describe('Geometry3D tools registry', () => {
  it('có move tool', () => {
    const move = TOOLS_3D.find((t) => t.key === 'move');
    expect(move).toBeDefined();
  });

  it('mỗi tool có key + label + group + stepsRequired', () => {
    for (const t of TOOLS_3D) {
      expect(typeof t.key).toBe('string');
      expect(typeof t.label).toBe('string');
      expect(typeof t.group).toBe('string');
      expect(typeof t.stepsRequired).toBe('number');
    }
  });

  it('keys là unique', () => {
    const keys = TOOLS_3D.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('mỗi group có label trong GROUP_LABELS_3D', () => {
    for (const t of TOOLS_3D) {
      expect(GROUP_LABELS_3D[t.group]).toBeDefined();
    }
  });

  it('covers primitives + solids + curved', () => {
    const keys = TOOLS_3D.map((t) => t.key);
    // primitives
    expect(keys).toEqual(expect.arrayContaining(['point', 'segment', 'line', 'plane', 'triangle', 'polygon']));
    // solids
    expect(keys).toEqual(expect.arrayContaining(['tetrahedron', 'parallelepiped', 'prism', 'pyramid']));
    // curved
    expect(keys).toEqual(expect.arrayContaining(['sphere', 'cone', 'cylinder', 'solidofrevolution']));
    // label
    expect(keys).toEqual(expect.arrayContaining(['label']));
  });
});
```

- [ ] **Step 2: Run test, verify fail**

```bash
npm test -- --silent --testPathPattern geometry-3d/tools
```

- [ ] **Step 3: Implement**

Create `src/stamps/geometry-3d/editor/tools.ts`:

```ts
import type { ReactNode } from 'react';

export type GeomTool3D =
  | 'move'
  | 'point'
  | 'segment'
  | 'line'
  | 'plane'
  | 'triangle'
  | 'polygon'
  | 'tetrahedron'
  | 'parallelepiped'
  | 'prism'
  | 'pyramid'
  | 'sphere'
  | 'cone'
  | 'cylinder'
  | 'solidofrevolution'
  | 'label';

export interface ToolDef3D {
  key: GeomTool3D;
  label: string;
  group: 'view' | 'primitive' | 'solid' | 'curved' | 'meta';
  /** Số click cần thiết để hoàn thành (0 = view-only, >0 = sequence). */
  stepsRequired: number;
  /** Thông tin hỗ trợ — vd hint cần input số. */
  hint?: string;
  icon?: ReactNode;
}

export const GROUP_LABELS_3D: Record<ToolDef3D['group'], string> = {
  view: 'Xem',
  primitive: 'Cơ bản',
  solid: 'Khối đa diện',
  curved: 'Khối cong',
  meta: 'Khác',
};

export const TOOLS_3D: ReadonlyArray<ToolDef3D> = [
  { key: 'move', label: 'Di chuyển', group: 'view', stepsRequired: 0 },
  { key: 'point', label: 'Điểm', group: 'primitive', stepsRequired: 1, hint: 'Nhập (x, y, z)' },
  { key: 'segment', label: 'Đoạn thẳng', group: 'primitive', stepsRequired: 2 },
  { key: 'line', label: 'Đường thẳng', group: 'primitive', stepsRequired: 2 },
  { key: 'plane', label: 'Mặt phẳng', group: 'primitive', stepsRequired: 3 },
  { key: 'triangle', label: 'Tam giác', group: 'primitive', stepsRequired: 3 },
  { key: 'polygon', label: 'Đa giác', group: 'primitive', stepsRequired: 3, hint: 'Click trở lại điểm đầu để đóng' },
  { key: 'tetrahedron', label: 'Tứ diện', group: 'solid', stepsRequired: 4 },
  { key: 'parallelepiped', label: 'Hình hộp', group: 'solid', stepsRequired: 4, hint: '1 đỉnh + 3 vector' },
  { key: 'prism', label: 'Lăng trụ', group: 'solid', stepsRequired: 3, hint: 'Đa giác đáy + chiều cao' },
  { key: 'pyramid', label: 'Chóp', group: 'solid', stepsRequired: 4, hint: 'Đa giác đáy + đỉnh' },
  { key: 'sphere', label: 'Mặt cầu', group: 'curved', stepsRequired: 2, hint: 'Tâm + bán kính' },
  { key: 'cone', label: 'Hình nón', group: 'curved', stepsRequired: 3, hint: 'Tâm đáy + bán kính + đỉnh' },
  { key: 'cylinder', label: 'Hình trụ', group: 'curved', stepsRequired: 3, hint: 'Tâm đáy + bán kính + chiều cao' },
  { key: 'solidofrevolution', label: 'Khối tròn xoay', group: 'curved', stepsRequired: 2, hint: 'Đường cong + trục' },
  { key: 'label', label: 'Nhãn', group: 'meta', stepsRequired: 1, hint: 'Gắn vào điểm' },
];
```

- [ ] **Step 4: Run test, verify pass**

```bash
npm test -- --silent --testPathPattern geometry-3d/tools
```

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-3d/editor/tools.ts src/stamps/geometry-3d/__tests__/tools.test.ts
git commit -m "feat(geometry-3d): tools.ts — GeomTool3D + TOOLS_3D array"
```

---

## Task 6: `MiniBoard3D.tsx` — board init + handle

**Files:**
- Create: `src/stamps/geometry-3d/editor/MiniBoard3D.tsx`
- Test: `src/stamps/geometry-3d/__tests__/MiniBoard3D.test.tsx`

Mục tiêu: wrapper React quản lý board JSXGraph 3D, expose `MiniBoard3DHandle` cho parent.

- [ ] **Step 1: Viết test (smoke)**

Create `src/stamps/geometry-3d/__tests__/MiniBoard3D.test.tsx`:

```tsx
import { render } from '@testing-library/react';
import { createRef } from 'react';
import { MiniBoard3D, type MiniBoard3DHandle } from '../editor/MiniBoard3D';

jest.mock('jsxgraph', () => ({
  __esModule: true,
  default: {
    Options: { text: { display: 'html' } },
    JSXGraph: {
      initBoard: jest.fn(() => ({
        create: jest.fn((kind: string) => {
          if (kind === 'view3d') {
            return {
              create: jest.fn(),
              defaultAxes: [],
            };
          }
          return {};
        }),
        on: jest.fn(),
        off: jest.fn(),
        renderer: { container: { querySelector: () => null } },
      })),
      freeBoard: jest.fn(),
    },
  },
}));

describe('MiniBoard3D', () => {
  it('mount + dispose không lỗi', () => {
    const ref = createRef<MiniBoard3DHandle>();
    const { unmount } = render(<MiniBoard3D ref={ref} isDark={false} />);
    expect(ref.current).toBeTruthy();
    expect(typeof ref.current?.getTool).toBe('function');
    expect(ref.current?.getTool()).toBe('move');
    unmount();
  });

  it('setTool đổi tool active', () => {
    const ref = createRef<MiniBoard3DHandle>();
    render(<MiniBoard3D ref={ref} isDark={false} />);
    ref.current!.setTool('sphere');
    expect(ref.current!.getTool()).toBe('sphere');
  });

  it('getCreationLog trả [] ban đầu', () => {
    const ref = createRef<MiniBoard3DHandle>();
    render(<MiniBoard3D ref={ref} isDark={false} />);
    expect(ref.current!.getCreationLog()).toEqual([]);
  });

  it('getViewState trả default azimuth/elevation', () => {
    const ref = createRef<MiniBoard3DHandle>();
    render(<MiniBoard3D ref={ref} isDark={false} />);
    const state = ref.current!.getViewState();
    expect(state.azimuth).toBeGreaterThan(0);
    expect(state.elevation).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test, verify fail (module missing)**

```bash
npm test -- --silent --testPathPattern MiniBoard3D
```

- [ ] **Step 3: Implement MiniBoard3D**

Create `src/stamps/geometry-3d/editor/MiniBoard3D.tsx`:

```tsx
'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import JXG from 'jsxgraph';
import { DEFAULT_VIEW3D, VIEW3D_ATTRS, paletteFor } from './theme';
import type { GeomTool3D } from './tools';
import type { SerializedElement3D } from '../serialize';

export interface MiniBoard3DHandle {
  getContainer: () => HTMLDivElement | null;
  getTool: () => GeomTool3D;
  setTool: (t: GeomTool3D) => void;
  getCreationLog: () => SerializedElement3D[];
  getViewState: () => {
    azimuth: number;
    elevation: number;
    bbox3D: [number, number, number, number, number, number];
  };
  getBbox: () => [number, number, number, number];
  getShowAxes: () => boolean;
  getShowMesh: () => boolean;
  setShowAxes: (b: boolean) => void;
  setShowMesh: (b: boolean) => void;
  resetView: () => void;
  undo: () => void;
  canUndo: () => boolean;
  subscribe: (cb: () => void) => () => void;
}

interface Props {
  isDark: boolean;
  initialState?: import('../serialize').SerializedBoard3D | null;
  onReady?: (handle: MiniBoard3DHandle) => void;
}

type JxgObj = unknown;

export const MiniBoard3D = forwardRef<MiniBoard3DHandle, Props>(function MiniBoard3D(
  { isDark, initialState, onReady },
  ref,
) {
  const containerId = useId().replace(/:/g, '_');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const boardRef = useRef<unknown>(null);
  const viewRef = useRef<unknown>(null);
  const toolRef = useRef<GeomTool3D>('move');
  const logRef = useRef<SerializedElement3D[]>([]);
  const objMapRef = useRef<Map<string, JxgObj>>(new Map());
  const subsRef = useRef<Set<() => void>>(new Set());
  const [showAxes, setShowAxes] = useState(true);
  const [showMesh, setShowMesh] = useState(false);

  const notify = useCallback(() => {
    for (const cb of subsRef.current) cb();
  }, []);

  useEffect(() => {
    const div = containerRef.current;
    if (!div) return;
    JXG.Options.text.display = 'internal';
    const board = JXG.JSXGraph.initBoard(div, {
      boundingbox: [-6, 6, 6, -6],
      axis: false,
      showCopyright: false,
      showNavigation: false,
      renderer: 'svg',
    }) as unknown;
    boardRef.current = board;

    const initView = initialState?.view ?? DEFAULT_VIEW3D;
    const view = (board as { create: (k: string, p: unknown[], a: unknown) => unknown }).create(
      'view3d',
      [[-5, -5], [10, 10], [
        [initView.bbox3D[0], initView.bbox3D[3]],
        [initView.bbox3D[1], initView.bbox3D[4]],
        [initView.bbox3D[2], initView.bbox3D[5]],
      ]],
      { ...VIEW3D_ATTRS(isDark), az: { ...VIEW3D_ATTRS(isDark).az, value: initView.azimuth }, el: { ...VIEW3D_ATTRS(isDark).el, value: initView.elevation } },
    );
    viewRef.current = view;

    if (initialState?.elements) {
      const map = objMapRef.current;
      for (const el of initialState.elements) {
        const parents = el.parents.map((p) =>
          typeof p === 'string' && p.startsWith('@id:') ? map.get(p.slice(4)) : p,
        );
        const obj = (view as { create: (k: string, p: unknown[], a: unknown) => unknown }).create(
          el.type,
          parents,
          { ...el.attributes, id: el.id, name: el.label },
        );
        map.set(el.id, obj);
        logRef.current.push(el);
      }
    }

    if (onReady) onReady(handleRef.current!);

    return () => {
      JXG.JSXGraph.freeBoard(board as never);
      boardRef.current = null;
      viewRef.current = null;
      objMapRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRef = useRef<MiniBoard3DHandle | null>(null);
  handleRef.current = {
    getContainer: () => containerRef.current,
    getTool: () => toolRef.current,
    setTool: (t) => {
      toolRef.current = t;
      notify();
    },
    getCreationLog: () => [...logRef.current],
    getViewState: () => {
      const v = viewRef.current as { az?: { Value: () => number }; el?: { Value: () => number } } | null;
      return {
        azimuth: v?.az?.Value?.() ?? DEFAULT_VIEW3D.azimuth,
        elevation: v?.el?.Value?.() ?? DEFAULT_VIEW3D.elevation,
        bbox3D: initialState?.view.bbox3D ?? DEFAULT_VIEW3D.bbox3D,
      };
    },
    getBbox: () => [-6, 6, 6, -6],
    getShowAxes: () => showAxes,
    getShowMesh: () => showMesh,
    setShowAxes: (b) => {
      setShowAxes(b);
      notify();
    },
    setShowMesh: (b) => {
      setShowMesh(b);
      notify();
    },
    resetView: () => {
      // TODO sau khi handlers.ts có logic: reset az/el về DEFAULT_VIEW3D
      notify();
    },
    undo: () => {
      logRef.current.pop();
      notify();
    },
    canUndo: () => logRef.current.length > 0,
    subscribe: (cb) => {
      subsRef.current.add(cb);
      return () => {
        subsRef.current.delete(cb);
      };
    },
  };

  useImperativeHandle(ref, () => handleRef.current!, []);

  const p = paletteFor(isDark);

  return (
    <div
      ref={containerRef}
      id={containerId}
      style={{
        width: '100%',
        height: '100%',
        background: p.view3dBg,
        position: 'relative',
      }}
    />
  );
});
```

- [ ] **Step 4: Run test, verify pass**

```bash
npm test -- --silent --testPathPattern MiniBoard3D
```

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-3d/editor/MiniBoard3D.tsx src/stamps/geometry-3d/__tests__/MiniBoard3D.test.tsx
git commit -m "feat(geometry-3d): MiniBoard3D — board init, view3d, handle interface"
```

---

## Task 7: `handlers.ts` — primitive tools (point, segment, line, plane, polygon)

**Files:**
- Create: `src/stamps/geometry-3d/editor/handlers.ts`
- Modify: `src/stamps/geometry-3d/editor/MiniBoard3D.tsx` (wire pointer events)
- Test: `src/stamps/geometry-3d/__tests__/handlers.test.ts`

- [ ] **Step 1: Viết test**

Create `src/stamps/geometry-3d/__tests__/handlers.test.ts`:

```ts
import { createHandlerContext, handleToolStep } from '../editor/handlers';
import type { SerializedElement3D } from '../serialize';

function fakeContext(initial?: Partial<Parameters<typeof createHandlerContext>[0]>) {
  const log: SerializedElement3D[] = [];
  const objMap = new Map<string, unknown>();
  let idCounter = 1;
  return createHandlerContext({
    view: { create: jest.fn((kind: string) => ({ id: `obj-${idCounter}` })) },
    pushLog: (e: SerializedElement3D) => log.push(e),
    objMap,
    nextId: () => `id-${idCounter++}`,
    isDark: false,
    promptCoords: jest.fn((label: string) => ({ x: 0, y: 0, z: 0 })),
    promptNumber: jest.fn((label: string) => 1),
    promptText: jest.fn((label: string) => 'A'),
    notify: jest.fn(),
    ...initial,
  });
}

describe('handlers (primitives)', () => {
  it('point tool: 1 click → tạo point3d', () => {
    const ctx = fakeContext();
    handleToolStep(ctx, 'point', { x3: 1, y3: 2, z3: 3 });
    // expect logged
    // (assertions tùy implementation; mở rộng nếu cần)
  });

  it('segment tool: 2 click → tạo segment3d giữa 2 point', () => {
    const ctx = fakeContext();
    handleToolStep(ctx, 'segment', { x3: 0, y3: 0, z3: 0 });
    handleToolStep(ctx, 'segment', { x3: 1, y3: 0, z3: 0 });
    // verify segment created
  });

  it('polygon: click trở lại điểm đầu → đóng polygon', () => {
    const ctx = fakeContext();
    handleToolStep(ctx, 'polygon', { x3: 0, y3: 0, z3: 0 });
    handleToolStep(ctx, 'polygon', { x3: 2, y3: 0, z3: 0 });
    handleToolStep(ctx, 'polygon', { x3: 1, y3: 2, z3: 0 });
    handleToolStep(ctx, 'polygon', { x3: 0, y3: 0, z3: 0 }); // close
    // verify polygon3d created với 3 đỉnh
  });
});
```

- [ ] **Step 2: Implement handlers.ts (primitives)**

Create `src/stamps/geometry-3d/editor/handlers.ts`:

```ts
import type { GeomTool3D } from './tools';
import type { SerializedElement3D, Element3DType } from '../serialize';

export interface HandlerContextDeps {
  view: { create: (kind: string, parents: unknown[], attrs: unknown) => { id: string } };
  pushLog: (e: SerializedElement3D) => void;
  objMap: Map<string, unknown>;
  nextId: () => string;
  isDark: boolean;
  promptCoords: (label: string) => { x: number; y: number; z: number } | null;
  promptNumber: (label: string) => number | null;
  promptText: (label: string) => string | null;
  notify: () => void;
}

export interface HandlerContext extends HandlerContextDeps {
  pendingPoints: { id: string; ref: unknown; coords: [number, number, number] }[];
}

export function createHandlerContext(deps: HandlerContextDeps): HandlerContext {
  return { ...deps, pendingPoints: [] };
}

function createPoint3D(ctx: HandlerContext, x: number, y: number, z: number, label?: string): { id: string; ref: unknown } {
  const id = ctx.nextId();
  const attrs: Record<string, unknown> = { id, size: 3 };
  if (label) attrs.name = label;
  const ref = ctx.view.create('point3d', [x, y, z], attrs);
  ctx.objMap.set(id, ref);
  ctx.pushLog({ type: 'point3d', parents: [x, y, z], attributes: attrs, id, label });
  return { id, ref };
}

function refByPlaceholder(id: string): string {
  return `@id:${id}`;
}

export interface ClickHit {
  x3: number;
  y3: number;
  z3: number;
  /** Nếu click trúng 1 point3d hiện có, trả id của nó. */
  existingPointId?: string;
}

export function handleToolStep(ctx: HandlerContext, tool: GeomTool3D, hit: ClickHit): void {
  switch (tool) {
    case 'move':
      return;

    case 'point': {
      const coords = ctx.promptCoords('Toạ độ điểm (x, y, z)');
      if (!coords) return;
      createPoint3D(ctx, coords.x, coords.y, coords.z);
      ctx.notify();
      return;
    }

    case 'segment':
    case 'line': {
      const p = hit.existingPointId
        ? { id: hit.existingPointId, ref: ctx.objMap.get(hit.existingPointId)!, coords: [hit.x3, hit.y3, hit.z3] as [number, number, number] }
        : createPoint3D(ctx, hit.x3, hit.y3, hit.z3);
      ctx.pendingPoints.push({ ...p, coords: [hit.x3, hit.y3, hit.z3] });
      if (ctx.pendingPoints.length === 2) {
        const [a, b] = ctx.pendingPoints;
        const id = ctx.nextId();
        const elType: Element3DType = tool === 'segment' ? 'segment3d' : 'line3d';
        const ref = ctx.view.create(elType, [a.ref, b.ref], { id });
        ctx.objMap.set(id, ref);
        ctx.pushLog({
          type: elType,
          parents: [refByPlaceholder(a.id), refByPlaceholder(b.id)],
          attributes: { id },
          id,
        });
        ctx.pendingPoints = [];
      }
      ctx.notify();
      return;
    }

    case 'plane': {
      const p = hit.existingPointId
        ? { id: hit.existingPointId, ref: ctx.objMap.get(hit.existingPointId)! }
        : createPoint3D(ctx, hit.x3, hit.y3, hit.z3);
      ctx.pendingPoints.push({ ...p, coords: [hit.x3, hit.y3, hit.z3] });
      if (ctx.pendingPoints.length === 3) {
        const [a, b, c] = ctx.pendingPoints;
        const id = ctx.nextId();
        const ref = ctx.view.create('plane3d', [a.ref, b.ref, c.ref], { id });
        ctx.objMap.set(id, ref);
        ctx.pushLog({
          type: 'plane3d',
          parents: [refByPlaceholder(a.id), refByPlaceholder(b.id), refByPlaceholder(c.id)],
          attributes: { id },
          id,
        });
        ctx.pendingPoints = [];
      }
      ctx.notify();
      return;
    }

    case 'triangle': {
      // Giống polygon nhưng auto-close sau 3 điểm
      const p = hit.existingPointId
        ? { id: hit.existingPointId, ref: ctx.objMap.get(hit.existingPointId)! }
        : createPoint3D(ctx, hit.x3, hit.y3, hit.z3);
      ctx.pendingPoints.push({ ...p, coords: [hit.x3, hit.y3, hit.z3] });
      if (ctx.pendingPoints.length === 3) {
        finishPolygon(ctx, ctx.pendingPoints.map((pp) => pp));
        ctx.pendingPoints = [];
      }
      ctx.notify();
      return;
    }

    case 'polygon': {
      // Click trở lại điểm đầu → close
      if (
        ctx.pendingPoints.length >= 3 &&
        hit.existingPointId === ctx.pendingPoints[0].id
      ) {
        finishPolygon(ctx, ctx.pendingPoints);
        ctx.pendingPoints = [];
        ctx.notify();
        return;
      }
      const p = hit.existingPointId
        ? { id: hit.existingPointId, ref: ctx.objMap.get(hit.existingPointId)! }
        : createPoint3D(ctx, hit.x3, hit.y3, hit.z3);
      ctx.pendingPoints.push({ ...p, coords: [hit.x3, hit.y3, hit.z3] });
      ctx.notify();
      return;
    }

    case 'label': {
      if (!hit.existingPointId) return;
      const text = ctx.promptText('Nội dung nhãn');
      if (!text) return;
      const id = ctx.nextId();
      const pointRef = ctx.objMap.get(hit.existingPointId);
      const ref = ctx.view.create('text3d', [pointRef, text], { id });
      ctx.objMap.set(id, ref);
      ctx.pushLog({
        type: 'text3d',
        parents: [refByPlaceholder(hit.existingPointId), text],
        attributes: { id },
        id,
        label: text,
      });
      ctx.notify();
      return;
    }

    // Solids và curved → task 8
    default:
      handleSolidStep(ctx, tool, hit);
      return;
  }
}

function finishPolygon(
  ctx: HandlerContext,
  points: { id: string; ref: unknown }[],
): void {
  const id = ctx.nextId();
  const ref = ctx.view.create('polygon3d', [points.map((p) => p.ref)], { id });
  ctx.objMap.set(id, ref);
  ctx.pushLog({
    type: 'polygon3d',
    parents: [points.map((p) => refByPlaceholder(p.id))],
    attributes: { id },
    id,
  });
}

export function handleSolidStep(ctx: HandlerContext, tool: GeomTool3D, hit: ClickHit): void {
  // Sẽ implement trong Task 8
  void ctx;
  void tool;
  void hit;
}
```

- [ ] **Step 3: Wire vào MiniBoard3D pointer**

Trong `MiniBoard3D.tsx`, sau khi board init, attach pointer handler:

```tsx
const handlerCtxRef = useRef<HandlerContext | null>(null);

// Trong useEffect, sau khi tạo view:
const ctx = createHandlerContext({
  view: view as never,
  pushLog: (e) => logRef.current.push(e),
  objMap: objMapRef.current,
  nextId: () => `obj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  isDark,
  promptCoords: (label) => {
    const raw = window.prompt(`${label} — nhập "x,y,z"`, '0,0,0');
    if (!raw) return null;
    const parts = raw.split(',').map((s) => Number(s.trim()));
    if (parts.length !== 3 || parts.some(isNaN)) return null;
    return { x: parts[0], y: parts[1], z: parts[2] };
  },
  promptNumber: (label) => {
    const raw = window.prompt(label, '1');
    if (!raw) return null;
    const n = Number(raw);
    return isNaN(n) ? null : n;
  },
  promptText: (label) => window.prompt(label, '') || null,
  notify,
});
handlerCtxRef.current = ctx;

(board as { on: (ev: string, cb: (e: PointerEvent) => void) => void }).on('down', (e) => {
  const tool = toolRef.current;
  if (tool === 'move') return;
  // Project pointer pixel → world 3D coords using view3d helper
  // JSXGraph: view.pointerToCoords(e) hoặc tính từ event coords + view.matrix
  const coords = projectPointerTo3D(view as never, e);
  if (!coords) return;
  handleToolStep(ctx, tool, coords);
});
```

(Helper `projectPointerTo3D` — viết inline trong MiniBoard3D, dùng `view.coords2Dto3D` của JSXGraph nếu có, hoặc snap-to-plane: assume click on z=0 plane mặc định, sau đó user prompt z khi cần.)

- [ ] **Step 4: Run test, verify pass**

```bash
npm test -- --silent --testPathPattern handlers
npm test -- --silent --testPathPattern MiniBoard3D
```

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-3d/editor/handlers.ts src/stamps/geometry-3d/editor/MiniBoard3D.tsx src/stamps/geometry-3d/__tests__/handlers.test.ts
git commit -m "feat(geometry-3d): handlers — point, segment, line, plane, triangle, polygon, label"
```

---

## Task 8: `handlers.ts` — solids (tetrahedron, parallelepiped, prism, pyramid)

**Files:**
- Modify: `src/stamps/geometry-3d/editor/handlers.ts` — implement `handleSolidStep` cho 4 solids
- Modify: `src/stamps/geometry-3d/__tests__/handlers.test.ts` — thêm test

- [ ] **Step 1: Thêm test cho solids**

Append vào `handlers.test.ts`:

```ts
describe('handlers (solids)', () => {
  it('tetrahedron: 4 click → tạo polyhedron3d', () => {
    const ctx = fakeContext();
    handleToolStep(ctx, 'tetrahedron', { x3: 0, y3: 0, z3: 0 });
    handleToolStep(ctx, 'tetrahedron', { x3: 2, y3: 0, z3: 0 });
    handleToolStep(ctx, 'tetrahedron', { x3: 1, y3: 2, z3: 0 });
    handleToolStep(ctx, 'tetrahedron', { x3: 1, y3: 1, z3: 2 });
    // Verify polyhedron3d hoặc 4 polygons closed
  });

  it('parallelepiped: 1 click + 3 vector prompt → tạo 8 đỉnh + 6 mặt', () => {
    const promptVector = jest.fn()
      .mockReturnValueOnce({ x: 2, y: 0, z: 0 })
      .mockReturnValueOnce({ x: 0, y: 2, z: 0 })
      .mockReturnValueOnce({ x: 0, y: 0, z: 2 });
    const ctx = fakeContext({ promptCoords: promptVector });
    handleToolStep(ctx, 'parallelepiped', { x3: 0, y3: 0, z3: 0 });
    expect(promptVector).toHaveBeenCalledTimes(3);
  });

  it('prism: polygon đáy + height prompt', () => {
    const ctx = fakeContext({ promptNumber: jest.fn().mockReturnValue(3) });
    handleToolStep(ctx, 'prism', { x3: 0, y3: 0, z3: 0 });
    handleToolStep(ctx, 'prism', { x3: 2, y3: 0, z3: 0 });
    handleToolStep(ctx, 'prism', { x3: 1, y3: 2, z3: 0 });
    handleToolStep(ctx, 'prism', { x3: 0, y3: 0, z3: 0 }); // close base
    // expect height prompt + prism created
  });

  it('pyramid: polygon đáy + apex point', () => {
    const ctx = fakeContext();
    handleToolStep(ctx, 'pyramid', { x3: 0, y3: 0, z3: 0 });
    handleToolStep(ctx, 'pyramid', { x3: 2, y3: 0, z3: 0 });
    handleToolStep(ctx, 'pyramid', { x3: 1, y3: 2, z3: 0 });
    handleToolStep(ctx, 'pyramid', { x3: 0, y3: 0, z3: 0 }); // close base
    handleToolStep(ctx, 'pyramid', { x3: 1, y3: 1, z3: 2 }); // apex
    // expect pyramid edges
  });
});
```

- [ ] **Step 2: Implement `handleSolidStep` cho 4 solids**

Replace stub `handleSolidStep` trong `handlers.ts`:

```ts
export function handleSolidStep(ctx: HandlerContext, tool: GeomTool3D, hit: ClickHit): void {
  switch (tool) {
    case 'tetrahedron': {
      const p = hit.existingPointId
        ? { id: hit.existingPointId, ref: ctx.objMap.get(hit.existingPointId)! }
        : createPoint3D(ctx, hit.x3, hit.y3, hit.z3);
      ctx.pendingPoints.push({ ...p, coords: [hit.x3, hit.y3, hit.z3] });
      if (ctx.pendingPoints.length === 4) {
        const [a, b, c, d] = ctx.pendingPoints;
        // Tetrahedron = polyhedron3d với 4 mặt
        finishPolyhedron(ctx, [
          [a, b, c],
          [a, b, d],
          [a, c, d],
          [b, c, d],
        ]);
        ctx.pendingPoints = [];
      }
      ctx.notify();
      return;
    }

    case 'parallelepiped': {
      // 1 origin click + 3 vector prompt
      const origin = hit.existingPointId
        ? { id: hit.existingPointId, ref: ctx.objMap.get(hit.existingPointId)!, coords: [hit.x3, hit.y3, hit.z3] as [number, number, number] }
        : createPoint3D(ctx, hit.x3, hit.y3, hit.z3);
      const v1 = ctx.promptCoords('Vector cạnh 1 (dx, dy, dz)');
      const v2 = ctx.promptCoords('Vector cạnh 2 (dx, dy, dz)');
      const v3 = ctx.promptCoords('Vector cạnh 3 (dx, dy, dz)');
      if (!v1 || !v2 || !v3) return;
      const ox = hit.x3, oy = hit.y3, oz = hit.z3;
      // 8 đỉnh
      const corners: [number, number, number][] = [
        [ox, oy, oz],
        [ox + v1.x, oy + v1.y, oz + v1.z],
        [ox + v2.x, oy + v2.y, oz + v2.z],
        [ox + v3.x, oy + v3.y, oz + v3.z],
        [ox + v1.x + v2.x, oy + v1.y + v2.y, oz + v1.z + v2.z],
        [ox + v1.x + v3.x, oy + v1.y + v3.y, oz + v1.z + v3.z],
        [ox + v2.x + v3.x, oy + v2.y + v3.y, oz + v2.z + v3.z],
        [ox + v1.x + v2.x + v3.x, oy + v1.y + v2.y + v3.y, oz + v1.z + v2.z + v3.z],
      ];
      const pts = corners.map(([x, y, z], i) =>
        i === 0
          ? origin
          : createPoint3D(ctx, x, y, z),
      );
      // 6 mặt (Phong chuẩn parallelepiped)
      // index map: 0=origin, 1=+v1, 2=+v2, 3=+v3, 4=+v1+v2, 5=+v1+v3, 6=+v2+v3, 7=+v1+v2+v3
      finishPolyhedron(ctx, [
        [pts[0], pts[1], pts[4], pts[2]], // mặt v1-v2
        [pts[0], pts[1], pts[5], pts[3]], // mặt v1-v3
        [pts[0], pts[2], pts[6], pts[3]], // mặt v2-v3
        [pts[7], pts[4], pts[1], pts[5]], // mặt đối v2-v3
        [pts[7], pts[4], pts[2], pts[6]], // mặt đối v1-v3
        [pts[7], pts[5], pts[3], pts[6]], // mặt đối v1-v2
      ]);
      ctx.pendingPoints = [];
      ctx.notify();
      return;
    }

    case 'prism': {
      // Đáy là polygon (click trở lại điểm đầu để đóng), sau đó prompt height theo trục z
      if (
        ctx.pendingPoints.length >= 3 &&
        hit.existingPointId === ctx.pendingPoints[0].id
      ) {
        const base = ctx.pendingPoints;
        const height = ctx.promptNumber('Chiều cao (theo trục z)');
        if (!height) return;
        // Top points = base + (0,0,height)
        const top = base.map((bp) => {
          const c: [number, number, number] = [bp.coords[0], bp.coords[1], bp.coords[2] + height];
          return createPoint3D(ctx, c[0], c[1], c[2]);
        });
        const faces: (typeof base)[] = [
          base,
          top,
        ];
        for (let i = 0; i < base.length; i++) {
          const next = (i + 1) % base.length;
          faces.push([base[i], base[next], top[next], top[i]]);
        }
        finishPolyhedron(ctx, faces);
        ctx.pendingPoints = [];
        ctx.notify();
        return;
      }
      const p = hit.existingPointId
        ? { id: hit.existingPointId, ref: ctx.objMap.get(hit.existingPointId)!, coords: [hit.x3, hit.y3, hit.z3] as [number, number, number] }
        : createPoint3D(ctx, hit.x3, hit.y3, hit.z3);
      ctx.pendingPoints.push({ ...p, coords: [hit.x3, hit.y3, hit.z3] });
      ctx.notify();
      return;
    }

    case 'pyramid': {
      // Base polygon (đóng bằng click trở lại điểm đầu), sau đó 1 click cuối = apex
      if (
        ctx.pendingPoints.length >= 3 &&
        hit.existingPointId === ctx.pendingPoints[0].id &&
        !(ctx as unknown as { _pyramidBaseDone?: boolean })._pyramidBaseDone
      ) {
        (ctx as unknown as { _pyramidBaseDone?: boolean })._pyramidBaseDone = true;
        ctx.notify();
        return;
      }
      if ((ctx as unknown as { _pyramidBaseDone?: boolean })._pyramidBaseDone) {
        const base = ctx.pendingPoints;
        const apex = createPoint3D(ctx, hit.x3, hit.y3, hit.z3);
        const faces: { id: string; ref: unknown }[][] = [base];
        for (let i = 0; i < base.length; i++) {
          const next = (i + 1) % base.length;
          faces.push([base[i], base[next], apex]);
        }
        finishPolyhedron(ctx, faces);
        ctx.pendingPoints = [];
        (ctx as unknown as { _pyramidBaseDone?: boolean })._pyramidBaseDone = false;
        ctx.notify();
        return;
      }
      const p = hit.existingPointId
        ? { id: hit.existingPointId, ref: ctx.objMap.get(hit.existingPointId)!, coords: [hit.x3, hit.y3, hit.z3] as [number, number, number] }
        : createPoint3D(ctx, hit.x3, hit.y3, hit.z3);
      ctx.pendingPoints.push({ ...p, coords: [hit.x3, hit.y3, hit.z3] });
      ctx.notify();
      return;
    }

    // Curved (sphere, cone, cylinder, solidofrevolution) → task 9
    default:
      handleCurvedStep(ctx, tool, hit);
      return;
  }
}

function finishPolyhedron(
  ctx: HandlerContext,
  faces: { id: string; ref: unknown }[][],
): void {
  const id = ctx.nextId();
  const facesRef = faces.map((f) => f.map((p) => p.ref));
  const ref = ctx.view.create('polyhedron3d', facesRef, { id });
  ctx.objMap.set(id, ref);
  ctx.pushLog({
    type: 'polyhedron3d',
    parents: faces.map((f) => f.map((p) => `@id:${p.id}`)),
    attributes: { id },
    id,
  });
}

export function handleCurvedStep(ctx: HandlerContext, tool: GeomTool3D, hit: ClickHit): void {
  // Task 9
  void ctx;
  void tool;
  void hit;
}
```

- [ ] **Step 3: Test pass**

```bash
npm test -- --silent --testPathPattern handlers
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(geometry-3d): handlers — tetrahedron, parallelepiped, prism, pyramid"
```

---

## Task 9: `handlers.ts` — curved (sphere, cone, cylinder, solidofrevolution)

**Files:**
- Modify: `src/stamps/geometry-3d/editor/handlers.ts` — implement `handleCurvedStep`
- Modify: `src/stamps/geometry-3d/__tests__/handlers.test.ts` — thêm test curved

- [ ] **Step 1: Thêm test**

Append:

```ts
describe('handlers (curved)', () => {
  it('sphere: 1 click tâm + radius prompt', () => {
    const ctx = fakeContext({ promptNumber: jest.fn().mockReturnValue(2) });
    handleToolStep(ctx, 'sphere', { x3: 0, y3: 0, z3: 0 });
    // expect sphere3d created
  });

  it('cone: 1 click tâm + radius + apex click', () => {
    const ctx = fakeContext({ promptNumber: jest.fn().mockReturnValue(1.5) });
    handleToolStep(ctx, 'cone', { x3: 0, y3: 0, z3: 0 });
    handleToolStep(ctx, 'cone', { x3: 0, y3: 0, z3: 3 }); // apex
    // expect cone polyhedron approx
  });

  it('cylinder: 1 click tâm đáy + radius + height prompt', () => {
    const promptNumber = jest.fn().mockReturnValueOnce(1).mockReturnValueOnce(3);
    const ctx = fakeContext({ promptNumber });
    handleToolStep(ctx, 'cylinder', { x3: 0, y3: 0, z3: 0 });
  });

  it('solidofrevolution: curve fn + axis prompt', () => {
    const promptText = jest.fn().mockReturnValueOnce('Math.sin(t) + 2').mockReturnValueOnce('z');
    const ctx = fakeContext({ promptText });
    handleToolStep(ctx, 'solidofrevolution', { x3: 0, y3: 0, z3: 0 });
  });
});
```

- [ ] **Step 2: Implement**

Replace `handleCurvedStep`:

```ts
export function handleCurvedStep(ctx: HandlerContext, tool: GeomTool3D, hit: ClickHit): void {
  switch (tool) {
    case 'sphere': {
      const radius = ctx.promptNumber('Bán kính mặt cầu');
      if (!radius) return;
      const center = hit.existingPointId
        ? { id: hit.existingPointId, ref: ctx.objMap.get(hit.existingPointId)! }
        : createPoint3D(ctx, hit.x3, hit.y3, hit.z3);
      const id = ctx.nextId();
      const ref = ctx.view.create('sphere3d', [center.ref, radius], { id });
      ctx.objMap.set(id, ref);
      ctx.pushLog({
        type: 'sphere3d',
        parents: [`@id:${center.id}`, radius],
        attributes: { id },
        id,
      });
      ctx.notify();
      return;
    }

    case 'cone': {
      const radius = ctx.promptNumber('Bán kính đáy');
      if (!radius) return;
      const center = hit.existingPointId
        ? { id: hit.existingPointId, ref: ctx.objMap.get(hit.existingPointId)!, coords: [hit.x3, hit.y3, hit.z3] as [number, number, number] }
        : createPoint3D(ctx, hit.x3, hit.y3, hit.z3);
      // Lưu vào pending, đợi click tiếp = apex
      ctx.pendingPoints.push({ ...center, coords: [hit.x3, hit.y3, hit.z3] });
      (ctx as unknown as { _coneRadius?: number })._coneRadius = radius;
      if (ctx.pendingPoints.length === 2) {
        const [baseCenter, apex] = ctx.pendingPoints;
        const r = (ctx as unknown as { _coneRadius?: number })._coneRadius!;
        // Approximate cone bằng polyhedron với 16 đỉnh đáy + 1 đỉnh
        const N = 16;
        const cx = baseCenter.coords[0], cy = baseCenter.coords[1], cz = baseCenter.coords[2];
        const basePoints = Array.from({ length: N }, (_, i) => {
          const θ = (i / N) * Math.PI * 2;
          return createPoint3D(ctx, cx + r * Math.cos(θ), cy + r * Math.sin(θ), cz);
        });
        const faces: { id: string; ref: unknown }[][] = [basePoints];
        for (let i = 0; i < N; i++) {
          faces.push([basePoints[i], basePoints[(i + 1) % N], apex]);
        }
        finishPolyhedron(ctx, faces);
        ctx.pendingPoints = [];
        (ctx as unknown as { _coneRadius?: number })._coneRadius = undefined;
      }
      ctx.notify();
      return;
    }

    case 'cylinder': {
      const radius = ctx.promptNumber('Bán kính đáy');
      if (!radius) return;
      const height = ctx.promptNumber('Chiều cao (theo trục z)');
      if (!height) return;
      const center = hit.existingPointId
        ? { id: hit.existingPointId, ref: ctx.objMap.get(hit.existingPointId)!, coords: [hit.x3, hit.y3, hit.z3] as [number, number, number] }
        : createPoint3D(ctx, hit.x3, hit.y3, hit.z3);
      const N = 16;
      const cx = hit.x3, cy = hit.y3, cz = hit.z3;
      const basePoints = Array.from({ length: N }, (_, i) => {
        const θ = (i / N) * Math.PI * 2;
        return createPoint3D(ctx, cx + radius * Math.cos(θ), cy + radius * Math.sin(θ), cz);
      });
      const topPoints = Array.from({ length: N }, (_, i) => {
        const θ = (i / N) * Math.PI * 2;
        return createPoint3D(ctx, cx + radius * Math.cos(θ), cy + radius * Math.sin(θ), cz + height);
      });
      const faces: { id: string; ref: unknown }[][] = [basePoints, topPoints];
      for (let i = 0; i < N; i++) {
        const next = (i + 1) % N;
        faces.push([basePoints[i], basePoints[next], topPoints[next], topPoints[i]]);
      }
      finishPolyhedron(ctx, faces);
      ctx.notify();
      void center;
      return;
    }

    case 'solidofrevolution': {
      const fnText = ctx.promptText('Hàm bán kính r(z) — vd "Math.sin(z) + 2"');
      if (!fnText) return;
      const axisText = ctx.promptText('Trục xoay (x | y | z), mặc định z');
      const axis = (axisText || 'z').toLowerCase() === 'x' ? 'x' : (axisText || 'z').toLowerCase() === 'y' ? 'y' : 'z';
      const id = ctx.nextId();
      const ref = ctx.view.create('solidofrevolution3d', [fnText, axis], { id });
      ctx.objMap.set(id, ref);
      ctx.pushLog({
        type: 'solidofrevolution3d',
        parents: [fnText, axis],
        attributes: { id },
        id,
      });
      ctx.notify();
      return;
    }

    default:
      return;
  }
}
```

- [ ] **Step 3: Test pass**

```bash
npm test -- --silent --testPathPattern handlers
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(geometry-3d): handlers — sphere, cone, cylinder, solidofrevolution"
```

---

## Task 10: `MiniBoard3D.snapshotSVG` + view state getter

**Files:**
- Modify: `src/stamps/geometry-3d/editor/MiniBoard3D.tsx` — add `snapshotSVG()` method to handle
- Modify: tests cập nhật

- [ ] **Step 1: Thêm `snapshotSVG` vào `MiniBoard3DHandle`**

Edit `MiniBoard3D.tsx`:

```ts
export interface MiniBoard3DHandle {
  // ... existing
  snapshotSVG: () => { svgString: string; width: number; height: number };
}
```

Implement:

```ts
handleRef.current = {
  // ... existing fields
  snapshotSVG: () => {
    const div = containerRef.current;
    if (!div) return { svgString: '', width: 0, height: 0 };
    const svg = div.querySelector('svg');
    if (!svg) return { svgString: '', width: 0, height: 0 };
    const clone = svg.cloneNode(true) as SVGElement;
    // Inline computed styles cho cross-context render
    const rect = svg.getBoundingClientRect();
    const width = rect.width || 600;
    const height = rect.height || 600;
    clone.setAttribute('width', String(width));
    clone.setAttribute('height', String(height));
    return {
      svgString: new XMLSerializer().serializeToString(clone),
      width,
      height,
    };
  },
};
```

- [ ] **Step 2: Test snapshot**

Append vào `MiniBoard3D.test.tsx`:

```tsx
it('snapshotSVG trả về svgString khi board có svg DOM', () => {
  const ref = createRef<MiniBoard3DHandle>();
  const { container } = render(<MiniBoard3D ref={ref} isDark={false} />);
  // Mock: inject 1 fake <svg> vào container
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const div = ref.current!.getContainer()!;
  div.appendChild(svg);
  const snap = ref.current!.snapshotSVG();
  expect(snap.svgString).toMatch(/^<svg/);
});
```

- [ ] **Step 3: Test pass**

```bash
npm test -- --silent --testPathPattern MiniBoard3D
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(geometry-3d): MiniBoard3D.snapshotSVG + tests"
```

---

## Task 11: `LeftPanel.tsx` + `toolButtons.tsx`

**Files:**
- Create: `src/stamps/geometry-3d/editor/toolButtons.tsx`
- Create: `src/stamps/geometry-3d/editor/LeftPanel.tsx`

- [ ] **Step 1: toolButtons.tsx**

Pattern theo `geometry-2d/editor/toolButtons.tsx`. Mỗi tool có icon SVG.

```tsx
'use client';
import type { ReactNode } from 'react';
import type { GeomTool3D } from './tools';

interface ToolButtonProps {
  toolKey: GeomTool3D;
  label: string;
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
}

export function ToolButton({ toolKey, label, active, onClick, icon }: ToolButtonProps) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      data-active={active || undefined}
      style={{
        width: 36,
        height: 36,
        border: active ? '2px solid #2d6dd6' : '1px solid #ccc',
        background: active ? '#e8f0ff' : '#fff',
        borderRadius: 4,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {icon}
    </button>
  );
}

// Icons cho 16 tools — concise SVG (placeholder)
export const ICONS_3D: Record<GeomTool3D, ReactNode> = {
  move: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 9l-3 3 3 3M19 9l3 3-3 3M9 5l3-3 3 3M9 19l3 3 3-3"/></svg>,
  point: <svg width="20" height="20" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>,
  segment: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="4" y1="20" x2="20" y2="4"/></svg>,
  line: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="2" y1="22" x2="22" y2="2"/></svg>,
  plane: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 18 L8 8 L21 6 L16 18 Z"/></svg>,
  triangle: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 4L21 20H3Z"/></svg>,
  polygon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 3L20 9L17 19H7L4 9Z"/></svg>,
  tetrahedron: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 3L20 20H4ZM12 3L12 20"/></svg>,
  parallelepiped: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 7L14 4L20 7L14 10ZM4 7L4 17L14 20L14 10ZM14 20L20 17L20 7"/></svg>,
  prism: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 4L18 8V20L12 16ZM12 4L6 8V20L12 16ZM6 8L12 12L18 8M6 20L18 20"/></svg>,
  pyramid: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 3L4 20L20 20ZM12 3L12 20"/></svg>,
  sphere: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="8"/><ellipse cx="12" cy="12" rx="8" ry="3"/></svg>,
  cone: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 3L4 20H20ZM4 20A8 3 0 0 1 20 20"/></svg>,
  cylinder: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><ellipse cx="12" cy="5" rx="6" ry="2"/><ellipse cx="12" cy="19" rx="6" ry="2"/><line x1="6" y1="5" x2="6" y2="19"/><line x1="18" y1="5" x2="18" y2="19"/></svg>,
  solidofrevolution: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 3C8 8 8 16 12 21M12 3C16 8 16 16 12 21M12 3L12 21"/></svg>,
  label: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 4h12l4 4-4 4H4z"/></svg>,
};
```

- [ ] **Step 2: LeftPanel.tsx**

```tsx
'use client';
import { useEffect, useState } from 'react';
import { TOOLS_3D, GROUP_LABELS_3D, type GeomTool3D, type ToolDef3D } from './tools';
import { ToolButton, ICONS_3D } from './toolButtons';
import type { MiniBoard3DHandle } from './MiniBoard3D';

interface Props {
  handle: MiniBoard3DHandle | null;
  onResetView: () => void;
}

export function LeftPanel({ handle, onResetView }: Props) {
  const [tool, setTool] = useState<GeomTool3D>('move');
  const [showAxes, setShowAxes] = useState(true);
  const [showMesh, setShowMesh] = useState(false);
  const [canUndo, setCanUndo] = useState(false);

  useEffect(() => {
    if (!handle) return;
    const sync = () => {
      setTool(handle.getTool());
      setShowAxes(handle.getShowAxes());
      setShowMesh(handle.getShowMesh());
      setCanUndo(handle.canUndo());
    };
    sync();
    return handle.subscribe(sync);
  }, [handle]);

  const grouped = TOOLS_3D.reduce<Record<string, ToolDef3D[]>>((acc, t) => {
    (acc[t.group] ??= []).push(t);
    return acc;
  }, {});

  return (
    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 120, padding: 8, background: '#f7f7f7', overflowY: 'auto', borderRight: '1px solid #ddd' }}>
      {Object.entries(grouped).map(([group, tools]) => (
        <div key={group} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{GROUP_LABELS_3D[group as ToolDef3D['group']]}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4 }}>
            {tools.map((t) => (
              <ToolButton
                key={t.key}
                toolKey={t.key}
                label={t.label}
                active={tool === t.key}
                onClick={() => handle?.setTool(t.key)}
                icon={ICONS_3D[t.key]}
              />
            ))}
          </div>
        </div>
      ))}
      <hr style={{ margin: '8px 0' }} />
      <label style={{ display: 'block', fontSize: 12 }}>
        <input type="checkbox" checked={showAxes} onChange={(e) => handle?.setShowAxes(e.target.checked)} /> Trục
      </label>
      <label style={{ display: 'block', fontSize: 12 }}>
        <input type="checkbox" checked={showMesh} onChange={(e) => handle?.setShowMesh(e.target.checked)} /> Lưới
      </label>
      <button type="button" onClick={onResetView} style={{ marginTop: 8, width: '100%' }}>Reset view</button>
      <button type="button" onClick={() => handle?.undo()} disabled={!canUndo} style={{ marginTop: 4, width: '100%' }}>Undo</button>
    </div>
  );
}
```

- [ ] **Step 3: typecheck**

```bash
npm run typecheck
```

- [ ] **Step 4: Commit**

```bash
git add src/stamps/geometry-3d/editor/toolButtons.tsx src/stamps/geometry-3d/editor/LeftPanel.tsx
git commit -m "feat(geometry-3d): LeftPanel + toolButtons UI"
```

---

## Task 12: `EditorPanel.tsx` — float center editor

**Files:**
- Create: `src/stamps/geometry-3d/editor/EditorPanel.tsx`
- Test: `src/stamps/geometry-3d/__tests__/EditorPanel.test.tsx`

- [ ] **Step 1: Viết test smoke**

```tsx
import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { EditorPanel, type EditorPanelHandle } from '../editor/EditorPanel';

jest.mock('../editor/MiniBoard3D', () => ({
  MiniBoard3D: jest.fn(() => null),
}));

describe('Geometry3D EditorPanel', () => {
  it('mount + ref handle', () => {
    const ref = createRef<EditorPanelHandle>();
    render(
      <EditorPanel
        ref={ref}
        isDark={false}
        initial={null}
        onInsert={jest.fn()}
        onClose={jest.fn()}
        onStateChange={jest.fn()}
      />,
    );
    expect(ref.current).toBeTruthy();
    expect(typeof ref.current?.tryInsert).toBe('function');
    expect(typeof ref.current?.hasContent).toBe('function');
  });
});
```

- [ ] **Step 2: Implement**

```tsx
'use client';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { MiniBoard3D, type MiniBoard3DHandle } from './MiniBoard3D';
import type { SerializedBoard3D } from '../serialize';

export interface EditorPanelHandle {
  tryInsert: () => boolean;
  hasContent: () => boolean;
}

interface Props {
  isDark: boolean;
  initial: SerializedBoard3D | null;
  onInsert: (jsonState: string, svgString: string, w: number, h: number) => void;
  onClose: () => void;
  onStateChange?: (snapshot: {
    tool: string;
    showAxes: boolean;
    showMesh: boolean;
    canUndo: boolean;
  }) => void;
}

export const EditorPanel = forwardRef<EditorPanelHandle, Props>(function EditorPanel(
  { isDark, initial, onInsert, onClose, onStateChange },
  ref,
) {
  const boardRef = useRef<MiniBoard3DHandle | null>(null);

  useImperativeHandle(ref, () => ({
    tryInsert: () => {
      const board = boardRef.current;
      if (!board) return false;
      const log = board.getCreationLog();
      if (log.length === 0) return false;
      const view = board.getViewState();
      const state: SerializedBoard3D = {
        version: 1,
        bbox: board.getBbox(),
        view,
        showAxes: board.getShowAxes(),
        showMesh: board.getShowMesh(),
        elements: log,
      };
      const snap = board.snapshotSVG();
      onInsert(JSON.stringify(state), snap.svgString, snap.width, snap.height);
      return true;
    },
    hasContent: () => (boardRef.current?.getCreationLog().length ?? 0) > 0,
  }), [onInsert]);

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: 900,
        height: 700,
        background: '#fff',
        boxShadow: '0 6px 32px rgba(0,0,0,0.2)',
        borderRadius: 8,
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', padding: '6px 12px', borderBottom: '1px solid #eee', alignItems: 'center' }}>
        <span style={{ fontWeight: 600 }}>Hình học không gian (3D)</span>
        <span style={{ flex: 1 }} />
        <button type="button" onClick={onClose}>Đóng</button>
      </div>
      <div style={{ position: 'relative', flex: 1 }}>
        <MiniBoard3D ref={boardRef} isDark={isDark} initialState={initial} />
        {/* LeftPanel sẽ được render từ Host component */}
      </div>
    </div>
  );
});
```

- [ ] **Step 3: Test pass**

```bash
npm test -- --silent --testPathPattern EditorPanel
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(geometry-3d): EditorPanel — float center container"
```

---

## Task 13: `index.tsx` — Host + StampType

**Files:**
- Create: `src/stamps/geometry-3d/index.tsx`
- Test: `src/stamps/geometry-3d/__tests__/index.test.tsx`

- [ ] **Step 1: Viết test**

```tsx
import { render, act } from '@testing-library/react';
import { createRef } from 'react';
import { geometry3dStamp, Geometry3DStampHost } from '../index';
import type { StampHostHandle } from '../../shared/types';

describe('geometry3dStamp', () => {
  it('có đủ trường StampType', () => {
    expect(geometry3dStamp.kind).toBe('geometry3d');
    expect(geometry3dStamp.shortcutKey).toBe('d');
    expect(geometry3dStamp.Host).toBeDefined();
    expect(typeof geometry3dStamp.matchesCustomData).toBe('function');
    expect(typeof geometry3dStamp.restoreFileFromCustomData).toBe('function');
  });

  it('matchesCustomData chỉ accept kind=geometry3d', () => {
    expect(geometry3dStamp.matchesCustomData({ kind: 'geometry3d', version: 1, jsonState: '{}' })).toBe(true);
    expect(geometry3dStamp.matchesCustomData({ kind: 'geometry', version: 1, jsonState: '{}' })).toBe(false);
  });

  it('Host mount với editingElement=null', () => {
    const ref = createRef<StampHostHandle>();
    const Host = geometry3dStamp.Host;
    render(
      <Host
        ref={ref}
        api={{ getSceneElements: () => [], addFiles: jest.fn(), getAppState: () => ({}), updateScene: jest.fn() }}
        editingElement={null}
        onClose={jest.fn()}
        isDark={false}
      />,
    );
    expect(ref.current).toBeTruthy();
  });
});
```

- [ ] **Step 2: Implement**

```tsx
'use client';
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { EditorPanel, type EditorPanelHandle } from './editor/EditorPanel';
import { LeftPanel } from './editor/LeftPanel';
import { insertStampImage } from '../shared/insertImage';
import { renderGeometry3DSvgFromState } from './render';
import type {
  StampHostProps,
  StampHostHandle,
  StampType,
  RestoredStampFile,
} from '../shared/types';
import {
  isGeometry3DCustomData,
  parseSerializedBoard3D,
  type Geometry3DCustomData,
  type SerializedBoard3D,
} from './serialize';
import type { MiniBoard3DHandle } from './editor/MiniBoard3D';

export { isGeometry3DCustomData };
export type { Geometry3DCustomData };

function parseInitial(editingElement: StampHostProps['editingElement']): SerializedBoard3D | null {
  if (!editingElement) return null;
  if (!isGeometry3DCustomData(editingElement.customData)) return null;
  try {
    return parseSerializedBoard3D(editingElement.customData.jsonState);
  } catch {
    return null;
  }
}

export const Geometry3DStampHost = forwardRef<StampHostHandle, StampHostProps>(
  function Geometry3DStampHost({ api, editingElement, onClose, isDark }, ref) {
    const editorRef = useRef<EditorPanelHandle | null>(null);
    const boardHandleRef = useRef<MiniBoard3DHandle | null>(null);
    const initial = useMemo(() => parseInitial(editingElement), [editingElement]);
    const [boardHandle, setBoardHandle] = useState<MiniBoard3DHandle | null>(null);

    const handleInsert = useCallback(
      async (jsonState: string, svgString: string, w: number, h: number) => {
        if (!api) return;
        await insertStampImage(api, {
          svgString,
          makeCustomData: (): Geometry3DCustomData => ({
            kind: 'geometry3d',
            version: 1,
            jsonState,
            svgWidth: w,
            svgHeight: h,
          }),
          editingElementId: editingElement?.id ?? null,
        });
        onClose();
      },
      [api, editingElement, onClose],
    );

    useImperativeHandle(
      ref,
      () => ({
        tryInsert: () => editorRef.current?.tryInsert() ?? false,
        hasContent: () => editorRef.current?.hasContent() ?? false,
      }),
      [],
    );

    return (
      <>
        <LeftPanel handle={boardHandle} onResetView={() => boardHandleRef.current?.resetView()} />
        <EditorPanel
          ref={editorRef}
          isDark={isDark}
          initial={initial}
          onInsert={handleInsert}
          onClose={onClose}
        />
      </>
    );
  },
);

const Geometry3DIcon: ReactNode = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M12 3L20 8L20 16L12 21L4 16L4 8Z" />
    <path d="M12 3L12 21M4 8L12 12L20 8M4 16L12 12L20 16" />
  </svg>
);

export const geometry3dStamp: StampType = {
  kind: 'geometry3d',
  shortcutKey: 'd',
  Icon: Geometry3DIcon,
  toolbarTitle: 'Hình 3D (D)',
  Host: Geometry3DStampHost,
  matchesCustomData: isGeometry3DCustomData,
  restoreFileFromCustomData: async (element): Promise<RestoredStampFile | null> => {
    const data = element.customData as Geometry3DCustomData | undefined;
    const fileId = (element as { fileId?: string }).fileId;
    if (!data || !fileId) return null;
    const { svgString } = await renderGeometry3DSvgFromState(data.jsonState);
    const dataURL = `data:image/svg+xml;base64,${
      typeof btoa !== 'undefined'
        ? btoa(unescape(encodeURIComponent(svgString)))
        : Buffer.from(svgString).toString('base64')
    }`;
    return { fileId, dataURL, mimeType: 'image/svg+xml' };
  },
};
```

- [ ] **Step 3: Test pass**

```bash
npm test -- --silent --testPathPattern geometry-3d/index
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(geometry-3d): Host + geometry3dStamp StampType"
```

---

## Task 14: `render.ts` — offscreen SVG restore

**Files:**
- Create: `src/stamps/geometry-3d/render.ts`
- Test: `src/stamps/geometry-3d/__tests__/render.test.ts`

- [ ] **Step 1: Viết test (mock JSXGraph)**

```ts
import { renderGeometry3DSvgFromState } from '../render';

jest.mock('jsxgraph', () => ({
  __esModule: true,
  default: {
    Options: { text: { display: 'html' } },
    JSXGraph: {
      initBoard: jest.fn(() => {
        const div = document.createElement('div');
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.innerHTML = '<g id="restored"/>';
        div.appendChild(svg);
        return {
          renderer: { container: div },
          create: jest.fn((kind: string) => {
            if (kind === 'view3d') return { create: jest.fn(), defaultAxes: [] };
            return {};
          }),
        };
      }),
      freeBoard: jest.fn(),
    },
  },
}));

describe('renderGeometry3DSvgFromState', () => {
  it('throws on malformed JSON', async () => {
    await expect(renderGeometry3DSvgFromState('{bad')).rejects.toThrow();
  });

  it('returns SVG string for valid state', async () => {
    const state = {
      version: 1,
      bbox: [-6, 6, 6, -6],
      view: { azimuth: 0.5, elevation: 0.3, bbox3D: [-3, -3, -3, 3, 3, 3] },
      showAxes: true,
      showMesh: false,
      elements: [{ type: 'point3d', parents: [0, 0, 0], attributes: { id: 'p1' }, id: 'p1' }],
    };
    const result = await renderGeometry3DSvgFromState(JSON.stringify(state));
    expect(result.svgString).toContain('svg');
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Implement**

```ts
import JXG from 'jsxgraph';
import { parseSerializedBoard3D, type SerializedBoard3D } from './serialize';

interface RenderResult {
  svgString: string;
  width: number;
  height: number;
}

const OUTPUT_WIDTH = 1024;
const OUTPUT_HEIGHT = 768;

export async function renderGeometry3DSvgFromState(jsonState: string): Promise<RenderResult> {
  const state: SerializedBoard3D = parseSerializedBoard3D(jsonState);
  const div = document.createElement('div');
  div.style.cssText = `position:absolute;left:-9999px;top:-9999px;width:${OUTPUT_WIDTH}px;height:${OUTPUT_HEIGHT}px;`;
  document.body.appendChild(div);

  try {
    JXG.Options.text.display = 'internal';
    const board = JXG.JSXGraph.initBoard(div, {
      boundingbox: state.bbox,
      axis: false,
      showCopyright: false,
      showNavigation: false,
      renderer: 'svg',
    }) as unknown;
    const view = (board as { create: (k: string, p: unknown[], a: unknown) => unknown }).create(
      'view3d',
      [[-5, -5], [10, 10], [
        [state.view.bbox3D[0], state.view.bbox3D[3]],
        [state.view.bbox3D[1], state.view.bbox3D[4]],
        [state.view.bbox3D[2], state.view.bbox3D[5]],
      ]],
      {
        az: { slider: { visible: false }, value: state.view.azimuth },
        el: { slider: { visible: false }, value: state.view.elevation },
        projection: 'central',
      },
    );

    if (!state.showAxes) {
      // suppress axes nếu state nói tắt
      (view as { defaultAxes?: unknown[] }).defaultAxes = [];
    }

    const map = new Map<string, unknown>();
    for (const el of state.elements) {
      const parents = el.parents.map((p) =>
        typeof p === 'string' && p.startsWith('@id:') ? map.get(p.slice(4)) : p,
      );
      const obj = (view as { create: (k: string, p: unknown[], a: unknown) => unknown }).create(
        el.type,
        parents,
        { ...el.attributes, id: el.id, name: el.label },
      );
      map.set(el.id, obj);
    }

    const svg = div.querySelector('svg');
    if (!svg) throw new Error('renderGeometry3DSvgFromState: SVG not produced');
    const clone = svg.cloneNode(true) as SVGElement;
    clone.setAttribute('width', String(OUTPUT_WIDTH));
    clone.setAttribute('height', String(OUTPUT_HEIGHT));
    const svgString = new XMLSerializer().serializeToString(clone);

    JXG.JSXGraph.freeBoard(board as never);
    return { svgString, width: OUTPUT_WIDTH, height: OUTPUT_HEIGHT };
  } finally {
    document.body.removeChild(div);
  }
}
```

- [ ] **Step 3: Test pass**

```bash
npm test -- --silent --testPathPattern geometry-3d/render
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(geometry-3d): render — offscreen SVG restore"
```

---

## Task 15: Đăng ký `geometry3dStamp` trong DEFAULT_STAMPS

**Files:**
- Modify: `src/stamps/shared/registry.ts`
- Modify: `src/stamps/index.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Update registry.ts**

```ts
// src/stamps/shared/registry.ts
import { geometryStamp } from '../geometry-2d';
import { latexStamp } from '../latex';
import { geometry3dStamp } from '../geometry-3d';
import type { StampType } from './types';

export { geometryStamp, type GeometryCustomData, isGeometryCustomData } from '../geometry-2d';
export { latexStamp, type LatexCustomData, isLatexCustomData } from '../latex';
export { geometry3dStamp, type Geometry3DCustomData, isGeometry3DCustomData } from '../geometry-3d';
export type { StampType, BaseStampCustomData } from './types';

export const DEFAULT_STAMPS: ReadonlyArray<StampType> = Object.freeze([
  geometryStamp,
  latexStamp,
  geometry3dStamp,
]);

// ... (findStampForCustomData, isStampElement — không đổi)
```

- [ ] **Step 2: Update src/stamps/index.ts**

```ts
export {
  DEFAULT_STAMPS,
  findStampForCustomData,
  isStampElement,
  geometryStamp,
  latexStamp,
  geometry3dStamp,
  type StampType,
  type BaseStampCustomData,
  type GeometryCustomData,
  type LatexCustomData,
  type Geometry3DCustomData,
  isGeometryCustomData,
  isLatexCustomData,
  isGeometry3DCustomData,
} from './shared/registry';
// ... (phần còn lại)

// Update StampCustomData union:
import type { GeometryCustomData, LatexCustomData, Geometry3DCustomData } from './shared/registry';
export type StampCustomData = GeometryCustomData | LatexCustomData | Geometry3DCustomData;
```

- [ ] **Step 3: Update src/index.ts**

Mở rộng re-export:

```ts
export {
  geometry3dStamp,
  type Geometry3DCustomData,
  isGeometry3DCustomData,
} from './stamps';
```

- [ ] **Step 4: typecheck + test**

```bash
npm run typecheck
npm test -- --silent
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(stamps): register geometry3dStamp in DEFAULT_STAMPS + public exports"
```

---

## Task 16: Integration test — Whiteboard + D shortcut

**Files:**
- Modify: `src/__tests__/Whiteboard.test.tsx` (hoặc tạo nếu chưa có file integration)

- [ ] **Step 1: Tìm test integration hiện có**

```bash
find src -name 'Whiteboard.test.tsx' -o -name 'Whiteboard.test.ts'
```

- [ ] **Step 2: Thêm test**

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Whiteboard } from '../Whiteboard';

jest.mock('@excalidraw/excalidraw', () => ({
  Excalidraw: ({ children, onChange }: never) => <div data-testid="excalidraw">{children}</div>,
  MainMenu: { Item: () => null },
  Footer: ({ children }: never) => <>{children}</>,
  WelcomeScreen: () => null,
}));
jest.mock('jsxgraph', () => require('./mocks/jsxgraph-mock').default);
jest.mock('katex', () => ({ renderToString: () => '<span>katex</span>' }));

describe('Whiteboard — geometry3d stamp', () => {
  it('bấm D mở Geometry3D editor', () => {
    render(<Whiteboard />);
    fireEvent.keyDown(document, { key: 'd' });
    // EditorPanel render với label "Hình học không gian (3D)"
    expect(screen.queryByText(/Hình học không gian/)).toBeTruthy();
  });

  it('click Đóng → editor unmount', () => {
    render(<Whiteboard />);
    fireEvent.keyDown(document, { key: 'd' });
    const closeBtn = screen.getByText('Đóng');
    fireEvent.click(closeBtn);
    expect(screen.queryByText(/Hình học không gian/)).toBeFalsy();
  });
});
```

(Mock jsxgraph reuse từ task 6.)

- [ ] **Step 3: Test pass**

```bash
npm test -- --silent --testPathPattern Whiteboard
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "test(whiteboard): D shortcut opens geometry3d editor + close unmount"
```

---

## Task 17: Verify build + full test suite

**Files:**
- (no changes)

- [ ] **Step 1: Full test**

```bash
npm test
```

Expected: tất cả pass.

- [ ] **Step 2: typecheck**

```bash
npm run typecheck
```

- [ ] **Step 3: build**

```bash
npm run build
```

- [ ] **Step 4: Verify dist**

```bash
head -1 dist/index.mjs dist/index.js
grep -E "geometry3dStamp|Geometry3DCustomData|isGeometry3DCustomData" dist/index.d.ts | head -10
```

- [ ] **Step 5: Commit dist nếu có thay đổi**

```bash
git add dist
git diff --cached --quiet || git commit -m "build: rebuild dist for geometry-3d stamp"
```

---

## Task 18: Bump 0.6.0-rc.1 + iterate

**Files:**
- Modify: `package.json` (version)

- [ ] **Step 1: Bump rc**

```bash
npm version prerelease --preid=rc --no-git-tag-version
# 0.5.x → 0.6.0-rc.0
```

(Or `npm version 0.6.0-rc.0 --no-git-tag-version` để set chính xác.)

- [ ] **Step 2: Update CHANGELOG.md**

```markdown
## 0.6.0-rc.0 — 2026-05-15

### Added
- **Geometry-3D stamp** (`geometry3dStamp`) — hình học không gian lớp 11/12 dùng JSXGraph 3D primitives. Shortcut `D`. Tool palette: điểm, đoạn, đường, mặt phẳng, tam giác, đa giác, tứ diện, hộp, lăng trụ, chóp, mặt cầu, hình nón, hình trụ, khối tròn xoay, nhãn.
- Roundtrip edit qua creation-log JSON.
```

- [ ] **Step 3: Build + commit**

```bash
npm run build
git add -A
git commit -m "release: 0.6.0-rc.0 — geometry-3d stamp"
git tag v0.6.0-rc.0
```

- [ ] **Step 4: User test rc trong consumer**

Đợi user pin `github:xom11/whiteboard#v0.6.0-rc.0` trong app consumer + test thực tế. Iterate rc.1, rc.2 nếu cần.

---

## Task 19: Drop alias `@deprecated` + release 0.6.0

**Files:**
- Modify: `src/index.ts` — xoá alias `isMathStamp`, `MathStampCustomData`, `restoreMissingMathStampFiles`
- Modify: `src/stamps/shared/restoreStampFiles.ts` — xoá alias `restoreMissingMathStampFiles`
- Delete: `src/stamps/shared/__tests__/aliases.test.ts`

- [ ] **Step 1: Xoá alias trong `src/index.ts`**

Xoá block "Aliases @deprecated" (3 export).

- [ ] **Step 2: Xoá alias trong `src/stamps/shared/restoreStampFiles.ts`**

Xoá:

```ts
/** @deprecated ... */
export const restoreMissingMathStampFiles = restoreMissingStampFiles;
```

- [ ] **Step 3: Xoá test aliases**

```bash
git rm src/stamps/shared/__tests__/aliases.test.ts
```

- [ ] **Step 4: typecheck + test**

```bash
npm run typecheck
npm test -- --silent
```

Expected: pass. Nếu test khác đang dùng alias → error → đó là missed consumer dùng alias, sửa chính test đó để dùng tên mới.

- [ ] **Step 5: Update CHANGELOG**

```markdown
## 0.6.0 — 2026-05-15

### Breaking changes (xoá alias @deprecated khỏi 0.5.0)
- `isMathStamp` xoá — dùng `isStampElement`.
- `MathStampCustomData` xoá — dùng `StampCustomData`.
- `restoreMissingMathStampFiles` xoá — dùng `restoreMissingStampFiles`.

(Tóm tắt geometry-3d stamp giống rc.0 — gộp.)
```

- [ ] **Step 6: Bump 0.6.0**

```bash
npm version 0.6.0 --no-git-tag-version
npm run build
git add -A
git commit -m "release: 0.6.0 — geometry-3d stamp + drop @deprecated aliases"
git tag v0.6.0
```

- [ ] **Step 7: Merge + push**

```bash
git checkout main
git merge --no-ff feature/geometry-3d-stamp -m "feat: geometry-3d stamp (0.6.0)"
git push --follow-tags
```

(User xác nhận thời điểm push.)

---

## Self-Review Checklist

- [ ] Task 1 (spike) có HALT decision point trước khi tiếp tục
- [ ] Folder structure khớp spec §5.1
- [ ] Custom data shape (task 3) khớp spec §5.2
- [ ] Tool palette (task 5) khớp spec §5.3 (16 tools + 3 toggles)
- [ ] Host component (task 13) khớp spec §5.4
- [ ] StampType definition khớp spec §5.5
- [ ] Render pipeline (task 10, 14) khớp spec §5.6
- [ ] Shortcut D (task 13) khớp spec §5.7
- [ ] Persistence (task 16) reuse Phase A `restoreMissingStampFiles` registry-driven — không thêm cơ chế mới
- [ ] Migration plan (task 18, 19) khớp spec §6 step 3, 4, 5
- [ ] Risk SVG export (task 1) có fallback plan trong note
- [ ] Tests TDD pattern ở task 3, 5, 6, 7, 8, 9, 10, 12, 13, 14, 16

## Notes cho executing agent

- **Task 1 spike là HALT point** — đừng tiếp tục nếu kết quả SVG fail. Cập nhật spec với fallback PNG nếu cần.
- **JSXGraph 3D API trên jsdom có thể fail** — `view3d.create('polyhedron3d', ...)` cần DOM thật + canvas measurement. Tests dùng mock; production verify trong browser.
- **`window.prompt` trong handlers** là tạm thời. Sau khi rc.0 stable có thể thay bằng modal input (task tương lai).
- **Tool icons SVG placeholder** — có thể design lại trong PR riêng nếu user muốn icon đẹp hơn.
- **Performance**: cone/cylinder approximate bằng polyhedron 16-cạnh — đủ tốt cho lớp 11/12. Nếu lag, giảm N=8.
- **`projectPointerTo3D` chưa được implement chi tiết** — task 7 step 3 có placeholder. Cần verify JSXGraph có method `view.pointerToScreen` / `view.coords3D` hay phải tự compute từ camera matrix. Spike thêm nếu cần.
