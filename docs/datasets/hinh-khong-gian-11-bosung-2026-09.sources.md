# Nguồn dữ liệu HKG lớp 11 — Bổ sung (2026-09): SGK/SBT chương trình GDPT 2018

File đề: `hinh-khong-gian-11-bosung-2026-09.txt` — **69 bài** (định dạng `Câu N: <đề>`, cách nhau 1 dòng trống).

## Mục đích

Bổ sung cho hai bộ `hinh-khong-gian-11-songsong-thietdien.txt` (241 bài) và `hinh-khong-gian-11-vuonggoc-khoangcach.txt` (368 bài) — vốn lấy từ tài liệu chương trình cũ (2017–2022), gần như thiếu hẳn các dạng mới của GDPT 2018: góc nhị diện, hai đường thẳng vuông góc / góc giữa hai đường thẳng, chéo nhau (đường vuông góc chung), phép chiếu song song, lăng trụ/hình hộp ở chương song song, lăng trụ đứng/đều, hai mặt phẳng vuông góc, chóp đều/chóp cụt đều, thể tích (KNTT bài 27). Bộ này dùng làm đầu vào kiểm thử cho engine vẽ hình tự động.

## Quy trình

1. Nghiên cứu mục lục SGK 3 bộ sách (xem mục "Các dạng bài theo chương trình") để xác định dạng bài.
2. Crawl bằng `curl` các trang giải bài tập **từng bài** trên vietjack.com (mỗi bài tập một URL) của các bài học liên quan: KNTT bài 11–14 + cuối chương IV, bài 22–27 + cuối chương VII; CTST chương IV bài 3–5 + cuối chương, chương VIII bài 1–5 + cuối chương; CD chương IV bài 4–6 + cuối chương, chương VIII bài 1–6 + cuối chương; SBT KNTT bài 22, 25, 27; SBT CD bài 3, 6 chương VIII.
3. Lấy đề = đoạn giữa tiêu đề "Bài X trang Y Toán 11 Tập Z:" và "Lời giải:". Công thức trên vietjack là MathML → chuyển sang text (`msqrt`→√, `mfrac`→a/b, `mover` có mũ ^ → "góc XYZ", `msup` 2/3 → ²/³) để không rơi dấu căn/phân số.
4. Làm sạch nhẹ: dấu phẩy trên `’`/`′` → `'`, `30o` → `30°`, bỏ `[IMG]` và tham chiếu "(Hình N)/(H.x.y)", bỏ phương án A./B./C./D. của câu trắc nghiệm (giữ phần dẫn). Hai sửa lỗi gõ của nguồn: Câu 10 `A'B'C D'` → `A'B'C'D'`; Câu 66 thêm dấu "." trước "a)".
5. Lọc "vẽ được": chỉ giữ đề có khối hình với nhãn đỉnh rõ ràng; loại câu mệnh đề lý thuyết, bài thực tế không có nhãn (mái nhà, cột, lều không đủ dữ kiện…), Oxyz, câu bị rơi ký hiệu.
6. Khử trùng lặp với 2 bộ cũ: chuẩn hoá (lowercase, bỏ khoảng trắng/dấu câu) → so 60 ký tự đầu + so tương tự (difflib) 150 ký tự đầu; **0** bài trùng/gần trùng (ngưỡng 0.8). Trong nội bộ file: Câu 1 và Câu 6 trùng phần mở đầu 60 ký tự nhưng là hai bài khác nhau (trung điểm AA', BB', CC' vs AB, BC, AA') → giữ cả hai.

## Phân bố chủ đề

| Dạng | Số bài | Câu |
|---|---|---|
| Song song / thiết diện trên lăng trụ, hình hộp; phép chiếu song song | 12 | 1–12 |
| Hai đường thẳng vuông góc / góc giữa hai đường thẳng | 11 | 13–23 |
| Đường thẳng ⊥ mặt phẳng / hai mặt phẳng vuông góc | 14 | 24–37 |
| Góc đường–mặt & góc nhị diện | 13 | 38–50 |
| Khoảng cách (điểm–đường, điểm–mặt, đường–mặt, mặt–mặt, chéo nhau) | 11 | 51–61 |
| Lăng trụ đứng/đều, chóp đều, chóp cụt đều, thể tích | 8 | 62–69 |
| **Tổng** | **69** | |

Ghi chú: nhiều bài thuộc nhiều dạng (vd. Câu 66–68 vừa là chóp cụt/hình hộp xiên vừa là góc nhị diện/thể tích; Câu 69 là lăng trụ đều gồm cả góc, nhị diện, khoảng cách chéo nhau, thể tích). Số liệu trên phân theo dạng chính. Theo từ khoá: "góc nhị diện"/"nhị diện" 13 bài, "hình hộp"/"lập phương" 14, "lăng trụ" 12, "chóp đều"/"tứ giác đều"/"tam giác đều S." 6, "chóp cụt" 1, "khoảng cách" 12.

