# Nhãn kéo được độc lập với điểm/đường — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho phép kéo nhãn (tên) của điểm/đoạn/đường/đường tròn độc lập với object, persist vị trí, reset bằng chuột phải — trong editor 2D (+ đồ thị hàm số) dùng `JxgRenderer`.

**Architecture:** Thêm `labelOffset?: [number, number]` (pixel) vào attrs mỗi kind có nhãn. Render bật nhãn draggable (`label.fixed = false`) + áp offset. Listener `attachLabelDragSync` nghe `label.on('up')`, tính offset tổng (gộp `relativeCoords` drag-delta vào attribute `offset` + zero `relativeCoords` để không double-count), rồi `dispatch(UPDATE_ATTRS { labelOffset })`. Point có update-hook (re-áp offset); line/segment/circle không có hook → recreate tự áp offset mới. Reset = contextmenu trên `label.rendNode`.

**Tech Stack:** TypeScript strict, JSXGraph 1.12.2, Jest + jsdom, kiến trúc scene `src/core/scene/`.

---

## Bối cảnh JSXGraph (đã verify trong `node_modules/jsxgraph/distrib/jsxgraphsrc.js`)

- Label = `el.label` (một `JXG.Text`, `islabel=true`). Có `.on()`, `.setAttribute()`, `.rendNode`, `.relativeCoords`, `.evalVisProp('offset')`.
- `YEval` dùng `sy = -offset[1]` ⇒ `offset[1]` dương = nhãn đi LÊN.
- Kéo nhãn → `setPositionDirectly` nhánh `islabel` cộng dồn vào `relativeCoords.scrCoords[1..2]` (screen px, y xuống). Attribute `offset` KHÔNG đổi.
- Vị trí screen rel anchor: X = `offset[0] + rel.scr[1]`, Y(down) = `-offset[1] + rel.scr[2]`.
- Offset-tổng tương đương (để `rel=0`): `[offset[0] + rel.scr[1], offset[1] - rel.scr[2]]`.
- Default offset của nhãn điểm = `[10, 10]`.

## File Structure

- **Create** `src/core/scene/kinds/_label.ts` — helper `labelOpts()` + `readLabelOffset()` (thuần, test được).
- **Create** `src/core/scene/kinds/__tests__/_label.test.ts`.
- **Modify** `src/core/scene/kinds/point-constraints/_types.ts` — `PointAttrs.labelOffset`.
- **Modify** `src/core/scene/kinds/point-constraints/shared.ts` — `buildPointOpts` merge `labelOpts`.
- **Modify** `src/core/scene/kinds/point.ts` — update-hook áp label offset.
- **Modify** `src/core/scene/kinds/line.ts`, `segment.ts`, `circle.ts` — thêm `labelOffset` vào attrs type + merge `labelOpts` vào baseOpts.
- **Modify** `src/core/scene/render/JxgRenderer.ts` — `attachLabelDragSync` + gọi trong `create()`.
- **Modify/Create** `src/core/scene/render/__tests__/JxgRenderer*.test.ts` — test drag-sync nhãn bằng mock.

---

### Task 1: Helper `labelOpts` + `readLabelOffset` (TDD)

**Files:**
- Create: `src/core/scene/kinds/_label.ts`
- Test: `src/core/scene/kinds/__tests__/_label.test.ts`

- [ ] **Step 1: Viết test thất bại**

