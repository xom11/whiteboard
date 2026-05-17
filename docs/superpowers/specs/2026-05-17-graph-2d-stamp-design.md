# Graph 2D Stamp — Design

**Status**: Design • Draft for review
**Date**: 2026-05-17
**Author**: brainstorming session
**Scope**: phase 1 — đồ thị hàm số 2D dạng `y = f(x)` cho HocTotBachKhoa (THPT).
**Inspired by**: GeoGebra Classic Graphing perspective.

---

## 1. Mục tiêu

Thêm stamp `graph-2d` cho phép học sinh nhập hàm `y = f(x)`, vẽ đồ thị tương tác (pan/zoom, slider tham số, điểm trên curve, giao điểm, tiếp tuyến), rồi chèn ảnh SVG vào whiteboard. Double-click ảnh để re-edit với toàn bộ state cũ.

Stamp này độc lập với `geometry-2d` / `geometry-3d` / `latex` — đi qua cùng plugin registry hiện có.

**Out of scope phase 1**: hàm ẩn `f(x,y)=0`, hàm tham số `(x(t), y(t))`, hàm cực `r(θ)`, bất phương trình, đạo hàm/tích phân hiển thị tự động.

## 2. Quyết định thiết kế (đã chốt)

| Chủ đề | Quyết định |
|---|---|
| Phạm vi phase 1 | `y = f(x)` rõ + axes/grid + pan/zoom + nhiều function với màu + slider tham số |
| Kiến trúc | Stamp mới `src/stamps/graph-2d/` (KHÔNG extend `geometry-2d`) |
| Engine vẽ | JSXGraph (dùng lại dep hiện có) |
| Cú pháp input | Plain JS-like: `sin(x)`, `x^2`, `log(x)`, `sqrt(x)` |
| Layout editor | Sidebar trái 280px (tool strip dọc trên + algebra view bên dưới) · plot area fill phần còn lại |
| Slider tham số | Auto-detect khi gõ → prompt confirm tạo → default `[-5, 5]` step `0.1`, có thể chỉnh sau |
| Plot tools | pan, zoom in/out, axis toggle, grid toggle, reset view, hover read coord, point-on-curve, intersect 2 curves, tangent at point, animate slider |
| Toolbar | Icon 📈 · shortcut `H` (hàm số) |
| Insert format | Image stamp với `customData.jsonState` (giống pattern geometry-2d) |
| Mobile UX | Drawer pattern mirror `geometry-2d` (`isMobile` + `drawerOpen`) |

## 3. Kiến trúc

### 3.1 Vị trí trong registry

```
src/stamps/
├── geometry-2d/   (đã có)
├── geometry-3d/   (đã có)
├── latex/         (đã có)
└── graph-2d/      MỚI
```

`DEFAULT_STAMPS = [geometryStamp, latexStamp, geometry3dStamp, graph2dStamp]` trong `src/stamps/shared/registry.ts`. Public API (`src/stamps/index.ts`) re-export thêm `graph2dStamp`, `Graph2DCustomData`, `isGraph2DCustomData`.

### 3.2 Cây file

```
src/stamps/graph-2d/
├── index.tsx                  StampType + Host
├── serialize.ts               SerializedGraph + parse/stringify
├── render.ts                  offscreen board → SVG (insert + restore)
├── parser.ts                  validate + compile expression → JS fn
├── colors.ts                  palette + auto-assign
├── __tests__/
│   ├── serialize.test.ts
│   ├── parser.test.ts
│   ├── colors.test.ts
│   ├── render.test.ts
│   └── index.test.tsx
└── editor/
    ├── EditorPanel.tsx        orchestrator + ref handle
    ├── MiniBoard.tsx          JSXGraph wrapper React
    ├── LeftPanel.tsx          sidebar trái: tool strip + algebra view
    ├── AlgebraView.tsx        function list + slider list container
    ├── FunctionRow.tsx        1 row: color dot, expr input, eye, menu
    ├── SliderRow.tsx          1 slider HTML range + label + range popover
    ├── tools.ts               GraphTool enum + metadata
    ├── theme.ts               isDark → colors map
    ├── handlers.ts            board event handlers theo tool
    └── __tests__/
        ├── EditorPanel.test.tsx
        ├── AlgebraView.test.tsx
        ├── FunctionRow.test.tsx
        └── MiniBoard.test.tsx
```

