# Nguồn dữ liệu — Hình không gian lớp 12 bổ sung (09/2026): thể tích khối đa diện + câu hình học trong đề TN THPT

File đề: `hinh-khong-gian-12-bosung-2026-09.txt` — **70 bài** đề thật (không bài nào tự sáng tác), dạng `Câu N: <đề>`.

Cơ cấu:
- **Câu 1–30 (30 bài)** — thể tích khối chóp: cạnh bên ⊥ đáy, hai mặt phẳng cùng ⊥ đáy, hình chiếu của đỉnh là trung điểm/tâm, mặt bên (tam giác đều/cân/vuông) nằm trong mặt phẳng ⊥ đáy, chóp đều, chóp có các cạnh bên bằng nhau / các mặt bên cùng tạo góc với đáy, tam diện vuông.
- **Câu 31–49 (19 bài; 17 từ nguồn 2, 2 từ nguồn 3)** — thể tích lăng trụ / hộp / lập phương: lăng trụ đứng, lăng trụ xiên (hình chiếu của đỉnh là trọng tâm, trung điểm, điểm chia cạnh, tâm đáy), mặt bên ⊥ đáy, hình hộp chữ nhật, hình hộp có đỉnh cách đều, lập phương.
- **Câu 50–70 (21 bài)** — câu hình học không gian (không Oxyz) trong đề thi thật: đề tham khảo TN THPT 2023, đề chính thức 2023 (mã 101, 104), 2024 (mã 101, 102), 2025 (mã 101, 102): thể tích, khoảng cách, góc, khối nón (nội tiếp cầu, qua lập phương, mặt phẳng qua đỉnh), mặt cầu ngoại tiếp, chóp cụt đều. Trong đó Câu 54 (S.ABCD cho sẵn chiều cao và diện tích đáy) là câu công thức; Câu 50, 66, 69 là chóp có cạnh bên ⊥ đáy với số liệu cụ thể — đều có hình được đặt tên.

## Quy trình
Tìm trên toanmath.com → trích URL PDF trực tiếp (`https://toanmath.com/toanmath-pdf/<slug>.pdf`) từ landing page →
`curl -L` → `pdftotext` (thường và `-layout`) → tách khối theo `Ví dụ N:` / `Câu N:` → cắt ở phương án `A.` /
`Lời giải` → **đọc tay từng bài được chọn** và sửa lỗi trích xuất rõ ràng: nối lại `( SAB )` → `(SAB)`, khôi phục dấu phẩy
trên `A′B′C′` → `A'B'C'`, `a 3` → `a√3`, `60o` → `60°`, phân số bị tách dòng (`4a` / `5` → `4a/√5`), góc có mũ bị mất
(`SAC = 30°` → `góc SAC = 30°`), sửa lỗi chính tả hiển nhiên (`dều` → `đều`, `hình chóp hộp` → `hình hộp`, `trùng cới` → `trùng với`).
Bỏ đáp án A./B./C./D., lời giải, watermark. Khử trùng lặp bằng `difflib.SequenceMatcher` trên văn bản chuẩn hoá, so với
`hinh-khong-gian-12-khoi-tron-xoay.txt`, `hinh-khong-gian-11-songsong-thietdien.txt`, `hinh-khong-gian-11-vuonggoc-khoangcach.txt`
và giữa các bài với nhau.

