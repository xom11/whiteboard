# Mức 3 Phase 4 — point.ts → point-constraints registry — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Tách 3 switch lớn (`render`/`describe`/`validate`) trong `src/core/scene/kinds/point.ts` thành `point-constraints/` registry, behavior-preserving (render dispatch + describe output byte-identical). Defer-completion của Mức 3 (issue #45).

**Architecture:** point.ts giữ **1 KindDef** đăng ký `type='point'`; render/describe/validate dùng **strangler dispatch** — thử `POINT_CONSTRAINTS[c.kind]`, chưa migrate thì rơi xuống switch inline còn lại (teo dần mỗi batch → rỗng sau Batch 3). `dependsOn`/`measure`/`update` giữ nguyên ở point.ts. Mirror precedent `dsl/kinds`/`intent-builders`/`finalize`.

**Tech Stack:** TypeScript strict, Jest 29 + ts-jest, JSXGraph (mock board cho render-golden). Spec: `docs/superpowers/specs/2026-06-07-deterministic-first-muc3-phase4-design.md`.

**Verify mỗi task có thay đổi runtime:**
- `npm run typecheck` clean.
- `npx jest point.render.golden point.describe.golden --ci` → PASS, **0 snapshots written** (byte-identical; KHÔNG `-u`).
- `npx jest point --ci` → PASS (toàn bộ test point.* + pointConstructions cũ giữ xanh).
- `npm test` → baseline **2204 pass** (+ golden mới) / 0 fail.
- `npx tsx scripts/diag-deterministic.ts scripts/probes-adversarial.txt` → `37 / 16`. `npm run check:matrix` → `✓ 34/34`.

**Branch:** `refactor/muc3-phase4-point-constraints`.

---

## Task 0: Render-golden + describe-golden baseline (foundation)

Lưới byte-identical cho render side-effect + describe. Sinh baseline trên code HIỆN TẠI (point.ts chưa refactor), commit.

**Files:**
- Create: `src/core/scene/kinds/__tests__/point.render.golden.test.ts`
- Create: `src/core/scene/kinds/__tests__/point.describe.golden.test.ts`

- [ ] **Step 1: Unified mock board + normalize harness**

Tạo `point.render.golden.test.ts`. Mock board ghi mọi `board.create` + cấp accessor đủ cho mọi kind; normalize created[] (element→`_id`, function→invoke ra số) để snapshot ổn định + bắt được đổi closure.

```ts
// point.render.golden.test.ts
import { createStore } from '../../store';
import { createEmptyState } from '../../types';
import { JxgRenderer } from '../../render/JxgRenderer';
import '../../kinds';
import type { SceneObject } from '../../types';

const val = (p: any) => (typeof p === 'function' ? p() : p);

function mockBoard() {
  const created: any[] = [];
  const board = {
    create: jest.fn((type: string, parents: any, attrs: any) => {
      const el: any = { type, parents, attrs, _id: `${type}_${created.length}` };
      if (type === 'point' || type === 'glider') {
        el.X = () => val(parents[0]); el.Y = () => val(parents[1]);
      } else if (type === 'midpoint') {
        const [a, b] = parents;
        el.X = () => (a.X() + b.X()) / 2; el.Y = () => (a.Y() + b.Y()) / 2;
      } else if (type === 'circle') {
        el.center = parents[0];
        el.Radius = () => {
          const r = parents[1];
          if (typeof r === 'number') return r;
          if (r && typeof r.X === 'function') return Math.hypot(r.X() - parents[0].X(), r.Y() - parents[0].Y());
          return val(r);
        };
      } else if (type === 'line' || type === 'segment' || type === 'perpendicular' || type === 'perpendicularsegment') {
        el.point1 = parents[0]; el.point2 = parents[1];
      }
      created.push(el);
      return el;
    }),
    removeObject: jest.fn(),
  };
  return { board, created };
}

// Normalize: created element → _id, function parent → invoked number, else passthrough.
function norm(created: any[]) {
  const idOf = (p: any): any => {
    if (p && typeof p === 'object' && '_id' in p) return p._id;
    if (typeof p === 'function') { const v = p(); return typeof v === 'number' ? Math.round(v * 1e6) / 1e6 : v; }
    if (typeof p === 'number') return Math.round(p * 1e6) / 1e6;
    return p;
  };
  return created.map((e) => ({
    type: e.type,
    name: e.attrs?.name ?? null,
    visible: e.attrs?.visible ?? null,
    parents: Array.isArray(e.parents) ? e.parents.map(idOf) : idOf(e.parents),
    helpers: Array.isArray(e._helpers) ? e._helpers.map((h: any) => h._id) : undefined,
  }));
}

const mkObj = (id: string, kind: string, attrs: unknown): SceneObject => ({
  id, kind, label: id, visible: true, locked: false, layer: 'default', schemaVersion: 1, attrs: attrs as never,
});
const mkFree = (id: string, x: number, y: number) => mkObj(id, 'point', { constraint: { kind: 'free', x, y } });
const mkCircleCR = (id: string, center: string, radius: number) => mkObj(id, 'circle', { center, radius });
const mkSegment = (id: string, p1: string, p2: string) => mkObj(id, 'segment', { p1, p2 });
const mkPt = (id: string, constraint: unknown) => mkObj(id, 'point', { constraint });

// Render 1 scenario: dispatch setup objs + the target point, return normalized created[].
function renderScenario(setup: SceneObject[], target: SceneObject) {
  const store = createStore(createEmptyState('2d'));
  const { board, created } = mockBoard();
  new JxgRenderer(store, board as never);
  for (const o of setup) store.dispatch({ type: 'ADD', payload: { obj: o } });
  store.dispatch({ type: 'ADD', payload: { obj: target } });
  return norm(created);
}
```

