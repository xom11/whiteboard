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

### Peer dependencies

Từ phiên bản này, `@excalidraw/excalidraw`, `jsxgraph` và `katex` được externalize khỏi bundle (giảm bundle ~70%). Consumer **bắt buộc** cài kèm:

```bash
npm install @excalidraw/excalidraw@^0.18.1 jsxgraph@^1.12.2 katex@^0.16.45 react@>=18 react-dom@>=18
```

Hoặc thêm vào `package.json` của consumer:

```json
{
  "dependencies": {
    "@excalidraw/excalidraw": "^0.18.1",
    "jsxgraph": "^1.12.2",
    "katex": "^0.16.45",
    "react": ">=18",
    "react-dom": ">=18"
  }
}
```

Lý do externalize:

- **Tránh duplicate React** khi consumer cũng dùng Excalidraw trực tiếp.
- **Bundle nhẹ hơn ~70%** (jsxgraph ~600KB + katex ~280KB + excalidraw ~2MB không còn nằm trong dist của whiteboard).
- **Consumer kiểm soát version** + dedupe qua npm/pnpm tự nhiên.

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

### AI dựng hình học 2D (opt-in)

Textarea AI chỉ xuất hiện khi truyền `generateGeometryFigure`. Callback chạy từ client nên phải gọi server boundary của ứng dụng; không bao giờ đặt API key vào component / biến môi trường public.

```tsx
'use client';

import { Whiteboard, type GenerateGeometryFigure } from '@xom11/whiteboard';

const generateGeometryFigure: GenerateGeometryFigure = async (problem, { signal }) => {
  const response = await fetch('/api/geometry/ai', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ problem }),
    signal,
  });
  return response.json();
};

export function ClassroomBoard() {
  return <Whiteboard generateGeometryFigure={generateGeometryFigure} />;
}
```

#### Provider backend (chọn 1)

Từ phiên bản hỗ trợ multi-provider, có 2 lựa chọn:

**A. Local Gemma 3 qua Ollama (mặc định, miễn phí, không cần API key)**

Setup máy chạy server:

```bash
# macOS
brew install ollama
ollama serve                 # chạy nền cổng 11434
ollama pull gemma3:4b        # ~3.3GB Q4, chạy tốt trên M4 16GB

# Linux
curl -fsSL https://ollama.com/install.sh | sh
ollama serve &
ollama pull gemma3:4b
```

Server-side route Next.js:

```ts
import { generateFigure } from '@xom11/whiteboard/ai';

export async function POST(request: Request) {
  const { problem } = await request.json();
  // Default: provider=ollama, model=gemma3:4b, baseUrl=http://localhost:11434
  const result = await generateFigure(problem);
  return Response.json(
    result.ok ? { ok: true, state: result.state } : { ok: false, message: result.message },
  );
}
```

Env override (optional):

```bash
WHITEBOARD_AI_PROVIDER=ollama          # default
OLLAMA_BASE_URL=http://localhost:11434 # default
OLLAMA_DEFAULT_MODEL=gemma3:4b         # default; gemma3:1b nhẹ hơn nhưng kém chính xác
```

**B. Anthropic Claude (chính xác cao, tốn API cost)**

```ts
import { generateFigure } from '@xom11/whiteboard/ai';

const result = await generateFigure(problem, {
  apiKey: process.env.ANTHROPIC_API_KEY ?? '',
});
```

Hoặc qua env:

```bash
WHITEBOARD_AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
```

**C. Provider tuỳ biến** (vd OpenAI, OpenRouter, vLLM): implement interface `AIProvider`:

```ts
import { generateFigure, type AIProvider } from '@xom11/whiteboard/ai';

const customProvider: AIProvider = {
  name: 'my-llm',
  defaultModel: 'my-model',
  async call(req) {
    // req.systemPrompt, req.userPrompt, req.schema (JSON Schema cho envelope)
    // ...
    return { kind: 'json', data: envelopeObject };
  },
};

const result = await generateFigure(problem, { provider: customProvider });
```

#### Smoke test local Ollama

```bash
brew install ollama && ollama serve & ollama pull gemma3:4b
OLLAMA_SMOKE=1 npx jest ollama.smoke
```

