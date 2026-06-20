# Nguồn — HKG lớp 11: Quan hệ song song + Thiết diện

Ngày thu thập: 2026-06-20
File đề: `hkg11-songsong-thietdien.txt` — **241 bài** đã trích (sau lọc + khử trùng lặp).

Quy trình: WebSearch toanmath.com → lấy URL PDF trực tiếp → `curl` về /tmp → `markitdown` (.venv repo chính) → cổng chất lượng (kiểm nhãn đỉnh) → trích đề, cắt lời giải/lý thuyết/footer → lọc "vẽ được" (loại Oxyz/tọa độ, loại bài thuần tính không dựng hình, loại trắc nghiệm lý thuyết "khẳng định nào đúng") → khử trùng lặp.

## Nguồn ĐÃ DÙNG (4 PDF tải về, 3 dùng được)

| # | Trang nguồn (toanmath) | PDF | Số bài trích (≈) | Ghi chú |
|---|---|---|---|---|
| 1 | https://toanmath.com/2017/09/duong-thang-va-mat-phang-trong-khong-gian-quan-he-song-song-tran-quoc-nghia.html | https://toanmath.com/toanmath-pdf/duong-thang-va-mat-phang-trong-khong-gian-quan-he-song-song-tran-quoc-nghia.pdf | ~178 | **Nguồn chính.** Text-layer SẠCH, nhãn đỉnh (S.ABC, S.ABCD, tứ diện ABCD, lăng trụ/hình hộp A′B′C′D′) còn nguyên. PUA thấp (118). Dạng "Ví dụ N"/"Bài N" tự luận dựng hình — giao tuyến/giao điểm/thiết diện/song song. |
| 2 | https://toanmath.com/2021/06/phan-loai-va-phuong-phap-giai-bai-tap-duong-thang-va-mat-phang-trong-khong-gian-quan-he-song-song.html | https://toanmath.com/toanmath-pdf/phan-loai-va-phuong-phap-giai-bai-tap-duong-thang-va-mat-phang-trong-khong-gian-quan-he-song-song.pdf | ~44 | SẠCH (PUA = math symbols ∈⊂∥, không phải nhiễu nhãn). Nhãn đỉnh nguyên. Lẫn nhiều trắc nghiệm A/B/C/D → đã bỏ phần phương án, giữ stem dựng hình; bỏ câu lý thuyết thuần. |
| 3 | https://toanmath.com/2022/07/tai-lieu-chu-de-hai-mat-phang-song-song.html | https://toanmath.com/toanmath-pdf/tai-lieu-chu-de-hai-mat-phang-song-song.pdf | ~19 | Đa phần "Ví dụ" hai-mp-song-song có nhãn S.ABCD nguyên. Một vài bài bị table-cell garble (sample 1, 5) → đã loại tự động. Ký hiệu "//" thỉnh thoảng rơi nhưng nhãn còn → giữ. |

Tìm kiếm: "toanmath quan hệ song song trong không gian bài tập pdf lớp 11", "toanmath thiết diện hình chóp bài tập chuyên đề pdf", "toanmath đường thẳng và mặt phẳng song song trong không gian bài tập pdf", "toanmath hai mặt phẳng song song bài tập tự luận pdf lớp 11".

## Nguồn BỊ LOẠI

| Trang nguồn | PDF | Lý do loại |
|---|---|---|
| https://toanmath.com/2024/08/chuyen-de-quan-he-song-song-trong-khong-gian-toan-11.html | https://toanmath.com/toanmath-pdf/chuyen-de-quan-he-song-song-trong-khong-gian-toan-11.pdf | **REJECT — symbol-font damage.** markitdown đổ ra "Cho hình chóp **có** lần lượt là trung điểm **của** . Gọi **là** giao điểm **của** **và** ." — toàn bộ nhãn đỉnh (S, A, B, C...) BỊ MẤT (glyph symbol-font không decode). PUA = 10713 (rất cao). Đề không còn dựng được. |

## Phân bố nội dung (241 bài)

- Chủ đề (có thể trùng lặp giữa các nhãn trong 1 bài):
  - Thiết diện: ~98
  - Song song (đường//mp, mp//mp, ∥, //): ~119
  - Giao tuyến hai mặt phẳng: ~61
  - Giao điểm đường thẳng ∩ mặt phẳng: ~63
- Khối hình:
  - Hình chóp: ~133
  - Tứ diện: ~73
  - Hình hộp: ~14
  - Lăng trụ / hình chóp cụt: ~10
  - Lập phương: ~2

## Ghi chú chất lượng (nhiễu còn lại — chấp nhận được)

- Một số bài lẫn phân số/tỉ số được markitdown bóc rời thành token cuối câu (vd "SP / SC", "KM IB ... KN IK") — phần đề + yêu cầu dựng hình vẫn nguyên vẹn, không ảnh hưởng vẽ.
- Một vài bài trắc nghiệm (cuối file, gốc nguồn 2) có cụm OCR đảo vị trí ở đuôi (vd "...Giao tuyến... là: AD và BC.") — câu dẫn "Cho..." và yêu cầu vẫn đọc được.
- Đã loại sạch: footer "TRẦN QUỐC NGHĨA (Sưu tầm...)" (dạng lặp ký tự GGGG VVVV), header "TÀI LIỆU HỌC TẬP / Vấn đề N", khối lý thuyết "Định nghĩa/Tính chất", marker "Dạng N", "(cid:...)", và các phương án A/B/C/D của câu trắc nghiệm.
- Đã loại: bài Oxyz/tọa độ (0 bài lọt — các nguồn này thuần hình học tổng hợp), câu lý thuyết "khẳng định/mệnh đề nào đúng/sai", "có bao nhiêu...".