```ts
// src/core/scene/kinds/__tests__/_label.test.ts
import { labelOpts, readLabelOffset } from '../_label';

describe('labelOpts', () => {
  it('nhãn luôn draggable (fixed:false)', () => {
    expect(labelOpts()).toEqual({ label: { fixed: false } });
  });
  it('áp default khi không có labelOffset', () => {
    expect(labelOpts(undefined, [10, 10])).toEqual({ label: { fixed: false, offset: [10, 10] } });
  });
  it('labelOffset override default', () => {
    expect(labelOpts([22, -8], [10, 10])).toEqual({ label: { fixed: false, offset: [22, -8] } });
  });
  it('không default, không labelOffset → chỉ fixed:false', () => {
    expect(labelOpts(undefined)).toEqual({ label: { fixed: false } });
  });
});

describe('readLabelOffset', () => {
  const mk = (offset: [number, number], rel: [number, number]) => ({
    evalVisProp: (k: string) => (k === 'offset' ? offset : undefined),
    relativeCoords: { scrCoords: [1, rel[0], rel[1]] },
  });
  it('chưa kéo (rel=0) → bằng offset hiện tại', () => {
    expect(readLabelOffset(mk([10, 10], [0, 0]))).toEqual([10, 10]);
  });
  it('kéo phải+xuống: x cộng rel.x, y trừ rel.y (screen-y xuống)', () => {
    // kéo 5px sang phải, 7px xuống màn hình → offset x:10+5=15, y:10-7=3
    expect(readLabelOffset(mk([10, 10], [5, 7]))).toEqual([15, 3]);
  });
  it('làm tròn', () => {
    expect(readLabelOffset(mk([10, 10], [5.4, 6.6]))).toEqual([15, 3]);
  });
  it('thiếu relativeCoords → null', () => {
    expect(readLabelOffset({ evalVisProp: () => [10, 10] } as never)).toBeNull();
  });
  it('fallback visProp.offset khi không có evalVisProp', () => {
    const lbl = { visProp: { offset: [12, 12] }, relativeCoords: { scrCoords: [1, 0, 0] } };
    expect(readLabelOffset(lbl as never)).toEqual([12, 12]);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx jest src/core/scene/kinds/__tests__/_label.test.ts`
Expected: FAIL — `Cannot find module '../_label'`.

- [ ] **Step 3: Viết implementation tối thiểu**

```ts
// src/core/scene/kinds/_label.ts
/** Offset nhãn (pixel) so với anchor. offset[1] dương = nhãn đi lên (quy ước JSXGraph). */
export type LabelOffset = [number, number];

/**
 * Opts cho `label` của một JSXGraph element: luôn `fixed:false` (kéo được).
 * `labelOffset` (nếu có) hoặc `dflt` (nếu có) thành `offset`. Không có cả hai
 * → chỉ `{ fixed:false }` (giữ default JSXGraph, byte-identical với hiện tại
 * cho line/circle vốn không set offset).
 */
export function labelOpts(
  labelOffset?: LabelOffset,
  dflt?: LabelOffset,
): { label: Record<string, unknown> } {
  const offset = labelOffset ?? dflt;
  return { label: { fixed: false, ...(offset ? { offset } : {}) } };
}

/**
 * Đọc offset-tổng (pixel) của một label JSXGraph sau khi user kéo, quy về dạng
 * thuần `offset` (để zero relativeCoords mà vị trí không đổi):
 *   x = offset[0] + rel.scrCoords[1]
 *   y = offset[1] - rel.scrCoords[2]   (screen-y xuống, offset-y lên)
 * Trả null nếu thiếu dữ liệu.
 */
export function readLabelOffset(label: {
  evalVisProp?: (k: string) => unknown;
  visProp?: { offset?: number[] };
  relativeCoords?: { scrCoords?: number[] };
}): LabelOffset | null {
  const off = (label.evalVisProp?.('offset') as number[] | undefined) ?? label.visProp?.offset;
  const rel = label.relativeCoords?.scrCoords;
  if (!off || !rel || off.length < 2 || rel.length < 3) return null;
  return [Math.round(off[0] + rel[1]), Math.round(off[1] - rel[2])];
}
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `npx jest src/core/scene/kinds/__tests__/_label.test.ts`
Expected: PASS (6 test).

- [ ] **Step 5: Commit**

```bash
git add src/core/scene/kinds/_label.ts src/core/scene/kinds/__tests__/_label.test.ts
git commit -m "feat(scene): helper labelOpts + readLabelOffset cho nhãn kéo được"
```

---

### Task 2: Thêm `labelOffset` vào attrs types

**Files:**
- Modify: `src/core/scene/kinds/point-constraints/_types.ts`
- Modify: `src/core/scene/kinds/line.ts:26` (type `LineAttrs`)
- Modify: `src/core/scene/kinds/segment.ts:6` (type `SegmentAttrs`)
- Modify: `src/core/scene/kinds/circle.ts:19` (type `CircleAttrs`)

- [ ] **Step 1: Thêm field vào `PointAttrs`**

Trong `_types.ts`, thêm dòng vào type `PointAttrs` (sau `size?: number;`):

```ts
  size?: number;
  /** Offset nhãn (pixel) so với anchor; undefined = default JSXGraph [10,10]. */
  labelOffset?: [number, number];
