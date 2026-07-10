# Lệnh dev harness: `demo` → `e2e:serve` + `dev:board` / `dev:figure` — Design

**Ngày:** 2026-07-10
**Trạng thái:** Đã chốt, đang triển khai
**Phạm vi:** repo `whiteboard`. Không đụng `src/` trừ 2 lỗi cú pháp trong file test (mục 8).

---

## 1. Vấn đề

`npm run demo` **không phải demo**. Nó là harness E2E:

- `scripts/demo/index.html` — `<title>Whiteboard Demo — E2E test harness</title>`
- `scripts/demo/main.tsx` — phơi `window.__wbApi`, `__wbSetBoardMounted`, `__wbInsertPages` cho Playwright; **tắt `StrictMode`** vì double-mount đua với `MiniBoard` khởi tạo JSXGraph bất đồng bộ → flaky trong headless Chromium
- `playwright.config.ts:31` — `command: 'npm run demo'`, `webServer` cho **8 spec** ở `tests/e2e/`

Cái tên lừa người đọc (nó đã lừa cả tác giả lẫn Claude trong phiên này) vào chỗ nghĩ đây là bản trưng bày có thể sửa bừa, trong khi nó là hạ tầng test.

Đồng thời, sau Mức 1 (`@xom11/whiteboard/studio`, merged `7a360af`) ta cần một chỗ **chạy thử trang "dán đề → ra hình"** trước khi viết nó ở repo `hoctotbachkhoa`.

## 2. Quyết định đã chốt

| Câu hỏi | Quyết định |
|---|---|
| Lệnh 2D hiện gì | Mô phỏng trang landing (không phải editor trần) |
| Nguyên mẫu sống ở đâu | `playground/` (Next.js) — cùng stack với consumer |
| Hình dạng lệnh | Hai lệnh, tự mở đúng trang |
| Số phận `demo` | Đổi tên `e2e:serve`; giữ `demo` làm alias **báo lỗi có hướng dẫn** |

## 3. Bảng lệnh sau thay đổi

```
e2e:serve   vite --config scripts/demo/vite.config.ts     (:5173, cho Playwright)
dev:board   node scripts/dev-playground.mjs /             (:3030, Whiteboard đầy đủ)
dev:figure  node scripts/dev-playground.mjs /ve-hinh      (:3030, trang dán đề)
demo        → in hướng dẫn rồi exit 1
```

Alias `demo` tồn tại vì ~15 tài liệu cũ vẫn bảo người đọc chạy nó. Thất bại kèm chỉ dẫn tốt hơn `command not found`.

**Tham chiếu SỐNG phải cập nhật** (5 chỗ):
- `playwright.config.ts:7-8` (comment), `:31` (`command`)
- `tests/e2e/README.md:29,34`
- `tests/e2e/graph-2d.spec.ts:15` (comment)
- `tests/e2e/geometry-3d.spec.ts:108` (comment)
- `docs/superpowers/specs/add-new-stamp-howto.md:211` (how-to còn dùng)

**KHÔNG cập nhật** các plan/spec có ngày tháng (`2026-05-*`, `2026-06-*`) — hồ sơ lịch sử, viết lại là làm sai lịch sử.

## 4. `scripts/dev-playground.mjs`

Nhận một route, làm ba việc:

1. Nếu `http://localhost:3030` **đã** phản hồi → chỉ mở URL, **không spawn**. Biến nhược điểm "hai lệnh tranh cổng" thành tính năng: đang chạy `dev:board`, gõ `dev:figure` ở terminal khác thì chỉ mở thêm tab.
2. Nếu chưa → spawn `npm run dev` với `cwd: playground/`, poll tới khi server trả lời, rồi mở URL.
3. Forward stdio; Ctrl-C giết tiến trình con; truyền tiếp exit code.

Mở trình duyệt theo `process.platform`: `open` (darwin) / `xdg-open` (linux) / `start` (win32). Không thêm dependency.

## 5. Route `/ve-hinh` — nguyên mẫu trang landing

`playground/app/ve-hinh/page.tsx`, `'use client'`.

Máy trạng thái bốn nhịp: `idle → generating → (figure | error)`, và `figure → editing`.

**Bắt buộc import qua subpath công khai** — đây là điểm mấu chốt:

```ts
import { GeometryStudio, geometryStateToJsonState, renderGeometrySvgFromState } from '@xom11/whiteboard/studio';
import { handleGenerateFigure } from '@xom11/whiteboard/ai';
import type { AiFigureUiResult } from '@xom11/whiteboard';
```

