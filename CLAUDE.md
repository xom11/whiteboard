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
│   │   │   ├── ToolbarInjector.tsx    ← (cũ: ToolbarStampInjector)
│   │   │   ├── useShortcuts.ts        ← (cũ: useStampShortcuts)
│   │   │   └── restoreStampFiles.ts   ← (cũ: restoreMathStampFiles)
│   │   ├── geometry-2d/
│   │   │   ├── index.tsx              ← StampType + Host
│   │   │   ├── serialize.ts
│   │   │   ├── render.ts
│   │   │   ├── renderInline.ts
│   │   │   └── editor/
│   │   │       ├── EditorPanel.tsx
│   │   │       ├── MiniBoard.tsx
│   │   │       ├── tools.tsx
│   │   │       ├── handlers.ts
│   │   │       ├── theme.ts
│   │   │       ├── transforms.ts
│   │   │       ├── LeftPanel.tsx
│   │   │       ├── PropertiesPopover.tsx
│   │   │       └── TransformParamPopover.tsx
│   │   ├── latex/
│   │   │   ├── index.tsx
│   │   │   ├── render.ts
│   │   │   └── editor/
│   │   │       ├── EditorPopover.tsx
│   │   │       └── LeftPanel.tsx
│   │   └── geometry-3d/
│   │       ├── index.tsx              ← StampType + Host
│   │       ├── serialize.ts
│   │       ├── render.ts
│   │       └── editor/
│   │           ├── EditorPanel.tsx
│   │           ├── MiniBoard3D.tsx
│   │           ├── tools.ts
│   │           ├── toolButtons.tsx
│   │           ├── handlers.ts
│   │           ├── theme.ts
│   │           └── LeftPanel.tsx
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

## Extracted from

`Hoctotbachkhoa/hoctotbachkhoa` (`apps/web/components/classroom/excalidrawBoard/`) — history preserved qua `git filter-repo`.