- [ ] **Step 2: Scenario table — every constraint kind (đọc point.ts để lấy shape chính xác)**

Thêm vào file. Mỗi entry phủ 1 kind (+ biến thể). Đọc `src/core/scene/kinds/point.ts` render() để biết constraint fields + setup objects cần (ref points/circle/line phải tồn tại để resolveRef ra mock element). Phủ ĐỦ:

| Kind | Setup | Target constraint | Ghi chú |
|---|---|---|---|
| free | — | `{kind:'free',x:2,y:3}` | |
| onAxis ×2 | — | `{kind:'onAxis',axis:'x',t:4}` và `axis:'y'` | |
| onLine | free p1,p2 + segment `ln(p1,p2)` | `{kind:'onLine',lineId:'ln',t:0.3}` | glider seed đọc line.point1/2 |
| onSegment | như onLine | `{kind:'onSegment',segmentId:'ln',t:0.4}` | |
| onCircle | free O + circleCR `k(O,5)` | `{kind:'onCircle',circleId:'k',theta:0.5}` | đọc circle.center |
| onPolygon | (poly tối thiểu) | `{kind:'onPolygon',polygonId:'pg',u:0.2,v:0.3}` | nếu khó dựng poly mock → vẫn record glider parents |
| midpoint | free A,B | `{kind:'midpoint',p1:'A',p2:'B'}` | |
| perpFoot | free P + segment ln | `{kind:'perpFoot',from:'P',onLine:'ln'}` | |
| circumcenter/incenter/centroid/orthocenter | free A,B,C | `{kind:'<k>',vertices:['A','B','C']}` | centroid=function-coords; orthocenter=_helpers(4) |
| transformed ×5 | source S + center O (+ line L cho reflectLine) | `{kind:'transformed',source:'S',transform:{kind:'translate',dx:1,dy:2}}`; `rotate`{angleRad:1.5708,center:'O'}; `reflectPoint`{center:'O'}; `reflectLine`{line:'L'}; `dilate`{k:2,center:'O'} | _helpers=transforms; dilate function-coords |
| tangentPointExt ×2 | free P + circleCR k | `{kind:'tangentPointExt',from:'P',circle:'k',which:0}` và `which:1` | _helpers(2) |
| circleIntersection ×2 | 2 circleCR k1,k2 | `{kind:'circleIntersection',c1:'k1',c2:'k2',which:0}` và 1 | |
| secondIntersection | circle k + segment ln + free A | `{kind:'secondIntersection',line:'ln',circle:'k',other:'A'}` | |
| tangencyPoint | circle k + segment ln | `{kind:'tangencyPoint',circle:'k',onLine:'ln'}` | |
| arcMidpoint | circle k(O,5) + free A,B,N | `{kind:'arcMidpoint',circle:'k',a:'A',b:'B',notContaining:'N'}` | function-coords |
| excenter | free A,B,C | `{kind:'excenter',vertices:['A','B','C'],opposite:'A'}` | function-coords |
| pointAtDistance ×3 | free A,B (+circle/seg) | `distance:{kind:'literal',value:3}`; `{kind:'circleRadius',circle:'k'}`; `{kind:'segmentLength',p1:'A',p2:'B'}` | function-coords |
| onPerpendicular | free T,A,B | `{kind:'onPerpendicular',through:'T',perpToA:'A',perpToB:'B',t:1}` | _helpers(2)+glider |
| onPerpBisector | free A,B | `{kind:'onPerpBisector',p1:'A',p2:'B',t:1}` | _helpers(3)+glider |
| onCircleAroundPoint | free C,R | `{kind:'onCircleAroundPoint',center:'C',radiusPoint:'R',theta:0.7}` | _helpers(1)+glider |