### 3.3 Boundary unit

- `serialize.ts` — pure, không depend React/JSXGraph. Types + parse/stringify.
- `parser.ts` — pure, không depend gì ngoài JS regex/string ops.
- `colors.ts` — pure.
- `render.ts` — depend JSXGraph, không depend React. Dùng được offscreen.
- `MiniBoard.tsx` — chỉ làm bridge JSXGraph ↔ React lifecycle.
- `AlgebraView.tsx` — không biết JSXGraph; gọi mutations qua EditorPanel ref.
- `EditorPanel.tsx` — orchestrator, giữ ref board + state SerializedGraph.

## 4. Data model

### 4.1 SerializedGraph (source of truth)

```ts
export interface SerializedGraph {
  version: 1;
  view: {
    xMin: number; xMax: number;
    yMin: number; yMax: number;
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
  id: string;          // 'f1', 'f2' (stable cho re-edit)
  name: string;        // 'f', 'g', 'h' (label hiển thị)
  expression: string;  // 'x^2 + 2*x - 3'
  color: string;       // '#2563eb'
  visible: boolean;
  domain?: { min: number; max: number }; // mặc định = view.xMin/Max
}

export interface SerializedParameter {
  name: string;        // 'a' (single letter, lowercase)
  value: number;
  min: number;         // default -5
  max: number;         // default 5
  step: number;        // default 0.1
}

export interface SerializedPoint {
  id: string;
  functionId: string;  // point bám curve nào
  x: number;           // y = f(x) tính lại runtime
  label?: string;
}

export interface SerializedIntersection {
  id: string;
  functionIdA: string;
  functionIdB: string;
  // toạ độ runtime; không cache trong JSON
}

export interface SerializedTangent {
  id: string;
  pointId: string;
}
```

### 4.2 Quy tắc lưu trữ

- **Function expression là source of truth**, không cache compiled callable.
- **Slider bake `value`** tại thời điểm insert. Re-edit load lại đúng giá trị, người dùng có thể kéo lại.
- **Animation runtime KHÔNG persist** — sau restore slider đứng yên.
- **Derived (intersection, tangent)** chỉ lưu reference id; runtime compute lại. Tránh stale.
- **Cap số function** = 8 (đủ palette). Cap slider = 8.

### 4.3 Custom data trên Excalidraw element

```ts
export interface Graph2DCustomData extends BaseStampCustomData {
  kind: 'graph2d';
  version: 1;
  jsonState: string;   // JSON.stringify(SerializedGraph)
  svgWidth: number;
  svgHeight: number;
}
```

Guard `isGraph2DCustomData(data)` check `kind === 'graph2d' && version === 1 && typeof jsonState === 'string'`.

### 4.4 Versioning

`version: 1` cho phép migrate sau:

- Khi load `v < currentVersion`: chạy migration step-by-step.
- Khi load `v > currentVersion`: warn + fallback empty state.

## 5. Editor flow

### 5.1 Cây component khi mở editor

```
Whiteboard
└── StampEditorOverlay (đã có)
    └── Graph2DStampHost
        ├── GraphLeftPanel
        │   ├── ToolStrip
        │   └── AlgebraView
        │       ├── FunctionRow × n
        │       └── SliderRow × n
        └── GraphEditorPanel
            └── MiniBoard
```

### 5.2 Host responsibilities

