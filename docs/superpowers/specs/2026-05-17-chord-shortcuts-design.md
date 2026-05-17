# Chord-shortcut cho geometry editor (2D + 3D)

**Ngày:** 2026-05-17
**Scope:** `src/stamps/geometry-2d/` + `src/stamps/geometry-3d/` + `src/stamps/shared/`
**Trạng thái:** Design — chờ duyệt trước khi viết plan.

## 1. Vấn đề

Editor hình học hiện có 28 tools (2D) chia 9 group. Muốn đổi tool, user phải rời chuột khỏi vùng vẽ để click LeftPanel. Excalidraw mặc định map `1`, `2`, `3`... cho 10 tool gốc — pattern này quen thuộc, nhưng 28 tools không vừa 10 phím số.

Mục tiêu: **đổi tool mà không rời chuột khỏi vùng vẽ**, vẫn phủ được hết 28 tools, không bắt user nhớ keymap khổng lồ.

## 2. Quyết định chính

- **Chord 2 phím**: letter (chọn group) → number (chọn tool trong group).
- **Letter map**: positional A–I theo thứ tự group đang khai báo trong `tools.tsx`. Không mnemonic vì UI tiếng Việt khó map sạch, A–I dễ đoán theo vị trí.
- **Phase 2 exit**: chord state giữ đến khi user bấm number (chọn) hoặc Esc (huỷ) hoặc letter khác (chuyển group). Không timeout — tránh huỷ ngoài ý muốn.
- **UI**: badge letter/number **luôn hiện** ở góc nút (mờ, ~9–10px), highlight khi chord active.
- **Scope**: cả `geometry-2d` và `geometry-3d`. Không đụng LaTeX (1 tool), không đụng outer Excalidraw.

## 3. Letter map (2D)

| Phím | Group | Tools (theo thứ tự, 1..N) |
|---|---|---|
| A | Cơ bản | 1=move, 2=select |
| B | Điểm | 1=point, 2=midpoint |
| C | Đường | 1=segment, 2=line, 3=ray, 4=vector |
| D | Dựng hình | 1=perpendicular, 2=parallel, 3=perpBisector, 4=angleBisector |
| E | Đa giác | 1=polygon, 2=regularPolygon |
| F | Đường tròn | 1=circleCenter, 2=circle3, 3=tangent |
| G | Đo lường | 1=angle, 2=distance, 3=area |
| H | Chỉnh sửa | 1=toggleLabel, 2=toggleVisible, 3=delete |
| I | Phép biến hình | 1=translate, 2=rotate, 3=reflectLine, 4=reflectPoint, 5=dilate |

Tối đa 5 tools/group → chỉ dùng `1`–`5`, phím số còn lại không tác dụng trong group đó.

**3D** dùng cùng nguyên tắc positional, letter map sẽ derive runtime từ `GROUP_ORDER` của `geometry-3d/editor/tools.ts` (group set khác 2D).

## 4. State machine

```
chordGroup ∈ {null} ∪ GroupKey

keydown (capture phase):
  guard: bỏ qua nếu document.activeElement là INPUT/TEXTAREA/contentEditable
  guard: bỏ qua nếu có metaKey/ctrlKey/altKey (để Cmd+A, Cmd+Z... rơi xuống)

  case 1 — key.toLowerCase() ∈ {a..i, giới hạn bằng GROUP_ORDER.length}:
    chordGroup ← GROUP_ORDER[letterIndex]
    preventDefault + stopPropagation

  case 2 — key ∈ {1..9} và chordGroup ≠ null:
    tools = TOOLS.filter(t => t.group === chordGroup)
    nếu (digit − 1) < tools.length:
      onSelect(tools[digit − 1].key)
    chordGroup ← null
    preventDefault + stopPropagation

  case 3 — key === 'Escape':
    nếu chordGroup ≠ null:
      chordGroup ← null
      preventDefault + stopPropagation
    else: rơi xuống Esc handler hiện tại (clear pending → clear selection)

  case 4 — khác: không consume event
```

Esc priority order khi không có chord: pending picks → selection → (no-op). Đã match logic hiện tại trong `MiniBoard.tsx:807-838`.

## 5. Kiến trúc

### Shared hook (mới)

`src/stamps/shared/useChordShortcut.ts`

```ts
interface UseChordShortcutArgs<G extends string> {
  groupOrder: G[];                  // ['move','point',...]
  tools: { key: string; group: G }[];
  onSelect: (toolKey: string) => void;
  enabled: boolean;                 // false → unbind
}

interface UseChordShortcutResult<G extends string> {
  chordGroup: G | null;
  cancel: () => void;               // expose cho Esc bên ngoài nếu cần
}

export function useChordShortcut<G extends string>(
  args: UseChordShortcutArgs<G>
): UseChordShortcutResult<G>
```

Hook tự gắn `window.addEventListener('keydown', ..., { capture: true })`. Trả về `chordGroup` để LeftPanel render highlight.

### Tích hợp 2D

- `geometry-2d/editor/tools.tsx`
  - Thêm `GROUP_ORDER: GroupKey[]` (positional theo thứ tự khai báo hiện tại).
  - Thêm helpers `letterForGroup(g): string` và `groupForLetter(ch): GroupKey | null` (derive từ `GROUP_ORDER`).
- `geometry-2d/editor/MiniBoard.tsx`
  - Gọi `useChordShortcut({ groupOrder: GROUP_ORDER, tools: TOOLS, onSelect: setTool, enabled: true })`.
  - Esc handler hiện tại (dòng 817–828): thêm priority chord-trước-pending (nhưng hook tự xử lý chord-Esc bằng capture, nên handler hiện tại không cần biết về chord).
  - Forward `chordGroup` qua prop xuống `<LeftPanel chordGroup={chordGroup} ... />`.
