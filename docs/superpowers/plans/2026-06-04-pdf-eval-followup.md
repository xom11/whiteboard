# PDF Eval Follow-up — Open Work cho Session sau

**Context:** Session 2026-06-04 visual eval 14 bài tier 5 từ PDF "Một số bài tập chọn lọc hình học phẳng ôn thi vào lớp 10". Đã ship 4 fixes (commits `1b23e3a`, `41363fb`, `c812a67`, `e5ee7ce`) → **10/14 bài render OK** (71%). Còn 4 bài fail deep (cau-07, 08, 09, 10, 12 — cau-08 render 2/10 điểm). Memory: `project_ai_pdf_eval_session.md`.

**Harness có sẵn:**
- `scripts/eval-pdf-visual.ts` — call AI + render (tốn token, ~80-300s/bài qua claude-cli OAuth)
- `scripts/replay-intents.ts` — replay từ saved JSON, không tốn AI
- `scripts/debug-render.ts` — chỉ re-render từ DSL
- Output: `tmp/eval-pdf/{id}.{json,svg,png}`
- Dataset: `docs/superpowers/eval-pdf/problems.json` (cau-01..14)

---

## Item 1 — Wrap transpile để save state on error (UNBLOCK debug)

**Mục tiêu:** Khi pipeline throw uncaught (vd `emit: id not assigned`), harness vẫn save raw intents + dsl để inspect.

**Bug hiện tại:** `runOne` trong `eval-pdf-visual.ts` chỉ catch ở outer level (in `💥 unexpected`), không save JSON → mất intent stream của cau-09, cau-10.

**Sửa:** `scripts/eval-pdf-visual.ts`
```ts
// Trong runOne, sau khi generateFigureIntent trả về r.ok = true, nhưng trước
// khi gọi serializeBoard/render, wrap thêm try/catch:
try {
  const view = (r.transpile.state.meta as any).view;
  const jsonState = serializeBoard(r.transpile.state, view);
  svgString = await renderGeometrySvgFromState(jsonState);
} catch (e) {
  renderError = e instanceof Error ? `${e.message}\n${e.stack}` : String(e);
}

// Đảm bảo save JSON ngay cả khi render throw (đã có sẵn) — chỉ cần check
// generateFigureIntent path không throw silently.
```

Hiện đã save khi `r.ok = false`. Vấn đề là khi pipeline trong `generateFigureIntent` throw uncaught — vd transpile crash. Cần wrap `generateFigureIntent` cũng trong try/catch và save partial state.

**Effort:** 30 phút. **Output:** sau khi sửa, replay cau-09, cau-10 và inspect intents/dsl.

---

## Item 2 — Prompt fix `to` field cho perpThrough/parallelThrough (cau-12)

**Bug:** AI thiếu field `to` hoặc đặt sai semantic. Vd cau-12:
```json
{ "kind": "perpThrough", "through": "P", "from": "H" }
// Thiếu "to" → builder throw "perpThrough cần through + to"
```

**Sửa:** `src/stamps/geometry-2d/ai/intentPrompt.ts` — thêm section/example explicit:

```
## draw-line — phân biệt field theo kind

- **perpThrough**: đường vuông góc với <to> qua điểm <through>.
  - `through`: tên POINT.
  - `to`: tên LINE (≥2 chữ, vd "AB", "BC"). KHÔNG đặt 1 chữ cái.
  - Ví dụ: "Đường vuông góc với AB tại B" → {kind:"perpThrough", through:"B", to:"AB"}.
  - SAI: through:"B", to:"A" (chỉ 1 chữ — point, không phải line).

- **parallelThrough**: tương tự perpThrough, qua <through>, song song <to>.

- **tangentAt**: tiếp tuyến TẠI điểm <through> trên <circle>.
  - `through`: POINT (PHẢI nằm trên circle).
  - `circle`: tên CIRCLE.

- **tangentFromExt**: tiếp tuyến TỪ điểm <from> NGOÀI <circle>.
  - `from`: POINT (PHẢI ngoài circle).
  - `circle`: tên CIRCLE.
```

**Test:** thêm fixture cho prompt — `src/stamps/geometry-2d/ai/__tests__/prompt.test.ts` kiểm tra cheat sheet có trong system prompt.

**Effort:** 30 phút. **Re-eval:** chạy lại cau-12 (~5 phút). **Expect:** AI gen đúng `to: "AB"`-style.

---

## Item 3 — Builder fallback infer line từ 2 single-letter points (cau-07 tầng 2)

**Bug:** cau-07 sau normalize swap `from→through` vẫn fail:
```json
{ "kind": "perpThrough", "through": "B", "to": "A" }
// Transpile: KIND_MISMATCH "lB.toLine=A sai kiểu (cần line-like, gặp point)"
```
Đề "Đường vuông góc với AB tại B" → `to` đáng lẽ là `"AB"`.

**Sửa:** `src/stamps/geometry-2d/ai/intentToDsl.ts`, trong case `perpThrough` và `parallelThrough`:

```ts
case 'perpThrough': {
  let toRef = intent.to;
  // Fallback: nếu `to` là 1 chữ point (không phải line name) và `through`
  // cũng 1 chữ, infer line bằng concat (alphabetize for canonical name) +
  // ensureSegment nếu chưa exist.
  if (toRef && intent.through && /^[A-Z]$/.test(toRef) && /^[A-Z]$/.test(intent.through)) {
    const a = toRef < intent.through ? toRef : intent.through;
    const b = toRef < intent.through ? intent.through : toRef;
    const candidate = ensureSegment(s, a, b);  // đã có helper
    toRef = candidate;
  }
  if (!intent.through || !toRef) throw new IntentBuilderError('perpThrough cần through + to', intent);
  addShape(s, { name: intent.name, kind: 'perpendicular', throughPoint: intent.through, toLine: toRef });
  break;
}
```

Áp tương tự cho `parallelThrough`.

**Test:** `src/stamps/geometry-2d/ai/__tests__/intentToDsl.test.ts` — thêm 2 case (perp + parallel với 1-letter `to`).

**Effort:** 1h. **Re-eval:** replay cau-07.

---

## Item 4 — DSL `id not assigned for "AO"/"DO"` debug (cau-09, cau-10)

**Phụ thuộc Item 1.** Sau khi save state on error, replay → inspect.

**Hypothesis:**
- AI ref segment 2-letter (vd "AO") như đường thẳng nhưng chưa explicit `connect from A to O` hoặc auto-build.
- `intentToDsl` không auto-create segment khi resolve. Hoặc `resolveSegmentRef` trả về tên synthetic mà `assignIds` không pick up.

**Debug steps:**
1. Sau Item 1, replay cau-09 → đọc saved JSON, xem intents có gì ref "AO".
2. Mở `intentToDsl.ts:resolveSegmentRef` (line ~167) — check path nào trả về name "AO" mà không thêm vào `s.shapes`.
3. Check `transpile/ids.ts` — assignIds iterate `symbols` map. Nếu "AO" không trong symbols, không có id.

**Sửa hướng:**
- `intentToDsl.ts:resolveSegmentRef` — khi parse 2-letter ref (vd "AO"), nếu chưa exist segment → auto `ensureSegment(s, "A", "O")`.

**Effort:** 1-3h tùy nature.

---

## Bonus — cau-08 NaN cascade (deep, defer)

**Bug:** 2/10 điểm render (O, O' centers). A, B, C, D, K, E, I, F không visible. Pipeline OK (verify clean), render fail silent.

**Hypothesis:** A, B = circleIntersection của (O), (O'). Nếu 2 circle không thật sự intersect (radius nhỏ + 4 unit apart), A và B = NaN → C = secondIntersection(tA, O', other=A) cũng NaN → cascade.

**Investigation:** cần inspect (O) và (O') tạo từ spec gì, có radius hợp lệ không. Có thể là `circleCP` với surfacePoint sai → radius=0.

**Effort:** 2-4h. Có thể cần fix builder để guarantee 2 circle giao nhau khi spec gen `circleIntersection`.

---

## Đề xuất thứ tự thực hiện

| Ưu tiên | Item | Effort | Render impact |
|---|---|---|---|
| 1 | Item 1 (save state on error) | 30ph | Unblock Item 4 |
| 2 | Item 2 (prompt clarity) | 30ph | cau-12 + future bugs giảm |
| 3 | Item 3 (builder fallback) | 1h | cau-07 → ✅ |
| 4 | Item 4 (DSL id bug) | 1-3h | cau-09, 10 → ✅ |
| 5 | Bonus cau-08 | 2-4h | Optional |

**Sau Item 1-4:** expected 13/14 render OK (vẫn còn cau-08 nếu không làm bonus).

---

## Commands ready-to-run

```bash
# Re-eval 1 problem (tốn AI token)
npx tsx scripts/eval-pdf-visual.ts cau-12

# Re-eval batch (background)
npx tsx scripts/eval-pdf-visual.ts cau-07 cau-09 cau-10 cau-12 > /tmp/batch.log 2>&1 &

# Replay từ saved JSON (không tốn token — sau khi fix code)
npx tsx scripts/replay-intents.ts cau-07

# View output PNG
# (dùng Read tool trong Claude Code, hoặc qlmanage cho macOS)
qlmanage -t -s 800 -o /tmp tmp/eval-pdf/cau-07.png

# Full test suite (đảm bảo không regress)
npx jest --no-coverage
```

## Liên quan

- Memory: `project_ai_pdf_eval_session.md`
- Memory variant normalizer: `project_ai_variant_normalizer.md`
- 4 commits đã ship: `1b23e3a` `41363fb` `c812a67` `e5ee7ce`
- Dataset: `docs/superpowers/eval-pdf/problems.json` (14 bài cau-01..14)
- Raw PDF extract: `docs/superpowers/eval-pdf/raw.txt` (28 câu total — chưa curate cau-15..28)
