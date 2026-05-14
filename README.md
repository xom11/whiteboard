# @hoctotbachkhoa/whiteboard

Excalidraw-based whiteboard component dùng cho HocTotBachKhoa classroom: bút/shape/text/import ảnh + hai stamp tools (hình học JSXGraph, công thức LaTeX KaTeX).

## Install

```bash
npm install @hoctotbachkhoa/whiteboard
```

Peer deps: `react >=18`, `react-dom >=18`, `next >=14`.

## Usage

```tsx
import { ExcalidrawWhiteboardView, type ExcalidrawSceneSnapshot } from '@hoctotbachkhoa/whiteboard';

export function ClassroomBoard() {
  return (
    <ExcalidrawWhiteboardView
      role="teacher"
      roomId="room-123"
      initialScene={null}
      remoteScene={null}
      onSceneChange={(snapshot) => { /* persist + broadcast */ }}
      onFilesChange={(files, newIds) => { /* upload new files */ }}
    />
  );
}
```

## Development

```bash
npm install
npm test
npm run build      # tsup → dist/{index.js, index.mjs, index.d.ts}
npm run dev        # tsup watch mode
```

## Local linking (yalc)

Trong khi iterate cùng với app consumer (vd. `hoctotbachkhoa/hoctotbachkhoa`):

```bash
# trong whiteboard repo
npm run build
yalc publish

# trong consumer repo
yalc add @hoctotbachkhoa/whiteboard
npm install
```

Khi sửa whiteboard, `yalc publish --push` sẽ auto-update consumer.

Để chốt version chính thức (sau khi PR vào main):

```bash
npm version patch        # bump version
git push --follow-tags
# consumer pin version mới trong package.json
```

## Architecture

- `src/ExcalidrawWhiteboardView.tsx` — main wrapper, quản lý sync teacher ↔ student, stamp lifecycle.
- `src/ExcalidrawWithMenus.tsx` — Excalidraw + custom MainMenu/Footer/WelcomeScreen.
- `src/stamp/` — hai stamp tools (hình học, LaTeX) + helpers (JSXGraph board, KaTeX renderer, serialize/restore).
- `src/serialize.ts` — pick sync-able subset của Excalidraw appState.
- `src/types.ts` — re-export Excalidraw types + project types.

## Extracted from

`Hoctotbachkhoa/hoctotbachkhoa` (apps/web/components/classroom/excalidrawBoard/) — git history preserved via `git filter-repo`.
