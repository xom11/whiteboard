# Circle tools Tier 2 — design

**Status:** approved 2026-05-22
**Stamp:** `geometry-2d`
**Tier:** 2 (4 tool mới)

## Mục tiêu

Bổ sung 4 tool vẽ hình vào group `circle` của stamp `geometry-2d`, mở rộng từ 3 tool hiện có (`circleCenter`, `circle3`, `tangent`) lên 7 tool. Mục tiêu là đủ cho dạy hình học phổ thông phần cung tròn / hình quạt.

Tool tham chiếu theo screenshot (Circles section của tool tham khảo):
- Đường tròn biết tâm + 1 điểm trên cung **(đã có — `circleCenter`)**
- Đường tròn qua 3 điểm **(đã có — `circle3`)**
- Tiếp tuyến **(đã có — `tangent`)**
- Nửa đường tròn qua 2 điểm **(MỚI — `semicircle`)**
- Cung tròn biết tâm + 2 điểm **(MỚI — `arcCenter`)**
- Cung tròn qua 3 điểm **(MỚI — `arc3`)**
- Hình quạt biết tâm + 2 điểm **(MỚI — `sectorCenter`)**

Out-of-scope (Tier 3, không làm lần này):
- Compa (`compass`) — lấy bán kính từ 2 điểm rồi đặt tâm
- Hình quạt qua 3 điểm (`sector3`)
- Đường tròn biết tâm + bán kính nhập số (`circleRadius`)

## Quyết định

| Decision | Choice | Reason |
|---|---|---|
| Số tool thêm | 4 (Tier 2) | Đủ dạy cung/quạt, ship 1 PR |
| circleRadius | Bỏ | UX trùng `circleCenter` về mặt giáo cụ |
| Auto đo cung/quạt | Không | Nhất quán `circleCenter` hiện không hiển chu vi |
| Icon | AI tự design theo 4-color accent | Style match `circleCenter` & `circle3` |
| Schema | 2 kind mới (`arc`, `sector`) | Arc và sector semantically khác circle |

## Architecture

### Phía core/scene (registry kinds)

Project dùng registry-based scene schema ở `src/core/scene/kinds/*.ts`. Mỗi shape kind là 1 module độc lập với `validate`, `dependsOn`, `describe`, `render`, tự `registerKind` khi load.

#### New kind: `arc` (`src/core/scene/kinds/arc.ts`)

```ts
export type ArcConstruction =
  | { kind: 'byCenter';        center: string; p1: string; p2: string }  // O, A, B → cung tâm O, từ A đến B (CCW)
  | { kind: 'by3Points';       p1: string;     p2: string; p3: string } // 3 điểm trên cung
  | { kind: 'semicircle';      p1: string;     p2: string };             // đường kính p1p2

export interface ArcAttrs {
  construction: ArcConstruction;
  color?: string;       // default '#0f172a'
  width?: number;       // default 2
  dash?: number;        // default 0
  showLabel?: boolean;  // default false
}
```

Render (JSXGraph mapping):
- `byCenter` → `board.create('arc', [O, A, B], opts)`
- `by3Points` → `board.create('circumcirclearc', [A, B, C], opts)`
- `semicircle` → `board.create('semicircle', [A, B], opts)`

`dependsOn` trả về point IDs trong construction.

#### New kind: `sector` (`src/core/scene/kinds/sector.ts`)

```ts
export type SectorConstruction =
  | { kind: 'byCenter'; center: string; p1: string; p2: string };

export interface SectorAttrs {
  construction: SectorConstruction;
  color?: string;       // stroke '#0f172a'
  width?: number;       // 2
  fillColor?: string;   // default '#f59e0b' (C_FILL)
  fillOpacity?: number; // default 0.18
  showLabel?: boolean;  // false
}
```

Render: `board.create('sector', [O, A, B], opts)` với `fillColor`/`fillOpacity` áp dụng vào sector polygon.

#### Register

Thêm 2 dòng import vào `src/core/scene/kinds/index.ts`:
```ts
import './arc';
import './sector';
```