```ts
const SCENARIOS: { name: string; setup: SceneObject[]; target: SceneObject }[] = [
  { name: 'free', setup: [], target: mkPt('P', { kind: 'free', x: 2, y: 3 }) },
  { name: 'onLine', setup: [mkFree('p1', 0, 0), mkFree('p2', 4, 2), mkSegment('ln', 'p1', 'p2')],
    target: mkPt('G', { kind: 'onLine', lineId: 'ln', t: 0.3 }) },
  // ... (transcribe TOÀN BỘ bảng trên; với onPolygon nếu dựng poly mock khó, dùng setup tối thiểu + chấp nhận snapshot glider parents)
];

describe('point render — golden (Phase 4 behavior-preserving)', () => {
  for (const sc of SCENARIOS) {
    test(sc.name, () => { expect(renderScenario(sc.setup, sc.target)).toMatchSnapshot(); });
  }
});
```

> Nếu một kind ra fallback `point [0,0]` ngoài ý muốn (thiếu setup), sửa setup. Mục tiêu: KHÔNG kind nào fallback (trừ test riêng fallback nếu muốn). `onPolygon`: nếu polygon kind khó dựng bằng mkObj, đọc `polygon.ts`/`point.glider-seed.test.ts` xem cách; nếu vẫn khó, ghi `log` skip + note (đừng giả xanh).

- [ ] **Step 3: describe-golden**

```ts
// point.describe.golden.test.ts
import { getKind } from '../../registry';
import '../../kinds';
import type { SceneObject, State } from '../../types';
import { createEmptyState } from '../../types';

const mkPt = (id: string, label: string, constraint: unknown): SceneObject => ({
  id, kind: 'point', label, visible: true, locked: false, layer: 'default', schemaVersion: 1,
  attrs: { constraint } as never,
});
// state có label cho refs để describe render label thay vì id
function stateWith(labels: Record<string, string>): State {
  const base = createEmptyState('2d');
  const objects: Record<string, SceneObject> = {};
  for (const [id, label] of Object.entries(labels)) objects[id] = mkPt(id, label, { kind: 'free', x: 0, y: 0 });
  return { ...base, objects };
}

const CASES: { name: string; obj: SceneObject; state: State }[] = [
  // 1 case/kind — đọc point.ts describe() để biết refs cần label. Ví dụ:
  { name: 'free', obj: mkPt('P', 'P', { kind: 'free', x: 0, y: 0 }), state: createEmptyState('2d') },
  { name: 'midpoint', obj: mkPt('M', 'M', { kind: 'midpoint', p1: 'a', p2: 'b' }), state: stateWith({ a: 'A', b: 'B' }) },
  // ... TOÀN BỘ kind incl. transformed ×5 transform variants (describe rẽ theo transform.kind), pointAtDistance ×3 distance kinds
];

describe('point describe — golden (Phase 4)', () => {
  const def = getKind('point');
  for (const c of CASES) test(c.name, () => { expect(def.describe(c.obj, c.state)).toMatchSnapshot(); });
});
```

