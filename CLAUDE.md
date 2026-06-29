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

- **✅ DATASET julielltv MỞ RỘNG 2026-06-20 (29→152 bài, 2 commit `chore/julielltv-more-pages`):** crawler MỚI `scripts/extract-julielltv.mjs` (tái dùng, KHÔNG cần markitdown — fetch trực tiếp category page WordPress). (1) **Vét hết category chính `hinh-hoc-phang`** page 1–10 = 97 permalink → 96 bài (bài `geometry-91` rỗng, chỉ nút share). LaTeX decode từ `<img latex.php?latex=…>` → `$…$`; tách đề/lời giải ở mốc "Lời giải"; tên cuộc thi từ "Bài toán (…)". (2) **+4 category HH khác, CHỈ giữ bài tác giả CÓ VẼ HÌNH** (`<img>` `wp-content/uploads|files.wordpress.com`, loại `latex.php`) — lưu kèm URL ảnh ở field `figures[]`: `cac-dinh-li-hinh-hoc` 11, `su-thang-hang-cac-duong-dong-quy` 21, `ti-so-kep-hang-diem-dieu-hoa` 21, `he-thuc-luong-trong-tam-giac` 5 (phần lớn metric không-hình → filter bỏ). Dedup theo URL, append id nối tiếp. **GOTCHA: vài bài là ĐỊNH LÍ/lý thuyết (Mixtilinear/Simson/Steiner/Kirkman) — có hình nên đã giữ; statement lẫn "Định nghĩa/Định lí" preamble, KHÔNG phải dạng "Cho…Chứng minh" sạch.** diag-all FULL 2/29→23/152 (15%) — đề Olympiad nên FULL thấp là đúng, giá trị = đo đa dạng + lộ phrasing-gap (xem metric NONE/PARTIAL). Chạy lại: `node scripts/extract-julielltv.mjs [--cats=a,b] [--no-figure] [--write]`.
- **🎯 TRỌNG TÂM HIỆN TẠI (2026-06-09): tối ưu RULE BASE cho bài toán vẽ hình** — mở rộng phủ deterministic để LLM hiếm khi cần (LLM = chậm + tốn tiền). Mọi công việc AI/DSL ưu tiên hướng này.
- **📦 DATASET MỚI 2026-06-20 (commit `0d331a4` trên main; probe corpus → ~1741 bài, 15 dataset) — KHO TỐI ƯU KẾ TIẾP:** thu thập qua **4 worktree subagent SONG SONG** (search toanmath → `curl` PDF → `.venv/bin/markitdown` → cổng chất lượng text-layer → extract `Câu N:` → ghi `.txt` ra scratchpad dùng chung, KHÔNG đụng git/`diag-all`; coordinator wire tập trung tránh xung đột merge). 4 dataset (wired sẵn vào `scripts/diag-all.ts`):
  - `hsg9` (`docs/datasets/hsg-toan9-hinh.txt`, **364 bài**, HSG Toán 9 huyện/quận + bồi dưỡng) — **99/364 FULL** → còn 265 bài để mine.
  - `chuyen13` (`13-chuyen-de-vao10.txt`, 44 bài) — 16/44.
  - `vao10hcm` (`vao10-tinh-hcm.txt`, 36 bài, đề vào 10 + tham khảo TP.HCM) — 8/36.
  - `phieu9` (`phieu-duong-tron-9.txt`, 33 bài, "Phiếu BT Toán 9 chương đường tròn") — 9/33.
  Bắt đầu tối ưu: `npx tsx scripts/diag-all.ts` → đọc `.work/escalations.json` lọc 4 dataset này (reason `incomplete-coverage`/`transpile-fail`/`named-missing`) → gom cụm phrasing sạch → `npx tsx scripts/dbg-bai.ts <ds> <id>` xác minh self-contained → TDD rule. **GOTCHA julielltv 29→152 bài (crawler `chore/julielltv-more-pages`) đã merge vào main TRƯỚC batch này — đừng nhầm chênh lệch total probe.**
  - **CRASH-FIX kèm theo (data mới = fuzzer, lặp lại bài học cũ):** `hsg9:306` "Cho đường tròn **tâm (O)** bán kính R" → capture tâm `([^\s;,).:]+)` lọt dấu `(` (tâm đứng TRƯỚC ngoặc) → tên tâm `(O` nội suy vào `new RegExp()` (isInscribedCircumscribed/isDiameterCircle/findParenClauseId) → "Unterminated group" crash CẢ pipeline. Fix: `escapeRe(center)` (pattern chuẩn `s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')` — đã có ở chord/namedLine/onCirclePoint) bọc **5 site** trong `circleRadius.ts`. **MỌI `new RegExp(\`...${name}...\`)` PHẢI escape tên — bug-class lặp liên tục.**
