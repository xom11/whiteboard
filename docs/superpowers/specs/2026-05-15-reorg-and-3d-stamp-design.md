# Reorg `src/stamp/` và thêm Geometry-3D stamp — Design Spec

**Ngày:** 2026-05-15
**Tác giả:** Claude (brainstorming pair)
**Trạng thái:** Draft — chờ user review
**Liên quan:** `2026-05-15-geometry-stamp-improvements-design.md`, registry Phase 2

---

## 1. Tóm tắt

Đề xuất chia làm 2 phase độc lập, mỗi phase 1 release:

- **Phase A — Reorganize (`0.5.0`):** đổi `src/stamp/` (số ít, naming "math stamp") → `src/stamps/` (registry-driven, neutral). Mỗi loại stamp 1 folder tự đóng gói. Tách `JSXGraphMiniBoard.tsx` 73KB thành file nhỏ. Public API đổi tên theo registry semantics, vẫn re-export alias `@deprecated`.
- **Phase B — Geometry-3D stamp (`0.6.0`):** thêm stamp 3D dùng JSXGraph 3D (đã có trong deps) cho hình học không gian lớp 11/12. Hành vi tĩnh giống 2D/LaTeX: editor → snapshot SVG → image element + customData chứa creation-log JSON để re-edit. Shortcut `D`.

Không thay đổi mô hình real-time sync, không thay đổi cơ chế persist sessionStorage, không introduce framework mới.

## 2. Bối cảnh

`@xom11/whiteboard` 0.4.0 đã có **registry-driven plugin system** sau Phase 2 (`src/stamp/registry/`): mỗi stamp khai báo `StampType` (kind, shortcutKey, Icon, Host, matchesCustomData). `DEFAULT_STAMPS = [geometryStamp, latexStamp]`. `ToolbarStampInjector`, `useStampShortcuts`, `Whiteboard.tsx` đều lặp qua registry.

Tuy nhiên:
- Folder gốc `src/stamp/` còn chứa nhiều file gốc trước Phase 2 (`GeometryEditorPanel.tsx`, `JSXGraphMiniBoard.tsx`, `StampLeftPanel.tsx`, `LatexEditorPopover.tsx`, `serializeBoard.ts`, ...). Không bị registry "biết tới" nhưng cũng không nhóm theo stamp.
- `JSXGraphMiniBoard.tsx` 73KB là điểm khó maintain.
- Public symbol mang naming `Math*` (`MathStampCustomData`, `isMathStamp`, `restoreMissingMathStampFiles`) — không phản ánh kiến trúc registry mới, gây nhầm lẫn khi sắp có Geometry-3D.

Cần stamp 3D cho hình học không gian lớp 11/12: điểm/đường/mặt/khối primitives, tĩnh khi insert (giống 2D), roundtrip edit qua creation-log JSON.

## 3. Mục tiêu / Phi mục tiêu

**Mục tiêu:**
- Folder layout by-feature, mỗi stamp tự đóng gói (editor, render, serialize, tests).
- Public API consistent với registry semantics; soft-break + alias deprecated.
- File source ≤ ~10KB sau khi tách `JSXGraphMiniBoard.tsx`.
- Geometry-3D stamp với toolset đủ cho hình học không gian lớp 11/12.
- Snapshot SVG (cùng pipeline 2D) khi commit, regenerate sau reload qua registry method.
- Bundle không tăng đáng kể (jsxgraph đã trong deps).

**Phi mục tiêu (YAGNI):**
- Live interactive 3D trong board (chỉ tĩnh).
- Surface plotting / function 2-variable / vector field (ngoài scope lớp 11/12 phổ thông).
- Animation timeline.
- Custom Excalidraw element (vẫn dùng image element).
- Migration tự động cho consumer cũ (cung cấp alias `@deprecated`, consumer tự đổi).

## 4. Phase A — Reorganize

### 4.1 Folder mapping