```

- [ ] **Step 2: Thêm field vào `LineAttrs`, `SegmentAttrs`, `CircleAttrs`**

Trong mỗi type (`line.ts` `LineAttrs`, `segment.ts` `SegmentAttrs`, `circle.ts` `CircleAttrs`), thêm:

```ts
  /** Offset nhãn (pixel) so với anchor; undefined = default JSXGraph. */
  labelOffset?: [number, number];
```

(Đặt cạnh các field optional khác như `showLabel?`, `color?`.)

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS (field optional, không phá chỗ nào).

- [ ] **Step 4: Commit**

```bash
git add src/core/scene/kinds/point-constraints/_types.ts src/core/scene/kinds/line.ts src/core/scene/kinds/segment.ts src/core/scene/kinds/circle.ts
git commit -m "feat(scene): thêm attrs.labelOffset cho point/line/segment/circle"
```

---

### Task 3: Wire `labelOpts` vào render opts (no-regress)

**Files:**
- Modify: `src/core/scene/kinds/point-constraints/shared.ts:69-80` (`buildPointOpts`)
- Modify: `src/core/scene/kinds/line.ts:94-102` (baseOpts)
- Modify: `src/core/scene/kinds/segment.ts:41-48`
- Modify: `src/core/scene/kinds/circle.ts:121-130` (baseOpts)
- Test: `src/core/scene/kinds/__tests__/labelOffset-opts.test.ts` (mới)

- [ ] **Step 1: Viết test thất bại**

```ts
// src/core/scene/kinds/__tests__/labelOffset-opts.test.ts
import { buildPointOpts } from '../point-constraints/shared';
import type { SceneObject } from '../../types';
import type { PointAttrs } from '../point-constraints/_types';

const obj = (attrs: Partial<PointAttrs>): SceneObject<PointAttrs> => ({
  id: 'p1', kind: 'point', label: 'C', visible: true, locked: false, layer: '0',
  schemaVersion: 1, attrs: { constraint: { kind: 'free', x: 0, y: 0 }, ...attrs },
});

