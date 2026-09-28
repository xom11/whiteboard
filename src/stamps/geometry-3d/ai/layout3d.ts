import type { BaseVariant, SolidSpec3D } from './intent';
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
    // Lớp 12 — đỉnh ĐẶC BIỆT (góc vuông / đỉnh cân) ở index 0; xoay theo baseAnchor ở anchoredTemplate.
    case 'right-triangle':
      return [[-1.1,-0.9],[1.5,-0.9],[-1.1,1.1]];
    case 'right-isosceles-triangle':
      return [[-1.1,-1.1],[1.2,-1.1],[-1.1,1.2]];
    case 'isosceles-triangle':
      return [[0,1.0],[-1.4,-0.6],[1.4,-0.6]];
    case 'rhombus-60': {
      // cạnh 2, góc 60° tại index 0 và 2 (đường chéo dài 2√3 nằm ngang)
      const r3 = Math.sqrt(3);
      return [[-r3,0],[0,-1],[r3,0],[0,1]];
    }
    case 'half-hexagon': {
      // đường kính = cạnh 0–1 (dài 2.8), hai đỉnh còn lại trên nửa đường tròn (cạnh 1.4)
      const h = 1.4 * Math.sqrt(3) / 2;
      return [[1.4,0.6],[-1.4,0.6],[-0.7,0.6 - h],[0.7,0.6 - h]];
    }
    case 'right-trapezoid':
      // vuông tại index 0 và 1 (cạnh 0–1 là đường cao), đáy lớn 3–0, đáy nhỏ 1–2
      return [[-1.1,-1.1],[1.1,-1.1],[1.1,0.2],[-1.1,1.5]];
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

function circumcenterXY(a: [number, number], b: [number, number], c: [number, number]): [number, number] {
  const d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
  if (Math.abs(d) < 1e-12) return centroidXY([a, b, c]);
  const a2 = a[0] ** 2 + a[1] ** 2, b2 = b[0] ** 2 + b[1] ** 2, c2 = c[0] ** 2 + c[1] ** 2;
  return [
    (a2 * (b[1] - c[1]) + b2 * (c[1] - a[1]) + c2 * (a[1] - b[1])) / d,
    (a2 * (c[0] - b[0]) + b2 * (a[0] - c[0]) + c2 * (b[0] - a[0])) / d,
  ];
}

const ANCHORED: ReadonlySet<BaseVariant> = new Set([
  'right-triangle', 'right-isosceles-triangle', 'isosceles-triangle', 'right-trapezoid', 'rhombus-60', 'half-hexagon',
]);

/** Xoay template để đỉnh đặc biệt (index 0 của template) rơi vào nhãn baseAnchor. */
function anchoredTemplate(spec: SolidSpec3D, tpl: Array<[number, number]>): Array<[number, number]> {
  const n = spec.baseLabels.length;
  if (!ANCHORED.has(spec.baseVariant) || !spec.baseAnchor || tpl.length !== n) return tpl;
  const L = spec.baseLabels;
  let k = -1;
  if (spec.baseVariant === 'right-trapezoid' || spec.baseVariant === 'half-hexagon') {
    // "AB" = vuông tại A và B: cặp KỀ nhau; chọn k sao cho L[k], L[k+1] là cặp đó.
    const [x, y] = [spec.baseAnchor.slice(0, 1), spec.baseAnchor.slice(1)];
    const ix = L.indexOf(x), iy = L.indexOf(y);
    if (ix >= 0 && iy >= 0) {
      if ((ix + 1) % n === iy) k = ix;
      else if ((iy + 1) % n === ix) k = iy;
    }
  } else {
    k = L.indexOf(spec.baseAnchor);
  }
  if (k < 0) return tpl;
  return L.map((_, i) => tpl[(i - k + n) % n]);
}

