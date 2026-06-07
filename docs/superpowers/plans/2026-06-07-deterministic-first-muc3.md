# Mức 3 — registry-hoá intent-builders + tool finalize + capability matrix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Registry-hoá 2 file switch trung tâm (`intentToDsl.ts`, `finalizeShape.ts`) + dựng capability matrix machine-checkable, behavior-preserving (output byte-identical), defer Phase 4 (point.ts).

**Architecture:** Noi theo precedent `ai/rules/registry.ts` (import-based, registry là dispatch table; engine không đổi). `BuildState`/`HandlerCtx` shared mutable giữ nguyên, builder/tool-module nhận state làm tham số. Golden Jest snapshot trên 2 mặt pure (`intent→DSL`, `picks→dispatched-actions`) làm lưới byte-identical. Matrix introspect các registry (DSL/intent-builder/tool/rule) + manifest declarative để bắt construct thiếu lớp.

**Tech Stack:** TypeScript strict, Jest 29 + ts-jest, `npx tsx` cho script. Spec: `docs/superpowers/specs/2026-06-07-deterministic-first-muc3-design.md`.

**Quy ước verify (chạy sau MỖI task có thay đổi runtime):**
- `npm test` — full suite, baseline **2060 pass** (sẽ tăng khi thêm test mới; 0 fail).
- `npx tsx scripts/diag-deterministic.ts scripts/probes-adversarial.txt` — baseline **37 deterministic-render / 16 escalate**, **0 regress**.
- `npm run typecheck` — clean.
- Golden snapshot phải xanh **không** dùng `-u` sau Task 0.

**File naming decision (refine spec):** Phase 2 add-point + Phase 5 tool modules **gom theo family file** (không 1-file-mỗi-construct), vì nhiều handler chỉ 5–8 dòng; registry.ts vẫn là single dispatch/append point. "Construct mới = thêm 1 builder/module object + 1 dòng import-register", không sửa switch.

---

## Task 0: Golden snapshot baseline (foundation)

Sinh lưới an toàn TRƯỚC mọi refactor. Snapshot `.snap` được commit như baseline; mọi task sau phải giữ xanh.

**Files:**
- Create: `scripts/gen-intent-corpus.ts`
- Create: `src/stamps/geometry-2d/ai/__tests__/__fixtures__/intent-corpus.curated.ts`
- Create (generated, committed): `src/stamps/geometry-2d/ai/__tests__/__fixtures__/intent-corpus.generated.json`
- Create: `src/stamps/geometry-2d/ai/__tests__/intentToDsl.golden.test.ts`
- Create: `src/stamps/geometry-2d/editor/handlers/__tests__/finalizeShape.golden.test.ts`

- [ ] **Step 1: Viết generator corpus từ probes**

Mở `scripts/diag-deterministic.ts`, copy đúng dòng `import { tryDeterministicFigure } from ...` (giữ path giống hệt). Tạo `scripts/gen-intent-corpus.ts`:

```ts
// scripts/gen-intent-corpus.ts
// Sinh corpus {problem, intents} từ probes render deterministic — đóng băng làm
// golden input cho intentToDsl.golden.test.ts. Chạy 1 lần TRƯỚC refactor, commit JSON.
import { readFileSync, writeFileSync } from 'node:fs';
import { tryDeterministicFigure } from '../src/stamps/geometry-2d/ai/deterministic'; // ← chỉnh path khớp diag-deterministic.ts

const probeFile = 'scripts/probes-adversarial.txt';
const lines = readFileSync(probeFile, 'utf8')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'));

const corpus: { problem: string; intents: unknown[] }[] = [];
for (const problem of lines) {
  const r = tryDeterministicFigure(problem);
  if (r.ok && r.figure?.intents?.length) {
    corpus.push({ problem, intents: r.figure.intents });
  }
}
const out = 'src/stamps/geometry-2d/ai/__tests__/__fixtures__/intent-corpus.generated.json';
writeFileSync(out, JSON.stringify(corpus, null, 2) + '\n');
console.log(`Wrote ${corpus.length} cases → ${out}`);
```

> Nếu `tryDeterministicFigure` không export từ `deterministic` barrel hoặc shape `r.figure.intents` khác, mở `scripts/diag-deterministic.ts` (đã dùng đúng API) và copy y hệt cách nó gọi + đọc intents.

- [ ] **Step 2: Chạy generator + verify số case**

Run: `npx tsx scripts/gen-intent-corpus.ts`
Expected: in `Wrote N cases` với **N ≥ 30** (≈ số probe render). File JSON xuất hiện. Nếu N < 20 → import/shape sai, sửa Step 1.

- [ ] **Step 3: Viết curated corpus (phủ MỌI builder branch)**

Tạo `intent-corpus.curated.ts`. Mỗi case là một SEQUENCE intent đầy đủ (draw-shape tạo điểm trước, rồi op cần test). Phủ đủ các nhánh bảng dưới (mỗi dòng = 1 entry trong mảng export):

