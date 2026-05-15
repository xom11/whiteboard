# Phase A — `src/stamps/` Reorg Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đổi `src/stamp/` (số ít) → `src/stamps/` (by-feature, registry-driven) mà không thay đổi behavior. Tách `JSXGraphMiniBoard.tsx` (1654 dòng) thành 4 file gọn. Rename public symbol theo registry semantics, vẫn re-export alias `@deprecated`. Release `0.5.0`.

**Architecture:** Mỗi stamp 1 folder tự đóng gói (`geometry-2d/`, `latex/`); common code chuyển sang `shared/` (registry, types, helpers). `src/core/insertStampImage.ts` chuyển vào `stamps/shared/insertImage.ts` (nằm cùng folder với consumer). Refactor net-regression — toàn bộ test suite hiện tại pass sau mỗi commit. Cuối phase tách `JSXGraphMiniBoard.tsx` thành core / tools / handlers / styles.

**Tech Stack:** TypeScript 5, React 19, Jest 29 + jsdom, tsup 8. Không thêm dependency.

**Reference spec:** `docs/superpowers/specs/2026-05-15-reorg-and-3d-stamp-design.md` §4.

---

## File Structure (đích)

```
src/
  stamps/
    geometry-2d/
      index.tsx                  # StampType + Host (cũ: registry/geometry.tsx)
      editor/
        EditorPanel.tsx          # cũ: GeometryEditorPanel.tsx
        MiniBoard.tsx            # core (~400 dòng, từ JSXGraphMiniBoard.tsx)
        tools.ts                 # tool state + types (~400 dòng)
        handlers.ts              # pointer handlers (~400 dòng)
        styles.ts                # JXG attributes builder (~250 dòng)
        toolButtons.tsx          # cũ: jsxgraph/tools.tsx
        LeftPanel.tsx            # cũ: StampLeftPanel.tsx (geometry phần)
        PropertiesPopover.tsx
        TransformParamPopover.tsx
        transforms.ts
        theme.ts                 # cũ: geometryTheme.ts
      serialize.ts               # cũ: serializeBoard.ts
      render.ts                  # cũ: renderGeometryFromState.ts
      renderInline.ts            # cũ: renderGeometryToSvg.ts
      __tests__/
        ... (di chuyển từ stamp/__tests__/)
    latex/
      index.tsx                  # StampType + Host (cũ: registry/latex.tsx)
      editor/
        EditorPopover.tsx        # cũ: LatexEditorPopover.tsx
        LeftPanel.tsx            # cũ: StampLeftPanel.tsx (latex phần)
      render.ts                  # cũ: renderLatexToSvg.ts
      __tests__/
    shared/
      registry.ts                # cũ: stamp/registry/index.ts
      types.ts                   # cũ: stamp/registry/types.ts
      insertImage.ts             # cũ: core/insertStampImage.ts
      svgToImage.ts              # cũ: svgToImageElement.ts
      excalidrawPalette.ts
      stamp.css
      ToolbarInjector.tsx        # cũ: ToolbarStampInjector.tsx
      useShortcuts.ts            # cũ: useStampShortcuts.ts
      restoreStampFiles.ts       # cũ: restoreMathStampFiles.ts (registry-driven)
      __tests__/
        registry.test.ts
        restoreStampFiles.test.ts
        aliases.test.ts          # MỚI
    index.ts                     # barrel cho new public API
  Whiteboard.tsx                 # update imports
  ExcalidrawWithMenus.tsx        # update imports (nếu có)
  index.ts                       # public API mới + alias @deprecated
  serialize.ts                   # không đổi
  types.ts                       # không đổi
  core/
    persistence/                 # không đổi
```

**Xoá hoàn toàn sau task migrate:**
- `src/stamp/` (toàn bộ)
- `src/core/insertStampImage.ts` + `src/core/__tests__/insertStampImage.test.ts` (di chuyển)

---

## Task 1: Setup branch + tạo skeleton folders

**Files:**
- Create: `src/stamps/geometry-2d/editor/.gitkeep`
- Create: `src/stamps/geometry-2d/__tests__/.gitkeep`
- Create: `src/stamps/latex/editor/.gitkeep`
- Create: `src/stamps/latex/__tests__/.gitkeep`
- Create: `src/stamps/shared/__tests__/.gitkeep`

- [ ] **Step 1: Tạo branch**

```bash
git checkout -b refactor/stamps-folder-layout
```

- [ ] **Step 2: Tạo skeleton folders**

```bash
mkdir -p src/stamps/geometry-2d/editor src/stamps/geometry-2d/__tests__
mkdir -p src/stamps/latex/editor src/stamps/latex/__tests__
mkdir -p src/stamps/shared/__tests__
touch src/stamps/geometry-2d/editor/.gitkeep
touch src/stamps/geometry-2d/__tests__/.gitkeep
touch src/stamps/latex/editor/.gitkeep
touch src/stamps/latex/__tests__/.gitkeep
touch src/stamps/shared/__tests__/.gitkeep
```

- [ ] **Step 3: Verify baseline test suite pass**

```bash
npm test -- --silent
```

Expected: tất cả tests pass. Ghi lại số test (vd `Tests: 42 passed, 42 total`). Mọi task sau phải duy trì số này (trừ task thêm test mới).

- [ ] **Step 4: Commit**

```bash
git add src/stamps
git commit -m "refactor(stamps): skeleton folders for new layout"
```

---

## Task 2: Di chuyển `shared/` (registry + types + helpers)

**Files:**
- Move: `src/stamp/registry/index.ts` → `src/stamps/shared/registry.ts`
- Move: `src/stamp/registry/types.ts` → `src/stamps/shared/types.ts`
- Move: `src/stamp/svgToImageElement.ts` → `src/stamps/shared/svgToImage.ts`
- Move: `src/stamp/excalidrawPalette.ts` → `src/stamps/shared/excalidrawPalette.ts`
- Move: `src/stamp/stamp.css` → `src/stamps/shared/stamp.css`
- Move: `src/core/insertStampImage.ts` → `src/stamps/shared/insertImage.ts`
- Move: `src/stamp/registry/__tests__/*` → `src/stamps/shared/__tests__/registry.test.ts` (renamed)
- Move: `src/core/__tests__/insertStampImage.test.ts` → `src/stamps/shared/__tests__/insertImage.test.ts`

Lưu ý: chưa sửa import của các file gốc. Chỉ move + update import trong file vừa move (vì nội bộ stamp imports nhau).

- [ ] **Step 1: git mv các file shared**

```bash
git mv src/stamp/registry/index.ts src/stamps/shared/registry.ts
git mv src/stamp/registry/types.ts src/stamps/shared/types.ts
git mv src/stamp/svgToImageElement.ts src/stamps/shared/svgToImage.ts
git mv src/stamp/excalidrawPalette.ts src/stamps/shared/excalidrawPalette.ts
git mv src/stamp/stamp.css src/stamps/shared/stamp.css
git mv src/core/insertStampImage.ts src/stamps/shared/insertImage.ts
```

- [ ] **Step 2: Move tests**

```bash
git mv src/stamp/registry/__tests__/registry.test.ts src/stamps/shared/__tests__/registry.test.ts 2>/dev/null || true
git mv src/core/__tests__/insertStampImage.test.ts src/stamps/shared/__tests__/insertImage.test.ts
# Xoá folder cũ trống
rmdir src/stamp/registry/__tests__ 2>/dev/null || true
rmdir src/stamp/registry 2>/dev/null || true
rmdir src/core/__tests__ 2>/dev/null || true
```

