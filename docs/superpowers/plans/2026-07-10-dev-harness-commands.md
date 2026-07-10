# Lệnh dev harness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đổi `npm run demo` (thực chất là harness E2E) thành `e2e:serve`, và thêm `dev:board` / `dev:figure` mở playground Next để xem Whiteboard đầy đủ hoặc nguyên mẫu trang "dán đề → ra hình".

**Architecture:** `scripts/demo/` (vite, :5173) giữ nguyên vai trò harness Playwright, chỉ đổi tên lệnh. Nguyên mẫu landing sống ở `playground/app/ve-hinh/` (Next, :3030), **bắt buộc import qua subpath công khai** `@xom11/whiteboard/studio` + `/ai` để biến nó thành phép kiểm chứng sống rằng bề mặt export Mức 1 đủ dùng. Một script Node nhỏ spawn Next dev rồi mở đúng URL.

**Tech Stack:** Node ESM script (không thêm dependency), Next.js App Router (playground), Vite (harness), Playwright, TypeScript strict.

**Spec:** `docs/superpowers/specs/2026-07-10-dev-harness-commands-design.md`

## Global Constraints

- **KHÔNG đụng `src/`** trừ đúng 2 ký tự sửa lỗi cú pháp ở Task 3.
- **KHÔNG sửa** các plan/spec có ngày tháng (`docs/superpowers/{plans,specs}/2026-05-*`, `2026-06-*`) — hồ sơ lịch sử.
- `/ve-hinh` **không được** `import … from '../../src/...'`. Chỉ qua `@xom11/whiteboard/studio`, `@xom11/whiteboard/ai`, `@xom11/whiteboard`.
- 8 spec Playwright ở `tests/e2e/` phải xanh, **không sửa nội dung test** (chỉ sửa comment).
- Không thêm dependency mới.
- TypeScript strict; tránh `any` khi tránh được.
- Commit message tiếng Việt, prefix tiếng Anh (`chore`, `feat`, `fix`, `docs`, `test`).
- **KHÔNG** thêm `Co-Authored-By`.

## File Structure

| File | Trách nhiệm |
|---|---|
| `scripts/demo-renamed.mjs` (mới) | Alias `demo` — in hướng dẫn, exit 1 |
| `scripts/dev-playground.mjs` (mới) | Spawn Next dev :3030 (hoặc tái dùng) + mở URL |
| `package.json` (sửa) | `e2e:serve`, `dev:board`, `dev:figure`, `demo`, `typecheck:playground` |
| `playwright.config.ts` (sửa) | `command: 'npm run e2e:serve'` |
| `playground/tsconfig.json` (sửa) | `paths` cho `/studio` + `/ai`; `exclude` file test |
| `playground/app/ve-hinh/page.tsx` (mới) | Nguyên mẫu trang landing |
| `playground/app/page.tsx` (sửa) | Nhận handoff từ sessionStorage |

---

### Task 1: Đổi tên `demo` → `e2e:serve` + alias báo lỗi

**Files:**
- Create: `scripts/demo-renamed.mjs`
- Modify: `package.json` (scripts)
- Modify: `playwright.config.ts:7-8,31`
- Modify: `tests/e2e/README.md:29,34`
- Modify: `tests/e2e/graph-2d.spec.ts:15` (chỉ comment)
- Modify: `tests/e2e/geometry-3d.spec.ts:108` (chỉ comment)
- Modify: `docs/superpowers/specs/add-new-stamp-howto.md:211`

**Interfaces:**
- Produces: lệnh `npm run e2e:serve` (vite :5173) — Playwright `webServer` gọi nó.

- [ ] **Step 1: Tạo `scripts/demo-renamed.mjs`**

```js
// `npm run demo` cũ vốn KHÔNG phải demo — nó là harness E2E cho Playwright.
// Cái tên lừa người đọc, nên đã đổi. Giữ alias này để ~15 tài liệu cũ (và trí
// nhớ cơ bắp) thất bại kèm chỉ dẫn, thay vì `command not found` im lặng.
console.error(`
\`npm run demo\` đã đổi tên — nó vốn là harness E2E, không phải demo.

  npm run e2e:serve    harness cho Playwright (vite, :5173)
  npm run dev:board    xem Whiteboard đầy đủ (:3030)
  npm run dev:figure   xem trang "dán đề → ra hình" (:3030/ve-hinh)
`);
process.exit(1);
```

- [ ] **Step 2: Sửa `package.json` scripts**

Thay dòng `"demo": "vite --config scripts/demo/vite.config.ts",` bằng hai dòng:

```json
    "e2e:serve": "vite --config scripts/demo/vite.config.ts",
    "demo": "node scripts/demo-renamed.mjs",