| # | Mô tả | intents (sau `draw-shape triangle ABC` = `{op:'draw-shape',shape:'triangle',variant:'any',labels:['A','B','C']}` trừ khi ghi khác) |
|---|---|---|
| 1 | draw-shape mọi shape×variant | mỗi `{op:'draw-shape',shape,variant,labels}` cho: triangle(any/equilateral/isoceles-AB/isoceles-BC/isoceles-CA/right-at-A/right-at-B/right-at-C 3 nhãn), square(standard 4), rectangle(standard/wide/tall 4), rhombus(standard 4), trapezoid(right/isoceles/general 4), parallelogram(standard 4), quadrilateral(any 4) |
| 2 | draw-shape + explicitCoords | `{op:'draw-shape',shape:'triangle',variant:'any',labels:['A','B','C'],explicitCoords:{A:[1,1]}}` |
| 3 | add-point midpoint | +`{op:'add-point',name:'M',constraint:{kind:'midpoint',of:'AB'}}` |
| 4 | perpFoot | +`{op:'add-point',name:'H',constraint:{kind:'perpFoot',from:'A',onLine:'BC'}}` |
| 5 | centroid/circumcenter/incenter/orthocenter | +`{...,constraint:{kind:'<k>',of:['A','B','C']}}` (4 case) |
| 6 | intersection | dựng ABC + DEF rồi +`{...,constraint:{kind:'intersection',of:['AB','DE']}}` |
| 7 | onSegment (có & không `t`) | +`{...,constraint:{kind:'onSegment',of:'AB',t:0.3}}` và bỏ `t` |
| 8 | free (có & không `at`) | +`{op:'add-point',name:'P',constraint:{kind:'free',at:[2,2]}}` và bỏ `at` (test defaultFreeCoord) |
| 9 | secondIntersection | +`{...,constraint:{kind:'secondIntersection',line:'AB',circle:'O',other:'P'}}` |
| 10 | circleIntersection | +`{...,constraint:{kind:'circleIntersection',c1:'O1',c2:'O2',which:0}}` |
| 11 | tangencyPoint | +`{...,constraint:{kind:'tangencyPoint',circle:'O',onLine:'AB'}}` |
| 12 | tangentPoint | +`{...,constraint:{kind:'tangentPoint',from:'P',circle:'O',which:0}}` |
| 13 | angleBisectorFoot | +`{...,constraint:{kind:'angleBisectorFoot',from:'A',onLine:'BC'}}` |
| 14 | arcMidpoint | +`{...,constraint:{kind:'arcMidpoint',circle:'O',a:'A',b:'B',notContaining:'C'}}` |
| 15 | reflectPoint | +`{...,constraint:{kind:'reflectPoint',of:'A',through:'O'}}` |
| 16 | reflectLine | +`{...,constraint:{kind:'reflectLine',of:'A',through:'BC'}}` |
| 17 | excenter | +`{...,constraint:{kind:'excenter',of:['A','B','C'],opposite:'A'}}` |
| 18 | rightAngleViewing (có & không `which`) | +`{...,name:'M',constraint:{kind:'rightAngleViewing',a:'A',b:'B',onLine:'d',which:0}}` |
| 19 | pointAtDistance × 3 nguồn | +`{...,constraint:{kind:'pointAtDistance',from:'A',through:'B',distance:{kind:'literal',value:3}}}`; tương tự `{kind:'circleRadius',circle:'O'}`, `{kind:'segmentLength',p1:'A',p2:'B'}` |
| 20 | connect mọi style | +`{op:'connect',from:'A',to:'B',style:'<s>'}` cho segment/line/ray/perpBisector (KHÔNG angleBisector — nó throw, test riêng ở Step 4 nếu cần) |
| 21 | draw-circle mọi spec | `centerThrough`{name:'O',spec,center:'A',through:'B'}; `through3`{name:'O',spec,points:['A','B','C']}; `centerRadius`{name:'O',spec,center:'K',radius:3} (center chưa có → auto free); `inscribedIn`{name:'O',spec,triangle:['A','B','C']} |
| 22 | draw-line mọi kind | `perpThrough`{name:'d',kind,through:'A',to:'BC'}; `parallelThrough` tương tự; `tangentAt`{name:'t',kind,through:'A',circle:'O'}; `tangentFromExt` which:'both'{name:'t',kind,from:'P',circle:'O',which:'both'} và which:'first' |
| 23 | mark-shape | dựng ABC rồi +`{op:'mark-shape',shape:'polygon',labels:['A','B','C']}` |

Format file:

```ts
// intent-corpus.curated.ts
import type { IntentT } from '../../intent';

export const CURATED_CORPUS: { name: string; intents: IntentT[] }[] = [
  { name: 'triangle-any', intents: [{ op: 'draw-shape', shape: 'triangle', variant: 'any', labels: ['A', 'B', 'C'] }] as IntentT[] },
  { name: 'midpoint-AB', intents: [
      { op: 'draw-shape', shape: 'triangle', variant: 'any', labels: ['A', 'B', 'C'] },
      { op: 'add-point', name: 'M', constraint: { kind: 'midpoint', of: 'AB' } },
    ] as IntentT[] },
  // ... (transcribe toàn bộ bảng trên; cast `as IntentT[]` mỗi entry)
];
```

> Mỗi entry phải transpile-không-throw qua `intentsToDsl`. Cứ thêm draw-shape phù hợp để mọi tên điểm tham chiếu đã tồn tại. Nếu TS phàn nàn shape constraint, mở `src/stamps/geometry-2d/ai/intent.ts` xem Zod field chính xác.

- [ ] **Step 4: Viết golden snapshot test cho intentToDsl**

```ts
// intentToDsl.golden.test.ts
import { intentsToDsl } from '../intentToDsl';
import type { IntentT } from '../intent';
import { CURATED_CORPUS } from './__fixtures__/intent-corpus.curated';
import generated from './__fixtures__/intent-corpus.generated.json';

describe('intentsToDsl — golden (behavior-preserving Mức 3)', () => {
  for (const c of CURATED_CORPUS) {
    test(`curated: ${c.name}`, () => {
      expect(intentsToDsl(c.intents)).toMatchSnapshot();
    });
  }
  (generated as { problem: string; intents: IntentT[] }[]).forEach((c, i) => {
    test(`generated[${i}]: ${c.problem.slice(0, 50)}`, () => {
      expect(intentsToDsl(c.intents)).toMatchSnapshot();
    });
  });
});
```

> Cần `resolveJsonModule` trong tsconfig (kiểm tra; jest ts-jest thường OK). Nếu import JSON lỗi → đọc bằng `readFileSync(__dirname+'/__fixtures__/intent-corpus.generated.json')` + `JSON.parse`.

- [ ] **Step 5: Viết golden snapshot test cho finalizeShape**

Mock mở rộng `mkCtx` (theo `finalizeShape.test.ts`): hỗ trợ elementClass (1=point,2=line,3=circle theo `objKind` — **đọc `tools.ts` `objKind()` để xác nhận mapping**), vị trí X/Y, `jxgFromSceneId` trả vị trí từ map, và circle geom cho tangent.

