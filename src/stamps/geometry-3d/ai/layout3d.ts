import type { SolidFlavor, BaseVariant, ApexVariant } from './intent';
import type { SolidRefine, BaseShape, PSpec } from './solidRefine3d';

export type Vec3 = [number, number, number];
export interface SolidLayout { coords: Record<string, Vec3>; faces: number[][]; vertexOrder: string[] }

const H = 2.4;       // apex / prism height
const R = 1.4;       // base "radius"

// 2D base templates centered at origin → list of [x,y] in CCW order.
function baseTemplate(variant: BaseVariant, n: number): Array<[number, number]> {
  switch (variant) {
    case 'square':
      return [[-1,-1],[1,-1],[1,1],[-1,1]];
    case 'rectangle':
      return [[-1.5,-1],[1.5,-1],[1.5,1],[-1.5,1]];
    case 'parallelogram':
      return [[-1.4,-1],[1.0,-1],[1.4,1],[-1.0,1]];
    case 'rhombus':
      return [[0,-1.3],[1.3,0],[0,1.3],[-1.3,0]];
    case 'trapezoid':
      return [[-1.6,-1],[1.6,-1],[0.8,1],[-0.8,1]];
    case 'equilateral-triangle': {
      const pts: Array<[number, number]> = [];
      for (let i = 0; i < 3; i++) {
        const a = Math.PI / 2 + (i * 2 * Math.PI) / 3;
        pts.push([R * Math.cos(a), R * Math.sin(a)]);
      }
      return pts;
    }
    case 'triangle':
      return [[-1.3,-0.9],[1.4,-0.9],[-0.2,1.2]];
    default: {
      // regular n-gon fallback
      const pts: Array<[number, number]> = [];
      for (let i = 0; i < n; i++) {
        const a = Math.PI / 2 + (i * 2 * Math.PI) / n;
        pts.push([R * Math.cos(a), R * Math.sin(a)]);
      }
      return pts;
    }
  }
}

function centroidXY(pts: Array<[number, number]>): [number, number] {
  const s = pts.reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1]] as [number, number], [0, 0] as [number, number]);
  return [s[0] / pts.length, s[1] / pts.length];
}

export function solidLayout(spec: {
  flavor: SolidFlavor; baseLabels: string[]; baseVariant: BaseVariant;
  apex?: string; apexVariant: ApexVariant; apexAnchor?: string; topLabels?: string[];
  refine?: SolidRefine;
}): SolidLayout {
  if (spec.refine) {
    const r = refinedLayout(spec, spec.refine);
    if (r) return r;
  }
  const n = spec.baseLabels.length;
  const tpl = baseTemplate(spec.baseVariant, n);
  const coords: Record<string, Vec3> = {};
  const vertexOrder: string[] = [];

  spec.baseLabels.forEach((lab, i) => {
    const [x, y] = tpl[i % tpl.length];
    coords[lab] = [x, y, 0];
    vertexOrder.push(lab);
  });

  const faces: number[][] = [];
  faces.push(spec.baseLabels.map((_, i) => i)); // base ring

  if (spec.flavor === 'pyramid' || spec.flavor === 'tetrahedron') {
    const apex = spec.apex ?? 'S';
    let ax = 0, ay = 0;
    if (spec.apexVariant === 'over-vertex' && spec.apexAnchor && coords[spec.apexAnchor]) {
      [ax, ay] = [coords[spec.apexAnchor][0], coords[spec.apexAnchor][1]];
    } else if (spec.apexVariant === 'over-edge-mid' && spec.apexAnchor) {
      const a = spec.apexAnchor[0], b = spec.apexAnchor[1];
      if (coords[a] && coords[b]) { ax = (coords[a][0] + coords[b][0]) / 2; ay = (coords[a][1] + coords[b][1]) / 2; }
    } else {
      [ax, ay] = centroidXY(tpl.slice(0, n));
    }
    coords[apex] = [ax, ay, H];
    const apexIdx = vertexOrder.push(apex) - 1;
    for (let i = 0; i < n; i++) faces.push([i, (i + 1) % n, apexIdx]);
  } else {
    // prism / box: translate base up by H to make the top face
    const top = spec.topLabels ?? spec.baseLabels.map((l) => `${l}1`);
    const base0 = vertexOrder.length;
    top.forEach((lab, i) => {
      const [x, y] = tpl[i % tpl.length];
      coords[lab] = [x, y, H];
      vertexOrder.push(lab);
    });
    faces.push(top.map((_, i) => base0 + i)); // top ring
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      faces.push([i, j, base0 + j, base0 + i]); // side quad
    }
  }
  return { coords, faces, vertexOrder };
}

