# Phase 2.2-2.3 AI Editor UX + Eval Harness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose opt-in AI figure generation in the geometry editor through a server-safe callback and add deterministic/local-real-call evaluation tools.

**Architecture:** The client editor receives a callback instead of importing the Anthropic SDK; `useAiFigure` owns request state and cancellation, while `EditorPanel` replaces scene objects through `LOAD` and preserves active view metadata. Development-only TypeScript scripts call the existing server-side `generateFigure()` and score a fixed corpus.

**Tech Stack:** React 19, TypeScript strict, Jest/testing-library, scene store reducer, `tsx` for Node scripts, existing Anthropic SDK call layer.

**Spec:** `docs/superpowers/specs/2026-05-26-phase2-2-ai-editor-eval-design.md`

---

### Task 1: UI Callback Contract And Hook

**Files:**
- Create: `src/stamps/geometry-2d/editor/useAiFigure.ts`
- Create: `src/stamps/geometry-2d/editor/__tests__/useAiFigure.test.tsx`

- [ ] **Step 1: Write failing hook tests**

Test a success callback, blank prompt validation, an `{ ok: false, message }` response, and cancellation when a second submit supersedes the first.

- [ ] **Step 2: Run test and verify red**

Run: `npx jest src/stamps/geometry-2d/editor/__tests__/useAiFigure.test.tsx --runInBand`

Expected: fail because `useAiFigure` does not exist.

- [ ] **Step 3: Implement the minimal hook contract**

```ts
export type AiFigureUiResult =
  | { ok: true; state: State }
  | { ok: false; message: string };

export type GenerateGeometryFigure = (
  problem: string,
  options: { signal: AbortSignal },
) => Promise<AiFigureUiResult>;

export function useAiFigure(generator?: GenerateGeometryFigure): {
  prompt: string;
  setPrompt: (value: string) => void;
  isLoading: boolean;
  error: string | null;
  submit: () => Promise<State | null>;
};
```

The implementation trims prompts, aborts obsolete requests, ignores abort errors, and turns other failures into a Vietnamese UI message.

- [ ] **Step 4: Run hook tests and verify green**

Run: `npx jest src/stamps/geometry-2d/editor/__tests__/useAiFigure.test.tsx --runInBand`

Expected: all hook tests pass.

### Task 2: Editor/Whiteboard Integration

**Files:**
- Modify: `src/Whiteboard.tsx`
- Modify: `src/stamps/shared/types.ts`
- Modify: `src/stamps/geometry-2d/host.tsx`
- Modify: `src/stamps/geometry-2d/editor/EditorPanel.tsx`
- Modify: `src/stamps/geometry-2d/__tests__/EditorPanel.test.tsx`

- [ ] **Step 1: Add failing component tests**

Add tests asserting that the AI textarea is hidden without a generator, submits the prompt when enabled, shows loading/errors, and loads successful State while retaining the current `meta`.

- [ ] **Step 2: Verify red**

Run: `npx jest src/stamps/geometry-2d/__tests__/EditorPanel.test.tsx --runInBand`

Expected: new tests fail because AI props/form are absent.

- [ ] **Step 3: Wire optional callback and form**

Add `generateGeometryFigure?: GenerateGeometryFigure` to public/host/editor props; forward it from `Whiteboard` through `GeometryStampHost`. On success:

```ts
const current = store.getState();
store.dispatch({
  type: 'LOAD',
  payload: { state: { ...generated, meta: current.meta } },
});
```

Render a compact textarea/form above the board only when the callback exists, with `role="alert"` for error output.

- [ ] **Step 4: Verify component and hook tests**

Run: `npx jest src/stamps/geometry-2d/__tests__/EditorPanel.test.tsx src/stamps/geometry-2d/editor/__tests__/useAiFigure.test.tsx --runInBand`

Expected: pass.

### Task 3: Eval Corpus And Scoring

**Files:**
- Create: `scripts/ai-eval-lib.ts`
- Create: `scripts/eval-ai.ts`
- Create: `scripts/__tests__/ai-eval-lib.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Add failing tests for corpus/scoring**

Assert `EVAL_CASES` has 20-30 distinct problems; a matching state passes; missing required labels/kinds and failed generation fail with diagnostic text.

- [ ] **Step 2: Verify red**

Run: `npx jest scripts/__tests__/ai-eval-lib.test.ts --runInBand`

Expected: fail because the eval library does not exist.

- [ ] **Step 3: Implement corpus and CLI**

Define 24 cases with `requiredLabels` and `requiredKinds`. Implement `evaluateResult()` using State objects. Add `tsx` and:

```json
"ai:eval": "tsx scripts/eval-ai.ts"
```

The CLI requires `ANTHROPIC_API_KEY`, executes cases sequentially, reports totals/token use and exits `1` if any case fails.

- [ ] **Step 4: Verify deterministic tests**

Run: `npx jest scripts/__tests__/ai-eval-lib.test.ts --runInBand`

Expected: pass without network access.

### Task 4: Real API Smoke Script And Follow-Up Issue

**Files:**
- Create: `scripts/smoke-ai.ts`
- Modify: `package.json`

- [ ] **Step 1: Add smoke command**

Implement an executable TypeScript script that validates `ANTHROPIC_API_KEY`, calls `generateFigure()` with a single triangle prompt, prints result/usage, and never prints the key. Add:

```json
"ai:smoke": "tsx scripts/smoke-ai.ts"
```

- [ ] **Step 2: Track serializer separately**

Create a separate GitHub issue, when repository authentication is available, covering State -> DSL serialization for the `Doi tuong` tab and explicitly excluding it from this implementation.

- [ ] **Step 3: Verify locally**

Run: `npm test -- --runInBand`, `npm run typecheck`, and `npm run build`.

When `ANTHROPIC_API_KEY` is available, run: `npm run ai:smoke`.
