# Nguồn dữ liệu: Hình học phẳng tổng hợp (lớp 7, 8, 9, vào 10, HSG 9)

File đề: `hinh-phang-tong-hop-2026-09.txt`. Có **200 bài**, định dạng `Bài N [cap|dang|do-dai]: <đề>`,
các ý a) b) c) xuống dòng. Header khớp regex `^Bài\s+(\d+)\s+\[([^\]]+)\]:`, số bài liên tục từ 1 đến 200.

Nhãn:
- **cấp**: `lop7`, `lop8`, `lop9`, `vao10` (đề tuyển sinh vào 10), `hsg9` (đề HSG / bồi dưỡng HSG lớp 9)
- **dạng**: xem bảng thống kê bên dưới
- **độ dài** (tính theo số bước DỰNG HÌNH, không tính số câu hỏi): `ngan` (1–2 bước), `trung-binh` (3–4 bước), `dai` (từ 5 bước trở lên, thường là đề vào 10 có a) b) c))

## Quy trình

1. Mở trang landing của thcs.toanmath.com, lấy URL PDF trực tiếp (`https://thcs.toanmath.com/thcs-pdf/<slug>.pdf`), tải bằng `curl -L`, rồi `pdftotext` (có và không `-layout`).
2. Tách đề theo marker `Ví dụ N / Câu N / Bài N`, cắt ở `Hướng dẫn giải / Lời giải / Phân tích / Đáp án`.
3. Với đề thi vào 10 các tỉnh trên loigiaihay.com: dùng WebFetch để lấy nguyên văn phần đề câu hình (không lấy lời giải).
4. Làm sạch **thủ công từng bài**. pdftotext làm mất gần hết ký hiệu toán (font Symbol/MathType): dấu `=`, `⊥`, `//`, `∈`, `<`, `>`, mũ góc, bình phương, phân số đều rơi mất. Mọi ký hiệu này được khôi phục bằng tay theo ngữ cảnh và lời giải trong chính tài liệu, viết dạng thường: `AB = AC`, `góc BAC = 90°`, `AB ⊥ CD`, `AB // CD`, `AB²`, `BC/2`, `(O; R)`.
5. Loại: câu trắc nghiệm, bài "tìm x trong hình vẽ" hoặc "cho hình vẽ", bài chỉ tính toán không có hình, bài toạ độ, bài thực tế (bánh đà, cần cẩu, xuồng máy), và bài bị hỏng không khôi phục chắc chắn được.
6. Dấu so sánh mất khi trích nhưng đã suy ra lại được từ lời giải/ngữ cảnh: bài 13 ("góc A < 90°"), bài 26 ("GD + GE > BC/2"), bài 71 ("AD > BC"), bài 197 ("R > r"). Chỗ nào không chắc thì bỏ luôn điều kiện, không đoán (bài 25, 160, 191, 192).
7. Khử trùng lặp (nhiều PDF in lại phần bài tập ở cuối, file 400 bài chứa đề lặp). Đã so với `tong-hop-hinh-phang-vao10-2018-2019.txt` có sẵn trong thư mục: không có bài trùng.

## Nguồn ĐÃ DÙNG

