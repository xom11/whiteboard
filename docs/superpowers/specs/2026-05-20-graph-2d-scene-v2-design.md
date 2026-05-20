# Graph 2D — Scene v2 Refactor (GeoGebra-Graphing Aligned)

> Spec mirror cấu trúc `2026-05-20-scene-v2-design.md` + `2026-05-20-2d-object-tab-design.md`. Mục đích: rebuild `src/stamps/graph-2d/` hoàn toàn theo conventions Scene v2 đã áp dụng cho geometry-2d/3d, thêm tool/kind tương đương GeoGebra Graphing core, đồng nhất shortcut + undo + persistence.

## 1. Bối cảnh

`@xom11/whiteboard` hiện có 4 stamp: geometry-2d, geometry-3d, latex, graph-2d. Sau ba phase Scene v2, **geometry-2d/3d** đã dùng `core/scene/` (immutable store + immer reducer + kinds registry + JxgRenderer + ObjectListPanel + LeftPanelShell + MobileToolDrawer + useSceneStore + useToolStateMachine + undo/redo + tab "Công cụ"/"Đối tượng"). **graph-2d vẫn ở pattern cũ** (`SerializedGraph` riêng, parser/render trực tiếp, không có store/undo unified, LeftPanel không có tab "Đối tượng", chưa wire MobileToolDrawer).

Việc này gây drift về:
- **Code**: 2 pattern song song (data model, persistence, render adapter).
- **UX**: 2 stamp tab Đối tượng (geo) còn graph thì column algebra cũ.
- **Maintenance**: muốn thêm tool/object cho graph phải reinvent toàn bộ pattern.
- **Cơ hội**: GeoGebra Graphing cho phép vẽ geo primitives (point/segment/line) NGAY trên graph plane — pattern Scene v2 (kinds registry) hỗ trợ điều này thẳng.

User intent: refactor graph-2d sang Scene v2 unified, mở rộng tool/kind theo GeoGebra Graphing core, đồng nhất shortcut/undo/persistence.

## 2. Goals / Non-goals

### Goals

- G1. **Xoá `src/stamps/graph-2d/` cũ** và rebuild theo Scene v2 conventions. Không backward-compat với customData v1 (graph-2d đang ở `EXPERIMENTAL_STAMPS`, chưa ship prod).
- G2. **Store unified** với `meta.domain='graph2d'`. Reuse `core/scene/` infra (store, reducer, registry, JxgRenderer).
- G3. **Thêm 7 kinds mới** vào `core/scene/kinds/`: `function2d`, `parameter`, `pointOnCurve`, `tangent2d`, `extremum2d`, `root2d`, `slope2d`. Reuse 8 kinds 2D có sẵn (point, segment, line, ray, vector, circle, polygon, intersection).
- G4. **Tool palette 12 tool** mirror GeoGebra Graphing core: Move, Point, Slider, PointOnCurve, Intersect, Tangent, Slope, Extremum, Root, Segment, Line, Polygon.
- G5. **`useToolStateMachine` riêng** cho graph-2d (12 tool), copy pattern từ geometry-2d.
- G6. **Inline expression/slider editing** trong tab Đối tượng (per-kind row renderer) — match cảm giác GeoGebra algebra column.
- G7. **JxgRenderer extension**: render 7 kinds mới qua switch case trong `kind.render(obj, ctx)`. 1 renderer cho cả geometry và graph.
- G8. **Undo/redo unified** qua store history. Ctrl/Cmd+Z trong editor undo expression edit, slider change, add/delete object — như geometry.
- G9. **Persistence v2**: `Graph2DCustomData.version=2`, `sceneJson` = stringified Scene v2 state. SVG export pattern P3 (offscreen JxgRenderer → serialize) đồng nhất geometry-2d.
- G10. **Mobile**: LeftPanel dùng `LeftPanelShell` + `MobileToolDrawer` với tab "Công cụ"/"Đối tượng" (như geometry-2d/3d).

### Non-goals

- N1. Backward compatibility cho graph-2d v1 (SerializedGraph) — user xác nhận drop hoàn toàn.
- N2. Best-fit / regression / curve fitting (GeoGebra Max scope) — defer.
- N3. Function inspector table — defer.
- N4. Text annotation kind, image overlay kind — defer.
- N5. LaTeX label trên axis / function name — defer (chỉ basic identifier name).
- N6. Excalidraw 0.19 (vẫn rc) — peer dep giữ ^0.18.1.
- N7. Immer 10→11 (major) — tách chore PR riêng nếu cần.
- N8. Implicit functions (`x^2 + y^2 = 1`), parametric curves, polar — defer (chỉ y = f(x)).

