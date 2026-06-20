// src/stamps/geometry-2d/ai/deterministic/partialFigure.ts
//
// Partial deterministic render (Hướng A — cắt tỉa theo phụ thuộc + verify lại):
// khi tryDeterministicFigure MISS (không phủ đủ đề), thử cứu vãn phần CHẮC CHẮN
// ĐÚNG thay vì vứt toàn bộ. Render phần dựng được (≥1 hình thật) + trả to-do list
// để user tự dựng nốt. KHÔNG gọi LLM.
//
// Khác tryDeterministicFigure: hàm này CỐ TÌNH chấp nhận coverage incomplete, rồi
//   1. cắt mọi phần tử DSL phụ thuộc entity chưa dựng được (ref treo, lan truyền),
//   2. cắt phần tử khiến transpile lỗi (theo owner trong error path),
//   3. cắt tam giác sai khi verify-fail,
// và CHỈ render khi phần còn lại transpile + verify SẠCH (giữ cam kết "đúng").
//
// Hàm thuần, không I/O. Spec: docs/superpowers/specs/2026-06-10-partial-deterministic-render-design.md
import type { DslInputT, DslPointT, DslShapeT } from '../../dsl/schema';
import type { TranspileResult, TranspileError } from '../../dsl/transpile/errors';
import type { VerifyReport } from '../verify';
import type { Clause } from './coverage';
import type { DeterministicFigure } from './tryDeterministicFigure';
import { tryPartialDeterministic } from './runDeterministicIntents';
import { allNamedEntitiesPresent } from './guards';
import { normalizeIntents } from '../normalizeIntent';
import { normalizeProblemText } from './normalizeText';
import { correctUserInput } from './correctUserInput';
import { resolveCircleNameCollisions } from '../resolveCircleNames';
import { intentsToDsl } from '../intentToDsl';
import { collectRefs } from '../../dsl/transpile/refs';
import { transpile } from '../../dsl';
import { verifyGeometry } from '../verify';

/** Bound vòng cắt-rồi-thử lại transpile/verify (mỗi vòng bỏ ≥1 phần tử). */
const MAX_SALVAGE_ITERS = 6;

export interface PartialTodo {
  /** Clause geo chưa có rule nào khớp (nguyên văn) — "chưa hỗ trợ cấu trúc". */
  uncovered: Clause[];
  /**
   * Tên đối tượng đề CÓ nêu (vd "P là điểm Fermat", đỉnh D) nhưng KHÔNG dựng được
   * — nguồn từ named-entity guard. Đây là kịch bản "ABC vẽ được, D thì không":
   * clause được rule claim (coverage complete) nhưng entity không ra → không phải
   * ref treo, chỉ guard này thấy. Đã loại trùng với `pruned`.
   */
  missingNamed: string[];
  /** Tên entity bị cắt vì phụ thuộc phần chưa dựng được (transitive). */
  pruned: string[];
}

export interface PartialFigureResult {
  /** Hình phần đã cắt — đã qua transpile + verify, sẵn render. */
  figure: DeterministicFigure;
  todo: PartialTodo;
}

/**
 * Thử dựng phần CHẮC CHẮN ĐÚNG của đề khi không phủ đủ. Trả `null` nếu không cứu
 * được phần hình thật nào (→ caller báo miss toàn bộ như cũ).
 */
export function tryPartialFigure(rawProblem: string): PartialFigureResult | null {
  const problem = normalizeProblemText(correctUserInput(rawProblem));
  const part = tryPartialDeterministic(problem);
  // Không rule nào khớp → không có gì để cứu.
  if (part.detIntents.length === 0) return null;

  // Mirror đúng các stage chuẩn hoá của tryDeterministicFigure để 2 path hội tụ.
  const intents = resolveCircleNameCollisions(normalizeIntents(part.detIntents, problem));

  let dsl: DslInputT;
  try {
    dsl = intentsToDsl(intents);
  } catch {
    return null;
  }

  const pruned = new Set<string>();

  // (1) Cắt lan truyền các phần tử có ref treo (entity của clause chưa phủ).
  pruneDangling(dsl, pruned);

  // (2)+(3) Transpile + verify; cắt phần tử gây lỗi rồi thử lại tới khi sạch.
  let tOk: Extract<TranspileResult, { ok: true }> | null = null;
  let vOk: VerifyReport | null = null;
  for (let iter = 0; iter < MAX_SALVAGE_ITERS; iter++) {
    let t: TranspileResult;
    try {
      t = transpile(dsl);
    } catch {
      return null;
    }
    if (!t.ok) {
      const owners = uniqueOwners(t.errors);
      if (owners.length === 0) return null; // không pin được lỗi → thà miss
      dropNames(dsl, owners, pruned);
      pruneDangling(dsl, pruned);
      continue;
    }
    const v = verifyGeometry(intents, dsl);
    if (!v.ok) {
      const bad = namesFromVerify(v);
      if (bad.length === 0) return null;
      dropNames(dsl, bad, pruned);
      pruneDangling(dsl, pruned);
      continue;
    }
    tOk = t;
    vOk = v;
    break;
  }
  if (!tOk || !vOk) return null;

  // Ngưỡng: chỉ render khi còn ≥1 HÌNH THẬT (đoạn/đường/đa giác/đường tròn).
  // Vài điểm rời rạc → vô nghĩa, để caller báo miss toàn bộ.
  if (dsl.shapes.length === 0) return null;

  // Named-entity thiếu (đề nêu D/P… nhưng không dựng được) — loại trùng `pruned`.
  const prunedList = [...pruned].sort();
  const prunedSet = new Set(prunedList);
  const missingNamed = allNamedEntitiesPresent(problem, dsl).missing.filter(
    (n) => !prunedSet.has(n),
  );

  return {
    figure: { intents, dsl, transpile: tOk, verify: vOk, coverage: part.coverage },
    todo: { uncovered: part.uncovered, missingNamed, pruned: prunedList },
  };
}