```

- [ ] **Step 3: Sửa `playwright.config.ts`**

Dòng 7-8 (comment) — thay:
```
 * - `webServer` tự start vite demo (`npm run demo`) — port 5173, host 127.0.0.1
 *   (xem `scripts/demo/vite.config.ts`).
```
bằng:
```
 * - `webServer` tự start harness vite (`npm run e2e:serve`) — port 5173,
 *   host 127.0.0.1 (xem `scripts/demo/vite.config.ts`).
```

Dòng 31 — thay `command: 'npm run demo',` bằng `command: 'npm run e2e:serve',`

- [ ] **Step 4: Sửa 4 tham chiếu sống còn lại**

`tests/e2e/README.md:29` — `npm run demo` → `npm run e2e:serve`
`tests/e2e/README.md:34` — `Vite demo serve` → `Harness vite serve`
`tests/e2e/graph-2d.spec.ts:15` — `auto-start via \`npm run demo\`` → `auto-start via \`npm run e2e:serve\``
`tests/e2e/geometry-3d.spec.ts:108` — `trong \`npm run demo\`` → `trong \`npm run e2e:serve\``
`docs/superpowers/specs/add-new-stamp-howto.md:211` — `chạy demo (\`npm run demo\`)` → `chạy harness (\`npm run e2e:serve\`)`

- [ ] **Step 5: Xác minh alias báo lỗi đúng**

Run: `npm run demo; echo "exit=$?"`
Expected: in ba dòng hướng dẫn, `exit=1`.

- [ ] **Step 6: Xác minh Playwright vẫn chạy qua tên mới**

Run: `npx playwright test tests/e2e/smoke.spec.ts --reporter=list`
Expected: PASS. (Nếu chưa cài browser: `npx playwright install chromium` trước.)

- [ ] **Step 7: Commit**

```bash
git add scripts/demo-renamed.mjs package.json playwright.config.ts tests/e2e/README.md tests/e2e/graph-2d.spec.ts tests/e2e/geometry-3d.spec.ts docs/superpowers/specs/add-new-stamp-howto.md
git commit -m "chore(scripts): demo → e2e:serve (nó là harness Playwright, không phải demo)

Giữ \`demo\` làm alias báo lỗi có hướng dẫn: ~15 tài liệu cũ vẫn bảo chạy nó,
thất bại kèm chỉ dẫn tốt hơn command-not-found. Plan/spec có ngày tháng KHÔNG
sửa — hồ sơ lịch sử."
```

---

### Task 2: `scripts/dev-playground.mjs` + `dev:board` / `dev:figure`

**Files:**
- Create: `scripts/dev-playground.mjs`
- Modify: `package.json` (scripts)

**Interfaces:**
- Consumes: `playground/package.json` script `dev` = `next dev -H 0.0.0.0 -p 3030`.
- Produces: `npm run dev:board`, `npm run dev:figure`.

- [ ] **Step 1: Tạo `scripts/dev-playground.mjs`**

```js
// Chạy playground Next dev (:3030) rồi mở đúng route trong trình duyệt.
//
// Nếu :3030 ĐÃ phản hồi → chỉ mở tab, KHÔNG spawn. Nhờ vậy `dev:board` và
// `dev:figure` không tranh cổng: đang chạy cái này, gõ cái kia ở terminal khác
// thì nó chỉ mở thêm tab.
//
//   node scripts/dev-playground.mjs /
//   node scripts/dev-playground.mjs /ve-hinh
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const PORT = 3030;
const ORIGIN = `http://localhost:${PORT}`;
const route = process.argv[2] ?? '/';
const url = ORIGIN + route;

const here = path.dirname(fileURLToPath(import.meta.url));
const playgroundDir = path.resolve(here, '..', 'playground');

