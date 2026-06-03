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

- **LLM nhỏ (Gemma 4B) hay bịa DSL** dù prompt có MANDATORY rule + ví dụ. Pipeline đã có 3 lớp chống bias trong `src/stamps/geometry-2d/ai/`:
  1. `prompt.ts` — section "BẮT BUỘC" + bảng từ khoá→kind + anti-pattern tam-giác-vuông-tại-gốc.
  2. `validator.ts` `extractRequirements()` — regex Vietnamese keyword → JSON stub cho mid/perpFoot/centroid/ortho/circum/incenter/circle3.
  3. `validator.ts` `applyDeterministicCompletion()` — inject/replace stub vào DSL **TRƯỚC** transpile (LLM-independent fallback).
- Khi thêm primitive kind mới: cập nhật cả 3 nơi + thêm fixture vào `dsl/fixtures/` để embed vào system prompt.
- Eval suite: `npx tsx scripts/eval-ollama.ts gemma3:4b` (cần Ollama local). Đạt 8/8 kind accuracy với commit `9e10a5e` (2026-06-01).
- **Tier 4+5 (đề thi vào 10 thường + chuyên)** — Intent pipeline mở rộng 2026-06-02 (v0.25.0):
  - +2 op intent: `draw-line` (perpThrough/parallelThrough/tangentAt/tangentFromExt), `mark-shape` (sub-shape từ điểm có sẵn).
  - +3 circle spec: centerRadius, inscribedIn (+ centerThrough, through3 cũ).
  - +5 add-point constraint: secondIntersection, circleIntersection, tangencyPoint, tangentPoint, angleBisectorFoot.
  - +6 DSL kind: secondIntersection/circleIntersection/tangencyPoint/tangentPointExt (points) + circleCR/incircle (circles).
  - Stage 4 verify thêm `computeIntentMetrics(expected, actual)` → recall/precision/F1 + `verifyGeometric(dsl)` cho on-circle check (3 check khác defer).
  - Eval: `npx tsx scripts/eval-intent.ts gemma3:12b` — 30 cũ + 15 Tier 4/5 mới.
  - **Eval kết quả 2026-06-02** (`docs/superpowers/results/2026-06-02-eval-{4b,12b}-tier45.txt`): 12b F1=0.737 (target 0.91 không đạt). Bottleneck là LLM, không phải pipeline — Tier 5 (10+ intent/đề) cần `gemma3:27b` hoặc Claude. Pipeline + vocab đã ready để plug-in model lớn hơn.
  - `buildFigure` (DSL free-form) **@deprecated** — sẽ remove ở 0.26.0. UI nên switch sang `handleGenerateFigureIntent`.

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
- **AI providers (DSL/Intent gen)**: 3 options qua `WHITEBOARD_AI_PROVIDER` env:
  - `ollama` (default) — local Gemma 3 4B/12B, free, cần `ollama serve`
  - `anthropic` — production, cần `ANTHROPIC_API_KEY` từ console.anthropic.com (pay-per-token)
  - `claude-cli` — **dev/eval only**, spawn `claude` CLI subprocess, charge vào quota Pro/Max/Team subscription. Cần `claude setup-token` cài sẵn ở máy. KHÔNG dùng cho production third-party app (vi phạm ToS Anthropic 02/2026). Smoke: `npx tsx scripts/smoke-claude-cli.ts [model]`.

## Extracted from

`Hoctotbachkhoa/hoctotbachkhoa` (`apps/web/components/classroom/excalidrawBoard/`) — history preserved qua `git filter-repo`.