## 3. Architecture

### 3.1 Vị trí module

```
src/core/scene/
├── types.ts                ← extend `Domain = '2d' | '3d' | 'graph2d'`
├── kinds/
│   ├── function2d.ts       ← NEW
│   ├── parameter.ts        ← NEW
│   ├── pointOnCurve.ts     ← NEW
│   ├── tangent2d.ts        ← NEW
│   ├── extremum2d.ts       ← NEW
│   ├── root2d.ts           ← NEW
│   ├── slope2d.ts          ← NEW
│   └── index.ts            ← register 7 kinds mới
├── expressions/            ← NEW shared module (function parser)
│   ├── parser.ts           ← port từ stamps/graph-2d cũ
│   ├── evaluator.ts        ← port từ stamps/graph-2d cũ
│   ├── derivative.ts       ← numerical derivative
│   └── __tests__/
├── render/
│   └── JxgRenderer.ts      ← +switch cases cho 7 kinds mới (1 renderer dùng chung)
├── ui/
│   ├── kindMeta.ts         ← +entries cho 7 kinds
│   └── ObjectListPanel.tsx ← +prop optional `renderRow?: (obj) => ReactNode`

src/stamps/graph-2d/        ← REBUILD từ scratch
├── index.tsx               ← StampType + Graph2DCustomData v2
├── host.tsx                ← lift store + selectedObjectId
├── serialize.ts            ← createEmptyGraph2dState + parse/stringify customData
├── render.ts               ← one-shot offscreen SVG cho insert
├── types.ts                ← Graph2DCustomData v2
└── editor/
    ├── EditorPanel.tsx     ← orchestrator
    ├── LeftPanel.tsx       ← LeftPanelShell + tab Công cụ/Đối tượng
    ├── MiniBoard.tsx       ← JSXGraph board + JxgRenderer subscribe
    ├── useToolStateMachine.ts  ← 12 graph tools
    ├── tools.ts            ← tool metadata + groups
    ├── theme.ts            ← light/dark palette
    ├── handlers.ts         ← pointer routing per tool
    └── rows/
        ├── FunctionRow.tsx     ← inline expression input
        └── ParameterRow.tsx    ← inline slider control
```

### 3.2 Boundary unit

- `core/scene/expressions/` — **không import JSXGraph, React, Excalidraw**. Pure Node-runnable. Test thuần.
- `core/scene/kinds/*.ts` — pure schema + render function (render là một function nhận `ctx`, không import JSXGraph globally).
- `stamps/graph-2d/editor/*` — JSXGraph + React. Import từ `core/scene/`.

## 4. Data model

### 4.1 7 kinds mới

```ts
// function2d
{
  id: string,
  kind: 'function2d',
  label: string,                       // 'f', 'g', ...
  expression: string,                  // 'x^2 + a*x'
  color: string,                       // hex
  visible: boolean,
  domain?: { min: number; max: number },
}

// parameter (slider)
{
  id: string,
  kind: 'parameter',
  label: string,                       // 'a', 'b', ...
  value: number,
  min: number,
  max: number,
  step: number,
}

// pointOnCurve
{
  id: string,
  kind: 'pointOnCurve',
  label?: string,
  functionId: string,                  // refers to function2d
  x: number,                           // y computed via evaluator
}

// tangent2d
{
  id: string,
  kind: 'tangent2d',
  pointId: string,                     // refers to pointOnCurve
}

// extremum2d
{
  id: string,
  kind: 'extremum2d',
  functionId: string,
  interval: { min: number; max: number },
  mode: 'max' | 'min',
}

// root2d
{
  id: string,
  kind: 'root2d',
  functionId: string,
  interval: { min: number; max: number },
}

// slope2d
{
  id: string,
  kind: 'slope2d',
  pointId: string,                     // pointOnCurve
}
```

### 4.2 `dependsOn` (cascade delete)