function openBrowser(target) {
  const cmd =
    process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  spawn(cmd, [target], {
    stdio: 'ignore',
    detached: true,
    shell: process.platform === 'win32',
  }).unref();
}

async function isUp() {
  try {
    const res = await fetch(ORIGIN, { method: 'HEAD' });
    return res.status < 500;
  } catch {
    return false;
  }
}

async function waitUntilUp(timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isUp()) return true;
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

if (await isUp()) {
  console.log(`[dev-playground] :${PORT} đã chạy — chỉ mở ${url}`);
  openBrowser(url);
  process.exit(0);
}

console.log(`[dev-playground] khởi động Next dev tại ${playgroundDir} …`);
const child = spawn('npm', ['run', 'dev'], { cwd: playgroundDir, stdio: 'inherit' });

const stop = () => child.kill('SIGINT');
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
child.on('exit', (code) => process.exit(code ?? 0));

if (await waitUntilUp()) {
  console.log(`[dev-playground] mở ${url}`);
  openBrowser(url);
} else {
  console.error(`[dev-playground] :${PORT} không lên sau 90s — xem log Next ở trên.`);
}
```

- [ ] **Step 2: Thêm hai script vào `package.json`**

Ngay sau `"demo"`:

```json
    "dev:board": "node scripts/dev-playground.mjs /",
    "dev:figure": "node scripts/dev-playground.mjs /ve-hinh",
```

- [ ] **Step 3: Xác minh script khởi động và server lên**

Run:
```bash
npm run dev:board > /tmp/devpg.log 2>&1 &
DEVPG=$!
until curl -sf -o /dev/null http://localhost:3030; do sleep 2; done
echo "server LÊN"
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3030
kill $DEVPG 2>/dev/null; pkill -f "next dev" 2>/dev/null
```
Expected: in `server LÊN` rồi `200`.

- [ ] **Step 4: Xác minh nhánh "đã chạy thì chỉ mở tab"**

Run (với server đang chạy ở terminal khác):
```bash
npm run dev:figure
```
Expected: in `[dev-playground] :3030 đã chạy — chỉ mở http://localhost:3030/ve-hinh` rồi **thoát ngay** (exit 0), không spawn Next thứ hai.

(Lúc này `/ve-hinh` chưa tồn tại → trình duyệt hiện 404 của Next. Đúng như mong đợi; Task 4 tạo route.)

- [ ] **Step 5: Commit**

```bash
git add scripts/dev-playground.mjs package.json
git commit -m "feat(scripts): dev:board / dev:figure mở playground đúng trang

Nếu :3030 đã chạy thì chỉ mở tab, không spawn — hai lệnh không tranh cổng."
```

---

### Task 3: Alias subpath + cổng `typecheck:playground` + sửa 2 lỗi cú pháp

**Files:**
- Modify: `src/stamps/geometry-2d/ai/rules/__tests__/lineCircleIntersection.test.ts:124`
- Modify: `src/stamps/geometry-2d/ai/rules/__tests__/onSegmentPoint.test.ts:91`
- Modify: `playground/tsconfig.json`
- Modify: `package.json` (script `typecheck:playground`)

**Interfaces:**
- Produces: `npm run typecheck:playground` — cổng duy nhất kiểm được playground, vì `playground/next.config.ts` đặt `typescript: { ignoreBuildErrors: true }` và root `tsconfig.json` chỉ `include: ["src/**/*"]`.
- Produces: alias `@xom11/whiteboard/studio` và `@xom11/whiteboard/ai` dùng được ở Task 4/5.

**Vì sao 2 file test lỗi cú pháp mà 3686 test vẫn xanh:** `jest.config.js` cấu hình `ts-jest` với `diagnostics: false, isolatedModules: true` → `transpileModule` **phục hồi lỗi cú pháp và vẫn sinh JS**. `tsc` không bao giờ thấy chúng vì root `exclude` toàn bộ `__tests__`. Repo không có cổng nào typecheck file test.

- [ ] **Step 1: Chứng minh lỗi tồn tại**

Run: `npx tsc --noEmit -p playground/tsconfig.json 2>&1 | grep -c "error TS"`
Expected: `4`

- [ ] **Step 2: Sửa `lineCircleIntersection.test.ts`**

