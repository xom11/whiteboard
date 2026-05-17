# Geometry-3D Stamp — GeoGebra-Style Redesign

**Status:** Design (awaiting user review)
**Target release:** v0.8.0
**Authors:** Claude (brainstorming session 2026-05-17)
**Scope:** Rewrite UX layer of `src/stamps/geometry-3d/` to match GeoGebra 3D Calculator interaction model. Render engine (`jsxgraph` view3d) and persistence format are kept and extended.

## 1. Motivation

The v0.7.0 `geometry-3d` stamp ships 15 tools (Move/Point/Segment/Line/Plane/Triangle/Polygon/Tetrahedron/Parallelepiped/Prism/Pyramid/Sphere/Cone/Cylinder/Label) but is unusable in practice for the target classroom audience because:

- **Free 3D points only.** Every point tool falls back to `prompt("Toạ độ (x, y, z)")`. Users must compute screen→world coordinates in their head.
- **No surface affordance.** Click on the ground plane or an existing polygon yields a prompt, not a point on that surface.
- **No drag editing.** Once created, points cannot be repositioned; only re-edit-and-restart works.
- **No algebra view.** Object list / numeric values are not visible.
- **Hint surface zero.** Tool-step expectations are not displayed; the user must know in advance that `pyramid` wants base-polygon-then-apex.

