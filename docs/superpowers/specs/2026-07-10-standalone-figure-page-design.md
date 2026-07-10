# Trang standalone "dán đề → ra hình" (Mức 1) — Design

**Ngày:** 2026-07-10
**Trạng thái:** Đã chốt, sẵn sàng lập kế hoạch
**Phạm vi repo:** `whiteboard` (thư viện). Trang thật nằm ở repo `hoctotbachkhoa` — ngoài phạm vi thực thi của spec này, nhưng hợp đồng API được định nghĩa ở đây.

---

## 1. Bối cảnh và mục tiêu

Whiteboard hiện là component Excalidraw + stamp hình học, dùng trong lớp học hoctotbachkhoa. Bên trong nó có một tài sản chưa được khai thác cho mục đích thu hút người dùng: **rule engine dựng hình deterministic từ đề bài tiếng Việt** (`ai/rules/`, 108/118 đề vào-10 có hình, 46 đề dựng đầy đủ).

Mục tiêu Mức 1: mở đúng API để hoctotbachkhoa dựng được một trang public "dán đề → ra hình", chạy hoàn toàn client-side, không backend, không đăng nhập.

**Định vị sản phẩm (quan trọng):** trang này KHÔNG được đóng khung là "công cụ vẽ hình 2D" — sân đó thuộc về GeoGebra/Desmos và không có lý do để người dùng đổi. Nó được đóng khung là "dán đề, ra hình ngay". Đó là thứ đối thủ không có.

**Lợi thế cấu trúc:** pipeline 2D là DETERMINISTIC-ONLY, không có LLM (`ai/buildFigureIntent.ts:3-8,112` — miss trả `deterministic_miss`, KHÔNG fallback). Trong `package.json` không có dependency AI provider nào. LLM (nếu có) do consumer tiêm qua prop `generateGeometryFigure` (`shared/types.ts:35-41`). Trang public đơn giản **không tiêm prop đó** ⇒ chi phí biên bằng 0 ở mọi mức traffic. Không cần gate, không cần rate-limit, không có hoá đơn.

## 2. Quyết định đã chốt

| Câu hỏi | Quyết định |
|---|---|
| Trang sống ở repo nào | `hoctotbachkhoa`, consume npm `@xom11/whiteboard` |
| Giao diện lúc mới vào | Tối giản trước (ô dán đề + nút), editor mở theo yêu cầu |
| "Mở trong bảng trắng" | sessionStorage + điều hướng nội bộ |
| Khi rule engine miss | Vẽ phần làm được + nói rõ phần thiếu |
| OCR ảnh đề | KHÔNG ở Mức 1 (để Mức 2) |
| Phương án kiến trúc | A — thư viện export `GeometryStudio`, consumer giữ lớp vỏ |

**Nguyên tắc chi phối phương án A:** *thứ gì thay đổi nhanh thì đặt ở nơi deploy nhanh.* Copy quảng cáo và bố cục landing đổi hàng ngày theo số liệu chuyển đổi; khung editor và rule engine đổi hàng tháng. Nếu nhét lớp vỏ vào npm package, mỗi lần sửa một dòng tiêu đề phải chạy `gh workflow run release.yml` → chờ publish → chờ Renovate → chờ CI. Vòng lặp tính bằng giờ cho việc đáng lẽ tính bằng giây.

## 3. Kiến trúc — đường cắt

### 3.1 Sự thật nền (đã kiểm chứng)

- Toàn bộ `src/stamps/geometry-2d/**` và `src/core/scene/**` có **0 import runtime** từ Excalidraw. Excalidraw chỉ nạp thật ở `Whiteboard.tsx`, `ExcalidrawWithMenus.tsx`, `hooks/useScenePersist.ts:205`.
- `shared/insertImage.ts:2` chỉ import `ExcalidrawElement` **type-only** (bị xoá lúc compile).
- `StampHostProps.editingElement` là type cấu trúc `{ id, customData }`, không phải type Excalidraw (`shared/types.ts:67-72`). `api: any`.
- Subpath `@xom11/whiteboard/geometry-2d` và `/ai` **đã tồn tại** trong `package.json` + `tsup.config.ts`.
- `host.tsx` = 166 dòng, chạm `api` đúng 3 chỗ: guard (`:73`), `insertStampImage` (`:75`), truyền xuống EditorPanel (`:160`).
- `AiFigurePrompt` (ô dán đề) đã nằm sẵn trong `EditorPanel`, nhận prop `generateGeometryFigure`.
- `AiFigureUiResult` đã có `partial?: { message: string }` — to-do list tiếng Việt cho phần chưa dựng được (`shared/types.ts:6-17`).

### 3.2 Tách `host.tsx`