Dòng 124 hiện là `}` (đóng `describe(` mở ở dòng 15). Thay bằng:
```ts
});
```

- [ ] **Step 3: Sửa `onSegmentPoint.test.ts`**

Dòng 91 hiện là `}` (đóng `describe(` mở ở dòng 12). Thay bằng:
```ts
});
```

- [ ] **Step 4: Sửa `playground/tsconfig.json`**

Trong `compilerOptions.paths`, thay khối `paths` bằng:

```json
    "paths": {
      "@xom11/whiteboard": [
        "../src/index.ts"
      ],
      "@xom11/whiteboard/studio": [
        "../src/stamps/geometry-2d/studio/index.ts"
      ],
      "@xom11/whiteboard/ai": [
        "../src/stamps/geometry-2d/ai/index.ts"
      ]
    }
```

Và thay `exclude` bằng (khớp root `tsconfig.json`):

```json
  "exclude": [
    "node_modules",
    "../src/**/__tests__/**",
    "../src/**/*.test.ts",
    "../src/**/*.test.tsx"
  ]
```

- [ ] **Step 5: Thêm script `typecheck:playground`**

Trong `package.json`, ngay sau `"typecheck"`:

```json
    "typecheck:playground": "tsc --noEmit -p playground/tsconfig.json",
```

- [ ] **Step 6: Xác minh cổng xanh**

Run: `npm run typecheck:playground`
Expected: không in lỗi, exit 0.

- [ ] **Step 7: Xác minh sửa cú pháp không đổi hành vi test**

Run: `npx jest src/stamps/geometry-2d/ai/rules/__tests__/lineCircleIntersection.test.ts src/stamps/geometry-2d/ai/rules/__tests__/onSegmentPoint.test.ts`
Expected: cả 2 suite PASS, **số test không đổi** (26 ở file thứ nhất).

Run: `npm test 2>&1 | tail -4`
Expected: `410 passed`, `3686 passed` (như trước khi sửa).

- [ ] **Step 8: Commit**

```bash
git add src/stamps/geometry-2d/ai/rules/__tests__/lineCircleIntersection.test.ts src/stamps/geometry-2d/ai/rules/__tests__/onSegmentPoint.test.ts playground/tsconfig.json package.json
git commit -m "fix(test): 2 file test đóng describe bằng '}' thay vì '});'

ts-jest (diagnostics:false, isolatedModules:true) phục hồi lỗi cú pháp và vẫn
sinh JS, còn root tsconfig exclude toàn bộ __tests__ ⇒ 3686 test xanh mà lỗi vẫn
sống. Lộ ra khi thêm typecheck:playground (playground include ../src/**/*).

+alias subpath /studio + /ai cho playground, +cổng typecheck:playground (next
build đặt ignoreBuildErrors:true nên không bắt được gì)."
```

---

### Task 4: Route `/ve-hinh` — nguyên mẫu trang landing

**Files:**
- Create: `playground/app/ve-hinh/page.tsx`

**Interfaces:**
- Consumes: alias từ Task 3.
- Consumes: `handleGenerateFigure({ problem })` → `AiFigureUiResult`; `geometryStateToJsonState(state) → string`; `renderGeometrySvgFromState(jsonState) → Promise<string>`; `GeometryStudio` props `{ initialJsonState?, onCommit, onClose, api?, isDark? }` với `onCommit` trả `false` = chưa commit.
- Produces: ghi `sessionStorage['htbk:figure-handoff:v1'] = JSON.stringify({ jsonState, ts })` rồi điều hướng `/` (Task 5 đọc).

**SSR gotcha (đã kiểm chứng):** `jsxgraph` KHÔNG nằm trong bao đóng import tĩnh của `dist/studio.mjs` (external chỉ có react, react-dom, immer, zod) ⇒ nó được nạp động. Nên import tĩnh hai hàm thuần là an toàn khi Next prerender client component. Riêng `GeometryStudio` render board nên vẫn qua `nextDynamic(..., { ssr: false })`, giống `playground/app/page.tsx:13-16` làm với `Whiteboard`.

- [ ] **Step 1: Tạo `playground/app/ve-hinh/page.tsx`**