// ───────────── Layout có điều kiện (SolidRefine) ─────────────
// Dựng đáy theo hình dạng đề nêu (vuông tại B, thang vuông, nửa lục giác đều…), đặt chân đường
// cao của đỉnh theo PSpec (trung điểm/trọng tâm/giao điểm/đỉnh…), chiều cao theo tam giác mặt
// bên (đều, vuông cân tại S…) — toạ độ ĐÚNG điều kiện, không chỉ đúng tên.

type V2 = [number, number];

/** Toạ độ 2D đáy theo BaseShape — gán đúng nhãn (không phụ thuộc thứ tự template). */
function shapeCoords(shape: BaseShape, L: string[]): Record<string, V2> | null {
  const n = L.length;
  const out: Record<string, V2> = {};
  const rot = (i: number) => L[((i % n) + n) % n];
  switch (shape.kind) {
    case 'right-tri': {
      if (n !== 3) return null;
      const i = L.indexOf(shape.at); if (i < 0) return null;
      const a = shape.iso ? 2.3 : 2.7, b = shape.iso ? 2.3 : 2.0;
      // CCW: đỉnh vuông → (+x) → (+y)
      out[rot(i)] = [0, 0]; out[rot(i + 1)] = [a, 0]; out[rot(i + 2)] = [0, b];
      break;
    }
    case 'iso-tri': {
      if (n !== 3) return null;
      const i = L.indexOf(shape.at); if (i < 0) return null;
      out[rot(i)] = [0, 1.3]; out[rot(i + 1)] = [-1.3, -0.9]; out[rot(i + 2)] = [1.3, -0.9];
      break;
    }
    case 'equi-tri': {
      if (n !== 3) return null;
      for (let i = 0; i < 3; i++) { const a = Math.PI / 2 + (i * 2 * Math.PI) / 3; out[L[i]] = [R * Math.cos(a), R * Math.sin(a)]; }
      break;
    }
    case 'square': {
      if (n !== 4) return null;
      const t: V2[] = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
      L.forEach((l, i) => { out[l] = t[i]; });
      break;
    }
    case 'right-trap': {
      if (n !== 4) return null;
      const i = L.indexOf(shape.at[0]);
      if (i < 0 || rot(i + 1) !== shape.at[1]) return null;
      // X=L[i], Y=L[i+1] vuông; XY là cạnh bên ⊥ 2 đáy. Đáy lớn ở đỉnh chứa nhãn đầu (A) nếu có, không thì ở X.
      const longAtY = rot(i + 1) === L[0];
      const lx = longAtY ? 1.4 : 2.6, ly = longAtY ? 2.6 : 1.4;
      out[rot(i)] = [-1.2, -1.2]; out[rot(i + 1)] = [1.2, -1.2];
      out[rot(i + 2)] = [1.2, -1.2 + ly]; out[rot(i + 3)] = [-1.2, -1.2 + lx];
      break;
    }
    case 'trap':
    case 'half-hex': {
      if (n !== 4) return null;
      const [p, q] = shape.long;
      const ip = L.indexOf(p), iq = L.indexOf(q);
      if (ip < 0 || iq < 0) return null;
      // thứ tự vòng: đi từ đầu đáy lớn sao cho đỉnh kế tiếp là đầu kia
      const start = (ip + 1) % 4 === iq ? ip : iq;
      const tpl: V2[] = shape.kind === 'trap'
        ? [[-1.6, -1], [1.6, -1], [0.8, 1], [-0.8, 1]]
        : [[-1.6, -0.7], [1.6, -0.7], [0.8, -0.7 + 1.6 * Math.sqrt(3) / 2], [-0.8, -0.7 + 1.6 * Math.sqrt(3) / 2]];
      for (let k = 0; k < 4; k++) out[rot(start + k)] = tpl[k];
      break;
    }
    case 'rhombus': {
      if (n !== 4) return null;
      const th = (shape.angleAt0 * Math.PI) / 180;
      if (!(th > 0.2 && th < Math.PI - 0.2)) return null;
      const side = 2.0;
      const p = side * Math.cos(th / 2), q = side * Math.sin(th / 2);
      // A=(0,-p), B=(q,0), C=(0,p), D=(-q,0) → góc tại A = θ
      out[L[0]] = [0, -p]; out[L[1]] = [q, 0]; out[L[2]] = [0, p]; out[L[3]] = [-q, 0];
      break;
    }
    default: return null;
  }
  // căn giữa theo trọng tâm các đỉnh
  const c = L.reduce<V2>((acc, l) => [acc[0] + out[l][0] / n, acc[1] + out[l][1] / n], [0, 0]);
  for (const l of L) out[l] = [out[l][0] - c[0], out[l][1] - c[1]];
  return out;
}