- [ ] **Step 3: Cập nhật imports trong `src/stamps/shared/registry.ts`**

File hiện import `./geometry` và `./latex` (vì cũ ở `registry/`). Vì giờ registry.ts nằm `shared/`, geometry/latex sẽ nằm `../geometry-2d/index` và `../latex/index`. Nhưng các stamp file chưa move — tạm giữ import cũ tới `src/stamp/registry/geometry` và `src/stamp/registry/latex` qua relative path mới: `../../stamp/registry/geometry` và `../../stamp/registry/latex`. Sẽ sửa lại trong task 4 & 5.

Edit `src/stamps/shared/registry.ts`:

```ts
// Old: import { geometryStamp } from './geometry';
// Old: import { latexStamp } from './latex';
import { geometryStamp } from '../../stamp/registry/geometry';
import { latexStamp } from '../../stamp/registry/latex';
import type { StampType } from './types';

export { geometryStamp, type GeometryCustomData, isGeometryCustomData } from '../../stamp/registry/geometry';
export { latexStamp, type LatexCustomData, isLatexCustomData } from '../../stamp/registry/latex';
export type { StampType, BaseStampCustomData } from './types';

export const DEFAULT_STAMPS: ReadonlyArray<StampType> = Object.freeze([geometryStamp, latexStamp]);

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

- [ ] **Step 4: Cập nhật `src/stamps/shared/insertImage.ts`**

Edit import duy nhất:

```ts
// Old: import { svgToImageElement } from '../stamp/svgToImageElement';
import { svgToImageElement } from './svgToImage';
import type { ExcalidrawElement } from '../../types';
```

- [ ] **Step 5: Cập nhật imports trong file gốc trỏ vào shared/**

Các file còn ở `src/stamp/` đang import `./registry`, `./registry/types`, `./svgToImageElement`, `./excalidrawPalette`, `./stamp.css`. Update từng cái:

```bash
# Tự tìm + replace bằng sed (chạy mỗi cái và verify)
find src/stamp -type f \( -name '*.ts' -o -name '*.tsx' \) -exec sed -i '' \
  -e "s|from './registry/types'|from '../stamps/shared/types'|g" \
  -e "s|from './registry'|from '../stamps/shared/registry'|g" \
  -e "s|from './svgToImageElement'|from '../stamps/shared/svgToImage'|g" \
  -e "s|from './excalidrawPalette'|from '../stamps/shared/excalidrawPalette'|g" \
  {} +
```

Update `src/stamp/registry/geometry.tsx` (đang trong `registry/` — chưa move, nhưng folder `registry/` đã được lấy đi 2 file index/types). File này import `./types` → giờ phải `../../stamps/shared/types`. Đồng thời import `../../core/insertStampImage` → `../../stamps/shared/insertImage`.

```bash
sed -i '' \
  -e "s|from './types'|from '../../stamps/shared/types'|g" \
  -e "s|from '../../core/insertStampImage'|from '../../stamps/shared/insertImage'|g" \
  src/stamp/registry/geometry.tsx src/stamp/registry/latex.tsx
```

Update `src/Whiteboard.tsx`:

```ts
// Old: import type { StampHostHandle } from './stamp/registry/types';
import type { StampHostHandle } from './stamps/shared/types';
// Old: import './stamp/stamp.css';
import './stamps/shared/stamp.css';
```

Tìm các import khác trong `src/Whiteboard.tsx` từ `./stamp/`:

```bash
grep -nE "from './stamp/" src/Whiteboard.tsx
```

Cập nhật `DEFAULT_STAMPS`/`findStampForCustomData`/`isStampElement`/`StampType` imports nếu có:

```ts
import { DEFAULT_STAMPS, findStampForCustomData } from './stamps/shared/registry';
import type { StampType } from './stamps/shared/types';
```

- [ ] **Step 6: Run typecheck + test**

```bash
npm run typecheck
npm test -- --silent
```

Expected: tất cả pass. Số test = baseline (task 1 step 3).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor(stamps): move shared registry/types/helpers to src/stamps/shared"
```

---

## Task 3: Di chuyển `shared/` UI helpers + restore

**Files:**
- Move: `src/stamp/ToolbarStampInjector.tsx` → `src/stamps/shared/ToolbarInjector.tsx`
- Move: `src/stamp/useStampShortcuts.ts` → `src/stamps/shared/useShortcuts.ts`
- Move: `src/stamp/restoreMathStampFiles.ts` → `src/stamps/shared/restoreStampFiles.ts`
- Modify: imports trong các file vừa move + Whiteboard.tsx
- Move: `src/stamp/__tests__/ToolbarStampInjector.test.tsx` (nếu có) → `src/stamps/shared/__tests__/`
- Move: `src/stamp/__tests__/useStampShortcuts.test.ts` (nếu có) → `src/stamps/shared/__tests__/`
- Move: `src/stamp/__tests__/restoreMathStampFiles.test.ts` (nếu có) → `src/stamps/shared/__tests__/restoreStampFiles.test.ts`

- [ ] **Step 1: git mv**

```bash
git mv src/stamp/ToolbarStampInjector.tsx src/stamps/shared/ToolbarInjector.tsx
git mv src/stamp/useStampShortcuts.ts src/stamps/shared/useShortcuts.ts
git mv src/stamp/restoreMathStampFiles.ts src/stamps/shared/restoreStampFiles.ts
```

- [ ] **Step 2: Tìm + move test tương ứng**

```bash
ls src/stamp/__tests__/ | grep -iE "toolbar|shortcut|restore"
# Move từng cái nếu tồn tại
git mv src/stamp/__tests__/ToolbarStampInjector.test.tsx src/stamps/shared/__tests__/ToolbarInjector.test.tsx 2>/dev/null || true
git mv src/stamp/__tests__/useStampShortcuts.test.ts src/stamps/shared/__tests__/useShortcuts.test.ts 2>/dev/null || true
git mv src/stamp/__tests__/restoreMathStampFiles.test.ts src/stamps/shared/__tests__/restoreStampFiles.test.ts 2>/dev/null || true
```

- [ ] **Step 3: Cập nhật imports trong shared/ToolbarInjector.tsx + useShortcuts.ts**

Cả hai đang `import './registry'` và `./registry/types` — giờ là sibling:

```bash
sed -i '' \
  -e "s|from './registry'|from './registry'|g" \
  -e "s|from './registry/types'|from './types'|g" \
  src/stamps/shared/ToolbarInjector.tsx src/stamps/shared/useShortcuts.ts
```

Wait — `./registry` đã là sibling (cùng nằm shared/) → đúng. Chỉ cần đổi `./registry/types` → `./types`.

Verify:

```bash
grep -nE "^import" src/stamps/shared/ToolbarInjector.tsx src/stamps/shared/useShortcuts.ts
```

- [ ] **Step 4: Cập nhật `src/stamps/shared/restoreStampFiles.ts`**

Đổi tên function export `restoreMissingMathStampFiles` → `restoreMissingStampFiles`. Update import paths.

Edit file:

```ts
// Old: import { DEFAULT_STAMPS, findStampForCustomData } from './registry';
// Old: import type { StampType } from './registry/types';
import { DEFAULT_STAMPS, findStampForCustomData } from './registry';
import type { StampType } from './types';
// Các import từ stamp khác (renderGeometryFromState, renderLatexToSvg) → giữ tạm trỏ về src/stamp/
// SẼ XOÁ trong task 8 (registry-driven). Hiện tại file vẫn dùng switch case kind=='geometry'/'latex'.

// Đổi tên export:
export async function restoreMissingStampFiles(
  api: unknown,
  elements: readonly unknown[],
  stamps: ReadonlyArray<StampType> = DEFAULT_STAMPS,
): Promise<void> {
  // ... nội dung hiện tại
}

// Alias @deprecated — sẽ xoá trong 0.6.0
/** @deprecated Dùng restoreMissingStampFiles thay vì restoreMissingMathStampFiles */
export const restoreMissingMathStampFiles = restoreMissingStampFiles;
```

- [ ] **Step 5: Cập nhật Whiteboard.tsx imports**

```bash
grep -nE "from './stamp/" src/Whiteboard.tsx
```

Đổi từng cái:

```ts
import { ToolbarInjector } from './stamps/shared/ToolbarInjector';
import { useShortcuts } from './stamps/shared/useShortcuts';
import { restoreMissingStampFiles } from './stamps/shared/restoreStampFiles';
```

Lưu ý đổi tên symbol: `ToolbarStampInjector` → `ToolbarInjector`, `useStampShortcuts` → `useShortcuts`. Trong file `Whiteboard.tsx`, tìm + thay tên tham chiếu.

```bash
grep -nE "ToolbarStampInjector|useStampShortcuts|restoreMissingMathStampFiles" src/Whiteboard.tsx
# Đổi từng cái
```

Update inside ToolbarInjector.tsx + useShortcuts.ts: đổi export name từ `ToolbarStampInjector` → `ToolbarInjector`, `useStampShortcuts` → `useShortcuts`. Giữ alias `@deprecated` re-export ở mức `src/stamps/shared/registry.ts` (sẽ làm trong task 9).

- [ ] **Step 6: typecheck + test**

```bash
npm run typecheck
npm test -- --silent
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor(stamps): move shared UI helpers + rename ToolbarInjector/useShortcuts/restoreMissingStampFiles"
```

---

## Task 4: Di chuyển `latex/` stamp

**Files:**
- Move: `src/stamp/registry/latex.tsx` → `src/stamps/latex/index.tsx`
- Move: `src/stamp/LatexEditorPopover.tsx` → `src/stamps/latex/editor/EditorPopover.tsx`
- Move: `src/stamp/renderLatexToSvg.ts` → `src/stamps/latex/render.ts`
- Split: `src/stamp/StampLeftPanel.tsx` (348 dòng) — tách phần latex → `src/stamps/latex/editor/LeftPanel.tsx` (geometry phần để task 5 xử lý cùng)
- Move: tests latex tương ứng

- [ ] **Step 1: git mv main files**

```bash
git mv src/stamp/registry/latex.tsx src/stamps/latex/index.tsx
git mv src/stamp/LatexEditorPopover.tsx src/stamps/latex/editor/EditorPopover.tsx
git mv src/stamp/renderLatexToSvg.ts src/stamps/latex/render.ts
```

- [ ] **Step 2: Tách `StampLeftPanel.tsx`**

`StampLeftPanel.tsx` export `GeometryLeftPanel` + `LatexLeftPanel`. Đọc file, tạo:

- `src/stamps/latex/editor/LeftPanel.tsx`: chứa `LatexLeftPanel` (đổi tên thành `LeftPanel`) + import phụ thuộc.
- `src/stamps/geometry-2d/editor/LeftPanel.tsx`: chứa `GeometryLeftPanel` (đổi tên thành `LeftPanel`) + import phụ thuộc.

Cụ thể:

```bash
# Read file
cat src/stamp/StampLeftPanel.tsx
```

Identify boundary: line range của `GeometryLeftPanel` vs `LatexLeftPanel`. Header imports/types chung — duplicate sang cả 2 file mới hoặc nếu phần chung > 50 dòng thì giữ trong `src/stamps/shared/leftPanelCommon.ts`. (Khi đọc thấy phần chung nhỏ → duplicate.)

Tạo 2 file mới. Verify mỗi file <200 dòng. Xoá file gốc:

```bash
rm src/stamp/StampLeftPanel.tsx
```

- [ ] **Step 3: Move tests latex**

```bash
ls src/stamp/__tests__/ | grep -iE "latex|stamp.*panel" || true
git mv src/stamp/__tests__/LatexEditorPopover.test.tsx src/stamps/latex/__tests__/EditorPopover.test.tsx 2>/dev/null || true
git mv src/stamp/__tests__/renderLatexToSvg.test.ts src/stamps/latex/__tests__/render.test.ts 2>/dev/null || true
```

- [ ] **Step 4: Cập nhật imports trong các file vừa move**

`src/stamps/latex/index.tsx`:

```ts
// Old: import { LatexLeftPanel } from '../StampLeftPanel';
import { LeftPanel as LatexLeftPanel } from './editor/LeftPanel';
// Old: import { LatexEditorPopover, type LatexEditorHandle } from '../LatexEditorPopover';
import { EditorPopover as LatexEditorPopover, type EditorPopoverHandle as LatexEditorHandle } from './editor/EditorPopover';
// Old: import { insertStampImage } from '../../core/insertStampImage';
import { insertStampImage } from '../shared/insertImage';
// Old: import { renderLatexToSvg } from '../renderLatexToSvg';
import { renderLatexToSvg } from './render';
// Old: import type { ... } from './types';
import type { BaseStampCustomData, StampHostProps, StampHostHandle, StampType } from '../shared/types';
```

Đồng thời đổi tên trong file `EditorPopover.tsx`: export `LatexEditorPopover` → `EditorPopover`, `LatexEditorHandle` → `EditorPopoverHandle`. Tìm trong file:

```bash
grep -nE "export (function|const|interface|type) Latex" src/stamps/latex/editor/EditorPopover.tsx
```

Sửa từng cái.

`src/stamps/latex/render.ts`: hiện tại không phụ thuộc internal — chỉ import `katex`. Verify:

```bash
grep -nE "^import" src/stamps/latex/render.ts
```

Không cần sửa nếu chỉ có `katex`.

- [ ] **Step 5: typecheck + test**

```bash
npm run typecheck
npm test -- --silent
```

