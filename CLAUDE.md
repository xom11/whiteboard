# CLAUDE.md

Project context cho Claude Code. Đọc file này trước khi làm việc với codebase.

## Tổng quan

**`@hoctotbachkhoa/whiteboard`** — Excalidraw-based whiteboard component cho HocTotBachKhoa classroom. Tách từ monorepo classroom thành package độc lập để cô lập bug + iterate nhanh.

- Bút/shape/text/import ảnh — qua Excalidraw 0.18
- Stamp **hình học** (📐) — JSXGraph editor + serialize JSON state để re-edit
- Stamp **LaTeX** (∑) — KaTeX render → SVG
- Roundtrip edit: double-click stamp → reopen editor với state cũ
- Persist qua sessionStorage (consumer handle); SVG files regenerate khi reload

## Cấu trúc

```
whiteboard/
├── src/
│   ├── index.ts                 ← public API: ExcalidrawWhiteboardView + types
│   ├── ExcalidrawWhiteboardView.tsx  ← main wrapper, sync teacher ↔ student, stamp lifecycle
│   ├── ExcalidrawWithMenus.tsx  ← Excalidraw + custom MainMenu/Footer/WelcomeScreen
│   ├── serialize.ts             ← pickSyncableAppState (subset cho real-time sync)
│   ├── types.ts                 ← re-export Excalidraw types + SyncableAppState/SceneSnapshot
│   └── stamp/
│       ├── ToolbarStampInjector.tsx   ← portal G/L buttons vào Excalidraw toolbar
│       ├── StampLeftPanel.tsx         ← Geometry + Latex left panels (tools, snippets)
│       ├── GeometryEditorPanel.tsx    ← floating center editor (forwardRef + handle)
│       ├── LatexEditorPopover.tsx     ← floating center editor cho LaTeX
│       ├── JSXGraphMiniBoard.tsx      ← JSXGraph board wrapper + tool state
│       ├── StampToolButtons.tsx       ← legacy buttons (sẽ cleanup)
│       ├── useStampShortcuts.ts       ← G/L global shortcuts (capture phase)
│       ├── renderLatexToSvg.ts        ← KaTeX → SVG string
│       ├── renderGeometryToSvg.ts     ← JSXGraph container → SVG string
│       ├── serializeBoard.ts          ← JSXGraph creation log → JSON
│       ├── restoreMathStampFiles.ts   ← regenerate SVG files sau reload
│       ├── svgToImageElement.ts       ← SVG → Excalidraw image element
│       ├── types.ts                   ← MathStampCustomData (latex | geometry)
│       └── index.ts                   ← stamp barrel
├── dist/                        ← tsup output (gitignored)
├── scripts/inject-use-client.mjs ← postbuild: prepend "use client" vào dist/*
├── tsup.config.ts
├── jest.config.js + jest.setup.ts
└── package.json
```

## Public API

```ts
import {
  ExcalidrawWhiteboardView,
  pickSyncableAppState,
  type ExcalidrawWhiteboardViewProps,
  type ExcalidrawSceneSnapshot,
  type SyncableAppState,
  type BinaryFiles,
  type ExcalidrawElement,
} from '@hoctotbachkhoa/whiteboard';
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

## Dev workflow với consumer (yalc)

```bash
# Local: link với hoctotbachkhoa/hoctotbachkhoa
npm run build
yalc publish --push   # auto-update mọi consumer đã `yalc add`

# Pin version chính thức
npm version patch
git push --follow-tags
# Consumer đổi package.json: "@hoctotbachkhoa/whiteboard": "git+ssh://git@github.com:Hoctotbachkhoa/whiteboard.git#v0.1.1"
```

## Conventions

### Code
- TypeScript strict, không dùng `any` nếu tránh được
- `"use client"` ở file có hook/event handler (Next.js App Router) — tsup banner config bị strip nên dùng `scripts/inject-use-client.mjs` postbuild
- Forward ref + `useImperativeHandle` cho editor panels (parent gọi `.insert()`, `.hasContent()`, etc.)
- Stable closures qua `useRef` (state thay đổi nhanh, handler không nên re-create)
- Capture phase + `stopPropagation` để win Excalidraw's bubble handlers (G/L shortcuts xung đột L=Line)

### Git
- Branch từ `main`: `feature/`, `bugfix/`, `hotfix/`, `refactor/`, `chore/`
- Commit message + PR description viết tiếng Việt (prefix giữ tiếng Anh: `feat`, `fix`, `chore`, `refactor`)
- Không push thẳng vào `main`
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
- **Tailwind v4 không scan node_modules**: consumer phải thêm `@source "../../../node_modules/@hoctotbachkhoa/whiteboard/dist/**/*.{js,mjs}";` vào globals.css.

## Extracted from

`Hoctotbachkhoa/hoctotbachkhoa` (`apps/web/components/classroom/excalidrawBoard/`) — history preserved qua `git filter-repo`.