```ts
// finalizeShape.golden.test.ts
import { finalizeShape } from '../finalizeShape';
import type { HandlerCtx } from '../ctx';
import type { ToolDef } from '../../tools';

type Pick = { id: string; cls: 1 | 2 | 3; x?: number; y?: number; center?: { x: number; y: number; r: number } };

function mkCtx(picks: Pick[]): { ctx: HandlerCtx; dispatched: any[] } {
  const dispatched: any[] = [];
  const jxgByPick = picks.map((p) => {
    const o: any = { elementClass: p.cls, X: () => p.x ?? 0, Y: () => p.y ?? 0 };
    if (p.center) o.center = { X: () => p.center!.x, Y: () => p.center!.y }, (o.Radius = () => p.center!.r);
    return o;
  });
  const posById: Record<string, { x: number; y: number }> = {};
  picks.forEach((p) => { posById[p.id] = { x: p.x ?? 0, y: p.y ?? 0 }; });
  const ctx = {
    pendingRef: { current: jxgByPick },
    pendingIdsRef: { current: picks.map((p) => p.id) },
    store: {
      getState: () => ({ counter: 0, objects: {}, order: [], meta: { domain: '2d', version: 1 } }),
      dispatch: (a: any) => dispatched.push(a),
    },
    nextLabel: (kind: string) => `${kind}_label`,
    jxgFromSceneId: (id: string) => {
      const p = posById[id]; return p ? { X: () => p.x, Y: () => p.y } : null;
    },
    flashWarn: jest.fn(), refreshPreview: jest.fn(), findNearestPointJxg: jest.fn(),
    emitTransform: jest.fn(), setPendingCount: jest.fn(), clearPending: jest.fn(),
    pendingTransformRef: { current: null }, jxgIdToSceneId: jest.fn(), toast: jest.fn(),
  } as unknown as HandlerCtx;
  return { ctx, dispatched };
}

function td(key: string, extra: Partial<ToolDef> = {}): ToolDef {
  return { key, label: '', hint: '', icon: null as any, group: 'construct', needs: 2, ...extra } as ToolDef;
}

// Scenario table — 1 entry/tool. Vị trí chọn sao cho nhánh hình học xác định
// (tangent outside/on; arc3 non-collinear; parametric đọc X/Y).
const SCENARIOS: { name: string; picks: Pick[]; tool: ToolDef; clickXY?: { x: number; y: number } }[] = [
  { name: 'segment', picks: [{ id: 'A', cls: 1 }, { id: 'B', cls: 1 }], tool: td('segment') },
  { name: 'line', picks: [{ id: 'A', cls: 1 }, { id: 'B', cls: 1 }], tool: td('line') },
  { name: 'perpendicular', picks: [{ id: 'A', cls: 1 }, { id: 'l1', cls: 2 }], tool: td('perpendicular', { accepts: ['point', 'line'] }) },
  { name: 'parallel', picks: [{ id: 'A', cls: 1 }, { id: 'l1', cls: 2 }], tool: td('parallel', { accepts: ['point', 'line'] }) },
  { name: 'perpBisector', picks: [{ id: 'A', cls: 1 }, { id: 'B', cls: 1 }], tool: td('perpBisector') },
  { name: 'angleBisector-3pt', picks: [{ id: 'A', cls: 1 }, { id: 'V', cls: 1 }, { id: 'B', cls: 1 }], tool: td('angleBisector', { needs: 3 }) },
  { name: 'angleBisector-2line', picks: [{ id: 'L1', cls: 2 }, { id: 'L2', cls: 2 }], tool: td('angleBisector', { needs: 3 }) },
  { name: 'tangent-on', picks: [{ id: 'P', cls: 1, x: 5, y: 0 }, { id: 'O', cls: 3, center: { x: 0, y: 0, r: 5 } }], tool: td('tangent') },
  { name: 'tangent-outside', picks: [{ id: 'P', cls: 1, x: 10, y: 0 }, { id: 'O', cls: 3, center: { x: 0, y: 0, r: 5 } }], tool: td('tangent') },
  { name: 'tangent-inside', picks: [{ id: 'P', cls: 1, x: 1, y: 0 }, { id: 'O', cls: 3, center: { x: 0, y: 0, r: 5 } }], tool: td('tangent') },
  { name: 'ray', picks: [{ id: 'A', cls: 1 }, { id: 'B', cls: 1 }], tool: td('ray') },
  { name: 'vector', picks: [{ id: 'A', cls: 1 }, { id: 'B', cls: 1 }], tool: td('vector') },
  { name: 'circleCenter', picks: [{ id: 'O', cls: 1 }, { id: 'A', cls: 1 }], tool: td('circleCenter') },
  { name: 'circle3', picks: [{ id: 'A', cls: 1 }, { id: 'B', cls: 1 }, { id: 'C', cls: 1 }], tool: td('circle3', { needs: 3 }) },
  { name: 'semicircle', picks: [{ id: 'A', cls: 1 }, { id: 'B', cls: 1 }], tool: td('semicircle') },
  { name: 'arcCenter', picks: [{ id: 'O', cls: 1 }, { id: 'A', cls: 1 }, { id: 'B', cls: 1 }], tool: td('arcCenter', { needs: 3 }) },
  { name: 'arc3', picks: [{ id: 'A', cls: 1, x: 0, y: 0 }, { id: 'B', cls: 1, x: 1, y: 1 }, { id: 'C', cls: 1, x: 2, y: 0 }], tool: td('arc3', { needs: 3 }) },
  { name: 'sectorCenter', picks: [{ id: 'O', cls: 1 }, { id: 'A', cls: 1 }, { id: 'B', cls: 1 }], tool: td('sectorCenter', { needs: 3 }) },
  { name: 'midpoint', picks: [{ id: 'A', cls: 1 }, { id: 'B', cls: 1 }], tool: td('midpoint') },
  { name: 'perpFoot', picks: [{ id: 'A', cls: 1 }, { id: 'l1', cls: 2 }], tool: td('perpFoot', { accepts: ['point', 'line'] }) },
  { name: 'centroid', picks: [{ id: 'A', cls: 1 }, { id: 'B', cls: 1 }, { id: 'C', cls: 1 }], tool: td('centroid', { needs: 3 }) },
  { name: 'circumcenter', picks: [{ id: 'A', cls: 1 }, { id: 'B', cls: 1 }, { id: 'C', cls: 1 }], tool: td('circumcenter', { needs: 3 }) },
  { name: 'incenter', picks: [{ id: 'A', cls: 1 }, { id: 'B', cls: 1 }, { id: 'C', cls: 1 }], tool: td('incenter', { needs: 3 }) },
  { name: 'orthocenter', picks: [{ id: 'A', cls: 1 }, { id: 'B', cls: 1 }, { id: 'C', cls: 1 }], tool: td('orthocenter', { needs: 3 }) },
  { name: 'angle', picks: [{ id: 'A', cls: 1 }, { id: 'V', cls: 1 }, { id: 'B', cls: 1 }], tool: td('angle', { needs: 3 }) },
  { name: 'distance', picks: [{ id: 'A', cls: 1 }, { id: 'B', cls: 1 }], tool: td('distance') },
  { name: 'intersect-lineLine', picks: [{ id: 'l1', cls: 2 }, { id: 'l2', cls: 2 }], tool: td('intersect') },
  { name: 'intersect-lineCircle', picks: [{ id: 'l1', cls: 2 }, { id: 'O', cls: 3 }], tool: td('intersect') },
  { name: 'intersect-circleCircle', picks: [{ id: 'O1', cls: 3 }, { id: 'O2', cls: 3 }], tool: td('intersect') },
  { name: 'square', picks: [{ id: 'A', cls: 1 }, { id: 'B', cls: 1 }], tool: td('square') },
  { name: 'rectangle', picks: [{ id: 'A', cls: 1, x: 0, y: 0 }, { id: 'B', cls: 1, x: 4, y: 0 }, { id: 'C', cls: 1, x: 4, y: 3 }], tool: td('rectangle', { needs: 3 }) },
  { name: 'rhombus', picks: [{ id: 'A', cls: 1, x: 0, y: 0 }, { id: 'B', cls: 1, x: 4, y: 0 }, { id: 'C', cls: 1, x: 6, y: 2 }], tool: td('rhombus', { needs: 3 }) },
  { name: 'parallelogram', picks: [{ id: 'A', cls: 1 }, { id: 'B', cls: 1 }, { id: 'C', cls: 1 }], tool: td('parallelogram', { needs: 3 }) },
  { name: 'isoTrapezoid', picks: [{ id: 'A', cls: 1 }, { id: 'B', cls: 1 }, { id: 'C', cls: 1 }], tool: td('isoTrapezoid', { needs: 3 }) },
  { name: 'isoTriangle', picks: [{ id: 'A', cls: 1, x: 0, y: 0 }, { id: 'B', cls: 1, x: 4, y: 0 }, { id: 'C', cls: 1, x: 2, y: 3 }], tool: td('isoTriangle', { needs: 3 }) },
  { name: 'rightTriangle', picks: [{ id: 'R', cls: 1, x: 0, y: 0 }, { id: 'P1', cls: 1, x: 4, y: 0 }, { id: 'P2', cls: 1, x: 0, y: 3 }], tool: td('rightTriangle', { needs: 3 }) },
  { name: 'excenter', picks: [{ id: 'A', cls: 1 }, { id: 'B', cls: 1 }, { id: 'C', cls: 1 }], tool: td('excenter', { needs: 3 }) },
  { name: 'tangencyPoint', picks: [{ id: 'O', cls: 3 }, { id: 'l1', cls: 2 }], tool: td('tangencyPoint', { accepts: ['circle', 'line'] }) },
  { name: 'secondIntersection', picks: [{ id: 'l1', cls: 2 }, { id: 'O', cls: 3 }, { id: 'P', cls: 1 }], tool: td('secondIntersection', { needs: 3 }) },
  { name: 'arcMidpoint', picks: [{ id: 'O', cls: 3 }, { id: 'A', cls: 1 }, { id: 'B', cls: 1 }, { id: 'C', cls: 1 }], tool: td('arcMidpoint', { needs: 4 }) },
  { name: 'circleIntersection', picks: [{ id: 'O1', cls: 3 }, { id: 'O2', cls: 3 }], tool: td('circleIntersection') },
  { name: 'tangentPointExt', picks: [{ id: 'P', cls: 1 }, { id: 'O', cls: 3 }], tool: td('tangentPointExt') },
  { name: 'incircle', picks: [{ id: 'A', cls: 1 }, { id: 'B', cls: 1 }, { id: 'C', cls: 1 }], tool: td('incircle', { needs: 3 }) },
  { name: 'excircle', picks: [{ id: 'A', cls: 1 }, { id: 'B', cls: 1 }, { id: 'C', cls: 1 }], tool: td('excircle', { needs: 3 }) },
  { name: 'pointOn-circle', picks: [{ id: 'O', cls: 3, center: { x: 0, y: 0, r: 5 } }], tool: td('pointOn', { needs: 1 }), clickXY: { x: 5, y: 0 } },
];

describe('finalizeShape — golden (behavior-preserving Mức 3)', () => {
  for (const sc of SCENARIOS) {
    test(sc.name, () => {
      const { ctx, dispatched } = mkCtx(sc.picks);
      finalizeShape(ctx, sc.tool, sc.clickXY);
      expect(dispatched).toMatchSnapshot();
    });
  }
});
```