Test render.test.ts có thể fail vì import cũ chưa cập nhật. Đọc test file, sửa import.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(stamps): move latex stamp into src/stamps/latex/"
```

---

## Task 5: Di chuyển `geometry-2d/` stamp (chưa tách MiniBoard)

**Files:**
- Move: `src/stamp/registry/geometry.tsx` → `src/stamps/geometry-2d/index.tsx`
- Move: `src/stamp/GeometryEditorPanel.tsx` → `src/stamps/geometry-2d/editor/EditorPanel.tsx`
- Move: `src/stamp/JSXGraphMiniBoard.tsx` → `src/stamps/geometry-2d/editor/MiniBoard.tsx` (file đơn, chưa tách)
- Move: `src/stamp/serializeBoard.ts` → `src/stamps/geometry-2d/serialize.ts`
- Move: `src/stamp/renderGeometryFromState.ts` → `src/stamps/geometry-2d/render.ts`
- Move: `src/stamp/renderGeometryToSvg.ts` → `src/stamps/geometry-2d/renderInline.ts`
- Move: `src/stamp/transforms.ts` → `src/stamps/geometry-2d/editor/transforms.ts`
- Move: `src/stamp/geometryTheme.ts` → `src/stamps/geometry-2d/editor/theme.ts`
- Move: `src/stamp/PropertiesPopover.tsx` → `src/stamps/geometry-2d/editor/PropertiesPopover.tsx`
- Move: `src/stamp/TransformParamPopover.tsx` → `src/stamps/geometry-2d/editor/TransformParamPopover.tsx`
- Move: `src/stamp/jsxgraph/tools.tsx` → `src/stamps/geometry-2d/editor/toolButtons.tsx`
- Move: tests tương ứng

- [ ] **Step 1: git mv main files**

```bash
git mv src/stamp/registry/geometry.tsx src/stamps/geometry-2d/index.tsx
git mv src/stamp/GeometryEditorPanel.tsx src/stamps/geometry-2d/editor/EditorPanel.tsx
git mv src/stamp/JSXGraphMiniBoard.tsx src/stamps/geometry-2d/editor/MiniBoard.tsx
git mv src/stamp/serializeBoard.ts src/stamps/geometry-2d/serialize.ts
git mv src/stamp/renderGeometryFromState.ts src/stamps/geometry-2d/render.ts
git mv src/stamp/renderGeometryToSvg.ts src/stamps/geometry-2d/renderInline.ts
git mv src/stamp/transforms.ts src/stamps/geometry-2d/editor/transforms.ts
git mv src/stamp/geometryTheme.ts src/stamps/geometry-2d/editor/theme.ts
git mv src/stamp/PropertiesPopover.tsx src/stamps/geometry-2d/editor/PropertiesPopover.tsx
git mv src/stamp/TransformParamPopover.tsx src/stamps/geometry-2d/editor/TransformParamPopover.tsx
git mv src/stamp/jsxgraph/tools.tsx src/stamps/geometry-2d/editor/toolButtons.tsx
rmdir src/stamp/jsxgraph 2>/dev/null || true
```

- [ ] **Step 2: Move tests**

```bash
# Liệt kê tests còn lại
ls src/stamp/__tests__/
# Move tất cả còn lại của geometry vào geometry-2d/__tests__
git mv src/stamp/__tests__/JSXGraphMiniBoard.test.tsx src/stamps/geometry-2d/__tests__/MiniBoard.test.tsx 2>/dev/null || true
git mv src/stamp/__tests__/GeometryEditorPanel.test.tsx src/stamps/geometry-2d/__tests__/EditorPanel.test.tsx 2>/dev/null || true
git mv src/stamp/__tests__/serializeBoard.test.ts src/stamps/geometry-2d/__tests__/serialize.test.ts 2>/dev/null || true
git mv src/stamp/__tests__/renderGeometryFromState.test.ts src/stamps/geometry-2d/__tests__/render.test.ts 2>/dev/null || true
git mv src/stamp/__tests__/transforms.test.ts src/stamps/geometry-2d/__tests__/transforms.test.ts 2>/dev/null || true
git mv src/stamp/__tests__/geometryTheme.test.ts src/stamps/geometry-2d/__tests__/theme.test.ts 2>/dev/null || true
# Còn lại
ls src/stamp/__tests__/ 2>&1
```

Nếu còn test, move vào geometry-2d/__tests__/ theo tên tương ứng.

- [ ] **Step 3: Cập nhật imports trong các file vừa move**

Đây là task lớn nhất — nhiều cross-import. Theo mapping:

| File | Imports thay đổi |
|---|---|
| `geometry-2d/index.tsx` | `'../StampLeftPanel'` → `'./editor/LeftPanel'` (sẽ tạo trong step 4); `'../GeometryEditorPanel'` → `'./editor/EditorPanel'`; `'../../core/insertStampImage'` → `'../shared/insertImage'`; `'../renderGeometryFromState'` → `'./render'`; `'../serializeBoard'` → `'./serialize'`; `'./types'` → `'../shared/types'` |
| `geometry-2d/editor/EditorPanel.tsx` | `'./JSXGraphMiniBoard'` → `'./MiniBoard'`; `'./serializeBoard'` → `'../serialize'`; `'./renderGeometryFromState'` → `'../render'`; `'./PropertiesPopover'` → `'./PropertiesPopover'`; `'./TransformParamPopover'` → `'./TransformParamPopover'` |
| `geometry-2d/editor/MiniBoard.tsx` | `'./serializeBoard'` → `'../serialize'`; `'./transforms'` → `'./transforms'`; `'./jsxgraph/tools'` → `'./toolButtons'`; `'./geometryTheme'` → `'./theme'` |
| `geometry-2d/serialize.ts` | `'./geometryTheme'` → `'./editor/theme'` |
| `geometry-2d/render.ts` | `'./renderGeometryToSvg'` → `'./renderInline'`; `'./serializeBoard'` → `'./serialize'`; `'./geometryTheme'` → `'./editor/theme'` |
| `geometry-2d/renderInline.ts` | verify imports |
| `geometry-2d/editor/PropertiesPopover.tsx` | `'./excalidrawPalette'` → `'../../shared/excalidrawPalette'` |
| `geometry-2d/editor/transforms.ts` | (kiểm tra) |
| `geometry-2d/editor/theme.ts` | (kiểm tra) |
| `geometry-2d/editor/toolButtons.tsx` | (kiểm tra) |

Sửa từng file. Sau mỗi cụm chạy `npm run typecheck` để bắt sớm.

```bash
grep -nE "^import" src/stamps/geometry-2d/index.tsx
# Sửa từng dòng
```

- [ ] **Step 4: Tách `StampLeftPanel.tsx` (geometry phần) sang `geometry-2d/editor/LeftPanel.tsx`**

Tham chiếu phần đã làm trong task 4 step 2 — nếu chưa tách geometry, làm bây giờ:

Đọc `src/stamp/StampLeftPanel.tsx` (nếu còn) hoặc dùng git history. Tạo `src/stamps/geometry-2d/editor/LeftPanel.tsx` với `GeometryLeftPanel` được đổi tên `LeftPanel`. Import:

```ts
// Old: import { TOOLS, GROUP_LABELS, type GeomTool, type ToolDef } from './JSXGraphMiniBoard';
import { TOOLS, GROUP_LABELS, type GeomTool, type ToolDef } from './MiniBoard';
```

Nếu file `StampLeftPanel.tsx` đã bị xoá ở task 4, đảm bảo geometry phần đã được copy đúng vào đây.

- [ ] **Step 5: Verify import chain — typecheck**

```bash
npm run typecheck 2>&1 | head -50
```

Sửa các lỗi missing module. Mỗi lỗi indication đúng file → file imports không đúng path mới.

- [ ] **Step 6: Test**

```bash
npm test -- --silent
```

Test có thể fail do import paths trong test file. Sửa imports trong các file tests vừa move.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor(stamps): move geometry-2d files into src/stamps/geometry-2d/"
```

---

## Task 6: Xoá `src/stamp/` (folder cũ)

**Files:**
- Delete: `src/stamp/index.ts` (barrel cũ)
- Delete: `src/stamp/types.ts` (shim cũ)
- Delete: `src/stamp/StampToolButtons.tsx` (chưa được dùng — verify)
- Delete: folder `src/stamp/` nếu trống

- [ ] **Step 1: Kiểm tra residue trong `src/stamp/`**

```bash
find src/stamp -type f
```

Còn lại: `index.ts`, `types.ts`, `StampToolButtons.tsx`. (Verify bằng output.)

- [ ] **Step 2: Verify không file nào còn import từ `src/stamp/`**

```bash
grep -rn "from '.*stamp/" src/ docs/ --include='*.ts' --include='*.tsx' | grep -v "from '.*stamps/" || echo "Clean"
```

