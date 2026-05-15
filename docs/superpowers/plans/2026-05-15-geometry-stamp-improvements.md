# Geometry Stamp Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nâng UX Geometry stamp ngang GeoGebra: live preview khi dựng hình, popover sửa thuộc tính (màu/tên/style/xoá), 5 phép biến hình (tịnh tiến, quay, đối xứng trục, đối xứng tâm, vị tự), đồng bộ dark mode với Excalidraw.

**Architecture:** Mở rộng `src/stamp/JSXGraphMiniBoard.tsx` với preview lifecycle + mutate API + transform tool dispatch; thêm 2 component popover mới (`PropertiesPopover`, `TransformParamPopover`); module pure `transforms.ts` cho defining-points + JSXGraph transform builder; mở rộng `serializeBoard` replay để hiểu entry `type: 'transform'`. Dark mode tận dụng cơ chế `theme--dark` đã có ở `stamp.css` — chỉ cần truyền `isDark` xuống popover portal và audit class.

**Tech Stack:** React 18 + TypeScript strict, JSXGraph 1.12 (dependency có sẵn), Jest 29 + jsdom, tsup build, Excalidraw 0.18 (peer).

**Spec reference:** `docs/superpowers/specs/2026-05-15-geometry-stamp-improvements-design.md`.

---

## File Structure

**Create:**
- `src/stamp/transforms.ts` — pure helpers (getDefiningPoints, buildTransformSpec → JSXGraph transform)
- `src/stamp/PropertiesPopover.tsx` — floating popover edit color/name/style/delete
- `src/stamp/TransformParamPopover.tsx` — input popover cho góc / k
- `src/stamp/excalidrawPalette.ts` — 8 màu stroke chuẩn Excalidraw (hard-code with source comment)
- `src/stamp/__tests__/transforms.test.ts`
- `src/stamp/__tests__/PropertiesPopover.test.tsx`
- `src/stamp/__tests__/TransformParamPopover.test.tsx`

**Modify:**
- `src/stamp/JSXGraphMiniBoard.tsx` — live preview, mutate API, transform tools, properties select trigger, Esc handler
- `src/stamp/GeometryEditorPanel.tsx` — render popovers, nhận + pass `isDark`
- `src/stamp/StampLeftPanel.tsx` — thêm group "Phép biến hình" với 5 button, nhận `isDark`
- `src/stamp/serializeBoard.ts` — `deserializeIntoBoard` handle entry `type: 'transform'`
- `src/stamp/stamp.css` — bổ sung dark rule cho UI mới (palette swatch, style toggle, popover shadow)
- `src/stamp/index.ts` — re-export nếu cần
- `src/stamp/__tests__/JSXGraphMiniBoard.test.tsx` — test live preview lifecycle
- `src/stamp/__tests__/serializeBoard.test.ts` — test transform replay (file có thể đã tồn tại; nếu chưa, tạo mới)
- `src/ExcalidrawWhiteboardView.tsx` — pass `isDarkTheme` xuống `GeometryEditorPanel`

---

## Task 1: Excalidraw palette constants

**Files:**
- Create: `src/stamp/excalidrawPalette.ts`
- Test: `src/stamp/__tests__/excalidrawPalette.test.ts`

- [ ] **Step 1: Tạo test file**

`src/stamp/__tests__/excalidrawPalette.test.ts`:
```ts
import { STROKE_PALETTE } from '../excalidrawPalette';

describe('STROKE_PALETTE', () => {
  it('có đúng 8 màu hex hợp lệ', () => {
    expect(STROKE_PALETTE).toHaveLength(8);
    for (const c of STROKE_PALETTE) {
      expect(c).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
  it('màu đầu là đen của Excalidraw', () => {
    expect(STROKE_PALETTE[0]).toBe('#1e1e1e');
  });
});
```

- [ ] **Step 2: Run test, expect fail**

`npm test -- excalidrawPalette` → FAIL (module not found).

- [ ] **Step 3: Implement**

`src/stamp/excalidrawPalette.ts`:
```ts
'use client';
// 8 màu chính lấy từ Excalidraw DEFAULT_ELEMENT_STROKE_COLOR_PALETTE.
// Nguồn: @excalidraw/excalidraw — packages/excalidraw/colors.ts (top row chuẩn).
// Cần đồng bộ tay nếu Excalidraw đổi palette ở major bump.
export const STROKE_PALETTE = [
  '#1e1e1e', // black
  '#e03131', // red
  '#e8590c', // orange
  '#f08c00', // yellow
  '#2f9e44', // green
  '#1971c2', // blue
  '#9c36b5', // grape
  '#868e96', // gray
] as const;

export type StrokeColor = (typeof STROKE_PALETTE)[number];
```

- [ ] **Step 4: Run test, expect pass**

`npm test -- excalidrawPalette` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stamp/excalidrawPalette.ts src/stamp/__tests__/excalidrawPalette.test.ts
git commit -m "feat(stamp): hằng số STROKE_PALETTE đồng bộ Excalidraw"
```

---

## Task 2: transforms.ts — getDefiningPoints

**Files:**
- Create: `src/stamp/transforms.ts`
- Create: `src/stamp/__tests__/transforms.test.ts`

`getDefiningPoints` đọc một JSXGraph object và trả về điểm gốc + kind. Pure JS, dễ TDD với mock object.

- [ ] **Step 1: Tạo test**

`src/stamp/__tests__/transforms.test.ts`:
```ts
import { getDefiningPoints } from '../transforms';

const mkPoint = () => ({ elType: 'point' });

describe('getDefiningPoints', () => {
  it('point trả về chính nó', () => {
    const p = mkPoint();
    expect(getDefiningPoints(p)).toEqual({ kind: 'point', points: [p], attrs: {} });
  });

  it('segment trả về point1 + point2', () => {
    const p1 = mkPoint(), p2 = mkPoint();
    const seg = { elType: 'segment', point1: p1, point2: p2, visProp: {} };
    const r = getDefiningPoints(seg);
    expect(r?.kind).toBe('segment');
    expect(r?.points).toEqual([p1, p2]);
  });

  it('line, ray (line with straightFirst:false), arrow đều thuộc line family', () => {
    const p1 = mkPoint(), p2 = mkPoint();
    expect(getDefiningPoints({ elType: 'line', point1: p1, point2: p2, visProp: {} })?.kind).toBe('line');
    expect(getDefiningPoints({ elType: 'arrow', point1: p1, point2: p2, visProp: {} })?.kind).toBe('arrow');
  });

  it('circle (center+point) trả về [center, point2]', () => {
    const c = mkPoint(), p2 = mkPoint();
    const circ = { elType: 'circle', center: c, point2: p2, visProp: {} };
    const r = getDefiningPoints(circ);
    expect(r?.kind).toBe('circleCenter');
    expect(r?.points).toEqual([c, p2]);
  });

  it('circumcircle trả về 3 điểm', () => {
    const a = mkPoint(), b = mkPoint(), d = mkPoint();
    const cc = { elType: 'circumcircle', point1: a, point2: b, point3: d, visProp: {} };
    const r = getDefiningPoints(cc);
    expect(r?.kind).toBe('circle3');
    expect(r?.points).toEqual([a, b, d]);
  });

  it('null cho object không biết', () => {
    expect(getDefiningPoints({ elType: 'angle' })).toBeNull();
  });
});
```

- [ ] **Step 2: Run test, expect fail**

`npm test -- transforms` → FAIL.

- [ ] **Step 3: Implement getDefiningPoints**

`src/stamp/transforms.ts`:
```ts
'use client';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type JxgObj = any;

export type DefKind = 'point' | 'segment' | 'line' | 'ray' | 'arrow' | 'circleCenter' | 'circle3';

export interface DefiningPointsResult {
  kind: DefKind;
  points: JxgObj[];
  attrs: Record<string, unknown>;
}

const LINE_LIKE = new Set(['line', 'segment', 'arrow']);

