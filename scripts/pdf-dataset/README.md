# pdf-dataset — pipeline ẢNH → OCR → ĐỀ BÀI → VẼ HÌNH 2D

Xây dataset đề "vẽ hình 2D" từ PDF, đi qua đúng
pipeline OCR production (Tesseract + `repairOcrSymbols`), rồi **dựng hình
deterministic** + **đo độ phủ** + **đối chiếu mắt** để cải thiện liên tục.

```
PDF scan ──①rasterize──▶ PNG/trang ──②OCR──▶ all.json (cache)
                                              │
                          ③segment ◀──────────┘
                              │  (cắt đề + repairOcrSymbols + xuống dòng)
                              ▼
                    dataset .txt  ("Câu N: …")
                       │        │
              ④render  │        │  ⑤đo + đối chiếu
                       ▼        ▼
                figures/*.png   diag-all (full coverage)
                (nền TRẮNG)     check-completeness (điểm vẽ vs đề)
                                compare.py (3 cột: ẢNH | TEXT | HÌNH)
```

Nguồn hiện tại: `docs/datasets/sources/tong-hop-hinh-hoc-phang-vao-10-2018-2019.pdf`
(Tạ Công Hoàng – Nguyễn Đăng Khoa, 119 trang) → `docs/datasets/tong-hop-hinh-phang-vao10-2018-2019.txt`.

> **Lưu ý (2026-07-01):** PDF này thực chất **born-digital (LaTeX), CÓ text-layer** —
> KHÔNG phải scan. Pipeline vẫn **CỐ Ý dùng OCR** (không trích text-layer) vì đã đo:
> (a) text-layer thay OCR làm coverage **TỆ HƠN** (46→35 full, điểm 644→557) — rule
> engine + `repairOcrSymbols` + `normalizeText` đã tuned theo đặc tính OCR, còn
> text-layer có quirk math-spacing (`MNP`→"M N P", `△`→`4`, `∠`→dấu-mũ); (b) production
> thật nhận **ẢNH crop không có text-layer** nên buộc phải OCR. Wrapper Tesseract cũng
> đã near-ceiling (config/upscale = no-op). Chi tiết: memory
> `project_ocr_wrapper_ceiling_2026_07_01`.

---

## ▶ CHẠY TRÊN DATASET / PDF MỚI

Đây là phần cần đọc khi muốn áp pipeline lên **một bộ đề khác**.

1. **Đặt PDF** vào `docs/datasets/sources/<ten>.pdf`.
2. **Chỉnh `segment-problems.ts` theo CẤU TRÚC SÁCH MỚI** (bước duy nhất phải sửa tay).
   Bộ cắt đề hiện hard-code cấu trúc của sách vào-10 (xem bảng "Cấu trúc sách"
   cuối file): Chương 2 = đoạn prose TRƯỚC "Lời giải", Chương 3/4 = split "Bài N.".
   Sách khác có thể: mỗi đề 1 trang, header "Câu N"/"Bài N"/"Ví dụ N", có/không lời
   giải xen kẽ… → sửa hàm `main()` trong `segment-problems.ts` cho khớp (logic cắt
   + dải trang mỗi chương). `clean()` (collapse + `repairOcrSymbols` + `insertBreaks`)
   và format output `"Câu N: …"` GIỮ NGUYÊN (mọi script đo đều parse format này).
3. Chạy 5 bước dưới, đổi `<file>.pdf` + tên dataset `.txt` thành của bạn.
4. Lặp **Vòng lặp cải thiện** tới khi "ổn".

> Mọi script đo (`diag-all`, `check-completeness`, `compare.py`) đọc dataset theo
> format `"Câu N: <statement>"` (statement có thể vắt nhiều dòng — phân tách giữa
> các đề bằng DÒNG TRỐNG). Giữ format này thì không phải sửa script đo.

---

## Quy trình (5 bước)

