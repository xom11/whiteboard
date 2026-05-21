# Refactor Tier A + B + B½ — Codebase Structure to 9/10

**Status:** revised 2026-05-21 (corrected audit)
**Date:** 2026-05-21
**Owner:** @xinmotlanthua
**Target version:** v0.16 (Tier A) → v0.17 (Tier B) → v0.18 (Tier B½)

> **Note:** Bản đầu tiên dựa trên audit có sai sót (cho rằng `geometry-3d` dùng legacy `AlgebraList`/`Scene3D`, `JxgRenderer3D` là dead file, chỉ 2D dùng scene store). Verify thực tế cho thấy **cả 3 stamp interactive đã dùng `core/scene`** và `LeftPanelShell`+`ObjectListPanel` đã shared trong `core/scene/ui/`. Spec đã được sửa: A3 + B2 viết lại theo vấn đề thật. ADR `2026-05-22-scene-extend-3d-adr.md` đã đánh dấu SUPERSEDED.

## 1. Mục tiêu

Đưa codebase từ điểm cấu trúc ~7.5/10 lên ≥9.0/10 mà KHÔNG đổi public API hiện có
(`Whiteboard`, `STABLE_STAMPS`, `findStampForCustomData`, …). Stamp thứ N (interactive)
sau refactor chỉ tốn ≤300 LoC thay vì ~700 LoC như hiện tại.

### Acceptance KPI (đo được)

| Chỉ số | Trước (audit corrected) | Sau |
|---|---|---|
| File >400 LoC | 9 (kể cả test) | 0 |
| `Whiteboard.tsx` LoC | 739 | ≤200 |
| `handleDown` function LoC | ~470 (line 139→608 trong handlers.ts) | ≤120 mỗi nhánh, tách theo tool |
| `geometry-2d/editor/handlers.ts` LoC | 890 | ≤350 mỗi module sau tách |
| `HandlerCtx` field count | ~20 | ≤8 |
| Tools DSL khác nhau giữa stamp | 3 cách (2D `tools.tsx`, 3D `tools/spec.ts`+`toolPanel/groups`, graph-2d `tools.ts`+`rows/`) | 1 ToolSpec contract |
| `useSceneStore` React hook vị trí | chỉ `geometry-2d/editor/useSceneStore.ts` | promoted lên `core/scene/` (hoặc `shared/editor/`) |
| Stamp interactive mới (LoC) | ~700 | ≤300 |
| Bundle khi consumer chỉ dùng latex | tất cả stamp | chỉ latex (verified by `npm run analyze`) |
| `core/scene` consumer | ✅ 2D + 3D + graph-2d (đã đủ — không phải gap) | giữ nguyên |

### Không nằm trong scope

- Đổi public API (giữ backward-compat 100%).
- Tách thành nhiều npm package (đó là Tier C — đã loại).
- Cải tiến tính năng Excalidraw (mobile UI, collab, …).
- Viết stamp mới.

---

## 2. Tier A — Stop the bleeding (target v0.16, ~1-2 tuần)

Mục tiêu: chặn debt tích thêm. Không refactor architecture, chỉ tách file.

### A1. Tách `Whiteboard.tsx` 739 → ≤200

Tạo `src/hooks/`:

```
src/hooks/
  usePdfImporter.ts          ← pdfPending + pdfBusy + 3 callback (pick/confirm/cancel)
  useActiveStamp.ts          ← activeStamp + editingElement + double-click dispatcher
  useExcalidrawApi.ts        ← api ref + onApi callback + isDarkTheme derive
```

`Whiteboard.tsx` chỉ giữ:
- Props validation + defaults.
- Render tree: `<Excalidraw>` + `<ToolbarInjector>` + activeStamp Host portal + PDF modal.
- Ref wiring tới hooks ở trên.

**Acceptance:** `Whiteboard.tsx` ≤200 LoC. Existing tests + e2e pass không sửa.

### A2. Tách `handleDown` 470-dòng god-function trong handlers.ts

**Verify từ grep:** `handlers.ts` 890 dòng, nhưng vấn đề thật là `handleDown` từ line 139→608 = **~470 dòng cho 1 function** (multi-branch theo tool). 3 hàm còn lại (`handleMove` 50, `handleUp` 80, `finalizeTransform` ~150) acceptable.

Tạo folder `src/stamps/geometry-2d/editor/handlers/`:

