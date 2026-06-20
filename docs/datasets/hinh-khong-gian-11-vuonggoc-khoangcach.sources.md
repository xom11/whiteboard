# Nguồn dữ liệu HKG lớp 11 — Quan hệ vuông góc + Khoảng cách + Góc

Chủ đề: Hình học không gian lớp 11 — quan hệ vuông góc, khoảng cách (điểm–mặt, đường–đường chéo nhau, đường–mặt), góc (đường–mặt, hai mặt phẳng, nhị diện).

Quy trình: WebSearch toanmath.com → curl PDF → markitdown (`.venv/bin/markitdown`) → cổng chất lượng (kiểm nhãn đỉnh S.ABCD) → trích "Câu/Bài/Ví dụ N" + cắt lời giải → lọc "vẽ được" (loại Oxyz/tọa độ, MCQ lý thuyết, hình nón/trụ/cầu) → khử trùng lặp → làm sạch (bỏ table-pipe, MCQ options, footer TOANMATH.com, answer-tail).

## File output
- Đề bài: `hkg11-vuonggoc-khoangcach.txt` — **368 bài sạch** (định dạng `Câu N: <đề>`, cách nhau 1 dòng trống).

## Nguồn ĐÃ DÙNG (đạt cổng chất lượng)

| # | Nguồn (URL trang) | PDF | Bài giữ |
|---|---|---|---|
| 1 | https://toanmath.com/2022/07/bai-toan-khoang-cach-trong-khong-gian.html | https://toanmath.com/toanmath-pdf/bai-toan-khoang-cach-trong-khong-gian.pdf | 102 |
| 2 | https://toanmath.com/2022/11/bai-giang-khoang-cach-trong-khong-gian.html | https://toanmath.com/toanmath-pdf/bai-giang-khoang-cach-trong-khong-gian.pdf | 52 |
| 3 | https://toanmath.com/2019/05/chuyen-de-goc-va-khoang-cach-trong-khong-gian-nguyen-nhanh-tien.html | https://toanmath.com/toanmath-pdf/chuyen-de-goc-va-khoang-cach-trong-khong-gian-nguyen-nhanh-tien.pdf | 124 |
| 4 | https://toanmath.com/2022/03/toan-tap-goc-va-khoang-cach-van-dung-cao.html | https://toanmath.com/toanmath-pdf/toan-tap-goc-va-khoang-cach-van-dung-cao.pdf | 90 (cắt mẫu đều từ ~491 để đa dạng, tránh ngập VDC) |

Tổng: 368 bài (102 + 52 + 124 + 90). Phân bố chủ đề: khoảng cách 277, góc 268, vuông góc 177, góc-hai-mặt/nhị-diện 34. Khối: hình chóp 260, lăng trụ 49, hộp/lập phương 33, tứ diện 29.

## Nguồn BỊ LOẠI

| Nguồn (URL) | PDF | Lý do loại |
|---|---|---|
| https://toanmath.com/2024/02/chuyen-de-quan-he-vuong-goc-trong-khong-gian-toan-11-le-minh-tam.html | https://toanmath.com/toanmath-pdf/chuyen-de-quan-he-vuong-goc-trong-khong-gian-toan-11-le-minh-tam.pdf | **FAIL cổng chất lượng**: ký hiệu `⊥`/`=`/`°` bị rơi hoàn toàn (0 dấu `⊥` còn lại; "SA⊥AB"→"SAAB"), prime rơi ("ABCD.A'B'C'D'"→"ABCD.ABCD"), chữ số dính nhãn ("ABADa và BACBAD60,CAD90"). 337 marker nhưng đề nhập nhằng/không đọc được → bỏ toàn bộ (217 trang). |

## Ghi chú chất lượng (gotcha)
- **toantap-vdc (b_5)**: text-layer SẠCH NHẤT (`vuông góc`, `=`, dấu cách giữ nguyên; 0 cid; 405 nhãn S.ABCD). Nhưng MCQ render đáp án dưới dạng math TRẦN không có nhãn A./B. → phải cắt "answer-tail" (chuỗi số/căn lặp cuối câu sau "bằng"/"là"/"?"). Còn ~15/368 bài còn sót answer-tail xen giữa (giá trị math bị rơi mid-sentence) — nhiễu nhẹ, chấp nhận được.
- **gockc-tien (b_3)**: `(cid:48)` = dấu prime `'` (A'B'C'D') → đã normalize. cid khác (hiếm) → drop. Có footer "Trang N -GV/Trường" + "(tham khảo hình vẽ)" → đã strip.
- **khoangcach1 (b_1) / baigiang-kc (b_2)**: clean; tên mặt phẳng PDF render `( SAB )` rời ngoặc → đã merge `(SAB)`; `( )` rỗng quanh tên mặt → khôi phục `(NAME)`.
- Bảng (table) trong PDF rò pipe `| | --- |` vào text → đã strip toàn bộ.
- Loại MCQ lý thuyết thuần ("Mệnh đề nào sau đây đúng?") không có khối hình; loại Oxyz/tọa độ; loại hình nón/trụ/cầu đơn lẻ (ngoài phạm vi chủ đề).
