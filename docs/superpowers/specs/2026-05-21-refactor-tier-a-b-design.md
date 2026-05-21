# Refactor Tier A + B + B½ — Codebase Structure to 9/10

**Status:** draft
**Date:** 2026-05-21
**Owner:** @xinmotlanthua
**Target version:** v0.16 (Tier A) → v0.17 (Tier B) → v0.18 (Tier B½)

## 1. Mục tiêu

Đưa codebase từ điểm cấu trúc 6.5/10 lên ≥9.0/10 mà KHÔNG đổi public API hiện có
(`Whiteboard`, `STABLE_STAMPS`, `findStampForCustomData`, …). Stamp thứ N (interactive)
sau refactor chỉ tốn ≤300 LoC thay vì ~700 LoC như hiện tại.

### Acceptance KPI (đo được)

| Chỉ số | Trước | Sau |
|---|---|---|
| File >400 LoC | 9 | 0 |
| `Whiteboard.tsx` LoC | 739 | ≤200 |
| `geometry-2d/editor/handlers.ts` LoC | 890 | ≤300 mỗi module |
| `HandlerCtx` field count | ~20 | ≤8 |
| Duplicate `LeftPanel` patterns | 4 cách | 1 scaffold + N adapter |
| Stamp interactive mới (LoC) | ~700 | ≤300 |
| Bundle khi consumer chỉ dùng latex | tất cả stamp | chỉ latex (verified by `npm run analyze`) |
| `core/scene` consumer | chỉ 2D | 2D + 3D + graph-2d (hoặc xoá nếu vote drop) |

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

### A2. Tách `geometry-2d/editor/handlers.ts` 890 → 3 module

```
src/stamps/geometry-2d/editor/handlers/
  index.ts                   ← public exports (giữ shape cũ)
  pointer.ts                 ← handleDown + handleMove + handleUp
  transform.ts               ← finalizeTransform + helpers
  ctx.ts                     ← slim HandlerCtx (≤8 field; truyền store thay vì 20 ref)
```

**Acceptance:** mỗi file ≤300 LoC. `HandlerCtx` ≤8 field. Existing tests pass.

### A3. Quyết định scope `core/scene`

Phase 2 (#21) + Phase 3 (#22) đã merge — hiện 2D dùng scene store. Câu hỏi mới:

- **(a) Extend** → phase 4: viết adapter cho 3D + graph-2d cùng dùng `useSceneStore`.
- **(b) Freeze 2D-only** → chấp nhận scene store chỉ phục vụ 2D, document rõ trong `core/scene/README.md` để không ai nhầm reuse được "for free".

Output: ADR ngắn `docs/superpowers/specs/YYYY-MM-DD-scene-scope-adr.md` chốt (a) hoặc (b).
Nếu (a) → triển khai ở Tier B mục B2. Nếu (b) → B2 chỉ là 1 file README.

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

**Migration:**
- `geometry-2d`: port trước (đã có pattern, dễ nhất).
- `geometry-3d`: bỏ local state, dùng EditorShell + useEditorState.
- `graph-2d`: port sau.
- `latex`: giữ EditorPopover riêng (không cần Board slot) — vẫn dùng `useEditorState` cho dirty flag.

**Acceptance:** `geometry-3d/editor/EditorPanel.tsx` 477 → ≤250. `geometry-2d/editor/LeftPanel.tsx` 451 → ≤250.

### B2. Extend hoặc khoanh vùng `core/scene`

Tuỳ ADR ở A3:
- Nếu (a) **Extend**: viết adapter `JxgRenderer3D` (đã có sẵn) wire vào store, viết `FunctionPlotRenderer` cho graph-2d. Cả 3 stamp `import { useSceneStore } from 'core/scene'`. Migration từng stamp 1 PR.
- Nếu (b) **Freeze**: thêm `src/core/scene/README.md` ghi rõ "2D-only by design"; rename export thành `useGeometry2DSceneStore` để tránh ngộ nhận; B1 (EditorShell) KHÔNG dùng scene store, mỗi stamp tự quản state.

**Acceptance:** mọi stamp interactive (2D/3D/graph-2d) cùng pattern (cùng dùng store HOẶC cùng dùng local state) — KHÔNG nửa nạc nửa mỡ như hiện tại.

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