```
src/stamps/geometry-2d/editor/handlers/
  index.ts                   ← public exports (re-export giữ shape cũ)
  ctx.ts                     ← slim HandlerCtx (≤8 field; truyền store thay vì 20 ref)
  pointerDown/
    index.ts                 ← dispatcher (≤80 LoC) — switch theo activeTool
    freePoint.ts             ← branch tạo điểm tự do
    line.ts                  ← branch line/segment/ray
    polygon.ts               ← branch polygon
    circle.ts                ← branch circle/arc
    intersection.ts
    transformPick.ts         ← branch pick object cho transform tools
    ...
  pointerMove.ts             ← handleMove (giữ nguyên ~50 LoC)
  pointerUp.ts               ← handleUp (giữ nguyên ~80 LoC)
  transform.ts               ← finalizeTransform + helpers (~150 LoC)
```

**Acceptance:**
- [ ] `pointerDown/index.ts` ≤80 LoC.
- [ ] Mỗi branch file ≤120 LoC.
- [ ] `HandlerCtx` ≤8 field.
- [ ] Existing test + e2e pass.
- [ ] Snapshot e2e undo/redo trước/sau giống nhau.

### A3. ADR chuẩn hoá Tools DSL giữa 3 stamp

**Audit 2026-05-21 revealed:** 3 stamp interactive đã dùng `core/scene` rồi (không phải gap như audit cũ nói). Vấn đề thật là **Tools DSL khác nhau**:

| Stamp | Tools layout | LoC |
|---|---|---|
| `geometry-2d` | `editor/tools.tsx` (single file, declarative `TOOLS` map) | 272 |
| `geometry-3d` | `editor/tools/spec.ts` + `editor/toolPanel/groups.ts` + `editor/toolPanel/icons.tsx` (3 file) | 245+? |
| `graph-2d` | `editor/tools.ts` + `editor/rows/FunctionRow.tsx` + `editor/rows/ParameterRow.tsx` | 100+? |

**Câu hỏi cần chốt ADR:**
- (a) **Chuẩn hoá hoá ToolSpec contract** dùng chung cho cả 3 (giống pattern 2D, phổ biến nhất) → 3D + graph-2d migrate.
- (b) **Giữ nguyên 3 cách** — document lý do cho mỗi cách (e.g. graph-2d cần `rows/` vì có function/parameter cần inline edit, không phù hợp với plain tool button).

**Output:**
- [ ] ADR ngắn `docs/superpowers/specs/YYYY-MM-DD-tools-dsl-adr.md` chốt (a) hoặc (b).
- [ ] Nếu (a): migration spec chuyển sang Tier B mục B2.
- [ ] Nếu (b): document trong `src/stamps/README.md` lý do mỗi pattern + khi nào dùng cái nào.

