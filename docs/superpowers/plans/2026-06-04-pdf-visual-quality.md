# PDF Visual Quality Improvements — Session sau

**Context:** Session 2026-06-04 ship 5 fix (Items 1-4 + cau-03 regression) → **pipeline 14/14 = 100%** unblock (was 10/14 = 71%). Nhưng visual inspect các PNG → quality mixed: layout cramped, labels overlap, outliers phá bbox, cau-08 NaN cascade. Pipeline-success ≠ render-success.

**Baseline trước workstream này:**
- Memory: `project_ai_pdf_eval_session.md`
- 9 fix commits: `1b23e3a` (tangentAt), `41363fb` (auto-fit bbox), `c812a67` (perpThrough), `e5ee7ce` (spread free-coord), `f96a109` (catch transpile), `1195856` (prompt cheat sheet), `733bc7d` (builder fallback), `97cbf7d` (line-ref collision), `51e3169` (centerThrough regression).
- PNG outputs: `tmp/eval-pdf/cau-*.png` (14 bài).

---

## Issue patterns observed

### 1. Auto-fit bbox kém với outlier points

**Examples:**
- **cau-04**: 1 lonely K xa main triangle → bbox span lớn → triangle tiny góc phải, K cô đơn góc trái.
- **cau-13**: E (far left) + F (top right) outliers → main cluster (ABCD/H/N/M) compressed into tiny region.
- **cau-08**: NaN cascade phá hoàn toàn — chỉ 2 circle + O/O' visible.

**Root cause:** `autoFitBboxFromBoard` (commit `41363fb`) iterate ALL `board.objectsList` → min/max x,y. Outlier dominates. Padding 15% không đủ giảm impact.

**Fix candidates:**
- A. **Median-based bbox**: dùng percentile 10-90 thay vì min/max raw → outlier auto-trim.
- B. **Cluster-based bbox**: K-means hoặc DBSCAN tìm main cluster → bbox fit main cluster + zoom-out optional cho outlier visible.
- C. **Re-position outlier**: khi free-point coord cách main cluster > threshold, snap closer.

**Effort:** A = 1-2h, B = 4-8h, C = 2-3h. Recommended A trước (simplest, fixes 80% cases).

---

### 2. Label collision/overlap

**Examples:** cau-01 (A/N/E), cau-02 (B/B1/P1), cau-09 (A bị che), cau-12 (N/M/A), cau-13 (cluster D/C/B/A/H/N nhỏ xíu).

**Root cause:** JSXGraph default label position fixed offset từ point center. Khi 2 points gần nhau, labels chồng. Không có collision-avoidance built-in.

**Fix candidates:**
- A. **Per-point label offset**: pass `label: {offset: [dx, dy]}` based on quadrant của point relative to centroid (radial-outward).
- B. **Force-directed label layout**: pos-process iterate label boxes, repel.
- C. **Smaller font + circle marker đè label** (currently default marker hides label below).

**Effort:** A = 2-3h (simple heuristic), B = 6-10h, C = 30ph (tuning). Recommended A.

---

### 3. cau-08 NaN cascade (bonus từ plan trước)

**Bug:** 2 circle (O), (O') không thật sự intersect → `circleIntersection` → A, B = NaN → cascade qua C/D/E/F/K... = NaN. Chỉ centers visible.

**Investigation:** check spec của (O), (O'). Có thể:
- `centerRadius` với radius nhỏ + center cách xa nhau (~4 unit) → 2 circle disjoint.
- `circleCP` với surface point sai → radius=0.

**Fix:** trong builder/handleDrawCircle, nếu 2 circle (O) + (O') được consumer dùng cho `circleIntersection`, validate radius/distance đảm bảo overlap. Hoặc adjust default positioning cho center khi inject free-point (Item cau-03) → đảm bảo distance ≤ radius1 + radius2.

**Effort:** 2-4h. Có thể cần verify_geometry stage thêm guard (warning when |c1-c2| > r1+r2).

---

### 4. Label "A" hay bị che/missing

**Examples:** cau-04 (A invisible, có ô vuông marker), cau-09 (2 "B" label, A bị thay), cau-10 (A nhỏ + ô vuông).

**Hypothesis:** point "A" thường ở góc dưới-trái triangle (canonical layout). Marker stamp đè label. Hoặc có vertex được flag "right-angle" → marker square thay vì label.

**Investigation:** check JxgRenderer config — visible chỉ marker không có textLabel? Hoặc label hidden khi vertex variant=`right-at-A`?

**Effort:** 1-2h investigation. Có thể là render config issue.

---

## Đề xuất thứ tự thực hiện

| Ưu tiên | Item | Effort | Visual impact |
|---|---|---|---|
| 1 | Issue 4 — "A" label missing investigation | 1-2h | Low effort + many bài bị |
| 2 | Issue 1A — Median bbox (outlier-aware) | 1-2h | cau-04, 13 + others |
| 3 | Issue 2A — Per-point label offset (radial) | 2-3h | cau-01, 02, 09, 12 |
| 4 | Issue 3 — cau-08 NaN cascade | 2-4h | cau-08 specific |

**Sau Items 1-4:** expected toàn bộ 14 bài rendering đẹp (subjective). Có thể cần re-eval với real AI sau khi ship.

---

## Commands ready-to-run

```bash
# Re-eval 1 problem (real AI, tốn token ~80-300s)
npx tsx scripts/eval-pdf-visual.ts cau-04

# Replay từ saved JSON (không tốn token, sau khi fix render-side code)
npx tsx scripts/replay-intents.ts cau-13

# View output PNG (Read tool trong Claude Code, hoặc qlmanage)
qlmanage -t -s 800 -o /tmp tmp/eval-pdf/cau-08.png

# Full test suite
npx jest --no-coverage
```

## Liên quan

- Memory: `project_ai_pdf_eval_session.md` (cập nhật session 2026-06-04)
- Plan tiền nhiệm: `2026-06-04-pdf-eval-followup.md` (Items 1-4 đã ship)
- Dataset: `docs/superpowers/eval-pdf/problems.json` (14 bài cau-01..14)
- Eval logs: `/tmp/eval-full-run.log`, `/tmp/cau-14-retry.log` (session này)