| # | Tài liệu | Landing URL | PDF URL | Số bài | Bài số | Ghi chú |
|---|---|---|---|---|---|---|
| 1 | Chuyên đề tam giác cân (Toán 7) | https://thcs.toanmath.com/2021/06/chuyen-de-tam-giac-can.html | https://thcs.toanmath.com/thcs-pdf/chuyen-de-tam-giac-can.pdf | 13 | 1–13 | Ví dụ + bài tự luyện. Ký hiệu mất, đã khôi phục (vd. "GD + GE > BC/2" ở bài 26 lấy từ lời giải của file 3) |
| 2 | Chuyên đề tam giác cân, đường trung trực của đoạn thẳng Toán 7 | https://thcs.toanmath.com/2023/08/chuyen-de-tam-giac-can-duong-trung-truc-cua-doan-thang-toan-7.html | https://thcs.toanmath.com/thcs-pdf/chuyen-de-tam-giac-can-duong-trung-truc-cua-doan-thang-toan-7.pdf | 12 | 14–25 | Phần trung trực. Bài 25 bỏ điều kiện "(MB ? MC)" vì ký hiệu so sánh bị mất |
| 3 | Chuyên đề tính chất ba đường trung tuyến của tam giác | https://thcs.toanmath.com/2021/06/chuyen-de-tinh-chat-ba-duong-trung-tuyen-cua-tam-giac.html | https://thcs.toanmath.com/thcs-pdf/chuyen-de-tinh-chat-ba-duong-trung-tuyen-cua-tam-giac.pdf | 8 | 26–33 | |
| 4 | Chuyên đề tính chất ba đường phân giác của tam giác | https://thcs.toanmath.com/2021/06/chuyen-de-tinh-chat-ba-duong-phan-giac-cua-tam-giac.html | https://thcs.toanmath.com/thcs-pdf/chuyen-de-tinh-chat-ba-duong-phan-giac-cua-tam-giac.pdf | 10 | 34–43 | Bỏ 2 bài "tìm x trong hình vẽ" và 1 bài có đề bị trộn cột |
| 5 | Chuyên đề tính chất ba đường cao trong tam giác | https://thcs.toanmath.com/2021/06/chuyen-de-tinh-chat-ba-duong-cao-trong-tam-giac.html | https://thcs.toanmath.com/thcs-pdf/chuyen-de-tinh-chat-ba-duong-cao-trong-tam-giac.pdf | 5 | 44–48 | |
| 6 | Chuyên đề các trường hợp bằng nhau của tam giác vuông Toán 7 | https://thcs.toanmath.com/2023/08/chuyen-de-cac-truong-hop-bang-nhau-cua-tam-giac-vuong-toan-7.html | https://thcs.toanmath.com/thcs-pdf/chuyen-de-cac-truong-hop-bang-nhau-cua-tam-giac-vuong-toan-7.pdf | 8 | 49–56 | Loại toàn bộ bài "tìm tam giác bằng nhau trên hình vẽ" |
| 7 | Chuyên đề hình bình hành (Toán 8) | https://thcs.toanmath.com/2021/03/chuyen-de-hinh-binh-hanh.html | https://thcs.toanmath.com/thcs-pdf/chuyen-de-hinh-binh-hanh.pdf | 8 | 57–64 | |
| 8 | Phiếu bài tập Toán 8 chủ đề tứ giác | https://thcs.toanmath.com/2023/07/phieu-bai-tap-toan-8-chu-de-tu-giac.html | https://thcs.toanmath.com/thcs-pdf/phieu-bai-tap-toan-8-chu-de-tu-giac.pdf | 33 | 65–97 | Tứ giác, hình thang (cân), hình bình hành, hình chữ nhật, hình thoi, hình vuông, đối xứng. Loại bài Pythagore thực tế và 2 bài bị hỏng (hình thang vuông, phân giác góc MAD) |
| 9 | Chuyên đề khái niệm hai tam giác đồng dạng | https://thcs.toanmath.com/2021/03/chuyen-de-khai-niem-hai-tam-giac-dong-dang.html | https://thcs.toanmath.com/thcs-pdf/chuyen-de-khai-niem-hai-tam-giac-dong-dang.pdf | 7 | 98–104 | |
| 10 | Phiếu bài tập Toán 8 chủ đề tam giác đồng dạng | https://thcs.toanmath.com/2023/07/phieu-bai-tap-toan-8-chu-de-tam-giac-dong-dang.html | https://thcs.toanmath.com/thcs-pdf/phieu-bai-tap-toan-8-chu-de-tam-giac-dong-dang.pdf | 17 | 105–121 | Loại bài "cho hình vẽ", bài đồng dạng phối cảnh và trắc nghiệm. Bài 116 sửa "giao điểm của OC và HC" thành "OE và HC" (lỗi đánh máy, OC và HC cắt nhau tại C). Bài 114 ý c) sửa "phân giác góc BMO" thành "BMN" |
| 11 | Phiếu bài tập Toán 9 chương đường tròn (2024–2025) | https://thcs.toanmath.com/2025/08/phieu-bai-tap-toan-9-chuong-duong-tron.html | https://thcs.toanmath.com/thcs-pdf/phieu-bai-tap-toan-9-chuong-duong-tron.pdf | 24 | 122–145 | Dây cung, hai đường tròn, tiếp tuyến, góc nội tiếp. Bài 128 sửa "Kẻ đường kính OI vuông góc BC" thành "Kẻ OI vuông góc với BC tại I". Bài 135 ý c) bỏ vế đầu bị cụt ("Gọi … giao điểm của CD và OE") |
| 12 | Phiếu bài tập Toán 9 chương đường tròn ngoại tiếp và đường tròn nội tiếp | https://thcs.toanmath.com/2025/08/phieu-bai-tap-toan-9-chuong-duong-tron-ngoai-tiep-va-duong-tron-noi-tiep.html | https://thcs.toanmath.com/thcs-pdf/phieu-bai-tap-toan-9-chuong-duong-tron-ngoai-tiep-va-duong-tron-noi-tiep.pdf | 8 | 146–153 | Tứ giác nội tiếp, đường tròn nội tiếp |
| 13 | Các chuyên đề bồi dưỡng học sinh giỏi Hình học 9 (652 tr.) | https://thcs.toanmath.com/2022/08/cac-chuyen-de-boi-duong-hoc-sinh-gioi-hinh-hoc-9.html | https://thcs.toanmath.com/thcs-pdf/cac-chuyen-de-boi-duong-hoc-sinh-gioi-hinh-hoc-9.pdf | 7 | 154–160 | Bài 154 là HSG 9 Gia Lai 2009–2010; bài 160 là đề tuyển sinh vào 10 trường Phổ thông Năng khiếu (gắn nhãn `vao10`); bài 158 chỉ giữ ý a) b) vì ý c) bị cụt |
| 14 | loigiaihay.com: đề thi vào 10 môn Toán các tỉnh (xem bảng con) | https://loigiaihay.com/de-thi-vao-10-mon-toan-ha-noi-e26554.html (và các trang tỉnh) | (HTML) | 22 | 161–182 | Câu hình học của đề chính thức |
| 15 | Tuyển tập 400 bài toán hình học trong các đề thi vào lớp 10 môn Toán (567 tr.) | https://thcs.toanmath.com/2021/08/tuyen-tap-400-bai-toan-hinh-hoc-trong-cac-de-thi-vao-lop-10-mon-toan.html | https://thcs.toanmath.com/thcs-pdf/tuyen-tap-400-bai-toan-hinh-hoc-trong-cac-de-thi-vao-lop-10-mon-toan.pdf | 18 | 183–200 | 13 bài có ghi tỉnh/năm trong file: Bắc Ninh 2015, Quảng Ninh 2016, Bến Tre 2015, Bình Dương 2015, Đà Nẵng 2014, Đà Nẵng 2015, Hà Nội 2014, Hà Nội 2015, Hòa Bình 2015, Khánh Hòa 2015, Kon Tum 2014, Lạng Sơn 2014, Nam Định 2013. 5 bài không ghi nguồn (hai đường tròn tiếp xúc hoặc cắt nhau, nửa đường tròn) lấy từ phần "Thầy Nguyễn Chí Thành" và phần tổng hợp. Chọn những bài có hình hai đường tròn để phủ dạng này |