```tsx
'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import nextDynamic from 'next/dynamic';
import { handleGenerateFigure } from '@xom11/whiteboard/ai';
import { geometryStateToJsonState, renderGeometrySvgFromState } from '@xom11/whiteboard/studio';

// Board chạm document lúc render → không prerender được.
const GeometryStudio = nextDynamic(
  () => import('@xom11/whiteboard/studio').then((m) => m.GeometryStudio),
  { ssr: false },
);

const HANDOFF_KEY = 'htbk:figure-handoff:v1';

type Phase =
  | { kind: 'idle' }
  | { kind: 'generating' }
  | { kind: 'figure'; jsonState: string; svg: string; partial?: string }
  | { kind: 'error'; message: string }
  | { kind: 'editing'; jsonState: string };

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** SVG → PNG qua canvas. Cố ý ở consumer: jsdom không có `canvas.toBlob`. */
async function svgToPngBlob(svg: string, scale = 2): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Không đọc được SVG'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth * scale;
    canvas.height = img.naturalHeight * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Không tạo được canvas 2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob trả null'))), 'image/png'),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function VeHinhPage() {
  const router = useRouter();
  const [problem, setProblem] = useState('');
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  // Giữ hình cuối để `onClose` của editor trả về đúng nhịp `figure` (kèm banner
  // partial). Vào editor từ nhánh `error` thì chưa có hình → trả về `idle`.
  const lastFigure = useRef<{ jsonState: string; svg: string; partial?: string } | null>(null);

  const generate = useCallback(async () => {
    if (!problem.trim()) return;
    setPhase({ kind: 'generating' });
    // Deterministic, chạy THẲNG trong browser — không /api/, không token.
    const result = await handleGenerateFigure({ problem });
    if (!result.ok) {
      setPhase({ kind: 'error', message: result.message });
      return;
    }
    const jsonState = geometryStateToJsonState(result.state);
    const svg = await renderGeometrySvgFromState(jsonState);
    const partial = result.partial?.message;
    lastFigure.current = { jsonState, svg, partial };
    setPhase({ kind: 'figure', jsonState, svg, partial });
  }, [problem]);

  const openInWhiteboard = useCallback(
    (jsonState: string) => {
      try {
        sessionStorage.setItem(HANDOFF_KEY, JSON.stringify({ jsonState, ts: Date.now() }));
      } catch {
        alert('Không lưu được (sessionStorage đầy). Hãy tải ảnh về thay thế.');
        return;
      }
      router.push('/');
    },
    [router],
  );

  if (phase.kind === 'editing') {
    return (
      <div style={{ width: '100vw', height: '100vh' }}>
        <GeometryStudio
          initialJsonState={phase.jsonState || undefined}
          onCommit={(_jsonState, svg) => {
            download(new Blob([svg], { type: 'image/svg+xml' }), 'hinh.svg');
          }}
          onClose={() =>
            setPhase(
              lastFigure.current
                ? { kind: 'figure', ...lastFigure.current }
                : { kind: 'idle' },
            )
          }
        />
      </div>
    );
  }

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: 24, fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 28, marginBottom: 4 }}>Dán đề hình học, xem hình ngay</h1>
      <p style={{ color: '#666', marginTop: 0 }}>
        Chạy hoàn toàn trong trình duyệt. Không gửi đề đi đâu cả.
      </p>

      <textarea
        value={problem}
        onChange={(e) => setProblem(e.target.value)}
        rows={5}
        placeholder="Cho tam giác ABC nội tiếp đường tròn (O). Gọi M là trung điểm BC…"
        style={{ width: '100%', padding: 12, fontSize: 16, fontFamily: 'inherit' }}
      />

      <button
        onClick={generate}
        disabled={phase.kind === 'generating' || !problem.trim()}
        style={{ marginTop: 12, padding: '10px 20px', fontSize: 16, cursor: 'pointer' }}
      >
        {phase.kind === 'generating' ? 'Đang dựng…' : 'Dựng hình'}
      </button>

      {phase.kind === 'error' && (
        <div style={{ marginTop: 20, padding: 12, background: '#fee', borderRadius: 6 }}>
          <p style={{ margin: 0 }}>{phase.message}</p>
          <button onClick={() => setPhase({ kind: 'editing', jsonState: '' })} style={{ marginTop: 8 }}>
            Tự vẽ trong editor
          </button>
        </div>
      )}

      {phase.kind === 'figure' && (
        <div style={{ marginTop: 20 }}>
          {phase.partial && (
            <div style={{ padding: 12, background: '#fff6e0', borderRadius: 6, marginBottom: 12 }}>
              <strong>Chưa dựng hết đề:</strong>
              <pre style={{ whiteSpace: 'pre-wrap', margin: '6px 0 0', fontFamily: 'inherit' }}>
                {phase.partial}
              </pre>
            </div>
          )}

          <div
            style={{ border: '1px solid #ddd', borderRadius: 6, padding: 8, background: '#fff' }}
            dangerouslySetInnerHTML={{ __html: phase.svg }}
          />

          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <button onClick={() => setPhase({ kind: 'editing', jsonState: phase.jsonState })}>
              {phase.partial ? 'Sửa hình (còn thiếu)' : 'Sửa hình'}
            </button>
            <button
              onClick={() => download(new Blob([phase.svg], { type: 'image/svg+xml' }), 'hinh.svg')}
            >
              Tải SVG
            </button>
            <button onClick={async () => download(await svgToPngBlob(phase.svg), 'hinh.png')}>
              Tải PNG
            </button>
            <button onClick={() => openInWhiteboard(phase.jsonState)}>Mở trong bảng trắng</button>
          </div>
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Xác minh không import gì từ `../../src`**

Run: `grep -n "\.\./\.\./src" playground/app/ve-hinh/page.tsx; echo "exit=$?"`
Expected: không in dòng nào, `exit=1` (grep không tìm thấy).

- [ ] **Step 3: Xác minh typecheck xanh**

Run: `npm run typecheck:playground`
Expected: exit 0.

Nếu đỏ vì thiếu export ⇒ **đó chính là phát hiện có giá trị**: bề mặt `/studio` chưa đủ. Ghi lại rồi báo, đừng lách bằng cách import `../../src`.

- [ ] **Step 4: Xác minh chạy thật**

Run: `npm run dev:figure`
Dán đề: `Cho tam giác ABC nội tiếp đường tròn (O). Gọi M là trung điểm BC.` → bấm **Dựng hình**.
Expected: hiện hình tam giác + đường tròn + điểm M. Bấm **Tải PNG** → tải về được ảnh.

- [ ] **Step 5: Commit**

```bash
git add playground/app/ve-hinh/page.tsx
git commit -m "feat(playground): route /ve-hinh — nguyên mẫu trang 'dán đề → ra hình'