```
src/stamp/                          →  src/stamps/
  registry/index.ts                 →  shared/registry.ts
  registry/types.ts                 →  shared/types.ts
  registry/geometry.tsx             →  geometry-2d/index.tsx
  registry/latex.tsx                →  latex/index.tsx
  GeometryEditorPanel.tsx           →  geometry-2d/editor/EditorPanel.tsx
  JSXGraphMiniBoard.tsx (73KB)      →  geometry-2d/editor/MiniBoard.tsx       (core, ~20KB)
                                       geometry-2d/editor/tools.ts            (~20KB)
                                       geometry-2d/editor/handlers.ts         (~20KB)
                                       geometry-2d/editor/styles.ts           (~10KB)
  jsxgraph/tools.tsx                →  geometry-2d/editor/toolButtons.tsx
  StampLeftPanel.tsx                →  geometry-2d/editor/LeftPanel.tsx   (geometry phần)
                                       latex/editor/LeftPanel.tsx          (latex phần)
  PropertiesPopover.tsx             →  geometry-2d/editor/PropertiesPopover.tsx
  TransformParamPopover.tsx         →  geometry-2d/editor/TransformParamPopover.tsx
  geometryTheme.ts                  →  geometry-2d/editor/theme.ts
  serializeBoard.ts                 →  geometry-2d/serialize.ts
  renderGeometryFromState.ts        →  geometry-2d/render.ts
  renderGeometryToSvg.ts            →  geometry-2d/renderInline.ts
  transforms.ts                     →  geometry-2d/editor/transforms.ts
  LatexEditorPopover.tsx            →  latex/editor/EditorPopover.tsx
  renderLatexToSvg.ts               →  latex/render.ts
  svgToImageElement.ts              →  shared/svgToImage.ts
  excalidrawPalette.ts              →  shared/excalidrawPalette.ts
  stamp.css                         →  shared/stamp.css
  ToolbarStampInjector.tsx          →  shared/ToolbarInjector.tsx
  useStampShortcuts.ts              →  shared/useShortcuts.ts
  restoreMathStampFiles.ts          →  shared/restoreStampFiles.ts (registry-driven)
  types.ts (shim)                   →  DELETE
core/insertStampImage.ts            →  src/stamps/shared/insertImage.ts
```

`src/core/persistence/*` không đổi vị trí (nằm ngoài stamps).

### 4.2 Đổi tên public

| Cũ | Mới | Alias `@deprecated` trong 0.5.x |
|---|---|---|
| `isMathStamp` | `isStampElement` (đã có trong registry) | giữ alias trỏ vào tên mới |
| `MathStampCustomData` | `StampCustomData` | giữ type alias |
| `restoreMissingMathStampFiles` | `restoreMissingStampFiles` | giữ alias |
| `GeomBoardState` | `Geometry2DBoardState` | giữ alias |
| `LatexEditorPopover`, `LatexEditorHandle`, `GeometryEditorPanel`, `GeometryEditorPanelHandle`, `StampToolButtons`, `ToolbarStampInjector` | internal, **không** export trong `src/index.ts` mới | giữ re-export cho compat trong 0.5.x |
| `SerializedBoard` | `SerializedBoard2D` | giữ alias |

**Public API mới (`src/index.ts`):**

```ts
export { Whiteboard } from './Whiteboard';
export type { WhiteboardProps } from './Whiteboard';
export { pickSyncableAppState } from './serialize';
export {
  DEFAULT_STAMPS,
  findStampForCustomData,
  isStampElement,
  geometryStamp,
  latexStamp,
  // Phase B:
  // geometry3dStamp,
  type StampType,
  type BaseStampCustomData,
  type StampCustomData,
  type GeometryCustomData,
  type LatexCustomData,
  // Phase B:
  // type Geometry3DCustomData,
  isGeometryCustomData,
  isLatexCustomData,
  // Phase B:
  // isGeometry3DCustomData,
} from './stamps';
export type {
  ExcalidrawElement,
  NonDeletedExcalidrawElement,
  AppState,
  BinaryFiles,
  SyncableAppState,
  ExcalidrawSceneSnapshot,
} from './types';

// Aliases @deprecated — sẽ xoá trong 0.6.0
export {
  isStampElement as isMathStamp,
  type StampCustomData as MathStampCustomData,
} from './stamps';
export { restoreMissingStampFiles as restoreMissingMathStampFiles } from './stamps';
```

### 4.3 Registry-driven restore file

