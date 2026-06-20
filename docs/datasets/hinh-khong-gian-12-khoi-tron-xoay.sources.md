# Nguồn dữ liệu — Khối tròn xoay lớp 12 (mặt cầu / mặt trụ / mặt nón + nội/ngoại tiếp đa diện)

File đề: `khoitronxoay12.txt` — **89 bài** đề sạch, dạng `Câu N: <đề>`.

Chủ đề: mặt cầu ngoại tiếp/nội tiếp hình chóp – lăng trụ – tứ diện; mặt nón / mặt trụ
(thiết diện qua trục, dây cung); khối trụ/nón nội tiếp – ngoại tiếp đa diện & mặt cầu.

## Quy trình
toanmath landing page → trích URL PDF trực tiếp (`https://toanmath.com/toanmath-pdf/<slug>.pdf`)
→ `curl -L` về `/tmp/hkg_c_<n>.pdf` → `markitdown` (.venv repo chính) → cổng chất lượng
(nhãn đỉnh S/A/B/C/D/O/I còn nguyên, ít ngoặc rỗng, không Oxyz) → segment theo
marker `Câu/Bài/Ví dụ N` + `Cho hình chóp/Cho hình nón...` → cắt lời giải (Lời giải/Giải/
Hướng dẫn/Phân tích/Cách giải/Đáp án) → lọc "vẽ được" (loại Oxyz/phương trình tọa độ,
loại one-liner thể tích/diện tích không cấu hình, cắt đuôi đáp án trắc nghiệm A./B./C./D.,
gỡ watermark GV/ZALO/Tel/Page) → khử trùng lặp toàn cục.

## Nguồn ĐÃ DÙNG (toanmath.com)

| # | Tài liệu | Landing URL | PDF URL | Số bài giữ |
|---|----------|-------------|---------|-----------|
| 1 | Mặt cầu ngoại tiếp, nội tiếp khối đa diện — Lê Bá Bảo (22 tr.) | https://toanmath.com/2017/05/mat-cau-ngoai-tiep-noi-tiep-khoi-da-dien-le-ba-bao.html | https://toanmath.com/toanmath-pdf/mat-cau-ngoai-tiep-noi-tiep-khoi-da-dien-le-ba-bao.pdf | ~30 |
| 2 | Một số bài tập mặt cầu ngoại tiếp hình chóp — Nguyễn Thanh Hậu (9 tr.) | https://toanmath.com/2016/01/mot-so-bai-tap-mat-cau-ngoai-tiep-hinh-chop-nguyen-thanh-hau.html | https://toanmath.com/toanmath-pdf/mot-so-bai-tap-mat-cau-ngoai-tiep-hinh-chop-nguyen-thanh-hau.pdf | ~4 |
| 3 | Tài liệu tự học mặt nón – mặt trụ – mặt cầu — Trần Quốc Nghĩa (98 tr.) | https://toanmath.com/2019/06/tai-lieu-tu-hoc-mat-non-mat-tru-mat-cau-tran-quoc-nghia.html | https://toanmath.com/toanmath-pdf/tai-lieu-tu-hoc-mat-non-mat-tru-mat-cau-tran-quoc-nghia.pdf | ~16 |
| 4 | Chuyên đề mặt nón, mặt trụ, mặt cầu — Hoàng Xuân Nhàn (102 tr.) | https://toanmath.com/2023/10/chuyen-de-mat-non-mat-tru-mat-cau-hoang-xuan-nhan.html | https://toanmath.com/toanmath-pdf/chuyen-de-mat-non-mat-tru-mat-cau-hoang-xuan-nhan.pdf | ~20 |
| 5 | Phương pháp giải nhanh mặt cầu ngoại tiếp hình chóp — Hoàng Trọng Tấn (10 tr.) | https://toanmath.com/2016/12/phuong-phap-giai-nhanh-bai-toan-mat-cau-ngoai-tiep-hinh-chop-hoang-trong-tan.html | https://toanmath.com/toanmath-pdf/phuong-phap-giai-nhanh-bai-toan-mat-cau-ngoai-tiep-hinh-chop-hoang-trong-tan.pdf | ~12 |
| 6 | Nắm trọn chuyên đề nón – trụ – cầu — Phan Nhật Linh (246 tr.) | https://toanmath.com/2023/09/nam-tron-chuyen-de-non-tru-cau-on-thi-thpt-quoc-gia-mon-toan.html | https://toanmath.com/toanmath-pdf/nam-tron-chuyen-de-non-tru-cau-on-thi-thpt-quoc-gia-mon-toan.pdf | ~7 |

(Số bài/nguồn là ước lượng sau khử trùng lặp toàn cục: bài trùng được giữ ở nguồn ưu tiên
cao hơn — thứ tự ưu tiên 2 → 5 → 1 → 4 → 3 → 6, ưu tiên cụm "mặt cầu ngoại tiếp/nội tiếp".)

Tất cả 6 PDF **ĐẠT cổng chất lượng**: text-layer LaTeX sạch, nhãn đỉnh nguyên vẹn,
0 bài Oxyz lọt vào file đề, rất ít ngoặc rỗng.

## Nguồn / PDF BỊ LOẠI (kèm lý do)

- **Không có PDF nào bị loại vì hỏng văn bản** — 6 PDF tải về đều có text-layer sạch.
- **Loại ở mức từng bài (không phải mức nguồn):**
  - Bài tính thể tích / diện tích một dòng bằng công thức, không có cấu hình để dựng hình
    (vd "Cho hình nón có r=3, l=5. Tính diện tích xung quanh") — loại phần lớn ở file 3, 4, 6.
  - Đoạn lý thuyết / định nghĩa / công thức ("Khi đó ta có các công thức sau", bảng SGK).
  - Câu trắc nghiệm chỉ hỏi số, không mô tả cấu hình (đã cắt đuôi A./B./C./D.; nếu sau khi
    cắt thân bài không còn cấu hình thì loại).
  - 6 bài bị OCR trộn chữ / cắt cụt đầu câu (merge nhãn giữa câu, "Tính diện tích xung G
    hình chóp..."; heading "Cách tìm tâm..."; fragment "Cho mặt cầu (S) phẳng (P),(Q)...")
    → loại sau khi đã lọc strict.
  - Toàn bộ chương Oxyz (mặt cầu/đường/mặt phẳng dạng phương trình tọa độ) — file đề có
    0 bài Oxyz.

## Nhiễu OCR còn sót (chấp nhận được — KHÔNG ảnh hưởng cấu hình dựng hình)

- Chỉ số dưới bị làm phẳng kèm chữ số lạc: `A'B'C'`, `R₁,R₂,R₃` → "R , R , R 1 2 3",
  `h₂` → "h 2", `B₁,C₁` → "B ,C 1 1". Cấu hình vẫn đọc/dựng được.
- Vài bài còn đuôi đáp án trắc nghiệm ngắn (Câu 57, 71, 76, 80) — đề chính đứng trước, tự
  chứa đủ; phần đuôi là giá trị đáp án, không phải cấu hình.
- Đây là artefact markitdown đã biết của PDF LaTeX toanmath; chất lượng nhãn đỉnh tốt.