**`GeometryStudio`** (mới, generic) — giữ nguyên toàn bộ điều phối hiện có: `useStampStore`, state `selectedTool`/`showAxis`/`showGrid`, undo/redo, `useChordShortcut`, `StampLeftPanel`, `GeometryEditorPanel`.

Thay đổi duy nhất: `handleInsert` gọi prop `onCommit(jsonState, svgString)` thay vì `insertStampImage(api, …)`. Prop `api` thành optional — chỉ còn dùng để truyền xuống `EditorPanel` cho draft viewport, đúng vai trò thật của nó.

**`GeometryStampHost`** (giữ tên) — co lại thành wrapper ~20 dòng, truyền `onCommit = insertStampImage(...)`. Hành vi cũ KHÔNG đổi.

### 3.3 Dọn dẹp kèm theo

`useStampStore(domain, editingElement, parseInitial)` thực ra chỉ đọc `editingElement?.customData` rồi gọi `parseInitial` (`shared/useStampStore.ts:31-36`). Hạ nó xuống một tham số **thunk lười**:

```ts
useStampStore(domain: StampDomain, makeInitialState?: () => State | null): Store
```

Việc parse `customData` đẩy về phía caller — mỗi stamp vốn đã có `parseInitialState` riêng. Nhờ vậy `GeometryStudio` seed store từ `initialJsonState` qua `deserializeBoard` mà không phải bịa một `editingElement` giả, còn `GeometryStampHost` tự gọi `parseInitialState(editingElement.customData)`.

**Phải là thunk, không phải `initialState: State | null`.** Truyền giá trị thẳng sẽ khiến `deserializeBoard`/`parseInitialState` chạy lại mỗi lần render, trong khi bản hiện tại chỉ chạy đúng một lần (nằm trong `if (!ref.current)`). Thunk giữ nguyên tính lười đó. Test hiện có `parseInitial only called once` (`shared/__tests__/useStampStore.test.tsx:73-81`) chính là bất biến này, và nó phải sống tiếp dưới tên mới.

Ba host (2d, 3d, graph-2d) mỗi chỗ sửa một dòng. Đây là cải thiện đúng chỗ đang mổ, không phải refactor lan man.

## 4. Bề mặt export

### 4.0 Vì sao PHẢI là subpath riêng, không phải `./geometry-2d`

`src/index.ts` → `stamps/index.ts` → `geometry-2d/index.tsx`. Trong đó `Host` được bọc `React.lazy` (`geometry-2d/index.tsx:17-19`) chính là để editor KHÔNG vào bundle gốc.

Nếu thêm `export { GeometryStudio }` vào `geometry-2d/index.tsx`, nó thành import tĩnh ⇒ mọi consumer của `<Whiteboard>` eager-bundle cả editor. Tree-shaking có thể cứu, nhưng phụ thuộc `sideEffects` (hiện khai `src/core/scene/kinds/**`) — quá mong manh để dựa vào.

⇒ **Entry mới, tách bạch.** `tsup.config.ts` thêm `studio: 'src/stamps/geometry-2d/studio/index.ts'`; `package.json` thêm `"./studio"`.

### 4.1 `@xom11/whiteboard/studio` (mới)

```ts
export { GeometryStudio, type GeometryStudioProps }
export { renderGeometrySvgFromState }        // re-export (render.ts:99)
export { geometryStateToJsonState }          // mới: State → jsonState
```

```ts
interface GeometryStudioProps {
  /** Seed store lúc mount. Vắng = board trống. */
  initialJsonState?: string;
  /** Thay cho insertStampImage. Editor gọi khi user bấm "Chèn". */
  onCommit: (jsonState: string, svgString: string) => void | Promise<void>;
  onClose: () => void;
  isDark?: boolean;
  /** Chỉ để EditorPanel đọc viewport khi dựng draft. Vắng = bỏ qua draft. */
  api?: unknown;
  generateGeometryFigure?: GenerateGeometryFigure;
  onGeometryDraft?: (draft: GeometryDraftPreview | null) => void;
}
```

Ref vẫn expose `StampHostHandle` (`tryInsert` / `hasContent`) — `GeometryStampHost` cần nó cho auto-commit khi click ra ngoài.

`geometryStateToJsonState(state: State): string` — bọc `serializeBoard(state, view)`, vì `serializeBoard` cần thêm `View2D` (`serialize.ts:10`) mà trang không có sẵn. Lấy view từ `state.meta.view` khi `domain === '2d'`, else `DEFAULT_VIEW_2D`.

### 4.2 Root `@xom11/whiteboard` (thêm 1)

```ts
export { insertGeometryStampIntoScene }   // mới
```

