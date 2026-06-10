# Nhãn kéo được độc lập với điểm/đường (Draggable Labels)

**Ngày:** 2026-06-10
**Trạng thái:** Approved (Hướng A)

## Vấn đề

Trong editor hình học, khi vẽ hình, người dùng chỉ di chuyển được **điểm** chứ không di
chuyển được **nhãn** (tên) của điểm/đường. Khi các điểm nằm chi chít hoặc tên điểm / tên
đường che mất thông tin, người dùng cần bấm vào **chữ** (vd chữ "C") và kéo nó ra quanh
điểm C để thấy rõ hình.

## Phạm vi

- **Loại nhãn:** điểm + đường/đoạn/đường tròn (mọi object có `name: obj.label`).
- **Editor:** 2D hình học (`📐`) trước. Đồ thị hàm số (`graph-2d`) cũng được hưởng ngay
  vì dùng chung `JxgRenderer`. **3D defer** (dùng `JxgRenderer3D` riêng).
- **Persist:** offset nhãn lưu cùng scene → re-open editor giữ nguyên.
- **Reset:** right-click (contextmenu) trên nhãn → đưa về offset mặc định.

## Hướng tiếp cận (A)

`labelOffset` per-object + bật nhãn draggable + drag-sync listener tái dùng mẫu sẵn có
(`attachFreePointDragSync`). KHÔNG dùng LLM, KHÔNG đụng pipeline AI/DSL — đây là tính
năng tương tác editor thuần.

## Thiết kế

### 1. Mô hình dữ liệu

Thêm field tùy chọn vào attrs các kind có nhãn:

```ts
labelOffset?: [number, number]; // pixel; undefined = mặc định
```

- `PointAttrs` (`src/core/scene/kinds/point-constraints/_types.ts`)
- `LineAttrs` (`src/core/scene/kinds/line.ts`)
- `SegmentAttrs` (`src/core/scene/kinds/segment.ts`)
- `CircleAttrs` (`src/core/scene/kinds/circle.ts`)

Default: điểm `[10, 10]` (đúng JSXGraph default hiện tại); đường/đường tròn giữ default
JSXGraph nếu `labelOffset` undefined (không ép offset → không đổi hành vi hiện tại).

### 2. Render — bật nhãn kéo được

Helper chung tránh lặp 4 chỗ, vd `src/core/scene/kinds/_label.ts`:

```ts
export function labelOpts(labelOffset?: [number, number], dflt?: [number, number]) {
  const offset = labelOffset ?? dflt;
  return { label: { fixed: false, ...(offset ? { offset } : {}) } };
}
```

- `buildPointOpts` (`point-constraints/shared.ts`): merge `labelOpts(attrs.labelOffset, [10,10])`.
- Opts của line/segment/circle: merge `labelOpts(attrs.labelOffset)` (không ép default).

`label: { fixed: false }` làm nhãn JSXGraph kéo được.

### 3. Drag-sync nhãn (mới) — `JxgRenderer`

Thêm `attachLabelDragSync(obj, el)` trong `JxgRenderer.create()` cạnh
`attachFreePointDragSync`. Gọi cho mọi object có `el.label`.

```ts
private attachLabelDragSync(obj: SceneObject, el: any): void {
  const label = el?.label;
  if (!label || typeof label.on !== 'function') return;
  const sceneId = obj.id;
  label.on('up', () => {
    if (this.disposed) return;
    const off = readLabelOffset(label); // [dx, dy] pixel
    if (!off) return;
    const cur = this.store.getState().objects[sceneId];
    if (!cur) return;
    const prev = (cur.attrs as any).labelOffset as [number, number] | undefined;
    if (prev && prev[0] === off[0] && prev[1] === off[1]) return;
    this.store.dispatch({
      type: 'UPDATE_ATTRS',
      payload: { id: sceneId, patch: { labelOffset: off } },
    });
  });
}
```

`readLabelOffset(label)` đọc từ `label.relativeCoords` (pixel offset so với anchor). **Quy
ước tọa độ phải khớp** với cái `setAttribute({ label: { offset } })` ghi lại — nếu lệch
trục y màn hình thì nhãn "nhảy". Đây là rủi ro chính, xác minh bằng test thủ công.

### 4. Update hook re-áp offset

Các `update()` hook (điểm: `point.ts`; line/segment/circle nếu có) khi nhận
`UPDATE_ATTRS` re-áp `label: { offset }` qua `setAttribute` — đồng bộ giống
`setPositionDirectly` cho điểm. Vì user vừa kéo nên thường là no-op nhưng cần để các path
khác (reset, undo/redo, reload) đồng bộ.

### 5. Reset về mặc định

Right-click (contextmenu) trên DOM node của nhãn (`label.rendNode`) → `preventDefault` →
`dispatch(UPDATE_ATTRS { labelOffset: undefined })`. Wiring trong `attachLabelDragSync`
(hoặc helper kế bên).

### 6. Persistence

Tự động: `labelOffset` nằm trong `attrs` → serialize/restore sẵn có lo. Re-open editor
đọc lại offset qua render opts.

## Testing

- **Unit:** `labelOpts()` trả đúng object (có/không offset, fixed:false). `readLabelOffset`
  parse đúng từ mock `relativeCoords`. Reducer `UPDATE_ATTRS { labelOffset }` merge đúng.
- **Render-golden:** scene KHÔNG có `labelOffset` → output byte-identical với hiện tại
  (không regress). Scene CÓ `labelOffset` → opts chứa offset.
- **Thủ công (verify skill):** kéo nhãn điểm/đường trong MiniBoard, thả → nhãn ở yên (không
  nhảy); reload/re-edit → giữ vị trí; right-click → reset.

## Không làm (defer)

- 3D editor (`JxgRenderer3D`).
- Nudge buttons trong PropertiesPopover (Hướng C) — có thể bổ sung sau.
- Snap/anchor 8 hướng cho nhãn.

## File đụng tới

- `src/core/scene/kinds/_label.ts` (mới — helper)
- `src/core/scene/kinds/point-constraints/_types.ts`, `shared.ts`
- `src/core/scene/kinds/point.ts` (update hook)
- `src/core/scene/kinds/line.ts`, `segment.ts`, `circle.ts`
- `src/core/scene/render/JxgRenderer.ts`
- Tests cạnh mỗi file.