Expected: `Clean` hoặc chỉ còn import từ `stamps/` (số nhiều).

- [ ] **Step 3: Xoá**

```bash
rm src/stamp/index.ts src/stamp/types.ts src/stamp/StampToolButtons.tsx
rmdir src/stamp/__tests__ 2>/dev/null || true
rmdir src/stamp 2>/dev/null
ls src/stamp 2>&1 || echo "Folder removed"
```

- [ ] **Step 4: typecheck + test**

```bash
npm run typecheck
npm test -- --silent
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(stamps): remove obsolete src/stamp/ folder"
```

---

## Task 7: Tạo barrel `src/stamps/index.ts`

**Files:**
- Create: `src/stamps/index.ts`

- [ ] **Step 1: Create file**

```ts
// src/stamps/index.ts
// Barrel cho tất cả stamps + shared. Public API của package re-export từ đây.

export {
  DEFAULT_STAMPS,
  findStampForCustomData,
  isStampElement,
  geometryStamp,
  latexStamp,
  type StampType,
  type BaseStampCustomData,
  type GeometryCustomData,
  type LatexCustomData,
  isGeometryCustomData,
  isLatexCustomData,
} from './shared/registry';

export type { StampHostProps, StampHostHandle, StampHostComponent } from './shared/types';

export { svgToImageElement } from './shared/svgToImage';
export { insertStampImage } from './shared/insertImage';
export { restoreMissingStampFiles } from './shared/restoreStampFiles';

export { ToolbarInjector } from './shared/ToolbarInjector';
export { useShortcuts } from './shared/useShortcuts';

// Type union helper cho consumer
import type { GeometryCustomData } from './geometry-2d';
import type { LatexCustomData } from './latex';
export type StampCustomData = GeometryCustomData | LatexCustomData;
```

- [ ] **Step 2: Cập nhật `src/stamps/shared/registry.ts` để export `geometryStamp` đúng**

Vì geometry/latex giờ đã ở folder mới (sau task 4, 5), sửa lại registry.ts:

```ts
// src/stamps/shared/registry.ts
import { geometryStamp } from '../geometry-2d';
import { latexStamp } from '../latex';
import type { StampType } from './types';

export { geometryStamp, type GeometryCustomData, isGeometryCustomData } from '../geometry-2d';
export { latexStamp, type LatexCustomData, isLatexCustomData } from '../latex';
export type { StampType, BaseStampCustomData } from './types';

export const DEFAULT_STAMPS: ReadonlyArray<StampType> = Object.freeze([geometryStamp, latexStamp]);

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

- [ ] **Step 3: Cập nhật `src/stamps/geometry-2d/index.tsx` export shape**

File này hiện export `geometryStamp`, `GeometryCustomData`, `isGeometryCustomData`. Đảm bảo:

```ts
// src/stamps/geometry-2d/index.tsx
export { geometryStamp };
export { isGeometryCustomData };
export type { GeometryCustomData };
```

- [ ] **Step 4: Cập nhật `src/stamps/latex/index.tsx` export shape**

```ts
// src/stamps/latex/index.tsx
export { latexStamp };
export { isLatexCustomData };
export type { LatexCustomData };
```

- [ ] **Step 5: typecheck + test**

```bash
npm run typecheck
npm test -- --silent
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(stamps): add stamps/ barrel, wire geometry-2d + latex through shared registry"
```

---

## Task 8: Registry-driven `restoreMissingStampFiles`

**Files:**
- Modify: `src/stamps/shared/types.ts` — thêm `restoreFileFromCustomData?` vào `StampType`
- Modify: `src/stamps/shared/restoreStampFiles.ts` — bỏ switch case, dùng registry method
- Modify: `src/stamps/geometry-2d/index.tsx` — implement `restoreFileFromCustomData`
- Modify: `src/stamps/latex/index.tsx` — implement `restoreFileFromCustomData`
- Test: `src/stamps/shared/__tests__/restoreStampFiles.test.ts`

- [ ] **Step 1: Đọc shape hiện tại của `restoreStampFiles.ts` + 2 render util**

```bash
cat src/stamps/shared/restoreStampFiles.ts
```

Ghi nhận: hiện tại đang nhận `api` + `elements`, lặp qua, gọi `renderGeometrySvgFromState` hoặc `renderLatexToSvg` (hard-coded switch). Mục tiêu: thay bằng `stamp.restoreFileFromCustomData(element)` trả về `{ fileId, dataURL, mimeType }`.

- [ ] **Step 2: Mở rộng `StampType` interface**

Edit `src/stamps/shared/types.ts`:

```ts
export interface RestoredStampFile {
  fileId: string;
  dataURL: string;
  mimeType: 'image/svg+xml' | 'image/png';
}

export interface StampType {
  // ... fields hiện tại
  /**
   * Regenerate file SVG/PNG cho element thuộc stamp này khi reload từ
   * persisted snapshot. Trả về dataURL để consumer addFiles, hoặc null
   * nếu element không cần file (vd stamp chỉ là text overlay).
   */
  restoreFileFromCustomData?: (element: ExcalidrawElement) => Promise<RestoredStampFile | null>;
}
```

Cần import `ExcalidrawElement` — tìm path:

```bash
grep -nE "import type.*ExcalidrawElement" src/stamps/shared/types.ts
```

Nếu chưa có, thêm:

```ts
import type { ExcalidrawElement } from '../../types';
```

- [ ] **Step 3: TDD — viết test thất bại trước**

Create `src/stamps/shared/__tests__/restoreStampFiles.test.ts`:

```ts
import { restoreMissingStampFiles } from '../restoreStampFiles';
import type { StampType, RestoredStampFile } from '../types';