- [ ] **Step 4: Sinh baseline + verify**

Run: `npx jest point.render.golden point.describe.golden` → PASS, snapshots written. Mở 2 `.snap`: KHÔNG `[object Object]`/circular; function-coords ra số (centroid/arcMidpoint/excenter/pointAtDistance/dilate); `_helpers` đúng (transformed/orthocenter/onPerpendicular=2/onPerpBisector=3/onCircleAroundPoint=1/tangentPointExt=2); KHÔNG kind nào fallback `point [0,0]` sai.
Run: `npx jest point --ci` → PASS. `npm test` → PASS. `npm run typecheck` → clean.

- [ ] **Step 5: Commit**

```bash
git add src/core/scene/kinds/__tests__/point.render.golden.test.ts \
  src/core/scene/kinds/__tests__/point.describe.golden.test.ts \
  src/core/scene/kinds/__tests__/__snapshots__/point.render.golden.test.ts.snap \
  src/core/scene/kinds/__tests__/__snapshots__/point.describe.golden.test.ts.snap
git commit -m "test: golden render+describe baseline point.ts (lưới Phase 4, #45)"
```

---

## Task 1: Scaffold point-constraints/ + strangler dispatch

Dựng registry rỗng + helper, refactor point.ts 3 method thành "thử registry, else inline switch" (registry rỗng → mọi kind vẫn đi inline → behavior identical).

**Files:**
- Create: `src/core/scene/kinds/point-constraints/_types.ts`, `shared.ts`, `registry.ts`
- Modify: `src/core/scene/kinds/point.ts`

- [ ] **Step 1: `_types.ts`** (move PointAttrs vào đây để tránh hướng phụ thuộc point→constraint-module; point.ts re-export)

```ts
// point-constraints/_types.ts
import type { RenderCtx, SceneObject, State } from '../../types';
import type { Constraint2D } from '../2d-constraint';

export type PointAttrs = {
  constraint: Constraint2D;
  color?: string;
  showLabel?: boolean;
  showValue?: boolean;
  face?: 'o' | 'circle' | 'cross' | 'plus';
  size?: number;
};

type C<K extends Constraint2D['kind']> = Extract<Constraint2D, { kind: K }>;

export interface PointConstraintModule<K extends Constraint2D['kind'] = Constraint2D['kind']> {
  kind: K;
  validate?: (c: C<K>) => void;
  describe: (obj: SceneObject<PointAttrs>, state: State | undefined, c: C<K>) => string;
  render: (obj: SceneObject<PointAttrs>, ctx: RenderCtx, c: C<K>, opts: Record<string, unknown>) => unknown;
}

/** Factory widen typed module → generic cho registry (giống defineModule). */
export function definePointConstraint<K extends Constraint2D['kind']>(
  m: PointConstraintModule<K>,
): PointConstraintModule {
  return m as unknown as PointConstraintModule;
}
```

- [ ] **Step 2: `shared.ts`** — move `buildJxgTransforms` (point.ts:15-46) + `makeDistanceFn` (48-58) verbatim + thêm `buildPointOpts(obj)`:

```ts
// point-constraints/shared.ts
import type { RenderCtx, SceneObject } from '../../types';
import type { ConstraintDistanceSpec, TransformDef } from '../2d-constraint';
import type { PointAttrs } from './_types';

export function buildJxgTransforms(board: any, ctx: RenderCtx, t: TransformDef): any[] { /* move verbatim 15-46 */ }
export function makeDistanceFn(ctx: RenderCtx, d: ConstraintDistanceSpec): () => number { /* move verbatim 48-58 */ }

/** opts y hệt point.ts render hiện tại (defaults #1e40af / 'o' / 4). */
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
  };
}
```

- [ ] **Step 3: `registry.ts`** (rỗng ban đầu, barrel sẽ thêm import mỗi batch)

```ts
// point-constraints/registry.ts
import type { PointConstraintModule } from './_types';
// (mỗi batch: import { freeConstraint } from './free'; ... rồi thêm vào ALL)
const ALL: PointConstraintModule[] = [];
export const POINT_CONSTRAINTS: ReadonlyMap<string, PointConstraintModule> =
  new Map(ALL.map((m) => [m.kind, m]));
```