Không được `import … from '../../src/...'` như `playground/app/page.tsx:6` đang làm. Nếu trang phải với tay vào đường dẫn nội bộ để hoàn thành, đó là **bằng chứng Mức 1 còn thiếu export** — phát hiện ở đây, không phải ở giữa session bên `hoctotbachkhoa`.

**`handleGenerateFigure` gọi thẳng trong trình duyệt**, không qua `/api/` như `page.tsx` hiện tại. Đó là điều làm trang landing có chi phí biên bằng 0, và nó phải được chứng minh chạy được ở client.

Nhịp `figure` không mount editor: `geometryStateToJsonState(state)` → `renderGeometrySvgFromState(jsonState)` → hiện SVG tĩnh. Ba nút: **Tải SVG**, **Tải PNG** (canvas + `toBlob`), **Mở trong bảng trắng**.

Xử lý kết quả — ánh xạ thẳng từ `AiFigureUiResult`:

| Kết quả | Hành vi |
|---|---|
| `ok: true`, không `partial` | Hiện hình + 3 nút |
| `ok: true`, có `partial` | Hiện hình + banner dùng **nguyên văn** `partial.message`; CTA chính = "Sửa hình" |
| `ok: false` | Hiện `message`, **giữ đề trong textarea**, CTA "Tự vẽ trong editor" |

Nhịp `editing`: `<GeometryStudio initialJsonState={jsonState} onCommit={tảiẢnhVề} onClose={…} />`, `api` để trống.

## 6. Handoff — kiểm chứng hợp đồng chạy thật

`/ve-hinh` ghi `{ jsonState, ts }` vào `sessionStorage` khoá `htbk:figure-handoff:v1`, rồi `router.push('/')`.

`playground/app/page.tsx` đọc **đúng một lần** khi có `api`, **xoá khoá ngay**, bỏ qua bản ghi cũ hơn **5 phút**, rồi gọi `insertGeometryStampIntoScene(api, jsonState)`. Bọc `try/catch` quanh `setItem` (sessionStorage đầy sẽ ném).

Nhờ vậy toàn bộ hợp đồng handoff của Mức 1 — kể cả **double-click re-edit được** — được chạy thử ngay trong repo này trước khi viết ở consumer.

## 7. Alias + cổng typecheck cho playground

`playground/tsconfig.json`:
- `paths` thêm `@xom11/whiteboard/studio` → `../src/stamps/geometry-2d/studio/index.ts`, và `@xom11/whiteboard/ai` → `../src/stamps/geometry-2d/ai/index.ts`
- `exclude` thêm `../src/**/__tests__/**`, `../src/**/*.test.ts`, `../src/**/*.test.tsx` (khớp root `tsconfig.json`)

Script root: `"typecheck:playground": "tsc --noEmit -p playground/tsconfig.json"`.

Cần cổng riêng vì `playground/next.config.ts` đặt `typescript: { ignoreBuildErrors: true }` ⇒ `next build` **không** bắt được gì. Root `npm run typecheck` chỉ `include: ["src/**/*"]` ⇒ chưa từng chạm playground.

## 8. Lỗi cú pháp trong 2 file test (phát hiện khi đo, sửa vì nằm trên đường đi)

`tsc -p playground` lôi ra 4 lỗi `TS1005`, tất cả ở 2 file:

- `src/stamps/geometry-2d/ai/rules/__tests__/lineCircleIntersection.test.ts:124` — `}` thay vì `});` (đóng `describe(` mở ở `:15`)
- `src/stamps/geometry-2d/ai/rules/__tests__/onSegmentPoint.test.ts:91` — `}` thay vì `});` (đóng `describe(` mở ở `:12`)

**Vì sao 3686 test vẫn xanh:** `ts-jest` chạy `isolatedModules: true` + `diagnostics: false` (`jest.config.js`), nên `transpileModule` **phục hồi lỗi cú pháp và vẫn sinh JS**. Còn `tsc` không bao giờ nhìn thấy file test, vì root `tsconfig.json` `exclude` toàn bộ `__tests__`.

⇒ **Repo này không có cổng nào typecheck file test.** Đó là lý do hai lỗi sống sót.

Sửa hai file (mỗi file một ký tự). Nhưng **cổng `typecheck:tests` là việc riêng, ngoài phạm vi spec này** — nêu để mở issue.

## 8b. Bug đóng gói `sideEffects` — nguyên mẫu bắt được ngay lần chạy đầu