- `geometry-2d/editor/LeftPanel.tsx`
  - Nhận `chordGroup?: GroupKey | null`.
  - Group header: badge letter ở góc phải (always-on, `opacity: 0.4`, `font: 10px monospace`).
  - Tool button: badge số (index-trong-group + 1) ở góc dưới-phải (`opacity: 0.4`, `font: 9px monospace`).
  - Khi `chordGroup === g`: group đó được wrap với `border: 1.5px solid var(--accent)` + `background: var(--accent-soft)`; badge letter của nó nâng `opacity` lên 1.0; badge số của các tool trong group nâng `opacity` lên 1.0 + font-weight 600. Group khác `opacity` → 0.55.
  - Khi `chordGroup != null`: render dòng cuối panel `<chữ> → 1·<tool1>  2·<tool2>  ...  Esc huỷ` (text ~11px, màu mờ).
  - Transition: `opacity 120ms ease, border-color 120ms ease`.

### Tích hợp 3D

Cùng pattern. `geometry-3d/editor/tools.ts` thêm `GROUP_ORDER` và helpers tương đương. `MiniBoard3D.tsx` + `LeftPanel.tsx` (3D) áp dụng cùng cách.

Cần verify lúc implement: 3D có `setTool` API tương đương, có `LeftPanel` render group/tool tương tự (đọc `geometry-3d/editor/` để xác nhận).

## 6. Edge cases

1. **Focus input** (rename point, transform param): guard `inField` ở đầu handler → bỏ qua mọi letter/number. Pattern lấy từ `MiniBoard.tsx:807-810`.
2. **Modifier keys**: chord chỉ activate khi `!metaKey && !ctrlKey && !altKey`. Cmd+A, Cmd+Z, Alt+Tab vẫn fall-through.
3. **Shift+letter**: chấp nhận (so sánh `key.toLowerCase()`).
4. **Đang pending** (vd 1 điểm đã chọn cho segment): khi chord chọn tool mới → `setTool()` được gọi → pending tự clear theo logic hiện tại của `setTool` trong `MiniBoard.tsx`. Không có flow ngầm.
5. **Letter ngoài A..I** (vd J, K): không match → ignore, không vào chord, không consume.
6. **Number khi chord chưa active**: ignore, không consume.
7. **Letter khi chord đang active**: chuyển sang group mới, không cần Esc giữa chừng.
8. **Number vượt quá số tool trong group** (vd `B` rồi `9` mà group Điểm chỉ có 2): no-op, vẫn clear chord (tránh stuck state).
9. **Editor 2D + 3D mount đồng thời**: hiện tại không xảy ra. Hook có `enabled` flag để tránh xung đột nếu sau này có overlay.

## 7. UI mockup (text)

Trạng thái idle:

```
┌─ Cơ bản                A ┐
│  [↖]    [⬚]              │
│   1       2              │
└──────────────────────────┘
┌─ Điểm                  B ┐
│  [•]    [─•─]            │
│   1       2              │
└──────────────────────────┘
...
```

Sau khi bấm `B` (chord active, group Điểm focus):

```
┌─ Cơ bản                A ┐   ← opacity 0.55
│  [↖]    [⬚]              │
│   1       2              │
└──────────────────────────┘
╔═ Điểm                  B ╗   ← border accent, badge sáng
║  [•]    [─•─]            ║
║   1       2              ║   ← số đậm
╚══════════════════════════╝
┌─ Đường                 C ┐   ← dim
│  ...                     │
└──────────────────────────┘
...

B → 1·Điểm mới  2·Trung điểm   Esc huỷ      ← hint dòng cuối
```

## 8. Test

- `src/stamps/shared/__tests__/useChordShortcut.test.ts` — unit test thuần state machine:
  - bấm letter → `chordGroup` set đúng group; không gọi `onSelect`.
  - bấm letter rồi number hợp lệ → `onSelect` gọi đúng tool key, `chordGroup` về null.
  - bấm letter rồi Esc → không gọi `onSelect`, `chordGroup` về null.
  - bấm letter rồi number vượt index → no-op, `chordGroup` về null.
  - focus input → ignore tất cả.
  - modifier key (Cmd/Ctrl/Alt) → ignore.
  - `enabled: false` → không gắn listener.
- `src/stamps/geometry-2d/editor/__tests__/EditorPanel.test.tsx` (mở rộng test sẵn có): thêm case bấm `B` rồi `2` → `setTool('midpoint')` được gọi.
- `src/stamps/geometry-3d/editor/__tests__/` — case tương tự cho group 3D.
- Smoke trong consumer trước khi tag release.

## 9. Rollout

Branch: `worktree-feature+chord-shortcuts` (worktree đã tạo, sẽ merge về `main`).

Commit order:
1. `feat(shared): useChordShortcut hook + tests`
2. `feat(geometry-2d): chord shortcuts A-I + 1-9`
3. `feat(geometry-2d): UI badges + chord highlight`
4. `feat(geometry-3d): chord shortcuts + UI parity`

Sau mỗi commit chạy `npm run typecheck && npm test`. Build + smoke consumer trước khi `npm version patch` + tag.

## 10. Out of scope

- Customizable letter map (user tự gán) — YAGNI.
- Cheatsheet modal toàn cục (`?` để xem) — đã có hint dòng cuối + badge always-on.
- Shortcut cho LaTeX stamp (chỉ 1 tool).
- Shortcut cho outer Excalidraw board (Excalidraw đã có sẵn `1`/`2`/`3`...).
- Setting để tắt chord-shortcut (mặc định bật cho mọi user).