function copyVisAttrs(obj: JxgObj): Record<string, unknown> {
  const v = obj?.visProp ?? {};
  const pick = (k: string) => v?.[k];
  const out: Record<string, unknown> = {};
  for (const k of ['strokecolor', 'strokewidth', 'strokeopacity', 'dash', 'fillcolor', 'fillopacity']) {
    const val = pick(k);
    if (val !== undefined) out[k === 'strokecolor' ? 'strokeColor' : k === 'strokewidth' ? 'strokeWidth' : k === 'strokeopacity' ? 'strokeOpacity' : k === 'fillcolor' ? 'fillColor' : k === 'fillopacity' ? 'fillOpacity' : k] = val;
  }
  return out;
}

export function getDefiningPoints(obj: JxgObj): DefiningPointsResult | null {
  if (!obj) return null;
  const e = (obj.elType ?? obj.type ?? '').toString().toLowerCase();
  if (e === 'point' || e === 'glider' || e === 'midpoint') {
    return { kind: 'point', points: [obj], attrs: copyVisAttrs(obj) };
  }
  if (LINE_LIKE.has(e) && obj.point1 && obj.point2) {
    const kind: DefKind = e === 'segment' ? 'segment' : e === 'arrow' ? 'arrow' : 'line';
    return { kind, points: [obj.point1, obj.point2], attrs: copyVisAttrs(obj) };
  }
  if (e === 'circle' && obj.center && obj.point2) {
    return { kind: 'circleCenter', points: [obj.center, obj.point2], attrs: copyVisAttrs(obj) };
  }
  if (e === 'circumcircle' && obj.point1 && obj.point2 && obj.point3) {
    return { kind: 'circle3', points: [obj.point1, obj.point2, obj.point3], attrs: copyVisAttrs(obj) };
  }
  return null;
}
```

- [ ] **Step 4: Run test, expect pass**

`npm test -- transforms` → all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stamp/transforms.ts src/stamp/__tests__/transforms.test.ts
git commit -m "feat(stamp): getDefiningPoints cho point/line family/circle"
```

---

## Task 3: transforms.ts — buildTransformSpec

**Files:**
- Modify: `src/stamp/transforms.ts`
- Modify: `src/stamp/__tests__/transforms.test.ts`

Hàm pure trả về `{ params, attrs }` để gọi `board.create('transform', params, attrs)`. Logic tham số (chuyển độ → radian, ref → JxgObj) tách khỏi gọi board → dễ test.

- [ ] **Step 1: Thêm test**

Cuối `transforms.test.ts`:
```ts
import { buildTransformSpec } from '../transforms';

describe('buildTransformSpec', () => {
  it('translate: dx/dy literal từ 2 điểm (serialize-friendly)', () => {
    const a = { X: () => 0, Y: () => 0 };
    const b = { X: () => 3, Y: () => 4 };
    const spec = buildTransformSpec({ kind: 'translate', vectorPoints: [a, b] });
    expect(spec.attrs).toEqual({ type: 'translate' });
    expect(spec.params).toEqual([3, 4]);
  });

  it('rotate: chuyển độ → rad, attach center', () => {
    const c = { X: () => 0 };
    const spec = buildTransformSpec({ kind: 'rotate', center: c, angleDeg: 90 });
    expect(spec.attrs).toEqual({ type: 'rotate' });
    expect(spec.params[0]).toBeCloseTo(Math.PI / 2, 6);
    expect(spec.params[1]).toBe(c);
  });

  it('reflectLine: 1 param là line', () => {
    const l = { elType: 'line' };
    expect(buildTransformSpec({ kind: 'reflectLine', line: l })).toEqual({
      params: [l], attrs: { type: 'reflect' },
    });
  });

  it('reflectPoint: scale(-1,-1) quanh center', () => {
    const c = { X: () => 0 };
    const spec = buildTransformSpec({ kind: 'reflectPoint', center: c });
    expect(spec.attrs).toEqual({ type: 'scale' });
    expect(spec.params).toEqual([-1, -1, c]);
  });

  it('dilate: [k, center]', () => {
    const c = { X: () => 0 };
    const spec = buildTransformSpec({ kind: 'dilate', center: c, k: 2 });
    expect(spec.attrs).toEqual({ type: 'scale' });
    expect(spec.params).toEqual([2, 2, c]);
  });
});
```

- [ ] **Step 2: Run, expect fail**

`npm test -- transforms` → FAIL on buildTransformSpec import.

- [ ] **Step 3: Implement**

Thêm cuối `src/stamp/transforms.ts`:
```ts
export type TransformInput =
  | { kind: 'translate'; vectorPoints: [JxgObj, JxgObj] }
  | { kind: 'rotate'; center: JxgObj; angleDeg: number }
  | { kind: 'reflectLine'; line: JxgObj }
  | { kind: 'reflectPoint'; center: JxgObj }
  | { kind: 'dilate'; center: JxgObj; k: number };

export interface TransformSpec {
  params: unknown[];
  attrs: { type: 'translate' | 'rotate' | 'reflect' | 'scale' };
}

export function buildTransformSpec(input: TransformInput): TransformSpec {
  switch (input.kind) {
    case 'translate': {
      // Literal dx/dy (không phải callback) để serialize qua JSON.stringify được.
      // Trade-off: transformed object không cập nhật khi user kéo điểm vector — chấp nhận.
      const [a, b] = input.vectorPoints;
      const dx = b.X() - a.X();
      const dy = b.Y() - a.Y();
      return { params: [dx, dy], attrs: { type: 'translate' } };
    }
    case 'rotate':
      return {
        params: [(input.angleDeg * Math.PI) / 180, input.center],
        attrs: { type: 'rotate' },
      };
    case 'reflectLine':
      return { params: [input.line], attrs: { type: 'reflect' } };
    case 'reflectPoint':
      // JSXGraph không có 'pointMirror' built-in; equivalent với scale(-1, -1) quanh center.
      return { params: [-1, -1, input.center], attrs: { type: 'scale' } };
    case 'dilate':
      return { params: [input.k, input.k, input.center], attrs: { type: 'scale' } };
  }
}
```

- [ ] **Step 4: Run, expect pass**

`npm test -- transforms` → all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stamp/transforms.ts src/stamp/__tests__/transforms.test.ts
git commit -m "feat(stamp): buildTransformSpec cho 5 phép biến hình"
```

---

## Task 4: TransformParamPopover component

**Files:**
- Create: `src/stamp/TransformParamPopover.tsx`
- Create: `src/stamp/__tests__/TransformParamPopover.test.tsx`

- [ ] **Step 1: Test**

`src/stamp/__tests__/TransformParamPopover.test.tsx`:
```tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TransformParamPopover } from '../TransformParamPopover';