> **Quan trọng:** tangent/intersect/perpFoot... dùng `objKind(pendingRef[i])` → đọc `tools.ts` xác nhận `objKind` map `elementClass` 1/2/3 → point/line/circle thế nào; chỉnh `cls` cho khớp. tangent dùng `classifyPointVsCircle(through, circle)` → đọc `classifyPointVsCircle.ts` xác nhận field circle nó đọc (`center.X/Y` + radius getter tên gì) rồi chỉnh mock. Mục tiêu: 3 scenario tangent ra 3 nhánh on/outside/inside; pointOn ra onCircle. Nếu một tool ra `dispatched=[]` ngoài ý muốn (thiếu pick role), sửa picks.

- [ ] **Step 6: Sinh baseline snapshot + verify pipeline xanh**

Run: `npm test -- intentToDsl.golden finalizeShape.golden`
Expected: PASS, tạo 2 file `.snap` (snapshot written). Mở `.snap` review nhanh: DSL/actions hợp lý, id deterministic (`*_1`), không `[object Object]`.

Run: `npm test` → Expected: PASS (2060 + số test golden mới).
Run: `npx tsx scripts/diag-deterministic.ts scripts/probes-adversarial.txt` → Expected: `=== 37 deterministic-render, 16 escalate ===`.

- [ ] **Step 7: Commit baseline**

```bash
git add scripts/gen-intent-corpus.ts \
  src/stamps/geometry-2d/ai/__tests__/__fixtures__/ \
  src/stamps/geometry-2d/ai/__tests__/intentToDsl.golden.test.ts \
  src/stamps/geometry-2d/ai/__tests__/__snapshots__/intentToDsl.golden.test.ts.snap \
  src/stamps/geometry-2d/editor/handlers/__tests__/finalizeShape.golden.test.ts \
  src/stamps/geometry-2d/editor/handlers/__tests__/__snapshots__/finalizeShape.golden.test.ts.snap
git commit -m "test: golden snapshot baseline intent→DSL + picks→actions (lưới Mức 3, issue #45)"
```

---

## Task 1: Phase 2a — tách shared helpers + types ra `intent-builders/`

Bước move thuần: kéo helper + canonical tables + `BuildState` + `IntentBuilderError` ra module riêng; `intentToDsl.ts` import lại. KHÔNG đổi logic → golden phải giữ xanh.

**Files:**
- Create: `src/stamps/geometry-2d/ai/intent-builders/_types.ts`
- Create: `src/stamps/geometry-2d/ai/intent-builders/shared.ts`
- Modify: `src/stamps/geometry-2d/ai/intentToDsl.ts`

- [ ] **Step 1: Tạo `_types.ts`**

Move `BuildState` interface (intentToDsl.ts:118-126), `newState()` (128-136), và `IntentBuilderError` (103-112) vào đây. Thêm builder type:

```ts
// intent-builders/_types.ts
import type { DslPointT, DslShapeT } from '../../dsl/schema';
import type { IntentT } from '../intent';

export interface BuildState {
  points: DslPointT[];
  shapes: DslShapeT[];
  pointNames: Set<string>;
  shapeNames: Set<string>;
  segmentByEnds: Map<string, string>;
}

export function newState(): BuildState {
  return { points: [], shapes: [], pointNames: new Set(), shapeNames: new Set(), segmentByEnds: new Map() };
}

export class IntentBuilderError extends Error {
  constructor(message: string, public readonly intent: IntentT, public readonly cause?: string) {
    super(message);
    this.name = 'IntentBuilderError';
  }
}

/** Builder mutate BuildState theo 1 intent op (idempotent, giữ thứ tự gọi). */
export type IntentBuilder<T extends IntentT = IntentT> = (s: BuildState, intent: T) => void;
```

- [ ] **Step 2: Tạo `shared.ts`**

Move verbatim từ `intentToDsl.ts` vào `shared.ts`, đổi để import `BuildState` từ `./_types`:
- Canonical tables + `Pt` type + `SQRT3` + `triangleCanonical/squareCanonical/rectangleCanonical/rhombusCanonical/trapezoidCanonical/parallelogramCanonical/quadrilateralCanonical` (intentToDsl.ts:25-97)
- `addPoint/FREE_DEFAULT_SPREAD/defaultFreeCoord/addShape/uniqueShapeName/uniquePointName/ensureSegment/resolveLineRefWithFallback/resolveSegmentRef/parseEnds` (138-238)
- `SHAPE_VARIANTS` (245-253)

Export tất cả (mỗi `function`/`const` thêm `export`). Đầu file:
```ts
// intent-builders/shared.ts
import type { BuildState } from './_types';
export type Pt = readonly [number, number];
// ... (toàn bộ helper + tables, mỗi cái `export`)
```

- [ ] **Step 3: Sửa `intentToDsl.ts` import lại**