Import CHỈ qua subpath công khai (@xom11/whiteboard/studio + /ai) ⇒ là phép kiểm
chứng sống rằng bề mặt export Mức 1 đủ dùng. handleGenerateFigure gọi thẳng ở
browser (không /api/, không token) — chứng minh chi phí biên = 0."
```

---

### Task 5: Nhận handoff ở `playground/app/page.tsx`

**Files:**
- Modify: `playground/app/page.tsx`

**Interfaces:**
- Consumes: `sessionStorage['htbk:figure-handoff:v1']` = `{ jsonState: string; ts: number }` (Task 4 ghi).
- Consumes: `insertGeometryStampIntoScene(api, jsonState)` từ root `@xom11/whiteboard`.

**Gotcha:** import root ở module scope sẽ kéo Excalidraw vào lúc prerender. Dùng **dynamic import trong handler**, giống cách file này đã `nextDynamic` cho `Whiteboard`.

- [ ] **Step 1: Sửa `playground/app/page.tsx`**

Thay toàn bộ nội dung:

```tsx
'use client';

import { useCallback, useState } from 'react';
import nextDynamic from 'next/dynamic';
import type {
  ExcalidrawSceneSnapshot,
  BinaryFiles,
  GenerateGeometryFigure,
} from '../../src';

// Excalidraw chạm `window` lúc load → không SSR/prerender được. ssr:false để
// chỉ render client. (Type imports ở trên bị erase nên an toàn cho server.)
const Whiteboard = nextDynamic(
  () => import('../../src').then((m) => m.Whiteboard),
  { ssr: false },
);

const HANDOFF_KEY = 'htbk:figure-handoff:v1';
const HANDOFF_TTL_MS = 5 * 60 * 1000;