- [ ] **Step 4: point.ts strangler dispatch**

Sửa point.ts:
- Import: `import { POINT_CONSTRAINTS } from './point-constraints/registry';` + `import { buildJxgTransforms, makeDistanceFn, buildPointOpts } from './point-constraints/shared';` (xoá định nghĩa local `buildJxgTransforms`/`makeDistanceFn`).
- `PointAttrs`: đổi thành re-export `export type { PointAttrs } from './point-constraints/_types';` (xoá định nghĩa local). Verify serialize.ts vẫn import được (re-export giữ).
- `validate`: giữ check `a.constraint.kind` tồn tại; sau đó `POINT_CONSTRAINTS.get(c.kind)?.validate?.(c as never);` rồi GIỮ nguyên if-chain validate cũ (chưa migrate kind nào → registry rỗng → if-chain chạy). (Batch sẽ gỡ từng arm khi module nhận trách nhiệm.)
- `describe`: `const mod = POINT_CONSTRAINTS.get(c.kind); if (mod) return mod.describe(obj, state, c as never);` rồi GIỮ if-chain describe cũ + fallback `Điểm ${obj.label}`.
- `render`: `const opts = buildPointOpts(obj); const mod = POINT_CONSTRAINTS.get(c.kind); if (mod) return mod.render(obj, ctx, c as never, opts);` rồi GIỮ if-chain render cũ (dùng `opts` thay vì local opts object — thay block `const opts = {...}` bằng `buildPointOpts`) + fallback `board.create('point',[0,0],opts)`.
- `dependsOn`/`measure`/`update`: KHÔNG đổi.

> Registry rỗng ⇒ mọi `mod` = undefined ⇒ luôn rơi xuống if-chain cũ ⇒ behavior byte-identical. Đây chỉ thêm lookup no-op + tách opts/helpers ra shared.

- [ ] **Step 5: Verify**

`npm run typecheck` clean. `npx jest point.render.golden point.describe.golden --ci` → **0 written**. `npx jest point --ci` → PASS. `npm test` → PASS. `npx tsx scripts/diag-deterministic.ts scripts/probes-adversarial.txt` → 37/16.

- [ ] **Step 6: Commit**

```bash
git add src/core/scene/kinds/point-constraints/ src/core/scene/kinds/point.ts
git commit -m "refactor(scene): scaffold point-constraints registry + strangler dispatch (Phase 4 scaffold, #45)"
```

---

## Task 2: Batch 1 — native/glider kinds (10)

Migrate: **free, onAxis, midpoint, perpFoot, circumcenter, incenter, onLine, onSegment, onCircle, onPolygon**.

**Files:**
- Create: `point-constraints/{free,onAxis,midpoint,perpFoot,circumcenter,incenter,onLine,onSegment,onCircle,onPolygon}.ts`
- Modify: `point-constraints/registry.ts`, `point.ts`

- [ ] **Step 1: Tạo module mỗi kind** (move render+describe-arm+validate-arm verbatim từ point.ts vào module qua `definePointConstraint`). Ví dụ `free.ts`:

```ts
// point-constraints/free.ts
import { definePointConstraint } from './_types';

export const freeConstraint = definePointConstraint({
  kind: 'free',
  describe: (obj) => `Điểm ${obj.label}`,
  render: (obj, ctx, c, opts) => (ctx.jxg as any).create('point', [c.x, c.y], opts),
});
```

`onLine.ts` (glider seed verbatim từ point.ts:236-242):
```ts
export const onLineConstraint = definePointConstraint({
  kind: 'onLine',
  describe: (obj, state, c) => `${obj.label} trên đường ${state?.objects[c.lineId]?.label ?? c.lineId}`,
  render: (obj, ctx, c, opts) => {
    const board = ctx.jxg as any;
    const line = ctx.resolveRef(c.lineId) as any;
    const p1 = line.point1; const p2 = line.point2;
    const sx = (p1 && p2) ? p1.X() + c.t * (p2.X() - p1.X()) : c.t;
    const sy = (p1 && p2) ? p1.Y() + c.t * (p2.Y() - p1.Y()) : c.t;
    return board.create('glider', [sx, sy, line], opts);
  },
});
```
Kind có validate-arm (circumcenter/incenter/centroid[Batch2]/orthocenter[Batch3]): copy block validate tương ứng vào module `validate(c){...}`. Batch 1 có circumcenter+incenter (move 2 validate block point.ts:83-98 + 91-98).