Xoá phần đã move; thêm import:
```ts
import { newState, IntentBuilderError, type BuildState } from './intent-builders/_types';
import {
  addPoint, addShape, uniqueShapeName, uniquePointName, defaultFreeCoord,
  ensureSegment, resolveSegmentRef, resolveLineRefWithFallback, parseEnds,
  SHAPE_VARIANTS, triangleCanonical, squareCanonical, rectangleCanonical,
  rhombusCanonical, trapezoidCanonical, parallelogramCanonical, quadrilateralCanonical,
  type Pt,
} from './intent-builders/shared';
```
Giữ `export class IntentBuilderError` → đổi thành re-export: `export { IntentBuilderError } from './intent-builders/_types';`. Các handler + `intentsToDsl` giữ nguyên trong file (chưa tách ở task này).

- [ ] **Step 4: Verify**

Run: `npm run typecheck` → clean.
Run: `npm test -- intentToDsl.golden intentToDsl.test` → PASS (snapshot **không** đổi).
Run: `npm test` → PASS.
Run: `npx tsx scripts/diag-deterministic.ts scripts/probes-adversarial.txt` → `37 / 16`.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/ai/intent-builders/ src/stamps/geometry-2d/ai/intentToDsl.ts
git commit -m "refactor(ai): tách BuildState + helpers ra intent-builders/{_types,shared} (Phase 2a, #45)"
```

---

## Task 2: Phase 2b — tách op handlers thành builder modules + registry

`intentToDsl.ts` → orchestrator mỏng dùng `OP_BUILDERS`. Mỗi handler move ra module, đổi reference helper thành import từ `./shared`.

**Files:**
- Create: `intent-builders/draw-shape.ts`, `connect.ts`, `draw-circle.ts`, `draw-line.ts`, `mark-shape.ts`
- Create: `intent-builders/add-point/index.ts` (+ family: `midpoint.ts`, `perpFoot.ts`, `centers.ts`, `intersections.ts`, `onSegment-free.ts`, `tangency.ts`, `angleBisectorFoot.ts`, `rightAngleViewing.ts`, `arcMidpoint.ts`, `reflect.ts`, `excenter.ts`, `pointAtDistance.ts`)
- Create: `intent-builders/registry.ts`
- Modify: `src/stamps/geometry-2d/ai/intentToDsl.ts`

- [ ] **Step 1: Move op handlers (trừ add-point)**

Mỗi file export 1 builder, move body verbatim từ intentToDsl.ts, import helper từ `./shared` + `IntentBuilderError`/`BuildState` từ `./_types`:
- `draw-shape.ts` → `export const buildDrawShape: IntentBuilder<DrawShapeIntentT>` ← `handleDrawShape` (255-294)
- `connect.ts` → `buildConnect` ← `handleConnect` (420-443)
- `draw-circle.ts` → `buildDrawCircle` ← `handleDrawCircle` (449-489)
- `draw-line.ts` → `buildDrawLine` ← `handleDrawLine` (495-526)
- `mark-shape.ts` → `buildMarkShape` ← `handleMarkShape` (532-540)

Ví dụ `connect.ts`:
```ts
import type { IntentBuilder } from './_types';
import { IntentBuilderError } from './_types';
import { ensureSegment, addShape, uniqueShapeName } from './shared';
import type { ConnectIntentT } from '../intent';

export const buildConnect: IntentBuilder<ConnectIntentT> = (s, intent) => {
  const { from, to, style } = intent;
  switch (style) {
    case 'segment': ensureSegment(s, from, to); break;
    case 'line': addShape(s, { name: uniqueShapeName(s, `l_${from}${to}`), kind: 'line', p1: from, p2: to }); break;
    case 'ray': addShape(s, { name: uniqueShapeName(s, `r_${from}${to}`), kind: 'ray', origin: from, through: to }); break;
    case 'perpBisector': addShape(s, { name: uniqueShapeName(s, `pb_${from}${to}`), kind: 'perpBisector', p1: from, p2: to }); break;
    case 'angleBisector':
      throw new IntentBuilderError('connect.style=angleBisector cần 3 điểm; dùng add-point/incenter thay', intent);
  }
};
```

- [ ] **Step 2: Move add-point sub-handlers thành ADD_POINT_BUILDERS**

Tách 20 nhánh của `handleAddPoint` (300-414) thành builder theo `constraint.kind`. Mỗi family file export các builder. Signature: `(s: BuildState, intent: AddPointIntentT) => void` (đọc `intent.name`/`intent.constraint`). Gom:
- `midpoint.ts`: midpoint
- `perpFoot.ts`: perpFoot
- `centers.ts`: centroid, circumcenter, incenter, orthocenter, excenter
- `intersections.ts`: intersection, secondIntersection, circleIntersection
- `tangency.ts`: tangencyPoint, tangentPoint
- `onSegment-free.ts`: onSegment, free
- `angleBisectorFoot.ts`: angleBisectorFoot
- `rightAngleViewing.ts`: rightAngleViewing
- `arcMidpoint.ts`: arcMidpoint
- `reflect.ts`: reflectPoint, reflectLine
- `pointAtDistance.ts`: pointAtDistance

`add-point/index.ts` assemble map:
```ts
import type { BuildState } from '../_types';
import type { AddPointIntentT } from '../../intent';
import { buildMidpoint } from './midpoint';
// ... import phần còn lại
export const ADD_POINT_BUILDERS: Record<string, (s: BuildState, intent: AddPointIntentT) => void> = {
  midpoint: buildMidpoint, perpFoot: buildPerpFoot,
  centroid: buildCentroid, circumcenter: buildCircumcenter, incenter: buildIncenter,
  orthocenter: buildOrthocenter, excenter: buildExcenter,
  intersection: buildIntersection, secondIntersection: buildSecondIntersection, circleIntersection: buildCircleIntersection,
  tangencyPoint: buildTangencyPoint, tangentPoint: buildTangentPoint,
  onSegment: buildOnSegment, free: buildFree,
  angleBisectorFoot: buildAngleBisectorFoot, rightAngleViewing: buildRightAngleViewing,
  arcMidpoint: buildArcMidpoint, reflectPoint: buildReflectPoint, reflectLine: buildReflectLine,
  pointAtDistance: buildPointAtDistance,
};

export const buildAddPoint = (s: BuildState, intent: AddPointIntentT): void => {
  const fn = ADD_POINT_BUILDERS[intent.constraint.kind];
  if (fn) fn(s, intent);
};
```
> Mỗi builder nhận `intent.constraint` đã narrow theo kind. Vì `ADD_POINT_BUILDERS` map dùng key string, trong từng builder cast `const c = intent.constraint as Extract<...>` hoặc dùng `if (c.kind !== 'midpoint') return;` để TS narrow — chọn cách gọn, giữ logic y hệt nhánh gốc.

- [ ] **Step 3: Tạo `registry.ts`**

```ts
// intent-builders/registry.ts
import type { BuildState } from './_types';
import type { IntentT } from '../intent';
import { buildDrawShape } from './draw-shape';
import { buildAddPoint } from './add-point';
import { buildConnect } from './connect';
import { buildDrawCircle } from './draw-circle';
import { buildDrawLine } from './draw-line';
import { buildMarkShape } from './mark-shape';

