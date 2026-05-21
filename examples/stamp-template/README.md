# Stamp template

Skeleton folder tối thiểu cho **1 stamp mới**. Dùng kèm
[`docs/superpowers/specs/add-new-stamp-howto.md`](../../docs/superpowers/specs/add-new-stamp-howto.md).

Stamp demo trong template là **"color-swatch"** — chèn 1 ô vuông màu xám (100×100 SVG)
vào whiteboard. Đơn giản nhất có thể trong khi vẫn cover trọn `StampType` API.

## Copy & rename

```bash
cp -r examples/stamp-template src/stamps/<your-kind>
```

Đổi `kind: 'color-swatch'` (trong `types.ts` + `index.tsx`) thành kind của bạn. Tất cả
type guard và Host component đã reference `kind` qua type — sửa 1 chỗ là đủ.

## File layout

```
examples/stamp-template/
├── README.md            ← bạn đang đọc
├── index.tsx            ← StampType + Host wrapping (re-export public)
├── types.ts             ← <YourKind>CustomData interface + type guard
├── render.ts            ← renderSvgFromCustomData (data → SVG string)
├── host.tsx             ← Host component (forwardRef, dispatch insert)
└── __tests__/
    └── contract.test.ts ← apply runStampContract(stamp, fixture)
```

## Sau khi copy

Đọc tiếp [add-new-stamp-howto.md](../../docs/superpowers/specs/add-new-stamp-howto.md) —
6 bước tích hợp stamp vào registry + catalog. Mỗi bước có lệnh thực thi và acceptance.