**Cost estimate:**
- (a) Migration: ~3-5 ngày (chủ yếu 3D, vì graph-2d's `rows/` có thể giữ làm extension point cho ToolSpec).
- (b) Doc only: ~2 giờ.

### A4. ESLint guard

`.eslintrc` thêm:
```json
{ "rules": { "max-lines": ["error", { "max": 400, "skipBlankLines": true, "skipComments": true }] } }
```

CI fail nếu thêm god-file mới.

**Acceptance Tier A overall:**
- Bump v0.16.0.
- CHANGELOG ghi rõ "internal refactor, no API change".
- `npm test` + `npm run test:e2e` pass.
- `npm run typecheck` không có error mới.
- 9 file >400 LoC giảm xuống ≤4.

---

## 3. Tier B — Generalize the editor (target v0.17, ~3-5 tuần)

Mục tiêu: stamp interactive mới chỉ ≤300 LoC nhờ shared scaffold.

### B1. Shared editor scaffold

Tạo `src/stamps/shared/editor/`:

```
src/stamps/shared/editor/
  EditorShell.tsx            ← layout: <LeftPanelSlot> + <BoardSlot> + <PropertiesSlot>
  useEditorState.ts          ← undo/redo + selection + dirty flag
  PropertiesPopover.tsx      ← generic, nhận field schema (port từ geometry-2d)
  TransformParamPopover.tsx  ← generic (port từ geometry-2d)
  toolSpec.ts                ← type ToolSpec { id, icon, handler, … }
  index.ts                   ← barrel
```

Mỗi stamp khai báo `tools: ToolSpec[]` + render adapter, không tự dựng layout.

**Audit revised:** `LeftPanelShell` + `ObjectListPanel` ĐÃ TỒN TẠI ở `core/scene/ui/` và được 3 stamp dùng. Tier B1 KHÔNG phải build mới — mà là **rút bớt** logic local trong từng stamp về scaffold chung.

**Migration:**
- Tận dụng `LeftPanelShell` + `Section` + `ObjectListPanel` sẵn có.
- Thêm vào `core/scene/hooks/`: `useEditorState` (undo/redo + selection + dirty flag, generalize từ pattern hiện có).
- `geometry-2d/editor/LeftPanel.tsx` (451 dòng) → trừ phần icons + tool buttons (move xuống tools.tsx).
- `geometry-3d/editor/LeftPanel.tsx` (366 dòng) → tương tự.
- `graph-2d/editor/LeftPanel.tsx` (220 dòng) → giữ `rows/` slot.
- `latex` giữ EditorPopover riêng (không cần Board slot) — vẫn dùng `useEditorState` cho dirty flag.

**Acceptance:**
- [ ] `geometry-2d/editor/LeftPanel.tsx` 451 → ≤250 LoC.
- [ ] `geometry-3d/editor/EditorPanel.tsx` 477 → ≤250 LoC.
- [ ] `useEditorState` hook share giữa 3 stamp + latex.

### B2. Promote `useSceneStore` hook + chuẩn hoá Tools DSL (theo ADR A3)

**Audit revised:** Không phải "migrate 3D sang scene store" (3D đã dùng rồi). Vấn đề thật:

1. **`useSceneStore` hook chỉ tồn tại ở `geometry-2d/editor/useSceneStore.ts`** — 3D + graph-2d dùng `createStore` + `useRef` raw.
2. **Tools DSL 3 cách khác nhau** (xem A3 audit).

**Sub-steps:**

1. **Promote hook** — move `geometry-2d/editor/useSceneStore.ts` lên `src/core/scene/hooks/useSceneStore.ts`. 3D + graph-2d adopt. (~1 ngày)
2. **Nếu A3 chốt (a) chuẩn hoá Tools DSL:**
   - Định nghĩa `ToolSpec` contract ở `src/core/scene/types.ts`.
   - Migrate 3D từ `tools/spec.ts` + `toolPanel/groups.ts` về single `tools.ts` theo ToolSpec.
   - Giữ `graph-2d/rows/` làm extension point (slot riêng cho function/parameter inline edit). (~3-4 ngày)
3. **Nếu A3 chốt (b) document only:** không có code task ở đây.

**Acceptance:**
- [ ] `useSceneStore` import từ `core/scene/hooks` ở cả 3 stamp.
- [ ] Nếu (a): 3 stamp dùng cùng `ToolSpec` contract; `geometry-3d/editor/toolPanel/` xoá hoặc thu gọn.
- [ ] E2E + unit tests pass.

**Estimate:** (a) ~1 tuần. (b) ~2 giờ.

### B3. Tool spec DSL

Mỗi stamp có `tools.ts` declarative:

```ts
export const tools: ToolSpec[] = [
  { id: 'point', icon: <PointIcon/>, title: 'Điểm', handler: pointHandler, shortcut: 'p' },
  { id: 'line',  icon: <LineIcon/>,  title: 'Đường thẳng', handler: lineHandler },
];
```

Xoá `toolButtons.tsx` rời rạc (đang có ở 3D). EditorShell tự render từ spec.

**Acceptance:** `geometry-3d/editor/toolButtons.tsx` + `geometry-3d/editor/tools/spec.ts` gộp thành 1 file `tools.ts` ≤200 LoC. Pattern giống `geometry-2d/editor/tools.tsx`.

### B4. Type-narrow generic `StampType<T>`

```ts
export interface StampType<TCustomData extends BaseStampCustomData = BaseStampCustomData> {
  kind: string;
  matchesCustomData(data: unknown): data is TCustomData;
  renderSvgFromCustomData(data: TCustomData): Promise<string>;
  // ...
}
```

Consumer dùng `findStampForCustomData(el.customData)` nhận về type narrow, không cần `isGeometryCustomData` guard riêng.

**Acceptance:** không còn `isGeometryCustomData` / `isLatexCustomData` exported (giữ internal nếu cần). Test type assertion pass.

**Acceptance Tier B overall:**
- Bump v0.17.0.
- Viết 1 stamp mock "color-picker stamp" (chỉ để thử) bằng ≤200 LoC → chứng minh extensibility. Có thể delete sau khi merge.
- `npm test` + `npm run test:e2e` pass.

---

## 4. Tier B½ — Catalog & contract (target v0.18, ~1 tuần)

Mục tiêu: cho phép fork repo + thêm stamp mà không lo break contract.

### B½.1. `STAMP_CATALOG` manifest

`src/stamps/shared/catalog.ts`:

```ts
export interface StampCatalogEntry {
  id: string;          // kind
  title: string;
  version: number;
  experimental: boolean;
  runtimeDeps: string[]; // ['jsxgraph', 'katex', ...]
  bundleSize: { js: number; css: number }; // KB sau gzip, từ tsup metafile
}

export const STAMP_CATALOG: ReadonlyArray<StampCatalogEntry> = [...];
```

Build-time script đọc tsup metafile, inject bundle size vào catalog.

**Acceptance:** consumer `import { STAMP_CATALOG } from '@xom11/whiteboard'` → dựng được admin UI chọn stamp.

### B½.2. Contract test generic

`src/stamps/shared/__tests__/stamp-contract.ts`:

```ts
export function runStampContract(stamp: StampType): void {
  describe(`Stamp contract: ${stamp.kind}`, () => {
    it('matchesCustomData returns true for own data shape', ...);
    it('matchesCustomData returns false for foreign shape', ...);
    it('renderSvgFromCustomData produces valid SVG string', ...);
    it('roundtrip: customData → SVG → restore preserves state', ...);
    it('Host component accepts StampHostProps + forwards ref', ...);
  });
}
```

Mỗi stamp test file: `runStampContract(geometryStamp)`. Tổng 5 dòng/stamp.

**Acceptance:** chạy `npm test` → mọi stamp đăng ký đều pass contract suite.

### B½.3. Doc "Thêm stamp mới"

`docs/superpowers/specs/add-new-stamp-howto.md`:
- 6 bước: tạo folder → impl StampType → tools.ts → Host → register → contract test.
- Code mẫu ≤80 dòng.
- Link tới `examples/stamp-template/` (folder skeleton có sẵn để copy).

**Acceptance:** đo bằng đồng hồ — người ngoài dự án có thể clone + thêm stamp "hello-world" trong ≤30 phút.

**Acceptance Tier B½ overall:**
- Bump v0.18.0.
- README.md mục "Extending" link tới howto + manifest.
- 1 PR mẫu "Add color-picker stamp" (deletable sau merge) chứng minh flow.

---

## 5. Rollout & risk

### Thứ tự PR đề nghị

```
Tier A
  A1 (hooks)        ← isolated, ít rủi ro
  A2 (handlers)     ← cần regression test kỹ
  A3 (decide #21)   ← discussion, không code
  A4 (eslint)       ← last, sau khi đã xuống dưới ngưỡng
Tier B
  B2 (scene finish/drop)  ← do trước vì nó ảnh hưởng B1
  B1 (EditorShell)
  B3 (ToolSpec)
  B4 (generic StampType)
Tier B½
  B½.1 (catalog)
  B½.2 (contract)
  B½.3 (doc + example)
```

### Rủi ro

| Rủi ro | Mitigation |
|---|---|
| Tách handlers.ts làm vỡ undo/redo subtle | Snapshot e2e test trước refactor; chạy lại sau. |
| `useSceneStore` migration 3D bị stuck → blocking B1 | Tier A3 quyết dứt khoát: nếu khó thì DROP, không kéo. |
| Generic `StampType<T>` break consumer type | Bump major nếu cần; thông báo trước qua CHANGELOG. |
| Bundle size catalog scrape tăng build time | Cache metafile, chỉ regen khi `src/stamps/` thay đổi. |

### Out-of-band

- Không gộp Tier với tính năng mới (mobile redesign, undo polish, …). Refactor branches phải merge clean trước.
- Mỗi Tier 1 GitHub issue riêng, mỗi sub-task 1 PR. Tham chiếu issue #21 cho A3.

---

## 6. Done definition cuối

Khi cả Tier A + B + B½ merged:

- [ ] 0 file >400 LoC trong `src/` (ngoại trừ test fixture, allowlist tối đa 2).
- [ ] `Whiteboard.tsx` ≤200 LoC.
- [ ] Stamp mới "hello-world" implement xong ≤300 LoC theo doc B½.3.
- [ ] `STAMP_CATALOG` export, có bundle size info.
- [ ] Contract test pass cho 4 stamps hiện tại.
- [ ] CHANGELOG ghi rõ migration path nếu có breaking type.
- [ ] README.md có section "Extending" trỏ tới howto.
- [ ] v0.18.0 published lên npm.

Khi điểm structure đạt ≥9.0/10 (self-assess theo KPI mục 1), spec này được đánh dấu **Done**
và đóng issue tương ứng.