export const OP_BUILDERS: Record<IntentT['op'], (s: BuildState, intent: any) => void> = {
  'draw-shape': buildDrawShape,
  'add-point': buildAddPoint,
  'connect': buildConnect,
  'draw-circle': buildDrawCircle,
  'draw-line': buildDrawLine,
  'mark-shape': buildMarkShape,
};
```

- [ ] **Step 4: Rút gọn `intentToDsl.ts` thành orchestrator**

```ts
// intentToDsl.ts (toàn file sau refactor)
import type { DslInputT } from '../dsl/schema';
import type { IntentT } from './intent';
import { repairCircleIntersections } from './repairCircleIntersections';
import { newState } from './intent-builders/_types';
import { OP_BUILDERS } from './intent-builders/registry';

export { IntentBuilderError } from './intent-builders/_types';

export function intentsToDsl(intents: readonly IntentT[]): DslInputT {
  const s = newState();
  for (const intent of intents) {
    const build = OP_BUILDERS[intent.op];
    if (build) build(s, intent);
  }
  repairCircleIntersections(s.points, s.shapes);
  return { version: 1, points: s.points, shapes: s.shapes };
}
```
> Giữ đúng thứ tự loop intents (ordering dependency). `repairCircleIntersections` post-dispatch. Public export không đổi.

- [ ] **Step 5: Verify (golden là chốt behavior-preserving)**

Run: `npm run typecheck` → clean.
Run: `npm test -- intentToDsl.golden intentToDsl.test` → PASS, **snapshot KHÔNG đổi** (nếu đổi → có lệch hành vi, soi diff `.snap`, KHÔNG `-u`).
Run: `npm test` → PASS.
Run: `npx tsx scripts/diag-deterministic.ts scripts/probes-adversarial.txt` → `37 / 16`.

- [ ] **Step 6: Commit**

```bash
git add src/stamps/geometry-2d/ai/intent-builders/ src/stamps/geometry-2d/ai/intentToDsl.ts
git commit -m "refactor(ai): intentToDsl thành orchestrator + OP_BUILDERS registry (Phase 2b, #45)"
```

---

## Task 3: Phase 5a — tách shared helpers + GeometryToolModule type

**Files:**
- Create: `src/stamps/geometry-2d/editor/handlers/finalize/_types.ts`
- Create: `src/stamps/geometry-2d/editor/handlers/finalize/shared.ts`
- Modify: `src/stamps/geometry-2d/editor/handlers/finalizeShape.ts`

- [ ] **Step 1: Tạo `_types.ts`**

```ts
// finalize/_types.ts
import type { ToolDef } from '../../tools';
import type { HandlerCtx } from '../ctx';

export interface GeometryToolModule {
  key: string;
  finalize(ctx: HandlerCtx, toolDef: ToolDef, clickXY?: { x: number; y: number }): void;
}
```

- [ ] **Step 2: Tạo `shared.ts`**

Move verbatim từ finalizeShape.ts: `findPickIdByKind` (13-20), `Vec` type + `readJxgPos` (24-31), `computePerpendicularT` (34-40), `computePerpBisectorT` (43-50), `computeCircleTheta` (52-54). Đầu file import:
```ts
// finalize/shared.ts
import { objKind } from '../../tools';
import type { HandlerCtx } from '../ctx';
export type Vec = { x: number; y: number };
export function findPickIdByKind(ctx: HandlerCtx, kind: 'point' | 'line' | 'circle'): string | null { /* move */ }
export function readJxgPos(ctx: HandlerCtx, id: string): Vec { /* move */ }
export function computePerpendicularT(P: Vec, T: Vec, A: Vec, B: Vec): number { /* move */ }
export function computePerpBisectorT(P: Vec, A: Vec, B: Vec): number { /* move */ }
export function computeCircleTheta(P: Vec, C: Vec): number { /* move */ }
```

- [ ] **Step 3: Sửa finalizeShape.ts import shared (chưa tách module tool)**

Xoá 5 helper đã move; thêm `import { findPickIdByKind, readJxgPos, computePerpendicularT, computePerpBisectorT, computeCircleTheta, type Vec } from './finalize/shared';`. Switch giữ nguyên. (Bước này chỉ để cô lập helper, golden phải xanh.)

- [ ] **Step 4: Verify**

Run: `npm run typecheck` → clean.
Run: `npm test -- finalizeShape` → PASS (golden + test cũ, snapshot không đổi).

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/editor/handlers/finalize/ src/stamps/geometry-2d/editor/handlers/finalizeShape.ts
git commit -m "refactor(editor): tách finalize helpers + GeometryToolModule type (Phase 5a, #45)"
```

---

## Task 4: Phase 5b — tách 40 case thành tool modules + registry

**Files:**
- Create: `finalize/lines.ts`, `finalize/circles.ts`, `finalize/points.ts`, `finalize/polygons.ts`, `finalize/measure.ts`
- Create: `finalize/registry.ts`
- Modify: `src/stamps/geometry-2d/editor/handlers/finalizeShape.ts`

- [ ] **Step 1: Move case bodies thành module object theo family**

Mỗi tool = `GeometryToolModule` object `{ key, finalize }`, body move verbatim từ case tương ứng (đổi `findPickIdByKind`... thành import từ `./shared`). Phân bổ:
- `lines.ts`: segment(60), line(69), perpendicular+parallel(78 — 2 module riêng cùng gọi helper chung), perpBisector(93), angleBisector(104), tangent(132), ray(174), vector(183)
- `circles.ts`: circleCenter(192), circle3(206), semicircle(219), arcCenter(236), arc3(253), sectorCenter(281), incircle(618), excircle(629)
- `points.ts`: midpoint(298), perpFoot(309), centroid(323), circumcenter(334), incenter(345), orthocenter(356), excenter(530), tangencyPoint(541), secondIntersection(555), arcMidpoint(570), circleIntersection(589), tangentPointExt(602), pointOn(640)
- `polygons.ts`: square(420), rectangle(431), rhombus(452), parallelogram+isoTrapezoid(472 — 2 module gọi nhánh `key`), isoTriangle(486), rightTriangle(508)
- `measure.ts`: angle(367), distance(381), intersect(390)

Ví dụ `lines.ts` (1 module + helper imports):
```ts
import type { GeometryToolModule } from './_types';
import { objKind } from '../../tools';
import { freshId, mkSceneObj, dispatchAddIntersection } from '../utils';
import { classifyPointVsCircle } from '../classifyPointVsCircle';
import { findPickIdByKind } from './shared';

export const segmentTool: GeometryToolModule = {
  key: 'segment',
  finalize(ctx) {
    const ids = ctx.pendingIdsRef.current;
    const id = freshId(ctx, 's');
    const label = ctx.nextLabel('segment');
    ctx.store.dispatch({ type: 'ADD', payload: { obj: mkSceneObj(id, 'segment', label, { p1: ids[0], p2: ids[1] }) } });
  },
};
// ... line/perpendicular/parallel/perpBisector/angleBisector/tangent/ray/vector
```
> perpendicular & parallel: 2 module object key `'perpendicular'`/`'parallel'`, finalize gọi helper chung `finalizePerpParallel(ctx, key)` định nghĩa trong file. Tương tự parallelogram/isoTrapezoid. tangent/intersect giữ logic classify + multi-branch nguyên xi. TRANSACTION (rectangle/rhombus/isoTriangle/rightTriangle) giữ nguyên cấu trúc dispatch.