Mở rộng `StampType`:

```ts
interface StampType {
  // ...existing fields
  /**
   * Regenerate file SVG/PNG cho element thuộc stamp này khi reload.
   * Trả về { fileId, dataURL, mimeType } để thêm vào api.addFiles, hoặc null nếu skip.
   */
  restoreFileFromCustomData?: (element: ExcalidrawElement) => Promise<RestoredFile | null>;
}
```

`shared/restoreStampFiles.ts`:

```ts
export async function restoreMissingStampFiles(api, elements, stamps = DEFAULT_STAMPS) {
  for (const el of elements) {
    const stamp = findStampForCustomData(el.customData, stamps);
    if (!stamp?.restoreFileFromCustomData) continue;
    const file = await stamp.restoreFileFromCustomData(el);
    if (file) api.addFiles([file]);
  }
}
```

Geometry-2D, LaTeX, Geometry-3D đều plug vào method này.

### 4.4 Tách `MiniBoard.tsx`

Boundary đề xuất (file 73KB hiện gồm logic mixed):

- **`MiniBoard.tsx`** (~20KB): forwardRef + `MiniBoardHandle` API, board init/dispose, render container, subscribe state, theme handling. Public boundary giữ nguyên.
- **`tools.ts`** (~20KB): `GeomTool` enum, tool state machine, switch tool logic.
- **`handlers.ts`** (~20KB): pointerdown / pointermove / pointerup handlers cho từng tool (point, segment, polygon, transform...).
- **`styles.ts`** (~10KB): JSXGraph attributes (colors, sizes, labels, theme-aware).

Test hiện tại của miniboard chạy qua API public (`MiniBoardHandle`) → giữ unchanged, là regression net.

### 4.5 Test impact

- Move tests cùng file source, update import path.
- Thêm: `shared/__tests__/restoreStampFiles.test.ts` (registry-driven, mock 2 stamp).
- Thêm: `shared/__tests__/aliases.test.ts` (import từ alias `@deprecated` vẫn work).

## 5. Phase B — Geometry-3D stamp

### 5.1 Folder

```
src/stamps/geometry-3d/
  index.tsx                 # StampType + Host (forwardRef<StampHostHandle, StampHostProps>)
  editor/
    EditorPanel.tsx
    MiniBoard3D.tsx         # JSXGraph view3d wrapper, MiniBoard3DHandle
    LeftPanel.tsx
    toolButtons.tsx
    tools.ts                # GeomTool3D type
    handlers.ts
    theme.ts
  serialize.ts              # SerializedBoard3D, serialize/deserialize
  render.ts                 # renderGeometry3DSvgFromState (offscreen)
  __tests__/
    serialize.test.ts
    render.test.ts
    index.test.tsx
    MiniBoard3D.test.tsx
```

### 5.2 Custom data shape

```ts
export interface Geometry3DCustomData extends BaseStampCustomData {
  kind: 'geometry3d';
  version: 1;
  jsonState: string;          // JSON.stringify(SerializedBoard3D)
  svgWidth: number;
  svgHeight: number;
}

interface SerializedBoard3D {
  version: 1;
  bbox: [number, number, number, number];                        // 2D bbox của host board
  view: {
    azimuth: number;
    elevation: number;
    bbox3D: [number, number, number, number, number, number];   // [x0,y0,z0,x1,y1,z1]
  };
  showAxes: boolean;
  showMesh: boolean;
  elements: SerializedElement3D[];
}

interface SerializedElement3D {
  type:
    | 'point3d' | 'line3d' | 'segment3d' | 'plane3d'
    | 'polygon3d' | 'polyhedron3d' | 'sphere3d'
    | 'tetrahedron3d' | 'parallelepiped3d' | 'prism3d' | 'pyramid3d'
    | 'cone3d' | 'cylinder3d' | 'solidofrevolution3d' | 'text3d';
  parents: unknown[];     // tọa độ hoặc id placeholder của parent (ref bằng "@id:...")
  attributes: Record<string, unknown>;
  id: string;
  label?: string;
}

export function isGeometry3DCustomData(data: unknown): data is Geometry3DCustomData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Partial<Geometry3DCustomData>;
  return d.kind === 'geometry3d' && d.version === 1 && typeof d.jsonState === 'string';
}
```