describe('buildPointOpts label', () => {
  it('không labelOffset → default [10,10], fixed:false', () => {
    const o = buildPointOpts(obj({})) as any;
    expect(o.label).toEqual({ fixed: false, offset: [10, 10] });
  });
  it('có labelOffset → dùng nó', () => {
    const o = buildPointOpts(obj({ labelOffset: [30, -12] })) as any;
    expect(o.label).toEqual({ fixed: false, offset: [30, -12] });
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx jest src/core/scene/kinds/__tests__/labelOffset-opts.test.ts`
Expected: FAIL — `o.label` undefined.

- [ ] **Step 3: Sửa `buildPointOpts`**

Trong `shared.ts`, import + merge:

```ts
import { labelOpts } from '../_label';
import type { PointAttrs } from './_types';
// ...
export function buildPointOpts(obj: SceneObject<PointAttrs>): Record<string, unknown> {
  return {
    name: obj.label,
    withLabel: obj.attrs.showLabel ?? true,
    visible: obj.visible,
    fixed: obj.locked,
    strokeColor: obj.attrs.color ?? '#1e40af',
    fillColor: obj.attrs.color ?? '#1e40af',
    face: obj.attrs.face ?? 'o',
    size: obj.attrs.size ?? 4,
    ...labelOpts(obj.attrs.labelOffset, [10, 10]),
  };
}
```

- [ ] **Step 4: Sửa baseOpts của line/segment/circle**

Trong mỗi file, `import { labelOpts } from './_label';` rồi thêm `...labelOpts(obj.attrs.labelOffset),` vào object baseOpts (KHÔNG truyền default → undefined giữ default JSXGraph, byte-identical):

- `line.ts` baseOpts (sau `dash:` ...): `...labelOpts(obj.attrs.labelOffset),`
- `segment.ts` object truyền vào `board.create('segment', ...)`: `...labelOpts(obj.attrs.labelOffset),`
- `circle.ts` baseOpts: `...labelOpts(obj.attrs.labelOffset),`

- [ ] **Step 5: Chạy test mới + render-golden + full suite**

Run: `npx jest src/core/scene/kinds/__tests__/labelOffset-opts.test.ts`
Expected: PASS.

Run: `npx jest` (full — đặc biệt render-golden)
Expected: PASS. **Nếu render-golden cho line/circle đổi:** nghĩa là `labelOpts(undefined)` thêm `label:{fixed:false}` làm SVG đổi. Kiểm tra: line/circle mặc định `showLabel:false` → không có nhãn → `label.fixed` vô hại; golden không nên đổi. Nếu đổi do object CÓ nhãn (vd circle qua-3-điểm `withLabel:true`), xác nhận đổi chỉ là `fixed:false` (nhãn vẫn cùng vị trí) → cập nhật golden, KHÔNG fix bằng cách bỏ feature.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(scene): render nhãn draggable + áp labelOffset (point/line/segment/circle)"
```

---

### Task 4: Point update-hook áp label offset

**Files:**
- Modify: `src/core/scene/kinds/point.ts:68-81` (`setAttribute` trong update hook)
- Test: `src/core/scene/kinds/__tests__/point-update-label.test.ts` (mới)

- [ ] **Step 1: Viết test thất bại**

```ts
// src/core/scene/kinds/__tests__/point-update-label.test.ts
import '../point';
import { getKind } from '../../registry';
import type { SceneObject } from '../../types';
import type { PointAttrs } from '../point-constraints/_types';

const mkObj = (labelOffset?: [number, number]): SceneObject<PointAttrs> => ({
  id: 'p1', kind: 'point', label: 'C', visible: true, locked: false, layer: '0',
  schemaVersion: 1, attrs: { constraint: { kind: 'free', x: 1, y: 2 }, labelOffset },
});

it('update hook áp label.offset qua setAttribute', () => {
  const def = getKind('point');
  const calls: any[] = [];
  const el = {
    setPositionDirectly: () => {},
    setAttribute: (a: any) => calls.push(a),
  };
  const next = mkObj([25, -9]);
  const prev = mkObj([10, 10]);
  def.update!(next, prev, {} as never, el);
  expect(calls[0].label).toEqual({ fixed: false, offset: [25, -9] });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx jest src/core/scene/kinds/__tests__/point-update-label.test.ts`
Expected: FAIL — `calls[0].label` undefined.

- [ ] **Step 3: Sửa update hook trong `point.ts`**

Import `labelOpts` ở đầu file (`import { labelOpts } from './_label';`), rồi trong nhánh `el.setAttribute({ ... })` thêm spread cuối object:

```ts
          el.setAttribute({
            name: obj.label,
            withLabel: obj.attrs.showLabel ?? true,
            visible: obj.visible,
            fixed: obj.locked,
            strokeColor: obj.attrs.color ?? '#1e40af',
            fillColor: obj.attrs.color ?? '#1e40af',
            face: obj.attrs.face ?? 'o',
            size: obj.attrs.size ?? 4,
            ...labelOpts(obj.attrs.labelOffset, [10, 10]),
          });
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `npx jest src/core/scene/kinds/__tests__/point-update-label.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(scene): point update-hook đồng bộ label offset (undo/redo/reset)"
```

---

### Task 5: `attachLabelDragSync` trong JxgRenderer

**Files:**
- Modify: `src/core/scene/render/JxgRenderer.ts:80-90` (gọi trong `create()`), thêm method.
- Test: `src/core/scene/render/__tests__/labelDragSync.test.ts` (mới)

- [ ] **Step 1: Viết test thất bại**

```ts
// src/core/scene/render/__tests__/labelDragSync.test.ts
import { JxgRenderer } from '../JxgRenderer';
import { createStore } from '../../store';
import type { State } from '../../types';

// Mock board tối thiểu: create() trả element có label kéo được.
function makeLabel() {
  const handlers: Record<string, (() => void)[]> = {};
  return {
    evalVisProp: (k: string) => (k === 'offset' ? [10, 10] : undefined),
    relativeCoords: { scrCoords: [1, 5, 7] }, // đã kéo +5/+7 screen
    rendNode: { addEventListener: () => {} },
    setAttribute: jest.fn(),
    on: (ev: string, cb: () => void) => { (handlers[ev] ??= []).push(cb); },
    _fire: (ev: string) => (handlers[ev] ?? []).forEach((c) => c()),
  };
}

function makeBoard(label: any) {
  return {
    create: () => ({ label, on: () => {}, elType: 'point', X: () => 0, Y: () => 0 }),
    removeObject: () => {},
    update: () => {},
  };
}

const baseState = (): State => ({
  meta: { domain: 'geometry2d' } as never,
  order: ['p1'],
  objects: {
    p1: {
      id: 'p1', kind: 'point', label: 'C', visible: true, locked: false, layer: '0',
      schemaVersion: 1, attrs: { constraint: { kind: 'free', x: 0, y: 0 } },
    },
  },
} as never);

it('kéo label → dispatch UPDATE_ATTRS với labelOffset tổng', () => {
  const store = createStore(baseState());
  const label = makeLabel();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const r = new JxgRenderer(store, makeBoard(label));
  label._fire('up');
  const off = (store.getState().objects.p1.attrs as any).labelOffset;
  expect(off).toEqual([15, 3]); // [10+5, 10-7]
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx jest src/core/scene/render/__tests__/labelDragSync.test.ts`
Expected: FAIL — `labelOffset` undefined (chưa wire).

- [ ] **Step 3: Thêm method + gọi trong `create()`**

Trong `create()` (sau `this.attachGliderDragSync(obj, el);`):

```ts
      this.attachLabelDragSync(obj, el);
```

Thêm import đầu file: `import { readLabelOffset } from '../kinds/_label';`

Thêm method (cạnh `attachGliderDragSync`):

```ts
  /**
   * Cho phép kéo NHÃN của bất kỳ object nào có label (point/line/segment/
   * circle...). Khi user kéo nhãn, JSXGraph cộng dồn vào label.relativeCoords
   * (drag-delta screen px) nhưng KHÔNG đổi attribute offset → vị trí cuối =
   * offset + relativeCoords. Ta gộp lại thành offset thuần (readLabelOffset),
   * zero relativeCoords để khỏi double-count rồi setAttribute + dispatch.
   * Right-click → reset về default (labelOffset = undefined).
   */
  private attachLabelDragSync(obj: SceneObject, el: unknown): void {
    const label = (el as { label?: any })?.label;
    if (!label || typeof label.on !== 'function') return;
    const sceneId = obj.id;

    label.on('up', () => {
      if (this.disposed) return;
      const off = readLabelOffset(label);
      if (!off) return;
      const cur = this.store.getState().objects[sceneId];
      if (!cur) return;
      const prev = (cur.attrs as { labelOffset?: [number, number] }).labelOffset;
      if (prev && prev[0] === off[0] && prev[1] === off[1]) return;
      // Gộp drag-delta vào offset thuần + zero relativeCoords → vị trí không đổi,
      // tránh double-count khi update-hook/recreate áp lại offset.
      try {
        label.setAttribute({ offset: off });
        if (label.relativeCoords?.scrCoords) {
          label.relativeCoords.scrCoords[1] = 0;
          label.relativeCoords.scrCoords[2] = 0;
        }
      } catch { /* ignore */ }
      this.store.dispatch({
        type: 'UPDATE_ATTRS',
        payload: { id: sceneId, patch: { labelOffset: off } },
      });
    });

    // Reset bằng chuột phải trên nhãn.
    const node = (label as { rendNode?: { addEventListener?: (e: string, cb: (ev: Event) => void) => void } }).rendNode;
    if (node?.addEventListener) {
      node.addEventListener('contextmenu', (ev: Event) => {
        if (this.disposed) return;
        ev.preventDefault();
        const c = this.store.getState().objects[sceneId];
        if (!c) return;
        if ((c.attrs as { labelOffset?: unknown }).labelOffset === undefined) return;
        this.store.dispatch({
          type: 'UPDATE_ATTRS',
          payload: { id: sceneId, patch: { labelOffset: undefined } },
        });
      });
    }
  }
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `npx jest src/core/scene/render/__tests__/labelDragSync.test.ts`
Expected: PASS.

- [ ] **Step 5: Full suite + typecheck**

Run: `npm run typecheck && npx jest`
Expected: PASS (0 regress).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(scene): attachLabelDragSync — kéo nhãn → persist + chuột phải reset"
```

---

### Task 6: Verify thủ công (browser) + chỉnh dấu nếu nhãn nhảy

**Files:** không sửa (trừ khi phát hiện sai dấu ở `_label.ts`).

- [ ] **Step 1: Build + chạy playground**

Dùng skill `verify` (hoặc `run`) để mở editor 2D. Vẽ vài điểm tên A/B/C gần nhau + 1 đường có nhãn.

- [ ] **Step 2: Kiểm tra hành vi**

- Kéo chữ "C" ra xa điểm C → thả: nhãn **đứng yên đúng chỗ thả** (KHÔNG nhảy về/đi xa gấp đôi). Nếu nhảy → kiểm dấu trong `readLabelOffset` (rất có thể `off[1] - rel[2]` cần thành `off[1] + rel[2]` hoặc rel index sai); sửa test Task 1 + code cho khớp rồi chạy lại.
- Kéo nhãn đường thẳng → tương tự (đường recreate, nhãn về đúng offset).
- Đóng editor rồi double-click stamp mở lại (re-edit) → nhãn giữ vị trí đã kéo (persist).
- Right-click lên nhãn → nhãn về vị trí mặc định.

- [ ] **Step 3: Commit (nếu có chỉnh dấu)**

```bash
git add -A
git commit -m "fix(scene): chỉnh quy ước dấu offset nhãn sau verify thủ công"
```

---

## Self-Review

- **Spec coverage:** (1) data model → Task 2 ✓; (2) render draggable → Task 3 ✓; (3) drag-sync → Task 5 ✓; (4) update hook → Task 4 ✓; (5) reset chuột phải → Task 5 ✓; (6) persist → tự động qua attrs (verify Task 6) ✓; phạm vi point+line+segment+circle ✓; 3D defer ✓.
- **Placeholder scan:** không có TBD/TODO; mọi step có code/lệnh cụ thể.
- **Type consistency:** `labelOpts`/`readLabelOffset` ký tên nhất quán Task 1↔3↔4↔5; `LabelOffset = [number,number]`; `UPDATE_ATTRS { patch: { labelOffset } }` khớp reducer generic merge.
- **Rủi ro:** quy ước dấu offset — đã cô lập vào `readLabelOffset` + verify Task 6 có hướng sửa rõ.