Reference: GeoGebra 3D Calculator (https://www.geogebra.org/3d), analyzed via Playwright on 2026-05-17. Key behaviors captured:

- Point tool click near z-axis → `Point(zAxis)`, only z parameter free.
- Point tool click on ground → `(x, y, 0)`, z locked.
- Move tool drag respects constraint (z-axis point slides along axis; ground point stays z=0).
- Algebra panel shows each object as `Label = SymbolicExpr` over `= numericValue`.
- 64-tool palette grouped Basic / Edit / Points / Lines / Polygons / Solids / Planes / Circles / Transform / Measure / View. Each `<button>` has an `aria-label` of form `"Tool. Step1, then Step2"`.

## 2. Scope

**In scope** — rewrite UX layer of geometry-3d stamp:

- Replace `prompt()`-based point creation with surface-constrained point creation via hit-test.
- Add drag-to-edit on points with constraint preservation.
- Add Algebra panel (read-only display + numeric edit + visibility/color/delete row menu).
- Replace ad-hoc handler dispatch with declarative tool spec + FSM controller.
- Status hint bar under the canvas during tool use.
- 15-tool subset for Vietnamese PTTH (Toán THPT) geometry curriculum.

**Out of scope** — explicitly deferred:

- Algebra panel for 2D stamp (separate work; the 2D stamp is shipping and stable).
- Typed-input DSL (`(3,4,2)`, `Sphere(O, 3)`) — read-only + numeric edit only.
- Transforms (Reflect/Rotate/Translate/Dilate), Conics (Ellipse/Hyperbola/Parabola), Locus, Surface of Revolution, Net.
- Replacement of the JSXGraph rendering library. We keep `jsxgraph` view3d and extend its usage.
- Animations / sliders.
- Undo/redo of scene operations (Excalidraw outer-shell undo continues to handle stamp insertion).

## 3. Tool Catalog (15 tools)

Grouped by section, with declarative step spec:

| Group | Tool | Steps | Notes |
|-------|------|-------|-------|
| View | Move | — | Drag any existing point (respecting its constraint) or pan/rotate scene. |
| Primitive | Point | 1 surface hit | Free-place on ground/plane/line/axis/polygon/sphere. |
| Primitive | Point on Object | 1 surface hit, object required | Like Point, but rejects empty/ground hits. |
| Primitive | Segment | 2 points | Existing or new (each on a surface). |
| Primitive | Line | 2 points | Infinite line through two points. |
| Primitive | Ray | 2 points | Origin then through-point. |
| Primitive | Vector | 2 points | From → to. |
| Primitive | Polygon | ≥3 points, close on first | Click the first vertex again to finalize. |
| Plane | Plane through 3 Points | 3 points | At least one must be off the others' line. |
| Solid | Pyramid | base polygon (≥3 pts, close) + apex | Apex is a new free-on-surface point. |
| Solid | Prism | base polygon + height number | Height extrudes along z. |
| Solid | Tetrahedron | 2 points | Regular tetrahedron with edge length `|p1-p2|`, bottom face on the plane through p1, p2 parallel to ground (z = min(p1.z, p2.z)). Apex above the centroid. |
| Solid | Cube | 2 points | Cube with edge length `|p1-p2|`. Bottom face contains the segment p1→p2 on the ground plane (z=0); the cube extrudes upward along +z. If both points have z>0, the user is asked to drop them to the ground or the build is rejected. |
| Curved | Sphere (center, surface point) | 2 points | Center then surface point. |
| Curved | Cylinder | base center + top center + radius number | |
| Curved | Cone | base center + apex + radius number | |

The "Label" tool is removed — labels become a row-menu action on existing points instead.

## 4. Architecture

Three layers, separated by clear interfaces:

```
┌─ Editor UI ────────────────────────────────────┐
│  LeftPanel (Tool palette | Algebra panel)      │
│         │                       │              │
│         └──────────┬────────────┘              │
│                    ▼                           │
│             ToolController (FSM)               │
└────────────────────┼───────────────────────────┘
                     ▼
┌─ Scene Layer (pure TS, no JSXGraph imports) ───┐
│  Scene3D                                       │
│  - objects: Map<id, Scene3DObject>             │
│  - addPoint/Segment/Plane/...                  │
│  - setParam(id, key, val)                      │
│  - delete(id) (cascades to dependents)         │
│  - on('add'|'change'|'delete'|'reset')         │
└────────────────────┬───────────────────────────┘
                     ▼
┌─ Render + Hit-Test (JSXGraph view3d) ──────────┐
│  JxgRenderer  — scene event → JXG element      │
│  HitTester    — screen (x, y) → SceneHit       │
└────────────────────────────────────────────────┘
```

The Scene Layer is the source of truth. The Renderer and HitTester are JSXGraph adapters; both can be swapped without touching tools/UI.

## 5. Scene Types

```ts
type Constraint =
  | { kind: 'free'; x: number; y: number; z: number }
  | { kind: 'onGround'; x: number; y: number }            // shortcut for z=0
  | { kind: 'onAxis'; axis: 'x' | 'y' | 'z'; t: number }
  | { kind: 'onPlane'; planeId: string; u: number; v: number }
  | { kind: 'onLine'; lineId: string; t: number }         // also covers segment, ray
  | { kind: 'onSphere'; sphereId: string; theta: number; phi: number }
  | { kind: 'onPolygon'; polygonId: string; u: number; v: number };

interface Scene3DObjectBase {
  id: string;
  label: string;            // display label, auto-generated "A", "B", ... or "a", "b" for non-points
  color?: string;
  visible: boolean;
}

type Scene3DObject =
  | (Scene3DObjectBase & { kind: 'point'; constraint: Constraint })
  | (Scene3DObjectBase & { kind: 'segment'; p1: string; p2: string })
  | (Scene3DObjectBase & { kind: 'line';    p1: string; p2: string })
  | (Scene3DObjectBase & { kind: 'ray';     origin: string; through: string })
  | (Scene3DObjectBase & { kind: 'vector';  from: string; to: string })
  | (Scene3DObjectBase & { kind: 'polygon'; vertices: string[] })
  | (Scene3DObjectBase & { kind: 'plane';   p1: string; p2: string; p3: string })
  | (Scene3DObjectBase & { kind: 'sphere';  center: string; surfacePoint: string })
  | (Scene3DObjectBase & { kind: 'polyhedron'; flavor: 'pyramid'|'prism'|'tetrahedron'|'cube'; vertices: string[]; faces: number[][] })
  | (Scene3DObjectBase & { kind: 'cylinder'; baseCenter: string; topCenter: string; radius: number })
  | (Scene3DObjectBase & { kind: 'cone';     baseCenter: string; apex: string; radius: number });
```

Labels are auto-assigned: points get uppercase `A, B, …, Z, A_1, B_1, …`; non-point objects get lowercase `a, b, …` for lines/segments/vectors, or descriptive prefixes like `pyramid_1`, `sphere_1` for solids/curved.

## 6. Serialization (backward-compatible)

Existing schema (v0.7.0, `src/stamps/geometry-3d/serialize.ts`):

```ts
interface Geometry3DCustomData {
  kind: 'geometry3d'; version: 1; jsonState: string;
  svgWidth: number; svgHeight: number;
}
interface SerializedBoard3D { version: 1; bbox; view; showAxes; showMesh; elements: SerializedElement3D[] }
interface SerializedElement3D { type; parents; attributes; id; label? }
```

**Both `version` fields bump to `2`.** The new fields:

```ts
interface SerializedElement3D_v2 extends SerializedElement3D_v1 {
  constraint?: Constraint;      // NEW — required on point3d in v2 stamps; absent ⇒ treat as 'free'
}
```

Loader rule in `parseSerializedBoard3D`:
- Accept `version === 1 || version === 2`.
- For `version === 1` stamps: every `point3d` element is loaded as `constraint = { kind: 'free', x, y, z }` derived from existing `parents: [x, y, z]`. Other element kinds load unchanged.
- For `version === 2` stamps: read `constraint` directly. If `point3d` lacks a `constraint`, treat as `'free'` (defensive default).

Legacy points may still be dragged, but only with the free-3D fallback heuristic — projecting mouse delta onto the camera-facing plane through the current point. Algebra row shows a "legacy" badge for visual clarity.

The wrapper `Geometry3DCustomData.version` and the inner `SerializedBoard3D.version` are kept numerically aligned (both = 2 for new stamps). `isGeometry3DCustomData` accepts `version === 1 || version === 2`. The schema bump is *additive only* — no field renamed or removed. `restoreMissingStampFiles` regenerates SVG previews for both v1 and v2 stamps using the same render path.

## 7. Hit Testing

```ts
function hitTest(
  screen: { x: number; y: number },
  view3d: JXG.View3D,
  scene: Scene3D,
): SceneHit;

type SceneHit =
  | { kind: 'existingPoint'; pointId: string }
  | { kind: 'onGround';   world: [number, number, 0] }
  | { kind: 'onAxis';     axis: 'x'|'y'|'z'; t: number; world: [number, number, number] }
  | { kind: 'onPlane';    planeId: string;   u: number; v: number; world: [number, number, number] }
  | { kind: 'onLine';     lineId: string;    t: number; world: [number, number, number] }
  | { kind: 'onPolygon';  polygonId: string; u: number; v: number; world: [number, number, number] }
  | { kind: 'onSphere';   sphereId: string;  theta: number; phi: number; world: [number, number, number] }
  | { kind: 'empty' };
```

Algorithm:

1. Build a screen-to-world ray from `view3d` projection matrix.
2. **Snap to existing points** if screen distance ≤ 8px to any rendered point.
3. Iterate non-point objects by priority: polygon → plane → sphere → line/segment/ray → axis → ground.
4. For each candidate, compute ray-object intersection; keep the **closest hit by camera depth**.
5. If nothing intersected (camera looking parallel to ground), return `empty`. UI shows a transient "Xoay góc nhìn rồi click" toast.

Hover state during a tool: continuously call `hitTest` on `pointermove` and update a status-bar message: `"📐 Plane through 3 Points — Chọn điểm thứ 2/3 (đang trên: mặt phẳng α)"`.

## 8. Renderer

`JxgRenderer` subscribes to scene events and maps each object kind to JSXGraph element creation:

- `point` with `onGround` → `view.create('point3d', [u, v, 0], { ... })` and `slideObject = groundPlane`.
- `point` with `onPlane` → parametric form using the plane's normal + basis vectors.
- `point` with `onAxis` → 1-parameter form along the axis direction.
- `point` with `onLine` / `onSphere` / `onPolygon` → analogous parametric coordinates.
- `segment` / `line` / `ray` → `line3d` with `straightFirst/Last` flags.
- `plane` → `plane3d` from 3 points.
- `polygon` → `polygon3d`.
- `polyhedron` → set of `polygon3d` faces (kept from v0.7.0; jsxgraph 1.12 `polyhedron3d` API is unstable per Bug #7).
- `sphere` → `sphere3d`.
- `cylinder` / `cone` → faceted approximation as polygons (CURVED_SEGMENTS=16, unchanged from v0.7.0).

Drag handling: every point's JSXGraph element gets an `on('drag', ...)` handler. The handler reads `point.X(), Y(), Z()`, inverse-projects to the constraint's parametric space (e.g. for `onPlane`: solve for `u, v` such that `origin + u*basis1 + v*basis2 = world`), and writes back to the scene via `scene.setParam(id, ...)`. The scene emits `change`; the algebra panel re-renders the row.

## 9. Tool Controller (FSM)

```ts
interface ToolSpec {
  key: string;
  label: string;       // "Đoạn thẳng"
  hintIdle: string;    // "Chọn 2 điểm để vẽ đoạn thẳng"
  steps: ToolStep[];
  build: (args: BuildArgs, scene: Scene3D) => string | null;  // returns new object id
}

type ToolStep =
  | {
      type: 'point';
      allowExisting: boolean;
      allowNewOn: Array<'ground' | 'axis' | 'plane' | 'line' | 'polygon' | 'sphere'>;
      hint: string;     // "Chọn điểm thứ nhất"
    }
  | { type: 'closingPoint'; hint: string }     // for Polygon — re-click first vertex closes
  | { type: 'object'; kinds: Scene3DObject['kind'][]; hint: string }
  | { type: 'number'; prompt: string; min?: number; max?: number };
```

State: `{ tool: ToolSpec | null; stepIndex: number; collected: CollectedArg[] }`.

Lifecycle:
- `selectTool(spec)` resets state.
- `onCanvasClick(screenXY)` → `hit = hitTest(...)` → match `currentStep` → push or reject.
  - Rejected → status bar flashes red, hint unchanged.
  - Accepted → `stepIndex++`. If past last step → `spec.build(collected, scene)`; reset.
- `onCanvasMove(screenXY)` → hover hint only.
- `onEsc()` → cancel, reset state, return to Move.

The `Polygon` tool has a special closing step: while `stepIndex >= 3` (i.e. at least 3 vertices placed), the next hit is checked against the first vertex with snap radius; if matched, the polygon finalizes; otherwise the vertex count grows.

## 10. UI Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  EditorPanel (modal-like float over Whiteboard)                  │
│  ┌─[Toolbar]──────────────────────────────────────────────────┐  │
│  │  [✕ Close]  [↩ Undo] [↪ Redo]      [Chèn vào bảng] [Lưu]  │  │
│  └────────────────────────────────────────────────────────────┘  │
│  ┌─Sidebar─┬─Canvas─────────────────────────────────────────────┐│
│  │ [Tools] │                                                    ││
│  │ [Algeb] │              ⟨ JSXGraph view3d ⟩                  ││
│  │         │                                                    ││
│  │ Tool    │                                                    ││
│  │ palette │                                                    ││
│  │ OR      │                                                    ││
│  │ Algebra │                                                    ││
│  │ list    │                                                    ││
│  │         ├────────────────────────────────────────────────────┤│
│  │         │ 📐 Đoạn thẳng — Chọn điểm thứ 2 (đang trên: nền)  ││ ← StatusHint
│  └─────────┴────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
```

- Sidebar tabs `[Tools] [Algebra]` mirror GeoGebra. Mobile collapses both to bottom sheet.
- Tool palette: 3-column grid, sections (`Cơ bản`, `Điểm`, `Đường thẳng`, `Đa giác`, `Mặt phẳng`, `Khối đa diện`, `Khối cong`). Selected tool highlighted, with hint shown beneath the tool label.
- Algebra list: one row per object, fields: chip (color swatch + visibility toggle) • label • symbolic expression • numeric value (editable for free-coord points and number params) • ⋮ menu (rename, change color, hide, delete).
- StatusHint bar: shows the active tool's current-step hint + the hover object's label, updating live.

## 11. File Layout

```
src/stamps/geometry-3d/
  index.tsx                   ← unchanged: stamp registration
  host.tsx                    ← unchanged: lazy-load Host
  serialize.ts                ← extended for v2 schema
  render.ts                   ← unchanged offscreen restore
  editor/
    EditorPanel.tsx           ← refactored: wires LeftPanel + MiniBoard + StatusHint
    MiniBoard3D.tsx           ← simplified: just mounts JSXGraph, exposes view3d ref
    LeftPanel.tsx             ← rewritten: tab switcher + Tools/Algebra content
    theme.ts                  ← unchanged: colors, view3d defaults
    StatusHint.tsx            ← NEW
    scene/
      Scene3D.ts              ← NEW: model + event emitter
      types.ts                ← NEW: Constraint, Scene3DObject
      constraintMath.ts       ← NEW: param ↔ world conversion
      labels.ts               ← NEW: auto-label generator
    hitTest/
      rayCast.ts              ← NEW: screen → world ray
      intersect.ts            ← NEW: ray–plane, ray–sphere, ray–polygon, ray–segment
      snapping.ts             ← NEW: existing-point snap
      hitTest.ts              ← NEW: orchestration
    renderer/
      JxgRenderer.ts          ← NEW: scene → JXG creation/update
      faceted.ts              ← NEW: cylinder/cone polygon faces (extracted)
    tools/
      spec.ts                 ← NEW: TOOLS array, ToolSpec types
      controller.ts           ← NEW: FSM + click/move/esc handlers
      handlers/
        point.ts segment.ts line.ts ray.ts vector.ts polygon.ts
        plane.ts pyramid.ts prism.ts tetrahedron.ts cube.ts
        sphere.ts cylinder.ts cone.ts
    toolPanel/
      ToolPalette.tsx         ← NEW: grid by section
      ToolButton.tsx          ← NEW
    algebraPanel/
      AlgebraList.tsx         ← NEW
      AlgebraRow.tsx          ← NEW
      RowMenu.tsx             ← NEW
  __tests__/                  ← all rewritten + new
    scene/Scene3D.test.ts
    scene/constraintMath.test.ts
    hitTest/intersect.test.ts
    hitTest/snapping.test.ts
    tools/controller.test.ts
    tools/handlers/point.test.ts        (one per tool)
    renderer/JxgRenderer.test.ts
    EditorPanel.test.tsx
    LeftPanel.test.tsx
    serialize.test.ts                   (v2 round-trip + v1 load)
```

The current files `editor/tools.ts`, `editor/toolButtons.tsx`, `editor/handlers.ts`, `editor/LeftPanel.tsx`, `editor/MiniBoard3D.tsx` (mounting+input mixed), and most existing tests will be **deleted** as part of the rewrite. `render.ts`, `theme.ts`, `index.tsx`, `host.tsx` are reused with minimal edits.

## 12. Data Flow

```
User selects Tool ─────────────────▶ ToolController.selectTool(spec)
                                        │
User clicks canvas (x,y) ───▶ HitTester.hitTest(x,y) → SceneHit
                                        │
                          ToolController.consumeHit(hit)
                                        │
                          (step matched → push collected;
                           step rejected → status flashes;
                           last step → spec.build(args, scene))
                                        │
                                        ▼
                          Scene3D.addPoint / addSegment / ...
                                        │
                                  emit 'add' / 'change'
                                        │
                       ┌────────────────┴────────────────┐
                       ▼                                 ▼
                JxgRenderer.handleAdd         AlgebraList.handleAdd
                       │                                 │
                       ▼                                 ▼
            JXG.create('point3d', ...)         <li> rendered

User drags point on canvas
                       │
              JXG fires 'drag' → point.X/Y/Z()
                       │
              Renderer hook: inverse-project → (u, v) for that constraint
                       │
                       ▼
              Scene3D.setParam(pointId, { u, v })
                       │
                  emit 'change'
                       │
              AlgebraRow re-renders numeric value
```

## 13. Edge Cases

- **Click empty viewport** (camera parallel to ground, no surface): return `empty`; status bar shows toast "Xoay góc nhìn rồi click".
- **Polygon < 3 vertices on Esc**: cancel without creating.
- **Plane through collinear points**: `plane.build` returns null; status bar shows "3 điểm thẳng hàng, không tạo được mặt phẳng".
- **Pyramid apex coplanar with base**: `pyramid.build` returns null; status bar shows "Đỉnh trùng mặt phẳng đáy, không tạo được hình chóp".
- **Tetrahedron with `p1 == p2`**: zero edge length; build returns null with hint "Hai điểm trùng nhau".
- **Cube with both points off the ground**: build returns null with hint "Chọn hai điểm trên mặt nền (z=0) cho hình lập phương".
- **Delete a point used by other objects**: cascade-delete dependents; show confirm dialog if cascade > 3 objects.
- **Sphere with surface point = center**: zero radius; build returns null; status bar shows hint.
- **Drag a point off its surface** (e.g. JSXGraph slide returns NaN at the surface boundary): clamp to last valid param; do not emit change.
- **Load v0.7.0 stamp**: loader treats every point as `kind: 'free'`. Algebra row shows "legacy" badge and disables surface-aware drag (free 3D fallback only — projects mouse delta onto camera-facing plane through current point).
- **Schema regression** (v3 stamp loaded by v0.8.0 code): loader logs warning, skips unknown fields. No crash.
- **Excalidraw double-click → crop mode race**: unchanged from v0.7.0 (existing `skipCropForIdRef` logic continues to apply).

## 14. Testing Strategy

- **Scene3D**: pure-TS unit tests. Construction of every object kind. Event emission ordering. Cascade delete. Serialize→deserialize round-trip for both v1 (legacy) and v2 stamps.
- **constraintMath**: each constraint kind, world↔param round-trip with synthetic plane/line/sphere bases.
- **intersect**: ray intersection unit tests with hand-computed expectations (origin-pointing ray + axis-aligned plane, etc.).
- **hitTest**: integration with a mocked view3d projection matrix. Verify snap priority order.
- **ToolController**: feed `SceneHit` sequences per tool, assert the resulting Scene state.
- **handlers/<tool>**: each `build(args, scene)` tested in isolation against a fresh Scene3D.
- **JxgRenderer**: mounted with a mock `JXG.create`; dispatch scene events; assert the right element types created with the right parametric args.
- **EditorPanel / LeftPanel**: testing-library renders the full editor, drives a happy-path scenario (place 3 points, build a plane), and asserts the algebra list contents.
- **Smoke test for v0.7.0 stamps**: load saved stamp JSON, ensure render succeeds and SVG export matches a snapshot (within tolerance).

Existing E2E tests for Whiteboard (`src/__tests__/Whiteboard.test.tsx`) are kept; specific 3D handlers and MiniBoard tests are replaced.

## 15. Migration & Release

- **v0.7.x → v0.8.0**: single release. No code path runs the old `editor/handlers.ts` flow.
- **No converter required**: serialize loader treats v1 stamps as `constraint: { kind: 'free' }` implicitly; no schema-write step in the load path.
- **README + CHANGELOG**: document the redesign, the new algebra panel, the v2 schema field, and the "legacy" badge behavior for v0.7.0 stamps.
- **No `Co-Authored-By`** in any commit (per CLAUDE.md).
- **Commits in Vietnamese** with English prefixes (`feat:`, `refactor:`, `test:`, `fix:`, `chore:`).

## 16. Open Questions

None at spec time. (Engine, scope, algebra depth, migration policy, release strategy were all resolved in the brainstorming Q&A.)

## 17. References

- GeoGebra 3D Calculator: https://www.geogebra.org/3d
- Playwright analysis screenshots (this session): `.playwright-mcp/geogebra-3d-*.png` (transient, not committed).
- v0.7.0 implementation: `src/stamps/geometry-3d/` (the engine + render layers we keep).
- Related prior specs: `docs/superpowers/specs/2026-05-15-reorg-and-3d-stamp-design.md`.
