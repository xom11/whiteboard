# Stamp Host Consolidation — Design

**Status:** Draft — sẵn sàng chia issue + execute
**Author:** Claude + xinmotlanthua
**Date:** 2026-05-23
**Scope:** Đồng nhất 3 stamp interactive (`geometry-2d`, `geometry-3d`, `graph-2d`) về cùng pattern cho 3 layer: envelope serialize, scene store ownership, và SVG regen helper.
**Ambition tier:** Tier D — refactor nội bộ thuần, không thay đổi public API.
**Target version:** v0.20.0 (3 PR liên tiếp).

---

## 1. Context

Sau Tier C (StampLeftPanel template merged ở v0.19.0), 3 stamp host đã share UI surface. Nhưng phía dưới UI vẫn còn 3 lệch lạc về:

1. **Envelope serialize** — view info (bbox/axis/grid/azimuth/elevation) lưu ở chỗ khác nhau giữa 3 stamp.
2. **Scene store ownership** — 3D host tạo store; 2D + graph-2d editor tạo rồi callback ngược về host.
3. **SVG regen** — 2D + 3D tự encode base64 inline; graph-2d gọi helper rasterize.

3 lệch lạc này độc lập với UI nhưng cộng hưởng làm tăng cognitive load khi thêm stamp mới hoặc viết tool generic.

### 1.1. Envelope serialize — 3 kiểu

| Stamp | File | Envelope shape |
|---|---|---|
| `geometry-2d` | `stamps/geometry-2d/serialize.ts:12-18` | `{ version:2, bbox, state, showAxis, showGrid }` — view **ngoài** state |
| `geometry-3d` | `stamps/geometry-3d/serialize.ts:18-22` | `{ version:2, state, view? }` — view **ngoài** state (azimuth/elevation/bbox3D) |
| `graph-2d` | `stamps/graph-2d/serialize.ts:19-32` | plain `State` (no envelope) — view **trong** `state.meta.view` |

Hệ quả:
- Code generic đọc view phải `if (kind === '2d') envelope.bbox / else if (kind === '3d') envelope.view / else state.meta.view`.
- 2 trục version: `envelope.version` vs `state.meta.version` — dễ lệch.
- Migration view shape phải làm độc lập với `migrateState` cho 2D + 3D.

### 1.2. Scene store ownership — 2 phe

**Phe A — Host giữ (3D)** — `stamps/geometry-3d/host.tsx:60-61`:
```tsx
const storeRef = useRef<Store | null>(null);
if (!storeRef.current) storeRef.current = createStore(createEmptyState('3d'));
```

**Phe B — Editor tạo + callback (2D, graph-2d)** — vd `stamps/geometry-2d/host.tsx:45,150`:
```tsx
const [sceneStore, setSceneStore] = useState<Store | null>(null);
// ...
<GeometryEditorPanel onStoreReady={setSceneStore} />
```

Hệ quả của phe B:
- Ternary `sceneStore ? {...} : undefined` khắp nơi (vd `stamps/geometry-2d/host.tsx:124-131`, `stamps/graph-2d/host.tsx:211-223`).
- Render đầu panel object list trống → flash 1 frame.
- Editor remount = store mới → `useEffect(...,[store])` re-fire.
- Host khó dispatch action sớm — graph-2d nút "+ Hàm f(x)" phải null guard (`stamps/graph-2d/host.tsx:97-117`).

### 1.3. SVG regen — 2 kiểu encode

**Kiểu A — base64 SVG inline (2D + 3D)** — `stamps/geometry-2d/index.tsx:49-53`, `stamps/geometry-3d/index.tsx:63-69`:
```ts
const utf8 = unescape(encodeURIComponent(svgString));
const dataURL = 'data:image/svg+xml;base64,' + btoa(utf8);
```

**Kiểu B — `svgToImageElement` (graph-2d)** — `stamps/graph-2d/index.tsx:59-60`:
```ts
const result = await svgToImageElement(svgString);
return { fileId, dataURL: result.dataURL, mimeType: result.mimeType };
```

Hệ quả:
- 2D + 3D copy-paste đoạn `btoa(unescape(encodeURIComponent(...)))` (xử lý UTF-8 cho ký tự Việt + math symbol).
- Fallback Node `Buffer` lệch nhẹ giữa 2D và 3D (3D bỏ UTF-8 normalize ở fallback).
- graph-2d output có thể là PNG raster → khác behavior dark mode invert với 2D + 3D (đều SVG inline).

