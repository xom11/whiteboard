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

Package đã publish lên npm (`@xom11/whiteboard`). `dist/` không track git — `prepublishOnly` tự clean + build trước `npm publish`.

```bash
# 1. Bump version + tag (tự commit + tag)
npm version patch        # 0.14.0 → 0.14.1

# 2. Publish lên npm (prepublishOnly tự chạy clean + build)
npm publish --access public

# 3. Push tag + commit
git push --follow-tags

# Consumer cài qua npm như bình thường:
# npm install @xom11/whiteboard@^0.14
```

## Gotchas (AI/DSL pipeline)

- **🎯 TRỌNG TÂM HIỆN TẠI (2026-06-09): tối ưu RULE BASE cho bài toán vẽ hình** — mở rộng phủ deterministic để LLM hiếm khi cần (LLM = chậm + tốn tiền). Mọi công việc AI/DSL ưu tiên hướng này.
- **✅ Dataset `cac-chuyen-de-va-bai-tap-tong-hop-hinh-hoc-9.txt` (2026-06-10): 6→18/20 = 90%.** Probe: `npx tsx scripts/diag-hinh9.ts full`. Còn MISS B16 (tia tiếp tuyến Ax/By + tiếp tuyến tại M cắt 2 tia), B19 (dây song song AD//BC — ràng buộc parallel giữa 2 dây) — khó, defer.
  - **BUG HỆ THỐNG đã fix**: `collectDeterministic` `.replace(c.text,' ')` cho proof-fragment NGẮN ("AB","AD" tách từ "Chứng minh AD.AC=AE.AB") replace occurrence ĐẦU TIÊN → nuốt "tam giác **AB**C"→"tam giác  C", mất đỉnh → transpile-fail. FIX: chỉ blank proof/locus clause CÓ geometry keyword (câu dài unique). Đây là root-cause nhiều bài "X không tồn tại".
  - **Vocab gap đã fix**: `vocabulary.ts` thiếu `'cung'`, `'chính giữa'`, `'tia đối'`/`'tia'` → clause arc/tia-đối bị `hasGeometry=false` → loại khỏi rule engine dù rule khớp. Khi rule khớp NHƯNG clause vẫn escalate "incomplete-coverage", NGHI vocab thiếu keyword.
  - **Rule MỚI batch này**: `circleExternalPoint` ("đường tròn (O) và điểm A ngoài" → circle nền + externalToCircle); `tangentNamedFromExt` ("Kẻ (các) tiếp tuyến AB, AC" / "Kẻ tiếp tuyến CD" — điểm ngoài=chữ đầu, tiếp điểm=chữ sau, which 0/1); `secant` (cát tuyến: gần=onCircle, xa=secondIntersection(ext+gần)); `oppositeRayPoint` ("tia đối của tia AB" → pointAtDistance from=B through=A); `perpChordAtFoot` ("dây DE ⊥ AB tại H", D neo → E=reflectLine, H=perpFoot); `diameterCircleSecant` ("đường tròn đường kính MC" KHÔNG tên tâm → circle kMC + cát tuyến other=đầu mút on-circle).
  - **Mở rộng rule cũ**: `onCirclePoint` ("thuộc (O)" bare, "điểm bất kỳ trên cung", "Trên cung XY lấy điểm Z"); `externalPoint` ("ngoài đường tròn" KHÔNG tên → resolve circle duy nhất); `perpFoot` ALTITUDE_BUNDLE separator "và" + SHARED_FROM_TWO ("I,K hình chiếu của H trên AC và BC"); `tangentAtCutsLines` SINGLE (cắt 1 đường); `incircleTangency` "cạnh" optional; `arcMidpoint` **notContaining/containing OPTIONAL** (nửa đường tròn — fix 7 site: compute/scene-constraint/DSL-kind/serialize/transpile-refs/describeDsl/builder); `chord` priority 52→71 (circle nền build trước điểm ngoài); `onSegmentPoint` bỏ BETWEEN khi clause có "cắt … tại" (tránh cycle với cát tuyến).
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
  - **Eval kết quả 2026-06-02** (`docs/superpowers/results/2026-06-02-eval-{4b,12b}-tier45.txt`): 12b F1=0.737 (target 0.91 không đạt). Bottleneck là LLM, không phải pipeline — Tier 5 (10+ intent/đề) cần `gemma3:27b` hoặc Claude. Pipeline + vocab đã ready để plug-in model lớn hơn.
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
- **JSXGraph point labels**: mặc định render bằng HTML `<div>` overlay → clone-SVG export missing labels. Fix: set `JXG.Options.text.display = 'internal'` (cả ở MiniBoard và offscreen restore).
- **CSS-in-JS từ Excalidraw**: `import '@excalidraw/excalidraw/index.css'` trong `ExcalidrawWhiteboardView.tsx`. Consumer Next.js handle CSS imports từ JS thông qua webpack/turbopack loader.
- **Tailwind v4 không scan node_modules**: consumer phải thêm `@source "../../../node_modules/@xom11/whiteboard/dist/**/*.{js,mjs}";` vào globals.css.
- **pdfjs-dist worker**: mặc định trỏ CDN `cdn.jsdelivr.net` theo version đã cài. Consumer offline-first phải gọi `configurePdfWorker(url)` trước lần dùng đầu tiên (vd self-host `pdf.worker.min.mjs`). pdfjs lazy-load chỉ khi user trigger PDF import.
- **Vision OCR (0.26.1+)**: `handleExtractProblem(image)` đọc đề từ ảnh. Default engine = **Tesseract.js** (client-side, offline, lazy load `vie+eng` traineddata ~13MB từ CDN lần đầu, cache IndexedDB). Vision LLM (Ollama/Anthropic) chuyển sang opt-in qua `{ engine: 'llm' }` cho handwriting / math symbols phức tạp. Browser cần `createImageBitmap` + `<canvas>.toBlob` (jsdom test environment không support — preprocess là smoke test only).
- **Tesseract CDN**: tesseract.js v7 mặc định fetch worker + traineddata từ `unpkg.com` + `tessdata.projectnaptha.com`. Offline-first consumer cần self-host (override `corePath`/`langPath` — chưa expose v0.26.1, TODO v0.27+).
- **Vision model (LLM path)**: chỉ áp dụng khi `engine: 'llm'`. `WHITEBOARD_AI_VISION_MODEL` env override; mặc định cùng model với DSL gen (Ollama `gemma3:4b` multimodal native, Anthropic `claude-opus-4-7` vision native).
- **Image cap**: client downscale max edge 2048px + cap encoded 4MB (Anthropic limit 5MB, buffer 1MB). HEIC iPhone không decode được browser → reject với hint convert JPEG.
- **Anthropic vision cost**: ~70đ/ảnh (1500 input tokens) — không rate-limit v1, doc qua env nếu cần cap.
- **AI providers (DSL/Intent gen)**: 4 options qua `WHITEBOARD_AI_PROVIDER` env:
  - `claude-agent-sdk` (0.26.1+, **default**) — official `@anthropic-ai/claude-agent-sdk`, OAuth subscription Pro/Max/Team (production OK). Cần `claude setup-token` + `CLAUDE_CODE_OAUTH_TOKEN` env. ~10-30s/call đề đơn giản, ~75s đề phức tạp. KHÔNG set `ANTHROPIC_API_KEY` chung (silent shadow OAuth). Smoke: `node scripts/smoke-agent-sdk.mjs`.
  - `anthropic` — production, cần `ANTHROPIC_API_KEY` từ console.anthropic.com (pay-per-token)
  - `claude-cli` — legacy, spawn `claude -p` subprocess + `--json-schema`. Chậm hơn agent-sdk ~5x (Claude Code context boot overhead). Smoke: `npx tsx scripts/smoke-claude-cli.ts [model]`.
  - `ollama` — local Gemma 3 4B/12B, free, cần `ollama serve` (fallback dev offline)
- **Agent SDK zod peer override**: `@anthropic-ai/claude-agent-sdk` declare peer `zod@^4` nhưng project xài zod 3. `package.json` overrides force SDK xài zod 3 — verified runtime OK 1547 test xanh. Khi upgrade zod 3→4 thì remove override.
- **Anthropic billing 2026-06-15**: programmatic call (Agent SDK + `claude -p` + third-party) chuyển "Agent SDK Credit Pool" tách subscription Interactive. Pro $20/Max $100/Max 20x $200 credit/tháng. Memory `reference-anthropic-agent-sdk-subscription` lưu chi tiết.

## Extracted from

`Hoctotbachkhoa/hoctotbachkhoa` (`apps/web/components/classroom/excalidrawBoard/`) — history preserved qua `git filter-repo`.