describe('restoreMissingStampFiles (registry-driven)', () => {
  it('lặp qua elements, gọi restoreFileFromCustomData của stamp khớp', async () => {
    const calls: string[] = [];
    const fakeStampA: StampType = {
      kind: 'a',
      shortcutKey: 'a',
      Host: (() => null) as never,
      Icon: null as never,
      toolbarTitle: 'A',
      matchesCustomData: (d: unknown) =>
        Boolean(d) && (d as { kind?: string }).kind === 'a',
      restoreFileFromCustomData: async (el): Promise<RestoredStampFile> => {
        calls.push(`a:${(el as { id: string }).id}`);
        return { fileId: `file-${(el as { id: string }).id}`, dataURL: 'data:a', mimeType: 'image/svg+xml' };
      },
    };
    const fakeStampB: StampType = {
      kind: 'b',
      shortcutKey: 'b',
      Host: (() => null) as never,
      Icon: null as never,
      toolbarTitle: 'B',
      matchesCustomData: (d: unknown) =>
        Boolean(d) && (d as { kind?: string }).kind === 'b',
      // Không có restoreFileFromCustomData — phải skip
    };

    const elements = [
      { id: '1', customData: { kind: 'a' } },
      { id: '2', customData: { kind: 'b' } },
      { id: '3', customData: { kind: 'unknown' } },
    ];

    const addFiles = jest.fn();
    const api = { addFiles };

    await restoreMissingStampFiles(api as never, elements as never, [fakeStampA, fakeStampB]);

    expect(calls).toEqual(['a:1']);
    expect(addFiles).toHaveBeenCalledTimes(1);
    expect(addFiles).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'file-1', dataURL: 'data:a' }),
    ]);
  });

  it('bỏ qua element không match stamp nào', async () => {
    const api = { addFiles: jest.fn() };
    await restoreMissingStampFiles(api as never, [{ id: '1', customData: null }] as never, []);
    expect(api.addFiles).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 4: Run test, verify fail**

```bash
npm test -- --silent --testPathPattern restoreStampFiles
```

Expected: FAIL — vì restoreStampFiles.ts hiện tại không dùng registry method, không trả về đúng shape.

- [ ] **Step 5: Implement registry-driven `restoreStampFiles.ts`**

Edit `src/stamps/shared/restoreStampFiles.ts`:

```ts
import { DEFAULT_STAMPS, findStampForCustomData } from './registry';
import type { StampType } from './types';

interface ApiLike {
  addFiles: (files: ReadonlyArray<{
    id: string;
    dataURL: string;
    mimeType: string;
    created: number;
  }>) => void;
}

export async function restoreMissingStampFiles(
  api: ApiLike,
  elements: ReadonlyArray<{ id: string; customData?: unknown }>,
  stamps: ReadonlyArray<StampType> = DEFAULT_STAMPS,
): Promise<void> {
  const filesToAdd: Array<{ id: string; dataURL: string; mimeType: string; created: number }> = [];
  for (const el of elements) {
    const stamp = findStampForCustomData(el.customData, stamps);
    if (!stamp?.restoreFileFromCustomData) continue;
    const restored = await stamp.restoreFileFromCustomData(el as never);
    if (!restored) continue;
    filesToAdd.push({
      id: restored.fileId,
      dataURL: restored.dataURL,
      mimeType: restored.mimeType,
      created: Date.now(),
    });
  }
  if (filesToAdd.length > 0) api.addFiles(filesToAdd);
}

/** @deprecated Dùng restoreMissingStampFiles thay vì restoreMissingMathStampFiles. */
export const restoreMissingMathStampFiles = restoreMissingStampFiles;
```

- [ ] **Step 6: Implement `restoreFileFromCustomData` cho geometry-2d**

Edit `src/stamps/geometry-2d/index.tsx` — thêm vào StampType object:

```ts
import { renderGeometrySvgFromState } from './render';
import type { RestoredStampFile } from '../shared/types';

// ... existing code ...

export const geometryStamp: StampType = {
  // ... existing fields
  restoreFileFromCustomData: async (element): Promise<RestoredStampFile | null> => {
    const data = element.customData as GeometryCustomData | undefined;
    const fileId = (element as { fileId?: string }).fileId;
    if (!data || !fileId) return null;
    const { svgString } = await renderGeometrySvgFromState(data.jsonState);
    const dataURL = `data:image/svg+xml;base64,${typeof btoa !== 'undefined' ? btoa(unescape(encodeURIComponent(svgString))) : Buffer.from(svgString).toString('base64')}`;
    return { fileId, dataURL, mimeType: 'image/svg+xml' };
  },
};
```

- [ ] **Step 7: Implement `restoreFileFromCustomData` cho latex**

Edit `src/stamps/latex/index.tsx`:

```ts
import { renderLatexToSvg } from './render';
import type { RestoredStampFile } from '../shared/types';

export const latexStamp: StampType = {
  // ... existing fields
  restoreFileFromCustomData: async (element): Promise<RestoredStampFile | null> => {
    const data = element.customData as LatexCustomData | undefined;
    const fileId = (element as { fileId?: string }).fileId;
    if (!data || !fileId) return null;
    const { svgString } = await renderLatexToSvg(data.src, data.displayMode);
    const dataURL = `data:image/svg+xml;base64,${typeof btoa !== 'undefined' ? btoa(unescape(encodeURIComponent(svgString))) : Buffer.from(svgString).toString('base64')}`;
    return { fileId, dataURL, mimeType: 'image/svg+xml' };
  },
};
```

- [ ] **Step 8: Run tests, verify pass**

```bash
npm test -- --silent --testPathPattern restoreStampFiles
npm test -- --silent  # full
```

Expected: tất cả pass.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "refactor(stamps): make restoreMissingStampFiles registry-driven via StampType.restoreFileFromCustomData"
```

---

## Task 9: Public API mới + alias `@deprecated` trong `src/index.ts`

**Files:**
- Modify: `src/index.ts`
- Test: `src/stamps/shared/__tests__/aliases.test.ts`

- [ ] **Step 1: TDD — viết test alias trước**

Create `src/stamps/shared/__tests__/aliases.test.ts`:

```ts
import * as pkg from '../../../index';

describe('public API back-compat aliases (xoá ở 0.6.0)', () => {
  it('isMathStamp resolve về isStampElement', () => {
    expect(pkg.isMathStamp).toBeDefined();
    expect(pkg.isMathStamp).toBe(pkg.isStampElement);
  });

  it('restoreMissingMathStampFiles resolve về restoreMissingStampFiles', () => {
    expect(pkg.restoreMissingMathStampFiles).toBeDefined();
    expect(pkg.restoreMissingMathStampFiles).toBe(pkg.restoreMissingStampFiles);
  });

  it('export tên mới đầy đủ', () => {
    expect(pkg.Whiteboard).toBeDefined();
    expect(pkg.DEFAULT_STAMPS).toBeDefined();
    expect(pkg.geometryStamp).toBeDefined();
    expect(pkg.latexStamp).toBeDefined();
    expect(pkg.isStampElement).toBeDefined();
    expect(pkg.findStampForCustomData).toBeDefined();
    expect(pkg.isGeometryCustomData).toBeDefined();
    expect(pkg.isLatexCustomData).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test, verify fail**

```bash
npm test -- --silent --testPathPattern aliases
```

Expected: FAIL — `isMathStamp`, `restoreMissingMathStampFiles` chưa export từ `src/index.ts`.

- [ ] **Step 3: Cập nhật `src/index.ts`**

Replace content:

```ts
// src/index.ts — public API của @xom11/whiteboard

export { Whiteboard } from './Whiteboard';
export type { WhiteboardProps } from './Whiteboard';
export { pickSyncableAppState } from './serialize';
export type {
  ExcalidrawElement,
  NonDeletedExcalidrawElement,
  AppState,
  BinaryFiles,
  SyncableAppState,
  ExcalidrawSceneSnapshot,
} from './types';

// Stamps API
export {
  DEFAULT_STAMPS,
  findStampForCustomData,
  isStampElement,
  geometryStamp,
  latexStamp,
  type StampType,
  type BaseStampCustomData,
  type GeometryCustomData,
  type LatexCustomData,
  isGeometryCustomData,
  isLatexCustomData,
} from './stamps';
export { restoreMissingStampFiles } from './stamps';

// Union helper
import type { GeometryCustomData, LatexCustomData } from './stamps';
export type StampCustomData = GeometryCustomData | LatexCustomData;

// ===========================================================================
// Aliases @deprecated — sẽ xoá ở 0.6.0
// ===========================================================================

import { isStampElement, restoreMissingStampFiles as _restoreMissingStampFiles } from './stamps';

/** @deprecated Dùng `isStampElement` thay vì `isMathStamp`. Sẽ xoá ở 0.6.0. */
export const isMathStamp = isStampElement;

/** @deprecated Dùng `StampCustomData` thay vì `MathStampCustomData`. Sẽ xoá ở 0.6.0. */
export type MathStampCustomData = StampCustomData;

/** @deprecated Dùng `restoreMissingStampFiles` thay vì `restoreMissingMathStampFiles`. Sẽ xoá ở 0.6.0. */
export const restoreMissingMathStampFiles = _restoreMissingStampFiles;
```

- [ ] **Step 4: Run test, verify pass**

```bash
npm test -- --silent --testPathPattern aliases
npm run typecheck
npm test -- --silent
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(stamps): new public API + @deprecated aliases (isMathStamp, MathStampCustomData, restoreMissingMathStampFiles)"
```

---

## Task 10: Cập nhật Whiteboard.tsx + ExcalidrawWithMenus dùng tên mới

**Files:**
- Modify: `src/Whiteboard.tsx`
- Modify: `src/ExcalidrawWithMenus.tsx` (nếu có cross-ref)

- [ ] **Step 1: Audit Whiteboard.tsx imports**

```bash
grep -nE "from './stamp" src/Whiteboard.tsx
grep -nE "ToolbarStampInjector|useStampShortcuts|restoreMissingMathStampFiles|isMathStamp|MathStampCustomData" src/Whiteboard.tsx
```

- [ ] **Step 2: Đổi tên symbol + import path nội bộ**

Sửa từng dòng. Imports nên dùng `from './stamps'` (barrel mới) cho consumer-facing types, hoặc cụ thể folder cho internal hooks:

```ts
import { ToolbarInjector } from './stamps/shared/ToolbarInjector';
import { useShortcuts } from './stamps/shared/useShortcuts';
import { restoreMissingStampFiles } from './stamps/shared/restoreStampFiles';
import { DEFAULT_STAMPS, findStampForCustomData } from './stamps/shared/registry';
import type { StampType } from './stamps/shared/types';
import type { StampHostHandle } from './stamps/shared/types';
import './stamps/shared/stamp.css';
```

Body: tìm tham chiếu `ToolbarStampInjector` → `ToolbarInjector`, `useStampShortcuts` → `useShortcuts`, `restoreMissingMathStampFiles` → `restoreMissingStampFiles`, `isMathStamp` → `isStampElement`.

```bash
sed -i '' \
  -e 's/ToolbarStampInjector/ToolbarInjector/g' \
  -e 's/useStampShortcuts/useShortcuts/g' \
  -e 's/restoreMissingMathStampFiles/restoreMissingStampFiles/g' \
  -e 's/\bisMathStamp\b/isStampElement/g' \
  src/Whiteboard.tsx
```

- [ ] **Step 3: ExcalidrawWithMenus check**

```bash
grep -nE "stamp" src/ExcalidrawWithMenus.tsx
```

Nếu có ref, đổi tương ứng.

- [ ] **Step 4: typecheck + test**

```bash
npm run typecheck
npm test -- --silent
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(Whiteboard): use new stamp symbol names + barrel imports"
```

---

## Task 11: Tách `MiniBoard.tsx` (1654 dòng) — Phần 1: tools.ts

**Files:**
- Create: `src/stamps/geometry-2d/editor/tools.ts`
- Modify: `src/stamps/geometry-2d/editor/MiniBoard.tsx`
- Existing test: `src/stamps/geometry-2d/__tests__/MiniBoard.test.tsx` (giữ nguyên)

Mục tiêu task này: tách phần thuần data/types (TOOLS, GROUP_LABELS, types GeomTool/ToolDef, helper pure functions không touch DOM) ra `tools.ts`. MiniBoard.tsx import lại từ tools.ts.

- [ ] **Step 1: Đọc top của MiniBoard.tsx**

```bash
head -100 src/stamps/geometry-2d/editor/MiniBoard.tsx
```

Identify:
- `TOOLS` array (line ~?)
- `GROUP_LABELS` (line ~?)
- `type GeomTool` (line ~?)
- `interface ToolDef` (line ~?)
- Helper pure functions (snap, clamp...) — chỉ move những hàm không phụ thuộc board state

- [ ] **Step 2: Create tools.ts**

Move các symbol pure data + types vào `tools.ts`. Verify boundary:

```ts
// src/stamps/geometry-2d/editor/tools.ts

export type GeomTool =
  | 'move' | 'point' | 'segment' | 'line' | 'ray' | 'parallel' | 'perpendicular'
  | 'midpoint' | 'circle' | 'circleByRadius' | 'polygon' | 'angle' | 'triangle'
  | 'reflectLine' | 'reflectPoint' | 'dilate' /* etc — fill từ file cũ */;

export interface ToolDef {
  key: GeomTool;
  label: string;
  group: string;
  icon: React.ReactNode;
  hint?: string;
}

export const GROUP_LABELS: Record<string, string> = { /* ... */ };
export const TOOLS: ReadonlyArray<ToolDef> = [ /* ... */ ];

// Pure helpers — chỉ những hàm không cần board ref
export function snapToGrid(x: number, grid: number): number { /* ... */ }
```

Mỗi symbol move sang phải xoá khỏi MiniBoard.tsx + add `import` ở MiniBoard.tsx:

```ts
import { TOOLS, GROUP_LABELS, type GeomTool, type ToolDef, snapToGrid } from './tools';
export { TOOLS, GROUP_LABELS, type GeomTool, type ToolDef };  // re-export để giữ compat
```

- [ ] **Step 3: typecheck + test**

```bash
npm run typecheck
npm test -- --silent
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(geometry-2d): extract tools.ts from MiniBoard.tsx (pure data + types)"
```

---

## Task 12: Tách `MiniBoard.tsx` — Phần 2: styles.ts

**Files:**
- Create: `src/stamps/geometry-2d/editor/styles.ts`
- Modify: `src/stamps/geometry-2d/editor/MiniBoard.tsx`

Mục tiêu: tách phần JXG attribute builders (color, stroke, label style — không touch board state).

- [ ] **Step 1: Identify symbols để tách**

Tìm trong MiniBoard.tsx những function tạo attribute object cho JSXGraph:

```bash
grep -nE "^(const|function) (apply|attr|build|with|themed)" src/stamps/geometry-2d/editor/MiniBoard.tsx
```

Candidates: `themedPointAttrs`, `themedSegmentAttrs`, `withLabelTheme`, `themeFor*`, helper builders.

- [ ] **Step 2: Create styles.ts**

```ts
// src/stamps/geometry-2d/editor/styles.ts

import { paletteFor, themeAxis, themeGrid, themeLabel, type GeomPalette } from './theme';

export function themedPointAttrs(isDark: boolean, color?: string) {
  const p = paletteFor(isDark);
  return { /* ... */ };
}

export function themedSegmentAttrs(isDark: boolean, color?: string) { /* ... */ }
// ... các builder khác
```

- [ ] **Step 3: MiniBoard.tsx import từ styles.ts**

```ts
import { themedPointAttrs, themedSegmentAttrs /* ... */ } from './styles';
```

- [ ] **Step 4: typecheck + test**

```bash
npm run typecheck
npm test -- --silent
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(geometry-2d): extract styles.ts from MiniBoard.tsx (attribute builders)"
```

---

## Task 13: Tách `MiniBoard.tsx` — Phần 3: handlers.ts

**Files:**
- Create: `src/stamps/geometry-2d/editor/handlers.ts`
- Modify: `src/stamps/geometry-2d/editor/MiniBoard.tsx`

Mục tiêu: tách pointer handlers cho từng tool (point, segment, polygon, transform...). Đây là phần lớn nhất.

- [ ] **Step 1: Identify handlers**

Tìm functions trong MiniBoard.tsx có dạng `handle*` hoặc `onPointer*` chứa logic tool-specific:

```bash
grep -nE "^( *)(const|function) (handle|onPointer|create[A-Z]|finish[A-Z])" src/stamps/geometry-2d/editor/MiniBoard.tsx | head -50
```

- [ ] **Step 2: Design API của handlers.ts**

Handlers thường cần: board ref, tool state ref, current points buffer, isDark flag, palette. Truyền context object:

```ts
// src/stamps/geometry-2d/editor/handlers.ts

import type { GeomTool } from './tools';

export interface HandlerContext {
  board: any;                    // JXG board
  toolRef: { current: GeomTool };
  pendingPoints: { current: any[] };
  isDarkRef: { current: boolean };
  pushLog: (entry: any) => void;
  // ... các deps còn lại
}

export function handlePointerDown(ctx: HandlerContext, e: PointerEvent): void { /* ... */ }
export function handlePointerMove(ctx: HandlerContext, e: PointerEvent): void { /* ... */ }
export function handlePointerUp(ctx: HandlerContext, e: PointerEvent): void { /* ... */ }
```

Trong MiniBoard.tsx tạo `ctx` object trong render, truyền vào handlers.

- [ ] **Step 3: Move handlers + refactor MiniBoard.tsx**

Xoá functions trong MiniBoard.tsx, gọi qua handlers.ts với ctx. Đây là task cẩn thận — sau khi tách phải test thủ công nếu test suite không cover hết.

- [ ] **Step 4: typecheck + test**

```bash
npm run typecheck
npm test -- --silent
```

Nếu fail: revert sub-step, tách nhỏ hơn, retry.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(geometry-2d): extract handlers.ts from MiniBoard.tsx (pointer logic per tool)"
```

---

## Task 14: Kiểm tra `MiniBoard.tsx` còn ≤ ~500 dòng

**Files:**
- Modify: `src/stamps/geometry-2d/editor/MiniBoard.tsx` (clean up nếu còn dư)

- [ ] **Step 1: wc -l các file vừa tách**

```bash
wc -l src/stamps/geometry-2d/editor/MiniBoard.tsx \
       src/stamps/geometry-2d/editor/tools.ts \
       src/stamps/geometry-2d/editor/handlers.ts \
       src/stamps/geometry-2d/editor/styles.ts
```

Expected: MiniBoard.tsx ≤ 500 dòng. Nếu > → check còn helper pure nào chưa tách.

- [ ] **Step 2: Type check sau khi tách**

```bash
npm run typecheck
npm test -- --silent
```

- [ ] **Step 3: Verify build OK**

```bash
npm run build
ls -la dist/
```

Expected: build pass, `dist/` chứa output.

- [ ] **Step 4: Commit (nếu có sửa)**

```bash
git add -A
git diff --cached --quiet || git commit -m "refactor(geometry-2d): cleanup MiniBoard.tsx after split"
```

---

## Task 15: Verify full test suite + lint sạch

**Files:**
- (no changes)

- [ ] **Step 1: Run tất cả**

```bash
npm test
```

Expected: số test ≥ baseline (task 1) + 2 (aliases + restoreStampFiles tests mới). Tất cả pass.

- [ ] **Step 2: typecheck strict**

```bash
npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 3: build**

```bash
npm run build
```

Expected: success, `dist/` populated.

- [ ] **Step 4: Verify dist/ có "use client"**

```bash
head -1 dist/index.mjs dist/index.js
```

Expected: cả 2 file bắt đầu bằng `"use client";`.

- [ ] **Step 5: Verify alias @deprecated trong dist**

```bash
grep -E "deprecated|isMathStamp|MathStampCustomData|restoreMissingMathStampFiles" dist/index.d.ts | head -10
```

Expected: thấy các alias + JSDoc deprecated.

- [ ] **Step 6: Commit dist/**

```bash
git add dist
git commit -m "build: rebuild dist for stamps reorg" 2>&1
```

---

## Task 16: Bump version + CHANGELOG

**Files:**
- Modify: `package.json` (version 0.4.0 → 0.5.0)
- Create: `CHANGELOG.md` (nếu chưa có)
- Modify: `CLAUDE.md` (cập nhật cấu trúc folder)

- [ ] **Step 1: Update CHANGELOG.md**

Tạo file (hoặc thêm entry):

```markdown
# Changelog

## 0.5.0 — 2026-05-15

### Reorganized
- Đổi `src/stamp/` → `src/stamps/` (registry-driven, by-feature).
- Mỗi stamp tự đóng gói: `geometry-2d/`, `latex/`. Common code ở `shared/`.
- Tách `JSXGraphMiniBoard.tsx` (1654 dòng) thành `MiniBoard.tsx` + `tools.ts` + `handlers.ts` + `styles.ts`.

### Renamed (consumer action: dùng tên mới, alias cũ sẽ xoá ở 0.6.0)
- `isMathStamp` → `isStampElement`
- `MathStampCustomData` → `StampCustomData`
- `restoreMissingMathStampFiles` → `restoreMissingStampFiles`

### Added
- `StampType.restoreFileFromCustomData` — mỗi stamp tự khai báo cách regenerate SVG file khi reload. `restoreMissingStampFiles` giờ registry-driven, không hard-code geometry/latex.
```

- [ ] **Step 2: Update CLAUDE.md**

Sửa section "Cấu trúc" để phản ánh layout mới (block `whiteboard/`).

- [ ] **Step 3: Bump version**

```bash
npm version minor --no-git-tag-version
# 0.4.0 → 0.5.0; updates package.json + package-lock.json
```

- [ ] **Step 4: Rebuild dist với version mới**

```bash
npm run build
```

- [ ] **Step 5: Commit + tag**

```bash
git add package.json package-lock.json CHANGELOG.md CLAUDE.md dist
git commit -m "release: 0.5.0 — stamps reorg + registry-driven restore"
git tag v0.5.0
```

- [ ] **Step 6: Verify final state**

```bash
git log --oneline -20
git tag --list | head -5
```

- [ ] **Step 7: Merge plan**

```bash
git checkout main
git merge --no-ff refactor/stamps-folder-layout -m "refactor(stamps): folder layout + registry-driven restore (0.5.0)"
git push --follow-tags
```

(User sẽ xác nhận thời điểm push.)

---

## Self-Review Checklist

- [ ] Tất cả 16 task có code/command cụ thể (không placeholder)
- [ ] File path đầy đủ ở mỗi task
- [ ] Test trước implementation (TDD) ở task 8, 9
- [ ] Folder mapping đúng spec §4.1
- [ ] Public API alias đúng spec §4.2 (3 symbol)
- [ ] `restoreFileFromCustomData` đúng spec §4.3
- [ ] MiniBoard split đúng spec §4.4 (4 file)
- [ ] Tests mới đúng spec §4.5 (restoreStampFiles + aliases)
- [ ] Migration order đúng spec §6 step 1-2 (commit + 0.5.0 tag)

## Notes cho executing agent

- **Mỗi task commit riêng** — nếu task fail giữa chừng, revert dễ.
- **Đừng skip test step** — refactor là regression-net.
- **Khi sed fails trên macOS BSD** (`sed -i ''` syntax khác Linux): file `tools.ts` đoạn `find ... -exec sed -i ...` đã viết theo BSD syntax. Nếu chạy trên Linux CI, đổi thành `sed -i` (không có `''`).
- **Test với jest pattern**: `npm test -- --testPathPattern <name>` chạy subset.
- **JSXGraphMiniBoard.tsx tách handlers.ts là task rủi ro nhất** — tách dần, commit theo từng cụm handler nếu cần.