## 2. Goals + non-goals

### Goals
1. **3 stamp host về cùng 1 mental model**: envelope thống nhất, store ownership thống nhất, regen helper thống nhất.
2. **Bỏ ternary** `store ? {...} : undefined` khỏi 2D + graph-2d host.
3. **Migration tự động** cho dữ liệu cũ (sessionStorage user đang giữ envelope cũ).
4. **TypeScript narrowing tốt hơn** — `state.meta.view` là discriminated union theo `domain`.
5. **1 helper SVG regen** dùng chung 3 stamp, output nhất quán (SVG inline, UTF-8 đúng, trả width/height từ SVG).

### Non-goals
- Không thay đổi public API (`Whiteboard`, `pickSyncableAppState`, `isStampElement`, `restoreMissingStampFiles`).
- Không thay đổi `customData` shape ở runtime — chỉ thay đổi cách host parse + ghi `jsonState`/`sceneJson`.
- Không thay đổi UI editor / StampLeftPanel.
- Không gộp 3 host thành generic `<StampHost domain="..." />` (để Tier E nếu cần).
- Không thay đổi LaTeX stamp (không dùng scene store + không có envelope phức tạp).

## 3. Current state inventory

### 3.1. Shared building blocks (đã có)

| File | Vai trò |
|---|---|
| `core/scene/store.ts` | `createStore(state)` + dispatch/subscribe |
| `core/scene/types.ts` | `State`, `StateMeta`, `Domain` |
| `core/scene/migrate.ts` | `migrateState(state)` — version bump trong state |
| `stamps/shared/insertImage.ts` | `insertStampImage(api, {svgString, makeCustomData, editingElementId})` |
| `stamps/shared/svgToImage.ts` | `svgToImageElement(svgString)` — raster path graph-2d đang dùng |

### 3.2. Per-stamp files cần đụng

| Stamp | Files chính |
|---|---|
| `geometry-2d` | `host.tsx`, `serialize.ts`, `render.ts`, `index.tsx`, `editor/EditorPanel.tsx` (chỗ tạo store) |
| `geometry-3d` | `host.tsx`, `serialize.ts`, `render.ts`, `index.tsx` |
| `graph-2d` | `host.tsx`, `serialize.ts`, `render.ts`, `index.tsx`, `editor/EditorPanel.tsx` |

### 3.3. State.meta hiện tại

```ts
// src/core/scene/types.ts (tóm lược)
interface StateMeta {
  domain: '2d' | '3d' | 'graph2d';
  version: number;
  view?: ViewMeta;  // ← graph-2d dùng, 2D + 3D không
}
```

→ Cần mở rộng `ViewMeta` thành discriminated union theo `domain`.

## 4. Decisions

### 4.1. Envelope — chọn option B+ (state.meta + discriminated union)

```ts
type SceneView =
  | { domain: '2d';      bbox: [number,number,number,number]; showAxis: boolean; showGrid: boolean }
  | { domain: '3d';      bbox3D: [number,number,number,number,number,number]; azimuth: number; elevation: number }
  | { domain: 'graph2d'; xMin: number; xMax: number; yMin: number; yMax: number; showAxis: boolean; showGrid: boolean };

interface StateMeta {
  domain: '2d' | '3d' | 'graph2d';
  version: number;
  view: SceneView;  // ← bắt buộc, narrow theo domain
}
```

**Lý do:**
- Single source of truth: state là tất cả.
- `migrateState` xử lý view luôn.
- TS narrowing: `if (state.meta.view.domain === '3d') state.meta.view.azimuth // typed`.
- jsonState chỉ là `JSON.stringify(state)` — bỏ envelope.

**Migration:**
- 2D `deserializeBoard` detect envelope cũ → migrate `{bbox, showAxis, showGrid}` vào `state.meta.view`.
- 3D `deserializeBoard3D` detect envelope cũ → migrate `view` vào `state.meta.view`.
- graph-2d: không đổi (đã ở state.meta).

### 4.2. Store ownership — chọn option A+ (`useStampStore` hook)