```ts
function2d:    () => []                       // chỉ phụ thuộc parameters qua expression refs
parameter:     () => []
pointOnCurve:  (o) => [o.functionId]
tangent2d:     (o) => [o.pointId]             // gián tiếp depend function qua point
extremum2d:    (o) => [o.functionId]
root2d:        (o) => [o.functionId]
slope2d:       (o) => [o.pointId]
```

Lưu ý: `function2d.dependsOn` không reflect parameter refs trực tiếp (vì expression là string, không biết refs ở schema level). Khi user xoá parameter → expression có thể trở thành invalid. Xử lý ở renderer (catch eval error → highlight đỏ trong row, không crash).

### 4.3 `kind.render` (overview)

```ts
// function2d.render
const compiled = compile(o.expression, ctx.paramMap);
board.create('functiongraph', [compiled, o.domain?.min ?? view.xMin, o.domain?.max ?? view.xMax], {
  strokeColor: o.color, strokeWidth: 2, withLabel: false,
});

// parameter.render
// → KHÔNG render lên board. Renderer skip parameter kind (chỉ hiện trong ObjectListPanel).

// pointOnCurve.render
const fnElem = ctx.resolveRef(o.functionId);
board.create('glider', [o.x, 0, fnElem], { name: o.label ?? '', size: 3, ... });

// tangent2d.render
const pt = ctx.resolveRef(o.pointId);
board.create('tangent', [pt], { strokeColor: ..., strokeWidth: 1.5, dash: 2 });

// extremum2d.render
// scan numerical → board.create('point', [x, y], { fillColor: '#000', ... })

// root2d.render
// scan numerical → board.create('point', [x, 0], { fillColor: '#000', ... })

// slope2d.render
const pt = ctx.resolveRef(o.pointId);
board.create('slopetriangle', [pt], { ... });
```

### 4.4 Renderer cần access paramMap

Vì function2d render cần compile expression với current parameter values, renderer phải truyền `paramMap` qua `ctx`. Extend `RenderCtx` (in `core/scene/types.ts`) **optional** (giữ backward-compat cho geometry-2d/3d):

```ts
export type RenderCtx = {
  jxg: unknown;
  resolveRef: (id: string) => unknown;
  defaults: Readonly<Record<string, unknown>>;
  paramMap?: Readonly<Record<string, number>>;  // NEW — chỉ graph2d dùng
};
```

`JxgRenderer` rebuild `paramMap` mỗi action **chỉ khi** `state.meta.domain === 'graph2d'`. Chi phí thấp (parameters thường ≤ 8). Geometry-2d/3d không bị ảnh hưởng vì các kind render của chúng không đọc `paramMap`.

### 4.5 View settings (axis/grid)

Scene v2 state đã có `meta` field. Thêm view settings vào meta (theo domain):

```ts
state.meta = {
  domain: 'graph2d',
  version: 1,
  view: {
    xMin: -10, xMax: 10, yMin: -10, yMax: 10,
    showAxis: true, showGrid: true,
  },
}
```

Reducer thêm action `UPDATE_VIEW` (immer update meta.view). Undo cover view changes.

Geometry-2d hiện chưa lưu view trong meta — out of scope refactor đó.

### 4.6 Custom data (Excalidraw stamp)

```ts
interface Graph2DCustomData {
  kind: 'graph2d';
  version: 2;
  sceneJson: string;            // JSON.stringify(state)
  svgWidth: number;
  svgHeight: number;
}

function isGraph2DCustomData(data: unknown): data is Graph2DCustomData {
  // version === 2 only — drop v1
}
```

## 5. Editor flow

### 5.1 Component tree

```
StampEditorOverlay
└── Graph2DStampHost
    ├── GraphLeftPanel (LeftPanelShell)
    │   ├── tab Công cụ: ToolStrip + Axis/Grid/Undo/Redo
    │   └── tab Đối tượng: ObjectListPanel { renderRow }
    │       ├── FunctionRow (kind=function2d)
    │       ├── ParameterRow (kind=parameter)
    │       └── ObjectRow default (other kinds)
    └── GraphEditorPanel
        └── MiniBoard
            (JxgRenderer subscribe store)
```

### 5.2 Host responsibilities (mirror geometry-2d host)

- Lift `store: Store | null` (set bởi EditorPanel `onStoreReady`).
- Lift `selectedObjectId` (set bởi MiniBoard via `onSelectionChange`, đọc bởi LeftPanel).
- Wire MobileToolDrawer tab Đối tượng khi mobile.
- Compute `initialState` từ `editingElement.customData.sceneJson` qua `parseSceneState`.
- `tryInsert()` gọi `EditorPanel.insert()` → SVG export + Excalidraw insert.

