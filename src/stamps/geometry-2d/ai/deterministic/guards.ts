// src/stamps/geometry-2d/ai/deterministic/guards.ts
//
// Hai guard fail-safe cho deterministic-first: nếu DSL dựng được KHÔNG trung thành
// với đề, router escalate AI thay vì render hình sai/thiếu. Bổ sung cho coverage
// clause-level (vốn coarse, dễ bỏ lọt khi 1 clause chứa nhiều construct).
import type { DslInputT } from '../../dsl/schema';
import type { IntentT } from '../intent';

// ── Guard 1: named-entity present ────────────────────────────────────────────
// Mọi đỉnh/điểm được ĐẶT TÊN hay KHAI BÁO trong đề phải tồn tại trong DSL.
// KHÔNG dùng \b (ASCII) quanh ký tự Việt.

// Tên điểm dẫn nhập 1 ký tự HOA: "Gọi M", "lấy điểm D", "cắt … tại D", "N là …",
// "H, K lần lượt", "và P là".
// Issue #46 nhóm A: prime (' U+0027 / ′ U+2032) là PHẦN của tên ("D′" ≠ "D").
// Group prime đứng ngay sau chữ cái — collect bằng letter + normalize(prime) để
// expected-name khớp DSL (rule pointAtDistance giữ prime → DSL có "D'").
const NAMED_INTRO = /(?:Gọi|gọi|Lấy|lấy|Dựng|dựng|Đặt|đặt|tại|điểm|và)\s+(?:điểm\s+)?([A-Z])(['′]?)(?![A-Za-z])/gu;
const NAMED_LA = /([A-Z])(['′]?)(?![A-Za-z])\s+là\b/gu;
const NAMED_LANLUOT = /([A-Z])(['′]?)(?![A-Za-z])\s*,\s*([A-Z])(['′]?)(?![A-Za-z])\s+lần lượt/gu;

// Ghép chữ cái + prime đã normalize (′→') thành tên đầy đủ. Đồng bộ với
// rules/pointAtDistance.ts normalizePointName — giữ naming layer nhất quán.
function joinPrime(letter: string | undefined, prime: string | undefined): string | undefined {
  if (!letter) return undefined;
  return prime ? `${letter}'` : letter;
}

// Đỉnh của hình khai báo: "tam giác ABC", "tứ giác ABCD", "hình vuông/… ABCD".
// Bắt cụm 3-4 ký tự HOA LIỀN ngay sau tên hình (mỗi đỉnh phải có trong DSL).
const SHAPE_TRI = /tam giác\s+([A-Z]{3})(?![A-Z])/gu;
const SHAPE_QUAD = /(?:tứ giác|hình\s+(?:vuông|chữ nhật|bình hành|thoi|thang))\s+([A-Z]{4})(?![A-Z])/gu;

export interface NamedEntityReport {
  ok: boolean;
  missing: string[];
}

function collectExpectedNames(problem: string): Set<string> {
  const names = new Set<string>();
  // Mỗi entry [letterGroup, primeGroup]: tên = letter + normalize(prime).
  const add = (re: RegExp, groups: [number, number][]) => {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(problem)) !== null) {
      for (const [lg, pg] of groups) {
        const name = joinPrime(m[lg], m[pg]);
        if (name) names.add(name);
      }
    }
  };
  add(NAMED_INTRO, [[1, 2]]);
  add(NAMED_LA, [[1, 2]]);
  add(NAMED_LANLUOT, [[1, 2], [3, 4]]);
  // Đỉnh hình: tách cụm 3/4 ký tự thành từng đỉnh.
  for (const re of [SHAPE_TRI, SHAPE_QUAD]) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(problem)) !== null) {
      for (const ch of m[1]) names.add(ch);
    }
  }
  return names;
}

export function allNamedEntitiesPresent(problem: string, dsl: DslInputT): NamedEntityReport {
  const present = new Set<string>();
  for (const p of dsl.points) present.add(p.name);
  for (const s of dsl.shapes) present.add(s.name);

  const missing: string[] = [];
  for (const name of collectExpectedNames(problem)) {
    if (!present.has(name)) missing.push(name);
  }
  return { ok: missing.length === 0, missing };
}

// ── Guard 2: intent → DSL fidelity ───────────────────────────────────────────
// Mỗi add-point intent dựng điểm phái sinh (không phải 'free') PHẢI hiện diện
// trong DSL đúng dạng. Builder idempotent DROP add-point khi tên trùng đỉnh sẵn
// có (vd "đường cao AB" → foot B trùng vertex B) → điểm để 'free' → guard bắt.

export interface FidelityReport {
  ok: boolean;
  dropped: string[];
}

export function verifyIntentFidelity(intents: readonly IntentT[], dsl: DslInputT): FidelityReport {
  const byName = new Map<string, { kind: string }>();
  for (const p of dsl.points) byName.set(p.name, p as unknown as { kind: string });

  const dropped: string[] = [];
  for (const intent of intents) {
    if (intent.op !== 'add-point') continue;
    const kind = (intent as { constraint?: { kind?: string } }).constraint?.kind;
    if (!kind || kind === 'free') continue; // free point không phải construct
    const name = (intent as { name: string }).name;
    const pt = byName.get(name);
    // Thiếu hẳn, hoặc bị builder hạ về 'free' (đã bị drop bởi vertex trùng tên).
    if (!pt || pt.kind === 'free') dropped.push(name);
  }
  return { ok: dropped.length === 0, dropped };
}