/**
 * Lặp tới fixpoint: bỏ mọi point/shape mà `collectRefs` trỏ tới tên KHÔNG còn
 * trong DSL (ref treo). Phần tử vừa bỏ làm dependent của nó treo ở vòng sau.
 */
function pruneDangling(dsl: DslInputT, pruned: Set<string>): void {
  let changed = true;
  while (changed) {
    changed = false;
    const present = new Set<string>([
      ...dsl.points.map((p) => p.name),
      ...dsl.shapes.map((s) => s.name),
    ]);
    const dangling = (e: DslPointT | DslShapeT): boolean => {
      let refs: string[];
      try {
        refs = collectRefs(e);
      } catch {
        return false; // kind lạ (không có registry) → giữ, không tự ý cắt
      }
      return refs.some((r) => !present.has(r));
    };
    const beforeP = dsl.points.length;
    const beforeS = dsl.shapes.length;
    dsl.points = dsl.points.filter((p) => {
      if (dangling(p)) {
        pruned.add(p.name);
        return false;
      }
      return true;
    });
    dsl.shapes = dsl.shapes.filter((s) => {
      if (dangling(s)) {
        pruned.add(s.name);
        return false;
      }
      return true;
    });
    if (dsl.points.length !== beforeP || dsl.shapes.length !== beforeS) changed = true;
  }
}

/** Bỏ các phần tử theo tên (owner lỗi / tam giác sai). Dependent dọn ở pruneDangling sau. */
function dropNames(dsl: DslInputT, names: readonly string[], pruned: Set<string>): void {
  const drop = new Set(names);
  const kill = (n: string): boolean => {
    if (drop.has(n)) {
      pruned.add(n);
      return true;
    }
    return false;
  };
  dsl.points = dsl.points.filter((p) => !kill(p.name));
  dsl.shapes = dsl.shapes.filter((s) => !kill(s.name));
}

/** Tên entity gây lỗi transpile (path[0] = owner). Dedup. */
function uniqueOwners(errors: readonly TranspileError[]): string[] {
  const out = new Set<string>();
  for (const e of errors) {
    const owner = e.path?.[0];
    if (owner) out.add(owner);
  }
  return [...out];
}

/** Trích tên hình (tam giác ABC) từ verify issue để cắt. */
function namesFromVerify(v: VerifyReport): string[] {
  const out = new Set<string>();
  for (const issue of v.wrong) {
    const m = /triangle\s+([A-Za-z0-9_]+)/.exec(issue.detail ?? '');
    if (m) out.add(m[1]);
  }
  return [...out];
}

/**
 * Dịch to-do partial → câu tiếng Việt cho panel AI. Phân 2 nhóm:
 *   - uncovered → "chưa hỗ trợ cấu trúc này"
 *   - pruned    → "phụ thuộc phần chưa vẽ được"
 */
export function describePartialTodo(todo: PartialTodo): string {
  const items: string[] = [];
  for (const c of todo.uncovered) items.push(`• «${c.text.trim()}» (chưa hỗ trợ cấu trúc này)`);
  for (const name of todo.missingNamed) items.push(`• ${name} (chưa dựng được — tự xác định)`);
  for (const name of todo.pruned) items.push(`• ${name} — phụ thuộc phần chưa vẽ được`);
  if (items.length === 0) {
    return '✅ Rule base đã dựng được phần chắc chắn đúng. Bạn kiểm tra lại phần còn lại.';
  }
  return ['✅ Rule base đã dựng được phần chắc chắn đúng.', '✏️ Bạn tự dựng nốt:', ...items].join(
    '\n',
  );
}