```ts
// src/stamps/shared/useStampStore.ts
export function useStampStore(
  domain: Domain,
  editingElement: StampHostProps['editingElement'],
  parseInitial: (data: unknown) => State | null,
): Store {
  const ref = useRef<Store | null>(null);
  if (!ref.current) {
    const initial = editingElement?.customData
      ? parseInitial(editingElement.customData) ?? createEmptyState(domain)
      : createEmptyState(domain);
    ref.current = createStore(initial);
  }
  return ref.current;
}
```

**Lý do:**
- Host giữ store ngay từ frame đầu → bỏ ternary.
- Identity stable suốt vòng đời host (qua `useRef`).
- Đóng gói `createStore + createEmptyState + parse` vào 1 hook → host không leak core/scene API.
- Roundtrip edit native: hook tự xử parse `customData` ngay từ render đầu.

### 4.3. SVG regen — chọn helper SVG inline mới

```ts
// src/stamps/shared/svgToStampFile.ts
export interface StampFileResult {
  fileId: string;
  dataURL: string;
  mimeType: 'image/svg+xml';
  width: number;
  height: number;
}

export function svgToStampFile(
  svgString: string,
  fileId: string,
): StampFileResult {
  const { width, height } = parseSvgDims(svgString);
  const utf8 = unescape(encodeURIComponent(svgString));
  const base64 = typeof btoa !== 'undefined'
    ? btoa(utf8)
    : Buffer.from(utf8, 'binary').toString('base64');
  return {
    fileId,
    dataURL: `data:image/svg+xml;base64,${base64}`,
    mimeType: 'image/svg+xml',
    width,
    height,
  };
}
```

**Lý do:**
- SVG inline → vector, zoom canvas không vỡ.
- 1 chỗ encode UTF-8 → bug fix 1 chỗ áp dụng 3 stamp.
- `mimeType` literal type → TS bắt được nếu ai đó nhỡ return PNG.
- Tự đo width/height từ SVG attr → consistent, không phụ thuộc `customData.svgWidth/Height` stale.

**`svgToImageElement` giữ lại** ở `stamps/shared/svgToImage.ts` nhưng không dùng cho `restoreFileFromCustomData` nữa (chỉ dùng nội bộ nếu cần raster).

## 5. Migration plan — 3 PR liên tiếp

### PR 1 — `svgToStampFile` helper (warm-up, lowest risk)

**Branch:** `refactor/svg-to-stamp-file`
**Touch:** thêm file mới + sửa 3 stamp `index.tsx`.

1. Tạo `src/stamps/shared/svgToStampFile.ts` + test.
2. Replace `restoreFileFromCustomData` body trong:
   - `geometry-2d/index.tsx` → gọi `svgToStampFile(svgString, fileId)`.
   - `geometry-3d/index.tsx` → tương tự, bỏ try/catch trùng lặp.
   - `graph-2d/index.tsx` → bỏ `svgToImageElement`, dùng `svgToStampFile`.
3. Verify behavior: load 1 scene cũ có 3 stamp → reload → ảnh restore đúng.

**Acceptance:**
- [ ] `src/stamps/shared/svgToStampFile.ts` tồn tại + test pass.
- [ ] 3 stamp `restoreFileFromCustomData` body ≤5 dòng (gọi helper + return).
- [ ] Snapshot test: SVG output bytes-equal trước/sau refactor (cùng input).
- [ ] Reload test: scene cũ restore không lỗi.

### PR 2 — `useStampStore` hook + host giữ store

**Branch:** `refactor/use-stamp-store-hook`
**Touch:** thêm hook mới + sửa 2D + graph-2d host + editor.

1. Tạo `src/stamps/shared/useStampStore.ts` + test.
2. `geometry-2d/host.tsx`:
   - Thay `useState<Store|null>` bằng `useStampStore('2d', editingElement, parseInitial)`.
   - Bỏ ternary `sceneStore ? ... : undefined` ở `objects` prop.
   - Truyền `store` xuống `GeometryEditorPanel` qua prop mới.
3. `geometry-2d/editor/EditorPanel.tsx`:
   - Nhận `store` qua prop (thay vì tự `createStore`).
   - Bỏ callback `onStoreReady`.
4. `graph-2d/host.tsx` + `graph-2d/editor/EditorPanel.tsx`: tương tự.
5. `geometry-3d/host.tsx`: replace inline `useRef` init bằng `useStampStore('3d', editingElement, parseInitial)` cho nhất quán.