describe('TransformParamPopover', () => {
  const baseProps = { anchor: { x: 100, y: 100 }, onConfirm: jest.fn(), onCancel: jest.fn(), isDark: false };
  beforeEach(() => jest.clearAllMocks());

  it('rotate: default 90°, label đúng', () => {
    render(<TransformParamPopover {...baseProps} kind="rotate" defaultValue={90} />);
    expect(screen.getByText(/G[oó]c/i)).toBeInTheDocument();
    expect(screen.getByRole('spinbutton')).toHaveValue(90);
  });

  it('dilate: label tỷ số k', () => {
    render(<TransformParamPopover {...baseProps} kind="dilate" defaultValue={2} />);
    expect(screen.getByText(/k/i)).toBeInTheDocument();
  });

  it('Enter gọi onConfirm với value hiện tại', () => {
    const onConfirm = jest.fn();
    render(<TransformParamPopover {...baseProps} kind="rotate" defaultValue={90} onConfirm={onConfirm} />);
    const input = screen.getByRole('spinbutton') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '45' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onConfirm).toHaveBeenCalledWith(45);
  });

  it('Esc gọi onCancel', () => {
    const onCancel = jest.fn();
    render(<TransformParamPopover {...baseProps} kind="rotate" defaultValue={90} onCancel={onCancel} />);
    fireEvent.keyDown(screen.getByRole('spinbutton'), { key: 'Escape' });
    expect(onCancel).toHaveBeenCalled();
  });

  it('isDark thêm class theme--dark', () => {
    const { container } = render(<TransformParamPopover {...baseProps} kind="rotate" defaultValue={90} isDark />);
    expect(container.querySelector('.theme--dark')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run, expect fail**

`npm test -- TransformParamPopover` → FAIL.

- [ ] **Step 3: Implement**

`src/stamp/TransformParamPopover.tsx`:
```tsx
'use client';
import React, { useEffect, useRef, useState } from 'react';

interface Props {
  kind: 'rotate' | 'dilate';
  anchor: { x: number; y: number };
  defaultValue: number;
  onConfirm: (value: number) => void;
  onCancel: () => void;
  isDark?: boolean;
}

export const TransformParamPopover: React.FC<Props> = ({ kind, anchor, defaultValue, onConfirm, onCancel, isDark }) => {
  const [value, setValue] = useState<number>(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select(); }, []);

  const submit = () => onConfirm(Number.isFinite(value) ? value : defaultValue);

  return (
    <div
      data-stamp-area="true"
      className={`${isDark ? 'theme--dark ' : ''}fixed z-[60] flex flex-col gap-2 rounded-lg border border-slate-300 bg-white p-3 shadow-2xl ring-1 ring-black/5`}
      style={{ left: anchor.x, top: anchor.y, minWidth: 180 }}
      role="dialog"
      aria-label={kind === 'rotate' ? 'Góc quay' : 'Tỷ số k'}
    >
      <label className="text-xs font-medium text-slate-700">
        {kind === 'rotate' ? 'Góc (°)' : 'Tỷ số k'}
      </label>
      <input
        ref={inputRef}
        type="number"
        value={value}
        step={kind === 'rotate' ? 15 : 0.5}
        onChange={(e) => setValue(parseFloat(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); submit(); }
          else if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
        }}
        className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800"
      />
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
        >
          Huỷ
        </button>
        <button
          onClick={submit}
          className="rounded bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700"
        >
          Áp dụng
        </button>
      </div>
    </div>
  );
};
```

- [ ] **Step 4: Run, expect pass**

`npm test -- TransformParamPopover` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stamp/TransformParamPopover.tsx src/stamp/__tests__/TransformParamPopover.test.tsx
git commit -m "feat(stamp): TransformParamPopover cho rotate/dilate"
```

---

## Task 5: PropertiesPopover component

**Files:**
- Create: `src/stamp/PropertiesPopover.tsx`
- Create: `src/stamp/__tests__/PropertiesPopover.test.tsx`

Popover hỗ trợ: chọn màu từ palette, đổi tên (point), chọn style, xoá. Đẩy patch ra parent thông qua `onMutate`.

- [ ] **Step 1: Test**

`src/stamp/__tests__/PropertiesPopover.test.tsx`:
```tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PropertiesPopover } from '../PropertiesPopover';

describe('PropertiesPopover', () => {
  const baseProps = { anchor: { x: 50, y: 50 }, onClose: jest.fn(), onMutate: jest.fn(), isDark: false };
  beforeEach(() => jest.clearAllMocks());

  it('point: hiện palette + input tên + style point + nút xoá', () => {
    render(<PropertiesPopover {...baseProps} kind="point" currentName="A" currentColor="#1e1e1e" currentDash={0} currentWidth={2} currentFace="o" />);
    expect(screen.getAllByRole('button', { name: /M[aà]u/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('textbox')).toHaveValue('A');
    expect(screen.getByRole('button', { name: /Xo[aá]/i })).toBeInTheDocument();
  });

  it('click swatch → onMutate với strokeColor', () => {
    const onMutate = jest.fn();
    render(<PropertiesPopover {...baseProps} kind="point" currentName="A" currentColor="#1e1e1e" currentDash={0} currentWidth={2} currentFace="o" onMutate={onMutate} />);
    fireEvent.click(screen.getByRole('button', { name: /M[aà]u #e03131/i }));
    expect(onMutate).toHaveBeenCalledWith({ attrs: expect.objectContaining({ strokeColor: '#e03131' }) });
  });

  it('đổi tên → onMutate với name', () => {
    const onMutate = jest.fn();
    render(<PropertiesPopover {...baseProps} kind="point" currentName="A" currentColor="#1e1e1e" currentDash={0} currentWidth={2} currentFace="o" onMutate={onMutate} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'B' } });
    fireEvent.blur(screen.getByRole('textbox'));
    expect(onMutate).toHaveBeenCalledWith({ attrs: { name: 'B' } });
  });

  it('click Xoá → onMutate({ remove: true }) + onClose', () => {
    const onMutate = jest.fn();
    const onClose = jest.fn();
    render(<PropertiesPopover {...baseProps} kind="point" currentName="A" currentColor="#1e1e1e" currentDash={0} currentWidth={2} currentFace="o" onMutate={onMutate} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /Xo[aá]/i }));
    expect(onMutate).toHaveBeenCalledWith({ remove: true });
    expect(onClose).toHaveBeenCalled();
  });

  it('Esc đóng', () => {
    const onClose = jest.fn();
    render(<PropertiesPopover {...baseProps} kind="line" currentColor="#1e1e1e" currentDash={0} currentWidth={2} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('line: không có input tên, có style dash', () => {
    render(<PropertiesPopover {...baseProps} kind="line" currentColor="#1e1e1e" currentDash={0} currentWidth={2} />);
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByRole('button', { name: /Ki[eể]u n[eé]t đứt/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run, expect fail**

`npm test -- PropertiesPopover` → FAIL.

- [ ] **Step 3: Implement**

`src/stamp/PropertiesPopover.tsx`:
```tsx
'use client';
import React, { useEffect, useRef, useState } from 'react';
import { STROKE_PALETTE } from './excalidrawPalette';

export type ObjKind = 'point' | 'line' | 'circle';
export type PointFace = 'o' | 'circle' | 'cross' | 'plus';

export interface PropertyPatch {
  attrs?: Record<string, unknown>;
  remove?: boolean;
}

interface CommonProps {
  anchor: { x: number; y: number };
  onClose: () => void;
  onMutate: (patch: PropertyPatch) => void;
  isDark?: boolean;
}

interface PointProps extends CommonProps {
  kind: 'point';
  currentName: string;
  currentColor: string;
  currentDash: number;
  currentWidth: number;
  currentFace: PointFace;
}

interface LineOrCircleProps extends CommonProps {
  kind: 'line' | 'circle';
  currentColor: string;
  currentDash: number;
  currentWidth: number;
}

type Props = PointProps | LineOrCircleProps;

const DASH_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 0, label: 'Nét liền' },
  { value: 2, label: 'Nét đứt' },
  { value: 1, label: 'Nét chấm' },
];

const WIDTH_OPTIONS = [1, 2, 3];

const FACE_OPTIONS: Array<{ value: PointFace; symbol: string }> = [
  { value: 'o', symbol: '●' },
  { value: 'circle', symbol: '◯' },
  { value: 'cross', symbol: '✕' },
  { value: 'plus', symbol: '✚' },
];

export const PropertiesPopover: React.FC<Props> = (props) => {
  const { anchor, onClose, onMutate, isDark } = props;
  const rootRef = useRef<HTMLDivElement>(null);

  // Local state cho name (point only) — commit on blur / enter
  const [name, setName] = useState<string>(props.kind === 'point' ? props.currentName : '');

  // Esc + click outside
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    };
    const onMouseDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener('keydown', onKey);
    // capture để bắt trước handlers khác
    document.addEventListener('mousedown', onMouseDown, { capture: true });
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onMouseDown, { capture: true } as EventListenerOptions);
    };
  }, [onClose]);

  const pickColor = (c: string) => {
    onMutate({ attrs: { strokeColor: c, fillColor: props.kind === 'circle' ? 'none' : c, color: c } });
  };
  const pickDash = (d: number) => onMutate({ attrs: { dash: d } });
  const pickWidth = (w: number) => onMutate({ attrs: { strokeWidth: w } });
  const pickFace = (f: PointFace) => onMutate({ attrs: { face: f } });
  const commitName = () => {
    if (props.kind !== 'point') return;
    if (name && name !== props.currentName) onMutate({ attrs: { name } });
  };
  const doDelete = () => { onMutate({ remove: true }); onClose(); };

  return (
    <div
      ref={rootRef}
      data-stamp-area="true"
      className={`${isDark ? 'theme--dark ' : ''}fixed z-[60] flex w-[220px] flex-col gap-3 rounded-lg border border-slate-300 bg-white p-3 shadow-2xl ring-1 ring-black/5`}
      style={{ left: anchor.x, top: anchor.y }}
      role="dialog"
      aria-label="Thuộc tính đối tượng"
    >
      {/* Màu */}
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-medium text-slate-500">Màu</span>
        <div className="flex flex-wrap gap-1">
          {STROKE_PALETTE.map((c) => (
            <button
              key={c}
              aria-label={`Màu ${c}`}
              onClick={() => pickColor(c)}
              className={`h-6 w-6 rounded border ${props.currentColor === c ? 'border-emerald-500 ring-2 ring-emerald-300' : 'border-slate-200'}`}
              style={{ background: c }}
            />
          ))}
        </div>
      </div>

      {/* Tên — chỉ cho point */}
      {props.kind === 'point' && (
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-slate-500">Tên</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitName(); } }}
            className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800"
          />
        </div>
      )}

      {/* Style */}
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-medium text-slate-500">Kiểu</span>
        {props.kind === 'point' ? (
          <div className="flex gap-1">
            {FACE_OPTIONS.map((f) => (
              <button
                key={f.value}
                aria-label={`Hình ${f.value}`}
                onClick={() => pickFace(f.value)}
                className={`h-7 w-7 rounded border text-sm ${props.currentFace === f.value ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 bg-white'}`}
              >
                {f.symbol}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex gap-1">
            {DASH_OPTIONS.map((d) => (
              <button
                key={d.value}
                aria-label={`Kiểu ${d.label.toLowerCase()}`}
                onClick={() => pickDash(d.value)}
                className={`flex-1 rounded border px-1 py-1 text-[11px] ${props.currentDash === d.value ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 bg-white'}`}
              >
                {d.label}
              </button>
            ))}
          </div>
        )}
        <div className="mt-1 flex gap-1">
          {WIDTH_OPTIONS.map((w) => (
            <button
              key={w}
              aria-label={`Độ dày ${w}`}
              onClick={() => pickWidth(w)}
              className={`flex-1 rounded border py-1 ${props.currentWidth === w ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 bg-white'}`}
            >
              <span className="inline-block rounded bg-slate-800" style={{ width: 30, height: w }} />
            </button>
          ))}
        </div>
      </div>

      {/* Xoá */}
      <button
        onClick={doDelete}
        className="rounded border border-rose-300 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
      >
        Xoá
      </button>
    </div>
  );
};
```

- [ ] **Step 4: Run, expect pass**

`npm test -- PropertiesPopover` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stamp/PropertiesPopover.tsx src/stamp/__tests__/PropertiesPopover.test.tsx
git commit -m "feat(stamp): PropertiesPopover màu/tên/style/xoá"
```

---

## Task 6: JSXGraphMiniBoard — mutateObject API

**Files:**
- Modify: `src/stamp/JSXGraphMiniBoard.tsx`

Thêm method `mutateObject` + `selectAtScreen` vào `MiniBoardHandle` để popover có thể gọi.

- [ ] **Step 1: Mở rộng MiniBoardHandle**

`src/stamp/JSXGraphMiniBoard.tsx`, sau interface hiện tại (~line 29-47):
```ts
export interface ObjectSnapshot {
  obj: JxgObj;
  kind: 'point' | 'line' | 'circle';
  // Snapshot thuộc tính hiện tại để popover hiển thị
  name: string;
  color: string;
  dash: number;
  width: number;
  face: 'o' | 'circle' | 'cross' | 'plus';
  screenCoords: { x: number; y: number };  // viewport-relative anchor
}
```

Thêm vào `MiniBoardHandle`:
```ts
  /** Đọc snapshot thuộc tính object (cho popover). */
  snapshotObject: (obj: JxgObj, anchorScreen: { x: number; y: number }) => ObjectSnapshot | null;
  /** Mutate thuộc tính + sync log. */
  mutateObject: (obj: JxgObj, patch: { attrs?: Record<string, unknown>; remove?: boolean }) => void;
  /** Listener selection-from-move-tool. */
  onSelect: (cb: (snap: ObjectSnapshot) => void) => () => void;
```

- [ ] **Step 2: Implement snapshotObject**

Trong component, thêm:
```ts
const snapshotObject = useCallback((obj: JxgObj, anchorScreen: { x: number; y: number }): ObjectSnapshot | null => {
  const k = objKind(obj);
  if (k !== 'point' && k !== 'line' && k !== 'circle') return null;
  const v = obj.visProp ?? {};
  return {
    obj,
    kind: k,
    name: typeof obj.name === 'string' ? obj.name : '',
    color: (v.strokecolor as string) ?? '#1e1e1e',
    dash: typeof v.dash === 'number' ? v.dash : 0,
    width: typeof v.strokewidth === 'number' ? v.strokewidth : 2,
    face: (v.face as ObjectSnapshot['face']) ?? 'o',
    screenCoords: anchorScreen,
  };
}, []);
```

- [ ] **Step 3: Implement mutateObject**

```ts
const mutateObject = useCallback((obj: JxgObj, patch: { attrs?: Record<string, unknown>; remove?: boolean }) => {
  if (!boardRef.current) return;
  if (patch.remove) {
    try { boardRef.current.removeObject(obj); } catch { /* ignore */ }
    const id = localIdOf(obj);
    if (id) {
      creationLogRef.current = creationLogRef.current.filter(e => e.id !== id);
      objMapRef.current.delete(id);
      setHistoryTick(t => t + 1);
    }
    return;
  }
  if (patch.attrs) {
    try { obj.setAttribute(patch.attrs); } catch { /* ignore */ }
    const id = localIdOf(obj);
    if (id) {
      const entry = creationLogRef.current.find(e => e.id === id);
      if (entry) entry.attrs = { ...entry.attrs, ...patch.attrs };
      setHistoryTick(t => t + 1);
    }
  }
  try { boardRef.current.update(); } catch { /* ignore */ }
}, [localIdOf]);
```

- [ ] **Step 4: Selection subscribers + onSelect**

Thêm cạnh `subscribersRef`:
```ts
const selectSubsRef = useRef<Set<(snap: ObjectSnapshot) => void>>(new Set());
const emitSelect = useCallback((snap: ObjectSnapshot) => {
  selectSubsRef.current.forEach(cb => { try { cb(snap); } catch { /* ignore */ } });
}, []);
```

Trong `onReady({...})`:
```ts
snapshotObject,
mutateObject,
onSelect: (cb) => { selectSubsRef.current.add(cb); return () => selectSubsRef.current.delete(cb); },
```

- [ ] **Step 5: Mở rộng on('down') cho Move + click hit**

Trong nhánh `if (t === 'move') return;` ở line 618 cũ, thay bằng logic select-on-click:

```ts
if (t === 'move') {
  // chỉ select khi click không kèm drag — ghi nhận start coords, so sánh ở on('up')
  const sc = screenCoordsOf(e);
  if (!sc) return;
  const [sx, sy] = sc;
  moveDownRef.current = { sx, sy };
  return;
}
```

Khai báo:
```ts
const moveDownRef = useRef<{ sx: number; sy: number } | null>(null);
```

Trong handler `board.on('up')` (thêm mới sau khối on('down')):
```ts
board.on('up', (e: any) => {
  const t = toolRef.current;
  if (t !== 'move') return;
  const start = moveDownRef.current;
  moveDownRef.current = null;
  if (!start) return;
  const sc = screenCoordsOf(e);
  if (!sc) return;
  const [sx, sy] = sc;
  const moved = Math.hypot(sx - start.sx, sy - start.sy);
  if (moved > 4) return;  // drag, không phải click
  const hits = objectsAt(e).filter(o => o !== axisObjsRef.current.x && o !== axisObjsRef.current.y);
  const best = hits.find(o => objKind(o) === 'point') ?? hits[0] ?? findNearestPoint(e, 12);
  if (!best) return;
  // viewport-relative anchor: clientX/Y của pointer event
  const cx = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
  const cy = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
  const snap = snapshotObject(best, { x: cx + 8, y: cy + 8 });
  if (snap) emitSelect(snap);
});
```

- [ ] **Step 6: Run typecheck**

`npm run typecheck` → PASS.

- [ ] **Step 7: Commit**

```bash
git add src/stamp/JSXGraphMiniBoard.tsx
git commit -m "feat(stamp): mutateObject + select-on-click cho Move tool"
```

---

## Task 7: JSXGraphMiniBoard — live preview lifecycle

**Files:**
- Modify: `src/stamp/JSXGraphMiniBoard.tsx`

Phantom point + previewShape, cập nhật theo mouse-move; xoá khi finalize/đổi tool/Esc.

- [ ] **Step 1: Thêm refs + helpers**

Trong component, gần `previewSegRef`:
```ts
const phantomRef = useRef<JxgObj | null>(null);
const previewShapeRef = useRef<JxgObj | null>(null);
const previewRafRef = useRef<number | null>(null);
```

Helper:
```ts
const removePhantom = useCallback(() => {
  const b = boardRef.current;
  if (!b) return;
  if (previewShapeRef.current) { try { b.removeObject(previewShapeRef.current); } catch { /* ignore */ } previewShapeRef.current = null; }
  if (phantomRef.current) { try { b.removeObject(phantomRef.current); } catch { /* ignore */ } phantomRef.current = null; }
}, []);
```

Mở rộng `clearPending`:
```ts
const clearPending = useCallback(() => {
  removePhantom();
  clearPreviewSegs();
  pendingRef.current = [];
  setPendingCount(0);
}, [clearPreviewSegs, removePhantom]);
```

- [ ] **Step 2: buildPreview helper**

```ts
const buildPreview = useCallback((toolDef: ToolDef, picks: JxgObj[], phantom: JxgObj) => {
  const b = boardRef.current;
  if (!b) return null;
  const style = { strokeColor: '#3b82f6', strokeWidth: 1.5, strokeOpacity: 0.65, dash: 2, fixed: true, highlight: false, withLabel: false } as Record<string, unknown>;
  const circStyle = { ...style, fillColor: 'none', fillOpacity: 0 };
  try {
    switch (toolDef.key) {
      case 'segment': case 'midpoint': case 'distance':
        return b.create('segment', [picks[0], phantom], style);
      case 'line':
        return b.create('line', [picks[0], phantom], style);
      case 'ray':
        return b.create('line', [picks[0], phantom], { ...style, straightFirst: false, straightLast: true });
      case 'vector':
        return b.create('arrow', [picks[0], phantom], style);
      case 'circleCenter':
        return b.create('circle', [picks[0], phantom], circStyle);
      case 'circle3':
        if (picks.length === 1) return b.create('circle', [picks[0], phantom], circStyle);
        if (picks.length === 2) return b.create('circumcircle', [picks[0], picks[1], phantom], circStyle);
        return null;
      case 'angle':
        if (picks.length === 1) return b.create('segment', [picks[0], phantom], style);
        if (picks.length === 2) return b.create('angle', [picks[0], picks[1], phantom], { ...style, radius: 1, fillColor: '#22c55e', fillOpacity: 0.15 });
        return null;
      case 'perpBisector':
        return b.create('segment', [picks[0], phantom], style);
      case 'angleBisector':
        if (picks.length === 1) return b.create('segment', [picks[0], phantom], style);
        if (picks.length === 2) return b.create('bisector', [picks[0], picks[1], phantom], style);
        return null;
      case 'perpendicular': case 'parallel': case 'tangent':
        // Preview chỉ render khi đã có line/circle pick → dựng đường mẫu qua phantom
        if (picks.length === 1) {
          const k = objKind(picks[0]);
          if (k === 'line' && toolDef.key !== 'tangent') {
            return b.create(toolDef.key, [picks[0], phantom], style);
          }
          if (k === 'circle' && toolDef.key === 'tangent') {
            const glider = b.create('glider', [phantom.X(), phantom.Y(), picks[0]], { visible: false, withLabel: false });
            return b.create('tangent', [glider], style);
          }
        }
        return null;
      default:
        return null;
    }
  } catch {
    return null;
  }
}, []);
```

- [ ] **Step 3: Đồng bộ pending → preview**

Helper:
```ts
const refreshPreview = useCallback(() => {
  const b = boardRef.current;
  if (!b) return;
  // Tear down
  if (previewShapeRef.current) { try { b.removeObject(previewShapeRef.current); } catch { /* ignore */ } previewShapeRef.current = null; }
  const t = toolRef.current;
  const toolDef = TOOLS.find(td => td.key === t);
  if (!toolDef) return;
  const picks = pendingRef.current;
  if (picks.length === 0 || toolDef.needs <= 0) return;
  if (picks.length >= toolDef.needs) return;  // sắp finalize, không preview
  // Tạo phantom nếu chưa có
  if (!phantomRef.current) {
    try {
      phantomRef.current = b.create('point', [0, 0], { visible: false, fixed: true, withLabel: false, name: '' });
    } catch { return; }
  }
  previewShapeRef.current = buildPreview(toolDef, picks, phantomRef.current);
}, [buildPreview]);
```

Trong handler on('down'), sau mọi nhánh `pendingRef.current.push(pick)` + `setPendingCount(...)` (không kể nhánh finalize ngay), gọi `refreshPreview()`.

Trong `clearPending`, `handleToolChange`, `undoLast`, `finalize`-callsite: đã clear pending → preview sẽ tự dọn ở `refreshPreview` lần sau, nhưng phantom giữ lại — `clearPending` đã gọi `removePhantom()` (Step 1).

- [ ] **Step 4: Cập nhật phantom theo mouse-move**

Đăng ký trong khối `(async () => { ... })()` sau `board.on('down', ...)`:

```ts
board.on('move', (e: any) => {
  const ph = phantomRef.current;
  if (!ph || !boardRef.current) return;
  if (previewRafRef.current != null) return;
  previewRafRef.current = requestAnimationFrame(() => {
    previewRafRef.current = null;
    try {
      const coords = boardRef.current!.getUsrCoordsOfMouse(e);
      // setPositionDirectly: import từ JSXGraph
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const JXG: any = jxgRef.current;
      ph.setPositionDirectly(JXG.COORDS_BY_USER, [coords[0], coords[1]]);
      boardRef.current!.update();
    } catch { /* ignore */ }
  });
});
```

- [ ] **Step 5: Esc handler**

Mở rộng useEffect Cmd/Ctrl+Z hiện tại để thêm Esc:
```ts
useEffect(() => {
  const onKey = (e: KeyboardEvent) => {
    const ae = document.activeElement as HTMLElement | null;
    const inField = !!(ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable));
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      if (inField) return;
      e.preventDefault(); e.stopPropagation();
      undoLastRef.current();
      return;
    }
    if (e.key === 'Escape' && !inField) {
      if (pendingRef.current.length > 0) {
        e.preventDefault(); e.stopPropagation();
        clearPendingRef.current();
      }
    }
  };
  window.addEventListener('keydown', onKey, { capture: true });
  return () => window.removeEventListener('keydown', onKey, { capture: true });
}, []);
const clearPendingRef = useRef(clearPending);
clearPendingRef.current = clearPending;
```

- [ ] **Step 6: Test live preview lifecycle**

Trước hết đọc `src/stamp/__tests__/JSXGraphMiniBoard.test.tsx` để xem mock pattern hiện tại (Jest mock `jsxgraph`).

Nếu mock board hiện đã capture các `create` call thành một spy (kiểm tra: `grep -n "jest.mock\|createSpy\|board.create" src/stamp/__tests__/JSXGraphMiniBoard.test.tsx`), thêm test sau cuối file:

```ts
it('live preview: tool segment + 1 click → phantom point + preview segment được create', () => {
  // Giả định mock jsxgraph đã capture board.create calls vào array `boardCreateCalls`.
  // Setup tool = 'segment', dispatch pointer-down 1 lần ở (5, 5).
  // Sau click 1: kỳ vọng có ít nhất 1 call create('point', ..., expect.objectContaining({ visible: false }))
  //   và 1 call create('segment', ..., expect.objectContaining({ dash: 2 }))
  // Tham khảo các test khác trong file để biết cách dispatch click và đọc spy.
});
```

Nếu mock hiện không capture `board.create` (chỉ là stub trả về `{}`), **bỏ test này** và ghi vào "Manual smoke" của Task 14 step 3 (đã có checklist). Lý do skip ghi rõ trong commit message: "test: skip preview lifecycle test (jsxgraph mock không capture create calls — cover bằng manual smoke)".

Manual smoke ngay sau Step 8: chạy `cd playground && npm run dev`, chọn segment, click 1 lần, xác nhận preview line hiện và bám chuột; nhấn Esc → preview biến mất.

- [ ] **Step 7: Typecheck + manual smoke**

```bash
npm run typecheck
```
Sau đó chạy playground:
```bash
cd playground && npm run dev
```
Kiểm: segment, line, ray, vector, circleCenter, circle3 — mỗi cái có preview bám chuột sau click đầu.

- [ ] **Step 8: Commit**

```bash
git add src/stamp/JSXGraphMiniBoard.tsx src/stamp/__tests__/JSXGraphMiniBoard.test.tsx
git commit -m "feat(stamp): live preview bám chuột cho tool 2-3 click"
```

---

## Task 8: serializeBoard — transform entry support

**Files:**
- Modify: `src/stamp/serializeBoard.ts`
- Modify: `src/stamp/__tests__/serializeBoard.test.ts` (tạo nếu chưa có)

Cho phép log entry kiểu `{ type: 'transform', args: [...refs], attrs: { type: 'rotate', ... } }` replay đúng.

- [ ] **Step 1: Test**

`src/stamp/__tests__/serializeBoard.test.ts`:
```ts
import { deserializeIntoBoard, type SerializedBoard } from '../serializeBoard';

describe('deserializeIntoBoard với transform entry', () => {
  it('transform entry tạo object trong idMap để point dùng làm arg', () => {
    const created: Array<{ type: string; args: unknown[]; attrs: Record<string, unknown> }> = [];
    const board = {
      getBoundingBox: () => [-10, 10, 10, -10] as [number, number, number, number],
      create: (type: string, args: unknown[], attrs: Record<string, unknown>) => {
        const obj = { __mock: type, args, attrs };
        created.push({ type, args, attrs });
        return obj;
      },
    };
    const serialized: SerializedBoard = {
      bbox: [-10, 10, 10, -10],
      elements: [
        { id: 'j0', type: 'point', args: [0, 0], attrs: { name: 'A' } },
        { id: 'j1', type: 'transform', args: ['j0'], attrs: { type: 'rotate', _angle: 1.5708 } },
        { id: 'j2', type: 'point', args: ['j1', 'j0'], attrs: { name: "A'" } },
      ],
    };
    deserializeIntoBoard(board, serialized);
    expect(created).toHaveLength(3);
    expect(created[1].type).toBe('transform');
    // point j2 args resolved về object j1 + j0 (không còn string)
    expect(typeof created[2].args[0]).toBe('object');
    expect(typeof created[2].args[1]).toBe('object');
  });
});
```

- [ ] **Step 2: Run, expect pass (hoặc fail nếu hành vi sai)**

`npm test -- serializeBoard` → Nếu code hiện đã đủ generic (create + idMap), test có thể PASS ngay. Nếu FAIL, sửa.

- [ ] **Step 3: Cập nhật serializeBoard nếu cần**

File hiện tại đã generic (`create(type, resolvedArgs, attrs)`) → không đổi code. Chỉ thêm comment ở header file giải thích `type === 'transform'`:

```ts
// type === 'transform': args là [refs đến điểm/đường], attrs là { type: 'translate'|'rotate'|'reflect'|'scale', ... }.
// Object trả về được đăng ký vào idMap như mọi element khác để point/line phụ thuộc reference được.
```

- [ ] **Step 4: Commit**

```bash
git add src/stamp/serializeBoard.ts src/stamp/__tests__/serializeBoard.test.ts
git commit -m "test(stamp): serializeBoard replay transform entry + comment doc"
```

---

## Task 9: JSXGraphMiniBoard — transform tool dispatch

**Files:**
- Modify: `src/stamp/JSXGraphMiniBoard.tsx`

5 tool mới + finalize logic dùng `transforms.ts` + emit param popover khi cần.

- [ ] **Step 1: Mở rộng GeomTool + TOOLS**

Top of file:
```ts
export type GeomTool =
  | 'move' | 'point' | 'midpoint'
  | 'segment' | 'line' | 'ray' | 'vector'
  | 'perpendicular' | 'parallel' | 'perpBisector' | 'angleBisector'
  | 'polygon' | 'circleCenter' | 'circle3' | 'tangent'
  | 'angle' | 'distance' | 'area'
  | 'toggleLabel' | 'toggleVisible' | 'delete'
  | 'translate' | 'rotate' | 'reflectLine' | 'reflectPoint' | 'dilate';
```

Trong `ToolDef['group']` thêm `'transform'`.

Thêm icon tối giản trong `Icon`:
```ts
translate: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4 L20 20"/><polygon points="14,4 20,4 20,10" fill="currentColor"/><circle cx="5" cy="5" r="1.5" fill="currentColor"/></svg>),
rotate: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12 A8 8 0 1 1 12 20"/><polyline points="4,9 4,13 8,13"/></svg>),
reflectLine: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="2" x2="12" y2="22" strokeDasharray="3 2"/><polygon points="4,6 9,12 4,18" fill="currentColor"/><polygon points="20,6 15,12 20,18" fill="currentColor"/></svg>),
reflectPoint: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="5" cy="5" r="1.6" fill="currentColor"/><circle cx="19" cy="19" r="1.6" fill="currentColor"/><line x1="5" y1="5" x2="19" y2="19" strokeDasharray="2 2"/></svg>),
dilate: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1.5" fill="currentColor"/><polygon points="6,18 18,18 12,6" fillOpacity="0.1" fill="currentColor"/><polygon points="9,15 15,15 12,11" fill="currentColor"/></svg>),
```

Append vào `TOOLS`:
```ts
{ key: 'translate', label: 'Phép tịnh tiến', hint: 'Click object → 2 điểm tạo vector', icon: Icon.translate, group: 'transform', needs: 3, accepts: ['any', 'point', 'point'] },
{ key: 'rotate', label: 'Quay đối tượng', hint: 'Click object → tâm quay → nhập góc', icon: Icon.rotate, group: 'transform', needs: 2, accepts: ['any', 'point'] },
{ key: 'reflectLine', label: 'Đối xứng qua đường thẳng', hint: 'Click object → đường thẳng', icon: Icon.reflectLine, group: 'transform', needs: 2, accepts: ['any', 'line'] },
{ key: 'reflectPoint', label: 'Đối xứng qua điểm', hint: 'Click object → tâm đối xứng', icon: Icon.reflectPoint, group: 'transform', needs: 2, accepts: ['any', 'point'] },
{ key: 'dilate', label: 'Phép vị tự', hint: 'Click object → tâm → nhập tỷ số k', icon: Icon.dilate, group: 'transform', needs: 2, accepts: ['any', 'point'] },
```

`GROUP_LABELS.transform = 'Phép biến hình';`.

- [ ] **Step 2: Pending transform state**

Sau `objMapRef`:
```ts
interface PendingTransform {
  tool: 'rotate' | 'dilate';
  source: JxgObj;
  center: JxgObj;
  anchorScreen: { x: number; y: number };
}
const pendingTransformRef = useRef<PendingTransform | null>(null);
const transformSubsRef = useRef<Set<(p: PendingTransform | null) => void>>(new Set());
const emitTransform = useCallback((p: PendingTransform | null) => {
  transformSubsRef.current.forEach(cb => { try { cb(p); } catch { /* ignore */ } });
}, []);
```

Mở rộng `MiniBoardHandle`:
```ts
onTransformParam: (cb: (p: { tool: 'rotate' | 'dilate'; anchor: { x: number; y: number } } | null) => void) => () => void;
confirmTransformParam: (value: number) => void;
cancelTransformParam: () => void;
```

- [ ] **Step 3: Finalize transform**

Import:
```ts
import { getDefiningPoints, buildTransformSpec, type DefKind } from './transforms';
```

Hàm `finalizeTransformCreate`:
```ts
const finalizeTransformCreate = useCallback((spec: { params: unknown[]; attrs: { type: string } }, source: JxgObj) => {
  if (!boardRef.current) return;
  const def = getDefiningPoints(source);
  if (!def) { flashWarn('Không thể biến đổi đối tượng này'); return; }

  // 1. Log transform entry — args = id references đến điểm/đường tham số.
  // Với rotate/scale ta cần lưu center ref + giá trị số → đặt args = refs, attrs = { type, _scalar }
  // Để giữ schema args = unknown[], ta lưu các số literal trong args và refs cũng trong args.
  // Replay đọc args đúng thứ tự theo attrs.type.
  const transformLogArgs: unknown[] = spec.params.map((p) => {
    if (typeof p === 'function') return p;  // dx/dy callback — không serialize được, accept loss khi reload (xem note)
    // Reference đến object → lấy localId nếu có
    const id = localIdOf(p);
    return id ?? p;
  });
  const tId = nextLocalId();
  const transformObj = boardRef.current.create('transform', spec.params, spec.attrs);
  creationLogRef.current.push({ id: tId, type: 'transform', args: transformLogArgs, attrs: spec.attrs as Record<string, unknown> });
  objMapRef.current.set(tId, transformObj);

  // 2. Transform từng defining point — log mỗi point.
  const transformedPoints: JxgObj[] = def.points.map((src) => {
    const srcId = localIdOf(src);
    const id = nextLocalId();
    const srcName = typeof src.name === 'string' ? src.name : '';
    const newName = srcName ? `${srcName}'` : nextLabel();
    const obj = boardRef.current!.create('point', [transformObj, src], { name: newName, size: 3, color: '#0ea5e9', strokeColor: '#0ea5e9', fillColor: '#0ea5e9' });
    creationLogRef.current.push({ id, type: 'point', args: [tId, srcId ?? src], attrs: { name: newName, size: 3, color: '#0ea5e9', strokeColor: '#0ea5e9', fillColor: '#0ea5e9' } });
    objMapRef.current.set(id, obj);
    return obj;
  });

  // 3. Tạo object cùng kind từ transformedPoints
  const baseStyle = { ...def.attrs, strokeColor: '#0ea5e9' };
  const strokeOnly = { ...baseStyle, fillColor: 'none', fillOpacity: 0 };
  const ids = transformedPoints.map(p => localIdOf(p)).filter((s): s is string => !!s);
  switch (def.kind) {
    case 'point': /* nothing — đã tạo */ break;
    case 'segment': create('segment', ids, baseStyle); break;
    case 'line': create('line', ids, baseStyle); break;
    case 'arrow': create('arrow', ids, baseStyle); break;
    case 'circleCenter': create('circle', ids, strokeOnly); break;
    case 'circle3': create('circumcircle', ids, strokeOnly); break;
  }
  setHistoryTick(t => t + 1);
}, [create, flashWarn, localIdOf, nextLabel, nextLocalId]);
```

> **Note:** `buildTransformSpec` cho `translate` đã dùng literal `[dx, dy]` (Task 3) thay vì callback, nên params serialize qua `JSON.stringify` an toàn. Trade-off: transformed object không cập nhật khi user kéo điểm vector A/B sau đó — chấp nhận.

- [ ] **Step 4: on('down') nhánh transform**

Tích hợp vào on('down'). Trong logic Multi-click branch hiện có, các tool transform đã match `toolDef.accepts` → strict-flexible logic xử lý đúng pick. Sau khi push pick cuối:

```ts
if (pendingRef.current.length >= toolDef.needs) {
  // Với rotate/dilate: lưu pending param, emit popover, KHÔNG finalize ngay
  if (toolDef.key === 'rotate' || toolDef.key === 'dilate') {
    const source = pendingRef.current[0];
    const center = pendingRef.current[1];
    const cx = (e.clientX ?? 0) + 8;
    const cy = (e.clientY ?? 0) + 8;
    pendingTransformRef.current = { tool: toolDef.key, source, center, anchorScreen: { x: cx, y: cy } };
    emitTransform({ tool: toolDef.key, anchor: pendingTransformRef.current.anchorScreen } as any);
    return;
  }
  if (toolDef.key === 'translate' || toolDef.key === 'reflectLine' || toolDef.key === 'reflectPoint') {
    const source = pendingRef.current[0];
    let spec;
    if (toolDef.key === 'translate') {
      spec = buildTransformSpec({ kind: 'translate', vectorPoints: [pendingRef.current[1], pendingRef.current[2]] });
    } else if (toolDef.key === 'reflectLine') {
      spec = buildTransformSpec({ kind: 'reflectLine', line: pendingRef.current[1] });
    } else {
      spec = buildTransformSpec({ kind: 'reflectPoint', center: pendingRef.current[1] });
    }
    finalizeTransformCreate(spec, source);
    clearPending();
    return;
  }
  // ... default branch
  finalize(toolDef, pendingRef.current);
  clearPending();
}
```

- [ ] **Step 5: confirm / cancel param popover**

Trong `MiniBoardHandle` exposed object (đoạn `onReady({...})`):

```ts
onTransformParam: (cb) => { transformSubsRef.current.add(cb); return () => transformSubsRef.current.delete(cb); },
confirmTransformParam: (value: number) => {
  const p = pendingTransformRef.current;
  if (!p) return;
  const spec = p.tool === 'rotate'
    ? buildTransformSpec({ kind: 'rotate', center: p.center, angleDeg: value })
    : buildTransformSpec({ kind: 'dilate', center: p.center, k: value });
  finalizeTransformCreate(spec, p.source);
  pendingTransformRef.current = null;
  emitTransform(null);
  clearPending();
},
cancelTransformParam: () => {
  pendingTransformRef.current = null;
  emitTransform(null);
  clearPending();
},
```

- [ ] **Step 6: Typecheck**

`npm run typecheck` → PASS. Sửa các path mismatch nếu có.

- [ ] **Step 7: Commit**

```bash
git add src/stamp/JSXGraphMiniBoard.tsx src/stamp/transforms.ts src/stamp/__tests__/transforms.test.ts
git commit -m "feat(stamp): 5 phép biến hình (translate/rotate/reflect/dilate)"
```

---

## Task 10: GeometryEditorPanel — wire popovers + isDark

**Files:**
- Modify: `src/stamp/GeometryEditorPanel.tsx`

- [ ] **Step 1: Mở rộng Props**

```ts
interface Props {
  initialState: SerializedBoard | null;
  onInsert: (jsonState: string, svgString: string) => void;
  onClose: () => void;
  withLeftPanel?: boolean;
  onStateChange?: (state: GeomBoardState) => void;
  isDark?: boolean;  // ← mới
}
```

- [ ] **Step 2: State cho popover**

```ts
const [propsPopover, setPropsPopover] = useState<ObjectSnapshot | null>(null);
const [transformPopover, setTransformPopover] = useState<{ tool: 'rotate' | 'dilate'; anchor: { x: number; y: number } } | null>(null);
```

(`ObjectSnapshot` import từ `./JSXGraphMiniBoard`.)

- [ ] **Step 3: Subscribe khi handle ready**

Trong `handleReady`:
```ts
const unsubSel = h.onSelect((snap) => setPropsPopover(snap));
const unsubT = h.onTransformParam((p) => setTransformPopover(p));
// stack vào ref cleanup nếu cần (component unmount sẽ tự dọn khi board freeBoard)
```

- [ ] **Step 4: Render popovers**

Trong JSX, sau `<JSXGraphMiniBoard />`:
```tsx
{propsPopover && (
  <PropertiesPopover
    kind={propsPopover.kind}
    anchor={propsPopover.screenCoords}
    isDark={isDark}
    {...(propsPopover.kind === 'point' ? { currentName: propsPopover.name } : {})}
    currentColor={propsPopover.color}
    currentDash={propsPopover.dash}
    currentWidth={propsPopover.width}
    {...(propsPopover.kind === 'point' ? { currentFace: propsPopover.face } : {})}
    onClose={() => setPropsPopover(null)}
    onMutate={(patch) => {
      handleRef.current?.mutateObject(propsPopover.obj, patch);
      if (patch.remove) setPropsPopover(null);
    }}
  />
)}

{transformPopover && (
  <TransformParamPopover
    kind={transformPopover.tool}
    anchor={transformPopover.anchor}
    defaultValue={transformPopover.tool === 'rotate' ? 90 : 2}
    isDark={isDark}
    onConfirm={(v) => { handleRef.current?.confirmTransformParam(v); setTransformPopover(null); }}
    onCancel={() => { handleRef.current?.cancelTransformParam(); setTransformPopover(null); }}
  />
)}
```

Imports:
```ts
import { PropertiesPopover } from './PropertiesPopover';
import { TransformParamPopover } from './TransformParamPopover';
import type { ObjectSnapshot } from './JSXGraphMiniBoard';
```

- [ ] **Step 5: Theme--dark trên dialog root**

Trong dialog `<div role="dialog" ...>` thêm `${isDark ? 'theme--dark ' : ''}` vào className để header/footer cũng đổi màu.

- [ ] **Step 6: Typecheck + test**

```bash
npm run typecheck
npm test -- GeometryEditorPanel  # nếu test hiện có
```

- [ ] **Step 7: Commit**

```bash
git add src/stamp/GeometryEditorPanel.tsx
git commit -m "feat(stamp): GeometryEditorPanel render popovers + isDark"
```

---

## Task 11: StampLeftPanel — group "Phép biến hình" + isDark

**Files:**
- Modify: `src/stamp/StampLeftPanel.tsx`

- [ ] **Step 1: Đọc file hiện tại để hiểu pattern**

```bash
cat src/stamp/StampLeftPanel.tsx | head -120
```

Tìm chỗ render `TOOLS.filter(t => t.group === 'X')`. Vì `TOOLS` đã thêm 5 tool transform với `group: 'transform'`, panel auto pick lên nếu loop qua `GROUP_LABELS`. **Verify:** đọc đoạn loop render; nếu hard-code list group, thêm `'transform'` vào sau `'edit'`.

- [ ] **Step 2: Thêm prop isDark**

```ts
interface Props {
  // ... existing
  isDark?: boolean;
}
```

Áp `${isDark ? 'theme--dark ' : ''}` lên root.

- [ ] **Step 3: Commit**

```bash
git add src/stamp/StampLeftPanel.tsx
git commit -m "feat(stamp): hiển thị nhóm Phép biến hình + isDark"
```

---

## Task 12: ExcalidrawWhiteboardView — propagate isDarkTheme

**Files:**
- Modify: `src/ExcalidrawWhiteboardView.tsx`

- [ ] **Step 1: Tìm chỗ render GeometryEditorPanel**

```bash
grep -n "GeometryEditorPanel\|StampLeftPanel" src/ExcalidrawWhiteboardView.tsx
```

- [ ] **Step 2: Pass isDark prop**

Ở callsite `<GeometryEditorPanel ... />` thêm `isDark={isDarkTheme}`. Tương tự cho `<StampLeftPanel ... />` nếu có.

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 4: Commit**

```bash
git add src/ExcalidrawWhiteboardView.tsx
git commit -m "feat(stamp): forward isDarkTheme xuống Geometry editor + LeftPanel"
```

---

## Task 13: stamp.css — dark mode audit cho UI mới

**Files:**
- Modify: `src/stamp/stamp.css`

- [ ] **Step 1: Render manually dark + light, list classes thiếu rule**

Chạy `cd playground && npm run dev`, toggle Excalidraw theme = dark, mở Geometry editor, mở properties popover + transform param popover. Note class nào còn màu sai.

Class điển hình cần kiểm:
- `bg-emerald-50` / `bg-rose-50` (đã có)
- `bg-emerald-100` (hover swatch active) — có thể chưa có
- `border-emerald-500`, `ring-emerald-300` — viền active của swatch
- `bg-rose-50`, `border-rose-300`, `text-rose-700`, `hover:bg-rose-100` (đã có một phần)
- Header gradient của Geometry panel `bg-gradient-to-r from-emerald-600 to-teal-600` — trong dark cần dimmer

- [ ] **Step 2: Bổ sung CSS rules**

Append vào `src/stamp/stamp.css`:
```css
/* --- Popover & swatch active states --- */
.theme--dark [data-stamp-area="true"] .bg-emerald-100 { background-color: rgb(6 78 59); }
.theme--dark [data-stamp-area="true"] .border-emerald-500 { border-color: rgb(52 211 153); }
.theme--dark [data-stamp-area="true"] .ring-emerald-300 { --tw-ring-color: rgb(110 231 183); }
.theme--dark [data-stamp-area="true"] .border-rose-300 { border-color: rgb(190 18 60); }
.theme--dark [data-stamp-area="true"] .hover\:bg-rose-100:hover { background-color: rgb(127 29 29); }

/* --- Geometry header dimmer trong dark --- */
.theme--dark [data-stamp-area="true"] .bg-gradient-to-r.from-emerald-600 {
  background-image: linear-gradient(to right, rgb(6 95 70), rgb(15 76 76));
}
.theme--dark [data-stamp-area="true"] .bg-emerald-600 { background-color: rgb(6 95 70); }
.theme--dark [data-stamp-area="true"] .hover\:bg-emerald-700:hover { background-color: rgb(4 120 87); }
```

- [ ] **Step 3: Manual recheck**

Toggle dark; popover swatch active ring + rose delete button + emerald header phải đọc được, không "burn".

- [ ] **Step 4: Commit**

```bash
git add src/stamp/stamp.css
git commit -m "style(stamp): bổ sung dark rule cho popover + emerald/rose states"
```

---

## Task 14: Build + release

**Files:**
- Build output: `dist/`
- `package.json` version bump

- [ ] **Step 1: Full test + typecheck**

```bash
npm run typecheck && npm test
```
Expected: pass cả hai.

- [ ] **Step 2: Build**

```bash
npm run build
```
Expected: `dist/` được tái sinh, có inject "use client".

- [ ] **Step 3: Manual smoke ở playground**

```bash
cd playground && npm install --force && npm run dev
```

Checklist:
- [ ] Segment / line / ray / vector preview bám chuột sau click 1
- [ ] Circle (center+điểm) preview bám chuột; circle3 preview sau 2 clicks
- [ ] Click point/line/circle ở Move tool → popover xuất hiện
- [ ] Đổi màu point từ palette Excalidraw — màu áp dụng + serialize OK (reload reproduce)
- [ ] Đổi tên point qua input
- [ ] Đổi nét đứt / độ dày
- [ ] Xoá object từ popover
- [ ] 5 phép biến hình: pick object → pick element bổ sung (+ nhập góc/k với rotate/dilate) → object biến đổi xuất hiện
- [ ] Reload từ sessionStorage: object transformed (translate literal, rotate, reflectLine, reflectPoint, dilate) đều replay đúng vị trí
- [ ] Toggle dark mode trong Excalidraw → panel + popover đổi sang theme dark, đọc được, canvas vẫn trắng

- [ ] **Step 4: Bump version + commit dist**

```bash
git add dist/
git commit -m "build: dist v0.3.0"
npm version minor  # 0.2.x → 0.3.0
git push --follow-tags
```

---

## Self-review notes

- **Spec coverage:**
  - §3 Live preview → Task 7
  - §4 Properties popover → Task 5 + 6 (mutate API) + 10 (wire)
  - §5 Transforms → Task 2, 3, 8 (serialize), 9 (dispatch), 10 (popover)
  - §6 Dark mode → Task 10, 11, 12, 13
  - §7 Tests → mỗi Task có test riêng (1,2,3,4,5,8); JSXGraphMiniBoard test giới hạn ở smoke (Task 7 step 6 ghi rõ)
- **Translate serialize trade-off** ghi rõ trong Task 9 step 3 (literal thay vì callback).
- **Type consistency:** `ObjectSnapshot`, `PropertyPatch`, `PendingTransform`, `DefiningPointsResult`, `TransformInput` đều dùng đúng tên xuyên suốt plan.
- **Frequent commits:** mỗi task = 1 commit (Task 9 có thể là 2 commit nhỏ — split nếu thấy step 3+4 quá nặng).