Đặt ở root vì nơi dùng là trang `/whiteboard`, vốn đã import `<Whiteboard>` từ root. `insertStampImage` hiện KHÔNG nằm trong public API. Helper render SVG rồi gọi `insertStampImage`, ~10 dòng.

### 4.3 Engine

`@xom11/whiteboard/ai` — `handleGenerateFigure` đã export sẵn, chữ ký khớp prop `generateGeometryFigure`.

Type `AiFigureUiResult` import từ root cũng an toàn: `import type` bị xoá lúc compile, không kéo Excalidraw vào bundle.

### 4.4 Hai quyết định về ranh giới

1. **Thư viện chỉ xuất SVG.** Chuyển SVG → PNG (canvas + `toBlob`, ~15 dòng) đặt ở consumer, vì jsdom không có `canvas.toBlob` nên test trong repo này vô nghĩa.
2. **Trang landing KHÔNG mount editor lúc tải trang.** Nó gọi `handleGenerateFigure` rồi `renderGeometrySvgFromState` để hiện hình tĩnh; chỉ mount `GeometryStudio` khi người dùng bấm "Sửa hình".

## 5. Luồng dữ liệu của trang (hợp đồng cho consumer)

Máy trạng thái bốn nhịp: `idle → generating → (figure | error)`, và `figure → editing`.

**idle** — ô dán đề + nút "Dựng hình".

**generating** — gọi `handleGenerateFigure({ problem })`.

**figure** — có `state` trong tay:
```ts
const jsonState = geometryStateToJsonState(state);
const svg = await renderGeometrySvgFromState(jsonState);
```
Không mount editor. Ba nút đều xuất phát từ hai giá trị này:
- "Tải SVG" → ghi thẳng chuỗi SVG
- "Tải PNG" → vẽ SVG lên canvas → `toBlob`
- "Mở trong bảng trắng" → sessionStorage + điều hướng

**editing** — mount `GeometryStudio` với `onCommit = (jsonState, svg) => tải ảnh về`, `api` để trống. (Nút "Chèn" trong editor cần có nghĩa hợp lý ngoài ngữ cảnh Excalidraw.)

### 5.1 Handoff qua sessionStorage

- Khoá có version: `htbk:figure-handoff:v1`
- Giá trị: `{ jsonState, ts }`
- `/whiteboard` đọc **đúng một lần** lúc mount, **xoá khoá ngay sau khi đọc**, rồi gọi `insertGeometryStampIntoScene(api, jsonState)`
- **Bỏ qua bản ghi cũ hơn 5 phút** — để một tab bỏ quên từ hôm trước không bất ngờ chèn hình vào bảng đang dạy
- Bọc `try/catch` quanh `setItem`: sessionStorage đầy sẽ ném lỗi → báo người dùng tải ảnh về thay thế

## 6. Xử lý lỗi và miss

Ba nhánh, ánh xạ thẳng từ `AiFigureUiResult`:

| Kết quả | Hành vi |
|---|---|
| `ok: true`, không `partial` | Hiện hình + 3 nút hành động |
| `ok: true`, có `partial` | Hiện hình + banner dùng **nguyên văn** `partial.message`. Nút chính = "Sửa hình", KHÔNG phải "Tải ảnh" |
| `ok: false` | Hiện `message`, giữ nguyên đề trong textarea, mời "Tự vẽ trong editor" |

**Không tự chế lại thông điệp `partial.message`** — rule engine đã sinh sẵn to-do list tiếng Việt.

**Nguyên tắc:** hình-sai-âm-thầm nguy hiểm hơn không-có-hình. Học sinh vẽ theo hình thiếu rồi làm sai bài sẽ không quay lại.

## 7. Telemetry — đóng vòng phản hồi

`handleGenerateFigure` nhận `onResult(result, attempt)` → trả `IntentGenerateResult` đầy đủ trước khi map (`handleGenerateFigure.ts:26-33`).

Móc analytics vào đó, log `reason` (`deterministic_miss` / `transpile_error` / `builder_error`) kèm **nguyên văn đề**. Đề toán gần như không chứa thông tin cá nhân, và không có kho đề-thật-bị-miss này thì không biết vá rule nào tiếp theo. Đây là dữ liệu có giá trị nhất mà trang sinh ra.

## 8. Rủi ro đã biết

### 8.1 Rule engine chạy đồng bộ trên main thread

CPU thuần, 21 rule + các gate coverage. Đề dài có thể làm khựng giao diện. Mức 1 phải **đo p95** thời gian `handleGenerateFigure` trên chính 118 đề trong `docs/datasets/tong-hop-hinh-phang-vao10-2018-2019.txt`. Nếu vượt ~100ms → đẩy sang Web Worker ở Mức 2. **Chỉ làm khi số đo bảo phải làm**, không tối ưu trước.

