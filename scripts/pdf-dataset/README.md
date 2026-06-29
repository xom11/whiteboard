# pdf-dataset — pipeline ẢNH → OCR → ĐỀ BÀI → VẼ HÌNH 2D

Xây dataset đề "vẽ hình 2D" từ PDF **scan ảnh** (không text-layer), đi qua đúng
pipeline OCR production (Tesseract + `repairOcrSymbols`). Mục tiêu: lấy đề bài
làm input → dựng hình → kiểm tra mắt → cải thiện OCR / rule vẽ hình → lặp.

Nguồn hiện tại: `docs/datasets/sources/tong-hop-hinh-hoc-phang-vao-10-2018-2019.pdf`
(Tạ Công Hoàng – Nguyễn Đăng Khoa, 119 trang).

## Quy trình (4 bước)

```bash
SP=/tmp/pdf-work            # thư mục tạm (ảnh + ocr + figures — KHÔNG commit)

# 1) Rasterize mọi trang @200dpi (pymupdf trong .venv)
.venv/bin/python -c "import fitz; d=fitz.open('docs/datasets/sources/<file>.pdf'); \
  [d[i].get_pixmap(dpi=200).save(f'$SP/pages/p{i+1:03d}.png') for i in range(d.page_count)]"

# 2) OCR mọi trang (1 worker Tesseract vie+eng dùng lại) → text raw có newline
npx tsx scripts/pdf-dataset/ocr-pages.ts $SP/pages $SP/ocr

# 3) Cắt ĐỀ BÀI (chỉ statement, bỏ lời giải + hình) → docs/datasets/*.txt
#    Áp repairOcrSymbols (production) lên mỗi đề. Re-chạy sau mỗi lần sửa repair.
npx tsx scripts/pdf-dataset/segment-problems.ts $SP/ocr \
  --write docs/datasets/tong-hop-hinh-phang-vao10-2018-2019.txt

# 4) Dựng hình (deterministic, không LLM) + render PNG để kiểm tra mắt
npx tsx scripts/pdf-dataset/render-figures.ts \
  docs/datasets/tong-hop-hinh-phang-vao10-2018-2019.txt $SP/figures all
#    → $SP/figures/cau-NNN.png + summary.json ; mở PNG so với đề.
```

Benchmark text-only (coverage): `npx tsx scripts/diag-all.ts` → `.work/escalations.json`.
Debug 1 bài: `npx tsx scripts/dbg-bai.ts vao10_2018 <id>`.

## Vòng lặp cải thiện

- **OCR sai** (nhãn/từ khoá hỏng) → vá `src/.../vision/repairOcrSymbols.ts`
  (precision-first, GATE ngữ cảnh, TDD) → chạy lại bước 3.
- **Hình sai/thiếu** → mở rộng rule `src/.../ai/rules/` (TDD) → chạy lại bước 4.

## Cấu trúc sách (đã khảo sát)

| Chương | Trang | Nội dung | Cắt đề |
|---|---|---|---|
| 1 | 7–12 | Bổ đề (lemma) | BỎ |
| 2 | 13–114 | 100 bài + lời giải (KHÔNG header "Bài N") | đoạn prose TRƯỚC "Lời giải" |
| 3 | 115–116 | Bài 101–105 (đề xuất) | split "Bài N." |
| 4 | 117–119 | Bài 1–20+ (đề thuần) | split "Bài N." |