**Kiểm chứng số liệu đề thi.** PDF đề thi dùng font MathType: `pdftotext` **làm rơi mất** các ký hiệu `=`, `√`, `π`, `′`.
Vì vậy mỗi số liệu bị nghi ngờ đã được kiểm lại bằng lời giải đi kèm trong cùng PDF hoặc bằng cách tính lại đáp án đúng:
- 2024 mã 101 Câu 29: `SA  2a` → **SA = √2a** (từ 1/AH² = 1/AO² + 1/SA² và đáp án √10a/5).
- 2024 mã 101 Câu 35: `SA  3a` → **SA = √3a** (tan SMA = √3 → 60°).
- 2024 mã 102 Câu 43: `AB  3a` → **AB = √3a** (lời giải BC = a√2, V = √3a³/3).
- 2023 mã 101 Câu 34: giữ **BC = 2, AA' = 2** (1/h² = 1/4 + 1 + 1/4 = 3/2 → h = √6/3 đúng đáp án D).
- 2023 mã 101 Câu 38: chiều cao **√3a/6** (tan = √3/3 → 30°).
- 2023 mã 104 Câu 48: mặt xung quanh qua **A', B', C', D'** (dấu phẩy bị rơi; lời giải dùng tâm O' của A'B'C'D').
- Đề tham khảo 2023 Câu 43: khoảng cách **√6a/3**; Câu 48: thể tích **800π/3** (R = 10, OH = 4√2 khớp đáp án C).
- 2025 mã 101 Phần III Câu 4: **SH = √3** (chỉ √3 cho đáp án 1,04); mã 102 Phần III Câu 6: **SH = √2** (đáp án 0,85).
- Tài liệu toanmath: `a 3` = a√3 (lũy thừa được in `a3`); Dạng 3 Ví dụ 7 `4a/√5` kiểm bằng đáp án 16a³/3; Dạng 2 Ví dụ 3 `AC = 2a`
  kiểm bằng lời giải (S_ABC = 3a²); lăng trụ Bài tập Câu 1 là **AC'** = a√3 (đáp án V = a³).

## Nguồn ĐÃ DÙNG (toanmath.com)

| # | Tài liệu | Landing URL | PDF URL | Số bài giữ |
|---|----------|-------------|---------|-----------|
| 1 | Chuyên đề trắc nghiệm thể tích khối chóp (48 tr.) | https://toanmath.com/2022/07/chuyen-de-trac-nghiem-the-tich-khoi-chop.html | https://toanmath.com/toanmath-pdf/chuyen-de-trac-nghiem-the-tich-khoi-chop.pdf | 30 |
| 2 | Chuyên đề trắc nghiệm thể tích khối lăng trụ (30 tr.) | https://toanmath.com/2022/07/chuyen-de-trac-nghiem-the-tich-khoi-lang-tru.html | https://toanmath.com/toanmath-pdf/chuyen-de-trac-nghiem-the-tich-khoi-lang-tru.pdf | 17 |
| 3 | Bài tập thể tích khối lăng trụ xiên có lời giải chi tiết | https://toanmath.com/2019/10/bai-tap-the-tich-khoi-lang-tru-xien-co-loi-giai-chi-tiet.html | https://toanmath.com/toanmath-pdf/bai-tap-the-tich-khoi-lang-tru-xien-co-loi-giai-chi-tiet.pdf | 2 |
| 4 | Đáp án và lời giải chi tiết đề tham khảo TN THPT 2023 môn Toán | https://toanmath.com/2023/03/dap-an-va-loi-giai-chi-tiet-de-tham-khao-tot-nghiep-thpt-2023-mon-toan.html | https://toanmath.com/toanmath-pdf/dap-an-va-loi-giai-chi-tiet-de-tham-khao-tot-nghiep-thpt-2023-mon-toan.pdf | 4 |
| 5 | Đề chính thức kỳ thi TN THPT năm 2023 môn Toán (mã 101–104, có lời giải) | https://toanmath.com/2023/06/de-chinh-thuc-ky-thi-tot-nghiep-thpt-nam-2023-mon-toan.html | https://toanmath.com/toanmath-pdf/de-chinh-thuc-ky-thi-tot-nghiep-thpt-nam-2023-mon-toan.pdf | 6 |
| 6 | Đề chính thức kỳ thi TN THPT năm 2024 môn Toán (mã 101–104, có lời giải) | https://toanmath.com/2024/06/de-chinh-thuc-ky-thi-tot-nghiep-thpt-nam-2024-mon-toan.html | https://toanmath.com/toanmath-pdf/de-chinh-thuc-ky-thi-tot-nghiep-thpt-nam-2024-mon-toan.pdf | 6 |
| 7 | Hướng dẫn giải đề chính thức TN THPT năm 2025 môn Toán (Toán Từ Tâm, mã gốc 101–104) | https://toanmath.com/2025/06/huong-dan-giai-de-chinh-thuc-tot-nghiep-thpt-nam-2025-mon-toan.html | https://toanmath.com/toanmath-pdf/huong-dan-giai-de-chinh-thuc-tot-nghiep-thpt-nam-2025-mon-toan.pdf | 5 |

## Nguồn / bài BỊ LOẠI (kèm lý do)

- **Bài tập trắc nghiệm thể tích khối chóp — Trần Đình Cư** (https://toanmath.com/toanmath-pdf/bai-tap-trac-nghiem-the-tich-khoi-chop-tran-dinh-cu.pdf):
  loại cả nguồn — font Symbol làm mất `=`, `⊥`, `∠` (`AB  2a,AD  a`, `ABC  600`), phải đoán quá nhiều.
- **Bài tập thể tích khối chóp đều có lời giải chi tiết** (https://toanmath.com/toanmath-pdf/bai-tap-the-tich-khoi-chop-deu-co-loi-giai-chi-tiet.pdf):
  không dùng — text layer trộn phương án của câu trước vào đầu câu sau (`Câu 2. 3a 3 . 24 B. V = ... Cho hình chóp đều...`),
  nhiều câu cụt; phần chóp đều đã đủ từ nguồn 1.
- **Bài tập thể tích khối lăng trụ đều có lời giải chi tiết** (https://toanmath.com/toanmath-pdf/bai-tap-the-tich-khoi-lang-tru-deu-co-loi-giai-chi-tiet.pdf): tải về nhưng không cần dùng (đủ số lượng).
- Nguồn 3 (lăng trụ xiên): chỉ giữ 2 bài có văn bản liền mạch; phần lớn bài bị trộn cột (đề của câu này lẫn đuôi câu khác).
- **Trùng dataset sẵn có** (loại sau khi khử trùng lặp, ratio 0,82–0,86): nguồn 1 Dạng 1 Ví dụ 5 và Ví dụ 10, nguồn 2 Dạng 2 Ví dụ 1
  và Ví dụ 2 — đã có trong `hinh-khong-gian-11-vuonggoc-khoangcach.txt`; thay bằng 4 bài khác.
- **Loại ở mức từng bài:** bài có đề sai/chữ lạ trong nguồn (Dạng 1 VD8 `AD = 2AB = 2CD`, VD12 `hình chiếu của H`,
  Dạng 2 VD8 `thuộc mặt phẳng đáy`, VD11 thiếu số đo góc), bài dạng biến thể gần như y hệt (Câu 36/37/38, 33/34 của nguồn 1),
  bài có số liệu `2a`/`√2a` không phân định được (nguồn 1 Bài tập Câu 1), bài công thức một dòng không có hình được đặt tên,
  và mọi câu Oxyz.
- **Đề thi — loại:** 2023 mã 101 Câu 13 (hình trụ, công thức một dòng) và Câu 14 (khối nón — ký hiệu π bị rơi, không kiểm
  được từ lời giải); đề tham khảo 2023 Câu 30 (góc, quá đơn giản); các câu trùng nội dung giữa các mã đề (2023 mã 103 Câu 38
  hộp chữ nhật AB = 1, BC = 2, AA' = 3; 2025 mã 103/104 bài khoảng cách AC–SD chỉ đổi số).
- **Không lấy được PDF:** landing đề chính thức 2020, 2021, 2022 và đề minh hoạ 2025 trên toanmath (đoán slug) không có link PDF → bỏ.

## Lưu ý chất lượng

- Đề 2025 lấy từ bản gõ lại "Toán Từ Tâm" của mã đề gốc (không phải bản scan của Bộ); nội dung trùng khớp đề chính thức nhưng
  hình vẽ không kèm (câu ghi "xem hình vẽ").
- Câu 54 (TN 2023 Câu 16) là câu công thức nhưng có hình S.ABCD — trong giới hạn ≤5 câu "một dòng".
- Câu 17 dùng chữ "góc" thay dấu mũ bị mất khi trích (`góc ASB = góc BSC = 60°`); Câu 47 giữ ký hiệu `A1B1C1` của nguồn (chỉ số dưới bị làm phẳng).

## Mapping Câu → nguồn

- Câu 1 → Chuyên đề trắc nghiệm thể tích khối chóp (toanmath) — Dạng 1 – Ví dụ 1 — https://toanmath.com/toanmath-pdf/chuyen-de-trac-nghiem-the-tich-khoi-chop.pdf
- Câu 2 → Chuyên đề trắc nghiệm thể tích khối chóp (toanmath) — Dạng 1 – Ví dụ 2 — https://toanmath.com/toanmath-pdf/chuyen-de-trac-nghiem-the-tich-khoi-chop.pdf
- Câu 3 → Chuyên đề trắc nghiệm thể tích khối chóp (toanmath) — Dạng 1 – Ví dụ 4 — https://toanmath.com/toanmath-pdf/chuyen-de-trac-nghiem-the-tich-khoi-chop.pdf
- Câu 4 → Chuyên đề trắc nghiệm thể tích khối chóp (toanmath) — Dạng 1 – Ví dụ 6 — https://toanmath.com/toanmath-pdf/chuyen-de-trac-nghiem-the-tich-khoi-chop.pdf
- Câu 5 → Chuyên đề trắc nghiệm thể tích khối chóp (toanmath) — Dạng 1 – Ví dụ 7 — https://toanmath.com/toanmath-pdf/chuyen-de-trac-nghiem-the-tich-khoi-chop.pdf
- Câu 6 → Chuyên đề trắc nghiệm thể tích khối chóp (toanmath) — Bài tập tự luyện – Câu 29 — https://toanmath.com/toanmath-pdf/chuyen-de-trac-nghiem-the-tich-khoi-chop.pdf
- Câu 7 → Chuyên đề trắc nghiệm thể tích khối chóp (toanmath) — Dạng 1 – Ví dụ 13 — https://toanmath.com/toanmath-pdf/chuyen-de-trac-nghiem-the-tich-khoi-chop.pdf
- Câu 8 → Chuyên đề trắc nghiệm thể tích khối chóp (toanmath) — Dạng 2 – Ví dụ 1 — https://toanmath.com/toanmath-pdf/chuyen-de-trac-nghiem-the-tich-khoi-chop.pdf
- Câu 9 → Chuyên đề trắc nghiệm thể tích khối chóp (toanmath) — Dạng 2 – Ví dụ 3 — https://toanmath.com/toanmath-pdf/chuyen-de-trac-nghiem-the-tich-khoi-chop.pdf
- Câu 10 → Chuyên đề trắc nghiệm thể tích khối chóp (toanmath) — Dạng 2 – Ví dụ 4 — https://toanmath.com/toanmath-pdf/chuyen-de-trac-nghiem-the-tich-khoi-chop.pdf
- Câu 11 → Chuyên đề trắc nghiệm thể tích khối chóp (toanmath) — Dạng 2 – Ví dụ 7 — https://toanmath.com/toanmath-pdf/chuyen-de-trac-nghiem-the-tich-khoi-chop.pdf
- Câu 12 → Chuyên đề trắc nghiệm thể tích khối chóp (toanmath) — Dạng 3 – Ví dụ 2 — https://toanmath.com/toanmath-pdf/chuyen-de-trac-nghiem-the-tich-khoi-chop.pdf
- Câu 13 → Chuyên đề trắc nghiệm thể tích khối chóp (toanmath) — Dạng 3 – Ví dụ 3 — https://toanmath.com/toanmath-pdf/chuyen-de-trac-nghiem-the-tich-khoi-chop.pdf
- Câu 14 → Chuyên đề trắc nghiệm thể tích khối chóp (toanmath) — Dạng 3 – Ví dụ 7 — https://toanmath.com/toanmath-pdf/chuyen-de-trac-nghiem-the-tich-khoi-chop.pdf
- Câu 15 → Chuyên đề trắc nghiệm thể tích khối chóp (toanmath) — Dạng 3 – Ví dụ 8 — https://toanmath.com/toanmath-pdf/chuyen-de-trac-nghiem-the-tich-khoi-chop.pdf
- Câu 16 → Chuyên đề trắc nghiệm thể tích khối chóp (toanmath) — Dạng 3 – Ví dụ 11 — https://toanmath.com/toanmath-pdf/chuyen-de-trac-nghiem-the-tich-khoi-chop.pdf
- Câu 17 → Chuyên đề trắc nghiệm thể tích khối chóp (toanmath) — Dạng 4 – Ví dụ 1 — https://toanmath.com/toanmath-pdf/chuyen-de-trac-nghiem-the-tich-khoi-chop.pdf
- Câu 18 → Chuyên đề trắc nghiệm thể tích khối chóp (toanmath) — Dạng 4 – Ví dụ 3 — https://toanmath.com/toanmath-pdf/chuyen-de-trac-nghiem-the-tich-khoi-chop.pdf
- Câu 19 → Chuyên đề trắc nghiệm thể tích khối chóp (toanmath) — Dạng 4 – Ví dụ 4 — https://toanmath.com/toanmath-pdf/chuyen-de-trac-nghiem-the-tich-khoi-chop.pdf
- Câu 20 → Chuyên đề trắc nghiệm thể tích khối chóp (toanmath) — Bài tập tự luyện – Câu 4 — https://toanmath.com/toanmath-pdf/chuyen-de-trac-nghiem-the-tich-khoi-chop.pdf
- Câu 21 → Chuyên đề trắc nghiệm thể tích khối chóp (toanmath) — Bài tập tự luyện – Câu 5 — https://toanmath.com/toanmath-pdf/chuyen-de-trac-nghiem-the-tich-khoi-chop.pdf
- Câu 22 → Chuyên đề trắc nghiệm thể tích khối chóp (toanmath) — Bài tập tự luyện – Câu 9 — https://toanmath.com/toanmath-pdf/chuyen-de-trac-nghiem-the-tich-khoi-chop.pdf
- Câu 23 → Chuyên đề trắc nghiệm thể tích khối chóp (toanmath) — Bài tập tự luyện – Câu 18 — https://toanmath.com/toanmath-pdf/chuyen-de-trac-nghiem-the-tich-khoi-chop.pdf
- Câu 24 → Chuyên đề trắc nghiệm thể tích khối chóp (toanmath) — Bài tập tự luyện – Câu 20 — https://toanmath.com/toanmath-pdf/chuyen-de-trac-nghiem-the-tich-khoi-chop.pdf
- Câu 25 → Chuyên đề trắc nghiệm thể tích khối chóp (toanmath) — Bài tập tự luyện – Câu 39 — https://toanmath.com/toanmath-pdf/chuyen-de-trac-nghiem-the-tich-khoi-chop.pdf
- Câu 26 → Chuyên đề trắc nghiệm thể tích khối chóp (toanmath) — Bài tập tự luyện – Câu 41 — https://toanmath.com/toanmath-pdf/chuyen-de-trac-nghiem-the-tich-khoi-chop.pdf
- Câu 27 → Chuyên đề trắc nghiệm thể tích khối chóp (toanmath) — Bài tập tự luyện – Câu 44 — https://toanmath.com/toanmath-pdf/chuyen-de-trac-nghiem-the-tich-khoi-chop.pdf
- Câu 28 → Chuyên đề trắc nghiệm thể tích khối chóp (toanmath) — Bài tập tự luyện – Câu 45 — https://toanmath.com/toanmath-pdf/chuyen-de-trac-nghiem-the-tich-khoi-chop.pdf
- Câu 29 → Chuyên đề trắc nghiệm thể tích khối chóp (toanmath) — Bài tập tự luyện – Câu 54 — https://toanmath.com/toanmath-pdf/chuyen-de-trac-nghiem-the-tich-khoi-chop.pdf
- Câu 30 → Chuyên đề trắc nghiệm thể tích khối chóp (toanmath) — Bài tập tự luyện – Câu 59 — https://toanmath.com/toanmath-pdf/chuyen-de-trac-nghiem-the-tich-khoi-chop.pdf
- Câu 31 → Chuyên đề trắc nghiệm thể tích khối lăng trụ (toanmath) — Dạng 1 – Ví dụ 1 — https://toanmath.com/toanmath-pdf/chuyen-de-trac-nghiem-the-tich-khoi-lang-tru.pdf
- Câu 32 → Chuyên đề trắc nghiệm thể tích khối lăng trụ (toanmath) — Dạng 1 – Ví dụ 2 — https://toanmath.com/toanmath-pdf/chuyen-de-trac-nghiem-the-tich-khoi-lang-tru.pdf
- Câu 33 → Chuyên đề trắc nghiệm thể tích khối lăng trụ (toanmath) — Dạng 1 – Ví dụ 4 — https://toanmath.com/toanmath-pdf/chuyen-de-trac-nghiem-the-tich-khoi-lang-tru.pdf
- Câu 34 → Chuyên đề trắc nghiệm thể tích khối lăng trụ (toanmath) — Dạng 1 – Ví dụ 6 — https://toanmath.com/toanmath-pdf/chuyen-de-trac-nghiem-the-tich-khoi-lang-tru.pdf
- Câu 35 → Chuyên đề trắc nghiệm thể tích khối lăng trụ (toanmath) — Dạng 1 – Ví dụ 8 — https://toanmath.com/toanmath-pdf/chuyen-de-trac-nghiem-the-tich-khoi-lang-tru.pdf
- Câu 36 → Chuyên đề trắc nghiệm thể tích khối lăng trụ (toanmath) — Dạng 1 – Ví dụ 12 — https://toanmath.com/toanmath-pdf/chuyen-de-trac-nghiem-the-tich-khoi-lang-tru.pdf
- Câu 37 → Chuyên đề trắc nghiệm thể tích khối lăng trụ (toanmath) — Dạng 1 – Ví dụ 13 — https://toanmath.com/toanmath-pdf/chuyen-de-trac-nghiem-the-tich-khoi-lang-tru.pdf
- Câu 38 → Bài tập thể tích khối lăng trụ xiên có lời giải chi tiết (toanmath) — Câu 19 — https://toanmath.com/toanmath-pdf/bai-tap-the-tich-khoi-lang-tru-xien-co-loi-giai-chi-tiet.pdf
- Câu 39 → Bài tập thể tích khối lăng trụ xiên có lời giải chi tiết (toanmath) — Câu 38 — https://toanmath.com/toanmath-pdf/bai-tap-the-tich-khoi-lang-tru-xien-co-loi-giai-chi-tiet.pdf
- Câu 40 → Chuyên đề trắc nghiệm thể tích khối lăng trụ (toanmath) — Dạng 2 – Ví dụ 4 — https://toanmath.com/toanmath-pdf/chuyen-de-trac-nghiem-the-tich-khoi-lang-tru.pdf
- Câu 41 → Chuyên đề trắc nghiệm thể tích khối lăng trụ (toanmath) — Dạng 2 – Ví dụ 6 — https://toanmath.com/toanmath-pdf/chuyen-de-trac-nghiem-the-tich-khoi-lang-tru.pdf
- Câu 42 → Chuyên đề trắc nghiệm thể tích khối lăng trụ (toanmath) — Dạng 2 – Ví dụ 13 — https://toanmath.com/toanmath-pdf/chuyen-de-trac-nghiem-the-tich-khoi-lang-tru.pdf
- Câu 43 → Chuyên đề trắc nghiệm thể tích khối lăng trụ (toanmath) — Dạng 2 – Ví dụ 14 — https://toanmath.com/toanmath-pdf/chuyen-de-trac-nghiem-the-tich-khoi-lang-tru.pdf
- Câu 44 → Chuyên đề trắc nghiệm thể tích khối lăng trụ (toanmath) — Dạng 2 – Ví dụ 15 — https://toanmath.com/toanmath-pdf/chuyen-de-trac-nghiem-the-tich-khoi-lang-tru.pdf
- Câu 45 → Chuyên đề trắc nghiệm thể tích khối lăng trụ (toanmath) — Dạng 2 – Ví dụ 16 — https://toanmath.com/toanmath-pdf/chuyen-de-trac-nghiem-the-tich-khoi-lang-tru.pdf
- Câu 46 → Chuyên đề trắc nghiệm thể tích khối lăng trụ (toanmath) — Bài tập tự luyện – Câu 1 — https://toanmath.com/toanmath-pdf/chuyen-de-trac-nghiem-the-tich-khoi-lang-tru.pdf
- Câu 47 → Chuyên đề trắc nghiệm thể tích khối lăng trụ (toanmath) — Bài tập tự luyện – Câu 10 — https://toanmath.com/toanmath-pdf/chuyen-de-trac-nghiem-the-tich-khoi-lang-tru.pdf
- Câu 48 → Chuyên đề trắc nghiệm thể tích khối lăng trụ (toanmath) — Bài tập tự luyện – Câu 19 — https://toanmath.com/toanmath-pdf/chuyen-de-trac-nghiem-the-tich-khoi-lang-tru.pdf
- Câu 49 → Chuyên đề trắc nghiệm thể tích khối lăng trụ (toanmath) — Bài tập tự luyện – Câu 31 — https://toanmath.com/toanmath-pdf/chuyen-de-trac-nghiem-the-tich-khoi-lang-tru.pdf
- Câu 50 → Đề tham khảo TN THPT 2023 môn Toán (BGD&ĐT) — Câu 14 — https://toanmath.com/toanmath-pdf/dap-an-va-loi-giai-chi-tiet-de-tham-khao-tot-nghiep-thpt-2023-mon-toan.pdf
- Câu 51 → Đề tham khảo TN THPT 2023 môn Toán (BGD&ĐT) — Câu 38 — https://toanmath.com/toanmath-pdf/dap-an-va-loi-giai-chi-tiet-de-tham-khao-tot-nghiep-thpt-2023-mon-toan.pdf
- Câu 52 → Đề tham khảo TN THPT 2023 môn Toán (BGD&ĐT) — Câu 43 — https://toanmath.com/toanmath-pdf/dap-an-va-loi-giai-chi-tiet-de-tham-khao-tot-nghiep-thpt-2023-mon-toan.pdf
- Câu 53 → Đề tham khảo TN THPT 2023 môn Toán (BGD&ĐT) — Câu 48 — https://toanmath.com/toanmath-pdf/dap-an-va-loi-giai-chi-tiet-de-tham-khao-tot-nghiep-thpt-2023-mon-toan.pdf
- Câu 54 → Đề chính thức TN THPT 2023, mã đề 101 — Câu 16 — https://toanmath.com/toanmath-pdf/de-chinh-thuc-ky-thi-tot-nghiep-thpt-nam-2023-mon-toan.pdf
- Câu 55 → Đề chính thức TN THPT 2023, mã đề 101 — Câu 34 — https://toanmath.com/toanmath-pdf/de-chinh-thuc-ky-thi-tot-nghiep-thpt-nam-2023-mon-toan.pdf
- Câu 56 → Đề chính thức TN THPT 2023, mã đề 101 — Câu 38 — https://toanmath.com/toanmath-pdf/de-chinh-thuc-ky-thi-tot-nghiep-thpt-nam-2023-mon-toan.pdf
- Câu 57 → Đề chính thức TN THPT 2023, mã đề 101 — Câu 44 — https://toanmath.com/toanmath-pdf/de-chinh-thuc-ky-thi-tot-nghiep-thpt-nam-2023-mon-toan.pdf
- Câu 58 → Đề chính thức TN THPT 2023, mã đề 101 — Câu 48 — https://toanmath.com/toanmath-pdf/de-chinh-thuc-ky-thi-tot-nghiep-thpt-nam-2023-mon-toan.pdf
- Câu 59 → Đề chính thức TN THPT 2023, mã đề 104 — Câu 48 — https://toanmath.com/toanmath-pdf/de-chinh-thuc-ky-thi-tot-nghiep-thpt-nam-2023-mon-toan.pdf
- Câu 60 → Đề chính thức TN THPT 2024, mã đề 101 — Câu 29 — https://toanmath.com/toanmath-pdf/de-chinh-thuc-ky-thi-tot-nghiep-thpt-nam-2024-mon-toan.pdf
- Câu 61 → Đề chính thức TN THPT 2024, mã đề 101 — Câu 35 — https://toanmath.com/toanmath-pdf/de-chinh-thuc-ky-thi-tot-nghiep-thpt-nam-2024-mon-toan.pdf
- Câu 62 → Đề chính thức TN THPT 2024, mã đề 101 — Câu 44 — https://toanmath.com/toanmath-pdf/de-chinh-thuc-ky-thi-tot-nghiep-thpt-nam-2024-mon-toan.pdf
- Câu 63 → Đề chính thức TN THPT 2024, mã đề 101 — Câu 48 — https://toanmath.com/toanmath-pdf/de-chinh-thuc-ky-thi-tot-nghiep-thpt-nam-2024-mon-toan.pdf
- Câu 64 → Đề chính thức TN THPT 2024, mã đề 102 — Câu 33 — https://toanmath.com/toanmath-pdf/de-chinh-thuc-ky-thi-tot-nghiep-thpt-nam-2024-mon-toan.pdf
- Câu 65 → Đề chính thức TN THPT 2024, mã đề 102 — Câu 43 — https://toanmath.com/toanmath-pdf/de-chinh-thuc-ky-thi-tot-nghiep-thpt-nam-2024-mon-toan.pdf
- Câu 66 → Đề chính thức TN THPT 2025, mã đề 101 (bản gõ lại của Toán Từ Tâm) — Phần I – Câu 12 — https://toanmath.com/toanmath-pdf/huong-dan-giai-de-chinh-thuc-tot-nghiep-thpt-nam-2025-mon-toan.pdf
- Câu 67 → Đề chính thức TN THPT 2025, mã đề 101 (bản gõ lại của Toán Từ Tâm) — Phần III – Câu 4 — https://toanmath.com/toanmath-pdf/huong-dan-giai-de-chinh-thuc-tot-nghiep-thpt-nam-2025-mon-toan.pdf
- Câu 68 → Đề chính thức TN THPT 2025, mã đề 101 (bản gõ lại của Toán Từ Tâm) — Phần III – Câu 6 — https://toanmath.com/toanmath-pdf/huong-dan-giai-de-chinh-thuc-tot-nghiep-thpt-nam-2025-mon-toan.pdf
- Câu 69 → Đề chính thức TN THPT 2025, mã đề 102 (bản gõ lại của Toán Từ Tâm) — Phần I – Câu 10 — https://toanmath.com/toanmath-pdf/huong-dan-giai-de-chinh-thuc-tot-nghiep-thpt-nam-2025-mon-toan.pdf
- Câu 70 → Đề chính thức TN THPT 2025, mã đề 102 (bản gõ lại của Toán Từ Tâm) — Phần III – Câu 6 — https://toanmath.com/toanmath-pdf/huong-dan-giai-de-chinh-thuc-tot-nghiep-thpt-nam-2025-mon-toan.pdf