Đúng như mục 5 dự đoán, `/ve-hinh` lộ ra một lỗi thật ngay lần chạy đầu tiên.

**Triệu chứng:** rule engine dựng đúng (`p1..p5`, `poly1`, `c1`, `s1`) nhưng renderer in 8 warning `[scene/render/2d] không render được … Error: [scene] unknown kind: point` và SVG rỗng hoàn toàn. Registry kind **rỗng**.

**Nguyên nhân:** `src/core/scene/index.ts:35` có `import './kinds';` — side-effect thuần. Nhưng chính `index.ts` KHÔNG nằm trong `package.json` `sideEffects`, nên bundler coi nó thuần khiết và **nối tắt** `import { createStore } from '../../core/scene'` thẳng tới `./store`, bỏ qua `index.ts` ⇒ `import './kinds'` không bao giờ chạy. Khai `kinds/**` là vô ích vì không còn ai import tới đó.

Tái hiện ở **cả webpack lẫn turbopack**. Không phải lỗi của Turbopack.

**Bản đã publish KHÔNG dính** — và đó là may, không phải thiết kế: tsup gộp `registry` + toàn bộ `registerKind()` vào cùng `chunk-B4NJJZFR.mjs`, mà `JxgRenderer` import binding `getKind` từ chunk đó ⇒ chunk vẫn được nạp. Nếu một phiên bản tsup sau này tách hai thứ ra, consumer sẽ vỡ im lặng.

**Sửa:** thêm `"src/core/scene/index.ts"` vào `sideEffects` (commit `d0cca23`).

**Kiểm chứng:** trước 8 warning + 0 phần tử vẽ; sau 0 warning, hình có nhãn `A B C O M`, 7 ellipse, 4 line. Cổng bundle giữ nguyên `158.221B ≤ 220.000B`.

**Nợ:** không có test nào bắt được lớp lỗi này (jest không tree-shake; vite dev không tree-shake; cổng bundle chỉ soi `dist`, mà `dist` lại đúng). Cần một e2e trên playground — xem mục 10.

## 9. Tiêu chí xong

- `npm run typecheck` xanh, `npm test` xanh (3686), `npm run typecheck:playground` **xanh** (mới)
- `npx playwright test` xanh với `e2e:serve` (8 spec, không sửa spec nào ngoài comment)
- `npm run demo` in hướng dẫn, exit 1
- Chạy tay `npm run dev:figure`: dán một đề thật từ dataset → ra hình; đề dựng một phần → banner `partial.message`; "Mở trong bảng trắng" → hình xuất hiện ở `/` và **double-click re-edit được**
- `/ve-hinh` **không** import gì từ `../../src`

## 10. Không làm (và nợ để lại)

E2E cho `/ve-hinh` (Playwright đang trỏ vite :5173). Đụng `ignoreBuildErrors`. OCR, LLM, share link, deploy.

**Hai issue nên mở:**

1. **`typecheck:tests`** — repo không typecheck file test nào (root `exclude`, `ts-jest diagnostics:false`). Đó là lý do 2 lỗi `TS1005` sống sót qua 3686 test xanh (mục 8).
2. **E2E chống hồi quy tree-shaking** — không cổng nào bắt được lớp lỗi ở mục 8b: jest và vite dev không tree-shake, còn cổng bundle chỉ soi `dist` (vốn đang đúng nhờ may). Một spec Playwright chạy `/ve-hinh` dưới `next dev` (dán đề → khẳng định SVG có ≥1 `<ellipse>` và 0 warning `unknown kind`) sẽ khoá được nó.

---

## Phụ lục — dẫn chứng

| Khẳng định | Nguồn |
|---|---|
| `demo` là webServer của Playwright | `playwright.config.ts:31` |
| harness tắt StrictMode có chủ đích | `scripts/demo/main.tsx` (comment cuối file) |
| playground là Next.js :3030 | `playground/package.json` scripts |
| playground bỏ qua lỗi type khi build | `playground/next.config.ts` `typescript.ignoreBuildErrors` |
| root typecheck không chạm playground | `tsconfig.json` `include: ["src/**/*"]` |
| playground chỉ alias `@xom11/whiteboard` | `playground/tsconfig.json` `paths` |
| ts-jest nuốt lỗi cú pháp | `jest.config.js` — `diagnostics: false, isolatedModules: true` |
| page.tsx hiện gọi AI qua `/api/` | `playground/app/page.tsx` `fetch('/api/generate-figure')` |