`JxgRenderer.ts` đã đọc kind từ registry → không cần sửa renderer.

### Phía geometry-2d stamp (editor)

#### `src/stamps/geometry-2d/editor/tools.tsx`

Thêm 4 keys vào `GeomTool`:
```ts
| 'semicircle'
| 'arcCenter'
| 'arc3'
| 'sectorCenter'
```

Thêm 4 SVG icons vào `Icon` (design system match: 16×16, viewBox 24×24, 4 màu accent):

- **semicircle**: nửa đường tròn emerald-arc (`C_ARC`), 2 endpoint blue ở đáy diameter.
- **arcCenter**: tâm blue (lớn) + cung emerald + 2 đầu cung blue (nhỏ), 2 bán kính nét đứt xám (`currentColor` opacity 0.4).
- **arc3**: 3 điểm blue cân đối, cung emerald đi qua.
- **sectorCenter**: tâm blue + 2 bán kính nét liền `currentColor` + cung emerald + fill orange (`C_FILL` opacity 0.25).

Thêm 4 entries vào `TOOLS` array (group `'circle'`), đặt giữa `circleCenter` và `circle3`:

```ts
{ key: 'circleCenter',  label: 'Đường tròn (tâm + điểm)',    hint: 'Click tâm rồi 1 điểm trên đường tròn',     icon: Icon.circleCenter,  group: 'circle', needs: 2 },
{ key: 'semicircle',    label: 'Nửa đường tròn (đường kính)',hint: 'Click 2 điểm — bán nguyệt qua đường kính', icon: Icon.semicircle,    group: 'circle', needs: 2 },
{ key: 'arcCenter',     label: 'Cung tròn (tâm + 2 điểm)',   hint: 'Click tâm O → A → B (cung từ A đến B)',    icon: Icon.arcCenter,     group: 'circle', needs: 3 },
{ key: 'arc3',          label: 'Cung tròn qua 3 điểm',        hint: 'Click 3 điểm trên cung',                   icon: Icon.arc3,          group: 'circle', needs: 3 },
{ key: 'sectorCenter',  label: 'Hình quạt (tâm + 2 điểm)',   hint: 'Click tâm O → A → B (quạt OAB)',           icon: Icon.sectorCenter,  group: 'circle', needs: 3 },
{ key: 'circle3',       label: 'Đường tròn qua 3 điểm',       hint: 'Click 3 điểm',                              icon: Icon.circle3,       group: 'circle', needs: 3 },
{ key: 'tangent',       label: 'Tiếp tuyến',                  hint: 'Click 1 điểm + 1 đường tròn có sẵn',       icon: Icon.tangent,       group: 'circle', needs: 2, accepts: ['point', 'circle'] },
```

**Quan trọng:** 4 tool mới (và `circleCenter`/`circle3` hiện có) KHÔNG khai báo `accepts` field. Lý do: theo commit `2b42337` (tangent + perp + parallel cho phép click empty area tạo free point), tool không có `accepts` mới được phép tạo free point khi click vùng trống. Nếu thêm `accepts: ['point', ...]` thì sẽ phải click vào point đã tồn tại — break UX. `tangent` giữ `accepts: ['point', 'circle']` vì slot 2 bắt buộc là circle có sẵn (không thể "tạo" circle bằng click empty).

#### `src/stamps/geometry-2d/editor/handlers/pointerDown/multiClick.ts`

Hiện đã có logic generic dựa trên `tool.needs` + `tool.accepts`. Vì 4 tool mới đều dùng `accepts: ['point', ...]` → logic accept-matching không cần sửa, chỉ cần đảm bảo `needs=2/3` được xử lý đúng. Kiểm tra path "empty area click → tạo free point" có hoạt động cho tool mới (giống `circle3`).

Spot-check: hiện logic `tangent + perp + parallel cho phép click empty area tạo free point` (commit `2b42337`). 4 tool mới đều cần khả năng đó tương tự `circleCenter`/`circle3`.

#### `src/stamps/geometry-2d/editor/handlers/finalizeShape.ts`