### 5.3 Tool palette (left panel)

| Tool key | Tạo | Số bước input |
|---|---|---|
| `move` | chỉ chọn / xoay view3d | 0 |
| `point` | point3d (x,y,z) | 1 prompt tọa độ |
| `segment` | đoạn nối 2 point3d | chọn 2 điểm |
| `line` | đường thẳng qua 2 point3d | 2 |
| `plane` | mặt qua 3 point3d | 3 |
| `triangle` | polygon3d 3 đỉnh | 3 |
| `polygon` | polygon3d n đỉnh, close khi click trở lại điểm đầu | ≥3 |
| `tetrahedron` | template 4 đỉnh | 4 |
| `parallelepiped` | template hộp 8 đỉnh từ 1 đỉnh + 3 vector cạnh | 1 prompt origin + 3 vector |
| `prism` | đáy polygon + chiều cao | n đỉnh đáy + height prompt |
| `pyramid` | đáy polygon + đỉnh ngoài đáy | n + 1 |
| `sphere` | tâm + bán kính | 1 tâm + radius prompt |
| `cone` | tâm đáy + bán kính + đỉnh | 1 + radius + height |
| `cylinder` | tâm đáy + bán kính + chiều cao | 1 + radius + height |
| `solidofrevolution` | curve + trục | nhập f(t) + trục |
| `label` | text3d gắn vào point | 1 + textbox |

Toggle: **Axes**, **Mesh**, **Reset view** (set azimuth=0.7, elevation=0.4 mặc định).

### 5.4 Host component

Đối xứng `GeometryStampHost` 2D:

```ts
const Geometry3DStampHost = forwardRef<StampHostHandle, StampHostProps>(
  function Geometry3DStampHost({ api, editingElement, onClose, isDark }, ref) {
    const editorRef = useRef<Geometry3DEditorHandle | null>(null);
    const initial = useMemo(() => parseInitialState(editingElement), [editingElement]);
    const [boardState, setBoardState] = useState<GeomBoard3DState>(INITIAL_3D_STATE);

    const handleInsert = useCallback(async (jsonState, svgString, w, h) => {
      if (!api) return;
      await insertStampImage(api, {
        svgString,
        makeCustomData: () => ({ kind: 'geometry3d', version: 1, jsonState, svgWidth: w, svgHeight: h }),
        editingElementId: editingElement?.id ?? null,
      });
      onClose();
    }, [api, editingElement, onClose]);

    useImperativeHandle(ref, () => ({
      tryInsert: () => editorRef.current?.tryInsert() ?? false,
      hasContent: () => editorRef.current?.hasContent() ?? false,
    }), []);

    return (
      <>
        <Geometry3DLeftPanel
          api={api}
          tool={boardState.tool}
          onSetTool={(t) => editorRef.current?.setTool(t)}
          showAxes={boardState.showAxes}
          onToggleAxes={(b) => editorRef.current?.setShowAxes(b)}
          showMesh={boardState.showMesh}
          onToggleMesh={(b) => editorRef.current?.setShowMesh(b)}
          canUndo={boardState.canUndo}
          onUndo={() => editorRef.current?.undo()}
          onResetView={() => editorRef.current?.resetView()}
        />
        <Geometry3DEditorPanel
          ref={editorRef}
          initial={initial}
          isDark={isDark}
          onStateChange={setBoardState}
          onInsert={handleInsert}
          onClose={onClose}
        />
      </>
    );
  },
);
```

### 5.5 StampType definition

```ts
export const geometry3dStamp: StampType = {
  kind: 'geometry3d',
  shortcutKey: 'd',
  Icon: <Geometry3DIcon />,
  toolbarTitle: 'Hình 3D (D)',
  Host: Geometry3DStampHost,
  matchesCustomData: isGeometry3DCustomData,
  restoreFileFromCustomData: async (element) => {
    const data = element.customData as Geometry3DCustomData;
    const { svgString } = await renderGeometry3DSvgFromState(data.jsonState);
    const dataURL = svgStringToDataURL(svgString);
    return { fileId: element.fileId!, dataURL, mimeType: 'image/svg+xml' };
  },
};
```