- [ ] **Step 2: Tạo `registry.ts`**

```ts
// finalize/registry.ts
import type { GeometryToolModule } from './_types';
import * as lines from './lines';
import * as circles from './circles';
import * as points from './points';
import * as polygons from './polygons';
import * as measure from './measure';

const ALL: GeometryToolModule[] = [
  ...Object.values(lines), ...Object.values(circles), ...Object.values(points),
  ...Object.values(polygons), ...Object.values(measure),
].filter((m): m is GeometryToolModule => !!m && typeof (m as any).finalize === 'function');

export const TOOL_MODULES: ReadonlyMap<string, GeometryToolModule> =
  new Map(ALL.map((m) => [m.key, m]));
```

- [ ] **Step 3: Rút gọn finalizeShape.ts**

```ts
// finalizeShape.ts (toàn file sau refactor)
import type { ToolDef } from '../tools';
import type { HandlerCtx } from './ctx';
import { TOOL_MODULES } from './finalize/registry';

export function finalizeShape(ctx: HandlerCtx, toolDef: ToolDef, clickXY?: { x: number; y: number }): void {
  TOOL_MODULES.get(toolDef.key)?.finalize(ctx, toolDef, clickXY);
}
```
> Signature giữ nguyên → `multiClick.ts` (2 call site) không sửa. Default case cũ = no-op ⇒ `?.` tương đương.

- [ ] **Step 4: Verify**

Run: `npm run typecheck` → clean.
Run: `npm test -- finalizeShape` → PASS, **golden snapshot KHÔNG đổi**.
Run: `npm test` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/editor/handlers/finalize/ src/stamps/geometry-2d/editor/handlers/finalizeShape.ts
git commit -m "refactor(editor): finalizeShape thành TOOL_MODULES registry (Phase 5b, #45)"
```

---

## Task 5: Phase 6a — construct manifest + check script

**Files:**
- Create: `scripts/construct-matrix/manifest.ts`
- Create: `scripts/check-construct-matrix.ts`
- Modify: `package.json` (thêm script `check:matrix`)

- [ ] **Step 1: Viết manifest declarative**

Liệt kê mỗi construct (1 dòng/DSL kind) + key ở từng layer. Lấy danh sách DSL kind từ `dsl/registry.ts` KIND_REGISTRY (37). `intentKey` = op hoặc add-point constraint.kind sinh ra nó (null nếu không có path intent); `toolKey` = key tool finalize (null nếu không); `ruleId` = id rule trong `ai/rules` (null nếu escalate-only); `sceneKind` = SceneObject.kind; `serialize` = true/false; `evalFixture` = path hoặc null.

```ts
// scripts/construct-matrix/manifest.ts
export interface ConstructEntry {
  dslKind: string;          // phải ∈ KIND_REGISTRY
  sceneKind: string;        // point|line|circle|polygon|arc|sector|angle|distance|vector|intersection
  intentKey: string | null; // op hoặc constraint.kind ∈ intent-builder registry
  toolKey: string | null;   // ∈ TOOL_MODULES
  ruleId: string | null;    // ∈ ALL_RULES ids
  serialize: boolean;
  evalFixture: string | null;
}

export const CONSTRUCT_MANIFEST: ConstructEntry[] = [
  { dslKind: 'free', sceneKind: 'point', intentKey: 'free', toolKey: 'pointOn', ruleId: null, serialize: true, evalFixture: null },
  { dslKind: 'midpoint', sceneKind: 'point', intentKey: 'midpoint', toolKey: 'midpoint', ruleId: 'midpoint', serialize: true, evalFixture: null },
  // ... (37 dòng — 1 cho mỗi DSL kind trong ALL_MODULES)
];
```
> Điền đủ 37 dòng. Tra cứu: `intentKey` từ `ADD_POINT_BUILDERS` keys + op builder keys (Task 2); chú ý mismatch tên: DSL `tangentPointExt` ← intentKey `'tangentPoint'`; DSL `circleCP` ← `'draw-circle'`; `segment/line/ray/perpendicular/parallel/perpBisector` ← `'connect'`/`'draw-line'`. `toolKey` từ `TOOL_MODULES` keys (Task 4); mismatch: DSL `circleCP`←tool `'circleCenter'`, `circle3`←`'circle3'`, `polygon`←nhiều tool (chọn `'square'` đại diện hoặc null). `ruleId` từ `ai/rules/registry.ts` (14 id). Không chắc → để `null` (optional layer, script chỉ cảnh báo, không fail).

- [ ] **Step 2: Viết check script**

```ts
// scripts/check-construct-matrix.ts
import { KIND_REGISTRY } from '../src/stamps/geometry-2d/dsl/registry';
import { OP_BUILDERS } from '../src/stamps/geometry-2d/ai/intent-builders/registry';
import { ADD_POINT_BUILDERS } from '../src/stamps/geometry-2d/ai/intent-builders/add-point';
import { TOOL_MODULES } from '../src/stamps/geometry-2d/editor/handlers/finalize/registry';
import { ALL_RULES } from '../src/stamps/geometry-2d/ai/rules/registry';
import { CONSTRUCT_MANIFEST } from './construct-matrix/manifest';
import { existsSync } from 'node:fs';

const intentKeys = new Set([...Object.keys(OP_BUILDERS), ...Object.keys(ADD_POINT_BUILDERS)]);
const ruleIds = new Set(ALL_RULES.map((r) => r.id));
const errors: string[] = [];
const warnings: string[] = [];

// 1. Mọi DSL kind phải có entry (bắt "thêm DSL kind quên manifest").
const manifestKinds = new Set(CONSTRUCT_MANIFEST.map((e) => e.dslKind));
for (const k of KIND_REGISTRY.keys()) {
  if (!manifestKinds.has(k)) errors.push(`DSL kind '${k}' thiếu entry trong manifest`);
}
// 2. Mỗi entry: key khai báo phải resolve trong registry tương ứng.
for (const e of CONSTRUCT_MANIFEST) {
  if (!KIND_REGISTRY.has(e.dslKind)) errors.push(`'${e.dslKind}': dslKind không có trong KIND_REGISTRY`);
  if (e.intentKey && !intentKeys.has(e.intentKey)) errors.push(`'${e.dslKind}': intentKey '${e.intentKey}' không có builder`);
  if (e.toolKey && !TOOL_MODULES.has(e.toolKey)) errors.push(`'${e.dslKind}': toolKey '${e.toolKey}' không có module`);
  if (e.ruleId && !ruleIds.has(e.ruleId)) errors.push(`'${e.dslKind}': ruleId '${e.ruleId}' không có rule`);
  if (!e.intentKey) warnings.push(`'${e.dslKind}': không có path Intent (chỉ manual/escalate)`);
  if (!e.toolKey) warnings.push(`'${e.dslKind}': không có manual tool`);
  if (e.evalFixture && !existsSync(e.evalFixture)) errors.push(`'${e.dslKind}': evalFixture '${e.evalFixture}' không tồn tại`);
}