```bash
SP=/tmp/pdf-work            # thư mục tạm (ảnh + ocr + figures — KHÔNG commit)
mkdir -p $SP/pages $SP/ocr $SP/figures
PDF=docs/datasets/sources/<file>.pdf
DS=docs/datasets/<ten-dataset>.txt

# ① Rasterize mọi trang @200dpi (pymupdf trong .venv) — cần cho OCR + compare crop
.venv/bin/python -c "import fitz; d=fitz.open('$PDF'); \
  [d[i].get_pixmap(dpi=200).save(f'$SP/pages/p{i+1:03d}.png') for i in range(d.page_count)]"

# ② OCR mọi trang (1 worker Tesseract vie+eng dùng lại) → text raw có newline.
#    Raw OCR DETERMINISTIC + ổn định → CACHE vào repo (docs/datasets/sources/ocr/
#    all.json) để KHÔNG re-OCR khi tweak repair. Chỉ chạy lại khi đổi PDF/DPI.
npx tsx scripts/pdf-dataset/ocr-pages.ts $SP/pages $SP/ocr && cp $SP/ocr/all.json docs/datasets/sources/ocr/

# ③ Cắt ĐỀ BÀI (chỉ statement, bỏ lời giải + hình) + repairOcrSymbols + xuống dòng
#    → dataset .txt. Đọc TỪ CACHE (không re-OCR) → chạy lại sau MỖI lần sửa repair:
npx tsx scripts/pdf-dataset/segment-problems.ts docs/datasets/sources/ocr --write $DS

# ④ Dựng hình deterministic (không LLM) + render PNG nền TRẮNG để kiểm mắt
npx tsx scripts/pdf-dataset/render-figures.ts $DS $SP/figures all
#    → $SP/figures/cau-NNN.png + summary.json (mode: full|partial|none)

# ⑤ Đối chiếu 3 cột: ẢNH đề (crop PDF) | TEXT OCR | HÌNH vẽ → HTML kiểm mắt
.venv/bin/python scripts/pdf-dataset/compare.py $SP/pages $SP/figures $SP/compare.html
#    (cần `tesseract` CLI cho bbox dòng + Pillow). Mở compare.html / publish Artifact.
```

---

## Công cụ chẩn đoán (lái việc cải thiện)

| Lệnh | Đo gì |
|---|---|
| `npx tsx scripts/diag-all.ts` | **Coverage FULL** mức bài (full/partial/none) + lý do escalate → `.work/escalations.json` (có `uncovered[]` = clause chưa rule nào nhận). |
| `npx tsx scripts/pdf-dataset/check-completeness.ts` | **Độ đầy đủ mức ĐIỂM**: điểm đề NÊU vs điểm ĐÃ VẼ → liệt kê điểm THIẾU + 20 bài thiếu nhất → `.work/completeness.json`. Lever chính. |
| `npx tsx scripts/pdf-dataset/check-completeness.ts <id>` | Chi tiết 1 bài: KỲ VỌNG / ĐÃ VẼ / THIẾU. |
| `npx tsx scripts/dbg-bai.ts <dataset> <id>` | Debug 1 bài qua rule engine. |

> **Bài học**: phần lớn điểm thiếu là **"covered-but-orphaned"** (clause được rule
> claim NHƯNG intent tham chiếu điểm chưa dựng → bị drop → CASCADE sụp), KHÁC với
> `uncovered` của diag-all. `check-completeness` lộ ra cascade này — đó là nơi
> đòn bẩy lớn nhất (1 base-construct hỏng kéo sụp nhiều điểm phái sinh).

---

## Vòng lặp cải thiện (tới khi "ổn")

Mỗi vòng: **chọn cụm gap lớn nhất** từ `check-completeness` → **vá** → **verify
0-regression** → lặp. Dừng khi gain cạn (còn lại OCR-garble nặng / cần builder lớn).

**3 loại gap → 3 chỗ sửa:**
- **OCR sai** (nhãn/từ khoá/glyph hỏng) → `src/.../vision/repairOcrSymbols.ts`
  (tầng OCR, dataset .txt) **+ mirror `src/.../deterministic/normalizeText.ts`** nếu
  cần (pipeline dựng-hình dùng `normalizeText`, KHÔNG chạy `repairOcrSymbols`). Sửa
  xong chạy lại bước ③.
- **Từ khoá hình-học bị lọc** (clause `hasGeometry=false` → rule không thấy → sụp)
  → thêm keyword vào `src/.../deterministic/vocabulary.ts` (vd "thẳng hàng").
