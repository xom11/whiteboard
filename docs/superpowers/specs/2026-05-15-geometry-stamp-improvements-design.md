# Geometry Stamp — Improvements Design

**Date:** 2026-05-15
**Scope:** Stamp Hình học (`src/stamp/`) — không đụng base Excalidraw, không đụng Latex stamp.
**Single PR:** Có. Mọi cải thiện ship trong cùng một spec / plan.

## 1. Mục tiêu

Nâng UX của Geometry stamp lên ngang GeoGebra Geometry view, gồm 5 cải thiện độc lập:

1. **Live preview** khi đang dựng đường thẳng/đoạn thẳng/tia/vector/đường tròn/... — đường hoặc hình tròn render ngay sau click đầu tiên và bám chuột cho đến click tiếp theo.
2. **Live preview** cho đường tròn 3 điểm và circleCenter, polygon (đã có 1 phần), perpBisector, angleBisector, distance, angle.
3. **Click-to-edit popover**: khi ở tool Move, click vào point/line/circle → popover sửa **màu / tên / style / xoá**.
4. **5 phép biến hình**: Tịnh tiến, Quay, Đối xứng trục, Đối xứng tâm, Vị tự. Object đầu vào có thể là point / line family / circle family.
5. **Đồng bộ dark mode**: panel + popover dùng chung cơ chế `theme--dark` của Excalidraw; cần thêm rule CSS cho UI mới.

