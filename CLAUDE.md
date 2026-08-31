# CLAUDE.md

Project context cho Claude Code. Đọc file này trước khi làm việc với codebase.

## Tổng quan

**`@xom11/whiteboard`** — Excalidraw-based whiteboard component cho HocTotBachKhoa classroom. Tách từ monorepo classroom thành package độc lập để cô lập bug + iterate nhanh.

- Bút/shape/text/import ảnh — qua Excalidraw 0.18
- Stamp **hình học** (📐) — JSXGraph editor + serialize JSON state để re-edit
- Stamp **hình học không gian 3D** (📐 3D) — JSXGraph 3D primitives + serialize JSON state để re-edit
- Stamp **LaTeX** (∑) — KaTeX render → SVG
- **Import PDF** (📄) — pdfjs-dist rasterize từng trang → image element xếp dọc. KHÔNG re-edit (ảnh tĩnh).
- Roundtrip edit: double-click stamp → reopen editor với state cũ
- Persist qua sessionStorage (consumer handle); SVG files regenerate khi reload

## Cấu trúc

```
whiteboard/
├── src/
│   ├── index.ts                       ← public API
│   ├── Whiteboard.tsx                 ← main component
│   ├── ExcalidrawWithMenus.tsx
│   ├── serialize.ts                   ← pickSyncableAppState
│   ├── types.ts                       ← Excalidraw types re-exports
│   ├── stamps/                        ← registry-driven plugin layout
│   │   ├── index.ts                   ← barrel
│   │   ├── shared/
│   │   │   ├── registry.ts            ← DEFAULT_STAMPS, findStampForCustomData
│   │   │   ├── types.ts               ← StampType, RestoredStampFile
│   │   │   ├── insertImage.ts
│   │   │   ├── svgToImage.ts
│   │   │   ├── excalidrawPalette.ts
│   │   │   ├── stamp.css
│   │   │   ├── ToolbarInjector.tsx
│   │   │   ├── useShortcuts.ts
│   │   │   ├── useChordShortcut.ts    ← chord 2-key (2D, 3D)
│   │   │   ├── useIsMobile.ts
│   │   │   ├── MobileToolDrawer.tsx   ← mobile drawer generic
│   │   │   ├── restoreStampFiles.ts
│   │   │   └── StampLeftPanel/        ← Tier C v0.19+: shared LeftPanel template cho 3 editor
│   │   │       ├── index.tsx          ← public StampLeftPanel + dispatcher isMobile
│   │   │       ├── Desktop.tsx        ← desktop orchestrator
│   │   │       ├── Mobile.tsx         ← mobile wrap MobileToolDrawer
│   │   │       ├── ToolGrid.tsx       ← chord-aware 4-col tool button grid
│   │   │       ├── AxisGridSection.tsx ← axis/grid + undo/redo, optional
│   │   │       ├── useToolHoverTooltip.ts
│   │   │       └── types.ts           ← StampToolDef, StampLeftPanelProps
│   │   ├── geometry-2d/
│   │   │   ├── index.tsx              ← StampType + Host
│   │   │   ├── host.tsx               ← dùng StampLeftPanel
│   │   │   ├── serialize.ts
│   │   │   ├── render.ts
│   │   │   ├── renderInline.ts
│   │   │   └── editor/
│   │   │       ├── EditorPanel.tsx
│   │   │       ├── MiniBoard.tsx
│   │   │       ├── tools.tsx
│   │   │       ├── icons.tsx          ← UndoIcon, RedoIcon, GeometryIconHeader
│   │   │       ├── handlers.ts
│   │   │       ├── theme.ts
│   │   │       ├── transforms.ts
│   │   │       ├── PropertiesPopover.tsx
│   │   │       └── TransformParamPopover.tsx
│   │   ├── latex/
│   │   │   ├── index.tsx
│   │   │   ├── render.ts
│   │   │   └── editor/
│   │   │       ├── EditorPopover.tsx
│   │   │       └── LeftPanel.tsx       ← latex riêng (đơn giản, không dùng template)
│   │   ├── geometry-3d/
│   │   │   ├── index.tsx              ← StampType + Host
│   │   │   ├── host.tsx               ← dùng StampLeftPanel
│   │   │   ├── serialize.ts
│   │   │   ├── render.ts
│   │   │   └── editor/
│   │   │       ├── EditorPanel.tsx
│   │   │       ├── MiniBoard3D.tsx
│   │   │       ├── toolPanel/        ← chỉ giữ groups.ts + icons.tsx (data)
│   │   │       │   ├── groups.ts
│   │   │       │   └── icons.tsx
│   │   │       ├── tools/
│   │   │       ├── handlers.ts
│   │   │       └── theme.ts
│   │   └── graph-2d/
│   │       ├── index.tsx              ← StampType + Host
│   │       ├── host.tsx               ← dùng StampLeftPanel
│   │       ├── serialize.ts
│   │       ├── render.ts
│   │       └── editor/
│   │           ├── EditorPanel.tsx    ← flex-col (giống 2D/3D từ v0.19)
│   │           ├── MiniBoard.tsx
│   │           ├── tools.tsx          ← 12 tool + SVG icon, single-letter shortcut
│   │           ├── handlers.ts
│   │           ├── theme.ts
│   │           └── rows/              ← FunctionRow, ParameterRow (custom renderRow)
│   ├── pdf/                           ← PDF importer (KHÔNG phải stamp)
│   │   ├── index.ts                   ← barrel
│   │   ├── parseRange.ts              ← "1,3,5-10" → number[]
│   │   ├── rasterize.ts               ← pdfjs lazy-load + PNG render @ scale=2
│   │   ├── insertPdfPages.ts          ← orchestrator + insertRasterizedPagesIntoScene
│   │   ├── PageRangeDialog.tsx
│   │   └── PdfImporterButton.tsx      ← portal vào More tools dropdown
│   └── core/
│       └── persistence/
├── scripts/
└── package.json
```

