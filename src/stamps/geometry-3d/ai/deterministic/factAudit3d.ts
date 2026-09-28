// factAudit3d — ĐO hình 3D đã dựng có đúng các điều kiện ĐỀ nêu không ("thà thiếu còn hơn sai").
//
// Đọc đề → rút các "sự kiện" hình học dạng câu chữ phổ biến (SA ⊥ (ABCD), M là trung điểm AB,
// đáy là tam giác vuông tại B, hình chiếu của S trên đáy là trọng tâm tam giác ABD, lăng trụ
// đứng, chóp đều …) → tính toạ độ THẬT từ scene (constraintToWorld) → kiểm tra.
// Chỉ kiểm sự kiện mà mọi điểm liên quan đều có mặt trong scene (thiếu điểm = "không kiểm",
// KHÔNG phải vi phạm — guard named-missing lo phần đó).
//
// Nhóm sự kiện:
//   - 'incidence' : quan hệ vị trí/vuông góc/song song/trung điểm/chân hình chiếu (vẽ sai = sai đề)
//   - 'metric'    : độ dài/đều/cân (tam giác đều, chóp đều có cạnh bên bằng nhau, lập phương…)
import type { State } from '../../../../core/scene';
import { constraintToWorld } from '../../../../core/scene/kinds/constraint3d-math';

export type Vec3 = [number, number, number];

export interface Fact3D {
  kind: string;
  group: 'incidence' | 'metric';
  text: string;          // mô tả ngắn để debug
  labels: string[];      // mọi nhãn điểm cần có
  check(P: Record<string, Vec3>): boolean;
}

export interface FactAuditResult {
  checked: Fact3D[];
  violated: Fact3D[];
  skipped: Fact3D[];     // thiếu điểm → không kiểm
}

// ───── toạ độ ─────

const normLabel = (s: string) => s.replace(/[′’´]/gu, "'");

/** Toạ độ world của mọi point3d theo nhãn (nhãn chuẩn hoá prime về '). */
export function toaDo3d(state: State): Record<string, Vec3> {
  const out: Record<string, Vec3> = {};
  for (const o of Object.values(state.objects)) {
    if (o.kind !== 'point3d' || !o.label) continue;
    try {
      out[normLabel(o.label)] = constraintToWorld((o.attrs as { constraint: never }).constraint, state) as Vec3;
    } catch {
      /* điểm hỏng → bỏ, verify3d lo */
    }
  }
  return out;
}

// ───── vector ─────
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: Vec3) => Math.sqrt(dot(a, a));
const dist = (a: Vec3, b: Vec3) => len(sub(a, b));
const TOL = 1e-4;
const near = (x: number, y: number) => Math.abs(x - y) <= TOL * Math.max(1, Math.abs(x), Math.abs(y));
const samePt = (a: Vec3, b: Vec3) => dist(a, b) <= TOL * Math.max(1, len(a), len(b));

function normalOf(a: Vec3, b: Vec3, c: Vec3): Vec3 { return cross(sub(b, a), sub(c, a)); }
/** |cos| giữa 2 vector (0 = vuông góc, 1 = cùng phương). */
function absCos(u: Vec3, v: Vec3): number {
  const n = len(u) * len(v);
  return n === 0 ? NaN : Math.abs(dot(u, v)) / n;
}
const isPerp = (u: Vec3, v: Vec3) => absCos(u, v) <= TOL * 10;
const isPar = (u: Vec3, v: Vec3) => Math.abs(absCos(u, v) - 1) <= TOL * 10;

// ───── parse helpers ─────
const LBL = "[A-Z](?:['′’])?";
const lblRe = new RegExp(LBL, 'gu');
const splitLabels = (s: string) => (s.match(lblRe) ?? []).map(normLabel);

interface SolidInfo { kind: 'pyramid' | 'tetra' | 'prism' | 'box'; apex?: string; base: string[]; top?: string[] }