### 5.3 Tool state machine (12 tool)

```ts
type GraphTool =
  | 'move'
  | 'point'           // free 2D point on plane
  | 'slider'          // open dialog → ADD parameter
  | 'pointOnCurve'    // click curve → glider
  | 'intersect'       // click 2 curves → intersection points
  | 'tangent'         // click point on curve → tangent line
  | 'slope'           // click point on curve → slope triangle
  | 'extremum'        // click curve + drag interval → max/min point
  | 'root'            // click curve + drag interval → zero point
  | 'segment'         // 2 clicks → segment
  | 'line'            // 2 clicks → infinite line
  | 'polygon';        // N clicks + close → polygon
```

Pattern y `geometry-2d/editor/useToolStateMachine.ts`: pending picks per tool, transition idle khi đủ inputs, dispatch ADD vào store, reset tool về 'move' (hoặc giữ tool nếu user prefer "sticky tool" — same as geo).

### 5.4 Inline editing (FunctionRow / ParameterRow)

**FunctionRow** (in tab Đối tượng, khi `obj.kind === 'function2d'`):

```
┌─────────────────────────────────────────┐
│ [👁] [●] f(x) = [x^2 + a    ]  [⋮]   │
└─────────────────────────────────────────┘
  │     │   │      │              │
  │     │   │      │              └ menu: rename/delete/color
  │     │   │      └ inline input (debounced 200ms → UPDATE)
  │     │   └ label (inline rename via click)
  │     └ color swatch (click → palette popover → UPDATE color)
  └ visibility toggle (UPDATE visible)
```

Parser validation runs trên blur/Enter. Invalid → row có red border + tooltip error. Store giữ expression cũ (không UPDATE) khi invalid.

**ParameterRow** (khi `obj.kind === 'parameter'`):

```
┌─────────────────────────────────────────┐
│ a = 1.5   [────●────]  [min=-5 max=5] [⋮]│
└─────────────────────────────────────────┘
            │
            └ inline slider (debounced 100ms → UPDATE value)
```

Drag slider → debounced UPDATE → re-render curves đang phụ thuộc.

### 5.5 Undo

Store.history snapshot mỗi action. Ctrl/Cmd+Z trong editor:
- Undo expression edit (UPDATE function2d expression)
- Undo slider change (UPDATE parameter value)
- Undo add/delete object
- Undo view zoom/pan (qua UPDATE_VIEW action)

Pattern y geometry-2d. Sticky tools không thay đổi qua undo (UI state, không phải store state).

## 6. Render pipeline

### 6.1 Interactive (MiniBoard)

```
MiniBoard mount:
  ├── createStore(initialState)
  ├── create JXG.Board
  ├── new JxgRenderer(store, board, { theme, paramMap: deriveParamMap(state) })
  └── subscribe pointer events → handlers → store.dispatch
```

Mỗi action → `JxgRenderer.subscribe` callback diff objects → cho kind nào changed: `kind.render(obj, ctx)`. Đặc biệt cho function2d: nếu parameter thay đổi, MỌI function refs parameter đó cần re-render. Implementation:

- `JxgRenderer` track `parameterDependencies: Map<paramId, Set<functionId>>` rebuild khi function2d/parameter add/update/delete.
- Trên parameter UPDATE → invalidate dependent functions → re-render.

`function2d.dependsOn` không reflect refs, nhưng renderer-side tracking sufficient (không cần ở schema level).

### 6.2 Export SVG (P3 hybrid)

Lúc insert:
1. Tạo offscreen JXG.Board (`document.createElement('div')`, không append).
2. `new JxgRenderer(store, board)` → render full state.
3. Wait 1 RAF → `serializeBoard(board)` → SVG string.
4. `insertStampImage(api, { svgString, makeCustomData: ... })`.

`serializeBoard` đã có ở `geometry-2d/serialize.ts` (re-export ra `core/scene/render/serializeBoard.ts` nếu shared được — phase implementation sẽ check).

### 6.3 Restore (reload)

`graph2dStamp.restoreFileFromCustomData(element)`:
- Parse `customData.sceneJson` → `State`.
- Create offscreen board + render full → serialize SVG → data URL.
- Return `RestoredStampFile`. Pattern y geometry-2d.