- Owns React state UI (`activeTool`, `drawerOpen`, `isMobile`, `canUndo`).
- Owns `SerializedGraph` state (single source of truth domain).
- Parse `editingElement.customData.jsonState` lúc mount → `initialState`.
- Expose `tryInsert()` / `hasContent()` qua `useImperativeHandle` cho parent.

### 5.3 EditorPanel handle

```ts
interface GraphEditorPanelHandle {
  insert(): boolean;
  hasContent(): boolean;

  setTool(t: GraphTool): void;
  setShowAxis(b: boolean): void;
  setShowGrid(b: boolean): void;
  resetView(): void;
  undo(): void;

  addFunction(expr: string): { ok: true; id: string } | { ok: false; error: string };
  updateFunction(id: string, patch: Partial<SerializedFunction>): void;
  removeFunction(id: string): void;
  setFunctionVisible(id: string, v: boolean): void;
  setParameter(name: string, value: number): void;
  updateParameterRange(name: string, min: number, max: number, step: number): void;
  startAnimateParameter(name: string): void;
  stopAnimateParameter(name: string): void;
}
```

### 5.4 Mutation flow ví dụ — thêm function

```
User gõ "x^2" + Enter trong FunctionRow
  → AlgebraView.onAddFunction("x^2")
  → Host.handleAddFunction
      ├─ parser.validate(expr) → { ok, freeVars }
      ├─ parser.detectNewParams(freeVars, existingParams) → ['b']
      ├─ if newParams: show ConfirmCreateParamsToast (auto-detect prompt)
      ├─ append SerializedFunction { id, name='f'|'g'|'h'... (auto từ alphabet), expr, color=palette[i], visible:true }
      ├─ append SerializedParameter { 'b', value:1, min:-5, max:5, step:0.1 }
      └─ setSerialized(next)  // immutable copy
  → React re-render MiniBoard
  → MiniBoard effect diff curves → board.create('functiongraph', ...) cho function mới
```

### 5.5 Tool state machine

```
GraphTool = 'move' | 'point-on-curve' | 'intersect' | 'tangent'
```

`move` là default. Pointer events trên board route qua `handlers.ts` switch theo `activeTool`. Sau khi action hoàn thành (vd intersect đã chọn xong 2 curve), tool reset về `move`.

**Pan và zoom KHÔNG phải tool modal** — chúng là gesture nền (drag empty area để pan, scroll/pinch để zoom; nút zoom in/out/reset là button trực tiếp gọi method, không đổi `activeTool`). Tương tự axis/grid toggle là button toggle state trong `view`, không phải tool mode.

### 5.6 Undo

Stack `SerializedGraph[]` trong Host, max 30 snapshot. Mỗi mutation push snapshot trước đó. `undo()` pop + restore.

## 6. Render pipeline

### 6.1 Insert flow

```
EditorPanel.insert()
  → render.renderGraph2dSvgFromState(JSON.stringify(serialized))
      ├─ parseSerializedGraph(jsonState)
      ├─ create offscreen <div> 600×400 hidden trong document.body
      ├─ set JXG.Options.text.display = 'internal' (gotcha SVG labels)
      ├─ JXG.JSXGraph.initBoard(...) với view bounds
      ├─ loop functions visible → board.create('functiongraph', ...)
      ├─ loop points/intersections/tangents → board.create(...)
      ├─ clone board.containerObj.querySelector('svg').outerHTML
      └─ cleanup remove div
  → svgString
  → Host.handleInsert(jsonState, svgString)
      → insertStampImage(api, { svgString, makeCustomData, editingElementId })
  → onClose()
```

### 6.2 Restore flow (reload không có file)

`graph2dStamp.restoreFileFromCustomData(element)` re-render SVG từ `customData.jsonState` → data URL base64 → trả `RestoredStampFile`. Pattern y hệt geometry-2d.

### 6.3 Re-edit flow (double-click ảnh)

`Graph2DStampHost` mount với `editingElement`. Parse `customData.jsonState` → `initialState`. EditorPanel mount MiniBoard với serialized này. User chỉnh xong nhấn Chèn → `insertStampImage` thay element cũ (`editingElementId` truyền vào). Pattern đã có sẵn.