function parseSolid(problem: string): SolidInfo | null {
  let m = /chóp\s+(?:(?:tứ|tam|lục|ngũ)\s*giác\s*)?(?:đều\s+)?([A-Z])\s*\.\s*((?:[A-Z])+)/u.exec(problem);
  if (m) return { kind: 'pyramid', apex: m[1], base: splitLabels(m[2]) };
  m = /tứ\s+diện(?:\s+đều)?\s+([A-Z]{4})(?![A-Z])/u.exec(problem);
  if (m) { const v = splitLabels(m[1]); return { kind: 'tetra', apex: v[3], base: v.slice(0, 3) }; }
  m = /lăng\s*trụ(?:\s+(?:đứng|đều|tam\s+giác|tứ\s+giác))*\s+([A-Z]{3,4})\s*\.\s*((?:[A-Z]['′’])+)/u.exec(problem);
  if (m) return { kind: 'prism', base: splitLabels(m[1]), top: splitLabels(m[2]) };
  m = /(?:hình\s+hộp(?:\s+chữ\s+nhật)?|lập\s+phương)\s+([A-Z]{4})\s*\.\s*((?:[A-Z]['′’])+)/u.exec(problem);
  if (m) return { kind: 'box', base: splitLabels(m[1]), top: splitLabels(m[2]) };
  return null;
}

/** "(ABCD)" | "đáy" | "mặt phẳng đáy" → 3 nhãn điểm của mặt. */
function planeLabels(tok: string | undefined, solid: SolidInfo | null): string[] | null {
  if (!tok) return null;
  const t = tok.trim();
  if (/đáy/u.test(t)) return solid && solid.base.length >= 3 ? solid.base.slice(0, 3) : null;
  const L = splitLabels(t);
  return L.length >= 3 ? L.slice(0, 3) : null;
}

const PLANE_TOK = `(?:mặt\\s*phẳng\\s*|mp\\s*)?(?:\\(((?:${LBL}){3,})\\)|(?:mặt\\s*phẳng\\s+)?(?:mặt\\s+)?(đáy)(?:\\s*\\(?[A-Z]{3,}\\)?)?)`;

function mk(kind: string, group: Fact3D['group'], text: string, labels: string[], check: Fact3D['check']): Fact3D {
  return { kind, group, text, labels: labels.map(normLabel), check };
}

// ───── extractors ─────

function lineperpPlaneFacts(problem: string, solid: SolidInfo | null): Fact3D[] {
  const out: Fact3D[] = [];
  const re = new RegExp(`(?<![(\\p{L}'′’])(${LBL})(${LBL})\\s*(?:⊥|vuông\\s*góc(?:\\s+với)?)\\s*${PLANE_TOK}`, 'gu');
  for (const m of problem.matchAll(re)) {
    const pl = planeLabels(m[3] ?? m[4], solid);
    if (!pl) continue;
    const [x, y] = [normLabel(m[1]), normLabel(m[2])];
    out.push(mk('line⊥plane', 'incidence', `${x}${y}⊥(${pl.join('')})`, [x, y, ...pl],
      (P) => isPar(sub(P[y], P[x]), normalOf(P[pl[0]], P[pl[1]], P[pl[2]]))));
  }
  // "đường cao SC" (chóp) → SC ⊥ đáy
  const h = /đường\s+cao\s+([A-Z])([A-Z])(?![A-Z])/u.exec(problem);
  if (h && solid?.kind === 'pyramid' && h[1] === solid.apex) {
    const pl = solid.base.slice(0, 3);
    out.push(mk('line⊥plane', 'incidence', `đường cao ${h[1]}${h[2]}`, [h[1], h[2], ...pl],
      (P) => isPar(sub(P[h[2]], P[h[1]]), normalOf(P[pl[0]], P[pl[1]], P[pl[2]]))));
  }
  return out;
}

function pairwisePerpFacts(problem: string): Fact3D[] {
  const out: Fact3D[] = [];
  // "OA, OB, OC đôi một vuông góc" | "SA, AB, BC đôi một vuông góc"
  const re = /((?:[A-Z]{2}\s*,\s*)+[A-Z]{2})\s+(?:(?:là\s+)?(?:ba\s+)?(?:đường\s+thẳng\s+)?)?đôi\s+một\s+vuông\s+góc/gu;
  for (const m of problem.matchAll(re)) {
    const segs = m[1].split(/\s*,\s*/u).map((s) => [s[0], s[1]] as [string, string]);
    for (let i = 0; i < segs.length; i++) for (let j = i + 1; j < segs.length; j++) {
      const [a, b] = segs[i], [c, d] = segs[j];
      out.push(mk('line⊥line', 'incidence', `${a}${b}⊥${c}${d}`, [a, b, c, d], (P) => isPerp(sub(P[b], P[a]), sub(P[d], P[c]))));
    }
  }
  return out;
}

function planePerpFacts(problem: string, solid: SolidInfo | null): Fact3D[] {
  const out: Fact3D[] = [];
  const push = (p1: string[], p2: string[], txt: string) => {
    out.push(mk('plane⊥plane', 'incidence', txt, [...p1, ...p2], (P) =>
      isPerp(normalOf(P[p1[0]], P[p1[1]], P[p1[2]]), normalOf(P[p2[0]], P[p2[1]], P[p2[2]]))));
  };
  // "(SAB) ⊥ (ABCD)" | "(SAB) vuông góc với đáy"
  const re1 = new RegExp(`\\(((?:${LBL}){3,})\\)\\s*(?:⊥|vuông\\s*góc(?:\\s+với)?)\\s*${PLANE_TOK}`, 'gu');
  for (const m of problem.matchAll(re1)) {
    const a = splitLabels(m[1]).slice(0, 3); const b = planeLabels(m[2] ?? m[3], solid);
    if (a.length === 3 && b) push(a, b, m[0]);
  }
  // "(SAB) và (SAD) cùng vuông góc với đáy"
  const re2 = new RegExp(`\\(?((?:${LBL}){3,})\\)?\\s*(?:,|và)\\s*\\(?((?:${LBL}){3,})\\)?\\s+cùng\\s+vuông\\s*góc(?:\\s+với)?\\s*${PLANE_TOK}`, 'gu');
  for (const m of problem.matchAll(re2)) {
    const b = planeLabels(m[3] ?? m[4], solid);
    if (!b) continue;
    for (const t of [m[1], m[2]]) { const a = splitLabels(t).slice(0, 3); if (a.length === 3) push(a, b, m[0]); }
  }
  // "tam giác SAB … (nằm trong|thuộc) mặt phẳng vuông góc với đáy" | "mặt bên SAB … vuông góc với đáy"
  const re3 = new RegExp(`(?:[Tt]am\\s+giác|[Mm]ặt\\s+bên)\\s+((?:${LBL}){3})(?![A-Z])(?:(?!(?:[Tt]am\\s+giác|[Mm]ặt\\s+bên)\\s+[A-Z]{3})[^.;]){0,80}?(?:nằm\\s+trong|thuộc)\\s+(?:một\\s+)?mặt\\s*phẳng\\s+(?:vuông\\s*góc|⊥)(?:\\s+với)?\\s*${PLANE_TOK}`, 'gu');
  for (const m of problem.matchAll(re3)) {
    const a = splitLabels(m[1]); const b = planeLabels(m[2] ?? m[3], solid);
    if (a.length === 3 && b) push(a, b, m[0]);
  }
  return out;
}

function isRightAt(P: Record<string, Vec3>, at: string, a: string, b: string) {
  return isPerp(sub(P[a], P[at]), sub(P[b], P[at]));
}

/** Các sự kiện về hình dạng một đa giác nêu tên (đáy, hoặc "tam giác XYZ …"). */
function shapeFacts(labels: string[], desc: string, where: string): Fact3D[] {
  const out: Fact3D[] = [];
  const L = labels;
  const n = L.length;
  const side = (P: Record<string, Vec3>, i: number) => dist(P[L[i]], P[L[(i + 1) % n]]);
  const d = desc.replace(/\s+/gu, ' ');
  if (n === 3) {
    const [A, B, C] = L;
    const other = (x: string) => L.filter((y) => y !== x) as [string, string];
    let m = /vuông\s+cân\s+tại\s+([A-Z])/u.exec(d) ?? /vuông\s+tại\s+([A-Z])/u.exec(d) ?? /vuông\s+ở\s+([A-Z])/u.exec(d);
    if (m && L.includes(m[1])) {
      const at = m[1]; const [p, q] = other(at);
      out.push(mk('right-angle', 'incidence', `${where}: vuông tại ${at}`, L, (P) => isRightAt(P, at, p, q)));
      if (/vuông\s+cân/u.test(m[0])) out.push(mk('isosceles', 'metric', `${where}: cân tại ${at}`, L, (P) => near(dist(P[at], P[p]), dist(P[at], P[q]))));
    }
    m = /(?<!vuông\s)cân\s+tại\s+([A-Z])/u.exec(d);
    if (m && L.includes(m[1])) {
      const at = m[1]; const [p, q] = other(at);
      out.push(mk('isosceles', 'metric', `${where}: cân tại ${at}`, L, (P) => near(dist(P[at], P[p]), dist(P[at], P[q]))));
    }
    if (/^(?:là\s+)?(?:một\s+)?(?:tam\s+giác\s+)?đều/u.test(d.replace(/^[^a-zà-ỹ]*/u, '')) || /tam\s+giác\s+đều/u.test(d)) {
      out.push(mk('equilateral', 'metric', `${where}: đều`, L, (P) => near(dist(P[A], P[B]), dist(P[B], P[C])) && near(dist(P[B], P[C]), dist(P[C], P[A]))));
    }
    return out;
  }
  if (n !== 4) return out;
  const [A, B, C, D] = L;
  const par = (a: string, b: string, c: string, e: string) => (P: Record<string, Vec3>) => isPar(sub(P[b], P[a]), sub(P[e], P[c]));
  const pgram = (P: Record<string, Vec3>) => par(A, B, D, C)(P) && par(A, D, B, C)(P);
  if (/hình\s+vuông/u.test(d)) {
    out.push(mk('parallelogram', 'incidence', `${where}: hbh`, L, pgram));
    out.push(mk('right-angle', 'incidence', `${where}: góc A vuông`, L, (P) => isRightAt(P, A, B, D)));
    out.push(mk('square', 'metric', `${where}: cạnh bằng nhau`, L, (P) => near(side(P, 0), side(P, 1))));
  } else if (/hình\s+chữ\s+nhật/u.test(d)) {
    out.push(mk('parallelogram', 'incidence', `${where}: hbh`, L, pgram));
    out.push(mk('right-angle', 'incidence', `${where}: góc A vuông`, L, (P) => isRightAt(P, A, B, D)));
  } else if (/hình\s+thoi/u.test(d)) {
    out.push(mk('parallelogram', 'incidence', `${where}: hbh`, L, pgram));
    out.push(mk('rhombus', 'metric', `${where}: cạnh bằng nhau`, L, (P) => near(side(P, 0), side(P, 1))));
  } else if (/hình\s+bình\s+hành/u.test(d)) {
    out.push(mk('parallelogram', 'incidence', `${where}: hbh`, L, pgram));
  } else if (/hình\s+thang|nửa\s+lục\s+giác/u.test(d)) {
    const pm = /([A-Z])([A-Z])\s*(?:\/\/|∥|song\s+song(?:\s+với)?)\s*([A-Z])([A-Z])/u.exec(d);
    if (pm && [pm[1], pm[2], pm[3], pm[4]].every((x) => L.includes(x))) {
      out.push(mk('parallel', 'incidence', `${where}: ${pm[1]}${pm[2]}∥${pm[3]}${pm[4]}`, L, par(pm[1], pm[2], pm[3], pm[4])));
    } else {
      out.push(mk('trapezoid', 'incidence', `${where}: có cặp cạnh ∥`, L, (P) => par(A, B, D, C)(P) || par(A, D, B, C)(P)));
    }
    const vm = /vuông\s+tại\s+([A-Z])(?:\s*(?:và|,)\s*([A-Z]))?/u.exec(d);
    if (vm) for (const at of [vm[1], vm[2]].filter(Boolean) as string[]) {
      const i = L.indexOf(at); if (i < 0) continue;
      const p = L[(i + 1) % 4], q = L[(i + 3) % 4];
      out.push(mk('right-angle', 'incidence', `${where}: vuông tại ${at}`, L, (P) => isRightAt(P, at, p, q)));
    }
  }
  return out;
}

function baseShapeFacts(problem: string, solid: SolidInfo | null): Fact3D[] {
  if (!solid) return [];
  // "đáy [ABCD] [là] <mô tả>" tới dấu chấm/chấm phẩy (hoặc tới mệnh đề mới ",  S…").
  const m = /đáy\s*(?:\(?[A-Z]{3,}\)?\s*)?(?:là\s+)?((?:hình|tam\s+giác|nửa\s+lục\s+giác)[^.;]*)/u.exec(problem);
  if (!m) return [];
  const desc = m[1].split(/,\s*(?=[A-Z]{2}\s*(?:⊥|vuông|=)|(?:cạnh\s+bên|hình\s+chiếu|mặt\s+bên|hai\s+mặt|tam\s+giác|Gọi|biết|Biết|mặt\s+phẳng))/u)[0];
  const base = solid.kind === 'tetra' ? solid.base : solid.base;
  // Tam giác "vuông tại B" cho đáy có 3 đỉnh; tứ giác cho 4.
  if (/^tam\s+giác/u.test(desc) && base.length !== 3) return [];
  if (/^hình/u.test(desc) && base.length !== 4) return [];
  return shapeFacts(base, desc, 'đáy');
}

function namedTriangleFacts(problem: string): Fact3D[] {
  const out: Fact3D[] = [];
  // "tam giác SAB (là tam giác)? (vuông cân tại S|vuông tại A|đều|cân tại S)"
  const re = /(?:tam\s+giác|mặt\s+bên|∆|Δ)\s*([A-Z]{3})(?![A-Z])\s*(?:là\s+)?(?:(?:một\s+)?tam\s+giác\s+)?((?:vuông\s+cân|vuông|cân)\s+(?:tại|ở)\s+[A-Z](?![A-Z])|đều)/gu;
  for (const m of problem.matchAll(re)) {
    if (/^(?:đáy)/u.test(problem.slice(Math.max(0, (m.index ?? 0) - 6), m.index))) continue;
    out.push(...shapeFacts(splitLabels(m[1]), m[2], `tam giác ${m[1]}`));
  }
  return out;
}

function midpointFacts(problem: string): Fact3D[] {
  const out: Fact3D[] = [];
  const add = (x: string, a: string, b: string) => {
    x = normLabel(x); a = normLabel(a); b = normLabel(b);
    out.push(mk('midpoint', 'incidence', `${x}=tđ ${a}${b}`, [x, a, b], (P) => samePt(P[x], [(P[a][0] + P[b][0]) / 2, (P[a][1] + P[b][1]) / 2, (P[a][2] + P[b][2]) / 2])));
  };
  // "M là trung điểm (của) (cạnh|đoạn) AB"
  for (const m of problem.matchAll(new RegExp(`(?<![\\p{L}'′’])(${LBL})\\s+là\\s+trung\\s+điểm\\s+(?:của\\s+)?(?:các\\s+)?(?:cạnh\\s+|đoạn\\s+(?:thẳng\\s+)?)?(${LBL})(${LBL})(?![A-Z'′’])`, 'gu'))) add(m[1], m[2], m[3]);
  // "trung điểm H của (cạnh) AB"
  for (const m of problem.matchAll(new RegExp(`trung\\s+điểm\\s+(${LBL})\\s+của\\s+(?:cạnh\\s+|đoạn\\s+)?(${LBL})(${LBL})(?![A-Z'′’])`, 'gu'))) add(m[1], m[2], m[3]);
  // "M, N(, P) lần lượt là trung điểm (của) (các cạnh) AB, CD(, EF)" — 'và' cũng là phân cách
  for (const m of problem.matchAll(new RegExp(`((?:${LBL}\\s*(?:,|và)\\s*)+${LBL})\\s+lần\\s+lượt\\s+là\\s+(?:các\\s+)?trung\\s+điểm\\s+(?:của\\s+)?(?:các\\s+)?(?:cạnh\\s+|đoạn\\s+)?((?:${LBL}${LBL}\\s*(?:,|và)\\s*)+${LBL}${LBL})(?![A-Z'′’])`, 'gu'))) {
    const names = splitLabels(m[1]);
    const segs = m[2].split(/\s*(?:,|và)\s*/u).map(splitLabels);
    if (names.length !== segs.length || segs.some((s) => s.length !== 2)) continue;
    names.forEach((x, i) => add(x, segs[i][0], segs[i][1]));
  }
  return out;
}

function centroidFacts(problem: string): Fact3D[] {
  const out: Fact3D[] = [];
  const add = (g: string, t: string[]) => {
    out.push(mk('centroid', 'incidence', `${g}=tt ${t.join('')}`, [g, ...t], (P) => {
      const c = [0, 1, 2].map((k) => (P[t[0]][k] + P[t[1]][k] + P[t[2]][k]) / 3) as Vec3;
      return samePt(P[g], c);
    }));
  };
  for (const m of problem.matchAll(/(?<![\p{L}'′’])([A-Z])\s+là\s+trọng\s+tâm\s+(?:của\s+)?(?:tam\s+giác|∆|Δ)\s*([A-Z]{3})(?![A-Z])/gu)) add(m[1], splitLabels(m[2]));
  for (const m of problem.matchAll(/trọng\s+tâm\s+([A-Z])\s+(?:của\s+)?(?:tam\s+giác|∆|Δ)\s*([A-Z]{3})(?![A-Z])/gu)) add(m[1], splitLabels(m[2]));
  return out;
}

/** Tả một điểm bằng lời → hàm toạ độ (trung điểm, trọng tâm, giao 2 đường chéo, nhãn trần). */
function describedPoint(desc: string): { labels: string[]; at(P: Record<string, Vec3>): Vec3 } | null {
  let m = /^(?:với\s+|là\s+)?(?:điểm\s+)?trung\s+điểm\s+(?:[A-Z]\s+)?(?:của\s+)?(?:cạnh\s+|đoạn\s+)?([A-Z])([A-Z])(?![A-Z])/u.exec(desc);
  if (m) { const [a, b] = [m[1], m[2]]; return { labels: [a, b], at: (P) => [0, 1, 2].map((k) => (P[a][k] + P[b][k]) / 2) as Vec3 }; }
  m = /^(?:với\s+|là\s+)?(?:điểm\s+)?trọng\s+tâm\s+(?:[A-Z]\s+)?(?:của\s+)?(?:tam\s+giác|∆|Δ)\s*([A-Z])([A-Z])([A-Z])(?![A-Z])/u.exec(desc);
  if (m) { const t = [m[1], m[2], m[3]]; return { labels: t, at: (P) => [0, 1, 2].map((k) => (P[t[0]][k] + P[t[1]][k] + P[t[2]][k]) / 3) as Vec3 }; }
  m = /^(?:với\s+|là\s+)?giao\s+điểm\s+(?:[A-Z]\s+)?(?:của\s+)?(?:hai\s+đường\s+chéo\s+)?([A-Z])([A-Z])\s+và\s+([A-Z])([A-Z])(?![A-Z])/u.exec(desc);
  if (m) {
    const [a, b, c, d] = [m[1], m[2], m[3], m[4]];
    return { labels: [a, b, c, d], at: (P) => {
      // giao 2 đường đồng phẳng (nghiệm bình phương tối thiểu)
      const u = sub(P[b], P[a]), v = sub(P[d], P[c]), w = sub(P[c], P[a]);
      const uv = cross(u, v); const n2 = dot(uv, uv);
      const t = n2 === 0 ? NaN : dot(cross(w, v), uv) / n2;
      return [P[a][0] + t * u[0], P[a][1] + t * u[1], P[a][2] + t * u[2]];
    } };
  }
  m = /^(?:với\s+|là\s+)?(?:điểm\s+)?([A-Z])(?![\p{L}'′])/u.exec(desc);
  if (m) { const x = m[1]; return { labels: [x], at: (P) => P[x] }; }
  return null;
}

function projectionFacts(problem: string, solid: SolidInfo | null): Fact3D[] {
  const out: Fact3D[] = [];
  const re = new RegExp(`[Hh]ình\\s+chiếu\\s+(?:vuông\\s+góc\\s+)?(?:của\\s+)?(?:đỉnh\\s+|điểm\\s+)?(${LBL})\\s+(?:lên|trên|xuống)\\s+${PLANE_TOK}\\s*(?:là|trùng\\s+với|chính\\s+là)\\s+([^.;]{1,60})`, 'gu');
  for (const m of problem.matchAll(re)) {
    const from = normLabel(m[1]);
    const pl = planeLabels(m[2] ?? m[3], solid);
    const dp = describedPoint(m[4].trim());
    if (!pl || !dp) continue;
    out.push(mk('projection-foot', 'incidence', `hc ${from} lên (${pl.join('')}) = ${m[4].trim().slice(0, 30)}`, [from, ...pl, ...dp.labels], (P) => {
      const n = normalOf(P[pl[0]], P[pl[1]], P[pl[2]]);
      const f = dp.at(P);
      // chân nằm trong mặt + (from - chân) ∥ pháp tuyến
      const inPlane = Math.abs(dot(sub(f, P[pl[0]]), n)) <= TOL * len(n) * Math.max(1, len(f));
      const v = sub(P[from], f);
      return inPlane && (len(v) < TOL || isPar(v, n));
    }));
  }
  return out;
}

function centerFacts(problem: string, solid: SolidInfo | null): Fact3D[] {
  // "(đáy ABCD là) hình vuông/chữ nhật/thoi/bình hành tâm O" → O = trung điểm AC
  if (!solid || solid.base.length !== 4) return [];
  const m = /(?:hình\s+(?:vuông|chữ\s+nhật|thoi|bình\s+hành))\s+(?:[A-Z]{4}\s+)?(?:có\s+)?tâm\s+([A-Z])(?![\p{L}'])/u.exec(problem);
  if (!m) return [];
  const [A, , C] = solid.base; const O = m[1];
  return [mk('center', 'incidence', `tâm ${O}`, [O, A, C], (P) => samePt(P[O], [0, 1, 2].map((k) => (P[A][k] + P[C][k]) / 2) as Vec3))];
}

function ratioPointFacts(problem: string): Fact3D[] {
  // "H thuộc/∈/trên (cạnh) AB sao cho HB = 2HA" (k·HX)
  const out: Fact3D[] = [];
  const re = /([A-Z])\s*(?:thuộc|∈|trên|nằm\s+trên)\s*(?:cạnh\s+|đoạn\s+)?([A-Z])([A-Z])(?![A-Z])\s*(?:sao\s+cho|thỏa\s+mãn|với)\s*([A-Z])([A-Z])\s*=\s*(\d+)\s*([A-Z])([A-Z])(?![A-Z])/gu;
  for (const m of problem.matchAll(re)) {
    const [X, a, b] = [m[1], m[2], m[3]];
    const k = Number(m[6]);
    const lhs = [m[4], m[5]], rhs = [m[7], m[8]];
    if (!lhs.includes(X) || !rhs.includes(X)) continue;
    const P1 = lhs.find((y) => y !== X)!, P2 = rhs.find((y) => y !== X)!;
    out.push(mk('ratio-point', 'incidence', m[0], [X, a, b, P1, P2], (P) => {
      const onSeg = near(dist(P[a], P[X]) + dist(P[X], P[b]), dist(P[a], P[b]));
      return onSeg && near(dist(P[X], P[P1]), k * dist(P[X], P[P2]));
    }));
  }
  return out;
}

function solidKindFacts(problem: string, solid: SolidInfo | null): Fact3D[] {
  if (!solid) return [];
  const out: Fact3D[] = [];
  const B = solid.base;
  const bn = (P: Record<string, Vec3>) => normalOf(P[B[0]], P[B[1]], P[B[2]]);
  if (solid.kind === 'pyramid' && /chóp\s+(?:(?:tứ|tam|lục)\s*giác\s+)?đều|hình\s+chóp\s+đều/u.test(problem)) {
    const S = solid.apex!;
    out.push(mk('regular-pyramid', 'metric', 'chóp đều: cạnh bên bằng nhau', [S, ...B], (P) => B.every((x) => near(dist(P[S], P[x]), dist(P[S], P[B[0]])))));
    out.push(mk('regular-pyramid', 'metric', 'chóp đều: đáy đều', B, (P) => B.every((_, i) => near(dist(P[B[i]], P[B[(i + 1) % B.length]]), dist(P[B[0]], P[B[1]])))));
  }
  if (solid.kind === 'tetra' && /tứ\s+diện\s+đều/u.test(problem)) {
    const V = [...B, solid.apex!];
    out.push(mk('regular-tetra', 'metric', 'tứ diện đều', V, (P) => {
      const d0 = dist(P[V[0]], P[V[1]]);
      for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) if (!near(dist(P[V[i]], P[V[j]]), d0)) return false;
      return true;
    }));
  }
  if ((solid.kind === 'prism' || solid.kind === 'box') && solid.top && solid.top.length === B.length) {
    const T = solid.top;
    // lăng trụ/hộp: cạnh bên song song + bằng nhau (luôn đúng)
    out.push(mk('prism', 'incidence', 'cạnh bên ∥ và bằng nhau', [...B, ...T], (P) => B.every((x, i) => samePt(sub(P[T[i]], P[x]), sub(P[T[0]], P[B[0]])))));
    const dung = /lăng\s*trụ\s+(?:(?:tam|tứ)\s+giác\s+)?(?:đứng|đều)|hình\s+hộp\s+(?:chữ\s+nhật|đứng)|lập\s+phương/u.test(problem);
    if (dung) out.push(mk('right-prism', 'incidence', 'cạnh bên ⊥ đáy', [...B, T[0]], (P) => isPar(sub(P[T[0]], P[B[0]]), bn(P))));
    if (/lăng\s*trụ\s+(?:(?:tam|tứ)\s+giác\s+)?đều/u.test(problem)) {
      out.push(mk('regular-base', 'metric', 'đáy đa giác đều', B, (P) => B.every((_, i) => near(dist(P[B[i]], P[B[(i + 1) % B.length]]), dist(P[B[0]], P[B[1]])))));
    }
    if (/hình\s+hộp\s+chữ\s+nhật|lập\s+phương/u.test(problem) && B.length === 4) {
      out.push(mk('right-angle', 'incidence', 'đáy chữ nhật', B, (P) => isRightAt(P, B[0], B[1], B[3])));
    }
    if (/lập\s+phương/u.test(problem) && B.length === 4) {
      out.push(mk('cube', 'metric', 'lập phương: cạnh bằng nhau', [...B, T[0]], (P) => near(dist(P[B[0]], P[B[1]]), dist(P[B[1]], P[B[2]])) && near(dist(P[B[0]], P[B[1]]), dist(P[B[0]], P[T[0]]))));
    }
  }
  return out;
}

/** Rút mọi sự kiện kiểm được từ đề. */
export function extractFacts3d(problem: string): Fact3D[] {
  const p = problem.normalize('NFC').replace(/\s+/gu, ' ');
  const solid = parseSolid(p);
  return [
    ...lineperpPlaneFacts(p, solid),
    ...pairwisePerpFacts(p),
    ...planePerpFacts(p, solid),
    ...baseShapeFacts(p, solid),
    ...namedTriangleFacts(p),
    ...midpointFacts(p),
    ...centroidFacts(p),
    ...projectionFacts(p, solid),
    ...centerFacts(p, solid),
    ...ratioPointFacts(p),
    ...solidKindFacts(p, solid),
  ];
}

export function auditFacts3d(problem: string, state: State): FactAuditResult {
  const P = toaDo3d(state);
  const checked: Fact3D[] = [], violated: Fact3D[] = [], skipped: Fact3D[] = [];
  for (const f of extractFacts3d(problem)) {
    if (!f.labels.every((l) => P[l])) { skipped.push(f); continue; }
    checked.push(f);
    let ok = false;
    try { ok = f.check(P); } catch { ok = false; }
    if (!ok) violated.push(f);
  }
  return { checked, violated, skipped };
}