/**
 * Nhận hình từ /ve-hinh: đọc ĐÚNG MỘT LẦN, xoá khoá ngay, bỏ qua bản ghi cũ hơn
 * 5 phút (một tab bỏ quên từ hôm trước không được bất ngờ chèn hình vào bảng
 * đang dạy).
 */
async function consumeHandoff(api: unknown) {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(HANDOFF_KEY);
    if (raw) sessionStorage.removeItem(HANDOFF_KEY);
  } catch {
    return;
  }
  if (!raw) return;

  let payload: { jsonState?: unknown; ts?: unknown };
  try {
    payload = JSON.parse(raw);
  } catch {
    return;
  }
  if (typeof payload.jsonState !== 'string' || typeof payload.ts !== 'number') return;
  if (Date.now() - payload.ts > HANDOFF_TTL_MS) return;

  // Dynamic import: root kéo Excalidraw, không prerender được ở module scope.
  // Dùng tên package (alias → ../src/index.ts) để chứng minh export root có thật.
  const { insertGeometryStampIntoScene } = await import('@xom11/whiteboard');
  await insertGeometryStampIntoScene(api, payload.jsonState);
}

export default function PlaygroundPage() {
  const [, setScene] = useState<ExcalidrawSceneSnapshot | null>(null);
  const [, setFiles] = useState<BinaryFiles>({});

  const handleSceneChange = useCallback((snapshot: ExcalidrawSceneSnapshot) => {
    setScene(snapshot);
  }, []);

  const handleFilesChange = useCallback((next: BinaryFiles) => {
    setFiles(next);
  }, []);

  const handleApi = useCallback((api: unknown) => {
    void consumeHandoff(api);
  }, []);

  // Bridge AI: gọi API route server-side (token ở server local, không ra browser).
  const generateGeometryFigure = useCallback<GenerateGeometryFigure>(
    async (problem, options) => {
      const res = await fetch('/api/generate-figure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem }),
        signal: options.signal,
      });
      return res.json();
    },
    [],
  );

  return (
    <div className="h-screen w-screen">
      <Whiteboard
        storageKey="playground"
        onApi={handleApi}
        onSceneChange={handleSceneChange}
        onFilesChange={handleFilesChange}
        generateGeometryFigure={generateGeometryFigure}
      />
    </div>
  );
}
```

- [ ] **Step 2: Xác minh typecheck xanh**

Run: `npm run typecheck:playground`
Expected: exit 0.

Nếu `onApi` không có trong `WhiteboardProps` ⇒ DỪNG, báo lại (`scripts/demo/main.tsx` dùng `onApi` nên nó phải tồn tại).

- [ ] **Step 3: Xác minh handoff chạy thật (end-to-end thủ công)**

Run: `npm run dev:figure`
1. Dán `Cho tam giác ABC nội tiếp đường tròn (O).` → **Dựng hình**
2. Bấm **Mở trong bảng trắng** → điều hướng sang `/`
3. Expected: hình xuất hiện trong scene Excalidraw
4. **Double-click vào hình** → editor hình học mở lại với đúng hình đó (re-edit được)
5. Bấm F5 ở `/` → hình **không** bị chèn lần thứ hai (khoá đã xoá)

- [ ] **Step 4: Commit**

```bash
git add playground/app/page.tsx
git commit -m "feat(playground): nhận handoff hình từ /ve-hinh qua sessionStorage

Đọc đúng một lần, xoá khoá ngay, bỏ qua bản ghi > 5 phút. Chạy thử TOÀN BỘ hợp
đồng handoff của Mức 1 (kể cả double-click re-edit) trước khi viết ở consumer."
```

---

## Xác minh cuối (sau cả 5 task)

```bash
npm run typecheck && npm run typecheck:playground && npm test && npx playwright test
```
Expected: tất cả xanh; `npm test` vẫn `410 passed / 3686 passed`.

## Ngoài phạm vi

E2E cho `/ve-hinh` (Playwright đang trỏ vite :5173). Đụng `ignoreBuildErrors`. Cổng `typecheck:tests` — **nên mở issue riêng**: repo hiện không typecheck file test nào, đó là lý do 2 lỗi cú pháp sống sót qua 3686 test xanh.