## Nguồn ĐÃ DÙNG

Tất cả trang đã được tải thật bằng `curl` ngày 2026-09-28. Bảng theo bài học (trang mục lục bài học → các trang bài tập con):

| Sách / bài học (trang mục lục trên vietjack) | Câu |
|---|---|
| SGK Toán 11 Kết nối tri thức — `bai-13-hai-mat-phang-song-song` <br>https://vietjack.com/toan-11-kn/bai-13-hai-mat-phang-song-song.jsp | 1, 2, 3, 4 |
| SGK Toán 11 Kết nối tri thức — `bai-tap-cuoi-chuong-iv` <br>https://vietjack.com/toan-11-kn/bai-tap-cuoi-chuong-iv.jsp | 5, 6, 7 |
| SGK Toán 11 Chân trời sáng tạo — `bai-4-hai-mat-phang-song-song` <br>https://vietjack.com/toan-11-ct/bai-4-hai-mat-phang-song-song.jsp | 8 |
| SGK Toán 11 Chân trời sáng tạo — `bai-tap-cuoi-chuong-4` <br>https://vietjack.com/toan-11-ct/bai-tap-cuoi-chuong-4.jsp | 9 |
| SGK Toán 11 Cánh diều — `bai-5-hinh-lang-tru-va-hinh-hop` <br>https://vietjack.com/toan-11-cd/bai-5-hinh-lang-tru-va-hinh-hop.jsp | 10, 11 |
| SGK Toán 11 Cánh diều — `bai-6-phep-chieu-song-song-hinh-bieu-dien-cua-mot-hinh-khong-gian` <br>https://vietjack.com/toan-11-cd/bai-6-phep-chieu-song-song-hinh-bieu-dien-cua-mot-hinh-khong-gian.jsp | 12 |
| SGK Toán 11 Kết nối tri thức — `bai-22-hai-duong-thang-vuong-goc` <br>https://vietjack.com/toan-11-kn/bai-22-hai-duong-thang-vuong-goc.jsp | 13, 14, 15 |
| SGK Toán 11 Chân trời sáng tạo — `bai-1-hai-duong-thang-vuong-goc` <br>https://vietjack.com/toan-11-ct/bai-1-hai-duong-thang-vuong-goc.jsp | 16, 17, 18, 19 |
| SGK Toán 11 Cánh diều — `bai-1-hai-duong-thang-vuong-goc` <br>https://vietjack.com/toan-11-cd/bai-1-hai-duong-thang-vuong-goc.jsp | 20 |
| SBT Toán 11 Kết nối tri thức — `bai-22-hai-duong-thang-vuong-goc` <br>https://vietjack.com/sbt-toan-11-kn/bai-22-hai-duong-thang-vuong-goc.jsp | 21, 22, 23 |
| SGK Toán 11 Kết nối tri thức — `bai-23-duong-thang-vuong-goc-voi-mat-phang` <br>https://vietjack.com/toan-11-kn/bai-23-duong-thang-vuong-goc-voi-mat-phang.jsp | 24 |
| SGK Toán 11 Kết nối tri thức — `bai-25-hai-mat-phang-vuong-goc` <br>https://vietjack.com/toan-11-kn/bai-25-hai-mat-phang-vuong-goc.jsp | 25, 39, 40, 41 |
| SGK Toán 11 Chân trời sáng tạo — `bai-2-duong-thang-vuong-goc-voi-mat-phang` <br>https://vietjack.com/toan-11-ct/bai-2-duong-thang-vuong-goc-voi-mat-phang.jsp | 26, 27, 28 |
| SGK Toán 11 Chân trời sáng tạo — `bai-3-hai-mat-phang-vuong-goc` <br>https://vietjack.com/toan-11-ct/bai-3-hai-mat-phang-vuong-goc.jsp | 29, 30, 65 |
| SGK Toán 11 Chân trời sáng tạo — `bai-tap-cuoi-chuong-8` <br>https://vietjack.com/toan-11-ct/bai-tap-cuoi-chuong-8.jsp | 31, 50, 58, 67 |
| SGK Toán 11 Cánh diều — `bai-2-duong-thang-vuong-goc-voi-mat-phang` <br>https://vietjack.com/toan-11-cd/bai-2-duong-thang-vuong-goc-voi-mat-phang.jsp | 32, 33 |
| SGK Toán 11 Cánh diều — `bai-4-hai-mat-phang-vuong-goc` <br>https://vietjack.com/toan-11-cd/bai-4-hai-mat-phang-vuong-goc.jsp | 34, 35 |
| SBT Toán 11 Kết nối tri thức — `bai-25-hai-mat-phang-vuong-goc` <br>https://vietjack.com/sbt-toan-11-kn/bai-25-hai-mat-phang-vuong-goc.jsp | 36, 37, 46, 47 |
| SGK Toán 11 Kết nối tri thức — `bai-24-phep-chieu-vuong-goc` <br>https://vietjack.com/toan-11-kn/bai-24-phep-chieu-vuong-goc.jsp | 38 |
| SGK Toán 11 Chân trời sáng tạo — `bai-5-goc-giua-duong-thang-va-mat-phang` <br>https://vietjack.com/toan-11-ct/bai-5-goc-giua-duong-thang-va-mat-phang.jsp | 42, 43, 66 |
| SGK Toán 11 Cánh diều — `bai-3-goc-giua-duong-thang-va-mat-phang-goc-nhi-dien` <br>https://vietjack.com/toan-11-cd/bai-3-goc-giua-duong-thang-va-mat-phang-goc-nhi-dien.jsp | 44, 45 |
| SBT Toán 11 Cánh diều — `bai-3-goc-giua-duong-thang-va-mat-phang-goc-nhi-dien` <br>https://vietjack.com/sbt-toan-11-cd/bai-3-goc-giua-duong-thang-va-mat-phang-goc-nhi-dien.jsp | 48, 49 |
| SGK Toán 11 Kết nối tri thức — `bai-26-khoang-cach` <br>https://vietjack.com/toan-11-kn/bai-26-khoang-cach.jsp | 51, 52, 53 |
| SGK Toán 11 Kết nối tri thức — `bai-tap-cuoi-chuong-7` <br>https://vietjack.com/toan-11-kn/bai-tap-cuoi-chuong-7.jsp | 54, 64 |
| SGK Toán 11 Chân trời sáng tạo — `bai-4-khoang-cach-trong-khong-gian` <br>https://vietjack.com/toan-11-ct/bai-4-khoang-cach-trong-khong-gian.jsp | 55, 56, 57 |
| SGK Toán 11 Cánh diều — `bai-5-khoang-cach` <br>https://vietjack.com/toan-11-cd/bai-5-khoang-cach.jsp | 59, 60 |
| SGK Toán 11 Cánh diều — `bai-6-hinh-lang-tru-dung-hinh-chop-deu-the-tich-cua-mot-so` <br>https://vietjack.com/toan-11-cd/bai-6-hinh-lang-tru-dung-hinh-chop-deu-the-tich-cua-mot-so.jsp | 61 |
| SGK Toán 11 Kết nối tri thức — `bai-27-the-tich` <br>https://vietjack.com/toan-11-kn/bai-27-the-tich.jsp | 62, 63 |
| SBT Toán 11 Kết nối tri thức — `bai-27-the-tich` <br>https://vietjack.com/sbt-toan-11-kn/bai-27-the-tich.jsp | 68 |
| SGK Toán 11 Cánh diều — `bai-tap-cuoi-chuong-8` <br>https://vietjack.com/toan-11-cd/bai-tap-cuoi-chuong-8.jsp | 69 |