### 8.2 `dist/ai.mjs` nặng 490KB (đo baseline 2026-07-10, chưa minify)

Barrel `ai/index.ts` xuất cả `envelope`, `intent`, `buildIntentSystemPrompt` (chuỗi prompt dài), `verify`, `vision`. Trang landing chỉ cần `handleGenerateFigure`.

Tree-shaking của Next.js *có thể* cắt phần thừa, nhưng zod schema và prompt string dễ bị giữ lại. **Việc cần làm ở Mức 1: đo kích thước gzip của route sau `next build`.** Nếu phần AI vượt ~100KB gzip, thêm entry gọn `@xom11/whiteboard/ai/figure` chỉ export `handleGenerateFigure` + type. Đo trước, tách sau.

Đối chiếu baseline cùng lúc: `dist/geometry-2d.mjs` = 459 byte, `dist/index.mjs` = 69KB.

## 9. Test và tiêu chí xong

**Lưới an toàn cho refactor:** `geometry-2d/__tests__/Host.chord.test.tsx` và `__tests__/integration/re-edit-2d.test.tsx` phải xanh **không sửa một dòng nào**. Phải sửa chúng ⇒ đường cắt sai ⇒ dừng lại, không phải cái cớ để sửa test.

**Test mới:**
1. `GeometryStudio` — `onCommit` được gọi đúng `(jsonState, svgString)`; thiếu `api` không vỡ.
2. Roundtrip `geometryStateToJsonState` → `deserializeBoard` trả lại cùng `State`.
3. `insertGeometryStampIntoScene` với `api` giả — kiểm `addFiles` + `updateScene` được gọi.
4. **Cổng bundle (CI)** — hai khẳng định, baseline đã đo ngày 2026-07-10:
   - `dist/studio.mjs` KHÔNG chứa chuỗi `@excalidraw`. Ngăn ai đó sáu tháng nữa vô tình nhét Excalidraw vào trang landing.
   - `dist/geometry-2d.mjs` giữ nguyên trạng thái shim mỏng (hiện 459 byte, không `@excalidraw`, không `jsxgraph`). Ngăn chiều ngược lại: một export tĩnh làm editor rơi vào bundle gốc của mọi consumer `<Whiteboard>`.

**Xong Mức 1 =** `npm run typecheck` xanh + `npm test` xanh + cổng bundle xanh + một trang thật trong hoctotbachkhoa dán được đề → ra hình → tải được PNG → mở được sang bảng trắng.

## 10. Không làm ở Mức 1

OCR ảnh đề, LLM fallback, chia sẻ hình qua link (encode URL), lưu DB, đăng nhập, 118 trang SEO programmatic, chuyển PNG trong thư viện, hình học 3D.

Tất cả nằm ở Mức 2 hoặc xa hơn.

---

## Phụ lục — dẫn chứng mã nguồn

| Khẳng định | Nguồn |
|---|---|
| Pipeline 2D deterministic-only, không LLM | `src/stamps/geometry-2d/ai/buildFigureIntent.ts:3-8,112` |
| `partial.message` đã tồn tại | `src/stamps/shared/types.ts:6-17` |
| `insertImage` chỉ import type-only | `src/stamps/shared/insertImage.ts:2` |
| `StampHostProps` không dùng type Excalidraw | `src/stamps/shared/types.ts:67-72` |
| `host.tsx` chạm `api` 3 chỗ | `src/stamps/geometry-2d/host.tsx:73,75,160` |
| `useStampStore` chỉ đọc `customData`, parse lười 1 lần | `src/stamps/shared/useStampStore.ts:31-36` |
| Bất biến "parseInitial chỉ gọi 1 lần" | `src/stamps/shared/__tests__/useStampStore.test.tsx:73-81` |
| `serializeBoard` cần `View2D` | `src/stamps/geometry-2d/serialize.ts:10` |
| `renderGeometrySvgFromState` nhận `jsonState` | `src/stamps/geometry-2d/render.ts:99` |
| Subpath export đã có | `package.json` `exports`, `tsup.config.ts` `entry` |
| Excalidraw runtime chỉ ở 3 file | `Whiteboard.tsx:27`, `ExcalidrawWithMenus.tsx:14`, `hooks/useScenePersist.ts:205` |
| `Host` được `React.lazy` để tách chunk | `src/stamps/geometry-2d/index.tsx:17` |
| Baseline bundle (build 2026-07-10) | `dist/geometry-2d.mjs` 459B sạch; `dist/index.mjs` 69KB; `dist/ai.mjs` 490KB |