- [ ] **Step 2: Register** — `registry.ts` import 10 module + push vào `ALL`.

- [ ] **Step 3: Gỡ inline arm đã migrate khỏi point.ts** — xoá 10 if-block render + 10 describe-arm + 2 validate-block (circumcenter/incenter) khỏi point.ts switch. (Registry giờ xử lý → strangler đi qua module.)

- [ ] **Step 4: Verify** — `npx jest point.render.golden point.describe.golden --ci` → **0 written** (10 kind giờ qua registry, output y hệt). `npx jest point --ci` PASS. `npm test` PASS. typecheck clean.

- [ ] **Step 5: Commit** `refactor(scene): migrate Batch 1 native/glider → point-constraints (Phase 4, #45)`

---

## Task 3: Batch 2 — function-coords kinds (7)

Migrate: **centroid, arcMidpoint, excenter, pointAtDistance, circleIntersection, secondIntersection, tangencyPoint**.

**Files:** Create 7 module + modify registry/point.ts (như Task 2).

- [ ] **Step 1: Module** — move verbatim. centroid/arcMidpoint/excenter/pointAtDistance dùng function-coords + `makeDistanceFn`/`pointConstructions` (import từ `../pointConstructions` + `./shared`). centroid có validate? KHÔNG (point.ts validate không có centroid block — chỉ circum/in/centroid/ortho có; CHECK: point.ts:99-106 CÓ centroid validate → move vào centroid.ts). circleIntersection/secondIntersection/tangencyPoint = native (move render+describe verbatim từ point.ts:424-451 + describe arms nếu có — các kind này KHÔNG có describe arm riêng → describe trả fallback; ⇒ trong module describe trả `\`Điểm ${obj.label}\`` để giữ y hệt fallback). **Đọc point.ts xác nhận kind nào có describe-arm riêng** (free/onAxis/onLine/onSegment/onCircle/onPolygon/midpoint/transformed/perpFoot/circumcenter/incenter/centroid/orthocenter/tangentPointExt/arcMidpoint/excenter/pointAtDistance CÓ; circleIntersection/secondIntersection/tangencyPoint KHÔNG → fallback). Module cho kind không có arm: `describe: (obj) => \`Điểm ${obj.label}\``.

- [ ] **Step 2-3: Register + gỡ inline arm** khỏi point.ts.

- [ ] **Step 4: Verify** — golden `--ci` **0 written** (function-coords ra coords số y hệt). `npx jest point.pointAtDistance point.intersection --ci` PASS (test cũ). `npm test` PASS.

- [ ] **Step 5: Commit** `refactor(scene): migrate Batch 2 function-coords → point-constraints (Phase 4, #45)`

---

## Task 4: Batch 3 — aux/_helpers/drag-sync kinds (6)

Migrate: **transformed, orthocenter, onPerpendicular, onPerpBisector, onCircleAroundPoint, tangentPointExt**. RỦI RO CAO NHẤT — `_helpers` + glider drag-sync.

**Files:** Create 6 module + modify registry/point.ts.

- [ ] **Step 1: Module** — move verbatim, GIỮ NGUYÊN:
  - `_helpers` attachment: transformed `pt._helpers = transforms` (point.ts:274); orthocenter `ortho._helpers=[lineBC,altA,lineAC,altB]` (336); onPerpendicular `gl._helpers=[refLine,perpLine]` (361); onPerpBisector `gl._helpers=[refLine,mid,bisLine]` (388); onCircleAroundPoint `gl._helpers=[auxCircle]` (404); tangentPointExt `inter._helpers=[mid,thales]` (421).
  - aux element creation order + `hide` attrs + glider seed math — verbatim.
  - transformed dùng `buildJxgTransforms` (từ `./shared`); describe transformed (point.ts:157-168) rẽ theo transform.kind — move verbatim.
  - validate: orthocenter có block (point.ts:107-114) → move vào orthocenter.ts. (transformed/onPerpendicular/onPerpBisector/onCircleAroundPoint KHÔNG có validate block → không validate.)