### Truy vết từng câu

| Câu | Bài trong sách | URL trang bài tập |
|---|---|---|
| 1 | SGK Toán 11 Kết nối tri thức — Bài 4.22 trang 94 Toán 11 Tập 1 | https://vietjack.com/toan-11-kn/bai-4-22-trang-94-toan-lop-11-tap-1.jsp |
| 2 | SGK Toán 11 Kết nối tri thức — Bài 4.25 trang 94 Toán 11 Tập 1 | https://vietjack.com/toan-11-kn/bai-4-25-trang-94-toan-lop-11-tap-1.jsp |
| 3 | SGK Toán 11 Kết nối tri thức — Bài 4.26 trang 94 Toán 11 Tập 1 | https://vietjack.com/toan-11-kn/bai-4-26-trang-94-toan-lop-11-tap-1.jsp |
| 4 | SGK Toán 11 Kết nối tri thức — Bài 4.27 trang 94 Toán 11 Tập 1 | https://vietjack.com/toan-11-kn/bai-4-27-trang-94-toan-lop-11-tap-1.jsp |
| 5 | SGK Toán 11 Kết nối tri thức — Bài 4.40 trang 102 Toán 11 Tập 1 | https://vietjack.com/toan-11-kn/bai-4-40-trang-102-toan-lop-11-tap-1.jsp |
| 6 | SGK Toán 11 Kết nối tri thức — Bài 4.42 trang 103 Toán 11 Tập 1 | https://vietjack.com/toan-11-kn/bai-4-42-trang-103-toan-lop-11-tap-1.jsp |
| 7 | SGK Toán 11 Kết nối tri thức — Bài 4.45 trang 103 Toán 11 Tập 1 | https://vietjack.com/toan-11-kn/bai-4-45-trang-103-toan-lop-11-tap-1.jsp |
| 8 | SGK Toán 11 Chân trời sáng tạo — Bài 4 trang 120 Toán 11 Tập 1 | https://vietjack.com/toan-11-ct/bai-4-trang-120-toan-lop-11-tap-1.jsp |
| 9 | SGK Toán 11 Chân trời sáng tạo — Bài 9 trang 128 Toán 11 Tập 1 | https://vietjack.com/toan-11-ct/bai-9-trang-128-toan-lop-11-tap-1.jsp |
| 10 | SGK Toán 11 Cánh diều — Bài 1 trang 113 Toán 11 Tập 1 | https://vietjack.com/toan-11-cd/bai-1-trang-113-toan-lop-11-tap-1.jsp |
| 11 | SGK Toán 11 Cánh diều — Bài 3 trang 113 Toán 11 Tập 1 | https://vietjack.com/toan-11-cd/bai-3-trang-113-toan-lop-11-tap-1.jsp |
| 12 | SGK Toán 11 Cánh diều — Bài 2 trang 119 Toán 11 Tập 1 | https://vietjack.com/toan-11-cd/bai-2-trang-119-toan-lop-11-tap-1.jsp |
| 13 | SGK Toán 11 Kết nối tri thức — Bài 7.1 trang 30 Toán 11 Tập 2 | https://vietjack.com/toan-11-kn/bai-7-1-trang-30-toan-lop-11-tap-2.jsp |
| 14 | SGK Toán 11 Kết nối tri thức — Bài 7.2 trang 30 Toán 11 Tập 2 | https://vietjack.com/toan-11-kn/bai-7-2-trang-30-toan-lop-11-tap-2.jsp |
| 15 | SGK Toán 11 Kết nối tri thức — Bài 7.3 trang 30 Toán 11 Tập 2 | https://vietjack.com/toan-11-kn/bai-7-3-trang-30-toan-lop-11-tap-2.jsp |
| 16 | SGK Toán 11 Chân trời sáng tạo — Bài 1 trang 56 Toán 11 Tập 2 | https://vietjack.com/toan-11-ct/bai-1-trang-56-toan-lop-11-tap-2.jsp |
| 17 | SGK Toán 11 Chân trời sáng tạo — Bài 3 trang 56 Toán 11 Tập 2 | https://vietjack.com/toan-11-ct/bai-3-trang-56-toan-lop-11-tap-2.jsp |
| 18 | SGK Toán 11 Chân trời sáng tạo — Bài 4 trang 56 Toán 11 Tập 2 | https://vietjack.com/toan-11-ct/bai-4-trang-56-toan-lop-11-tap-2.jsp |
| 19 | SGK Toán 11 Chân trời sáng tạo — Bài 5 trang 56 Toán 11 Tập 2 | https://vietjack.com/toan-11-ct/bai-5-trang-56-toan-lop-11-tap-2.jsp |
| 20 | SGK Toán 11 Cánh diều — Bài 3 trang 79 Toán 11 Tập 2 | https://vietjack.com/toan-11-cd/bai-3-trang-79-toan-lop-11-tap-2.jsp |
| 21 | SBT Toán 11 Kết nối tri thức — Bài 7.1 trang 25 SBT Toán 11 Tập 2 | https://vietjack.com/sbt-toan-11-kn/bai-7-1-trang-25-sbt-toan-lop-11-tap-2.jsp |
| 22 | SBT Toán 11 Kết nối tri thức — Bài 7.2 trang 26 SBT Toán 11 Tập 2 | https://vietjack.com/sbt-toan-11-kn/bai-7-2-trang-26-sbt-toan-lop-11-tap-2.jsp |
| 23 | SBT Toán 11 Kết nối tri thức — Bài 7.4 trang 26 SBT Toán 11 Tập 2 | https://vietjack.com/sbt-toan-11-kn/bai-7-4-trang-26-sbt-toan-lop-11-tap-2.jsp |
| 24 | SGK Toán 11 Kết nối tri thức — Bài 7.7 trang 36 Toán 11 Tập 2 | https://vietjack.com/toan-11-kn/bai-7-7-trang-36-toan-lop-11-tap-2.jsp |
| 25 | SGK Toán 11 Kết nối tri thức — Bài 7.18 trang 53 Toán 11 Tập 2 | https://vietjack.com/toan-11-kn/bai-7-18-trang-53-toan-lop-11-tap-2.jsp |
| 26 | SGK Toán 11 Chân trời sáng tạo — Bài 1 trang 64 Toán 11 Tập 2 | https://vietjack.com/toan-11-ct/bai-1-trang-64-toan-lop-11-tap-2.jsp |
| 27 | SGK Toán 11 Chân trời sáng tạo — Bài 2 trang 64 Toán 11 Tập 2 | https://vietjack.com/toan-11-ct/bai-2-trang-64-toan-lop-11-tap-2.jsp |
| 28 | SGK Toán 11 Chân trời sáng tạo — Bài 4 trang 64 Toán 11 Tập 2 | https://vietjack.com/toan-11-ct/bai-4-trang-64-toan-lop-11-tap-2.jsp |
| 29 | SGK Toán 11 Chân trời sáng tạo — Bài 1 trang 73 Toán 11 Tập 2 | https://vietjack.com/toan-11-ct/bai-1-trang-73-toan-lop-11-tap-2.jsp |
| 30 | SGK Toán 11 Chân trời sáng tạo — Bài 2 trang 73 Toán 11 Tập 2 | https://vietjack.com/toan-11-ct/bai-2-trang-73-toan-lop-11-tap-2.jsp |
| 31 | SGK Toán 11 Chân trời sáng tạo — Bài 9 trang 86 Toán 11 Tập 2 | https://vietjack.com/toan-11-ct/bai-9-trang-86-toan-lop-11-tap-2.jsp |
| 32 | SGK Toán 11 Cánh diều — Bài 2 trang 88 Toán 11 Tập 2 | https://vietjack.com/toan-11-cd/bai-2-trang-88-toan-lop-11-tap-2.jsp |
| 33 | SGK Toán 11 Cánh diều — Bài 4 trang 88 Toán 11 Tập 2 | https://vietjack.com/toan-11-cd/bai-4-trang-88-toan-lop-11-tap-2.jsp |
| 34 | SGK Toán 11 Cánh diều — Bài 5 trang 99 Toán 11 Tập 2 | https://vietjack.com/toan-11-cd/bai-5-trang-99-toan-lop-11-tap-2.jsp |
| 35 | SGK Toán 11 Cánh diều — Bài 6 trang 99 Toán 11 Tập 2 | https://vietjack.com/toan-11-cd/bai-6-trang-99-toan-lop-11-tap-2.jsp |
| 36 | SBT Toán 11 Kết nối tri thức — Bài 7.20 trang 34 SBT Toán 11 Tập 2 | https://vietjack.com/sbt-toan-11-kn/bai-7-20-trang-34-sbt-toan-lop-11-tap-2.jsp |
| 37 | SBT Toán 11 Kết nối tri thức — Bài 7.21 trang 34 SBT Toán 11 Tập 2 | https://vietjack.com/sbt-toan-11-kn/bai-7-21-trang-34-sbt-toan-lop-11-tap-2.jsp |
| 38 | SGK Toán 11 Kết nối tri thức — Bài 7.11 trang 42 Toán 11 Tập 2 | https://vietjack.com/toan-11-kn/bai-7-11-trang-42-toan-lop-11-tap-2.jsp |
| 39 | SGK Toán 11 Kết nối tri thức — Bài 7.16 trang 53 Toán 11 Tập 2 | https://vietjack.com/toan-11-kn/bai-7-16-trang-53-toan-lop-11-tap-2.jsp |
| 40 | SGK Toán 11 Kết nối tri thức — Bài 7.17 trang 53 Toán 11 Tập 2 | https://vietjack.com/toan-11-kn/bai-7-17-trang-53-toan-lop-11-tap-2.jsp |
| 41 | SGK Toán 11 Kết nối tri thức — Bài 7.19 trang 53 Toán 11 Tập 2 | https://vietjack.com/toan-11-kn/bai-7-19-trang-53-toan-lop-11-tap-2.jsp |
| 42 | SGK Toán 11 Chân trời sáng tạo — Bài 1 trang 85 Toán 11 Tập 2 | https://vietjack.com/toan-11-ct/bai-1-trang-85-toan-lop-11-tap-2.jsp |
| 43 | SGK Toán 11 Chân trời sáng tạo — Bài 2 trang 85 Toán 11 Tập 2 | https://vietjack.com/toan-11-ct/bai-2-trang-85-toan-lop-11-tap-2.jsp |
| 44 | SGK Toán 11 Cánh diều — Bài 1 trang 94 Toán 11 Tập 2 | https://vietjack.com/toan-11-cd/bai-1-trang-94-toan-lop-11-tap-2.jsp |
| 45 | SGK Toán 11 Cánh diều — Bài 2 trang 94 Toán 11 Tập 2 | https://vietjack.com/toan-11-cd/bai-2-trang-94-toan-lop-11-tap-2.jsp |
| 46 | SBT Toán 11 Kết nối tri thức — Bài 7.23 trang 34 SBT Toán 11 Tập 2 | https://vietjack.com/sbt-toan-11-kn/bai-7-23-trang-34-sbt-toan-lop-11-tap-2.jsp |
| 47 | SBT Toán 11 Kết nối tri thức — Bài 7.24 trang 34 SBT Toán 11 Tập 2 | https://vietjack.com/sbt-toan-11-kn/bai-7-24-trang-34-sbt-toan-lop-11-tap-2.jsp |
| 48 | SBT Toán 11 Cánh diều — Bài 27 trang 99 SBT Toán 11 Tập 2 | https://vietjack.com/sbt-toan-11-cd/bai-27-trang-99-sbt-toan-lop-11-tap-2.jsp |
| 49 | SBT Toán 11 Cánh diều — Bài 28 trang 100 SBT Toán 11 Tập 2 | https://vietjack.com/sbt-toan-11-cd/bai-28-trang-100-sbt-toan-lop-11-tap-2.jsp |
| 50 | SGK Toán 11 Chân trời sáng tạo — Bài 6 trang 86 Toán 11 Tập 2 | https://vietjack.com/toan-11-ct/bai-6-trang-86-toan-lop-11-tap-2.jsp |
| 51 | SGK Toán 11 Kết nối tri thức — Bài 7.22 trang 59 Toán 11 Tập 2 | https://vietjack.com/toan-11-kn/bai-7-22-trang-59-toan-lop-11-tap-2.jsp |
| 52 | SGK Toán 11 Kết nối tri thức — Bài 7.23 trang 59 Toán 11 Tập 2 | https://vietjack.com/toan-11-kn/bai-7-23-trang-59-toan-lop-11-tap-2.jsp |
| 53 | SGK Toán 11 Kết nối tri thức — Bài 7.25 trang 59 Toán 11 Tập 2 | https://vietjack.com/toan-11-kn/bai-7-25-trang-59-toan-lop-11-tap-2.jsp |
| 54 | SGK Toán 11 Kết nối tri thức — Bài 7.40 trang 65 Toán 11 Tập 2 | https://vietjack.com/toan-11-kn/bai-7-40-trang-65-toan-lop-11-tap-2.jsp |
| 55 | SGK Toán 11 Chân trời sáng tạo — Bài 1 trang 81 Toán 11 Tập 2 | https://vietjack.com/toan-11-ct/bai-1-trang-81-toan-lop-11-tap-2.jsp |
| 56 | SGK Toán 11 Chân trời sáng tạo — Bài 3 trang 81 Toán 11 Tập 2 | https://vietjack.com/toan-11-ct/bai-3-trang-81-toan-lop-11-tap-2.jsp |
| 57 | SGK Toán 11 Chân trời sáng tạo — Bài 7 trang 82 Toán 11 Tập 2 | https://vietjack.com/toan-11-ct/bai-7-trang-82-toan-lop-11-tap-2.jsp |
| 58 | SGK Toán 11 Chân trời sáng tạo — Bài 10 trang 87 Toán 11 Tập 2 | https://vietjack.com/toan-11-ct/bai-10-trang-87-toan-lop-11-tap-2.jsp |
| 59 | SGK Toán 11 Cánh diều — Bài 2 trang 106 Toán 11 Tập 2 | https://vietjack.com/toan-11-cd/bai-2-trang-106-toan-lop-11-tap-2.jsp |
| 60 | SGK Toán 11 Cánh diều — Bài 4 trang 106 Toán 11 Tập 2 | https://vietjack.com/toan-11-cd/bai-4-trang-106-toan-lop-11-tap-2.jsp |
| 61 | SGK Toán 11 Cánh diều — Bài 3 trang 115 Toán 11 Tập 2 | https://vietjack.com/toan-11-cd/bai-3-trang-115-toan-lop-11-tap-2.jsp |
| 62 | SGK Toán 11 Kết nối tri thức — Bài 7.30 trang 63 Toán 11 Tập 2 | https://vietjack.com/toan-11-kn/bai-7-30-trang-63-toan-lop-11-tap-2.jsp |
| 63 | SGK Toán 11 Kết nối tri thức — Bài 7.31 trang 63 Toán 11 Tập 2 | https://vietjack.com/toan-11-kn/bai-7-31-trang-63-toan-lop-11-tap-2.jsp |
| 64 | SGK Toán 11 Kết nối tri thức — Bài 7.43 trang 65 Toán 11 Tập 2 | https://vietjack.com/toan-11-kn/bai-7-43-trang-65-toan-lop-11-tap-2.jsp |
| 65 | SGK Toán 11 Chân trời sáng tạo — Bài 3 trang 73 Toán 11 Tập 2 | https://vietjack.com/toan-11-ct/bai-3-trang-73-toan-lop-11-tap-2.jsp |
| 66 | SGK Toán 11 Chân trời sáng tạo — Bài 3 trang 85 Toán 11 Tập 2 | https://vietjack.com/toan-11-ct/bai-3-trang-85-toan-lop-11-tap-2.jsp |
| 67 | SGK Toán 11 Chân trời sáng tạo — Bài 13 trang 87 Toán 11 Tập 2 | https://vietjack.com/toan-11-ct/bai-13-trang-87-toan-lop-11-tap-2.jsp |
| 68 | SBT Toán 11 Kết nối tri thức — Bài 7.35 trang 41 SBT Toán 11 Tập 2 | https://vietjack.com/sbt-toan-11-kn/bai-7-35-trang-41-sbt-toan-lop-11-tap-2.jsp |
| 69 | SGK Toán 11 Cánh diều — Bài 7 trang 117 Toán 11 Tập 2 | https://vietjack.com/toan-11-cd/bai-7-trang-117-toan-lop-11-tap-2.jsp |

