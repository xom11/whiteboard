# Changelog

## Chưa phát hành

### Thu gọn panel thuộc tính

Panel thuộc tính bên trái của Excalidraw (Nét vẽ / Nền / Độ dày / Độ mờ / Lớp)
giờ có nút thu gọn ở góc trên-phải. Bấm một lần, panel co lại thành một tab nhỏ,
trả diện tích cho bảng; bấm lại để mở. Trạng thái không lưu — vào lại bảng là panel
hiện như cũ. Undo/redo, thanh công cụ và zoom giữ nguyên (khác với zen mode `Alt+Z`
của Excalidraw — chế độ đó ẩn luôn undo/redo).

Chỉ áp dụng cho desktop; bản mobile dùng bottom sheet nên không chiếm diện tích ngang.

---

## v0.31.0 — 2026-06-17

Massive AI rule engine expansion + dataset coverage.

This release focuses on significantly increasing the coverage and accuracy of the AI geometry rule engine, enabling the platform to understand and draw a much wider variety of complex geometry problems from various Vietnamese datasets.

### AI Rule Engine Expansion
- **New Geometry Rules**: Added and expanded dozens of rules covering:
  - Complex intersections (`intersection`, `CAT_ONE_TWO`, `twoPerpLinesMeet`, etc.).
  - Advanced circle constructs (`twoCirclesMeet`, `circleExternalPoint`, `diameterCircleCutsSides`, `incircleTangency`, `circumcirclePairMeet`).
  - Line and segment properties (`onSegment BETWEEN`, `oppositeRayPoint`, `parallelSidePoints`).
  - Tangents and perpendiculars (`tangentAt TWO_MEET`, `perpFoot SHARED_FROM_TWO`, `perpNamedLine`).
- **Improved Normalization**: Enhanced OCR-glue splitting for Vietnamese geometry vocabulary and label normalization (handling primes like $A'$, $B'$, etc.).
- **Engine Optimization**: Implemented topo-retry logic for intent ordering and moved `RefSpec` validation to a registry-driven approach.

### Datasets & Evaluation
- **Expanded Coverage**: Integrated and evaluated several new datasets including `vao10` (268 problems), `httcd` (255 problems), `mohinh` (39 problems), `julielltv` (29 Olympiad problems), and `hinh-phang-chuyen-2026` (25 specialized problems).
- **Improved Diagnostics**: Enhanced diagnostic scripts and introduced `dbg-bai.ts` for granular problem debugging.

### UI & Core
- **Label Dragging**: Points, lines, segments, and circles now support draggable labels with persistence across sessions and undo/redo support.
- **Editor Improvements**: Better auto-fit behavior when re-editing stamps and improved halo highlighting for various geometry elements.

---

## v0.18.0 — 2026-05-21