### Bảng con: đề vào 10 lấy từ loigiaihay.com (bài 161–182)

| Bài | Đề | URL |
|---|---|---|
| 161 | Đắk Lắk 2025 | https://loigiaihay.com/de-thi-vao-10-mon-toan-dak-lak-2025-co-dap-an-va-loi-giai-chi-tiet-a188279.html |
| 162 | Hà Nội 2025 | https://loigiaihay.com/de-thi-vao-10-mon-toan-ha-noi-2025-co-dap-an-va-loi-giai-chi-tiet-a186903.html |
| 163 | Hà Nội 2023 | https://loigiaihay.com/de-thi-vao-10-mon-toan-ha-noi-2023-co-dap-an-va-loi-giai-chi-tiet-a165170.html |
| 164 | Hà Nội 2021 | https://loigiaihay.com/de-thi-vao-10-mon-toan-ha-noi-nam-2021-a110607.html |
| 165 | Hà Nội 2020 | https://loigiaihay.com/de-thi-vao-10-mon-toan-ha-noi-nam-2020-a110611.html |
| 166 | Hà Nội 2019 | https://loigiaihay.com/de-thi-vao-10-mon-toan-ha-noi-nam-2019-a110609.html |
| 167 | Hà Nội 2018 | https://loigiaihay.com/de-thi-vao-10-mon-toan-ha-noi-nam-2018-a110620.html |
| 168 | TP Hồ Chí Minh 2025 | https://loigiaihay.com/de-thi-vao-10-mon-toan-tp-ho-chi-minh-2025-co-dap-an-va-loi-giai-chi-tiet-a186378.html |
| 169 | TP Hồ Chí Minh 2023 | https://loigiaihay.com/de-thi-vao-10-mon-toan-tp-ho-chi-minh-2023-co-dap-an-va-loi-giai-chi-tiet-a165176.html |
| 170 | TP Hồ Chí Minh 2020 | https://loigiaihay.com/de-thi-vao-10-mon-toan-tp-ho-chi-minh-nam-2020-a110654.html |
| 171 | TP Hồ Chí Minh 2019 | https://loigiaihay.com/de-thi-vao-10-mon-toan-tp-ho-chi-minh-nam-2019-a110655.html |
| 172 | Đà Nẵng 2023 | https://loigiaihay.com/de-thi-vao-10-mon-toan-da-nang-2023-co-dap-an-va-loi-giai-chi-tiet-a165182.html |
| 173 | Đà Nẵng 2021 | https://loigiaihay.com/de-thi-vao-10-mon-toan-da-nang-nam-2021-a110672.html |
| 174 | Đà Nẵng 2020 | https://loigiaihay.com/de-thi-vao-10-mon-toan-da-nang-nam-2020-a110673.html |
| 175 | Đà Nẵng 2019 | https://loigiaihay.com/de-thi-vao-10-mon-toan-da-nang-nam-2019-a110674.html |
| 176 | Nghệ An 2025 | https://loigiaihay.com/de-thi-vao-10-mon-toan-nghe-an-2025-co-dap-an-va-loi-giai-chi-tiet-a186411.html |
| 177 | Nghệ An 2023 | https://loigiaihay.com/de-thi-vao-10-mon-toan-nghe-an-2023-co-dap-an-va-loi-giai-chi-tiet-a165188.html |
| 178 | Nghệ An 2020 | https://loigiaihay.com/de-thi-vao-10-mon-toan-nghe-an-nam-2020-a110935.html |
| 179 | Hải Phòng 2023 | https://loigiaihay.com/de-thi-vao-10-mon-toan-hai-phong-2023-co-dap-an-va-loi-giai-chi-tiet-a165190.html |
| 180 | Hải Phòng 2021 | https://loigiaihay.com/de-thi-vao-10-mon-toan-hai-phong-nam-2021-a110931.html |
| 181 | Hải Phòng 2020 | https://loigiaihay.com/de-thi-vao-10-mon-toan-hai-phong-nam-2020-a110933.html (trang bị lặp chữ: "K là giao điểm của đoạn thẳng AC, F là giao điểm thứ hai của đường thẳng AF…"; đã sửa thành "K là giao điểm thứ hai của đường thẳng AF với đường tròn (O)") |
| 182 | Hải Phòng 2019 | https://loigiaihay.com/de-thi-vao-10-mon-toan-hai-phong-nam-2019-a110972.html |

