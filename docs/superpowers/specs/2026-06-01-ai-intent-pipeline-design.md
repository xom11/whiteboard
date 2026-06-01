# AI Intent Pipeline — Design

**Date:** 2026-06-01
**Status:** Draft — awaiting user approval
**Scope:** geometry-2d stamp, AI drawing pipeline
**Related:**
- [Construct Special Shapes](2026-06-01-construct-special-shapes-design.md) — 7 polygon variants đã có
- [Phase 2.1 AI provider](2026-05-25-phase2-1-ai-provider-design.md) — pipeline cũ
- [Multi-step refine](2026-06-01-multi-step-refine-design.md) — refine envelope hiện có

---

## 1. Vấn đề

Pipeline AI hiện tại (Gemma 4B / Claude → DSL → transpile) cho phép AI **tự đặt tọa độ** qua `kind: 'free'`. Hậu quả:

- **Thiếu**: AI quên dùng kind `midpoint` khi đề có "M trung điểm BC" — validator hiện chỉ check kind coverage cho ~10 keyword VN.
- **Sai**: AI emit "tam giác vuông tại A" nhưng đặt coord vuông tại B/C — không có guard. `extractRequirements` chỉ regex VN, biến tấu hoặc EN không match.
- **Thừa**: AI tự thêm trung tuyến, đường cao, tâm... ngoài đề — không có guard nào.

Root cause: schema cho AI quá permissive. `free` kind cho phép coord bất kỳ; bảng từ khoá→kind chỉ VN; không có verify pass sau build.

## 2. Mục tiêu

3 trục chất lượng cho mỗi đề:

| Trục         | Định nghĩa                                                                  | Hiện trạng                 | Target |
|--------------|------------------------------------------------------------------------------|----------------------------|--------|
| Đủ           | Mỗi entity nêu trong đề → có kind tương ứng trong DSL                       | Validator VN-only          | 95%+   |
| Đúng         | Variant/constraint khớp đề (vuông tại A → coord vuông tại A)                | Không có guard             | 90%+   |
| Không thừa  | DSL không chứa kind không match keyword nào trong đề                        | Không có guard             | 90%+   |

Bonus: hỗ trợ **prompt tiếng Anh + biến tấu VN** mà không cần regex enumeration.

## 3. Non-goals

- Stamp 3D + graph-2D (scope sau).
- Re-edit existing AI-generated figures (đã có refine envelope, không động).
- Cải thiện model (vẫn dùng Gemma 4B/12B + Claude — design phải work với LLM nhỏ).

## 4. Approach: 4-stage pipeline

```
Đề bài (VN/EN)
   │
   ├─ Stage 1: EXTRACT (AI)
   │     └─→ Intent[] — list of typed ops
   │         vd: [
   │           {op:"draw-shape", shape:"triangle", labels:["A","B","C"], variant:"any"},
   │           {op:"add-point",  name:"M", constraint:{kind:"midpoint", of:"BC"}},
   │           {op:"connect",    from:"A", to:"M"}
   │         ]
   │
   ├─ Stage 2: TRANSLATE (deterministic)
   │     └─→ DSL[] — canonical coords per variant
   │         AI không tham gia. Mỗi Intent op map cứng sang DSL kind.
   │         Coord = template canonical (vd triangle equilateral
   │         → A=(0,0), B=(4,0), C=(2, 3.46)) UNLESS Intent có explicitCoords.
   │
   ├─ Stage 3: RENDER (existing)
   │     └─→ JSXGraph board + SVG (đã có)
   │
   └─ Stage 4: VERIFY (deterministic + AI fallback)
         └─→ {missing[], extra[], wrong[]}
             - missing: Intent có nhưng không xuất hiện DSL
             - extra:   DSL có kind không tương ứng Intent nào
             - wrong:   variant/labels mismatch
             Nếu fail → retry stage 1-2 với hint, hoặc warn user.
```

### Tại sao 4 stage?

- **Stage 1 isolation**: AI **chỉ** làm NLU (đọc-hiểu-tách-lệnh). Đây là việc LLM 4B làm tốt. Không động tới tọa độ, không động tới DSL grammar.
- **Stage 2 deterministic**: 0% hallucinate. Mỗi `variant` enum value → 1 đoạn code đặt coord cố định.
- **Stage 4 self-check**: closed loop. Đây chính là cách chống "thừa" (DSL có kind extra → fail verify).

