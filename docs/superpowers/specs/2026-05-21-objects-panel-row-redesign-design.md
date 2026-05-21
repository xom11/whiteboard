# Objects panel row redesign + highlight bug fix

**Date:** 2026-05-21
**Scope:** `src/core/scene/render/JxgRenderer.ts`, `src/core/scene/render/JxgRenderer3D.ts`, `src/core/scene/ui/ObjectRow.tsx`, `src/core/scene/ui/ObjectRowMenu.tsx`, `src/core/scene/ui/ObjectListPanel.tsx`, `src/core/scene/registry.ts` (thêm `detail` method optional vào KindSpec), per-kind files.

## Motivation

Người dùng báo 3 vấn đề khi dùng tab **📐 Đối tượng** ở MiniBoard 2D:

1. Pick màu đen cho object → text trong row + dropdown 3-chấm trở nên khó đọc (đặc biệt khi hover / dark mode).
2. Click chọn 1 object → element trên hình tô đỏ (highlight) nhưng khi click sang object khác, object cũ **vẫn đỏ**, và mỗi lần click lại càng đỏ + dày thêm.
3. UI row hiện tại (icon kind + label + summary + 👁 + 🔒 + ⋮) quá rậm, không giống pattern quen thuộc của GeoGebra (color-dot trái + label gọn + 3-chấm phải, click vào row để bung chi tiết).

Reference screenshot user cung cấp: GeoGebra-style list, color-dot trái cùng màu element, click dot → toggle visibility (dot rỗng khi ẩn); text gọn ("Điểm A", "f = Đoạn thẳng[A,B]"); click row → expand chi tiết (toạ độ / độ dài); 3-chấm phải có `Xoá` + extensible.

## Goals

- Fix highlight restore bug — click object khác phải reset element cũ về màu/độ dày gốc.
- Redesign `ObjectRow` theo screenshot: color-dot trái thay 👁, text gọn, click row → expand detail, 3-chấm chứa actions.
- Dark-mode contrast: text trong row + dropdown items không inherit obj.color, luôn dùng utility neutral color → black object không làm row/menu khó đọc.

## Non-goals

- Không redesign `PropertiesPopover` (đã ổn).
- Không thêm group/folder/drag-to-reorder/multi-select.
- Không đổi behavior của `selectedObjectId` ở cấp `EditorPanel` (vẫn 1 selection tại 1 thời điểm).

## Architecture changes

### 1. `JxgRenderer.highlight` — fix attr key shorthand

**Bug location:** `src/core/scene/render/JxgRenderer.ts:230-260`.

Original code:

```ts
const stroke = (el.getAttribute?.('strokeColor') as string | undefined) ?? '#1e40af';
const thick = (el.getAttribute?.('strokeWidth') as number | undefined) ?? 2;
this.highlightOriginal = { stroke, thick };  // ← shorthand keys
...
prev?.setAttribute?.(this.highlightOriginal); // ← JSXGraph không hiểu `stroke`/`thick`
```

JSXGraph `setAttribute` chỉ nhận đúng key names (`strokeColor`, `strokeWidth`), không có alias `stroke`/`thick`. Object shorthand tạo `{ stroke, thick }` → restore là no-op → element giữ `#ef4444` (red) + `strokeWidth + 2`. Lần highlight tiếp theo: `getAttribute('strokeColor')` trả về `#ef4444` → lưu làm "original" → vĩnh viễn đỏ; `strokeWidth + 2` cộng dồn → ngày càng dày.

**Fix:** explicit keys khớp JSXGraph names.

```ts
this.highlightOriginal = { strokeColor: stroke, strokeWidth: thick };
prev?.setAttribute?.(this.highlightOriginal);
```

Áp dụng cùng pattern ở `JxgRenderer3D.ts:135` trở đi (cùng bug pattern).

### 2. `KindSpec.detail` — optional per-kind detail string

Thêm field optional vào `KindSpec` interface ở `src/core/scene/registry.ts`:

```ts
export interface KindSpec<T extends SceneObject = SceneObject> {
  // ... existing fields ...
  /** Nội dung text hiển thị khi row được expand. Trả về `null` nếu không có detail. */
  detail?: (obj: T) => string | null;
}
```

Per-kind implementation:

- `point` / `point3d` / `pointOnCurve` / `intersection`: `(x.toFixed(2), y.toFixed(2))` hoặc 3D variant.
- `segment` / `segment3d`: `= ${length.toFixed(2)}` (dùng existing computed length nếu có; fallback compute từ endpoints).
- `line` / `ray` / `vector` / `vector3d` / `ray3d`: text equation/direction.
- `circle`: `r = ${radius.toFixed(2)}`.
- Mặc định: không implement `detail` → row không expand-show detail.

Nếu kind không có `detail`, row vẫn select được nhưng không render block detail.

### 3. `ObjectRow.tsx` — redesign

**Visual structure (collapsed):**

```
[●]  <label> <summary>                              [⋮]
```

**Expanded (khi `selected = true` và `kind.detail()` non-null):**

```
[●]  <label> <summary>                              [⋮]
       <detail()>
```

**Spec elements:**

- **Color-dot left** (replace `👁`): button 16x16, `rounded-full`.
  - Style: `background: obj.color` khi `obj.visible`, ngược lại `background: transparent; border: 2px solid obj.color` (outline-only).
  - Click: `e.stopPropagation()` + `onToggleVisible(obj.id)`.
  - aria-label: `"Toggle visibility"`, aria-pressed: `!obj.visible`.

- **Label + summary middle:**
  - Hiển thị: `<obj.label> <kind.describe(obj)>` (tách space, không thêm `=` ở row — `=` đã có trong describe output cho segment/line/circle).
  - Style: `text-zinc-700 dark:text-zinc-200`, `truncate`.
  - **Không** dùng `obj.color` cho text.

- **3-dots menu right:** `ObjectRowMenu` hiện tại.
  - Items phase này: `Khoá / Mở khoá` (move từ inline 🔒 button), `Xoá`.
  - Items đã có stub: `Đổi tên`, `Đổi màu` (Phase 3 future).
  - Dropdown items: thêm `dark:text-zinc-100` vào `MenuItem` base class.

- **Detail block (expanded):**
  - Render khi `selected && kind.detail?.(obj)` non-null.
  - Style: `pl-6 text-[11px] text-zinc-500 dark:text-zinc-400`.
  - Là `<div>` nested trong `<li>`, không phải `<li>` riêng.

**Drop:** inline `🔒` button (đã move vào menu), `meta.icon` emoji ở đầu (color-dot thay thế vai trò "kind hint").

> **Lưu ý:** Hiện `meta.icon` là emoji kind hint (📐, ●, ...) — bỏ khỏi row. Nếu sau này cần kind hint, dùng prefix nhỏ trong text label.

### 4. `ObjectListPanel.tsx` — thread expand state

`selectedId` đã có. Truyền xuống `ObjectRow` qua prop `selected: boolean` (đã có). Row tự render detail block khi `selected && kind.detail(obj) != null`.

Không cần state mới ở `ObjectListPanel` — expand = selected.

### 5. Dark mode contrast

- `ObjectRow` label/summary/detail: explicit `text-zinc-700 dark:text-zinc-200` / `text-zinc-500 dark:text-zinc-400`.
- `ObjectRowMenu` `MenuItem`: thêm `text-zinc-800 dark:text-zinc-100` vào base; `Xoá` giữ `text-red-600 dark:text-red-400`.
- Color-dot: tuyệt đối không truyền `obj.color` vào text node — chỉ vào `style.background` / `style.borderColor`.

## Data flow

```
User clicks row body
  → ObjectRow.onClick → onSelect(id)
  → ObjectListPanel.handleSelect → props.onSelect(id)
  → EditorPanel state.selectedObjectId = id
  → EditorPanel useEffect → handle.highlight(id)
  → MiniBoard rendererRef.highlight(id)
  → JxgRenderer.highlight:
       restore previous (with correct keys now) → reset color/width
       apply new highlight → save original (correct keys)
  → element on board turns red
  → ObjectRow re-renders với selected=true → render detail block
```