Lưu ý: văn bản đề loigiaihay lấy qua WebFetch. Công cụ này tóm tắt trang bằng một mô hình nhỏ, dù đã yêu cầu trích nguyên văn. Nội dung toán vì vậy đáng tin, nhưng câu chữ có thể lệch nhẹ so với bản gốc (dấu câu, "∠" đổi thành "góc").

## Nguồn ĐÃ TẢI nhưng KHÔNG DÙNG / BỊ LOẠI

| Tài liệu | URL | Lý do |
|---|---|---|
| Tài liệu Toán 9 chủ đề dấu hiệu nhận biết tiếp tuyến của đường tròn | https://thcs.toanmath.com/thcs-pdf/tai-lieu-toan-9-chu-de-dau-hieu-nhan-biet-tiep-tuyen-cua-duong-tron.pdf | Nội dung trùng dạng với phiếu Toán 9 (nguồn 11), đã đủ bài tiếp tuyến |
| Tuyển tập 400 bài: phần lớn "Thầy Nguyễn Chí Thành" (Câu 1–180) | (nguồn 15) | Đề rất dài, ký hiệu hỏng nặng ("Squat", mất `<`/`>`/`≠`, chèn header "LỚP TOÁN THẦY THÀNH… 0975.705.122"), nhiều câu trùng nhau (Câu 43/47/225, 32/35, 51/63/65). Chỉ lấy bài có ghi tỉnh và vài bài hai đường tròn |
| Câu 18 (đường tròn bàng tiếp, file HSG 9) | nguồn 13 | Ý b) nhắc tới điểm N chưa được định nghĩa, không khôi phục được. Dùng Câu 58 (đường tròn bàng tiếp góc A) thay thế |
| Bài "tứ giác có AC ⊥ BD… AD = 5, AB = 2, BC = 10" (phiếu tứ giác 8, Bài 5) | nguồn 8 | Dữ kiện số bị mất căn khi trích (đáp số CD = 11 không khớp), bỏ |
| Bài "tam giác ABC vuông… phân giác BD, CE cắt tại I. Chứng minh 2AI² = AD.AE?" (phiếu đồng dạng, Bài 8) | nguồn 10 | Không chắc vị trí số "2" (2AI² hay AI²), bỏ |
| Các bài "Cho hình vẽ…", "Tìm x trong hình vẽ", trắc nghiệm A/B/C/D, bài thực tế (xuồng máy, bánh đà, cần cẩu, cánh buồm, khúc sông), đồng dạng phối cảnh | nhiều nguồn | Không dựng được nếu không có hình, hoặc là trắc nghiệm hay tính toán thuần |
| Câu hình trong đề thi vào 10 có yếu tố thực tế (vd. Đắk Lắk 2025 câu IV.1 "đánh đu") | nguồn 14 | Bài lượng giác thực tế, không phải bài dựng hình |

