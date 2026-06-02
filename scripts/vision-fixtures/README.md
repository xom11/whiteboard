# Vision OCR Fixtures

Mỗi ảnh đề bài cần file `<basename>.expected.json` cùng folder:

```json
{
  "text": "Cho tam giác ABC vuông tại A. Kẻ đường cao AH ⊥ BC.",
  "expectRefuse": false
}
```

Đối với fixture control (ảnh KHÔNG phải đề toán, dùng để test refusal):

```json
{
  "text": "",
  "expectRefuse": true
}
```

Recommended fixtures v1 (10 đề + 2 control):
- `01-tam-giac-vuong-print.png` — đề in scan
- `02-duong-tron-noi-tiep-print.png`
- `03-hinh-thoi-print.jpg`
- `04-tiep-tuyen-screenshot.png`
- ...
- `99-control-truyen-kieu.png` — `expectRefuse: true`
- `99-control-meme.png` — `expectRefuse: true`