### 5.6 Render & snapshot pipeline

**Commit flow (editor → board):**

1. `tryInsert()` gọi `MiniBoard3D.getCreationLog()` → `SerializedElement3D[]`.
2. `MiniBoard3D.getViewState()` → `{ azimuth, elevation, bbox3D, showAxes, showMesh }`.
3. `MiniBoard3D.snapshotSVG()`: clone `<svg>` của board JSXGraph (renderer SVG mặc định). Inline computed styles cho cross-context render.
4. Compose `SerializedBoard3D` → `JSON.stringify` → `jsonState`.
5. `handleInsert(jsonState, svgString, w, h)` → `insertStampImage`.

**Offscreen render (`render.ts`):**

```ts
export async function renderGeometry3DSvgFromState(
  jsonState: string,
): Promise<{ svgString: string; width: number; height: number }> {
  const state: SerializedBoard3D = JSON.parse(jsonState);
  const div = document.createElement('div');
  div.style.cssText = 'position:absolute;left:-9999px;width:1024px;height:768px;';
  document.body.appendChild(div);
  try {
    JXG.Options.text.display = 'internal';  // labels phải nằm trong SVG
    const board = JXG.JSXGraph.initBoard(div, {
      boundingbox: state.bbox,
      axis: false,
      renderer: 'svg',
      showCopyright: false,
      showNavigation: false,
    });
    const view = board.create('view3d',
      [[-6, -3], [8, 8], state.view.bbox3D],
      { az: state.view.azimuth, el: state.view.elevation, projection: 'central' }
    );
    if (!state.showAxes) view.defaultAxes = [];
    if (!state.showMesh) view.mesh3d.setAttribute({ visible: false });

    const idMap = new Map<string, any>();
    for (const e of state.elements) {
      const parents = e.parents.map((p) =>
        typeof p === 'string' && p.startsWith('@id:') ? idMap.get(p.slice(4)) : p
      );
      const obj = view.create(e.type, parents, { ...e.attributes, id: e.id, name: e.label });
      idMap.set(e.id, obj);
    }

    const svg = div.querySelector('svg')!.cloneNode(true) as SVGElement;
    JXG.JSXGraph.freeBoard(board);
    return { svgString: new XMLSerializer().serializeToString(svg), width: 1024, height: 768 };
  } finally {
    document.body.removeChild(div);
  }
}
```

**Tại sao SVG (không PNG):**

JSXGraph 3D project xuống 2D rồi render qua SVGRenderer như 2D mode. Scope tool đã chốt (no surface fills, no mesh, no parametric surface) đảm bảo output là vector primitive. **Spike**: trong PR Phase B đầu tiên cần xác nhận export SVG thật sự đúng với `polyhedron3d`, `sphere3d`, `solidofrevolution3d` (3 case có fill). Nếu fail → fallback: render canvas → `toDataURL('image/png')` → embed vào `<svg><image href=... /></svg>` wrapper. Spec sẽ cập nhật theo kết quả spike.

### 5.7 Shortcut

`D`, capture phase + stopPropagation (giống `G`/`L`). `useShortcuts.ts` lặp registry — không sửa hook, chỉ thêm vào `DEFAULT_STAMPS`. Verify Excalidraw không bind `D` (đã check: 1-9 + R/O/A/L/T/I/P/H/E/V đã được dùng; D free).

### 5.8 Persistence

Không thêm cơ chế mới:

- **sessionStorage** snapshot elements + appState; file binary của stamp được skip (regenerate).
- **Reload:** `restoreMissingStampFiles` registry-driven → Geometry-3D plug vào qua `stamp.restoreFileFromCustomData` (xem 5.5).
- **Real-time sync:** image element bình thường, customData serialize cùng.
- **Roundtrip edit:** `Whiteboard.tsx` `findStampForCustomData(el.customData)` tự pick `geometry3dStamp` khi double-click.

## 6. Migration plan & release