```
User clicks color-dot
  → ObjectRow color-dot onClick
  → e.stopPropagation() (không bubble lên row select)
  → onToggleVisible(id)
  → ObjectListPanel dispatches UPDATE { visible: !obj.visible }
  → Store re-renders → row re-renders → dot fills/empties
  → MiniBoard renderer applies obj.visible → element shows/hides
```

## Error handling

- `kind.detail?.(obj)` wrap try/catch: nếu kind chưa implement đúng, fallback `null` (no detail block).
- Color-dot khi `obj.color` undefined/null: fallback `#888` (zinc-500) — guard ở style binding.

## Test plan

**Unit / regression:**

1. `src/core/scene/render/__tests__/JxgRenderer.highlight.test.ts` — bổ sung case:
   - Setup: 2 fake elements A (blue, width 2) và B (green, width 3).
   - Call `highlight('A')` → A red, width 4.
   - Call `highlight('B')` → assert A's `setAttribute` được gọi với `{ strokeColor: 'blue', strokeWidth: 2 }` (đúng key); B red, width 5.
   - Call `highlight(null)` → assert B reverted.
   - Loop 5 lần `highlight('A')` → `highlight('B')` xen kẽ → cả A và B kết thúc với original stroke/width (không tăng dần).

2. `src/core/scene/render/__tests__/JxgRenderer3D.highlight.test.ts` — cùng pattern.

3. `src/core/scene/ui/__tests__/ObjectRow.test.tsx`:
   - Render obj `{ color: '#ff0000', visible: true }` → color-dot có `background-color: rgb(255, 0, 0)`.
   - Set `visible: false` → color-dot có `background-color: transparent` + `border-color: rgb(255, 0, 0)`.
   - Click color-dot → `onToggleVisible(id)` called, `onSelect` **không** called.
   - Click row body → `onSelect(id)` called.
   - `selected=true` + kind có `detail()` non-null → detail block rendered.
   - `selected=false` → detail block **không** rendered.
   - 3-dots dropdown: chứa `Khoá/Mở khoá`, `Xoá`; click không bubble lên row.

4. `src/core/scene/ui/__tests__/ObjectListPanel.test.tsx`:
   - 3 objects, `selectedId = 'A'` → chỉ row A có detail block.
   - Change `selectedId = 'B'` → row A collapse, row B expand.

5. Per-kind detail tests (smoke):
   - `point.detail({x: 1.234, y: -2.567})` → `'(1.23, -2.57)'`.
   - `segment.detail({length: 5.342})` → `'= 5.34'`.

**Manual smoke:**

- Mở MiniBoard 2D với scene store, tạo 2 point + 1 segment.
- Click point A → tô đỏ trên hình. Click point B → A trả về xanh, B đỏ.
- Lặp 5 lần → không tích lũy red/width.
- Click color-dot point A → A ẩn trên hình, dot rỗng. Click lại → A hiện lại, dot đầy.
- Pick màu đen cho A qua PropertiesPopover → row text vẫn dễ đọc (light + dark mode).
- Mở 3-dots → menu items đọc rõ light + dark.
- Click row segment → expand `= 5.30` bên dưới. Click row khác → cũ collapse.

## Migration / backward compat

- `KindSpec.detail` optional → kind cũ không cần update; kind không có `detail` thì row không expand.
- `meta.icon` emoji bị drop khỏi row; nếu test nào depend vào icon → update test.
- `ObjectRow` API props không đổi (vẫn `onToggleVisible`, `onToggleLocked`, `onRename`, `onChangeColor`, `onDelete`).
- `🔒` button drop khỏi row UI nhưng `onToggleLocked` callback vẫn được dùng (qua menu item).

## Out of scope

- `PropertiesPopover` redesign.
- Color contrast issue trong PropertiesPopover (đã fine).
- Group/folder, multi-select, drag reorder.
- Inline edit label (rename qua 3-chấm menu là đủ).

## Open questions

Không còn. Approach và scope đã align với user (Approach A, auto-accept sections).