## 5. Schema thay đổi

### 5.1 Intent schema (mới, replaces envelope `figure`)

```ts
// src/stamps/geometry-2d/ai/intent.ts
export const IntentZ = z.discriminatedUnion('op', [
  z.object({
    op: z.literal('draw-shape'),
    shape: z.enum(['triangle','square','rectangle','rhombus','trapezoid','parallelogram','circle']),
    labels: z.array(z.string()).min(2).max(8),
    variant: z.string().optional(),  // 'equilateral'|'right-at-A'|'isoceles-AB'|...
    explicitCoords: z.record(z.string(), z.tuple([z.number(), z.number()])).optional(),
    measurements: z.array(z.object({
      target: z.string(),  // 'AB'|'angle-A'|'radius'
      value: z.string(),   // '4'|'60°' — label-only
    })).optional(),
  }),
  z.object({
    op: z.literal('add-point'),
    name: z.string(),
    constraint: z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('midpoint'), of: z.string() }),
      z.object({ kind: z.literal('perpFoot'), from: z.string(), onLine: z.string() }),
      z.object({ kind: z.literal('centroid'), of: z.string() }),
      z.object({ kind: z.literal('circumcenter'), of: z.string() }),
      z.object({ kind: z.literal('incenter'), of: z.string() }),
      z.object({ kind: z.literal('orthocenter'), of: z.string() }),
      z.object({ kind: z.literal('intersection'), of: z.tuple([z.string(), z.string()]) }),
      z.object({ kind: z.literal('onSegment'), of: z.string(), at: z.number().optional() }),
      z.object({ kind: z.literal('free'), at: z.tuple([z.number(), z.number()]).optional() }),
    ]),
  }),
  z.object({
    op: z.literal('connect'),
    from: z.string(), to: z.string(),
    style: z.enum(['segment','line','ray','perpendicular','parallel','perpBisector','angleBisector','tangent']).default('segment'),
  }),
  z.object({
    op: z.literal('draw-circle'),
    name: z.string(),
    spec: z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('centerPoint'), center: z.string(), through: z.string() }),
      z.object({ kind: z.literal('through3'),   points: z.tuple([z.string(), z.string(), z.string()]) }),
    ]),
  }),
]);

export const IntentEnvelopeZ = z.object({
  decision: z.enum(['build','refuse']),
  intents: z.array(IntentZ).optional(),
  reason: z.string().optional(),
});
```

### 5.2 Builder (Stage 2)

```ts
// src/stamps/geometry-2d/ai/intentToDsl.ts
export function intentsToDsl(intents: Intent[]): DslInputT {
  const dsl: DslLine[] = [];
  for (const intent of intents) {
    switch (intent.op) {
      case 'draw-shape': dsl.push(...expandShape(intent)); break;
      case 'add-point':  dsl.push(...expandPoint(intent)); break;
      case 'connect':    dsl.push(...expandConnect(intent)); break;
      case 'draw-circle':dsl.push(...expandCircle(intent)); break;
    }
  }
  return dsl;
}

// Mỗi expandX là pure function với canonical coord table per variant.
// vd triangle:
function canonicalTriangleCoords(variant: string): [Pt, Pt, Pt] {
  switch (variant) {
    case 'equilateral': return [[0,0],[4,0],[2, 3.4641]];
    case 'right-at-A':  return [[0,0],[4,0],[0,3]];
    case 'right-at-B':  return [[0,0],[4,0],[4,3]];
    case 'right-at-C':  return [[0,0],[4,0],[2,3]]; // C lưu ý phối hợp cevian
    case 'isoceles-AB': return [[0,0],[4,0],[2,3]]; // AB là đáy
    default /*any*/:    return [[0,0],[4,0],[2.5,2.8]]; // scalene cố định
  }
}
```

### 5.3 Verify (Stage 4)

```ts
// src/stamps/geometry-2d/ai/verify.ts
export function verify(intents: Intent[], dsl: DslInputT, problem: string): VerifyReport {
  // Build expected kind set từ intents.
  const expectedKinds = new Set<string>();
  const expectedLabels = new Set<string>();
  for (const intent of intents) { /* ... */ }

  // Walk DSL.
  const actualKinds = new Set(dsl.map(d => d.kind));
  const actualLabels = new Set(dsl.filter(d => 'name' in d).map(d => d.name));

  const missing = [...expectedKinds].filter(k => !actualKinds.has(k));
  const extra   = [...actualKinds].filter(k => !expectedKinds.has(k) && !isAlwaysAllowed(k));
  const wrong   = checkVariantConstraint(intents, dsl); // vd right-at-A → AB⊥AC

  return { ok: missing.length === 0 && extra.length === 0 && wrong.length === 0, missing, extra, wrong };
}
```