| Step | Branch | Output | Version |
|---|---|---|---|
| 1 | `refactor/stamps-folder-layout` | move files theo §4.1, rename public theo §4.2, alias deprecated, test pass. Phase A commit 1. | preview |
| 2 | `refactor/jsxgraph-miniboard-split` | tách `MiniBoard.tsx` theo §4.4. Phase A commit 2. | `0.5.0` release |
| 3 | `feature/geometry-3d-stamp-spike` | spike: kiểm tra SVG export với polyhedron3d/sphere3d. Cập nhật spec nếu cần fallback PNG. | preview |
| 4 | `feature/geometry-3d-stamp` | implement folder theo §5, đăng ký vào `DEFAULT_STAMPS`. Test full. | `0.6.0-rc.N` iterations |
| 5 | `release/0.6.0` | drop alias `@deprecated`, public API final. | `0.6.0` |

**Consumer migration:**
- `0.5.x`: code cũ vẫn build (alias). Bật warning trong dev qua JSDoc `@deprecated`.
- `0.6.0`: consumer phải đổi import. Provide `CHANGELOG.md` với sed-mapping table.

## 7. Risk & mitigation

| Risk | Tác động | Mitigation |
|---|---|---|
| JSXGraph 3D SVG export không cover `polyhedron3d`/`sphere3d` đúng | Snapshot khi insert thiếu fill / hỏng nét khuất | Spike PR (step 3) sớm. Nếu fail → fallback PNG dataURL embed trong SVG wrapper. Cập nhật spec + escalate trước khi tiếp tục. |
| Tách `MiniBoard.tsx` vỡ tool state | Geometry-2D regressions | Test suite hiện tại bao via `MiniBoardHandle` public API. Tách giữ nguyên export. Chạy full test sau mỗi commit. |
| `restoreFileFromCustomData` không khả dụng trong jsdom (jsxgraph cần DOM thật) | Reload + test render fail | Test render qua `@testing-library` browser env hoặc mock view3d. Production chạy trong real DOM nên OK. |
| Tool palette quá dày (15+ tools) | UX confusing | Group theo 3 hàng: "Primitive" (point, segment, line, plane, polygon), "Solid" (tetrahedron, parallelepiped, prism, pyramid), "Curved" (sphere, cone, cylinder, solidofrevolution). Label, Move ngoài group. |
| Versioning alias gây churn | Consumer khó chịu | Document rõ trong CHANGELOG. Alias sống 1 minor (0.5.x), drop ở 0.6.0. |

## 8. Test plan

### Phase A
- Move existing tests; cập nhật import. Toàn bộ test pass nguyên trạng.
- `src/stamps/shared/__tests__/restoreStampFiles.test.ts`: registry-driven (mock 2 stamps, verify gọi đúng `restoreFileFromCustomData`).
- `src/stamps/shared/__tests__/aliases.test.ts`: import từ alias `@deprecated` resolve về symbol mới.
- `src/stamps/geometry-2d/editor/__tests__/MiniBoard.test.tsx`: tool switch, undo, transform — phải pass cả trước & sau tách.

### Phase B
- `geometry-3d/__tests__/serialize.test.ts`: roundtrip creation log với mọi tool type; idMap reference giữ nguyên.
- `geometry-3d/__tests__/render.test.ts`: render offscreen sinh `<svg>` chứa expected element count, view azimuth/elevation đúng.
- `geometry-3d/__tests__/index.test.tsx`: Host mount (create vs re-edit), `tryInsert` → `insertStampImage` được gọi với customData đúng shape.
- `geometry-3d/__tests__/MiniBoard3D.test.tsx`: tool state machine, undo, reset view, subscribe.
- `Whiteboard.test.tsx`: bấm `D` mở editor; click outside → image element xuất hiện với `customData.kind === 'geometry3d'`.
- Smoke test reload: snapshot scene chứa geometry3d → reload → `restoreMissingStampFiles` regenerate file.

## 9. Open questions

Không. Spec không có `TBD`. Spike SVG export là risk được rang động theo plan, không phải open question.

## 10. Out-of-scope follow-ups

- Live interactive 3D trong board (nếu sau này cần).
- Geometry-3D import/export sang format ngoài (GeoGebra, STL).
- Animation timeline cho transform 3D.
- Surface plot (z = f(x,y)) — có thể là stamp `function-3d` riêng nếu sau này có nhu cầu giải tích.