function evalP(p: PSpec, B: Record<string, V2>): V2 | null {
  if (typeof p === 'string') return B[p] ?? null;
  if ('mid' in p) { const a = evalP(p.mid[0], B), b = evalP(p.mid[1], B); return a && b ? [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] : null; }
  if ('cen' in p) {
    const pts = p.cen.map((q) => evalP(q, B)); if (pts.some((q) => !q)) return null;
    return [pts.reduce((s, q) => s + q![0], 0) / pts.length, pts.reduce((s, q) => s + q![1], 0) / pts.length];
  }
  if ('at' in p) { const a = evalP(p.at[0], B), b = evalP(p.at[1], B); const t = p.at[2]; return a && b ? [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])] : null; }
  if ('meet' in p) {
    const [a, b, c, d] = p.meet.map((q) => evalP(q, B));
    if (!a || !b || !c || !d) return null;
    const r: V2 = [b[0] - a[0], b[1] - a[1]], s: V2 = [d[0] - c[0], d[1] - c[1]];
    const den = r[0] * s[1] - r[1] * s[0];
    if (Math.abs(den) < 1e-9) return null;
    const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den;
    return [a[0] + t * r[0], a[1] + t * r[1]];
  }
  if ('perpBis' in p) {
    const a = evalP(p.perpBis[0], B), b = evalP(p.perpBis[1], B);
    if (!a || !b) return null;
    const ls = Object.values(B);
    const O: V2 = [ls.reduce((s, q) => s + q[0], 0) / ls.length, ls.reduce((s, q) => s + q[1], 0) / ls.length];
    const M: V2 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const u: V2 = [b[0] - a[0], b[1] - a[1]];
    const k = ((O[0] - M[0]) * u[0] + (O[1] - M[1]) * u[1]) / (u[0] ** 2 + u[1] ** 2);
    return [O[0] - k * u[0], O[1] - k * u[1]];
  }
  if ('circ' in p) {
    const [a, b, c] = p.circ.slice(0, 3).map((q) => evalP(q, B));
    if (!a || !b || !c) return null;
    const d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
    if (Math.abs(d) < 1e-9) return null;
    const a2 = a[0] ** 2 + a[1] ** 2, b2 = b[0] ** 2 + b[1] ** 2, c2 = c[0] ** 2 + c[1] ** 2;
    return [(a2 * (b[1] - c[1]) + b2 * (c[1] - a[1]) + c2 * (a[1] - b[1])) / d, (a2 * (c[0] - b[0]) + b2 * (a[0] - c[0]) + c2 * (b[0] - a[0])) / d];
  }
  return null;
}