- **✅ BATCH 2026-06-15 (4 commit, 342→350/792 baseline, 0 regression — 2742 ai test xanh; +julielltv dataset → probe 821 bài):** funnel diag-all → cụm sạch. (1) **GỠ DEFER "2 đường tròn tự do giao nhau" (lâu năm trong CLAUDE.md "cần builder")** — hoá ra LỖI THỜI: hạ tầng `circleIntersection` (intent schema + add-point builder + editor tool + render + **`repairCircleIntersections`** chạy trong `intentToDsl`, có từ fix eval cau-08) ĐÃ đủ; chỉ thiếu RULE. `twoCirclesMeet` (MỚI, priority 74): "Cho hai đường tròn (O) và (O') cắt nhau tại A,B" → 2 circleCR free + A,B circleIntersection(0/1); repair dời tâm free để thực-giao; guard 2 tâm khác tên (OCR rơi prime). **Bài học: trước khi tin DEFER "cần builder", grep hạ tầng — có thể đã được trả nợ ở fix khác.** (2) `lineCircleIntersection` +`LINE_TWO_CIRCLES` ("AO cắt (O),(O') lần lượt ở C,D" → 2 secondIntersection, A là điểm chung, giữ prime line "AO'") + `CIRCLE_SUBJECT` ("(O) cắt XY tại Z" đảo SINGLE). (3) **`normalizeText` prime cong ’/′/´ sau chữ-số → ASCII '** (`PRIME_VARIANT`, canonical toàn cục — fix vao10:174 dùng U+2019; rule cũ `['′]` vẫn khớp nhánh '). (4) `pointOnTangentAt` (MỚI): "Trên tiếp tuyến (của (O))? tại A lấy điểm M" → tạo line tA + M onSegment (mở khoá cascade). (5) `pointOnTangentRay` +đảo "Trên tia Bx lấy điểm M"/"điểm M trên Ax" (guard ray ∈ tiếp-tuyến-đặt-tên toàn đề). (6) `onCirclePoint` +"Trên cung (lớn/nhỏ)? XY lấy hai điểm C,D". (7) `perpFoot` PERP_DRAW/BARE cho phép no-space sau `⊥` (OCR "AK ⊥BC"). (8) `tangentNamedFromExt` qualifier "tiếp tuyến thứ hai MC". **GOTCHA strict-metric vs partial-render: diag-all count = tryDeterministicFigure ALL-OR-NOTHING → rule đúng (fire 7 hình 2-đường-tròn) nhưng bài olympiac dày KHÔNG flip; giá trị thật = partial-render production + cắt cascade transpile-fail "ref A không tồn tại".** julielltv (29 bài olympiad, md+json sẵn) wired vào diag-all (stripLatex), 2/29 — phép đo đa dạng. **Dataset MỚI tự-tải `chuyen2026`** (25 bài, 6/25): search toanmath → `curl` PDF "Một số bài toán HHP thi vào 10 chuyên 2026-2027" → `.venv/bin/markitdown` → `scripts/extract-chuyen2026.mjs` (giữ lead "Cho...", cắt sub-question/lời giải, strip cid + table-cell). **GOTCHA chất lượng extract PDF: chỉ PDF có TEXT-LAYER sạch (LaTeX-typeset) mới dùng được — PDF "Bùi Hoàng Nam HHP9" nhãn điểm ở SYMBOL-FONT → markitdown đổ nhãn ra OUT-OF-ORDER ("O BC A BC AB. Cho đường tròn...") → BỎ. Quy trình: tải → markitdown → grep "Cho ..." kiểm nhãn còn nguyên (≥3 HOA đơn, ít "( )" rỗng) TRƯỚC khi viết extractor.** markitdown 0.1.6 trong `.venv`. Probe 792→846 bài (9 dataset).
- **✅ LOOP TỐI ƯU 2026-06-15 (≈7 commit nối tiếp, autonomous loop; baseline-set 350→353, 0 regression, 2756 ai test):** mỗi vòng = mine cụm sạch / +dataset → TDD → verify diag-all → commit+push. (1) **+2 dataset tự-tải** (search→curl→markitdown→extract): `httcd` "Bài tập Hình học 9 theo chủ đề" (255 bài, lọc bài có đường tròn) → 66/255; `mohinh` "Chuyên đề các mô hình thường gặp" (39 bài) → 13/39. Probe 846→**1140 bài (11 dataset)**. (2) **2 BUG crash phát hiện qua data mới** (production cũng crash): `chord.findCircleClauseId` `new RegExp` tên đường tròn chứa regex-meta (OCR "(O*)") → escape; `transpile.ts` "id not assigned A" (đường tròn đường kính OA dùng tâm O của đường tròn khác — DEFER, escalate graceful). (3) **rule mới/sửa:** `radius` (MỚI "Vẽ hai bán kính OA,OB"→onCircle); `perpChordAtFoot` BUG `dây`→`[Dd]ây` (KHÔNG khớp "Dây" HOA đầu câu — flip httcd+vao10); `circleExternalPoint` VN_METRIC ("(O;3cm) và điểm A có OA=6cm" d>R⇒ngoài); `incircleTangency` bare "(I)" đảo + tên tiếp điểm prime; `circleDiameter` "tâm (O)" ngoặc; `perpFoot` "chân CÁC đường"; `onSegmentPoint` +"bán kính" prefix. **GOTCHA: nhiều bug là case-sensitivity (chữ HOA đầu câu) + regex-meta chưa escape — data OCR mới là "fuzzer" tốt để lộ crash production.** Cụm rule sạch ≈cạn (mỗi rule ~1-3 bài, nhiều bài dup/OCR-damage); đòn bẩy còn lại = +data (mở) hoặc hybrid-LLM (Phase 2, đánh đổi no-LLM-cost).
- **✅ LOOP TỐI ƯU 2026-06-16 (tiếp; baseline-set 353→361, total 455/1140, 0 regression, 2774 ai test):** kỹ thuật chủ đạo = **empirical mutation-probe** (đột biến clause fail: lowercase-đầu-câu / ở↔tại / và↔phẩy / thêm-bỏ "các"/"điểm"/"hai điểm" / tách-glue → clause có được claim không?) để tìm phrasing-gap FLIP có hệ thống, rồi dbg xác minh self-contained trước khi sửa. Rule mới/sửa: `parallelSidePoints` (MỚI "Q,R thuộc AC,AB sao cho PQ∥AB,PR∥AC"→giao đường song song); `perpNamedLine` (MỚI "Từ A kẻ Ax⊥MN tại K"→đường ⊥ ĐẶT TÊN + chân, mở cascade clause sau ref "Ax"); `secant` "tại HAI ĐIỂM"+"[Qq]ua (điểm)?"; `lineCircleIntersection` CIRCLE_SUBJECT/LINE_TWO_CIRCLES; `diameterCircleCutsSides` dạng XEN KẼ "cắt AB ở N và cắt AC ở M"; `perpFoot` FEET_FROM_SHARED_LINE +"và" + DISTRIB_FOOT "chân CÁC đường"; `perpChordAtFoot` `[Dd]ây`; `perpDiameters` "AB ⊥ CD" (⊥ separator); `circleRadius` "(O; 5cm)" đơn-vị; **`normalizeText` GLUE-SPLITTER** (tách OCR-glue tin cậy: từ-vựng-hình-học↔nhãn HOA, vd "cắtBC"→"cắt BC", "Asao"→"A sao"; danh sách từ-khoá đặc thù để KHÔNG phá "Cho"/"Đường" HOA-đầu-câu); `perpThroughCutsLines` dựng chân "tại E" (mở khoá re-enable "và" glue an toàn). **GOTCHA quan trọng: 1 regression (vao10:119 khi tách "Evà") LẠI CHỈ ra gap thật (perpThroughCutsLines bỏ sót chân E) — vá gap → re-enable "và" → +3. Regression của normalizeText-denoiser = tín hiệu tìm rule-gap, không chỉ là lỗi.** GLUE-SPLITTER chỉ tách ranh giới TIN CẬY (regression-gated qua diag-all toàn 1140 bài) — KHÔNG word-segment đa-từ-dính ("CácđườngthẳngAM" để nguyên). Còn cạn: 2-đường-tròn tiếp-tuyến-chung/concentric (cần builder), OCR multi-word-glue, olympiad chains.
- **✅ LOOP TỐI ƯU 2026-06-16 #3 (tiếp #2; 7 batch nữa, total 471→482/1140, 0 regression, 2797 ai test):** chuyển từ phrasing-synonym sang **distributive 2-phần-tử nối "và" + guard quá-rộng**. Rule: (8) `onSegment` +"X **là (một) điểm trên** cạnh YZ" (POINT_ON_SEG_DECL, pre-metric — son123:9, ăn theo son123:18). (9) `intersection` CAT_ONE_TWO +line-sep "và" ("BE cắt AD **và** AC") + điểm lặp "tại I **và tại** K" (httcd:156). (10) `lineCircleIntersection` +**DOUBLE_DISTRIB** "BE,CF … cắt (O) lần lượt tại M và N" (xen "cắt nhau tại H,"; guard lookahead phủ định ngăn nuốt dạng 3 của TRIPLE — vao10:77, httcd:196). (11) `chord` CHORD_TWO +"(hai|**các**) dây CD **và** EF" + **guard `(?!cắt nhau)`** (vao10:226 regression: "hai dây MN và BK CẮT NHAU" mô tả dây CÓ SẴN, B=đầu đường kính → onCircle gây CYCLE; "cắt nhau"=dây sẵn, "song song/cùng đi qua"=dây mới — httcd:7/10/70). (12) `twoCirclesMeet` CIRCLE +bán kính đơn vị "(O; 5cm)" (httcd:84). (13) `chord` **guard "vuông góc" chỉ áp dây ĐƠN** (chạy CHORD_TWO TRƯỚC guard — "hai dây AB và CD vuông góc VỚI NHAU" ≠ perpChordThroughPoint, vẫn dựng 4 đầu mút — httcd:65). (14) `intersection` +CAT_PERP_NHAU "hai dây AB,CD vuông góc với nhau tại I"→I=AB∩CD (guard clause có "dây" né đường-kính-tâm; **+PREFILTER "vuông góc với nhau"** — gotcha PREFILTER tái diễn: rule khớp standalone nhưng pipeline bỏ vì prefilter chặn — httcd:68). **GOTCHA distributive-guard: pattern 2-phần-tử "L1,L2 … P1,P2" dễ nuốt nhầm dạng 3 (TRIPLE) hoặc mô tả-quan-hệ (dây sẵn "cắt nhau") — luôn thêm lookahead phủ định "(?!…phần-tử-3)" + guard ngữ-nghĩa.** Tool: `dbg-bai.ts` so `String(r.id)` (httcd id number). DEFER còn lại: dây-cung-trùng-tên-tâm, 2-đường-tròn-qua-điểm, collinear-3-điểm + givenDiameter xung đột, trapezoid-altitude, named-lowercase-line (d,Ax), OCR-garbled/multiword-glue.
- **✅ LOOP TỐI ƯU 2026-06-16 #2 (7 batch, baseline-set 361→…, total 461→471/1140, 0 regression, 2790 ai test):** tiếp tục mutation-probe + dbg-bai self-contained. **Cụm chủ đạo batch này = "lần lượt"-synonym + glue/đại-từ xen + circle-indicator trần.** Rule sửa: (1) `perpFoot` DISTRIB nhận "thứ tự"/"theo thứ tự" = "lần lượt" (LANLUOT_OPT, vao10:218). (2) `onSegment` BETWEEN +"X **là (một) điểm** nằm giữa Y và Z" (tên trước "là điểm" — httcd:67/vao10:219; vao10:219 H dedup với perpChordAtFoot). (3) `oppositeRayPoint` +"lấy **MỘT** điểm M" trên tia đối (httcd:148). (4) `diameterCircleCutsSides` +chỉ-báo đường tròn TRẦN "(O)"/"tâm(I)" (KHÔNG cần chữ "đường tròn") + phẩy/đại-từ "nó" xen giữa diameter↔cắt (vao10:81 "AH, cắt"; vao10:60 "tâm (I)") + "theo thứ tự" + anchor "ở" tách PATTERN_O **yêu cầu ≥2 điểm** (httcd:2). (5) `arcMidpoint` +phân phối 2 CUNG riêng "N và P … cung AM và cung MB" (zip, không containment — httcd:237). (6) `onCircle` TWO_ON +glue "haiđiểm" + "bất kì" xen (httcd:191). (7) `onSegment` +"điểm N **thuộc tia** AM" (POINT_THUOC_TIA, **chạy TRƯỚC metric-skip** — httcd:128 "sao cho AN=BM"). **GOTCHA REGRESSION-AS-SIGNAL tái diễn: thêm "ở" vào diameterCircleCutsSides PATTERN chính → vao10:155 ("cắt BC ở N và cắt (O) tại D") flip ok→named-missing vì lazy-region dừng ở "ở N" tạo N (đúng) nhưng bỏ D=giao-2-đường-tròn (trước đó tạo D SAI trên BC nhưng "present" nên ok). Vá = tách "ở" sang PATTERN_O yêu cầu ≥2 điểm → loại case 1-điểm-rồi-"và-cắt".** Còn lại đều DEFER: 2-đường-tròn-qua-điểm / dây-cung-trùng-tên-tâm / "h_a,h_b,h_c đường cao" (độ dài KHÔNG phải điểm) / ngũ-giác-nội-tiếp / trapezoid-altitude-metric / OCR-multiword-glue.
- **✅ AUDIT 2026-06-12 (5 commit, 0 regression — diag identical 7/7 kể cả vao10, 2857 test):** (1) **Bug class `\b` ASCII cạnh chữ Việt** — `_shared.ts` NAME_LA `là\b` ĐẢO ngữ nghĩa (khớp "làm", KHÔNG khớp "là ") + `coverage.ts` comma-split `Vẽ\b/Kẻ\b` chết im lặng từ đầu + incircleTangency `\bvà\b`; fix bằng lookaround Unicode. Khi viết rule: grep `\\b` đứng cạnh chữ có dấu. (2) **completeRightAngle.ts (dead từ cleanup 2026-06-09) → rule `rightAngleViewing`** (priority 63 TRÊN onSegmentPoint 62 — builder add-point first-wins; bản cũ có bug nuốt "đường tròn"→ref "tr", đã chặn bằng `(?![\p{L}\d])`). (3) **Order-retry topo tầng intent**: `buildAndTranspile` (tryDeterministicFigure) attempt 1 đúng thứ tự gốc, CHỈ retry `orderIntentsByDependency` (`ai/intentTopo.ts` — stable Kahn produce/consume tên, tách cặp longest-prefix "BC"/"B1C1") khi build-throw/UNKNOWN_REF → **rule mới KHÔNG cần canh priority thấp hơn rule tạo điểm nữa** (ràng buộc intersection=45 thành lịch sử). KHÔNG topo mặc định: defaultFreeCoord spread + uniqueShapeName phụ thuộc thứ tự → reorder case đang pass sẽ xê dịch toạ độ/tên. (4) **validateRefs 100% registry**: xoá switch legacy (refs.ts 215→112) — kind có ref BẮT BUỘC khai `refSpecs` trong module (hàm cho discriminated union như arcMidpoint/pointAtDistance; dotted path 'distance.circle'; RefRole mới 'line-or-circle'). Follow-up: circleDiameter/mixtilinearPoint/onPerpBisector chưa khai (parity switch cũ). (5) **jest trong worktree**: config tự bỏ ignore `/.claude/worktrees/` khi rootDir là worktree (trước đó "No tests found"). ts-prune false-positive đã rà: `clearAll`/`clearScene` GIỮ (tests dùng làm cleanup isolation).
- **✅ FIX 2026-06-11 (tâm (O)/(I) = scene point chọn được):** trước đây circumcircle/incircle đặt tên "(O)"/"(I)" → DSL `circle3/incircle name=O` → `circle.ts` vẽ tâm bằng JSXGraph helper `circumcenter/incenter` (`fixed:true`, KHÔNG có scene id) → tâm hiện **màu cam** (default JSXGraph) + **không click được** để đổi tên/màu. FIX ở `resolveCircleNames.ts`: **force-split** mọi circle `through3/inscribedIn` có tên kiểu nhãn-tâm (`/^[A-Z]['′]?\d*$/`) — inject scene point `circumcenter/incenter` + đổi circle → "O_c" (kể cả khi O KHÔNG bị tham chiếu như point, vd chỉ `secondIntersection.circle="O"`). Đổi tên → `isCenter` false → tắt helper cam; point inject vẽ chấm xanh `#1e40af` chọn được (vẫn KHÔNG kéo tự do vì tâm tính toán). `circle.ts` thêm guard `isRenamedCircle = /_c$/` → `withLabel:false` để không hiện "O_c" nổi trên vòng tròn. 0 coverage regression (diag-all giống hệt baseline), 2781 test xanh.
- **✅ FIX 2026-06-11 (halo highlight phái sinh — point/circle/polygon):** `JxgRenderer.addHalo` (viền xám khi chọn object trong editor) trước switch theo `el.elType` string → BỎ SÓT mọi element phái sinh có elType riêng: điểm `circumcenter`(O)/`otherintersection`(M,N,P)/`perpendicularpoint`(D,E,F)/`incenter`; đường tròn `circumcircle`(O_c)/`incircle` (≠ 'circle'); `regularpolygon` (hình vuông/đa giác đều, ≠ 'polygon'). Click VẪN chọn được (selection dùng `objKind` ưu tiên `elementClass`) — chỉ thiếu halo. FIX: addHalo phân loại bằng `elementClass` (1=POINT, 2=LINE, 3=CIRCLE — JSXGraph set đúng cho MỌI construction) + `Array.isArray(vertices)` cho polygon, thay vì liệt kê elType. Đồng bộ `objKind` (tools.tsx). **GOTCHA: MỌI logic phân-loại-JSXGraph-element phải ưu tiên `elementClass`, KHÔNG dựa elType string (mỗi cách dựng 1 tên: circumcenter/otherintersection/circumcircle/regularpolygon…).** Đã thêm halo cho arc/semicircle/circumcirclearc + sector + angle — TẤT CẢ dùng `center`/`radiuspoint`/`anglepoint` (**chữ THƯỜNG**). **GOTCHA verify-runtime: `index.d.ts` của jsxgraph ghi Sector/Angle là `radiusPoint`/`anglePoint` (P HOA) — SAI; runtime thực tế là chữ thường (verify bằng Playwright trên angle thật). Code đọc cả hai (`radiuspoint ?? radiusPoint`) cho chắc.** slopetriangle tự được phủ qua `elementClass===2` (extends Line). **Bài học: .d.ts của lib bên thứ ba có thể sai property name — phải verify runtime, unit-test với mock theo .d.ts cho false-positive.** CÒN gap (defer): `functiongraph`/curve + `text` chưa có halo (hiếm chọn, khó dựng lại); renderer 3D (`JxgRenderer3D.addHalo`) vẫn dùng elType switch — chưa rà (user chưa cần 3D).
- **✅ BATCH 2026-06-12 #2 (vao10 40→63/268 = 24%, 4 commit `0ff7354`→`c94c4c3`, 0 regression — 6 dataset kia giữ nguyên, 5810 test xanh, 32 test mới `__tests__/dataset-vao10-2026-06-12.test.ts`).** ~14 rule mở rộng theo cluster fail (probe diag-all → gom defining-sentence của ref thiếu → dbg-bai đại diện → TDD): perpDiameters (paren bare "(O),"/"tâm O" + tính-từ-TRƯỚC "vuông góc AB và CD" + separator `,;` + claim clause đuôi khi cặp bị split tại ';' "AB;CD"); perpFoot PERP_SHARED_CUNG ("Hạ BE và CF cùng vuông góc (với)? AK" — 2 chân KHÁC gốc 1 đường); **perpChordAtFoot nhánh B** (dây ⊥ đường-kính tại H, CẢ 2 đầu mút mới: H=onSegment(t=0.3 né tâm) + drawLine perpThrough `pc<H>` + đầu-mút-1 = `rightAngleViewing(2 đầu đường kính, onLine=pc<H>)` — Thales trùng đúng đường tròn chính — + đầu-mút-2 = reflectLine; điều kiện: đề có "đường kính XY" + line-token ⊆ {X,Y,tâm}; heuristic anchor = chữ-cái xuất hiện TRƯỚC match, lookbehind chỉ loại chữ thường); givenDiameterCircle emit O=midpoint khi đề dùng token O; circleDiameter GIVEN_BARE "Cho (O) đường kính AC" + BARE_PAREN "(I) đường kính AH" (2 đầu mút đã có → CHỈ tâm+circle, không free) + COMPACT phẩy; circleExternalPoint (paren bare + "một điểm" + dạng ĐẢO "điểm M nằm ngoài đường tròn tâm O" + resolve tâm toàn đề khi vắng); diameterEndpoint verb chia sẻ "Kẻ đường cao AD VÀ đường kính AK" (blob `[^.;,]{0,24}?và` ở cả PREFILTER); lineCircleIntersection (CIRCLE nhận "(O;R)" + "nửa"; LINE_AND_CIRCLE "OM cắt AB và (O) lần lượt tại H và I" — `intersection {of:[line,circle], branch}` vì cả 2 mút không trên circle; NAME_2ND_BARE "giao điểm thứ hai của CE với đường tròn" TRẦN, other=line[0]); intersection F-ray/B-ray (ref = SHAPE-NAME "Bx"/"d" — emitShape bỏ guard 4-đầu-mút; zip "Các tia AC, AD cắt Bx tại E, F" + đơn có gap "tia AF cắt tia tiếp tuyến Bx … tại D"); onCirclePoint TWO_ON_NAMES "(hai|các) điểm" + suffix "(O)"; arcMidpoint CIRCLE_PAREN "(O;R)"; midpoint qua SIDE_PREFIX += "dây (cung)?". **2 fix hệ thống:** vocab += 'nằm trên' (clause "C,D là các điểm nằm trên (O)" trước đó hasGeometry=false → **GOTCHA: runDeterministicIntents CHỈ feed clause hasGeometry vào runRules — rule khớp unit-test (segmentClauses thô) nhưng prod không thấy clause → nghi vocab trước khi nghi regex**); coverage PROOF_SECTION_START += 'C/m|CMR'. **GOTCHA PREFILTER tái diễn:** "OM cắt AB và (O)" bị PREFILTER cũ chặn (`cắt\s+\(` cần paren NGAY sau) dù LINE_AND_CIRCLE khớp — unit test gọi match() trực tiếp bypass patterns → thêm test `rule.patterns.some(re=>re.test(P))`. **DEFER:** CYCLE A→O_c (92/104/144 — chord onCircle đỉnh tam giác vs through3, có từ trước); OCR glue (216 "tại NNC", 137 "là AB và KH", 16, 69); 29/32 "điểm A sao cho OA=2R" (cần external-metric + giao đường-qua-tâm: gợi ý pointAtDistance from=A through=O? sai hướng — chưa có kind); 234 "kẻ đường kính PQ qua trung điểm I" (cần line-qua-tâm∩circle 2 nhánh — có thể dùng intersection branch như LINE_AND_CIRCLE); lineCircle ref "đường tròn tâm O'" (CIRCLE chỉ nhận paren).
- **✅ BATCH 2026-06-12 (vao10 — "Tuyển tập 400 bài toán hình học vào lớp 10"): dataset MỚI 268 bài, coverage 33→40/268 (15%), 0 regression.** Dataset `docs/datasets/tuyen-tap-400-hinh-vao-10.txt` (diag-all `vao10`), trích bởi `scripts/extract-vao10.mjs` từ md markitdown (PDF toanmath; md raw KHÔNG track git — copy vào worktree khi cần regen). **Nhiễu OCR đặc thù cuốn này:** glyph Symbol-font PUA **vô hình** (U+F044=∆ 2771 chỗ, F0B0=°, F0CE=∈ — đếm codepoint PUA khi nghi "Cho  ABC" 2-space), math run tách chữ ("A B = 2 R = 1 0 c m" → join run ≥2 token đơn, lookbehind/ahead Unicode chống dính từ Việt cạnh run), glue không-space ("đường kínhAC"/"BCkhông" — tách HOA→từ-Việt CHỈ khi HOA sau HOA khác, tránh tách "Chứng"→"C hứng"), paren rơi vào ô bảng ("Cho O; R"→restore "(O;R)"; ref mất hẳn → lọc DROPOUT 26 bài vì là hư hỏng văn bản, không phải gap rule), footer ads bleed. **FIX HỆ THỐNG (segmentClauses):** mask `;`/`.`/`,` trong ngoặc ngắn ≤40 ("(O;R)", "(M, N thuộc đường tròn; AM≠AN)") + `;` giữa phần tử list ("đường cao AD; BE; CF cắt nhau tại H") bằng sentinel control-char trước split, unmask sau — trước fix ~80 bài vao10 vỡ clause tại ';' trong ngoặc; 2 test workaround cũ (circleTriangle/circleDiameter claim-2-mảnh) cập nhật ngữ nghĩa mới. **Phát hiện bug-class silent-incomplete:** mảnh clause vỡ ("R) lần lượt tại M và N") hasGeometry=false → render THIẾU điểm mà vẫn ok=true (vao10:77 cũ); sau fix escalate named-missing đúng. **Rule mới/mở rộng:** diameterEndpoint dạng ĐỘNG TỪ "kẻ/vẽ/dựng đường kính AD" (D=reflectPoint qua tâm resolve từ đề; guard đầu-mút-đầu đã xuất hiện trước — lookbehind CHỈ loại chữ thường vì "C" trong "ABC" vẫn là điểm biết; nhận prime "CC'"); perpFoot verb "Hạ"; circleDiameter "(O,R) **có** đường kính" + tâm BARE "nửa đường tròn O đường kính AB"; tangentNamedFromExt separator "và"/số từ "2"/"Các tiếp tuyến với đường tròn kẻ từ A tiếp xúc tại B,C"/claim appositive "với P và Q là tiếp điểm" (RuleMatch intents RỖNG = claim-only hợp lệ); intersection "(kéo dài)?" + locative "ở"; oppositeRayPoint tên-trước "Lấy điểm A trên tia đối của tia CB". **GOTCHA worktree:** jest chạy TRONG `.claude/worktrees/<n>` bị `testPathIgnorePatterns`/`modulePathIgnorePatterns` của base config loại (đường dẫn tuyệt đối chứa pattern) → dùng `jest.worktree.config.js` (filter pattern worktrees). **DEFER:** "hai đường tròn (O;R) và (O';R')" mất prime OCR → 2 circle trùng tên (unfixable data); "Trên tiếp tuyến của (O) tại A lấy M" (cần point-on-line); "AD kéo dài cắt O tại S" (circle bare "O" làm ref cắt); long-tail tiếp tuyến ~1×/biến thể. Funnel còn lại: transpile-fail 94 / incomplete 111 — phần lớn cụm long-tail + data-damage.
- **BATCH 2026-06-11 (toan_8 grade-8): 36→37% (55/150) — DATA-LIMITED, không phải algorithm-limited.** Dataset `docs/datasets/toan_8_hinh_drawing_useful.txt` (trong diag-all `toan8`). 96 fail thì **~65 là nhiễu fragment hình** (OCR dump nhãn đỉnh chèn GIỮA câu: "phân **A** giác", "trung **A B** điểm", "đường cao **A** BE", mất ký hiệu ∆ → "Cho ABC" trống), phần còn lại = tam-giác-đồng-dạng/Tính-x (không phải dựng hình) hoặc truncation. KHÔNG xây denoiser inline (gỡ HOA lẻ giữa câu sẽ xoá nhầm điểm "M là …" → quá rủi ro cho 4 dataset kia). Chỉ lấy win sạch: `◊/▱/□`+HOA→"tứ giác" (normalizeText); onSegment "Trên cạnh AC lấy các điểm D,E" (nhiều điểm CÙNG đoạn, trước metric-skip) + tiền tố "đáy". Bài học: dataset OCR bẩn → engine đúng vẫn cap thấp; đừng ép coverage bằng cách đoán qua nhiễu.
- **✅ BATCH 2026-06-11 (son_123 olympiad): 19%→45% (23→55/122).** Dataset `docs/datasets/son_123_problems_cleaned.txt` (đã thêm vào `scripts/diag-all.ts`). 15 commit, 0 regression (hinh9/d80/phang/t02 giữ nguyên), 2775 test xanh. Debug 1 bài: `npx tsx scripts/dbg-bai.ts son123 <id>` (đọc intro từ .work/escalations.json + in clause→rule→intent→transpile). **Rule MỚI:** `circumcircleCutsLine` (đường tròn ngoại tiếp tam giác XYZ cắt LINE tại K). **MỞ RỘNG:** perpFoot ("Kẻ HE,HF ⊥ AB,AC" distributive cùng chữ đầu / tên nối "và"+"kẻ từ" / "chân các đường cao hạ từ A,B" / LINE "đoạn thẳng"); incircleTangency ("ba cạnh/ba điểm" + "tiếp điểm của (I) với BC,CA,AB là D,E,F" tên-sau + đảo); lineCircle ("cắt lại … điểm thứ hai (là) M" + PREFILTER "cắt lại"/"giao điểm khác X của XX với (" + BOTH "các/phân biệt điểm" + "giao điểm thứ hai của AM,AN với (O)" distrib + NAME_2ND_CUA); intersection (F2 "giao điểm của R1,R2 với R3 là M,N" / F3-ZIP "R1,R2 lần lượt cắt R3,R4 tại M,N" / CAT_TWO_ONE "và" / "của của" lặp / CAT_NHAU "của tam giác XYZ"); centers (DISTRIB_CENTERS "O và H lần lượt là tâm ngoại tiếp và trực tâm" + INCENTER_NAMED "tâm nội tiếp là I" khi clause cũng có "tam giác nội tiếp (O)"); circumcirclePairMeet ("X cắt Y" + paren "(ABC) và (ADE)"); midpoint (DISTRIB tên "và" + NAME_AFTER "trung điểm của AC,AB lần lượt là K,L"); cevian median "AM là **đường** trung tuyến"; onSegment ("di chuyển/di động trên cạnh"=điểm free + ZIP "thuộc (tia)? các cạnh" chạy TRƯỚC metric-skip + BETWEEN "nằm giữa hai điểm"); perpThroughCutsLines RE_SINGLE (1 đường cắt "qua P ⊥ L1 cắt L2 tại Q"); angleBisectorCutsSideCircle FOOT_CIRCLE_DISTRIB "phân giác … cắt BC,(O) lần lượt tại D,E"; interiorPoint "Điểm O nằm trong hình chữ nhật" (tên-sau, đỉnh optional, "Điểm" HOA). **GOTCHA coverage:** LOCUS_CLAUSE chỉ coi locus khi "di chuyển/di động **trên (O)/cung/đường tròn**" — trên CẠNH = điểm free MỚI cần dựng. **GOTCHA PREFILTER:** rule khớp nhưng escalate → PREFILTER (toàn-đề) có thể chặn (vd onSegment thiếu "thuộc các cạnh"/"thuộc tia"; lineCircle thiếu "cắt lại"). **DEFER (infeasible/feature riêng):** "hai đường tròn (O),(O') cắt nhau tại A,B" (5 bài — cần builder 2 circle free thực-giao, không phải regex), điểm phẩy line "MA′ cắt …", named lowercase line "d cắt AC tại E", Miquel/excircle/tiếp-tuyến-chung/parallel-through-circle, metric/góc thuần (∠=90°, BF=BC=CE), ~5 bài trig/Ptolemy (không vẽ hình).
- **✅ BATCH 2026-06-11: CẢ 3 dataset "vẽ hình" đạt ≥90%** (probe HỢP NHẤT `npx tsx scripts/diag-all.ts` — ghi `.work/escalations.json` + summary 4 dataset, dùng intro = phần dựng hình): **hinh9 19/20=95%, d80 21/23=91%, phang (chon-loc) 27/29=93%, t02 14/73=19% (olympiad, cap).** 12 rule mới/mở rộng + 9 commit (38d78c6→7209b81). Rule MỚI: `circleCutsArcSecond` (đường tròn đường kính cắt cung → circle∩circle), `angleBisectorCutsCircleLine` (phân giác cắt đường tròn + đường thẳng), `tangentLineNamedAtPoint` (tiếp tuyến đặt tên chữ thường d), `givenDiameterCircle` (đường tròn đường kính CHO gốc → đầu mút free), `multiDiameterCircles` (arbelos 3 nửa đường tròn đặt tên O/I/K), `cutCirclesDistrib` (M,N=EA∩(I),EB∩(K)). MỞ RỘNG: reflection GIỮ prime (M′ không hạ thành M → hết cycle M→M), intersection primed-comma ("S=BM∩M′A"), onCircle "trên" trần + circumcircle-vs-diameter naming (resolveCircle chỉ "_c" khi "đường kính" gắn CHÍNH tâm), onSegment phân phối đoạn-trước + "đường kính/đường thẳng d", tangentAtCutsLines nhận tia Ax/By + "Qua M kẻ tiếp tuyến thứ ba", tangentRay/onCircle resolve đường tròn vô danh "kXY", circleDiameter tâm có prime/chỉ số (O′)/(O₁), perpAtPointCutsLine cắt đường tròn, perpFoot cặp ⊥ phân phối, lineCircleIntersection perp∩circle. **GOTCHA token tên đường chữ thường: `[a-z][0-9]?` + NEO `(?!\p{L})` — KHÔNG `[a-z]*(?![a-z])` (nuốt "vuông"→"vu" vì "ô" không trong [a-z] ASCII).** Workflow fan-out agent phân loại 73 bài đã BLOW-UP (288 agent/7.4M token rác) — dataset nhỏ thì tự đọc escalations.json + ctx_execute.
- **✅ Dataset `cac-chuyen-de-va-bai-tap-tong-hop-hinh-hoc-9.txt` (2026-06-11): MỞ RỘNG 20→127 bài, coverage 90/127 = 71%** (vòng 1: 80/127=63%; 20 bài curated cũ vẫn ~95%; +107 bài trích từ bản FULL `…-nguyen-ngoc-son.pdf` — giáo trình "nâng cao" Nguyễn Ngọc Sơn THPT Chuyên ĐHSPHN). Quy trình trích: `markitdown <pdf> -o hinh_9_full.md` (cài `pip install 'markitdown[pdf]'` trong venv) → `node scripts/extract-hinh9-full.mjs [--write]` (gom block `Bài toán N`/`Ví dụ N`, cắt intro trước câu hỏi, lọc chỉ bài vẽ hình, dedup vs 20 curated, append Bài 21+). **GOTCHA OCR markitdown**: dính chữ camelCase ("GọiM"→tách lower→Upper), typo "đường **trong**"→"đường tròn", `(cid:NN)` glyph, header/footer "Hướng tới kì thi…/Các chuyên đề…" trộn giữa câu (phải collapse space TRƯỚC khi strip vì table-cell tạo nhiều space), đuôi công thức bị nuốt ("a b c", "Biết ="). 46 bài mới MISS (incomplete-coverage 26 / transpile-fail 12 / named-missing 8) = gap thật để mở rộng rule. **✅ BATCH vòng 2 (2026-06-11): 80→90/127 (71%), 0 regression, son123 56→65 ăn theo, 2835 test xanh.** Rule MỚI: `parallelThroughCutsCircle` (qua P song song ref cắt (O)/đường thẳng — 65/69/111; secondIntersection nhận line = named parallel-shape vì resolveSegmentRef giữ shape-name as-is), `lineThroughCutsTwoLines` (đường bất kì qua P cắt 2 cạnh: E free onSegment L1 + F=giao(P+E, L2) → đường thật qua P — 76), `twoPerpLinesMeet` DISTRIB ("qua E,F lần lượt ⊥ OC,OB cắt nhau tại X"). MỞ RỘNG: onCirclePoint ("X là một điểm thuộc cung"), onSegment (TWO_SEG_LAY ghép "và" pre-metric "Trên đoạn BH lấy M và trên đoạn CH lấy N sao cho ∠=90°" — chỉ cạnh/đáy/đoạn né pointAtDistance; "X là một điểm nằm/thuộc(+bất kì) SEG"; SEGS_THEN_POINTS prefix "các cạnh" + chen "của tam giác ABC" — phủ 24/46/66-X/108), cevian (reverse-list "AD,BE,CF là các đường cao" → chân D,E,F — 119), chord ("hai dây CD,EF"→4 đầu mút theta phân biệt — 46), lineCircleIntersection ("giao điểm thứ hai … đường tròn ngoại tiếp tam giác XYZ"→circumcircle "O"), triangle (TRI_G nuốt CHUỖI tính từ trước nhãn "nhọn, không cân ABC" — 83 + nhiều son123/t02), normalizeText (bỏ ký hiệu √ OCR — 25). **DEFER (đúng hard tầng này):** 2-đường-tròn-free-thực-giao (~11 bài, cần builder), Miquel(43)/excircle-tangency(85)/subscript A₁B₁C₁(40)/pure-metric(32,39)/OCR-glue space-collapse(78,114)/cyclic-quad render(84)/locus-trên-cung (116/126 — `coverage.ts` LOCUS_CLAUSE coi "di chuyển/di động trên cung"=locusOnly→hasGeometry=false; nới = shared-classification risk cao, mọi clause locus phải được rule claim nếu không OK→incomplete). B19 cũ (dây song song AD//BC) vẫn defer.
- **Dataset `T02_problems.txt` (2026-06-11): 5→18/73 (~25%, olympiad).** Probe `npx tsx scripts/diag-all.ts` (hoặc `diag-t02.ts -v`). Batch 06-11 +4 bài (VD13/BT23/BT19/BT18) qua: cevian/midpoint PHÂN PHỐI danh sách ("đường cao AD, BE, CF"; "D,E,F là trung điểm NP,PM,MN" — "lần lượt" OPTIONAL); cevian CHÂN CÓ PRIME ("BB',CC'") + intersection primed "cắt nhau" ("EF, B'C' cắt nhau tại K"); `twoPerpLinesMeet` (S = đường⊥-qua-M ∩ đường⊥-qua-N); circleTriangle "nội tiếp (O;R)" + givenNamedCircle "(O) trơ có điểm trên". CÒN hard-core (đúng infeasible tầng này): cyclic-quad chain, đường tròn (I) đi qua B,C (chùm 1-DOF), tâm tứ giác ngoại tiếp, đường thẳng d qua G hướng tuỳ ý, tiếp xúc đường tròn phụ. 90% KHÔNG khả thi tầng này (chuỗi giao-của-giao sâu, điểm phẩy A'B'C' Pappus, quỹ tích, dựng-hình, định lý thuần, radical axis/mixtilinear/harmonic). Thêm: `intersection` DISTRIB_PAIRS "giao của các cặp (AC,BD);(AB,CD)" (toàn-đề, blob `[^.]+`) + `∩` (HỖ TRỢ ĐIỂM CHỈ SỐ "A1 = BC ∩ AP", "A2 = BC ∩ B1C1"); `tangentsAtMeet`; `angleBisectorCutsSideCircle`; `triangle` "ABC là tam giác vuông tại A" (nhớ thêm vào `patterns[]`); onSegment/incircleTangency/perpFoot/parallelPerp/lineCircleIntersection nới separator + dạng tên-trước.
  - **ĐIỂM CÓ CHỈ SỐ (A1, A', Ja)**: LabelZ/NameZ vốn nhận; blocker là regex rule (`[A-Z]`). Đã mở: `excenter` "Ja là tâm bàng tiếp góc A" → điểm Ja; `intersection` ∩ với PT token (HOA+số/prime) + builder `splitKnownPair` (resolveSegmentRef tách "B1C1"→B1,C1 longest-prefix); **vocab thêm '∩'** (clause chỉ dùng ∩ trước đây hasGeometry=false → silent-incomplete). Subscript trong line-ref DÀI hơn (>2 điểm chỉ số) hoặc thiếu điểm-đã-biết vẫn chưa tách được.
  - Gotcha: rule `.match()` khớp nhưng escalate → check (a) PREFILTER `patterns[]` chặn rule chạy trong runRules, (b) vocab thiếu keyword → clause hasGeometry=false, (c) blob regex `.+` nuốt sang câu "Chứng minh" → đếm lệch.
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
- **Vision OCR (ảnh → text)**: `handleExtractProblem(image)` đọc đề từ ảnh. Engine **DUY NHẤT = Tesseract.js** client-side, offline, KHÔNG network/LLM/API key — **path `engine:'llm'` đã GỠ** (đừng resurrect; mô tả cũ "Vision LLM opt-in qua `{engine:'llm'}`" + `WHITEBOARD_AI_VISION_MODEL` đã lỗi thời). Lazy load `vie+eng` traineddata ~13MB từ CDN lần đầu, cache IndexedDB. `postProcess` (extractProblem.ts): strip markdown → collapse `\s+` → NFC → **`repairOcrSymbols`** → cap 2000.
- **`repairOcrSymbols` (2026-06-29 `ce3f817`)**: vá symbol đặc thù lỗi Tesseract **ở TẦNG OCR** (postProcess), **KHÔNG** ở `normalizeText` dùng chung — vì "L"/"ABCD" gõ tay là input hợp lệ; `normalizeText.TRIANGLE_SYMBOL` khớp `∆` THẬT nên không bao giờ fire trên output OCR (glyph đã thành "A"). Vá TOKEN ĐÃ HỎNG: `⊥←1/|/L` (kẹp 2 nhóm-hoa), `△/∆←A` (AABC → tam giác, chỉ câu đề + hậu tố tam-giác `đều/cân/nhọn/vuông/nội tiếp/ngoại tiếp`), `(O)←(0)` bare, `∈←e` (cuối list-điểm). Precision-first + context-gate + idempotent; **validate 20 trang PDF thật (4 nguồn) → 0 false-positive**. Dấu mũ góc `Â/D̂ÂN̂`: Tesseract **xoá-mũ-giữ-chữ** → vô hại (parse được như text). `√/²/subscript/phân số/⇒` (nằm ở phần LỜI GIẢI, không phải câu "Cho…") → out-of-scope. Đo failure-mode: pymupdf rasterize @200dpi → chính `runTesseractOcr`. Spec: `docs/superpowers/specs/2026-06-29-ocr-symbol-repair-design.md`.
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