### 6.4 Re-edit (double-click stamp)

`Whiteboard.tsx` intercept double-click ảnh có `isGraph2DCustomData(customData)` → mở `Graph2DStampHost` với `editingElement`. Host parse `sceneJson` thành initial state. Pattern y geometry-2d.

## 7. Expression parser / evaluator

### 7.1 Pure module `core/scene/expressions/`

Port từ `stamps/graph-2d/parser.ts` + `evaluator.ts`:

```ts
// parser.ts
export function validate(expression: string): { ok: true } | { ok: false; error: string };
export function compile(expression: string, params: Record<string, number>): (x: number) => number;
export function collectFreeVars(expression: string): string[];   // returns ['x', 'a', ...]

// evaluator.ts (numerical helpers)
export function scanRoots(fn, xMin, xMax, samples?): number[];
export function scanExtrema(fn, xMin, xMax, samples?): { x; y; type: 'max'|'min' }[];

// derivative.ts
export function numericalDerivative(expression, params, x, h?): number;
```

Whitelist constants (`pi`, `e`), functions (`sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `sinh`, `cosh`, `tanh`, `exp`, `log`, `ln`, `sqrt`, `abs`, `floor`, `ceil`, `round`, `min`, `max`, `pow`). Pre-compile via `new Function('x', 'p', body)` after whitelist guard (same as current). Treat invalid identifiers as compile error.

### 7.2 Tests

- `validate()`: known valid expressions pass; invalid (`x +`, `unknown(x)`, `x ^^ 2`) fail with descriptive error.
- `compile()`: numerical sanity (f(2) = 4 for `x^2`).
- `collectFreeVars()`: detects all referenced parameter names.
- `scanRoots()`, `scanExtrema()`: known polynomials, edge cases (constant, monotone, multiple roots).
- `numericalDerivative()`: known derivatives (d/dx x^2 = 2x).

## 8. Tool state machine details

### 8.1 Generic shape

```ts
interface ToolStateMachine {
  activeTool: GraphTool;
  pending: PendingState | null;   // tool-specific data
  setTool(tool: GraphTool): void;
  onPointerDown(coord: { x; y }, hit: HitTarget | null): void;
  onPointerMove(coord: { x; y }, hit: HitTarget | null): void;
  onPointerUp(coord: { x; y }, hit: HitTarget | null): void;
  reset(): void;
}
```

`HitTarget` discriminated union: `{ kind: 'object'; id: string }` | `{ kind: 'empty' }`.

### 8.2 Per-tool behavior

| Tool | Pending shape | Dispatch on commit |
|---|---|---|
| move | none | none (just selection) |
| point | none | `ADD point` ngay click empty |
| slider | none | open dialog → submit → `ADD parameter` |
| pointOnCurve | none | click curve → `ADD pointOnCurve {functionId, x}` |
| intersect | `{ firstFnId }` | 2 clicks curves → `ADD intersection2d` (existing kind for 2D) |
| tangent | none | click pointOnCurve → `ADD tangent2d {pointId}` |
| slope | none | click pointOnCurve → `ADD slope2d {pointId}` |
| extremum | `{ functionId; intervalStart }` | click curve + drag interval → `ADD extremum2d` |
| root | similar | `ADD root2d` |
| segment | `{ firstPtId }` | 2 clicks → `ADD segment` (reuse 2D kind) |
| line | `{ firstPtId }` | 2 clicks → `ADD line` (reuse 2D kind) |
| polygon | `{ ptIds: string[] }` | N clicks + close → `ADD polygon` (reuse 2D kind) |

### 8.3 Sticky vs reset

Tools default **không sticky** (reset về 'move' sau commit) — match geometry-2d hiện tại. Nếu sau này muốn "Lock tool" mode → separate enhancement, ngoài scope spec này.

### 8.4 Shortcuts

Group + chord (reuse `useChordShortcut`). Bảng dưới là **proposal** — implementation PR sẽ verify không trùng với shortcuts geometry-2d hoặc các shortcut global (Ctrl+Z, etc.) và adjust nếu cần:

| Group | Group key | Members |
|---|---|---|
| Cơ bản | `S` | Move(S), Point(P), Slider(B) |
| Hàm | `F` | PointOnCurve(O), Intersect(I), Tangent(T), Slope(K) |
| Phân tích | `A` | Extremum(E), Root(R) |
| Vẽ | `D` | Segment(M), Line(L), Polygon(Y) |

`useStampShortcutBlocker` đảm bảo các phím không bubble vào Excalidraw khi editor mở (hook đã có).

## 9. Object panel — per-kind renderRow

### 9.1 ObjectListPanel extension

```ts
export interface ObjectListPanelProps {
  store: Store;
  selectedId?: string;
  onSelect?: (id: string) => void;
  renderRow?: (obj: SceneObject, defaults: { selected: boolean; onClick: () => void }) => React.ReactNode;
}
```

Mặc định: `<ObjectRow obj={...} />` (như hiện tại).
Graph stamp pass:

```tsx
<ObjectListPanel
  store={store}
  selectedId={selectedObjectId}
  onSelect={onObjectSelect}
  renderRow={(obj, defaults) => {
    if (obj.kind === 'function2d') return <FunctionRow obj={obj} store={store} {...defaults} />;
    if (obj.kind === 'parameter')  return <ParameterRow obj={obj} store={store} {...defaults} />;
    return <ObjectRow obj={obj} {...defaults} />;  // default cho point/segment/etc.
  }}
/>
```

### 9.2 kindMeta extension

`core/scene/ui/kindMeta.ts` thêm:

```ts
function2d:   { displayName: 'Hàm số',     icon: 'ƒ' },
parameter:    { displayName: 'Tham số',    icon: '𝑎' },
pointOnCurve: { displayName: 'Điểm trên đồ thị', icon: '◉' },
tangent2d:    { displayName: 'Tiếp tuyến', icon: '╱' },
extremum2d:   { displayName: 'Cực trị',    icon: '∧' },
root2d:       { displayName: 'Nghiệm',     icon: '0' },
slope2d:      { displayName: 'Hệ số góc',  icon: '△' },
```

## 10. Mobile UX

`GraphLeftPanel` dùng `LeftPanelShell` (tab Công cụ/Đối tượng) + render `MobileToolDrawer` khi `isMobile`. Truyền `objectsTab={...}` cho drawer (như geometry-3d làm sau PR `0fddb51`).

Drawer khi mobile có:
- Tab Công cụ: 12 tool flat list (không chord)
- Tab Đối tượng: ObjectListPanel với renderRow

## 11. Error handling

| Lỗi | Hành vi |
|---|---|
| Expression invalid | Row red border + tooltip error. Store giữ value cũ. Không re-render curve. |
| Param undefined trong expression | Treat as undefined → curve disappears (renderer log warn). Row tooltip warn. |
| Domain min > max | UPDATE rejected ở reducer (kind.validate throws). |
| pointOnCurve referenced function deleted | reducer cascade delete (dependsOn). |
| tangent referenced point deleted | reducer cascade delete. |
| Numerical scan timeout (1000ms) | Abort, log warn. Renderer trả empty extrema/root list. |
| sceneJson parse fail | `parseSceneState` returns null → host renders empty editor (như geometry). |
| Old v1 customData (kind='graph2d',version=1) | `isGraph2DCustomData` returns false → element không treat as graph stamp → static image fallback (Excalidraw native image). |

## 12. Testing strategy

### 12.1 Pure unit tests (no jsdom)

- `core/scene/kinds/*.test.ts` × 7: validate + dependsOn + (nếu có) migrate. Ví dụ:
  - `function2d`: empty expression → invalid; valid expression → OK.
  - `pointOnCurve`: dependsOn returns `[functionId]`.
  - `tangent2d`: cascade delete khi pointOnCurve xoá.
- `core/scene/expressions/parser.test.ts`: validate, compile, collectFreeVars.
- `core/scene/expressions/evaluator.test.ts`: scanRoots, scanExtrema.
- `core/scene/expressions/derivative.test.ts`: known derivatives.

### 12.2 Renderer tests (mock JSXGraph)

- `core/scene/render/__tests__/JxgRenderer.graph.test.ts`: dispatch ADD function2d → mock board.create('functiongraph', ...) called với compiled function + correct args.
- Diff test: UPDATE parameter value → all dependent functions re-rendered (removeObject + create).

### 12.3 Integration tests (jsdom + RTL)

- `stamps/graph-2d/__tests__/editor-flow.test.tsx`:
  - Mount EditorPanel → click "Add function" → row appears → type expression + Enter → store dispatch UPDATE → curve "rendered" (mock JSXGraph called).
  - Click tab Đối tượng → list shows function row + parameter row.
  - Drag slider → debounced UPDATE → state.objects[paramId].value changes.
  - Ctrl+Z → undo expression edit.

### 12.4 E2E (Playwright)

- `e2e/graph-2d.spec.ts`: open editor → add function `x^2` → Enter → verify curve SVG element exists → click Slider tool → ADD param `a` → drag → curve updates → click Chèn → image appears on whiteboard → double-click image → editor reopens with state.

### 12.5 Coverage target

- Pure code (kinds, expressions): 95%+
- Renderer: 85%+
- Integration: critical paths only

## 13. Migration plan (per-PR)

### PR G.1 — Kinds + expressions module (1 ngày)

**Scope**:
- Xoá `src/stamps/graph-2d/` toàn bộ.
- Tạo `core/scene/expressions/` (parser/evaluator/derivative) — port logic từ commit cũ qua git.
- Tạo 7 kinds: `function2d.ts`, `parameter.ts`, `pointOnCurve.ts`, `tangent2d.ts`, `extremum2d.ts`, `root2d.ts`, `slope2d.ts`.
- Add 7 entries vào `kinds/index.ts` registry.
- Add 7 entries vào `ui/kindMeta.ts`.
- Extend `core/scene/types.ts`: `Domain = '2d' | '3d' | 'graph2d'` + `Meta.view` optional cho graph2d.
- Tests: ~40 unit tests cho kinds + expressions.
- Wire vào `stamps/shared/registry.ts`: tạm thời remove `graph2dStamp` (sẽ add lại ở G.5).
- `npm test` + `npm run typecheck` PASS.

### PR G.2 — JxgRenderer cases cho graph kinds (0.5 ngày)

**Scope**:
- Extend `JxgRenderer` render switch cho 7 kinds graph.
- `RenderCtx2D` add `paramMap`.
- `JxgRenderer` tracks `parameterDependencies` map; rebuild trên function2d ADD/UPDATE/DELETE.
- Action handler UPDATE parameter → invalidate dependents.
- Tests mock JSXGraph: `JxgRenderer.graph.test.ts`.
- `npm test` PASS.

### PR G.3 — MiniBoard + useToolStateMachine + handlers (1.5 ngày)

**Scope**:
- Tạo `stamps/graph-2d/editor/MiniBoard.tsx`: JSXGraph board init + JxgRenderer wire.
- Tạo `stamps/graph-2d/editor/useToolStateMachine.ts`: 12 tool state machine (pattern từ geometry-2d).
- Tạo `stamps/graph-2d/editor/handlers.ts`: pointer routing per tool.
- Tạo `stamps/graph-2d/editor/tools.ts` (metadata + group + shortcut).
- Tạo `stamps/graph-2d/editor/theme.ts`.
- Tests integration cho tool state machine.
- `npm test` PASS.

### PR G.4 — EditorPanel + LeftPanel + per-kind rows (1.5 ngày)

**Scope**:
- Extend `ObjectListPanel`: prop `renderRow?` optional.
- Tạo `stamps/graph-2d/editor/rows/FunctionRow.tsx`: inline expression input (debounced) + color swatch + visibility toggle + menu.
- Tạo `stamps/graph-2d/editor/rows/ParameterRow.tsx`: inline slider + min/max edit + menu.
- Tạo `stamps/graph-2d/editor/LeftPanel.tsx`: dùng `LeftPanelShell`, tab Công cụ (tool strip + axis/grid/undo/redo), tab Đối tượng (ObjectListPanel + renderRow).
- Tạo `stamps/graph-2d/editor/EditorPanel.tsx`: orchestrator. Lift store qua `onStoreReady`. Wire selection.
- Tests RTL cho FunctionRow/ParameterRow + integration cho EditorPanel.
- `npm test` PASS.

### PR G.5 — Host + StampType + registry + e2e (1 ngày)

**Scope**:
- Tạo `stamps/graph-2d/host.tsx`: lift store + selectedObjectId + MobileToolDrawer wiring.
- Tạo `stamps/graph-2d/index.tsx`: `graph2dStamp: StampType` + `Graph2DCustomData v2` + `isGraph2DCustomData`.
- Tạo `stamps/graph-2d/serialize.ts`: `createEmptyGraph2dState`, `parseSceneState`, `stringifySceneState`.
- Tạo `stamps/graph-2d/render.ts`: offscreen JSXGraph + serializeBoard cho one-shot SVG export.
- Tạo `stamps/graph-2d/types.ts`: Graph2DCustomData v2.
- Wire vào `stamps/shared/registry.ts` (graph2dStamp về `EXPERIMENTAL_STAMPS`).
- Re-export từ `stamps/index.ts` + `src/index.ts`.
- Add e2e Playwright: `e2e/graph-2d.spec.ts`.
- Playground demo update.
- `npm test` + `npm run typecheck` + `npm run build` PASS.
- Bump version `0.14.0` → `0.15.0` + npm publish.

### Total

5 PRs × ~5 ngày. Sau khi xong, `EXPERIMENTAL_STAMPS` chứa `geometry3dStamp + graph2dStamp` (đều scene v2). `STABLE_STAMPS` chứa `geometryStamp + latexStamp`.

## 14. Acceptance criteria

- [ ] `src/stamps/graph-2d/` rebuild xong, không còn file cũ.
- [ ] `core/scene/expressions/` pure module, runnable Node, 95%+ coverage.
- [ ] 7 kinds mới registered, `kindMeta` cover hết.
- [ ] JxgRenderer render 7 kinds đúng (mock JSXGraph test pass).
- [ ] 12 tool state machine pass integration tests.
- [ ] LeftPanel tab Đối tượng hiện FunctionRow + ParameterRow inline editable.
- [ ] Mobile drawer tab Đối tượng work.
- [ ] Ctrl+Z undo expression edit + slider drag + add/delete.
- [ ] Double-click stamp re-edit reopen với state cũ.
- [ ] Reload page → stamp restore SVG via `restoreFileFromCustomData`.
- [ ] E2E Playwright smoke PASS.
- [ ] `npm run typecheck` + `npm test` + `npm run build` PASS.
- [ ] Version bump `0.15.0` published.

## 15. Out of scope (xác nhận lại)

- Backward compat v1 (drop hoàn toàn).
- Best-fit/regression curve.
- Function inspector table.
- LaTeX label trong axis/function.
- Implicit functions, parametric, polar.
- Excalidraw 0.19 upgrade.
- Immer 10→11 upgrade.
- Refactor view settings cho geometry-2d (chỉ graph2d có meta.view).

## 16. Trade-offs / rủi ro

| Rủi ro | Mitigation |
|---|---|
| function2d.dependsOn không reflect parameter refs → cascade delete không hoạt động khi xoá param đang được dùng | Renderer track dependencies + show warning trong row. Không break compile (compile catch error, returns NaN). |
| JxgRenderer phình ra vì thêm 7 cases | Mỗi case là 1 hàm pure ngắn trong `kind.render`. Renderer chỉ dispatch. Đúng theo design Scene v2. |
| Numerical scanExtrema/scanRoots chậm khi domain rộng | Default samples = 1000, timeout 1000ms. User có thể giảm domain. |
| Inline expression debounce 200ms gây feel "lag" | Show "evaluating..." indicator trong row. Hoặc cho user submit Enter để skip debounce. |
| ObjectListPanel renderRow extension làm geometry-2d/3d code thay đổi | Default renderRow undefined → fallback ObjectRow. Geo stamps không pass renderRow. Backward compat. |
| serializeBoard chưa exist ở `core/scene/render/` | PR G.5 tạo file mới hoặc reuse từ geometry-2d (check ở implementation phase). |

## 17. Open questions

(Đã chốt — không còn open.)

## 18. References

- `docs/superpowers/specs/2026-05-20-scene-v2-design.md` — Scene v2 base.
- `docs/superpowers/specs/2026-05-20-scene-phase-3-design.md` — ObjectListPanel + recorder.
- `docs/superpowers/specs/2026-05-20-2d-object-tab-design.md` — Tab Đối tượng + LeftPanelShell.
- `docs/superpowers/specs/2026-05-17-graph-2d-stamp-design.md` — Graph 2D v1 (deprecated, ref only).
- GeoGebra Graphing: https://www.geogebra.org/graphing
- JSXGraph reference: https://jsxgraph.uni-bayreuth.de/docs/