// 3. In bảng.
const col = (s: string, w: number) => (s + ' '.repeat(w)).slice(0, w);
console.log(col('DSL kind', 22) + col('scene', 10) + col('intent', 12) + col('tool', 14) + col('rule', 12) + 'ser');
for (const e of CONSTRUCT_MANIFEST) {
  console.log(col(e.dslKind, 22) + col(e.sceneKind, 10) + col(e.intentKey ?? '—', 12) + col(e.toolKey ?? '—', 14) + col(e.ruleId ?? '—', 12) + (e.serialize ? '✓' : '✗'));
}
if (warnings.length) { console.log('\nWARN:'); warnings.forEach((w) => console.log('  ⚠ ' + w)); }
if (errors.length) { console.error('\nERRORS:'); errors.forEach((er) => console.error('  ✗ ' + er)); process.exit(1); }
console.log(`\n✓ Matrix OK — ${CONSTRUCT_MANIFEST.length} construct, ${KIND_REGISTRY.size} DSL kind.`);
```
> Nếu `ADD_POINT_BUILDERS` không export từ `add-point/index.ts` → thêm export ở Task 2 Step 2 (đã có). Nếu import `.ts` registry vào tsx báo lỗi ESM/path, đối chiếu cách `scripts/diag-deterministic.ts` import source.

- [ ] **Step 3: Thêm npm script**

Trong `package.json` `"scripts"`: thêm `"check:matrix": "tsx scripts/check-construct-matrix.ts"`.

- [ ] **Step 4: Verify**

Run: `npm run check:matrix`
Expected: in bảng 37 dòng + `✓ Matrix OK`. Nếu exit≠0 → đọc ERRORS, sửa manifest (sai key) cho khớp registry thật. Cố ý sửa 1 `intentKey` thành rác → chạy lại phải đỏ (chứng minh script bắt được); rồi sửa lại.

- [ ] **Step 5: Commit**

```bash
git add scripts/construct-matrix/ scripts/check-construct-matrix.ts package.json
git commit -m "feat(tooling): capability matrix machine-checkable (Phase 6a, #45)"
```

---

## Task 6: Phase 6b — doc matrix + gắn test guard

**Files:**
- Create: `docs/geometry-2d/construct-capability-matrix.md`
- Create: `src/stamps/geometry-2d/__tests__/construct-matrix.test.ts`

- [ ] **Step 1: Sinh doc từ script**

Run: `npm run check:matrix > /tmp/matrix.txt` rồi viết `docs/geometry-2d/construct-capability-matrix.md`:
- Phần intro: nguồn enumerate = `dsl/registry.ts` KIND_REGISTRY; layer bắt buộc (Scene/DSL/Intent/Serialize) vs optional (Rule/Tool/Eval); cách chạy `npm run check:matrix`.
- Dán bảng từ output (markdown table).
- Ghi rõ: "PR thêm construct → cập nhật `scripts/construct-matrix/manifest.ts`; CI `check:matrix` đỏ nếu DSL kind thiếu entry hoặc key sai."

- [ ] **Step 2: Test guard (matrix luôn pass trong CI test)**

```ts
// construct-matrix.test.ts
import { execFileSync } from 'node:child_process';
describe('construct capability matrix', () => {
  test('check:matrix pass (mọi construct đủ layer bắt buộc)', () => {
    expect(() => execFileSync('npx', ['tsx', 'scripts/check-construct-matrix.ts'], { stdio: 'pipe' })).not.toThrow();
  });
});
```
> Nếu jest không cho spawn trong env này, thay bằng import trực tiếp logic: refactor phần kiểm tra của script thành hàm `runMatrixCheck(): { errors: string[] }` export từ `scripts/check-construct-matrix.ts`, test gọi `expect(runMatrixCheck().errors).toEqual([])`. (Khuyến nghị cách import — bền hơn spawn.)

- [ ] **Step 3: Verify**

Run: `npm test -- construct-matrix` → PASS.
Run: `npm test` → PASS.

- [ ] **Step 4: Commit**

```bash
git add docs/geometry-2d/construct-capability-matrix.md src/stamps/geometry-2d/__tests__/construct-matrix.test.ts
git commit -m "docs+test(tooling): capability matrix doc + CI guard (Phase 6b, #45)"
```

---

## Task 7: Result doc + close-out

**Files:**
- Create: `docs/superpowers/results/2026-06-07-deterministic-first-muc3.md`

- [ ] **Step 1: Final full verify**

Run: `npm test` → PASS (0 fail).
Run: `npm run typecheck` → clean.
Run: `npx tsx scripts/diag-deterministic.ts scripts/probes-adversarial.txt` → `37 / 16`, 0 regress.
Run: `npm run check:matrix` → `✓ Matrix OK`.

- [ ] **Step 2: Viết result doc**

Ghi: đã ship Phase 2/5/6; golden snapshot làm lưới; số file/registry; **defer Phase 4** (point.ts render+drag-sync) sang session riêng + lý do; bất biến đã giữ; gotcha phát sinh. Link spec + plan.

- [ ] **Step 3: Commit + push + update issue #45**

```bash
git add docs/superpowers/results/2026-06-07-deterministic-first-muc3.md
git commit -m "docs: kết quả Mức 3 Phase 2/5/6 + defer Phase 4 (issue #45)"
git push
gh issue comment 45 --body "Phase 2/5/6 done (behavior-preserving, golden snapshot xanh, diag 37/16 0 regress). Phase 4 (point.ts) defer — session riêng. Chi tiết: docs/superpowers/results/2026-06-07-deterministic-first-muc3.md"
```

---

## Self-review (đã chạy)

- **Spec coverage:** A→Task 0; B→Task 1+2; C→Task 3+4; D→Task 5+6; E (sequencing/commit/result/defer Phase 4)→Task 0–7. ✓ Mọi section có task.
- **Placeholder scan:** code mới (types/registry/orchestrator/snapshot/check/manifest) đầy đủ; phần move ghi rõ line-range nguồn + đổi import (không phải "implement later"). Bảng curated/scenario/manifest liệt kê đủ đầu mục. ✓
- **Type consistency:** `BuildState`/`IntentBuilder`/`newState`/`IntentBuilderError` (`_types.ts`) dùng nhất quán Task 1→2; `GeometryToolModule`/`TOOL_MODULES` Task 3→4; `OP_BUILDERS`/`ADD_POINT_BUILDERS`/`KIND_REGISTRY`/`ALL_RULES` Task 5 khớp export Task 2/4. ✓
- **Rủi ro đã chốt:** ordering loop + `repairCircleIntersections` post-dispatch giữ ở orchestrator (Task 2 Step 4); TRANSACTION/multi-branch/classify giữ nguyên (Task 4 Step 1); golden snapshot KHÔNG `-u` là chốt behavior-preserving mọi task.