Thêm 4 case mới (mỗi case insert 1 object có `kind: 'arc' | 'sector'` vào scene store qua reducer action `addObject`):

```ts
case 'semicircle': {
  const [pA, pB] = pickedPoints; // 2 points
  return addObject({
    kind: 'arc',
    attrs: { construction: { kind: 'semicircle', p1: pA, p2: pB } },
  });
}
case 'arcCenter': {
  const [pO, pA, pB] = pickedPoints;
  return addObject({
    kind: 'arc',
    attrs: { construction: { kind: 'byCenter', center: pO, p1: pA, p2: pB } },
  });
}
case 'arc3': {
  const [pA, pB, pC] = pickedPoints;
  return addObject({
    kind: 'arc',
    attrs: { construction: { kind: 'by3Points', p1: pA, p2: pB, p3: pC } },
  });
}
case 'sectorCenter': {
  const [pO, pA, pB] = pickedPoints;
  return addObject({
    kind: 'sector',
    attrs: { construction: { kind: 'byCenter', center: pO, p1: pA, p2: pB } },
  });
}
```

(Pseudo-code — adapt cho signature hiện có của finalizeShape.)

## Edge cases

| Case | Behavior |
|---|---|
| `arc3` với 3 điểm thẳng hàng | JSXGraph trả NaN khi tính circumcircle → toast "Không vẽ được cung qua 3 điểm thẳng hàng", abort finalize |
| `arcCenter`/`sectorCenter` với O ≡ A | OA = 0 → JSXGraph fail → toast "Cần 3 điểm phân biệt" |
| `semicircle` với 2 điểm trùng | toast "Cần 2 điểm phân biệt" |
| Hướng quét cung | Theo JSXGraph default — CCW từ p1 đến p2 |
| Hover hit-test ngay sau khi tạo | Áp dụng fix `jxgIdToSceneId direct fallback` (commit `288ab5f`) — đảm bảo hover/select hoạt động trên arc/sector |

## Testing

| File | Coverage |
|---|---|
| `src/core/scene/kinds/__tests__/arc.test.ts` | validate, dependsOn, describe (3 variants); register kind ok |
| `src/core/scene/kinds/__tests__/sector.test.ts` | validate, dependsOn, describe (byCenter); register kind ok |
| `src/core/scene/render/__tests__/JxgRenderer.test.ts` | Thêm test "render arc 3 variants" + "render sector byCenter" — verify JSXGraph `create` được gọi đúng element type |
| `src/stamps/geometry-2d/editor/__tests__/tools.test.tsx` | Verify TOOLS array có 4 entries mới, đúng `group`/`needs`/`accepts` |
| `src/stamps/geometry-2d/editor/handlers/__tests__/finalizeShape.test.ts` | Smoke: 2-click semicircle → addObject với attrs đúng; 3-click 3 tool còn lại tương tự |

Roundtrip serialize/restore tự động cover bởi existing scene state machine (kind registry handles version/migrate). Không cần test riêng cho `serialize.ts`.

## Implementation plan (sẽ chi tiết hóa bởi writing-plans skill)

1. **Kind `arc`** — file mới + register + test (TDD)
2. **Kind `sector`** — file mới + register + test (TDD)
3. **Icons + TOOLS entries** — `tools.tsx` (4 SVG + 4 entries) + smoke test
4. **finalizeShape cases** — 4 case + handler test
5. **multiClick verify** — chỉ verify, không sửa nếu logic generic đã đúng
6. **JxgRenderer test** — thêm render test cho arc/sector
7. **Manual QA** — `npm run dev` + thử lần lượt 4 tool, verify roundtrip qua double-click reopen editor

## Git workflow

- Worktree: `git worktree add ../whiteboard-circle-tools -b feature/circle-tools-tier2` từ `main` HEAD
- Branch `feature/circle-tools-tier2`
- Commit Việt theo convention (`feat`, `fix`, `test`, `refactor`)
- Không thêm `Co-Authored-By`
- Sau khi xong: PR vào `main` hoặc fast-forward merge nếu solo