> `dist/` được generate bởi `npm run build` và publish lên npm (không track trong git từ v0.15+).
```

## Public API

```ts
import {
  Whiteboard,
  pickSyncableAppState,
  isStampElement,
  restoreMissingStampFiles,
  type WhiteboardProps,
  type StampCustomData,
  type ExcalidrawSceneSnapshot,
  type SyncableAppState,
  type BinaryFiles,
  type ExcalidrawElement,
} from '@xom11/whiteboard';
```

Consumer cần wrap trong Client Component (`"use client"`). Package tự thêm `"use client"` vào dist/* nên import từ Server Component cũng OK (Next.js sẽ treat là client).

## Scripts

```bash
npm install
npm test            # Jest 29 + jsdom + ts-jest
npm run typecheck   # tsc --noEmit
npm run build       # tsup → dist/ + inject-use-client.mjs
npm run dev         # tsup --watch (auto rebuild + inject)
```

## Dev workflow phát hành phiên bản mới

Package publish lên npm (`@xom11/whiteboard`). `dist/` không track git — `prepublishOnly` tự clean + build trước `npm publish`.

**Phát hành qua semantic-release, kích hoạt THỦ CÔNG** (`.github/workflows/release.yml` + `.releaserc.json`). Push hằng ngày KHÔNG publish — chỉ release khi bạn gọi tay → tránh version nhảy nhanh + npm churn khi sửa code liên tục.

```bash
# 1) Commit/push thoải mái theo conventional commits — KHÔNG publish gì:
#   fix: ...            → (sẽ) bump patch  (0.31.0 → 0.31.1)
#   feat: ...           → (sẽ) bump minor  (0.31.0 → 0.32.0)
#   feat!: / BREAKING CHANGE: → (sẽ) bump major
#   docs:/chore:/refactor:/ci: → KHÔNG ảnh hưởng release
git push