- [ ] **Step 2-3: Register + gỡ inline arm.** Sau Task 4, point.ts render/describe/validate switch **rỗng** (chỉ còn registry dispatch + fallback). Xác nhận: point.ts render = `buildPointOpts → POINT_CONSTRAINTS.get(c.kind)?.render(...) ?? board.create('point',[0,0],opts)`; describe = `mod?.describe(...) ?? \`Điểm ${obj.label}\``; validate = check kind tồn tại + `mod?.validate?.(c)`.

- [ ] **Step 4: Verify (KỸ)** — golden render `--ci` **0 written**, đặc biệt soi `_helpers` 6 kind khớp + glider seed coords khớp. `npx jest point.glider-seed point.constraint.special --ci` PASS. **Drag-sync smoke:** xác nhận `JxgRenderer` attachGliderDragSync/attachFreePointDragSync vẫn nhận constraint kind đúng (constraint shape không đổi → OK; nếu có test drag-sync chạy nó). `npm test` PASS. `npx tsx scripts/diag-deterministic.ts scripts/probes-adversarial.txt` 37/16. `npm run check:matrix` 34/34.

- [ ] **Step 5: Commit** `refactor(scene): migrate Batch 3 aux/_helpers/drag-sync → point-constraints; point.ts switch rỗng (Phase 4, #45)`

---

## Task 5: Result doc + close-out Mức 3

**Files:** Create `docs/superpowers/results/2026-06-07-deterministic-first-muc3-phase4.md`

- [ ] **Step 1: Final verify** — `npm test` PASS/0 fail; `npm run typecheck` clean; golden render+describe `--ci` 0 written; `npx jest point --ci` PASS; diag 37/16; check:matrix 34/34.

- [ ] **Step 2: Result doc** — ghi: point.ts switch render/describe/validate → registry; số module; bất biến giữ (_helpers/drag-sync/opts); golden render-level approach + limitation (mock-board không phải JSXGraph runtime thật); Mức 3 hoàn tất. Cập nhật memory `project_ai_muc3_registry` (Phase 4 done).

- [ ] **Step 3: Commit + push + đóng issue #45**

```bash
git add docs/superpowers/results/2026-06-07-deterministic-first-muc3-phase4.md
git commit -m "docs: kết quả Mức 3 Phase 4 point-constraints registry (issue #45)"
# (controller: ff-merge main + push + gh issue close 45)
```

---

## Self-review

- **Spec coverage:** A→Task 0; B(registry+strangler)→Task 1; C(3 batch)→Task 2/3/4; D(invariants)→ràng buộc trong mỗi task; E→Task 0-5. ✓
- **Strangler giữ golden xanh mọi bước:** registry rỗng (Task 1) → mọi kind inline; mỗi batch migrate + gỡ arm → kind đó qua registry, phần còn lại vẫn inline → luôn byte-identical. ✓
- **Placeholder:** harness + _types + shared + registry đầy đủ code; move-task ghi line-range nguồn + "verbatim". Scenario/CASES bảng liệt kê đủ kind (implementer transcribe + đọc point.ts cho shape chính xác — không phải "implement later"). ✓
- **Type consistency:** `PointConstraintModule`/`definePointConstraint`/`POINT_CONSTRAINTS`/`buildPointOpts`/`PointAttrs` (re-export) nhất quán Task 1→4. `c as never` tại biên dispatch (registry value generic-erased) giống OP_BUILDERS. ✓
- **Circular import:** point.ts (value)→registry→<kind>→_types; _types chỉ type + `definePointConstraint` (value, không import point.ts). PointAttrs ở _types (point.ts re-export) → không cycle runtime. ✓
- **Rủi ro Batch 3:** _helpers + glider seed + drag-sync — golden snapshot `_helpers` + seed coords; constraint shape không đổi → JxgRenderer drag-sync nguyên.
