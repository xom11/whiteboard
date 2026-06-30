---
name: pdf-geometry-figures
description: >-
  Chạy pipeline ẢNH→OCR→VẼ HÌNH 2D cho repo whiteboard khi người dùng đưa MỘT FILE
  PDF đề toán hình học (scan/ảnh) và muốn cắt trang, OCR, cắt đề rồi dựng hình tự
  động. HÃY DÙNG skill này bất cứ khi nào người dùng đưa/nhắc tới một PDF đề hình
  học (vào-10, HSG, chuyên, hình phẳng…) và nói "cắt ảnh / OCR / dựng hình / vẽ
  hình / làm dataset như đang làm / chạy pipeline", KỂ CẢ khi không nói đủ các bước.
  Chỉ dùng trong repo whiteboard (scripts/pdf-dataset/).
---

# PDF đề hình học → OCR → vẽ hình 2D

Người dùng đưa 1 PDF đề toán hình (scan ảnh, không text-layer) và muốn ra **dataset
đề + hình vẽ deterministic** như đã làm cho `tong-hop-hinh-phang-vao10-2018-2019`.
Skill này là **bản tóm tắt thao tác** — chi tiết lệnh + nguyên tắc đầy đủ ở
`scripts/pdf-dataset/README.md` (ĐỌC file đó trước khi chạy).

## Khi nào kích hoạt
Người dùng đưa/đề cập 1 PDF đề hình học + ý muốn "cắt ảnh, OCR, vẽ hình / dựng hình
/ làm như đang làm / chạy pipeline / lên dataset". Không cần họ liệt kê đủ bước.

## Quy trình (làm theo thứ tự, dừng hỏi khi cần quyết định)

> Đọc `scripts/pdf-dataset/README.md` để lấy LỆNH chính xác. Dùng scratchpad cho
> ảnh/ocr/figures tạm (`$SP`), KHÔNG commit file tạm.

1. **Xác nhận đầu vào**: đường dẫn PDF (copy vào `docs/datasets/sources/<ten>.pdf`),
   tên dataset đích `docs/datasets/<ten>.txt`. Hỏi nếu chưa rõ.

2. **Rasterize** mọi trang @200dpi bằng `.venv/bin/python` + fitz → `$SP/pages/`.

3. **OCR** (bước ②): `ocr-pages.ts` → `all.json`; cache vào
   `docs/datasets/sources/ocr/`. Nếu CÙNG PDF đã OCR rồi → dùng cache, KHÔNG re-OCR.

4. **KHẢO CẤU TRÚC SÁCH rồi CHỈNH `segment-problems.ts`** — đây là bước phải-suy-nghĩ,
   KHÁC nhau mỗi sách:
   - Đọc OCR vài trang (xem `all.json`) + vài ảnh trang để hiểu: đề phân tách thế
     nào (header "Câu/Bài/Ví dụ N"? mỗi đề 1 trang? prose trước "Lời giải"? có lời
     giải xen kẽ không?), dải trang mỗi chương, phần BỎ (mục lục/bổ đề/lời giải).
   - Sửa `main()` trong `segment-problems.ts` cho khớp logic cắt + dải trang. GIỮ
     NGUYÊN `clean()` (collapse + `repairOcrSymbols` + `insertBreaks`) và format
     output `"Câu N: <statement>"` (mọi script đo parse format này).
   - Chạy `segment-problems.ts <ocrDir> --write <dataset.txt>`.

5. **Render hình** (bước ④): `render-figures.ts <dataset.txt> $SP/figures all` →
   PNG nền TRẮNG + `summary.json` (full/partial/none).

6. **Đối chiếu + công bố**: `compare.py $SP/pages $SP/figures $SP/compare.html`
   (3 cột ẢNH|TEXT|HÌNH) → **publish Artifact** cho người dùng xem mắt. Chạy
   `diag-all.ts` + `check-completeness.ts` để có số nền (full / điểm vẽ / none).

7. **Báo cáo** số nền + đề xuất bước cải thiện. Nếu người dùng muốn "cải thiện tới
   khi ổn" → chạy **Vòng lặp cải thiện** (mục dưới).

## Vòng lặp cải thiện (khi người dùng muốn vẽ đúng/đủ hơn)
Mỗi vòng: `check-completeness` chọn cụm gap lớn nhất → vá → verify 0-regression →
lặp tới khi cạn. 3 loại gap → 3 chỗ sửa (xem README mục "Vòng lặp cải thiện"):
- OCR sai → `src/.../vision/repairOcrSymbols.ts` (+ mirror `normalizeText.ts` nếu
  pipeline dựng-hình cần) → re-segment.
- Từ khoá bị lọc (`hasGeometry=false`) → `src/.../deterministic/vocabulary.ts`.
- Hình thiếu/construct mới → rule `src/.../ai/rules/` (1 module + 1 dòng registry +
  test); ưu tiên COMPOSE primitive sẵn, builder toạ-độ mới chỉ khi hình thật mới;
  điểm phái sinh dùng `onSegment`/constraint (KHÔNG `explicitCoords`).

**CỔNG REGRESSION bắt buộc trước mỗi commit** (xem README): `npm run typecheck`
exit 0 + `npx jest src/stamps/geometry-2d` xanh + tập bài FULL của `diag-all`
KHÔNG mất id nào (snapshot trước/sau). **Builder mới: render + XEM ẢNH** xác nhận
hình đúng trước khi commit.

**Quy mô lớn**: giao mỗi cụm gap cho 1 subagent (`general-purpose`) tuần tự — mỗi
cái TDD + cổng-regression + xem-ảnh + commit, trả tóm tắt — để context coordinator
gọn. Coordinator verify giữa vòng + cập nhật baseline.

## Quy ước (precision-first)
- Regex tiếng Việt: cờ `u` + lookaround `(?!\p{L})`/`(?<!\p{L})`, KHÔNG `\b` ASCII.
- Nội suy tên vào RegExp PHẢI `escapeRe` (tên OCR méo gây crash). Xem `_shared.ts`.
- Commit tiếng Việt (prefix Anh `fix`/`feat`/`docs`), KHÔNG `Co-Authored-By`.
- TDD: test trước. Mỗi cụm 1 commit.

## File liên quan
- `scripts/pdf-dataset/README.md` — guide đầy đủ (lệnh + sơ đồ + cấu trúc sách).
- `scripts/pdf-dataset/{ocr-pages,segment-problems,render-figures,check-completeness}.ts`, `compare.py`.
- `scripts/diag-all.ts` — coverage full.
- `src/stamps/geometry-2d/ai/{rules,vision,deterministic}/` — nơi vá.