# 2) Khi sẵn sàng ship → gọi tay 1 lần (gom MỌI feat/fix từ tag trước thành 1 bản):
gh workflow run release.yml --repo xom11/whiteboard
#   → CI: typecheck + test → bump version → publish npm → tag vX.Y.Z + GitHub Release
#   (hoặc bấm nút "Run workflow" trong tab Actions)
```

- **Trigger = `workflow_dispatch`** (cố ý, KHÔNG `on: push`): tách "publish" khỏi "push". Nếu không có feat/fix mới kể từ tag trước → run no-op xanh, không publish.
- **Thiết kế gọn (cố ý):** semantic-release CHỈ chạy `commit-analyzer` + `release-notes-generator` + `npm` + `github`. **KHÔNG** dùng `@semantic-release/git`/`changelog` → **KHÔNG commit ngược vào main** (tránh rủi ro commit "chore(release)" mồ côi khi publish lỗi, và không làm bẩn `CHANGELOG.md` văn xuôi tự viết).
- **Nguồn version chuẩn = git tags `vX.Y.Z` + npm + GitHub Release.** `package.json` trong git GIỮ version cũ (semantic-release set version đúng lúc publish, không commit lại) — đừng tin số trong `package.json` git, xem `git tag` / npm / GitHub Releases.
- `CHANGELOG.md` giờ HOÀN TOÀN thủ công (văn xuôi VN) — tự viết tiếp khi muốn; CI không đụng vào.
- **Secret 1 lần** (repo → Settings → Secrets → Actions): `NPM_TOKEN` (npm token Read+Write hoặc Automation). `GITHUB_TOKEN` Actions tự cấp.
- **GOTCHA setup-node:** KHÔNG để `registry-url` trong `setup-node` — nó tạo `.npmrc` tạm với `${NODE_AUTH_TOKEN}` placeholder mà semantic-release đọc nhầm → 401. Để semantic-release/npm tự lo auth từ `NPM_TOKEN`.
- **Consumer (hoctotbachkhoa) tự cập nhật qua Renovate** (pull-based bot): publish bản mới → Renovate mở PR bump `@xom11/whiteboard` → CI xanh → tự merge. Config mẫu: `renovate.json5` (cài Renovate GitHub App vào repo consumer + đặt file ở gốc repo đó).
- Muốn release tay khẩn cấp: `npx semantic-release --no-ci` (cần `NPM_TOKEN`+`GITHUB_TOKEN` env local).


## Gotchas (AI/DSL pipeline)

> **Log kết quả batch coverage dataset cũ đã được dọn (RESET 2026-06-29).** Mục này giờ chỉ giữ KIẾN THỨC kiến trúc + bug-class lessons (không còn nhật ký "coverage X→Y" theo từng dataset).

- **🎯 TRỌNG TÂM (RESET 2026-06-29): pipeline ẢNH→OCR→VẼ HÌNH 2D từ PDF scan.** Dataset hiện tại = `docs/datasets/tong-hop-hinh-phang-vao10-2018-2019.txt` (118 đề cắt từ `docs/datasets/sources/tong-hop-hinh-hoc-phang-vao-10-2018-2019.pdf` qua Tesseract + `repairOcrSymbols`). Harness `scripts/pdf-dataset/` (rasterize → `ocr-pages` → `segment-problems` → `render-figures`), README cùng thư mục. Vòng lặp: OCR sai → vá `repairOcrSymbols` (regen dataset); hình sai/thiếu → mở rộng rule `ai/rules/`. `diag-all.ts` = 25/118 (21%) full deterministic. Nguyên tắc giữ: tối ưu RULE BASE để LLM hiếm khi cần (LLM = chậm + tốn tiền).
- **Bug-class lessons (đúc kết từ các batch dataset đã dọn log — kiến thức vẫn đúng):** (1) MỌI `new RegExp(\`...${name}...\`)` PHẢI `escapeRe(name)` — tên OCR méo ("(O") nội suy vào RegExp → "Unterminated group" crash CẢ pipeline (đã bọc circleRadius/chord/namedLine/onCirclePoint). (2) `\b` ASCII cạnh chữ Việt ĐẢO/chết im lặng (`là\b` khớp "làm") → dùng lookaround Unicode `(?!\p{L})`. (3) Rule khớp `.match()` nhưng vẫn escalate → nghi (a) PREFILTER `patterns[]` chặn, (b) vocab thiếu keyword → `hasGeometry=false`, (c) blob `.+` nuốt sang câu "Chứng minh". (4) Regression khi normalize/denoise thường LỘ gap rule thật — vá gap rồi mới bật lại. (5) case-sensitivity HOA đầu câu (`[Dd]ây`). (6) Trước khi tin DEFER "cần builder", grep hạ tầng — có thể đã trả nợ ở fix khác. (7) token tên đường chữ thường = `[a-z][0-9]?(?!\p{L})`, KHÔNG `[a-z]*` (nuốt "vuông"). (8) coverage gate ALL-OR-NOTHING → giá trị production thật = partial-render (`tryPartialDeterministic`), strict-metric chỉ đo đa dạng.
- **✅ AUDIT 2026-06-12 (5 commit, 0 regression — diag identical 7/7 kể cả vao10, 2857 test):** (1) **Bug class `\b` ASCII cạnh chữ Việt** — `_shared.ts` NAME_LA `là\b` ĐẢO ngữ nghĩa (khớp "làm", KHÔNG khớp "là ") + `coverage.ts` comma-split `Vẽ\b/Kẻ\b` chết im lặng từ đầu + incircleTangency `\bvà\b`; fix bằng lookaround Unicode. Khi viết rule: grep `\\b` đứng cạnh chữ có dấu. (2) **completeRightAngle.ts (dead từ cleanup 2026-06-09) → rule `rightAngleViewing`** (priority 63 TRÊN onSegmentPoint 62 — builder add-point first-wins; bản cũ có bug nuốt "đường tròn"→ref "tr", đã chặn bằng `(?![\p{L}\d])`). (3) **Order-retry topo tầng intent**: `buildAndTranspile` (tryDeterministicFigure) attempt 1 đúng thứ tự gốc, CHỈ retry `orderIntentsByDependency` (`ai/intentTopo.ts` — stable Kahn produce/consume tên, tách cặp longest-prefix "BC"/"B1C1") khi build-throw/UNKNOWN_REF → **rule mới KHÔNG cần canh priority thấp hơn rule tạo điểm nữa** (ràng buộc intersection=45 thành lịch sử). KHÔNG topo mặc định: defaultFreeCoord spread + uniqueShapeName phụ thuộc thứ tự → reorder case đang pass sẽ xê dịch toạ độ/tên. (4) **validateRefs 100% registry**: xoá switch legacy (refs.ts 215→112) — kind có ref BẮT BUỘC khai `refSpecs` trong module (hàm cho discriminated union như arcMidpoint/pointAtDistance; dotted path 'distance.circle'; RefRole mới 'line-or-circle'). Follow-up: circleDiameter/mixtilinearPoint/onPerpBisector chưa khai (parity switch cũ). (5) **jest trong worktree**: config tự bỏ ignore `/.claude/worktrees/` khi rootDir là worktree (trước đó "No tests found"). ts-prune false-positive đã rà: `clearAll`/`clearScene` GIỮ (tests dùng làm cleanup isolation).
- **✅ FIX 2026-06-11 (tâm (O)/(I) = scene point chọn được):** trước đây circumcircle/incircle đặt tên "(O)"/"(I)" → DSL `circle3/incircle name=O` → `circle.ts` vẽ tâm bằng JSXGraph helper `circumcenter/incenter` (`fixed:true`, KHÔNG có scene id) → tâm hiện **màu cam** (default JSXGraph) + **không click được** để đổi tên/màu. FIX ở `resolveCircleNames.ts`: **force-split** mọi circle `through3/inscribedIn` có tên kiểu nhãn-tâm (`/^[A-Z]['′]?\d*$/`) — inject scene point `circumcenter/incenter` + đổi circle → "O_c" (kể cả khi O KHÔNG bị tham chiếu như point, vd chỉ `secondIntersection.circle="O"`). Đổi tên → `isCenter` false → tắt helper cam; point inject vẽ chấm xanh `#1e40af` chọn được (vẫn KHÔNG kéo tự do vì tâm tính toán). `circle.ts` thêm guard `isRenamedCircle = /_c$/` → `withLabel:false` để không hiện "O_c" nổi trên vòng tròn. 0 coverage regression (diag-all giống hệt baseline), 2781 test xanh.
- **✅ FIX 2026-06-11 (halo highlight phái sinh — point/circle/polygon):** `JxgRenderer.addHalo` (viền xám khi chọn object trong editor) trước switch theo `el.elType` string → BỎ SÓT mọi element phái sinh có elType riêng: điểm `circumcenter`(O)/`otherintersection`(M,N,P)/`perpendicularpoint`(D,E,F)/`incenter`; đường tròn `circumcircle`(O_c)/`incircle` (≠ 'circle'); `regularpolygon` (hình vuông/đa giác đều, ≠ 'polygon'). Click VẪN chọn được (selection dùng `objKind` ưu tiên `elementClass`) — chỉ thiếu halo. FIX: addHalo phân loại bằng `elementClass` (1=POINT, 2=LINE, 3=CIRCLE — JSXGraph set đúng cho MỌI construction) + `Array.isArray(vertices)` cho polygon, thay vì liệt kê elType. Đồng bộ `objKind` (tools.tsx). **GOTCHA: MỌI logic phân-loại-JSXGraph-element phải ưu tiên `elementClass`, KHÔNG dựa elType string (mỗi cách dựng 1 tên: circumcenter/otherintersection/circumcircle/regularpolygon…).** Đã thêm halo cho arc/semicircle/circumcirclearc + sector + angle — TẤT CẢ dùng `center`/`radiuspoint`/`anglepoint` (**chữ THƯỜNG**). **GOTCHA verify-runtime: `index.d.ts` của jsxgraph ghi Sector/Angle là `radiusPoint`/`anglePoint` (P HOA) — SAI; runtime thực tế là chữ thường (verify bằng Playwright trên angle thật). Code đọc cả hai (`radiuspoint ?? radiusPoint`) cho chắc.** slopetriangle tự được phủ qua `elementClass===2` (extends Line). **Bài học: .d.ts của lib bên thứ ba có thể sai property name — phải verify runtime, unit-test với mock theo .d.ts cho false-positive.** CÒN gap (defer): `functiongraph`/curve + `text` chưa có halo (hiếm chọn, khó dựng lại); renderer 3D (`JxgRenderer3D.addHalo`) vẫn dùng elType switch — chưa rà (user chưa cần 3D).
- **Kiến trúc pipeline (single pipeline, rules-first — đại tu 2026-06-09):**
  - UI façade `handleGenerateFigure({problem}, opts) → AiFigureUiResult ({ok, state})` → gọi `generateFigureIntent` → **Track A deterministic** (`deterministic/tryDeterministicFigure`: chạy 21 rule `ai/rules/` → IntentT[] → 4 gate coverage/transpile/verify + 2 guard named-entity/fidelity) → **Track B LLM intent** CHỈ khi Track A miss. Đề dễ→trung bình dựng KHÔNG tốn token.
  - **Thêm construct = thêm 1 module `ai/rules/<name>.ts` + 1 dòng `rules/registry.ts` + 1 test `rules/__tests__/`.** (KHÔNG còn cập nhật validator 3 chỗ như trước.) Mỗi rule: `{id, priority, languages, patterns (prefilter), match(ctx)→RuleMatch[]}`. Regex tiếng Việt PHẢI cờ `u` + lookaround `(?!\p{L})` thay `\b` (ASCII `\b` không khớp quanh ký tự Việt — xem bug NAMED_LA dưới).
  - **ĐÃ XOÁ 2026-06-09** (path DSL free-form cũ — dead sau khi UI chuyển sang rule engine; đừng resurrect): `buildFigure.ts`, `validator.ts` (keyword→kind anti-bias 1170 dòng — rules engine thay thế), `deterministic/{index(parseDeterministic),skeleton,derived,confidence}.ts`. Spec: `docs/superpowers/specs/2026-06-09-rule-engine-wire-and-cleanup-design.md`.
  - **Anti-bias giờ LÀ chính rule engine**: deterministic chạy TRƯỚC LLM; gate coverage (mọi clause geo phải được claim) + guard chặn render sai/thiếu. Guard `allNamedEntitiesPresent` (guards.ts): mọi tên "Gọi X"/"X là …"/đỉnh hình nêu trong đề PHẢI có trong DSL, else escalate. **Fix 2026-06-09**: `NAMED_LA` dùng `là\b` (ASCII `\b` sau 'à' chết) → `là(?!\p{L})` — trước fix "X là <construct chưa có rule>" silent-incomplete (render thiếu điểm) thay vì escalate.
  - **✅ ĐÃ PORT (2026-06-09)**: `excenter` (`ai/rules/excenter.ts` "J là tâm bàng tiếp góc A"); circumcircle dạng tắt "tam giác ABC **nội tiếp (O)**" (không cần chữ "đường tròn" — `circleTriangle` TRI_INSCRIBED_IN_PAREN; fix transpile-fail + mở khoá lớp bài cung); distributive **"M, N lần lượt là trung điểm AB, AC"** (`midpoint` DISTRIB, zip 1-1).
  - **✅ ĐÃ PORT (2026-06-09, batch "5 miss")** — 5 MISS trong scan trước giờ deterministic (mỗi rule 1 module + 1 dòng registry + TDD; xem commit c5fe5f9→d5ab0c2):
    1. `angleBisectorFoot` ("D là chân đường phân giác từ A / góc A / ngoài từ A" → suy cạnh đối từ tam giác, externalAngleBisectorFoot cho "ngoài"). Thêm guard `CHAN_BEFORE` vào `angleBisectorAngle` để né double-emit tia khi có "chân" đứng trước.
    2. `intersection` generic ("D là giao điểm của AB và CE" / "AM cắt CN tại K" / "AC và BD cắt nhau tại O" — ref = cặp đỉnh 2 HOA). **Priority 45 (DƯỚI mọi rule tạo điểm)** vì `intentsToDsl` xử lý intent theo priority DESC, KHÔNG topo-sort → đầu mút phái sinh (vd trung điểm) phải dựng trước. Guard: 4 đầu mút phân biệt + tên ∉ ref. Loại circleIntersection / secondIntersection / "đôi một cắt nhau".
    3. `chord` ("đường tròn (O), dây AB" → circle centerRadius bán kính canonical `SYMBOLIC_RADIUS` + onCircle A,B (theta phân biệt) + connect). `resolveCircleNameCollisions` tự inject tâm O (free) + rename circle→O_c.
    4. `arcMidpoint` **implied circumcircle**: "M trung điểm cung BC" KHÔNG nêu (O) + có tam giác chứa cặp cung → emit through3 ngầm (tên synth) TRƯỚC arcMidpoint. Guard: cung phải là 2 đỉnh tam giác (else escalate). VN+EN.
    5. `perpBisector` ∩ line ("trung trực BC cắt AB tại D" → perpBisector(BC) + intersection D ref `pb_BC`, tên do connect builder đặt — khớp `uniqueShapeName`, dedup JSON nên duy nhất; builder đổi prefix → transpile-fail → escalate, fail-safe).
  - **Coverage scan 2026-06-09** (sau batch "5 miss"): corpus probe **18/21 HIT** — 5/5 construct mục tiêu HIT, 7 construct cũ KHÔNG regress, 3 case escalate đúng. 2557→**2595 test xanh**. Tái tạo scan: probe `tryDeterministicFigure` (hàm thuần, no LLM).
  - **✅ parallelPerp ĐÃ PORT (2026-06-09)**: `ai/rules/parallelPerp.ts` ("Qua/Từ A kẻ đường thẳng song song/vuông góc với BC" → draw-line parallelThrough/perpThrough; synthesize name parA/prpA; anchor "Qua/Từ" để không nuốt perpFoot). Priority 58, VN-only.
  - **Gap còn lại (escalate LLM an toàn — DEFER)**: (a) `onSegment` "Lấy E trên BC" CHƯA rule nào dựng → "giao điểm của AB và CE" khi E là điểm-trên-đoạn → transpile-fail (intersection rule đúng, nhưng E thiếu); (b) intersection ref đường ĐẶT-TÊN-thường (d, Δ) hoặc giao 2 ĐƯỜNG TRÒN (circleIntersection) — defer; (c) "đường tròn (O)" TRƠ (không dây/không quan hệ) vẫn escalate (circleRadius cố ý bỏ qua, chord chỉ kích hoạt khi có "dây").
  - Nợ nhỏ: `_shared.ts extractPointName` NAME_LA dính bug `là\b` (rule mới tự neo tên, đừng phụ thuộc); excircle ("vẽ đường tròn bàng tiếp") chưa có intent path.
  - **Hybrid partial-coverage (đòn bẩy giảm LLM lớn nhất — Phase 1 DONE 2026-06-09):** coverage gate hiện all-or-nothing (1 clause geo miss → escalate TOÀN BỘ). Building block đã có: `tryPartialDeterministic` (intent phần phủ + clause thiếu) + `mergeIntents` (gộp det+llm, det thắng collision) — deterministic, đã test, CHƯA wire. Phase 2 (continuation prompt + flag `useHybrid` OFF) + Phase 3 (eval bật default) PENDING. Spec: `docs/superpowers/specs/2026-06-09-hybrid-partial-coverage-design.md`.
- Eval rule engine: `npx tsx scripts/eval-intent.ts gemma3:12b` (cần Ollama local). (eval-ai/eval-ollama/sample-ollama/smoke-ai/inspect-failure/debug-dsl ĐÃ XOÁ 2026-06-09 — chỉ phục vụ path cũ.)
- **Tier 4+5 (đề thi vào 10 thường + chuyên)** — Intent pipeline mở rộng 2026-06-02 (v0.25.0):
  - +2 op intent: `draw-line` (perpThrough/parallelThrough/tangentAt/tangentFromExt), `mark-shape` (sub-shape từ điểm có sẵn).
  - +3 circle spec: centerRadius, inscribedIn (+ centerThrough, through3 cũ).
  - +5 add-point constraint: secondIntersection, circleIntersection, tangencyPoint, tangentPoint, angleBisectorFoot.
  - +6 DSL kind: secondIntersection/circleIntersection/tangencyPoint/tangentPointExt (points) + circleCR/incircle (circles).
  - Stage 4 verify thêm `computeIntentMetrics(expected, actual)` → recall/precision/F1 + `verifyGeometric(dsl)` cho on-circle check (3 check khác defer).
  - Eval: `npx tsx scripts/eval-intent.ts gemma3:12b` — 30 cũ + 15 Tier 4/5 mới.
- **`pointAtDistance` (Cụm B, 2026-06-06)** — constraint **metric đầu tiên** (theo độ dài): điểm trên tia `from→through` kéo dài qua `through`, cách `through` khoảng `d`. `C = through + d·unit(through−from)`. Giải bài "kéo dài AB về phía B, lấy C sao cho BC = R / = đoạn / = số". `distance` là discriminated union 3 nguồn: `circleRadius` (= bán kính), `segmentLength` (= |p1 p2|, 2 điểm), `literal` (số board-units). Full path intent→render (functional point, render ở `point.ts` TRƯỚC fallback `[0,0]`). **Defer**: tool editor vẽ tay, cm-mapping cho `literal`, nguồn distance khác (k·AB, 2R, tổng/hiệu). Spec/plan: `docs/superpowers/{specs,plans}/2026-06-06-point-at-distance*`.

## Conventions

### Code
- TypeScript strict, không dùng `any` nếu tránh được
- `"use client"` ở file có hook/event handler (Next.js App Router) — tsup banner config bị strip nên dùng `scripts/inject-use-client.mjs` postbuild
- Forward ref + `useImperativeHandle` cho editor panels (parent gọi `.insert()`, `.hasContent()`, etc.)
- Stable closures qua `useRef` (state thay đổi nhanh, handler không nên re-create)
- Capture phase + `stopPropagation` để win Excalidraw's bubble handlers (G/L shortcuts xung đột L=Line)

### Git
- Solo project — push thẳng vào `main` OK (chưa public version npm; bump + publish khi xong các round bugfix).
- Branch phụ chỉ khi cần cô lập thử nghiệm: `feature/`, `bugfix/`, `hotfix/`, `refactor/`, `chore/`.
- Commit message + PR description viết tiếng Việt (prefix giữ tiếng Anh: `feat`, `fix`, `chore`, `refactor`)
- **KHÔNG** thêm `Co-Authored-By` lines (per user preference)

### Test
- Mỗi file source có `__tests__/<name>.test.tsx` cạnh nó (smoke + behavior test)
- Mock `@excalidraw/excalidraw` (canvas + esm.sh fonts không chạy được trong jsdom)
- Mock `katex` (ESM dynamic import)
- Mock `next/dynamic` (resolve loader sync để test render được)

## Gotchas

- **Excalidraw double-click image → crop mode**: `appState.croppingElementId` được set. Math-stamp intercept → reopen editor thay vì crop. Sau khi insert lại, dùng `skipCropForIdRef` để tránh loop.
- **⚠️ Cleanup lúc unmount KHÔNG được đọc `api.getSceneElements()`** (fix 2026-07-09): Excalidraw `App` là **class component** → `componentWillUnmount()` chạy ở *mutation phase* (gọi `scene.destroy()` + `this.scene = new Scene()`), tức TRƯỚC cleanup `useEffect` của `Whiteboard` (*passive phase*). Trong cleanup, api trả **`[]`** chứ không phải scene thật — và `?? fallback` vô dụng vì `[]` không nullish. Bug thật: `useScenePersist.flushPrune()` lấy keep-set từ api rỗng → `pruneFiles()` xoá **sạch** raster IndexedDB của phòng → GV import PDF, chuyển chế độ (gọi HS lên bảng / share màn hình) rồi quay lại thì element PDF còn (localStorage) nhưng **ảnh mất**. Chỉ kích hoạt khi prune-throttle (2s) còn pending lúc unmount → trông "lúc bị lúc không". Nguồn element tin cậy trong cleanup = `latestSceneRef` (payload `onChange` cuối; chứa CẢ element `isDeleted` nên phải lọc). Stamp không dính vì regenerate được từ `customData`; raster PDF thì không. Regression gate: `src/hooks/useScenePersist.test.tsx` + `tests/e2e/pdf-raster-persist.spec.ts` (đếm pixel trên canvas thật).
- **Nền giấy kẻ dòng = lớp CSS sau canvas + `viewBackgroundColor:'transparent'`**: Excalidraw sơn nền bảng bằng JS (`ctx.fillStyle = viewBackgroundColor; fillRect`), KHÔNG bằng CSS — nên muốn thấy lớp nền riêng thì phải làm canvas trong suốt. Giá trị `'transparent'` được hỗ trợ CHÍNH THỨC: bundle có nhánh `(a==="transparent"||a.length===5||a.length===9||/(hsla|rgba)\(/.test(a)) && ctx.clearRect(...)` chạy TRƯỚC `fillRect` nên không để lại vệt frame cũ (verify runtime, `chunk-K2UTITRG.js`). Giải pháp ở `src/ui/PaperBackground.tsx` + `paperStyle.ts` (hàm thuần `paperMetrics`) + `usePaperBackground.ts`: div `position:absolute;inset:0;pointer-events:none` đặt TRƯỚC `<Excalidraw>` trong DOM, dòng kẻ vẽ bằng `linear-gradient` + `background-size/position-y` ghi thẳng vào `element.style` trong `api.onScrollChange` (KHÔNG setState — pan bắn event mỗi frame). Quy đổi `screenY = (sceneY + scrollY) * zoom` — **dấu CỘNG**, đọc từ `sceneCoordsToViewportCoords` (`dist/dev/chunk-4FTI6OG3.js:1329`); bản đầu viết dấu trừ nên dòng kẻ trượt NGƯỢC nội dung, và test không bắt được vì nó chép lại chính công thức sai đó rồi so với nó (sửa 2026-08-31, thay bằng phép đo pixel độc lập: trung bình vòng trên độ đậm từng hàng). Chỉ phụ thuộc `scrollY`; zoom nhỏ tới mức khoảng cách < 8px thì ẩn hẳn. Mặc định TẮT, nhớ ở `localStorage['whiteboard:paper-bg']`. **`serialize.ts` chuẩn hoá `'transparent'` → `'#ffffff'`** — nền trong suốt là trạng thái hiển thị tạm, lưu vào scene thì máy khác mở ra sẽ thấy lộ trang web phía sau. Toggle nằm trong `MainMenu` (API công khai, không hack class). **Coupling class nội bộ** (`.excalidraw`, `.excalidraw__canvas` trong `paperBackground.css`) → bump 0.19 phải chạy `npx playwright test tests/e2e/paper-background.spec.ts`.
- **Trang giấy = ràng buộc CAMERA, không phải vẽ thêm**: bật nền kẻ dòng thì bảng thành trang bề rộng `PAPER_PAGE_WIDTH` (1440 đơn vị scene), mép trên cứng, bên dưới vô tận. Excalidraw 0.18 **không có** `scrollConstraints` (grep `dist/`), nên tự kẹp: `src/ui/pageCamera.ts` (hàm thuần) + `usePageCamera.ts` (nghe `onScrollChange`, ghi ngược bằng `updateScene` + `captureUpdate:'NEVER'`). **Chạy được là nhờ Excalidraw cập nhật camera CỘNG DỒN từ state hiện tại** (`scrollX: this.state.scrollX - dx/zoom` trong `dist/prod/index.js`) chứ không từ gốc cử chỉ — ghi giá trị đã kẹp vào thì sự kiện kế tiếp tính TỪ đó, được vách cứng thay vì rung; đổi sang `originScroll + tổngDelta` là cách này chết, **bump 0.19 kiểm điểm này TRƯỚC TIÊN**. Bốn bẫy đã trả giá: (1) không có epsilon khi so camera trước lúc ghi ⇒ sai số dấu phẩy động đẻ vòng lặp kẹp-ghi vô tận; (2) `ResizeObserver` là BẮT BUỘC vì cửa sổ co giãn không đổi `scrollY` nên `onScrollChange` không bắn và `minZoom` mới không được áp; (3) nhánh căn giữa chỉ với tới được khi **trần `MAX_ZOOM`** chặn — sàn `MIN_ZOOM` thì không, vì `pageWidth > 10w` kéo theo `visibleWidth = 10w < pageWidth`; (4) sàn zoom làm nhánh ẩn-khi-dày-quá của `paperMetrics` thành **không đạt tới được** trên màn ≥360px, nên ca e2e cũ dựa vào `zoom=0.15` đã phải gỡ. Ở sàn zoom khoảng cách dòng là 28,4px (không nguyên) ⇒ `countLinePixels` đếm hụt vì khử răng cưa, ngưỡng phải thấp hơn ca zoom-1.
- **Ẩn panel thuộc tính = CSS, không có API**: Excalidraw 0.18 không cho ẩn riêng panel thuộc tính (`UIOptions` chỉ có `canvasActions`/`tools`/`dockedSidebarBreakpoint`); zen mode (`zenModeEnabled`, `Alt+Z`) ẩn kèm undo/redo nên không dùng. Giải pháp ở `src/ui/PropsPanelToggle.tsx`: portal nút vào BÊN TRONG Island `.App-menu__left` (Island là `position: absolute` → sibling sẽ đè lên panel), rồi thu Island bằng CSS qua class `wb-props-collapsed` trên wrapper. **Coupling với class nội bộ của Excalidraw** (`.App-menu__left`, `.panelColumn`) → khi bump 0.19 phải chạy `npx playwright test tests/e2e/props-panel-collapse.spec.ts`.
- **Đổi vị trí thanh công cụ = CSS, cũng không có API**: Excalidraw 0.18 khoá cứng toolbar ở giữa mép trên (`.App-menu_top` là grid `1fr 2fr 1fr`, toolbar nằm cột 2 qua `.shapes-section{justify-content:center}`, cả khối trong `.FixedSideContainer_side_top`). Upstream issue #7583 xin đúng tính năng này, VẪN MỞ. Giải pháp ở `src/ui/ToolbarDragger.tsx` + `toolbarDragger.css`: portal tay cầm vào `.Island.App-toolbar`, rồi cho `section.shapes-section` thành `position:absolute` (containing block = `.FixedSideContainer_side_top` vì `.App-menu_top` là `static`). Kéo-thả tự do + hít mép khi thả cách mép ≤80px; dock trái/phải lật toolbar dọc; nhớ vị trí ở `localStorage['whiteboard:toolbar-pos']`. Tắt khi `readOnly` + mobile. **GOTCHA đo được, ĐỌC CSS SUÔNG SAI CẢ 3**: (1) `.App-toolbar-container` KHÔNG phải Island — Island thật là `.Island.App-toolbar` sâu hơn 1 tầng, và có `div` `position:relative` không class bọc ngoài (absolute vào Island → sai hệ quy chiếu); (2) hàng icon là GRID (`.Stack_horizontal{grid-auto-flow:column}`) nên lật dọc bằng `grid-auto-flow:row`, KHÔNG phải `flex-direction:column`; (3) `.App-toolbar-content` (tên nghe đúng nhất) là của bottom-bar MOBILE, không có trong cây desktop. Bốc section khỏi grid thì PHẢI ghim `grid-column` cho 2 sibling, nếu không auto-placement kéo nút Library từ cột 3 về cột 2. Popover "More tools" (`right:0;top:100%`) phải xoay theo từng mode, nếu không 4 nút stamp mở ra ngoài màn. **Coupling class nội bộ** (`.shapes-section`, `.Island.App-toolbar`, `.Stack_horizontal`, `.App-toolbar__divider`, `.FixedSideContainer_side_top`, `.App-toolbar__extra-tools-dropdown`) → bump 0.19 phải chạy `npx playwright test tests/e2e/toolbar-drag.spec.ts` cùng `props-panel-collapse.spec.ts`.
- **JSXGraph point labels**: mặc định render bằng HTML `<div>` overlay → clone-SVG export missing labels. Fix: set `JXG.Options.text.display = 'internal'` (cả ở MiniBoard và offscreen restore).
- **CSS-in-JS từ Excalidraw**: `import '@excalidraw/excalidraw/index.css'` trong `ExcalidrawWhiteboardView.tsx`. Consumer Next.js handle CSS imports từ JS thông qua webpack/turbopack loader.
- **Tailwind v4 không scan node_modules**: consumer phải thêm `@source "../../../node_modules/@xom11/whiteboard/dist/**/*.{js,mjs}";` vào globals.css.
- **pdfjs-dist worker**: mặc định trỏ CDN `cdn.jsdelivr.net` theo version đã cài. Consumer offline-first phải gọi `configurePdfWorker(url)` trước lần dùng đầu tiên (vd self-host `pdf.worker.min.mjs`). pdfjs lazy-load chỉ khi user trigger PDF import.
- **Vision OCR (ảnh → text)**: `handleExtractProblem(image)` đọc đề từ ảnh. Engine **DUY NHẤT = Tesseract.js** client-side, offline, KHÔNG network/LLM/API key — **path `engine:'llm'` đã GỠ** (đừng resurrect; mô tả cũ "Vision LLM opt-in qua `{engine:'llm'}`" + `WHITEBOARD_AI_VISION_MODEL` đã lỗi thời). Lazy load `vie+eng` traineddata ~13MB từ CDN lần đầu, cache IndexedDB. `postProcess` (extractProblem.ts): strip markdown → collapse `\s+` → NFC → **`repairOcrSymbols`** → cap 2000.
- **`repairOcrSymbols` (2026-06-29 `ce3f817` + RESET batch)**: vá symbol/rớt-dấu đặc thù lỗi Tesseract **ở TẦNG OCR** (postProcess), **KHÔNG** ở `normalizeText` dùng chung — vì "L"/"ABCD" gõ tay là input hợp lệ; `normalizeText.TRIANGLE_SYMBOL` khớp `∆` THẬT nên không bao giờ fire trên output OCR (glyph đã thành "A"). Vá TOKEN ĐÃ HỎNG: `⊥←1/|/L` (kẹp 2 nhóm-hoa); `△/∆←A` 2 nhánh — **R2a strict** hậu tố tam-giác-thuần `cân/đều/nhọn/vuông` ngay sau (KHÔNG cần Cho/Xét → bắt cả "Chứng minh: △PQE cân"), guard `(?<!giác )(?<!thang )` né tứ giác/hình thang; **R2b doubled** `AA[A-Z]{2}`+`nội/ngoại tiếp` dùng tín hiệu **A NHÂN ĐÔI** (△ABC→"AABC"; tứ giác "ABCD"→"AB.." → "Cho ABCD nội tiếp" KHÔNG bị vá nhầm); `(O)←(0)` bare; `∈←e` (cuối list-điểm); `∩←N dính` (gate `= {`); `²←?` (chữ HOA+`?`+toán tử). **RESET 2026-06-29 thêm R7-R11** (đo trên PDF scan "Tổng hợp HHP vào 10"): **R7 `Ơ`(U+01A0 O-móc)→`C`** (nhãn điểm C, gate `(?<!\p{Ll})Ơ(?!\p{Ll})` né từ Việt "Ơn"); **R8 `đường tron`→`đường tròn`** (gate `(?![\p{L}])` né "trong"); **R9 `Ƒ`(florin U+0192)→`F`**; **R10 `tai`→`tại`** (chỉ trước nhãn HOA/`(`/"điểm"); **R11 `tam`→`tâm`** (chỉ trước `đường`/`(`, né "tam giác"). Precision-first + context-gate + idempotent. Spec symbol: `docs/superpowers/specs/2026-06-29-ocr-symbol-repair-design.md`.
- **`detectFormulaRisk` (2026-06-29 `1519809`)**: sibling của repair — KHÔNG sửa text, chỉ **cờ cảnh báo** khi OCR HUỶ công thức mà confidence vẫn cao (đo: `a²/pq→<`, `x̂Ay→TÂU` mà conf=90 ⇒ ngưỡng confidence vô dụng cho lỗi symbol). 3 marker precision-first: M1 `<`/`>` KHÔNG ở dạng bất-đẳng-thức `operand OP operand` (né `a<b`), M2 `[A-Z0-9]?`+toán tử (mũ²/độ° mất, né `vuông?`/`? 2,`), M3 token CÓ DẤU trước `= N°` (tên góc méo, né `ABC=90°`). Surface: `ExtractProblemSuccess.warnings[]` → `handleExtractProblem` kind `low-confidence` message cụ thể kể cả conf cao. **Best-effort advisory** — KHÔNG bắt `x̂Ay→zAy` (không dấu). **Ca công thức-trong-ĐỀ (a²/pq) bác bỏ giả định "công thức chỉ ở lời giải" — đây là ranh giới repair heuristic dừng, đọc-đúng công thức cần math-OCR/VLM (Hướng 2 defer).** Spec: `docs/superpowers/specs/2026-06-29-ocr-formula-risk-warning-design.md`.
- **Tesseract CDN**: tesseract.js v7 mặc định fetch worker + traineddata từ `unpkg.com` + `tessdata.projectnaptha.com`. Offline-first consumer cần self-host (override `corePath`/`langPath` — chưa expose v0.26.1, TODO v0.27+). Chạy ở Node (script đo) → traineddata cache ra cwd nên đã `.gitignore *.traineddata`.
- **Image input (`preprocess.ts`)**: chỉ nhận PNG/JPEG/WEBP (HEIC iPhone → reject "Chỉ hỗ trợ PNG, JPEG, WEBP"); downscale max edge 2048px; raw ≤10MB, encoded ≤3MB blob (~4MB base64 string). jsdom không có `createImageBitmap`/`canvas.toBlob` → preprocess là smoke test only.
- **AI providers (DSL/Intent gen)**: 4 options qua `WHITEBOARD_AI_PROVIDER` env:
  - `claude-agent-sdk` (0.26.1+, **default**) — official `@anthropic-ai/claude-agent-sdk`, OAuth subscription Pro/Max/Team (production OK). Cần `claude setup-token` + `CLAUDE_CODE_OAUTH_TOKEN` env. ~10-30s/call đề đơn giản, ~75s đề phức tạp. KHÔNG set `ANTHROPIC_API_KEY` chung (silent shadow OAuth). Smoke: `node scripts/smoke-agent-sdk.mjs`.
  - `anthropic` — production, cần `ANTHROPIC_API_KEY` từ console.anthropic.com (pay-per-token)
  - `claude-cli` — legacy, spawn `claude -p` subprocess + `--json-schema`. Chậm hơn agent-sdk ~5x (Claude Code context boot overhead). Smoke: `npx tsx scripts/smoke-claude-cli.ts [model]`.
  - `ollama` — local Gemma 3 4B/12B, free, cần `ollama serve` (fallback dev offline)
- **Agent SDK zod peer override**: `@anthropic-ai/claude-agent-sdk` declare peer `zod@^4` nhưng project xài zod 3. `package.json` overrides force SDK xài zod 3 — verified runtime OK 1547 test xanh. Khi upgrade zod 3→4 thì remove override.
- **Anthropic billing 2026-06-15**: programmatic call (Agent SDK + `claude -p` + third-party) chuyển "Agent SDK Credit Pool" tách subscription Interactive. Pro $20/Max $100/Max 20x $200 credit/tháng. Memory `reference-anthropic-agent-sdk-subscription` lưu chi tiết.

## Extracted from

`Hoctotbachkhoa/hoctotbachkhoa` (`apps/web/components/classroom/excalidrawBoard/`) — history preserved qua `git filter-repo`.