const d2 = (a: V2, b: V2) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Chiều cao đỉnh theo HeightRule (null = không áp được → giữ H mặc định). */
function heightFor(rule: SolidRefine['height'], F: V2, B: Record<string, V2>): number | null {
  if (!rule) return null;
  if (rule.kind === 'cube') return 2;              // đáy vuông cạnh 2
  if (rule.kind === 'reg-tetra' || rule.kind === 'corner') {
    const ls = Object.values(B); if (ls.length < 2) return null;
    const s = d2(ls[0], ls[1]);
    return rule.kind === 'reg-tetra' ? s * Math.sqrt(2 / 3) : s / Math.sqrt(6);
  }
  const X = B[rule.x], Y = B[rule.y];
  if (!X || !Y) return null;
  const xy = d2(X, Y), fx = d2(F, X), fy = d2(F, Y);
  let h2: number;
  switch (rule.prop) {
    case 'equi': if (Math.abs(fx - fy) > 1e-6) return null; h2 = xy * xy - fx * fx; break;
    case 'riso-apex': if (Math.abs(fx - fy) > 1e-6) return null; h2 = (xy * xy) / 2 - fx * fx; break;
    case 'riso-x': {
      // vuông cân tại X: SX ⊥ XY (chân F nằm trên đường ⊥ XY qua X) và SX = XY
      const dot = (F[0] - X[0]) * (Y[0] - X[0]) + (F[1] - X[1]) * (Y[1] - X[1]);
      if (Math.abs(dot) > 1e-6) return null;
      h2 = xy * xy - fx * fx; break;
    }
    case 'right-apex': h2 = -((X[0] - F[0]) * (Y[0] - F[0]) + (X[1] - F[1]) * (Y[1] - F[1])); break;
    default: return null;
  }
  return h2 > 0.05 ? Math.sqrt(h2) : null;
}

function refinedLayout(
  spec: Parameters<typeof solidLayout>[0],
  r: SolidRefine,
): SolidLayout | null {
  const L = spec.baseLabels;
  const n = L.length;
  let B: Record<string, V2> | null = r.baseShape ? shapeCoords(r.baseShape, L) : null;
  if (!B) {
    const tpl = baseTemplate(spec.baseVariant, n);
    B = {};
    L.forEach((l, i) => { B![l] = tpl[i % tpl.length]; });
  }
  const coords: Record<string, Vec3> = {};
  const vertexOrder: string[] = [];
  const faces: number[][] = [];
  L.forEach((l) => { coords[l] = [B![l][0], B![l][1], 0]; vertexOrder.push(l); });
  faces.push(L.map((_, i) => i));

  if (spec.flavor === 'pyramid' || spec.flavor === 'tetrahedron') {
    const apex = spec.apex ?? 'S';
    let F: V2 | null = r.apexFoot !== undefined ? evalP(r.apexFoot, B) : null;
    if (!F) {
      if (spec.apexVariant === 'over-vertex' && spec.apexAnchor && B[spec.apexAnchor]) F = B[spec.apexAnchor];
      else if (spec.apexVariant === 'over-edge-mid' && spec.apexAnchor && B[spec.apexAnchor[0]] && B[spec.apexAnchor[1]]) {
        const a = B[spec.apexAnchor[0]], b = B[spec.apexAnchor[1]]; F = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      } else F = evalP({ cen: [...L] }, B);
    }
    if (!F) return null;
    const h = heightFor(r.height, F, B) ?? H;
    coords[apex] = [F[0], F[1], h];
    const apexIdx = vertexOrder.push(apex) - 1;
    for (let i = 0; i < n; i++) faces.push([i, (i + 1) % n, apexIdx]);
  } else {
    const top = spec.topLabels ?? L.map((l) => `${l}1`);
    const h = r.height?.kind === 'cube' ? 2 : H;
    let shift: V2 = [0, 0];
    if (r.topFoot) {
      const k = top.findIndex((t) => t.replace(/[′’´]/gu, "'") === r.topFoot!.vertex);
      const F = k >= 0 ? evalP(r.topFoot.foot, B) : null;
      if (!F) return null;
      shift = [F[0] - B[L[k]][0], F[1] - B[L[k]][1]];
    }
    const base0 = vertexOrder.length;
    top.forEach((lab, i) => {
      const b = B![L[i % n]];
      coords[lab] = [b[0] + shift[0], b[1] + shift[1], h];
      vertexOrder.push(lab);
    });
    faces.push(top.map((_, i) => base0 + i));
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; faces.push([i, j, base0 + j, base0 + i]); }
  }
  return { coords, faces, vertexOrder };
}