Không nằm trong phạm vi:
- "Đối xứng điểm qua đường cong" (mục #6 trong screenshot) — bỏ.
- Đổi màu canvas vẽ JSXGraph theo dark mode (giữ trắng để SVG output ổn định giữa các theme).
- Thêm tool đo lường mới hoặc construct mới ngoài 5 phép biến hình.

## 2. Kiến trúc tổng thể

Toàn bộ thay đổi nằm trong `src/stamp/`. Cấu trúc sau khi xong:

```
src/stamp/
├── JSXGraphMiniBoard.tsx        ← mở rộng: live preview, transform tool dispatch, expose mutate API
├── StampLeftPanel.tsx           ← thêm nhóm "Phép biến hình" với 5 tool button (cùng pattern các group khác)
├── GeometryEditorPanel.tsx      ← pass theme prop xuống (forwarded từ ExcalidrawWhiteboardView)
├── PropertiesPopover.tsx        ← MỚI: floating popover edit color/name/style/delete
├── TransformParamPopover.tsx    ← MỚI: input popover cho rotate (góc) / dilate (k)
├── transforms.ts                ← MỚI: pure helpers — defining points cho line/circle, apply transform
├── stamp.css                    ← bổ sung rule dark-mode cho UI mới (palette, style toggle)
├── serializeBoard.ts            ← không đổi schema; chỉ đảm bảo mutate-in-place log đúng
└── ... (giữ nguyên file khác)
```

Nguyên tắc: mọi tool action vẫn đi qua `create()` của board (đã có sẵn), ghi vào `creationLogRef`. Popover mutate trực tiếp object **và** entry log tương ứng để serialize/replay chính xác.

## 3. Live preview

### 3.1 Thay đổi trong `JSXGraphMiniBoard.tsx`

Thêm state:

```ts
const phantomRef = useRef<JxgObj | null>(null);       // điểm vô hình bám chuột
const previewShapeRef = useRef<JxgObj | null>(null);  // shape preview (line/circle/...)
```

Phantom point được tạo khi tool đang chờ click tiếp theo:

- Tạo bằng `board.create('point', [x, y], { visible: false, fixed: true, withLabel: false })`.
- Có `boardRef.current.on('move', updatePhantomFromMouse)` để cập nhật `setPositionDirectly` mỗi frame.
- Phantom **không** được push vào `creationLogRef`.

Preview shape:

- Style chung: `strokeColor: '#3b82f6'`, `strokeWidth: 1.5`, `strokeOpacity: 0.65`, `dash: 2`, `fixed: true`, `highlight: false`, `withLabel: false`, `fillOpacity: 0` cho circle.
- Không log.

#### Mapping tool → preview shape

| Tool | Sau click 1 | Sau click 2 |
|------|-------------|-------------|
| `segment` / `line` / `ray` / `vector` | line/segment/arrow (firstPick → phantom) | finalize |
| `circleCenter` | circle (firstPick, phantom) | finalize |
| `circle3` | circle (firstPick, phantom) — placeholder 2 điểm | circumcircle (p1, p2, phantom) |
| `polygon` / `area` | segment (firstPick → phantom) + giữ pattern hiện có giữa các pending | đóng khi click lại điểm đầu |
| `perpBisector` | line (firstPick → phantom) — preview "đường đi qua midpoint giả định" | finalize sau click 2 |
| `angleBisector` | segment (p1 → phantom) | segment (p1 → phantom) đổi → bisector (p1,p2,phantom) | finalize sau click 3 |
| `angle` / `distance` | segment (p1 → phantom) | finalize |
| `midpoint` | segment (p1 → phantom) | finalize |
| `perpendicular` / `parallel` | nếu click 1 là line: render đường perp/parallel mới đi qua chuột, song song/vuông góc với line đã chọn. Nếu click 1 là point: render line tạm từ point đến chuột làm hint. | finalize |
| `tangent` | nếu click 1 là circle: render tangent qua chuột tới circle đó. Nếu click 1 là point: line từ point đến chuột. | finalize |

Phép tiếp cận: viết một hàm `buildPreviewForTool(tool, picks, phantom)` trả về `JxgObj | null` (shape JSXGraph mới tạo); update mỗi khi `pendingRef` đổi.

### 3.2 Lifecycle

- Khi `pendingRef.current.length` chuyển từ 0 → 1 (hoặc tool cần thêm point): tạo phantom + preview.
- Khi `pendingRef` đổi tiếp: xoá preview cũ, tạo preview mới với set picks hiện tại.
- Khi finalize (`pendingRef.length >= toolDef.needs`): xoá phantom + preview, gọi `finalize()` cũ — chú ý **trước khi** finalize phải `removeObject(previewShapeRef.current)` và `removeObject(phantomRef.current)` để JSXGraph không khoá id.
- Khi đổi tool (`handleToolChange`): clear phantom + preview.
- Khi Esc: clear phantom + preview, reset pending. Esc handler đăng ký trong `useEffect` cùng chỗ với Ctrl/Cmd+Z (line 458-469 hiện tại), `capture: true`, gọi `clearPending()` nếu `pendingRef.length > 0`, đồng thời đóng popover nếu đang mở.

### 3.3 Khoảng trống

- `move` event bắn rất nhiều, dùng `requestAnimationFrame` debounce để tránh lag trên máy yếu.
- Phantom point phải dùng `setPositionDirectly` không phải `setPosition` để tránh trigger dependency update không cần thiết.
- Cập nhật phantom + remove/create preview shape: nếu shape cùng type chỉ cần cập nhật endpoint thì có thể tái dùng — tối ưu sau, lần đầu cứ remove + create cho đơn giản.

## 4. Properties popover

### 4.1 Trigger

Trong `JSXGraphMiniBoard.tsx`, trong handler `board.on('down', ...)`, khi `t === 'move'`:

- Nếu hits không rỗng và `bestHit` là point/line/circle: dispatch event `onObjectSelect(obj, screenCoords)` thay vì để JSXGraph xử lý drag-only.
- Drag vẫn được giữ: chỉ mở popover nếu pointer **không di chuyển đáng kể** giữa down và up (threshold 4px). Nếu user kéo thì JSXGraph drag điểm như cũ. Phát hiện qua so sánh tọa độ ở `board.on('up', ...)`.

Một prop mới `onObjectSelect?: (obj, screenCoords) => void` được handle ở `GeometryEditorPanel` để render `<PropertiesPopover />`.

### 4.2 Component `PropertiesPopover.tsx`

```ts
interface Props {
  target: JxgObj;
  kind: 'point' | 'line' | 'circle';
  anchor: { x: number; y: number };   // screen coords, viewport-relative
  onClose: () => void;
  onMutate: (patch: PropertyPatch) => void;
}

interface PropertyPatch {
  attrs?: Record<string, unknown>;     // sẽ merge vào creationLog entry + setAttribute
  name?: string;                        // riêng cho point — sẽ map sang { name } trong attrs
  remove?: boolean;
}
```

Layout (~220px rộng):

```
┌──────────────────────────────┐
│  Màu                         │
│  ● ● ● ● ● ● ● ●            │   8 swatches
│                              │
│  Tên                         │
│  [____________]              │   input text (point)
│                              │
│  Kiểu                        │
│  ◯ ⬤ ✕ ✚   (point)         │   hoặc:
│  ─── ╴╴╴ ⋯⋯⋯ (line)         │
│  • •• ••• (độ dày)           │
│                              │
│  [Xoá]                       │   nút đỏ
└──────────────────────────────┘
```

Vị trí: anchor ở screen coords, prefer phía dưới-phải; nếu tràn viewport thì flip. Implement bằng portal vào `document.body` + `position: fixed`. Có `data-stamp-area="true"` để hưởng `.theme--dark`.

Đóng khi: Esc / click ngoài (`mousedown` capture với target không nằm trong popover) / chọn tool khác / object bị xoá.

### 4.3 Color palette

Cố định 8 màu:

```ts
const PALETTE = [
  '#0f172a', // đen
  '#dc2626', // đỏ
  '#2563eb', // xanh dương
  '#059669', // xanh lá
  '#ea580c', // cam
  '#7c3aed', // tím
  '#64748b', // xám
  '#92400e', // nâu
];
```

Đổi màu = patch `{ strokeColor, fillColor: kind === 'circle' ? 'none' : color, color }`.

### 4.4 Style options

Point: `face` attribute trong JSXGraph — `'o'` (circle filled), `'circle'` (outline), `'cross'` (×), `'plus'` (+).
Line/circle: `dash` attribute — `0` (solid), `2` (dashed), `1` (dotted).
Stroke width: `strokeWidth` — `1`, `2`, `3`.

### 4.5 Mutate path

Một utility trong `JSXGraphMiniBoard.tsx`:

```ts
const mutateObject = (obj: JxgObj, patch: PropertyPatch) => {
  if (patch.remove) { /* same as delete-tool: removeObject + filter log */ return; }
  if (patch.attrs) {
    obj.setAttribute(patch.attrs);
    const id = localIdOf(obj);
    if (id) {
      const entry = creationLogRef.current.find(e => e.id === id);
      if (entry) entry.attrs = { ...entry.attrs, ...patch.attrs };
    }
  }
  boardRef.current?.update();
  setHistoryTick(t => t + 1);
};
```

Expose qua `MiniBoardHandle.mutateObject` để popover gọi.

## 5. Phép biến hình

### 5.1 Thêm tool

Trong `TOOLS` array, thêm group mới `'transform'` (cập nhật `GROUP_LABELS['transform'] = 'Phép biến hình'`):

```ts
{ key: 'translate', label: 'Phép tịnh tiến', hint: 'Click object cần biến đổi → click 2 điểm tạo vector', icon: Icon.translate, group: 'transform', needs: 3, accepts: ['any', 'point', 'point'] },
{ key: 'rotate', label: 'Quay đối tượng', hint: 'Click object → click tâm quay → nhập góc', icon: Icon.rotate, group: 'transform', needs: 2, accepts: ['any', 'point'] },
{ key: 'reflectLine', label: 'Đối xứng qua đường thẳng', hint: 'Click object → click đường thẳng', icon: Icon.reflectLine, group: 'transform', needs: 2, accepts: ['any', 'line'] },
{ key: 'reflectPoint', label: 'Đối xứng qua điểm', hint: 'Click object → click tâm đối xứng', icon: Icon.reflectPoint, group: 'transform', needs: 2, accepts: ['any', 'point'] },
{ key: 'dilate', label: 'Phép vị tự', hint: 'Click object → click tâm vị tự → nhập tỷ số k', icon: Icon.dilate, group: 'transform', needs: 2, accepts: ['any', 'point'] },
```

`GeomTool` union thêm: `'translate' | 'rotate' | 'reflectLine' | 'reflectPoint' | 'dilate'`.

### 5.2 Defining points của object

Module mới `src/stamp/transforms.ts`:

```ts
import type { JxgObj } from './types';

export interface DefiningPointsResult {
  kind: 'point' | 'segment' | 'line' | 'ray' | 'arrow' | 'circleCenter' | 'circle3';
  points: JxgObj[];    // 1 cho point, 2 cho line family / circle, 3 cho circle3
  attrs: Record<string, unknown>;  // attrs gốc để reuse khi build object mới
}

export function getDefiningPoints(obj: JxgObj): DefiningPointsResult | null {
  // Đọc obj.elType + obj.parents / obj.point1 / obj.center / ...
}
```

JSXGraph expose: `line.point1`, `line.point2` cho segment/line/arrow; `circle.center`, `circle.point2` cho circleCenter; `circumcircle.point1/point2/point3` cho circle3. Verify từng cái khi implement.

### 5.3 Apply transform

```ts
export interface TransformSpec {
  type: 'translate' | 'rotate' | 'reflectLine' | 'reflectPoint' | 'dilate';
  params: unknown[];   // bám sát JSXGraph 'transform' element signature
}

export function buildTransform(board, spec: TransformSpec): JxgObj { ... }
```

Mapping sang JSXGraph:

| Tool | JSXGraph |
|------|----------|
| translate | `board.create('transform', [() => B.X()-A.X(), () => B.Y()-A.Y()], { type: 'translate' })` |
| rotate | `board.create('transform', [angleRad, center], { type: 'rotate' })` — `angleRad = (degrees * Math.PI) / 180`, conversion làm trong `applyTransformAndCreate`, popover trả về độ |
| reflectLine | `board.create('transform', [line], { type: 'reflect' })` |
| reflectPoint | `board.create('transform', [center], { type: 'reflect' })` — JSXGraph hỗ trợ reflect qua point; nếu không, dùng `scale(-1,-1)` quanh center bằng cách composite 2 reflect hoặc dùng `mirror` element |
| dilate | `board.create('transform', [k, center], { type: 'scale' })` |

Nếu một trong các API trên không khả dụng trong JSXGraph version đang dùng, fallback: tự tính tọa độ và tạo point/line từ `[x, y]` literal (mất tính liên kết động nhưng đảm bảo output đúng).

### 5.4 Flow tool

Trong `JSXGraphMiniBoard.tsx`, thêm nhánh trong `board.on('down')` cho `group: 'transform'`:

1. Pick 1: `accepts[0] === 'any'` — chấp nhận mọi point/line/circle. Lưu vào `pendingRef`.
2. Pick tiếp: theo `accepts` còn lại.
3. Khi đủ pick:
   - Với `rotate`/`dilate`: mở `TransformParamPopover` tại screen coords của center. **Không** finalize ngay.
   - Với 3 tool còn lại: finalize ngay.
4. Param popover confirm → finalize.
5. Esc bất kỳ lúc nào: clear pending, đóng popover.

### 5.5 Finalize

```ts
function applyTransformAndCreate(tool, picks, params): void {
  const [src, ...rest] = picks;
  const t = buildTransform(boardRef.current, { type: tool, params });
  const defining = getDefiningPoints(src);
  if (!defining) return;

  // Tạo điểm transformed cho mỗi defining point — log từng cái.
  const newPoints = defining.points.map((p, i) => {
    const id = nextLocalId();
    const obj = boardRef.current.create('point', [t, p], { name: nextLabel(), size: 3 });
    creationLogRef.current.push({ id, type: 'point', args: [/* sentinel */], attrs: {} });
    objMapRef.current.set(id, obj);
    return obj;
  });

  // Build lại object cùng kind từ newPoints — log + map.
  // Style: clone `defining.attrs` (giữ strokeWidth, dash, fillColor...) nhưng override
  // strokeColor sang xanh cobalt (#0ea5e9) để phân biệt với object gốc.
  // Label point mới: lấy tên gốc + apostrophe (A → A', B → B') khi có thể, fallback nextLabel().
}
```

#### Vấn đề serialize transform

Schema `SerializedElement` hiện tại là `{ type, args, attrs, id }` với `args` chứa string id reference. Transform element không fit pattern này gọn.

Hai cách:

- **A:** Thêm transform vào log như một entry `{ type: 'transform', args: [...resolvedRefs], attrs: { type: 'rotate', params: [...] } }`. Replay sẽ tạo lại transform → đảm bảo điểm transformed sống động.
- **B:** Mỗi transformed point lưu cách build qua args đặc biệt: `{ type: 'point', args: [{ __transform: 'rotate', params: [...], src: 'jX' }] }` — phải mở rộng `deserializeIntoBoard` để hiểu sentinel object.

**Chọn A.** Cần mở rộng `deserializeIntoBoard` để chấp nhận `type === 'transform'` (chỉ lưu reference, không thêm vào board map có lookup id) và mọi `args` có thể chứa `{ __transformRef: 'jY' }` để chỉ đến transform đó. Cụ thể:

- Log entry transform: `{ id: 'jN', type: 'transform', args: ['jX' /*  center ref */, ...], attrs: { _t: 'rotate', _angle: 1.5708 } }`.
- Replay đọc `attrs._t` để biết JSXGraph `type`, các tham số khác từ args. Tạo bằng `board.create('transform', resolvedArgs, { type: attrs._t })`.
- Point transformed log entry: `{ type: 'point', args: ['jN' /* transform ref */, 'jX' /* source point */], attrs: {...} }`. Khi replay `resolveArgs` thấy cả 2 đều trong map, gọi `board.create('point', [transformObj, srcPoint])` — JSXGraph hiểu đúng.

`SerializedElement` schema không đổi (vẫn `{type, args, attrs, id}`); chỉ giá trị runtime mở rộng.

### 5.6 Component `TransformParamPopover.tsx`

```ts
interface Props {
  kind: 'rotate' | 'dilate';
  anchor: { x: number; y: number };
  defaultValue: number;   // 90 cho rotate, 2 cho dilate
  onConfirm: (value: number) => void;
  onCancel: () => void;
}
```

UI tối giản: 1 input number, label ('Góc (°)' / 'Tỷ số k'), 2 nút (Áp dụng / Huỷ). Enter = confirm, Esc = cancel. Width ~180px.

## 6. Dark mode

### 6.1 Trạng thái hiện tại

- `ExcalidrawWhiteboardView.tsx` line 157 đã detect `appState.theme === 'dark'`.
- Wrapper line 570 đã apply class `theme--dark`.
- `stamp.css` đã có 84 dòng rule dark cho panel hiện tại.

### 6.2 Việc cần làm

- Audit các class còn thiếu trong `stamp.css`:
  - `bg-emerald-600`/`hover:bg-emerald-700` (header Geometry panel) — hiện thấy ổn trong light, nhưng dark có thể quá rực; cân nhắc thêm rule chuyển sang `bg-emerald-700`/`hover:bg-emerald-800` trong dark.
  - `border-emerald-200`, `bg-emerald-50` đã có rule; xác nhận đầy đủ.
  - Active tool button hiện dùng nền sáng (xanh nhạt) — trong dark cần slate-700 + ring emerald-400.
- Mọi component MỚI (`PropertiesPopover`, `TransformParamPopover`) phải:
  - Wrapper root có `data-stamp-area="true"` để hưởng rule chung.
  - Dùng đúng class palette đã được dark-mode CSS handle (`bg-white`, `text-slate-700`, `border-slate-200`, ...).
- Color palette swatches: render `<button style={{ background: hex }}>` — không thay đổi giữa light/dark (màu tự nó là content).
- Style toggles: `border-slate-300` viền + `bg-white` nền → dark CSS đã handle.

### 6.3 Pass theme prop

Không cần. Cơ chế CSS-class-based đã hoạt động: chỉ cần component MỚI render bên trong wrapper có `theme--dark` (luôn đúng vì popover portal vào `document.body` — **vấn đề**: portal nằm ngoài wrapper.

→ **Giải pháp**: `ExcalidrawWhiteboardView` truyền boolean `isDark` xuống panel; popover khi mount thêm `theme--dark` vào root của chính nó nếu `isDark = true`. Hoặc đơn giản hơn: cha gọi `document.body.classList.toggle('stamp-theme-dark', isDark)` và CSS đổi selector từ `.theme--dark` thành `.stamp-theme-dark` toàn cục. Chọn cách thứ hai để CSS hiện tại vẫn tương thích — chỉ thêm 1 selector `body.stamp-theme-dark [data-stamp-area="true"] { ... }` parallel với rule hiện có, hoặc apply class `theme--dark` lên chính popover root.

Quyết định: **mỗi popover/panel tự nhận `isDark` qua prop và tự apply class `theme--dark` lên root của mình**. Đỡ side-effect global, không phụ thuộc DOM ancestry.

API:

```ts
// ExcalidrawWhiteboardView → GeometryEditorPanel
<GeometryEditorPanel ... isDark={isDarkTheme} />

// GeometryEditorPanel → mọi popover children
<PropertiesPopover ... isDark={isDark} />
<TransformParamPopover ... isDark={isDark} />
```

Mỗi component:

```tsx
<div className={`${isDark ? 'theme--dark ' : ''}...other classes`} data-stamp-area="true">
```

## 7. Testing

Cấu hình test hiện có: Jest 29 + jsdom + ts-jest, mock `@excalidraw/excalidraw`, `katex`, `next/dynamic`.

JSXGraph chạy trong jsdom **bị** (không có Canvas + một số DOM API). Hiện tại các test stamp mock board. Tiếp tục pattern đó:

### 7.1 Test mới

- `JSXGraphMiniBoard.test.tsx`:
  - Live preview lifecycle: mock board `create` + `on`; sau click 1 (giả lập), kỳ vọng có `create('point', ..., { visible: false })` + 1 preview shape `create`. Sau click 2, kỳ vọng phantom/preview đều bị `removeObject` trước finalize.
  - Esc clears pending + phantom.
- `PropertiesPopover.test.tsx`:
  - Render với mock target object; click swatch → `onMutate({ attrs: { strokeColor: '#dc2626', ... } })`.
  - Edit name input → `onMutate({ attrs: { name: 'B' } })`.
  - Click Xoá → `onMutate({ remove: true })` + `onClose`.
  - Esc đóng.
- `TransformParamPopover.test.tsx`:
  - Default value hiển thị (90 / 2).
  - Enter → `onConfirm(value)`.
  - Esc → `onCancel`.
- `transforms.test.ts`:
  - `getDefiningPoints` cho từng kind (mock obj với `elType` + parents).
- `serializeBoard.test.ts` (extend):
  - Replay transform entry: log gồm 1 `transform` + 1 `point` ref vào transform → board.create gọi đúng.

### 7.2 Smoke

Smoke test cho `ExcalidrawWhiteboardView` đã có; chỉ cần đảm bảo `isDark` prop pass-through không gây lỗi.

## 8. Migration / Backward compatibility

- Stamp JSON đã tồn tại trong sessionStorage / file SVG cũ không chứa transform entry, không có style mới → replay vẫn OK (chỉ thiếu thuộc tính, default value áp dụng).
- Stamp mới chứa transform entry → cần consumer dùng version mới của package mới deserialize đúng. Lib chưa có versioning, chấp nhận: stamp tạo bằng v0.3 chỉ replay đúng trên v0.3+.

## 9. Rollout

1. Implement transforms.ts + tests pure.
2. Mở rộng `JSXGraphMiniBoard.tsx`: live preview → properties API → transform dispatch.
3. Build PropertiesPopover + TransformParamPopover.
4. Wire vào `GeometryEditorPanel` + `StampLeftPanel` (thêm group "Phép biến hình" với 5 tool button).
5. CSS dark-mode audit + bổ sung.
6. `npm run typecheck && npm test && npm run build`.
7. Commit `dist/`, bump version, tag.

## 10. Câu hỏi mở (cần xác nhận trước khi bắt tay)

Không còn — mọi quyết định UX/scope đã chốt ở session brainstorm. Chi tiết JSXGraph API cho transform có thể cần điều chỉnh nhỏ khi implement (ví dụ `reflectPoint` cách hiệu quả nhất).