## Truy vấn tìm kiếm đã dùng

- `toanmath chuyên đề tam giác cân toán 7 pdf`
- `tuyển tập câu hình học đề thi vào lớp 10 các tỉnh có lời giải pdf toanmath`
- `thcs.toanmath.com chuyên đề tứ giác hình bình hành hình thang toán 8`
- `thcs.toanmath.com chuyên đề tiếp tuyến của đường tròn toán 9`
- `thcs.toanmath.com chuyên đề tam giác đồng dạng toán 8`
- `thcs.toanmath.com chuyên đề đường trung tuyến đường phân giác đường cao tam giác toán 7`
- `đề thi tuyển sinh lớp 10 môn Toán 2025 bài hình học đường tròn đề bài loigiaihay`
- `loigiaihay "Đề thi vào 10 môn Toán" Nghệ An 2025 có đáp án và lời giải chi tiết`
- `loigiaihay "Đề thi vào 10 môn Toán" Hải Phòng 2025 có đáp án`
- `thcs.toanmath.com chuyên đề hình học bồi dưỡng học sinh giỏi toán 9 đường tròn nội tiếp bàng tiếp`

Ngoài ra còn duyệt các trang danh mục của loigiaihay (Hà Nội e26554, TP HCM e26555, Đà Nẵng e26563, Nghệ An e26584, Hải Phòng e26585).

## Thống kê cuối (200 bài)

### Theo cấp
| cấp | số bài |
|---|---|
| lop7 | 56 |
| lop8 | 65 |
| lop9 | 32 |
| vao10 | 41 |
| hsg9 | 6 |

### Theo độ dài
| độ dài | số bài |
|---|---|
| ngan | 60 |
| trung-binh | 74 |
| dai | 66 |

### Theo nhóm dạng
| nhóm | nhãn (số bài) | tổng |
|---|---|---|
| Tam giác | tam-giac-can 15, trung-truc 10, phan-giac 12, trong-tam 6, duong-cao 4, tam-giac-vuong 3, tam-giac-deu 2, trung-tuyen 2, truc-tam 2 | 56 |
| Tứ giác | hinh-binh-hanh 14, hinh-thang-can 7, hinh-chu-nhat 6, hinh-thoi 6, hinh-vuong 6, hinh-thang 1, tu-giac 1 | 41 |
| Đồng dạng / Talet | dong-dang 20, talet 4 | 24 |
| Đường tròn | tu-giac-noi-tiep 16, hai-duong-tron 12, tiep-tuyen 9, hai-tiep-tuyen 7, nua-duong-tron 7, duong-kinh 7, goc-noi-tiep 6, duong-tron-noi-tiep 6, duong-tron-ngoai-tiep 3, tiep-tuyen-cat-tuyen 3, day-cung 2, duong-tron-bang-tiep 1 | 79 |

Mỗi bài chỉ mang MỘT nhãn dạng, là dạng chính/đặc trưng của hình. Bài đường tròn vào 10 thường gồm nhiều dạng cùng lúc (tứ giác nội tiếp + tiếp tuyến + đồng dạng).