export function solidLayout(spec: SolidSpec3D): SolidLayout {
  // Điều kiện đề đọc bởi solidRefine3d (lớp 11) — có thì dựng theo nó; không (hoặc không áp được)
  // ⇒ đường template + baseAnchor/apexWeights/heightMode (khoiDaDien, lớp 12) bên dưới.
  if (spec.refine) {
    const r = refinedLayout(spec, spec.refine as unknown as SolidRefine);
    if (r) return r;
  }
  const n = spec.baseLabels.length;
  const tpl = anchoredTemplate(spec, baseTemplate(spec.baseVariant, n));
  const coords: Record<string, Vec3> = {};
  const vertexOrder: string[] = [];

  spec.baseLabels.forEach((lab, i) => {
    const [x, y] = tpl[i % tpl.length];
    coords[lab] = [x, y, 0];
    vertexOrder.push(lab);
  });

  // Chân đường cao (x,y) trên đáy theo apexVariant.
  const footXY = (): [number, number] => {
    const anchor = spec.apexAnchor;
    if (spec.apexVariant === 'over-vertex' && anchor && coords[anchor]) {
      return [coords[anchor][0], coords[anchor][1]];
    }
    if ((spec.apexVariant === 'over-edge-mid' || spec.apexVariant === 'over-edge-point') && anchor) {
      const [a, b] = splitAnchor(anchor);
      const t = spec.apexVariant === 'over-edge-mid' ? 0.5 : (spec.apexRatio ?? 0.5);
      if (coords[a] && coords[b]) {
        return [coords[a][0] + t * (coords[b][0] - coords[a][0]), coords[a][1] + t * (coords[b][1] - coords[a][1])];
      }
      return [0, 0];
    }
    if (spec.apexVariant === 'over-circumcenter' && n >= 3) {
      // apexAnchor 3 nhãn = tâm ngoại tiếp tam giác con (vd SA = SB = SD trên đáy hình thoi)
      const tri = spec.apexAnchor ? [...spec.apexAnchor.matchAll(/[A-Z](?:['′])?/gu)].map((x) => x[0]) : [];
      if (tri.length === 3 && tri.every((l) => coords[l])) {
        const [p, q, r] = tri.map((l) => [coords[l][0], coords[l][1]] as [number, number]);
        return circumcenterXY(p, q, r);
      }
      return circumcenterXY(tpl[0], tpl[1], tpl[2]);
    }
    if (spec.apexVariant === 'over-weights' && spec.apexWeights) {
      let x = 0, y = 0;
      for (const [l, w] of Object.entries(spec.apexWeights)) {
        if (!coords[l]) return centroidXY(tpl.slice(0, n));
        x += w * coords[l][0]; y += w * coords[l][1];
      }
      return [x, y];
    }
    if (spec.apexVariant === 'over-incenter' && n === 3) {
      const [a, b, c] = tpl;
      const la = Math.hypot(b[0] - c[0], b[1] - c[1]), lb = Math.hypot(a[0] - c[0], a[1] - c[1]), lc = Math.hypot(a[0] - b[0], a[1] - b[1]);
      const p = la + lb + lc;
      return [(la * a[0] + lb * b[0] + lc * c[0]) / p, (la * a[1] + lb * b[1] + lc * c[1]) / p];
    }
    return centroidXY(tpl.slice(0, n));
  };

  // Chiều cao giữ HÌNH DẠNG (cạnh bên = cạnh đáy, mặt bên đều / vuông cân); mặc định H.
  const heightFor = (foot: [number, number], pyramid: boolean): number => {
    const e = Math.hypot(tpl[1][0] - tpl[0][0], tpl[1][1] - tpl[0][1]);
    if (spec.heightMode === 'lateral-eq-base') {
      if (!pyramid) return e;
      const r = Math.hypot(tpl[0][0] - foot[0], tpl[0][1] - foot[1]);
      return e > r ? Math.sqrt(e * e - r * r) : H;
    }
    if ((spec.heightMode === 'solve-equilateral' || spec.heightMode === 'solve-right-apex') && spec.heightEdge) {
      const [a, b] = splitAnchor(spec.heightEdge);
      if (coords[a] && coords[b]) {
        const [xa, ya] = [coords[a][0] - foot[0], coords[a][1] - foot[1]];
        const [xb, yb] = [coords[b][0] - foot[0], coords[b][1] - foot[1]];
        const h2 = spec.heightMode === 'solve-right-apex'
          ? -(xa * xb + ya * yb)
          : (xa - xb) ** 2 + (ya - yb) ** 2 - (xa * xa + ya * ya);
        if (h2 > 1e-9) return Math.sqrt(h2);
      }
      return H; // vô nghiệm → rule kiểm số sẽ từ chối
    }
    if ((spec.heightMode === 'face-equilateral' || spec.heightMode === 'face-right-isosceles') && spec.apexAnchor) {
      const [a, b] = splitAnchor(spec.apexAnchor);
      if (coords[a] && coords[b]) {
        const ab = Math.hypot(coords[b][0] - coords[a][0], coords[b][1] - coords[a][1]);
        return spec.heightMode === 'face-equilateral' ? (ab * Math.sqrt(3)) / 2 : ab / 2;
      }
    }
    return H;
  };

  const faces: number[][] = [];
  faces.push(spec.baseLabels.map((_, i) => i)); // base ring

  if (spec.flavor === 'pyramid' || spec.flavor === 'tetrahedron') {
    const apex = spec.apex ?? 'S';
    const [ax, ay] = footXY();
    coords[apex] = [ax, ay, heightFor([ax, ay], true)];
    const apexIdx = vertexOrder.push(apex) - 1;
    for (let i = 0; i < n; i++) faces.push([i, (i + 1) % n, apexIdx]);
  } else {
    // prism / box: tịnh tiến đáy lên (đứng: +z·H; xiên: đỉnh projOf nằm trên chân theo apexVariant)
    const top = spec.topLabels ?? spec.baseLabels.map((l) => `${l}1`);
    let dx = 0, dy = 0;
    const iProj = spec.projOf ? top.indexOf(spec.projOf) : -1;
    if (iProj >= 0 && spec.apexVariant !== 'free') {
      const [fx, fy] = footXY();
      [dx, dy] = [fx - tpl[iProj][0], fy - tpl[iProj][1]];
    }
    const hTop = heightFor([0, 0], false);
    const base0 = vertexOrder.length;
    top.forEach((lab, i) => {
      const [x, y] = tpl[i % tpl.length];
      coords[lab] = [x + dx, y + dy, hTop];
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
    case 'general-quad': {
      if (n !== 4) return null;
      // lồi, AB ∩ CD ≈ (−2.9, −1), AD ∩ BC ≈ (0.6, 2.3) — cả hai giao điểm nằm trong khung nhìn
      const t: V2[] = [[-1.5, -1], [1.5, -1], [0.9, 1.3], [-0.6, 0.4]];
      L.forEach((l, i) => { out[l] = t[i]; });
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
  if (rule.kind === 'all-edges') {
    // cạnh bên = cạnh đáy: chỉ khi chân cách đều mọi đỉnh và mọi cạnh đáy bằng nhau
    const ls = Object.values(B); const e = d2(ls[0], ls[1]); const r0 = d2(F, ls[0]);
    if (!ls.every((p, i) => Math.abs(d2(F, p) - r0) < 1e-6 && Math.abs(d2(p, ls[(i + 1) % ls.length]) - e) < 1e-6)) return null;
    const h2 = e * e - r0 * r0;
    return h2 > 0.05 ? Math.sqrt(h2) : null;
  }
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
    const tpl = anchoredTemplate(spec, baseTemplate(spec.baseVariant, n));
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

/** "AB" / "A'B" → ["A","B"] (nhãn có thể kèm phẩy). */
function splitAnchor(tok: string): [string, string] {
  const m = [...tok.matchAll(/[A-Z](?:['′])?/gu)].map((x) => x[0]);
  return [m[0] ?? '', m[1] ?? ''];
}