## Migration to v0.8.0 (geometry-3d redesign)

`geometry3dStamp` được viết lại theo UX của GeoGebra 3D Calculator:

- Click trên mặt nền / trục / mặt phẳng / mặt cầu để **đặt điểm constraint** (không còn prompt nhập toạ độ).
- **Drag điểm** trên Move tool — điểm trượt theo surface (z-axis chỉ thay đổi z, mặt nền giữ z=0).
- **Algebra panel** mới (tab bên trái) hiển thị mỗi object: label, biểu thức symbolic, giá trị numeric, menu ⋮ (đổi tên / màu / ẩn / xoá).
- 16 tool: Move, Point, Point-on-Object, Segment, Line, Ray, Vector, Polygon, Plane (3 điểm), Pyramid, Prism, Tetrahedron, Cube, Sphere, Cylinder, Cone.

**Backward compat**: Stamps lưu từ v0.7.0 load OK (legacy points → constraint free). API consumer giữ nguyên.

**Tạm thời bỏ**: Chord-shortcut 2 phím (`G S` cho segment, v.v.) — sẽ trở lại với letter-mapping mới.

## Migration to v0.7.0 (BREAKING)

`DEFAULT_STAMPS` v0.7.0 chỉ gồm 2 stamps stable: `geometry` + `latex`. 3D + graph2d chuyển sang opt-IN (experimental).

### Giữ behavior cũ (4 stamps):

```tsx
import { Whiteboard, ALL_STAMPS } from '@xom11/whiteboard';

<Whiteboard stamps={ALL_STAMPS} />
```

### Chỉ thêm 3D (giữ default + 3D):

```tsx
import { Whiteboard, DEFAULT_STAMPS, geometry3dStamp } from '@xom11/whiteboard';

<Whiteboard stamps={[...DEFAULT_STAMPS, geometry3dStamp]} />
```

### Subpath imports (tree-shake):

Mỗi stamp có thể import riêng để bundle nhẹ hơn:

```tsx
import { Whiteboard } from '@xom11/whiteboard';
import { geometryStamp } from '@xom11/whiteboard/geometry-2d';
import { latexStamp } from '@xom11/whiteboard/latex';

<Whiteboard stamps={[geometryStamp, latexStamp]} />
```

### Drop Next.js peer dep

`next` không còn là peer dependency. Whiteboard dùng `React.lazy + Suspense` thuần. Consumer cần Next.js App Router vẫn hoạt động (dist có sẵn `'use client'` directive).

## Extending — thêm stamp mới

Fork repo + viết stamp mới trong ~30 phút. Tham khảo:

- **Howto:** [`docs/superpowers/specs/add-new-stamp-howto.md`](./docs/superpowers/specs/add-new-stamp-howto.md) — 6 bước có sẵn lệnh.
- **Template:** [`examples/stamp-template/`](./examples/stamp-template/) — skeleton "color-swatch" stamp, copy + đổi `kind`.
- **Contract test:** mỗi stamp PHẢI pass `runStampContract` (xem [`src/stamps/shared/__tests__/stamp-contract.ts`](./src/stamps/shared/__tests__/stamp-contract.ts)) để đảm bảo `matchesCustomData` / `renderSvgFromCustomData` / roundtrip restore không break.
- **Catalog:** thêm entry vào [`src/stamps/shared/catalog.ts`](./src/stamps/shared/catalog.ts). Bundle size tự tính qua `scripts/build-catalog.mjs` khi `npm run build`.

```tsx
import { STAMP_CATALOG, findCatalogEntry } from '@xom11/whiteboard';

// Render admin UI từ catalog
STAMP_CATALOG.forEach((entry) => {
  console.log(entry.id, entry.title, entry.bundleSize.js + 'KB gzip');
});
```

## Development

```bash
npm install
npm test
npm run build      # tsup → dist/{index.js, index.mjs, index.d.ts}
npm run dev        # tsup watch mode
```

## E2E tests

Playwright smoke tests chạy qua headless Chromium, tự start vite demo:

```bash
npx playwright install chromium    # cài browser binary (chỉ làm 1 lần)
npm run test:e2e                   # chạy specs
```

Chi tiết xem [`tests/e2e/README.md`](./tests/e2e/README.md).

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
