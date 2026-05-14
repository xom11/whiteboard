# @xom11/whiteboard

Excalidraw-based whiteboard component dùng cho HocTotBachKhoa classroom: bút/shape/text/import ảnh + hai stamp tools (hình học JSXGraph, công thức LaTeX KaTeX).

## Install

Cài qua git URL (repo public, không cần npm publish):

```bash
# pin tag (recommended)
npm install github:xom11/whiteboard#v0.2.0

# hoặc trong package.json
"@xom11/whiteboard": "github:xom11/whiteboard#v0.2.0"
```

Peer deps: `react >=18`, `react-dom >=18`, `next >=14`.

## Usage

```tsx
import { ExcalidrawWhiteboardView, type ExcalidrawSceneSnapshot } from '@xom11/whiteboard';

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

## Workflow phát hành phiên bản mới

`npm ci --ignore-scripts` ở consumer skip prepare hook → phải commit `dist/`:

```bash
npm run build
git add dist/
git commit -am "release vX.Y.Z"
npm version patch        # bump package.json + tạo tag
git push --follow-tags
```

Consumer pin tag mới trong `package.json` rồi `npm install`.

## Architecture

- `src/ExcalidrawWhiteboardView.tsx` — main wrapper, quản lý sync teacher ↔ student, stamp lifecycle.
- `src/ExcalidrawWithMenus.tsx` — Excalidraw + custom MainMenu/Footer/WelcomeScreen.
- `src/stamp/` — hai stamp tools (hình học, LaTeX) + helpers (JSXGraph board, KaTeX renderer, serialize/restore).
- `src/serialize.ts` — pick sync-able subset của Excalidraw appState.
- `src/types.ts` — re-export Excalidraw types + project types.

## Extracted from

`Hoctotbachkhoa/hoctotbachkhoa` (apps/web/components/classroom/excalidrawBoard/) — git history preserved via `git filter-repo`. Repo sau đó transfer từ `Hoctotbachkhoa/whiteboard` sang `xom11/whiteboard` (v0.2.0 trở đi).