## 7. Expression parser / evaluator

### 7.1 Whitelist

| Loại | Token |
|---|---|
| Toán tử | `+ - * / ^ ( ) ,` |
| Số | `[0-9]+(\.[0-9]+)?` |
| Hàm | `sin cos tan asin acos atan log ln exp sqrt abs floor ceil round` |
| Hằng | `pi e` |
| Biến | `x` + tham số single-letter ngoại trừ `x, y, e` |

### 7.2 Pipeline

```
parser.validate(expr)
  → tokenize
  → reject nếu ký tự không trong whitelist
  → reject nếu xuất hiện 'function', '=>', ';', '[', ']', '\'', '"'
  → trả { ok, freeVars: Set<string> }

parser.compile(expr, paramValues)
  → substitute '^' → '**'
  → substitute identifiers: 'sin' → 'Math.sin', 'pi' → 'Math.PI', ...
  → substitute param names → string số
  → const fn = new Function('x', `return (${rewritten})`)
  → wrap: (x) => { try { return fn(x) } catch { return NaN } }
```

### 7.3 Tại sao dùng `new Function` thay vì JessieCode

- Tốc độ: slider tick yêu cầu re-evaluate dày đặc.
- Control: cleaner error path, dễ test.
- Bundle: không thêm dep mới (JessieCode đã có nhưng API verbose).
- An toàn: input là chính học sinh trên máy của họ, không phải remote untrusted. Whitelist + regex đủ.

Comment trong `parser.ts` ghi rõ giả định này. Nếu sau này mở rộng nhận input remote thì thay bằng JessieCode hoặc safe-eval.

## 8. Error handling

| Tình huống | Xử lý |
|---|---|
| Expression syntax invalid | FunctionRow border đỏ + tooltip "Biểu thức không hợp lệ" |
| Tên hàm lạ (vd `tg(x)`) | Border đỏ + gợi ý "Bạn có ý là `tan` không?" |
| Evaluate NaN tại điểm | Skip điểm — JSXGraph render curve có gap |
| Evaluate throw khắp domain | Toast "Không vẽ được trong khoảng hiện tại" |
| jsonState corrupt khi re-edit | Host fallback empty state + `console.warn` (giống geometry-2d) |
| Slider value vượt range sau khi chỉnh min/max | Clamp về range mới |
| Element file thiếu sau reload | `restoreFileFromCustomData` regen SVG (đã wire pipeline có sẵn) |
| Vượt cap 8 function/slider | Disable nút "+ Thêm" + tooltip giải thích |

## 9. Mobile UX

Mirror chính xác pattern `geometry-2d`:

- `useIsMobile` hook xác định breakpoint.
- `drawerOpen` state trong Host.
- `LeftPanel` render dạng drawer slide-from-left khi `isMobile`.
- Plot area chiếm 100% màn hình; mở drawer bằng nút hamburger góc trên-trái.
- Slider drag được trên touch (HTML range native).
- Animation: nút play/pause trong SliderRow; trên mobile hold-to-play để tránh chạy lâu vô tình.

## 10. Testing strategy

Mỗi file source có `__tests__/<name>.test.tsx` cạnh nó (CLAUDE.md convention).

| File | Test coverage |
|---|---|
| `serialize.test.ts` | round-trip JSON; bad input → null; version mismatch fallback |
| `parser.test.ts` | accept whitelist tokens; reject injection (`function`, `;`, `[`); compile đúng `x^2 + 2*x`; detect free vars; slider substitution; throw → NaN wrapper |
| `colors.test.ts` | palette unique trong 8 đầu; tuần hoàn nếu vượt |
| `render.test.ts` | trả SVG string non-empty; gotcha `text.display = 'internal'` được set |
| `EditorPanel.test.tsx` | mount empty; add function; insert callback fire với jsonState đúng; re-edit từ initialState load đủ |
| `AlgebraView.test.tsx` | thêm/xoá/đổi expression; slider drag onChange fire |
| `FunctionRow.test.tsx` | invalid expr → error UI; valid expr → callback OK |
| `MiniBoard.test.tsx` | diff curves: thêm/xoá/đổi color không recreate board |

