# Deterministic-first intent pipeline — Mức 1 (kết quả)

- **Ngày:** 2026-06-06 · **Issue:** #43 · **Spec/Plan:** `docs/superpowers/{specs,plans}/2026-06-06-deterministic-first-intent-pipeline*`

## Đã ship (Mức 1 hoàn tất)

Đảo trục: intent pipeline giờ **deterministic-first**. `generateFigureIntent` thử
`tryDeterministicFigure(problem)` TRƯỚC; hit → `provider:'deterministic'`, 0 token,
KHÔNG gọi LLM. Không hit → fall through Track B (LLM). `useDeterministic:false` để ép LLM.

### Kiến trúc
- **Rule registry** `ai/rules/`: 14 module (`triangle, quad, connect, midpoint, perpBisector,
  cevian, centers, perpFoot, circleRadius, circleTriangle, tangentFromExt, arcMidpoint,
  reflection, pointAtDistance`) emit `IntentT[]`. Thêm construct = 1 module + đăng ký.
- **Coverage gate** `ai/deterministic/coverage.ts`: clause segmentation + phủ mệnh đề hình học.
- **4+1 lớp gate** trong `tryDeterministicFigure`: coverage → transpile → verifyGeometry →
  guard named-entity → guard intent-fidelity. Sai/thiếu → escalate (KHÔNG render sai).
- **Guards** `ai/deterministic/guards.ts`:
  - `allNamedEntitiesPresent`: mọi đỉnh hình (tam giác/tứ giác/hình) + tên điểm ("Gọi X", "X là",
    "lần lượt") phải có trong DSL → bắt drop construct.
  - `verifyIntentFidelity`: add-point phái sinh bị builder drop (trùng tên đỉnh) → escalate.
- **Safety net** (issue Phase 1): `validateRefs` registry-driven qua `refSpecs` trên
  `DslKindModule`; backfill 8 kind; fix 2 repro bug (KIND_MISMATCH + UNKNOWN_REF không throw).

### Verify
- Full suite **2022 pass, 0 fail**. Harness `scripts/diag-deterministic.ts` + probe
  `scripts/probes-adversarial.txt`: 27 render deterministic / 12 escalate đúng / 0 silent-wrong.
- 2 vòng workflow đối kháng (14 agent chế ~400 probe chạy harness thật) → tìm bug → fix → re-verify.

### Bug đối kháng đã sửa (silent-wrong-figure)
- Multi-construct/clause: **render-both** (triangle window+POSITIONAL variant, quad emit-all,
  midpoint/perpBisector/perpFoot/circleRadius global match, centers bind tam giác trong clause).
- Value/ngữ cảnh sai → **escalate**: pointAtDistance (hệ số 2AB/2R/AB÷2/R±1 + hướng "về phía" sai),
  arcMidpoint (notContaining∉{a,b}, reject cung lớn/chứa dương), tangentFromExt (circle phải có
  dấu hiệu + reject "Tính/Độ dài/bằng N"), cevian (foot==vertex), connect (bỏ cờ 'i' → hết rác T,H).
- Shared: `normalizeIntent` variant POSITIONAL + chỉ normalize khi đúng 1 tam giác (hết clobber).
- circleRadius nhường circleTriangle khi (O;R) là đường tròn nội/ngoại tiếp (hết 2 circle chồng).

## Gotcha quan trọng (cho Mức 2)
- **`\b` ASCII KHÔNG khớp ký tự Việt** ("đ","ề") → dùng lookaround `(?<!\p{L})…(?!\p{L})` + cờ `u`.
- **Variant tam giác là POSITIONAL** theo index đỉnh (isoceles-BC = apex vertex[0]; right-at-A =
  vertex[0]), KHÔNG theo chữ-cái-nhãn → đúng cho nhãn ≠ ABC.
- Keyword hoa đầu câu (Kẻ/Vẽ/Nối/Đoạn): dùng `[Xx]` ở ký tự đầu, KHÔNG cờ 'i' (vertices phải HOA).
- `segmentClauses` tách trên `;` `,` → "(O; 3)" bị cắt; nhánh PAREN quét toàn `ctx.problem`.

## Defer → Mức 2 (fresh session)
- **Fixture matrix VN/EN Tier 0→4** + EN language đầy đủ (cấu trúc rules đã sẵn `languages`).
- **Coverage gaps** (escalate an toàn, chỉ thiếu phủ): "trung điểm cạnh huyền/đoạn thẳng BC",
  "phân giác trong AD" (từ "trong" chen), "(O; R) ngoại tiếp tam giác" (segmenter cắt ';'),
  "tam giác ABC ngoại tiếp đường tròn (I)" = incircle, dấu phẩy điểm C′ trong DIST_CLAUSE,
  "kẻ AH vuông góc BC tại H" (perpFoot không nhận pattern ⊥).
- **MEDIUM limitation:** "đường tròn ngoại tiếp tứ giác BCEF" → render quad BCEF nhưng DROP đường
  tròn (circle-ngoại-tiếp-tứ-giác chưa hỗ trợ; quad vẫn đúng). Hình *thiếu*, không *sai*.
- **Mức 3 (issue #43 Phase 2/4/5) — tách issue riêng:** intent-builders registry (`intentToDsl`
  orchestrator), scene construction handlers (`point.ts` mỏng), manual tool finalize registry.
- Layout: nhiều shape disjoint cùng đề dùng canonical chồng nhau (cần offset theo shape index).

## Workflow note
Fan-out authoring/fixing hiệu quả nhưng **agent đôi khi không trả StructuredOutput** (7/13 ở
round fix) — phải lấy ground truth từ git/test, không tin self-report. Fix cross-cutting + shared
helper nên làm INLINE (main loop), fan-out hợp cho module độc lập.