Note: Verify Stage 4 hoàn toàn deterministic (set comparison + geometric checks). Không gọi AI. Chỉ retry stage 1-2 (max 1 lần) với hint nếu fail.

## 6. Migration

- Giữ envelope cũ (`FigureEnvelopeZ`) cho backward compat, deprecate sau 2 release.
- `generateFigure()` mặc định dùng pipeline mới; flag `mode: 'legacy'|'intent'` cho rollout test.
- DSL `free` kind không bỏ — vẫn để cho rare case "vẽ điểm tự do tại (3,4)" (qua `add-point constraint:free`). Builder chỉ emit `free` khi user explicitly cho coord.

## 7. Fixtures + eval

Tier hóa fixtures, run từ dễ → khó:

| Tier | Mục tiêu                                | Count target | Mô tả                                                      |
|------|-----------------------------------------|--------------|------------------------------------------------------------|
| 0    | Single shape, no augmentation           | 10           | "Tam giác ABC", "Hình vuông MNPQ", "Hình thoi"             |
| 1    | Shape + 1 augmentation                  | 12           | "ΔABC, M trung điểm BC", "ΔABC vuông tại A, H chân ⊥ từ A" |
| 2    | Shape + 2-3 augmentations               | 10           | "ΔABC, M tđ BC, AM, N tđ AB"                               |
| 3    | English variants of Tier 0+1            | 10           | "Triangle ABC", "Square MNPQ with diagonal MP", ...        |
| R    | Refuse (out of scope)                   | 4            | "Tính sin(30°)", "Vẽ con mèo", ...                         |

Mỗi fixture có `expectIntents` (golden) và metric đo: extract accuracy (intent match) + verify pass rate (đủ/đúng/không thừa) + transpile_ok + render success.

Script: `scripts/eval-intent.ts` chạy parallel trên gemma3:4b + gemma3:12b + claude (nếu có key). Output bảng so sánh.

## 8. Implementation order

1. **Worktree**: `feature/ai-intent-pipeline` (qua git worktree).
2. **Tier 0 first**:
   - Add Intent schema + IntentEnvelopeZ.
   - Add `intentsToDsl()` builder cho `draw-shape` (chỉ triangle/square/rectangle initial).
   - Add prompt mới (system prompt tách intent + ví dụ).
   - Add 10 Tier 0 fixtures + eval script.
   - Chạy eval, đạt 90%+ Tier 0 mới tiếp.
3. **Tier 1**: Add `add-point` constraints (midpoint/perpFoot/centroid/...) + `connect` op. Add 12 Tier 1 fixtures. Eval ≥85%.
4. **Tier 2**: Multi-augmentation. Add 10 fixtures. Eval ≥80%.
5. **Tier 3**: EN translation. Test prompt language flexibility. Eval ≥80%.
6. **Verify pass (Stage 4)**: implement after Tier 1 passes. Stage 4 không cần cho Tier 0 (single shape không có "thừa" issue).
7. **Migration switch**: flip default `mode: 'intent'`, deprecate envelope cũ.

## 9. Testing

- Per-stage unit test: extract (mock AI output → check parse), translate (golden DSL per intent), verify (synthetic mismatch → detect missing/extra/wrong).
- Integration: real Ollama 4B/12B end-to-end per tier.
- Snapshot SVG: render canonical shapes → PNG snapshot (catch regression in canonical coord).

## 10. Open questions

- **Intent vocabulary growth**: nếu user yêu cầu shape mới (vd ngũ giác đều), cần extend Intent schema. Acceptable — additive change.
- **EN prompt prompt fixtures**: prompt system message vẫn VN-centric. Cần thêm EN ví dụ hay 1 prompt riêng EN? → Quyết định: 1 prompt bilingual, ví dụ trộn VN+EN. LLM tự generalize.
- **Verify retry budget**: nếu Stage 4 fail, retry stage 1-2 với hint bao nhiêu lần? Default 1 (giống current validateKindCoverage flow).