## Nguồn / nội dung BỊ LOẠI

| Nguồn | Lý do |
|---|---|
| Các bài tập khác trong cùng các trang SGK/SBT trên (vd. KNTT 4.9, 4.16, 4.21, 4.29, 7.33–7.37; CTST tr.127 Bài 1–7; CD tr.120 Bài 1–4, CD tr.99 Bài 1–4) | Câu hỏi mệnh đề lý thuyết / "phát biểu nào đúng", không có khối hình cụ thể. |
| KNTT 4.15, 4.20, 4.28, 4.34, 7.4, 7.8, 7.9, 7.14, 7.15, 7.20, 7.21, 7.26, 7.27, 7.32, 7.45; CTST tr.56 Bài 6, tr.64 Bài 5, tr.74 Bài 6, tr.81 Bài 5, tr.85 Bài 4–5, tr.87 Bài 12; CD tr.94 Bài 3–5, tr.115 Bài 1, 4–8, tr.117 Bài 8; SBT KNTT 7.5, 7.26, 7.40; SBT CD Bài 32, 56 | Bài thực tế (cửa sổ, mái nhà, cột, lều, kim tự tháp, thùng tôn, hầm, bánh chưng…) — không có nhãn đỉnh hoặc phụ thuộc hình vẽ trong sách. |
| CTST tr.82 Bài 6 ("đáy ABCD là hình thoi có AB = a và a√3") | Nguồn vietjack rơi mất "AC =" → đề nhập nhằng, loại. |
| CTST tr.86 Bài 4 ("cạnh đáy bằng và chiều cao bằng a√2") | Rơi giá trị cạnh đáy trên nguồn → loại. |
| CTST tr.74 Bài 5, tr.86 Bài 5; SBT CD Bài 53 (chóp cụt đều) | Không có nhãn đỉnh (chỉ "hình chóp cụt tứ giác/tam giác đều có cạnh đáy…"). |
| CTST tr.82 Bài 8 (thể tích chóp cụt lục giác đều) | Có nhãn nhưng đề bắt đầu bằng "Tính thể tích…" không có phần dẫn "Cho…" → script diag cắt mất phần dữ kiện; đã có Câu 66 cùng hình (tr.85 Bài 3). |
| CD tr.106 Bài 3, Bài 5 | "Với giả thiết ở Bài tập 2/4" — không tự đứng được. |
| KNTT 4.37, 4.38, 4.39; CTST tr.128 Bài 8 | MCQ mà phần dẫn không còn câu hỏi hình học độc lập sau khi bỏ phương án (hoặc tỉ số bị mất định dạng). |
| haylamdo.com/toan-lop-11/the-tich-khoi-chop-sm.jsp | Không tải được (curl timeout); bản vietjack cùng nội dung (vietjack.com/toan-lop-11/the-tich-khoi-chop-sm.jsp) chỉ có chóp cụt KHÔNG nhãn đỉnh → không dùng. |
| olm.vn hỏi đáp (chóp cụt tứ giác đều ABCD.A'B'C'D', AB=4cm…) | Nội dung do người dùng đăng, không phải tài liệu chính thống → không dùng. |