- **Hình thiếu/sai** → mở rộng/thêm rule `src/.../ai/rules/` hoặc builder (xem dưới).

**Thêm construct MỚI (code dễ mở rộng):**
1. **Rule**: 1 module `ai/rules/<name>.ts` + 1 dòng `ai/rules/registry.ts` + 1 test
   `ai/rules/__tests__/`. Text → `IntentT[]`.
2. **Intent→DSL**: dispatch qua `ai/intent-builders/registry.ts` (`OP_BUILDERS[op]`).
3. **Render**: per-kind `dsl/kinds/` (vd `polygon` đã generic N-đỉnh).
4. **Ưu tiên COMPOSE** add-point/mark-shape/draw-line sẵn có; CHỈ viết builder
   toạ-độ mới khi hình thật sự mới (vd `inscribedSquare`).
5. **GOTCHA**: điểm phái sinh DÙNG `onSegment`/constraint (cùng union-find component)
   thay `explicitCoords` — nếu không `layoutDisjointComponents` đẩy hình rời ra ngoài.

**Quy ước vá an toàn (precision-first):**
- Regex tiếng Việt: cờ `u` + lookaround `(?!\p{L})`/`(?<!\p{L})` — KHÔNG dùng `\b`
  ASCII (sai quanh ký tự Việt).
- Mọi `new RegExp(\`…${name}…\`)` nội suy tên PHẢI `escapeRe` (tên OCR méo chứa ký
  tự regex → crash). Xem `_shared.ts`.
- **TDD**: viết test trước (đỏ → xanh).
- **CỔNG REGRESSION (bắt buộc trước commit)**: `npm run typecheck` exit 0 + `npx jest
  src/stamps/geometry-2d` xanh + tập bài FULL của `diag-all` KHÔNG mất id nào:
  ```bash
  npx tsx scripts/diag-all.ts >/dev/null 2>&1 && .venv/bin/python -c \
    "import json; n=set(int(x['id']) for x in json.load(open('.work/escalations.json')) if x['ok']); print('full',len(n))"
  ```
  (Snapshot tập id trước/sau, so không LOST.)

**Mẹo chạy quy mô (loop dài, tránh đầy context):** giao mỗi cụm gap cho 1 subagent
(`general-purpose`), tuần tự, mỗi cái: TDD + cổng-regression + **render + XEM ẢNH
verify hình đúng** + commit, trả tóm tắt ngắn. Coordinator chỉ verify giữa vòng +
cập nhật baseline.

---

## Cấu trúc sách hiện tại (đã khảo sát)

| Chương | Trang | Nội dung | Cách cắt đề trong `segment-problems.ts` |
|---|---|---|---|
| 1 | 7–12 | Bổ đề (lemma) | BỎ |
| 2 | 13–114 | 100 bài + lời giải (KHÔNG header "Bài N") | đoạn prose TRƯỚC "Lời giải" |
| 3 | 115–116 | Bài 101–105 (đề xuất) | split "Bài N." |
| 4 | 117–119 | Bài 1–20+ (đề thuần) | split "Bài N." |

## Gotchas

- **Hình render nền TRẮNG** (`render-figures.ts` `flatten({background:'#fff'})`): SVG
  không có rect nền → PNG alpha=0, nếu không flatten thì viewer/`convert RGB` dồn
  thành ĐEN khó nhìn. Fill xanh nhạt bán-trong-suốt + nét xanh đậm trên trắng = khớp
  theme editor.
- **`introBeforeProof` cắt intro tại marker proof** ("Chứng minh"/"Tính"/"a)"…): "a)"
  dùng lookbehind `(?<![\p{L}])a\)` để KHÔNG khớp nhầm trong từ (vd "…Khoa)" tên tác
  giả). Hàm này lặp ở `diag-all.ts` / `render-figures.ts` / `check-completeness.ts`
  — sửa phải đồng bộ cả 3.
- **OCR cache** `docs/datasets/sources/ocr/all.json` committed → re-segment KHÔNG cần
  re-OCR (scratchpad bị dọn giữa session). Chỉ re-OCR khi đổi PDF/DPI.
- **Tesseract**: cần `tesseract` CLI (vie+eng) cho `compare.py`; `ocr-pages.ts` dùng
  tesseract.js (tải traineddata lần đầu).