Tier B½ — stamp catalog + contract test + add-stamp howto. (closes #29)

Cho phép fork repo + viết stamp mới mà không lo break contract; consumer build admin UI / picker chọn stamp từ manifest.

### New public API

- **`STAMP_CATALOG`** + **`findCatalogEntry(id)`** + type `StampCatalogEntry` (re-export từ `@xom11/whiteboard` + `@xom11/whiteboard/...` subpaths). Mỗi entry: `{ id, title, version, experimental, runtimeDeps, bundleSize: { js, css } }` — bundle size đo gzip transitive (entry + chunks + lazy host).
  ```tsx
  import { STAMP_CATALOG, findCatalogEntry } from '@xom11/whiteboard';
  STAMP_CATALOG.forEach((e) => console.log(e.id, e.bundleSize.js + 'KB'));
  ```
  Bundle size lần đo này (gzip KB): geometry 43.19, latex 9.47, geometry3d 38.26, graph2d 25.90.

### Test infrastructure

- **`runStampContract(stamp, fixture)`** — generic contract suite ở `src/stamps/shared/__tests__/stamp-contract.ts`. Cover metadata, `matchesCustomData` (true/false/null/edge), `renderSvgFromCustomData` (SVG prefix + throws on foreign), Host shape, roundtrip qua `restoreFileFromCustomData`. 4 stamp hiện tại đăng ký fixture riêng → +84 tests đảm bảo public contract không silent break.

### Build pipeline

- **`scripts/build-catalog.mjs`** chạy postbuild — BFS từ `dist/{slug}.mjs` qua mọi `import './chunk-*.mjs'` (static + dynamic), gzip transitive, patch placeholder trong dist, ghi `dist/catalog.json` cho consumer fetch runtime.
- Script `npm run build:catalog` cho regen độc lập sau khi đã có `dist/`.

### Docs + DX

- **[`docs/superpowers/specs/add-new-stamp-howto.md`](docs/superpowers/specs/add-new-stamp-howto.md)** — 6 bước có lệnh cụ thể, link tới contract suite + catalog + build script. Target ≤30 phút từ copy template → stamp mới pass contract.
- **[`examples/stamp-template/`](examples/stamp-template/)** — skeleton "color-swatch" stamp (5 file: index.tsx, host.tsx, types.ts, render.ts, contract.test.ts + README). Pass full contract suite (21 tests) ngay khi copy.
- README.md mục "Extending — thêm stamp mới" link howto + template + catalog usage.

### Tests

- 802 tests pass (687 → 802; +84 contract + 10 catalog + 21 template).
- Mock jsxgraph nới: `initBoard` nhận cả `containerId` (string) lẫn DOM element (geometry-3d test path).

---

## v0.17.0 — 2026-05-21

Tier B refactor — Editor hook generalization + thu gọn 2 file lớn nhất + generic StampType. (closes #30)

### Breaking changes
- **Public API loại 4 type guard**: `isGeometryCustomData`, `isLatexCustomData`, `isGeometry3DCustomData`, `isGraph2DCustomData` KHÔNG còn export từ `@xom11/whiteboard`. Migration:
  - Trước: `import { isGeometryCustomData } from '@xom11/whiteboard';`
  - Sau: `import { geometryStamp } from '@xom11/whiteboard';` rồi dùng `geometryStamp.matchesCustomData(data)` — TypeScript narrow `data` sang `GeometryCustomData` tự động qua type guard. (Tương tự cho 3 stamp còn lại.)
- Các `*CustomData` *type* (vd `GeometryCustomData`) vẫn được export — không đổi.

### Refactor
- **`StampType<TCustomData>` generic** (`src/stamps/shared/types.ts`): `matchesCustomData(data: unknown): data is TCustomData` + `renderSvgFromCustomData(data: TCustomData): Promise<string>`. Mỗi stamp typed `StampType<XxxCustomData>`. `findStampForCustomData` giữ signature default `StampType<BaseStampCustomData>` — method shorthand bivariance cho phép `ReadonlyArray<StampType>` chứa concrete generic stamps.
- **`Whiteboard.tsx` 593 → 309 LoC**: tách `useScenePersist` (~335 LoC) ra `src/hooks/`. Hook bundle: effectiveInitialScene precedence + onSceneTick (3 throttle: scene 200ms / file 1s / prune 2s) + 3 mount effect (initialFiles / IDB raster / restoreMissingStampFiles) + unmount flush. `Whiteboard` còn giữ: theme sync + crop intercept (re-edit dispatch) + UI render.
- **3D `EditorPanel.tsx` 477 → 243 LoC**: tách `usePointDrag` (point-drag handlers + 4 ref nội bộ) + `editorHelpers` (`hitToHoverLabel` + `getView3DInfo`). Dùng `useEditorState` mới thay 3 useEffect (initial-state LOAD + history sync + Ctrl-Z/Shift-Z/Ctrl-Y shortcuts).
- **2D `LeftPanel.tsx` 452 → 17 LoC**: folder `LeftPanel/` cho `Desktop.tsx` (226), `Mobile.tsx` (97), `icons.tsx` (52), `types.ts` (36), `useToolHoverTooltip.ts` (35). `LeftPanel.tsx` entry chỉ dispatch isMobile + re-export `UndoIcon`/`RedoIcon`.

### New shared hooks
- **`useSceneStore`**: promote từ `geometry-2d/editor/` → `core/scene/hooks/`. Loại import cross-folder bẩn từ `graph-2d/editor/MiniBoard.tsx`. Re-export qua scene barrel.
- **`useEditorState({ store, initialState?, onHistoryChange?, bindKeyboardShortcuts? })`**: bundle 3 side effect chung cho stamp editor panel: LOAD initial state (withoutHistory) + history sync callback + Ctrl-Z/Shift-Z/Ctrl-Y shortcut. Re-export qua scene barrel.

### Tests
- Mới: `StampType.generic.test.ts` (5 tests) verify generic narrowing qua `matchesCustomData` + method bivariance cho `ReadonlyArray<StampType<BaseStampCustomData>>`.
- Update 2 test file import `isXxxCustomData` từ internal location (`../types`, `../serialize`) thay vì stamp public index.
- Test count: 682 → 687 (+5 generic).

### Misc
- Loại 3 `eslint-disable max-lines` directives (Whiteboard.tsx, geometry-3d/EditorPanel.tsx, geometry-2d/LeftPanel.tsx).
- Public API render path không đổi: cùng `Whiteboard` props + scene/files behavior. Chỉ breaking ở loại 4 type guard public.

---

## v0.16.0 — 2026-05-22

Tier A refactor — internal restructure, no public API change. (closes #28)

### Refactor
- **`Whiteboard.tsx` 739 → 593 LoC**: tách `useExcalidrawApi`, `useActiveStamp`, `usePdfImporter` về `src/hooks/`. Persist orchestration giữ inline (deferred Tier B — issue #30).
- **`handlers.ts` 890 LoC → folder `handlers/`** (14 file, lớn nhất 176 LoC). `handleDown` 271 LoC tách theo tool branch trong `pointerDown/{move,select,point,singleTarget,polygon,multiClick,index}.ts`. `finalizeShape`/`transform`/`pointerMove`/`pointerUp` tách thành module riêng.
- 9 file >400 LoC → 5 file (giữ lại với `eslint-disable max-lines` chờ Tier B issue #30).

### Tooling
- **ESLint 9 flat config** mới (`eslint.config.mjs`) với rule `max-lines: 400` chặn god-file mới. Script `npm run lint` + `npm run lint:fix`.
- Bonus: fix 1 react-hooks violation thật (`PropertiesPopover.tsx`) phát hiện trong lint pass đầu tiên.

### Docs
- ADR mới: [`docs/superpowers/specs/2026-05-22-tools-dsl-adr.md`](docs/superpowers/specs/2026-05-22-tools-dsl-adr.md) — chốt giữ 3 Tools DSL patterns hiện có (option b).
- Spec đầy đủ: [`docs/superpowers/specs/2026-05-21-refactor-tier-a-b-design.md`](docs/superpowers/specs/2026-05-21-refactor-tier-a-b-design.md).
- Implementation plan: [`docs/superpowers/plans/2026-05-22-tier-a-refactor.md`](docs/superpowers/plans/2026-05-22-tier-a-refactor.md).

### Misc
- Test count: 682 + 1 todo, 111 suites — pass.
- Public API unchanged: `Whiteboard`, `STABLE_STAMPS`, `findStampForCustomData`, `pickSyncableAppState`, `isStampElement`, `restoreMissingStampFiles`, types.

---

## v0.9.1 (unreleased)

Tiếp nối audit v0.9.0 — 3 issue đóng: #13, #14, #15.

### Performance
- **MutationObserver scope** (`src/stamps/shared/ToolbarInjector.tsx`): observer giờ scope xuống Excalidraw container (`.excalidraw`) thay vì `document.body`, kèm rAF coalesce nhiều mutation cùng tick → giảm callback fire khi user vẽ tích cực. (closes #13)

### Quality
- **safeJsx helper** (`src/stamps/shared/safeJsx.ts`): wrap 15+ silent `catch { /* ignore */ }` trong `geometry-2d/{handlers,MiniBoard,render}.ts`. Behavior runtime KHÔNG đổi — vẫn swallow ở prod — nhưng có `console.warn('[whiteboard:jsxgraph]', label, err)` ở dev mode để bắt regression sớm. (closes #14)

### Tests
- **Playwright E2E harness**: thêm `@playwright/test` (devDep), `playwright.config.ts` (chromium headless, webServer auto-start vite demo ở `localhost:5173`), `tests/e2e/smoke.spec.ts` cover 2 spec (canvas mount + stamp menu inject) + 2 spec TODO (editor panel + dark mode). Script `npm run test:e2e`. (closes #15)

### Misc
- Test count: 432 → 440 (+8 cho safeJsx + MutationObserver scope regression).

---

## v0.9.0 (unreleased)

Tổng quát: kết quả của 1 đợt audit (security + bugs + bundle contract + repo hygiene). 5 issue đóng: #3, #4, #5, #6, #7.

### Breaking changes
- **Peer dependencies**: `@excalidraw/excalidraw`, `jsxgraph`, `katex` chuyển từ `dependencies` → `peerDependencies`. Consumer cần tự cài 3 package này. Mục đích chính: đúng contract peer-dep, tránh consumer + whiteboard cùng cài 2 phiên bản khác nhau (trước đây dist bundle vốn không inline 3 deps này vì code đã dùng dynamic import — nên kích thước dist không đổi). Xem README mục _Peer dependencies_. (closes #4)
- **storageKey validation**: prop `storageKey` của `Whiteboard` giờ phải match `/^[a-zA-Z0-9_-]{1,128}$/`. Giá trị invalid → throw `Error` tại entry point persistence (sceneStore/fileStore). (kèm closes #6)

### Security
- **graph-2d parser**: thay `new Function('x', 'return ...')` bằng AST-based math evaluator (`src/stamps/graph-2d/evaluator.ts`). Loại bỏ vector code-injection từ formula người dùng. Whitelist hàm `sin/cos/tan/asin/acos/atan/log/ln/exp/sqrt/abs/floor/ceil/round`; hằng `pi/e`. (closes #3)
- **Persistence schema**: `JSON.parse` với reviver chặn `__proto__`/`constructor`/`prototype` (ngừa prototype pollution); depth check max 64 level (ngừa DoS deeply-nested JSON); whitelist top-level keys khi đọc scene. (closes #6)

### Fixed
- **Whiteboard.tsx — throttle flush on unmount**: scene/file/prune write pending trong throttle window (200ms / 1s / 2s) giờ được flush đồng bộ trước cleanup → không mất write cuối khi component unmount.
- **Whiteboard.tsx — IDB cancelled-guard**: `readFiles` useEffect check `cancelled` ở mỗi async boundary → không gọi `setState`/`api.addFiles` sau unmount.
- **Whiteboard.tsx — stale closure stamps**: `restoreMissingStampFiles` đọc `stamps` qua `stampsRef.current` → luôn dùng prop mới nhất. (closes #5)

### Chores
- Move 35 PNG screenshot ở root vào `docs/screenshots/`; `.gitignore` pattern `/*.png` chặn PNG mới ở root. (closes #7)
- Rebuild `dist/` với toolchain + source mới.

---

## v0.8.0 (unreleased)

### Major redesign — Geometry 3D stamp (GeoGebra-style UX)

Tham khảo GeoGebra 3D Calculator (https://www.geogebra.org/3d) — toàn bộ UX layer của `geometryStamp3D` được viết lại.

### Breaking changes
- Tool registry đổi từ `GeomTool3D` (15 key) sang `ToolKey` (16 key, thêm `pointOnObject`, bỏ `label` — label trở thành menu action trên hàng algebra).
- Editor API: `EditorPanelHandle` mới (`hasContent()` + `serialize()`); host wrapper được điều chỉnh tương ứng.
- Schema bump `version: 1 → 2` (cả `Geometry3DCustomData` lẫn `SerializedBoard3D`). Stamps v0.7.0 (`version: 1`) **vẫn load được** — mọi `point3d` legacy được map về `Constraint = { kind: 'free' }` tự động.
- Chord-shortcut nhập 2 phím tạm thời bị xoá (deferred — sẽ trở lại khi có letter-mapping mới cho 16 tool).

### Added
- **Algebra panel** — tab thứ 2 bên cạnh Tools, hiển thị mỗi object 1 row: chip màu • label • symbolic expression (vd `Point(zAxis)`, `Segment(A, B)`, `Sphere(O, P)`) • numeric value `(x, y, z)` • menu ⋮ (đổi tên / đổi màu / ẩn / xoá).
- **Point-on-surface constraint** — click trên mặt nền / trục / mặt phẳng / mặt cầu / đa giác tạo điểm gắn vào surface đó. Drag điểm sẽ trượt theo surface (chỉ thay đổi tham số `(u, v)`, `t`, `theta/phi`).
- **StatusHint bar** dưới canvas hiển thị hint của tool đang dùng + nhãn object đang hover (giống GeoGebra).
- **Scene3D model** (`editor/scene/Scene3D.ts`) — pure-TS source of truth tách rời JSXGraph: `addPoint(constraint)`, `addObject(kind, spec)`, event emitter (`add`/`change`/`delete`/`reset`), cascade delete.
- **Constraint types** đầy đủ: `free`, `onGround`, `onAxis`, `onPlane`, `onLine`, `onPolygon`, `onSphere`.
- **constraintMath** (`editor/scene/constraintMath.ts`) — `constraintToWorld` + `worldToConstraint` round-trip cho mọi kind.
- **hitTest** layer (`editor/hitTest/`) — ray-cast screen → world, intersect ray với plane/sphere/segment, snap về existing point trong bán kính 8px.
- **JxgRenderer** (`editor/renderer/JxgRenderer.ts`) — subscribe Scene3D events → tạo/update `point3d/line3d/plane3d/polygon3d/sphere3d`. Drag hook: JSXGraph `on('drag')` → `worldToConstraint` → `scene.emitChange`.
- **Declarative ToolSpec** (`editor/tools/spec.ts`) — 16 tool khai báo `steps: ToolStep[]` (point / closingPoint / number / object) + `build(args, scene)`. ToolController FSM consume hit events, advance step, finalize.
- 16 tool handlers: `move`, `point`, `pointOnObject`, `segment`, `line`, `ray`, `vector`, `polygon`, `plane`, `pyramid`, `prism`, `tetrahedron` (đều), `cube`, `sphere`, `cylinder`, `cone`.

### Changed
- File layout: `src/stamps/geometry-3d/editor/` reorganize thành `scene/`, `hitTest/`, `renderer/`, `tools/handlers/`, `toolPanel/`, `algebraPanel/`. Mỗi layer độc lập + có test riêng.
- LeftPanel rewrite: tabbed UI (Tools | Algebra) thay cho danh sách phẳng tool buttons.
- MiniBoard3D simplify: chỉ mount JSXGraph + expose view3d ref + emit pointer events. Toolflow + handlers chuyển sang ToolController.

### Removed
- Legacy files: `editor/handlers.ts`, `editor/tools.ts`, `editor/toolButtons.tsx` (~1100 LOC).
- Tests legacy: `handlers.test.ts`, `tools.test.ts`, `Host.chord.test.tsx`.
- Tool `label` (gắn nhãn cho điểm) — chức năng đổi tên đã được tích hợp vào RowMenu của Algebra panel.

### Migration notes
- Stamps lưu từ v0.7.0 load OK (legacy points → `constraint: 'free'`). Khi save lại lần đầu, stamp được upgrade lên `version: 2` tự động.
- Consumer KHÔNG cần đổi import — `Whiteboard` + `geometry3dStamp` API giữ nguyên.

### Test coverage
- 330 test pass (geometry-3d: 142, scene: 23, hitTest: 13, renderer: 13, tools: 27, algebraPanel: 6, UI: 8...).
- Typecheck strict mode clean.

### Internal architecture refs
- Spec: `docs/superpowers/specs/2026-05-17-3d-geogebra-redesign-design.md` (417 dòng, 17 section).
- Plan: `docs/superpowers/plans/2026-05-17-3d-geogebra-redesign.md` (8 phase, ~40 task).

## v0.7.0 (2026-05-17)

### Breaking changes
- `DEFAULT_STAMPS` giờ chỉ gồm 2 stamps stable: `geometry` + `latex`. `geometry3dStamp` và `graph2dStamp` chuyển sang opt-IN (experimental). Consumer phải pass `stamps={ALL_STAMPS}` hoặc `[...DEFAULT_STAMPS, geometry3dStamp]` để giữ behavior cũ.
- `next` (Next.js) không còn là peer dependency. Whiteboard dùng `React.lazy + Suspense` thuần thay vì `next/dynamic`.

### Added
- `STABLE_STAMPS`, `EXPERIMENTAL_STAMPS`, `ALL_STAMPS` exports từ `@xom11/whiteboard`.
- Field optional `experimental?: boolean` trong `StampType`.
- Subpath exports: `@xom11/whiteboard/geometry-2d`, `/geometry-3d`, `/latex`, `/graph-2d`.
- Hooks: `useStampDoubleClick`, `useStampShortcutBlocker`, `useStampClickOutside` (internal, không export).

### Changed
- **UI**: Tất cả stamp buttons (geometry, latex, 3D, graph) gom vào popover "More tools" của Excalidraw cho cả desktop + mobile (trước đây desktop inject inline vào main toolbar). Main toolbar Excalidraw giờ gọn hơn.
- **Icon 3D**: Thay icon hexagon bằng cube isometric (3 mặt nhìn thấy).
- **Bundle**: Host component của mỗi stamp được lazy-load qua `React.lazy`. Main entry `dist/index.mjs` giảm từ ~299 KB còn ~29 KB (90% reduction).

### Fixed
- Icon stamp 3D không còn nhìn nhầm thành lục giác.

### Internal
- `Whiteboard.tsx` shrunk by extracting 3 hooks (`useStampDoubleClick`, `useStampShortcutBlocker`, `useStampClickOutside`).
- `ToolbarInjector.tsx` shrunk từ 438 dòng còn ~200 dòng (single-path injection vào More tools popover).
- Mỗi stamp tách thành `index.tsx` (metadata + lazy import) + `host.tsx` (component) + `types.ts` (custom data type).

## 0.6.2 — 2026-05-16

### Fixed (consumer integration hotfixes)
- **CSS dark-mode không reachable** — `dist/index.css` (101 dòng dark-mode override cho stamps) chưa có path nào load được từ consumer. Fix:
  - Postbuild auto-prepend `import './index.css'` vào `dist/index.{mjs,js}` → CSS tự load qua side-effect, consumer không cần làm gì.
  - Đồng thời expose `"./styles.css": "./dist/index.css"` trong `package.json#exports` cho ai muốn import thủ công (`import '@xom11/whiteboard/styles.css'`).
- **SSR-unsafe `import JXG`** — `geometry-3d` còn `import JXG from 'jsxgraph'` ở module top → JSXGraph touches `document` khi evaluate → Next.js Server Component throw, consumer buộc phải `next/dynamic({ ssr: false })`. Fix: chuyển sang dynamic import (`(await import('jsxgraph')).default`) trong `render.ts` + `MiniBoard3D.tsx`, đồng nhất với pattern `geometry-2d` đã làm. Consumer giờ có thể SSR-safe import (vẫn nên `ssr:false` cho perf, nhưng không còn bắt buộc).

## 0.6.1 — 2026-05-15

### Fixed (geometry-3d E2E hotfixes)
- **Bug #4** — JSXGraph mesh3d/bounding-box SVG path tràn sang LeftPanel chặn pointer events. `overflow: hidden` trên `MiniBoard3D` container.
- **Bug #7** — `view.create('polyhedron3d', [facesAsRefs], ...)` crash trong JSXGraph 1.12 (`Cannot read 'length' of undefined`). Refactor `finishPolyhedron` → emit N `polygon3d` per face. Unblocks 6 tools: tetrahedron, parallelepiped, prism, pyramid, cone, cylinder.
- **Bug #9** — `line3d` mặc định không vẽ stroke trong view3d projection. Thêm `strokeColor`/`strokeWidth`/`visible:true`/`fixed:true`. Segment + line giờ render visible.
- **Bug #10** — `findExistingPointAt` đọc `obj.coords.scrCoords` luôn `undefined` (point3d không có property này — phải đọc từ `obj.element2D.coords.scrCoords`). Polygon/prism/pyramid close detection + label anchor giờ hoạt động đúng.
- **Bug #11** — `view.create('text3d', [pointRef, text], …)` silently render empty. JSXGraph 1.12 yêu cầu `[[x,y,z], text]` hoặc `[x,y,z,text]`. Switch sang literal coords (anchored qua `pushedPointCoords` map).
- PICK threshold 12 → 18px để click hit-test rộng rãi hơn.

### Removed
- **Tool `solidofrevolution`** (Bug #8) — `solidofrevolution3d` không tồn tại trong JSXGraph 1.12.2 runtime. Tool palette 16 → 15 tools. Có thể re-introduce sau khi xác định element name đúng.

### Verified
- E2E batch (Vite demo + Playwright synthetic clicks) — 14/14 active tools render visible artifacts, editor không tự đóng across ~50 clicks, 0 console errors.
- 157/157 unit tests pass.

## 0.6.0 — 2026-05-15

### Added
- **Geometry-3D stamp** (`geometry3dStamp`) — hình học không gian lớp 11/12 dùng JSXGraph 3D primitives. Shortcut `D`. Tool palette 16 tools:
  - Cơ bản: điểm, đoạn thẳng, đường thẳng, mặt phẳng, tam giác, đa giác
  - Khối đa diện: tứ diện, hình hộp, lăng trụ, chóp
  - Khối cong: mặt cầu, hình nón, hình trụ, khối tròn xoay
  - Khác: nhãn
- Roundtrip edit qua creation-log JSON: double-click stamp → reopen editor với state cũ + có thể đổi góc nhìn.
- Snapshot SVG (cùng pipeline với 2D + LaTeX) khi commit. View state (azimuth, elevation, bbox3D) lưu trong customData.
- Auto-regenerate SVG file sau reload qua `StampType.restoreFileFromCustomData`.

### Removed (breaking changes — xoá alias @deprecated từ 0.5.0)
- `isMathStamp` xoá — dùng `isStampElement` (đã có trong 0.5.0).
- `MathStampCustomData` xoá — dùng `StampCustomData` (đã có trong 0.5.0).
- `restoreMissingMathStampFiles` xoá — dùng `restoreMissingStampFiles` (đã có trong 0.5.0).

Consumer migration: nếu vẫn dùng tên cũ, đổi sang tên mới trước khi bump.

## 0.5.0 — 2026-05-15

### Reorganized
- Đổi `src/stamp/` → `src/stamps/` (registry-driven, by-feature). Mỗi stamp tự đóng gói trong `geometry-2d/`, `latex/`. Common code ở `shared/`.
- Tách `JSXGraphMiniBoard.tsx` (1654 dòng) thành `MiniBoard.tsx` (1289 dòng) + `tools.tsx` (224 dòng) + `handlers.ts` (482 dòng). Theme đã có sẵn ở `theme.ts`. styles.ts không tách (toàn bộ attribute construction nằm trong `useCallback` body, không có pure helper để move).

### Renamed (consumer action: dùng tên mới, alias `@deprecated` sẽ xoá ở 0.6.0)
- `isMathStamp` → `isStampElement`
- `MathStampCustomData` → `StampCustomData`
- `restoreMissingMathStampFiles` → `restoreMissingStampFiles`

### Added
- `StampType.restoreFileFromCustomData?` — mỗi stamp tự khai báo cách regenerate SVG file khi reload từ persisted snapshot. `restoreMissingStampFiles` giờ ưu tiên path này; legacy `renderSvgFromCustomData` vẫn được giữ làm fallback cho stamp chưa migrate (sẽ xoá ở 0.6.0).
- Public barrel `src/stamps/index.ts` re-export sạch.
