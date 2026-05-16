# Mobile Geometry Drawer Redesign

**Date**: 2026-05-16
**Scope**: `src/stamps/geometry-2d/editor/LeftPanel.tsx` (mobile branch only) + `src/stamps/shared/stamp.css`
**Goal**: Replace cramped icon-only mobile drawer với layout có category tabs + tool card có nhãn, soft-modern emerald aesthetic.

## Pain Points (current state)

1. Tool icon 40×40 quá nhỏ, khó tap chính xác bằng ngón cái
2. Không có nhãn — user phải đoán nghĩa icon (vd. "tia" vs "vector")
3. 7-9 nhóm xếp dọc → scroll dài, không có overview
4. Visual giống desktop bị thu nhỏ; section header xám nhạt, hierarchy yếu

## Goals

- Tap target tool ≥ 72px (icon + label)
- Mỗi tool có nhãn ngắn dưới icon
- Mỗi lần chỉ hiển thị tools của 1 nhóm → không scroll dọc xuyên nhóm
- Visual: clean, friendly, hiện đại (kiểu Notion/Linear) — giữ emerald-600 brand accent
- Behavior cũ: tap tool → auto-close drawer

## Non-Goals

- Không đổi nội dung `tools.tsx` (24 tools, 9 nhóm, labels, hints giữ nguyên)
- Không đổi cách render canvas / MiniBoard
- Không sửa desktop layout
- Không sửa geometry-3d trong PR này (apply riêng nếu redesign OK)
- Không thêm search/filter — 24 tools chia rõ nhóm là đủ

## Design

### Layout (giữ left drawer slide-in)

```
┌─────────────────────────────────┐
│  📐  Hình học             ✕    │  Header — gradient slate→white
├─────────────────────────────────┤
│ ⊕Trục  ⊕Lưới       ↶ Hoàn tác  │  Pill chips + Undo icon-btn
├─────────────────────────────────┤
│ ● Cơ bản · Điểm · Đường · ...› │  Sticky tab strip (scroll ngang)
├─────────────────────────────────┤
│                                 │
│  ┌──────┐ ┌──────┐ ┌──────┐    │
│  │  ⇲   │ │  ▭   │ │      │    │  Tool card 3-col
│  │ Di   │ │ Chọn │ │      │    │  icon 24px + label text-[11px]
│  │chuyển│ │      │ │      │    │  min-height 72px
│  └──────┘ └──────┘ └──────┘    │
│                                 │
└─────────────────────────────────┘
```

**Logic**: render duy nhất tools thuộc tab active. Tab mặc định = nhóm chứa `activeTool` hiện tại (mở drawer thấy ngay tool đang dùng).

### Visual spec

| Element | Spec |
|---|---|
| Drawer width | 88vw, max 360px (rộng hơn 320 để chứa label) |
| Header | h-12, gradient `from-slate-50 to-white`, border-b |
| Layout chips (Trục, Lưới) | pill outline; active = emerald-50 bg + emerald-600 text + emerald-500 border; inactive = white bg + slate-600 text + slate-300 border. min-h 36px |
| Undo button | icon-only 40×40, hover bg-slate-100, disabled opacity-30 |
| Tab strip | sticky top dưới header; horizontal scroll-snap; gap-1.5; padding x-3 y-2; bg-white border-b |
| Tab pill | px-3 py-1.5 rounded-full; active = bg-emerald-600 text-white shadow-sm; inactive = text-slate-600 hover:bg-slate-100. min-h 36px |
| Tool grid | 3-col, gap-2, padding 12px |
| Tool card | rounded-2xl (16px), py-3 px-2, min-h-[72px], flex-col items-center justify-center |
| Tool card inactive | bg-slate-50, icon text-slate-700, label text-slate-700 text-[11px] leading-tight |
| Tool card active | bg-gradient-to-br from-emerald-500 to-emerald-600, text-white, shadow-md shadow-emerald-500/30 |
| Tool card hover (hover-cap devices) | bg-slate-100 |
| Active animation | none (Excalidraw boards thường tránh micro-anim trong drawer để giữ feel fast) |

### Touch & A11y

- Tool card 72px height; tab pill 36px height; layout chip 36px height — all ≥ 36px touch target
- `aria-pressed` cho tool card + tab + layout chip
- `aria-label` đầy đủ trên Undo
- `data-tool="<key>"` giữ nguyên cho E2E test
- `data-testid="toggle-axis"`, `data-testid="toggle-grid"` giữ trên các pill chip (đổi từ `<input type=checkbox>` sang `<button role=switch>`)
- Tooltip hover-only đã ẩn trên `@media (hover: none)` (giữ nguyên)
- iOS safe area: padding-bottom = `env(safe-area-inset-bottom)` cho overflow container

### Behavior

- Tap tool → set tool + auto-close drawer (giữ behavior cũ)
- Tap layout chip → toggle axis/grid, drawer giữ mở
- Tap Undo → undo, drawer giữ mở
- Swipe trái drawer = close (đã có qua backdrop tap)
- Tab strip mặc định scroll đến tab có `activeTool` khi mount (dùng `useEffect` + `scrollIntoView({inline: 'center'})`)

### Implementation Notes

- Tách render mobile sang block riêng trong `LeftPanel.tsx`:
  - `if (isMobile) return <MobileGeometryPanel ... />`
  - Desktop branch không đổi
- `MobileGeometryPanel` component nội bộ (cùng file để giảm churn):
  - State: `activeTab: ToolDef['group']` — init = `TOOLS.find(t => t.key === activeTool)?.group ?? 'move'`
  - State sync: khi `activeTool` đổi từ ngoài, set `activeTab` theo group mới
- Pill chip thay `<input type=checkbox>` bằng `<button aria-pressed role="switch">` để có touch target lớn hơn
- CSS classes mới đặt trong `stamp.css` với prefix `geo-mobile-`:
  - `.geo-mobile-tab-strip` — scrollbar-hide
  - `.geo-mobile-tab-strip::after` — fade gradient phải (chỉ báo overflow)
- Không cần thêm dependency

### Testing

- Smoke test hiện tại `EditorPanel.test.tsx` mock `isMobile=false` chủ yếu → không vỡ
- Cập nhật `MiniBoard.smoke.test.tsx` nếu có assertion về DOM cấu trúc mobile (kiểm tra trước)
- Thêm test mới `LeftPanel.mobile.test.tsx`:
  - Render với `isMobile=true, drawerOpen=true`
  - Click tab pill → chỉ tools nhóm đó hiển thị
  - Click tool → `onToolChange` + `onDrawerClose` called
  - Click axis chip → `onShowAxisChange(true)` called

### Risks

- Style chip switch (button thay checkbox) thay đổi data-testid attachment → kiểm tra test
- Tab strip horizontal scroll trên Android cũ (Chrome < 100) — fallback overflow-x: auto đủ
- Drawer width 360 có thể che canvas trên màn nhỏ — đã giới hạn 88vw

## Out of scope (future)

- Apply cho geometry-3d
- Touch gesture (swipe between tabs)
- Bottom sheet variant (đã consider, đã loại)
- Search/filter tools