Mock: `@excalidraw/excalidraw` (đã có pattern), JSXGraph minimal stub.

Integration end-to-end: chạy tay trong `playground/` — vẽ vài function, kéo slider, intersect, insert vào whiteboard, reload, double-click re-edit.

## 11. Implementation order (rough)

| Step | Việc | Ước lượng |
|---|---|---|
| 1 | `serialize.ts` + `parser.ts` + `colors.ts` + tests | 1.0 ngày |
| 2 | `render.ts` + test SVG | 0.5 ngày |
| 3 | `MiniBoard.tsx` (chỉ functions, không tools) + theme | 1.0 ngày |
| 4 | `AlgebraView.tsx` + `FunctionRow.tsx` (no slider) | 1.0 ngày |
| 5 | Wire Host + EditorPanel + insert pipeline | 0.5 ngày |
| 6 | Slider auto-detect + `SliderRow.tsx` + animation | 1.0 ngày |
| 7 | Tools nền: pan/zoom/axis/grid/reset | 0.5 ngày |
| 8 | Tools tương tác: point-on-curve, intersect, tangent | 1.5 ngày |
| 9 | Mobile drawer | 0.5 ngày |
| 10 | Registry + toolbar button + shortcut `H` | 0.25 ngày |
| 11 | Tests đầy đủ + dev playground demo | 1.0 ngày |
| | **Tổng** | **~8.25 ngày** |

## 12. Risks & mitigations

| Risk | Mitigation |
|---|---|
| `new Function` không an toàn nếu input remote | Hiện tại input local; whitelist + regex chặt; comment giả định trong `parser.ts` |
| SVG export thiếu label do HTML overlay | Set `JXG.Options.text.display = 'internal'` ở MiniBoard và `render.ts` |
| Slider re-evaluate gây jank với nhiều function | Throttle 60fps; compile expression 1 lần khi expr thay đổi, không compile mỗi tick |
| Hàm có asymptote (vd `tan(x)`) curve nhảy đường | JSXGraph smart-handle mặc định; expose `recursionDepthLow/High` nếu cần |
| Mobile touch xung đột tool drag | Test kỹ; ưu tiên tool 'move' default, các tool khác phải bật explicit |

## 13. Quyết định nhỏ đã chốt trong design

- **Số function tối đa**: 8 (đủ palette unique).
- **Auto-name function**: `f, g, h, i, j, k, l, m`. User có thể override qua menu.
- **Slider mobile animation**: hold-to-play (touchstart → start, touchend → stop).
- **Color palette** (8 màu, light theme): `#2563eb #dc2626 #16a34a #9333ea #ea580c #0891b2 #db2777 #65a30d`. Dark theme: tăng độ sáng + giảm bão hoà tương tự `theme.ts` của geometry-2d.

## 14. Public API mới sau khi xong

```ts
// src/stamps/index.ts thêm:
export {
  graph2dStamp,
  type Graph2DCustomData,
  isGraph2DCustomData,
} from '../graph-2d';

// DEFAULT_STAMPS thêm graph2dStamp.
```

Consumer (Next.js app) không cần thay đổi gì — stamp tự xuất hiện trong toolbar.

## 15. Tham chiếu

- Pattern stamp hiện có: `src/stamps/geometry-2d/`
- Registry: `src/stamps/shared/registry.ts`
- Insert helper: `src/stamps/shared/insertImage.ts`
- Gotchas: `CLAUDE.md` (JSXGraph label internal mode, Excalidraw double-click crop intercept)
- Inspired by: GeoGebra Classic Graphing — https://www.geogebra.org/classic?lang=en
