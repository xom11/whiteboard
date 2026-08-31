# Trang giấy có vách: khóa camera cho nền kẻ dòng

**Ngày:** 2026-08-31
**Trạng thái:** đã duyệt thiết kế, chờ thực thi
**Sửa:** `e5c8071` (`feat(ui): tuỳ chọn nền giấy kẻ dòng cho bảng`)

## Vấn đề

Bản `e5c8071` chỉ vẽ **nền**, không đụng tới **camera**. `paperMetrics()` nhận
`scrollY` + `zoom` và cố ý bỏ qua `scrollX`, kèm comment "dòng kẻ ngang chạy
suốt bề rộng nên cuộn ngang không đổi gì cả". Lớp CSS `background-size: 100%
Npx` luôn phủ kín khung nhìn.

Hệ quả: bật nền kẻ dòng xong bảng vẫn là canvas vô tận hai chiều, chỉ khác là
có sọc. Giáo viên kéo sang trái/phải bao xa cũng được, zoom ra bao rộng cũng
được. Không có khái niệm "trang giấy" nào cả.

Mong muốn: **chiều ngang có giới hạn, chỉ cuộn xuống là vô hạn.**

## Bug dấu trong bản hiện tại

Không sửa được bằng cách vẽ thêm, và trên đường đọc lại thì lộ thêm một lỗi
độc lập cần vá cùng.

`paperStyle.ts` khẳng định — trong cả comment lẫn công thức — rằng Excalidraw
đặt điểm scene lên màn hình theo `screenY = (sceneY - scrollY) * zoom`. Sự
thật, đọc từ `node_modules/@excalidraw/excalidraw/dist/dev/chunk-4FTI6OG3.js:1329`:

```js
var sceneCoordsToViewportCoords = ({ sceneX, sceneY }, { zoom, offsetLeft, offsetTop, scrollX, scrollY }) => {
  const x = (sceneX + scrollX) * zoom.value + offsetLeft;
  const y = (sceneY + scrollY) * zoom.value + offsetTop;   // dấu CỘNG
  return { x, y };
};
```

Dấu là **cộng**, không phải trừ. Với hoa văn lặp chu kỳ `sizePx`, vị trí đúng
của dòng kẻ đầu tiên là `(scrollY * zoom) mod sizePx`. Bản hiện tại tính
`(-scrollY * zoom) mod sizePx`.

Hệ quả nhìn thấy được: kéo bảng xuống thì nét vẽ đi xuống còn dòng kẻ đi lên —
hai thứ trượt ngược nhau ở tốc độ gấp đôi. Đúng cái mà commit tuyên bố đã
tránh ("Dòng kẻ trôi khớp nội dung").

`offsetTop` triệt tiêu chứ không cần đưa vào công thức: `.wb-paper-layer` là
`position:absolute; inset:0` trong cùng hộp với container Excalidraw, nên hai
hệ quy chiếu có chung gốc.

### Vì sao test không bắt được

`tests/e2e/paper-background.spec.ts:164`:

```js
const expected = (((-after!.scrollY * after!.zoom) % size) + size) % size;
expect(after!.positionY).toBeCloseTo(expected, 1);
```

Khẳng định này chép lại đúng công thức của bản cài đặt rồi so với chính bản
cài đặt. Lật dấu trong `paperStyle.ts` thì `positionY` đổi, `expected` cũng
đổi y hệt, test vẫn xanh. Một phép đo không bao giờ đỏ được.

Unit test cùng lỗi: `src/ui/__tests__/paperStyle.test.ts:15` chép nguyên câu
sai vào comment rồi khẳng định `offsetPx` theo nó.

Bài học ghi vào CLAUDE.md: khẳng định về hành vi của thư viện ngoài phải đo
bằng **quan sát độc lập** (pixel trên ảnh chụp), không phải bằng cách tính lại
công thức của chính mình.

## Quyết định thiết kế

Chốt qua hỏi đáp với người dùng:

| Câu hỏi | Chốt |
|---|---|
| Zoom hết cỡ ra thì thấy gì? | **Trang khít bề ngang màn hình, không lề.** Trang có bề rộng cố định trong scene; zoom in thì kéo ngang được nhưng dừng ở mép trang |
| Trục dọc? | **Mép trên cứng**, dưới vô tận. Dòng kẻ đầu tiên là đỉnh trang, không cuộn lên cao hơn |
| Nội dung nằm ngoài trang? | **Vách cứng, báo một lần.** Bề rộng trang không bao giờ đổi; có nét vẽ lọt ra ngoài thì hiện dải cảnh báo |

Ràng buộc chỉ sống khi nền kẻ dòng **bật**. Tắt đi thì bảng trở lại canvas vô
tận y như trước, không còn dấu vết.

## Cơ chế ép buộc

Excalidraw 0.18.1 **không** có `scrollConstraints` (grep cả `dist/`: không có
kết quả). Phải tự viết.

### Vì sao kẹp sau lại chạy được

Điều làm phương án này khả thi: Excalidraw cập nhật camera **cộng dồn từ state
hiện tại**, không phải từ gốc cử chỉ. Trong `dist/prod/index.js`:

```js
scrollX: this.state.scrollX - i / this.state.zoom.value
```

Nên ghi giá trị đã kẹp ngược lại state thì sự kiện kế tiếp tính từ giá trị đã
kẹp. Được **vách cứng**, không có vòng giằng co, không rung. Nếu Excalidraw
tính từ gốc cử chỉ (`originScrollX + tổngDelta`) thì mỗi frame nó sẽ ghi đè
lại giá trị kẹp của ta và vách sẽ rung suốt lúc kéo — phương án này sẽ phải bỏ.

### Phương án đã cân nhắc

| | Cách làm | Đánh giá |
|---|---|---|
| **1. Kẹp sau qua `onScrollChange`** | Excalidraw đổi camera xong, ta kẹp lại bằng `updateScene(captureUpdate:'NEVER')` | **CHỌN.** Lõi là hàm thuần. Bắt mọi đường vào: con lăn, pinch, hand-tool, phím tắt, cả `scrollToContent` (Shift+1). Giá: một frame lố ~16ms ở sát vách |
| 2. Chặn ở đầu vào (wheel capture) | `preventDefault` trước khi Excalidraw thấy | Không lố frame nào, nhưng phải viết lại logic pan/zoom, và vẫn lọt `scrollToContent`, thanh cuộn, quán tính trackpad. Mong manh |
| 3. Vẽ khung trang làm element khóa | Không đụng camera | Không giải quyết yêu cầu — vẫn kéo ngang và zoom ra được |

## Toán học

Trang chiếm nửa mặt phẳng `sceneX ∈ [0, PAPER_PAGE_WIDTH]`, `sceneY ≥ 0`.

Từ `screenX = (sceneX + scrollX) * zoom`, vùng nhìn thấy theo trục ngang là
`sceneX ∈ [-scrollX, -scrollX + width/zoom]`. Đặt hai mép trang vào đó:

- Vách trái: `-scrollX ≥ 0` → `scrollX ≤ 0`
- Vách phải: `-scrollX + width/zoom ≤ PAPER_PAGE_WIDTH` → `scrollX ≥ width/zoom - PAPER_PAGE_WIDTH`
- Hai vế đó chỉ tồn tại khi `width/zoom ≤ PAPER_PAGE_WIDTH`, tức `zoom ≥ width/PAPER_PAGE_WIDTH`

Trục dọc, mép trên: vùng nhìn thấy bắt đầu ở `sceneY = -scrollY`, muốn không
thấy `sceneY < 0` thì `scrollY ≤ 0`. Kéo xuống là `scrollY → -∞`, không chặn.

```
minZoom = width / PAPER_PAGE_WIDTH
zoom    = clamp(zoom, minZoom, MAX_ZOOM)
scrollX = clamp(scrollX, width / zoom - PAPER_PAGE_WIDTH, 0)
scrollY = min(scrollY, 0)
```

`width` là `appState.width` — bề rộng container tính bằng CSS px.
`MAX_ZOOM = 30` (hằng của Excalidraw).

### Ba ca biên bắt buộc có test

1. **Epsilon trước khi ghi.** `clamp` có thể trả về giá trị lệch `1e-15` so
   với đầu vào. Ghi lại → `onScrollChange` bắn → kẹp → ghi lại → vòng lặp vô
   tận. Chỉ ghi khi lệch quá `1e-6`. Đây cũng là toàn bộ cơ chế chống dội:
   sau khi kẹp, giá trị đã nằm trong biên nên lần gọi lại là no-op.

2. **Khung nhìn hẹp hơn `MIN_ZOOM` cho phép.** `MIN_ZOOM = 0.1` là sàn cứng
   của Excalidraw. Nếu `width / PAPER_PAGE_WIDTH < 0.1` thì không thể vừa trang vào
   khung nhìn; cận dưới của `scrollX` vượt cận trên và `clamp` trả rác. Xử lý:
   phát hiện `width / zoom > PAPER_PAGE_WIDTH` thì **căn giữa trang** thay vì kẹp.

3. **Cửa sổ đổi kích thước.** `scrollY` không đổi ⇒ `onScrollChange` không
   bắn ⇒ ràng buộc thiu: khung rộng ra làm `minZoom` tăng, camera lặng lẽ nằm
   ngoài biên. Cần `ResizeObserver` trên container để kẹp lại.

## Nền vẽ ra sao

**CSS không đổi một dòng nào.** Camera đã đảm bảo trang luôn phủ kín bề ngang
khung nhìn ở mọi mức zoom, nên lớp `background-size: 100% Npx` phủ tràn vẫn
đúng. Vách là thứ *cảm nhận được khi kéo*, không phải thứ vẽ ra — đúng với
lựa chọn "trang chạm 2 mép, không lề".

Việc duy nhất trong `paperMetrics` là sửa dấu: `offsetPx = (scrollY * zoom) mod sizePx`.

`PAPER_PAGE_WIDTH = 1440` đơn vị scene (= 45 lần `PAPER_LINE_HEIGHT` 32). Trên khung
1440px thì `minZoom = 1.0`, dòng kẻ cách nhau 32px. Trên khung 1200px thì
`minZoom = 0.83`, cách nhau 26.7px. Cả hai đều đọc được.

## Nội dung ngoài trang

Kiểm bounding-box mọi element so với nửa mặt phẳng `x ∈ [0, PAPER_PAGE_WIDTH]`,
`y ≥ 0`. Có phần tử lọt ra thì hiện dải `aria-live` ở góc: "Có nội dung nằm
ngoài trang. Tắt nền kẻ dòng để xem."

Chạy **liên tục có tiết lưu** (~500ms) chứ không chỉ lúc bật, để ảnh PDF chèn
sau khi đã bật cũng được cảnh báo. Không tự sửa scene của giáo viên.

## Các tệp

```
src/ui/paperStyle.ts         sửa dấu paperMetrics + hằng PAPER_PAGE_WIDTH
src/ui/pageCamera.ts         MỚI — hàm thuần: minZoomFor, clampCamera, isOutsidePage
src/ui/usePageCamera.ts      MỚI — onScrollChange + ResizeObserver → updateScene
src/ui/PaperBackground.tsx   gọi hook camera; JSX + CSS giữ nguyên
src/ui/OffPageNotice.tsx     MỚI — dải cảnh báo
```

## Test

**Unit** (`pageCamera.test.ts`): bảng biên trái/phải/trên, `minZoom` theo bề
rộng khung, epsilon không sinh vòng lặp, khung hẹp hơn `MIN_ZOOM` thì căn
giữa, `isOutsidePage` với element âm x, âm y, tràn phải.

**Unit** (`paperStyle.test.ts`): sửa lại theo dấu đúng. Ca then chốt —
`scrollY` dương và âm phải cho `offsetPx` khác nhau và khớp
`(scrollY * zoom) mod sizePx`.

**E2E** (`paper-background.spec.ts`): thay khẳng định tautology bằng phép đo
độc lập.

- *Dòng kẻ dính nội dung*: đặt hình chữ nhật đỏ tại `sceneY = 64` (đúng 2
  dòng kẻ). Cuộn. Soi ảnh chụp: hàng pixel đỏ phải trùng hàng có vạch kẻ ở
  vùng x nằm ngoài hình. Lật dấu là đỏ ngay — đây là điều bản cũ không làm được.
- *Chạm vách phải*: đẩy con lăn ngang 50 lần, `scrollX` dừng đúng ở
  `width/zoom - PAPER_PAGE_WIDTH`.
- *Chạm vách trên*: cuộn lên 50 lần, `scrollY` dừng ở `0`.
- *Sàn zoom*: zoom out 30 lần, `zoom` dừng ở `minZoom`, và trang vẫn phủ kín
  bề ngang.
- *Tắt thì tự do trở lại*: tắt nền kẻ dòng, kéo ngang được quá vách cũ.

## Điều cố ý không làm

- **Không tự kéo nội dung vào trang.** Sửa scene của giáo viên là ghi đè công
  sức của họ; cảnh báo rồi để họ quyết.
- **Không cho `PAPER_PAGE_WIDTH` làm prop.** Một hằng số cho đến khi có người thật
  cần con số khác.
- **Không vẽ mép giấy / lề.** Người dùng đã chọn "trang chạm 2 mép".
- **Nền vẫn không đi theo ảnh export.** Giữ nguyên đánh đổi của `e5c8071`.