## Các dạng bài theo chương trình GDPT 2018 (Task A)

Căn cứ mục lục SGK Toán 11 ba bộ sách (chương trình GDPT 2018, Thông tư 32/2018/TT-BGDĐT):

- **KNTT** — Chương IV "Quan hệ song song trong không gian": Bài 10 Đường thẳng và mặt phẳng trong không gian; Bài 11 Hai đường thẳng song song; Bài 12 Đường thẳng và mặt phẳng song song; Bài 13 Hai mặt phẳng song song (gồm hình lăng trụ, hình hộp); Bài 14 Phép chiếu song song. Chương VII "Quan hệ vuông góc trong không gian": Bài 22 Hai đường thẳng vuông góc; Bài 23 Đường thẳng vuông góc với mặt phẳng; Bài 24 Phép chiếu vuông góc. Góc giữa đường thẳng và mặt phẳng; Bài 25 Hai mặt phẳng vuông góc (góc nhị diện, lăng trụ đứng/đều, hình hộp chữ nhật/lập phương, chóp đều, chóp cụt đều); Bài 26 Khoảng cách; Bài 27 Thể tích.
- **CTST** — Chương IV "Đường thẳng và mặt phẳng. Quan hệ song song": Bài 1–5 (điểm/đường/mặt; hai đường song song; đường // mặt; hai mặt song song (lăng trụ, hình hộp); phép chiếu song song). Chương VIII "Quan hệ vuông góc trong không gian": Bài 1 Hai đường thẳng vuông góc; Bài 2 Đường thẳng vuông góc với mặt phẳng; Bài 3 Hai mặt phẳng vuông góc (lăng trụ đứng, hình hộp, chóp đều, chóp cụt đều); Bài 4 Khoảng cách trong không gian (kèm thể tích); Bài 5 Góc giữa đường thẳng và mặt phẳng. Góc nhị diện.
- **CD** — Chương IV "Quan hệ song song trong không gian. Phép chiếu song song": Bài 1–4; Bài 5 Hình lăng trụ và hình hộp; Bài 6 Phép chiếu song song. Hình biểu diễn. Chương VIII "Quan hệ vuông góc trong không gian. Phép chiếu vuông góc": Bài 1 Hai đường thẳng vuông góc; Bài 2 Đường thẳng vuông góc với mặt phẳng; Bài 3 Góc giữa đường thẳng và mặt phẳng. Góc nhị diện; Bài 4 Hai mặt phẳng vuông góc; Bài 5 Khoảng cách; Bài 6 Hình lăng trụ đứng. Hình chóp đều. Thể tích của một số hình khối.

Danh sách dạng dựng hình/bài toán rút ra:
1. Giao tuyến của hai mặt phẳng; giao điểm đường thẳng–mặt phẳng; ba điểm thẳng hàng / ba đường đồng quy.
2. Thiết diện (mặt phẳng qua điểm, song song với đường/mặt) trên chóp, tứ diện, **lăng trụ, hình hộp**.
3. Hai đường thẳng song song, chéo nhau; đường thẳng // mặt phẳng; hai mặt phẳng song song (định lí Thalès trong không gian).
4. Hình lăng trụ, hình hộp (chương song song): tính chất mặt bên/đường chéo, trọng tâm trên đường chéo hình hộp.
5. **Phép chiếu song song**, hình biểu diễn của hình phẳng/khối.
6. **Hai đường thẳng vuông góc; góc giữa hai đường thẳng** (qua đường song song).
7. Đường thẳng ⊥ mặt phẳng (chứng minh, định lí ba đường vuông góc); **phép chiếu vuông góc**, hình chiếu của điểm/đường/tam giác.
8. Góc giữa đường thẳng và mặt phẳng.
9. **Hai mặt phẳng vuông góc; góc giữa hai mặt phẳng; góc nhị diện, góc phẳng nhị diện**.
10. **Lăng trụ đứng, lăng trụ đều, hình hộp đứng, hình hộp chữ nhật, hình lập phương; hình chóp đều; hình chóp cụt đều**.
11. Khoảng cách: điểm–đường, điểm–mặt, đường–mặt song song, hai mặt song song, **hai đường chéo nhau (đường vuông góc chung)**.
12. **Thể tích** khối chóp, khối lăng trụ, khối hộp, khối chóp cụt đều.

URL mục lục đã tra cứu:
- https://vietjack.com/toan-11-kn/index.jsp (mục lục SGK KNTT 11, bài 10–14, 22–27)
- https://loigiaihay.com/chuong-iv-quan-he-song-song-trong-khong-gian-sbt-toan-11-kntt-e32850.html (SBT KNTT chương IV)
- https://www.vietjack.com/toan-11-ct/chuong-8-quan-he-vuong-goc-trong-khong-gian.jsp và https://vietjack.com/toan-11-ct/index.jsp (CTST chương IV, VIII)
- https://www.vietjack.com/toan-11-cd/chuong-8-quan-he-vuong-goc-trong-khong-gian-phep-chieu-song-song.jsp và https://vietjack.com/toan-11-cd/index.jsp (CD chương IV, VIII)

## Ghi chú / hạn chế
- Nguồn toàn bộ là SGK/SBT 2018 (qua vietjack) — không có đề kiểm tra trường; văn phong SGK, số liệu gọn.
- **Chóp cụt đều có nhãn đỉnh rất hiếm** trong SGK (đa số bài chóp cụt là bài thực tế không nhãn) → chỉ 1 bài (Câu 66). Nếu engine cần thêm, phải tìm ở đề kiểm tra/chuyên đề khác.
- Góc được ghi dạng "góc ABC = 30°"; tên góc nhị diện giữ ký hiệu "[S, BC, A]"; phân số dạng a/b, căn dạng a√2, (a√3)/2.
- Câu 5, 50 là phần dẫn của câu trắc nghiệm (kết thúc bằng "là") — đã bỏ phương án.