**Acceptance:**
- [ ] `src/stamps/shared/useStampStore.ts` tồn tại + test pass.
- [ ] 3 host file không còn `useState<Store|null>` / `onStoreReady` callback.
- [ ] Không còn ternary `sceneStore ? ... : undefined` ở 3 host.
- [ ] Roundtrip edit: open editor từ existing element → state load đúng từ frame đầu (no flash).
- [ ] graph-2d nút "+ Hàm f(x)" / "+ Tham số" hoạt động ngay từ render đầu (bỏ null guard).

### PR 3 — Envelope thống nhất (state.meta.view discriminated union)

**Branch:** `refactor/state-meta-view-union`
**Touch:** core/scene types + 3 stamp serialize + render + migration.

1. `src/core/scene/types.ts`:
   - Thêm `SceneView` discriminated union.
   - Đổi `StateMeta.view` từ optional → bắt buộc.
   - `createEmptyState(domain)` set default view theo domain.
2. `src/core/scene/migrate.ts`:
   - Bump `state.meta.version` lên N+1.
   - Migration `vN → vN+1`: nếu state thiếu view, fill default.
3. `geometry-2d/serialize.ts`:
   - `serializeBoard`: chỉ `JSON.stringify(state)` (bỏ envelope).
   - `deserializeBoard`: detect envelope cũ `{version, bbox, state, showAxis, showGrid}` → migrate vào `state.meta.view`. Format mới chỉ là state.
4. `geometry-3d/serialize.ts`: tương tự, migrate `envelope.view` vào `state.meta.view`.
5. `graph-2d/serialize.ts`: no-op (đã ở state.meta).
6. `*/render.ts`: đọc view từ `state.meta.view` (đã discriminated, narrow theo domain).
7. Test với scene cũ sessionStorage để verify migration không mất view info.

**Acceptance:**
- [ ] `StateMeta.view` là discriminated union (`SceneView`).
- [ ] 3 stamp `serializeBoard*` chỉ dùng `JSON.stringify(state)`.
- [ ] 3 stamp `deserializeBoard*` migrate được format cũ.
- [ ] Test: load fixture có envelope cũ → state load có view đúng.
- [ ] `npm test` + `npm run typecheck` + `npm run build` clean.

## 6. Acceptance criteria tổng

- [ ] 3 PR merged vào main theo thứ tự 1 → 2 → 3.
- [ ] Bump v0.20.0.
- [ ] CHANGELOG ghi rõ migration path (cho consumer nào persist `jsonState` raw).
- [ ] 3 stamp host file giảm LoC (đo trước/sau).
- [ ] No regression: full e2e test pass — load, insert, edit, roundtrip, reload.

## 7. Rủi ro + mitigation

| Rủi ro | Mitigation |
|---|---|
| Migration envelope cũ miss edge case (vd corrupt JSON) | Fallback `createEmptyState(domain)` + log warning (giống pattern hiện tại). |
| PNG raster của graph-2d có reason tôi chưa biết (vd font issue) | PR 1 verify visual parity trên 3 stamp trước khi merge. Nếu cần PNG cho graph-2d → giữ `svgToImageElement` làm exception. |
| `useStampStore` hook không cover edge case như editor remount theo theme | Test cover: change isDark prop → store identity unchanged. |
| Discriminated union break code generic đang assume `view` optional | Migration trong PR 3 phải `default view` cho mọi state cũ — không có nhánh undefined. |

## 8. Liên quan

- Tier C spec: `docs/superpowers/specs/2026-05-21-stamp-leftpanel-template-design.md` (đã merge v0.19).
- Tier A+B spec: `docs/superpowers/specs/2026-05-21-refactor-tier-a-b-design.md` (đã merge v0.16-v0.18).
- Scene v2: `docs/superpowers/specs/2026-05-20-scene-v2-design.md`.

## 9. Open questions

1. **Có cần CHANGELOG migration guide cho consumer?** → Probably yes, nếu consumer persist `customData.jsonState` raw bên ngoài Whiteboard. Sẽ confirm khi PR 3 review.
2. **`svgToImageElement` có cần deprecate?** → Giữ làm utility, không re-export public. Nếu sau này không ai dùng nội bộ, sẽ xoá ở v0.21.
3. **PR 2 có nên bundle luôn refactor `parseInitial` extract?** → Có thể — sẽ assess khi viết PR.
