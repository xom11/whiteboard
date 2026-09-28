import type { BaseVariant, SolidSpec3D } from './intent';

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

/** "AB" / "A'B" → ["A","B"] (nhãn có thể kèm phẩy). */
function splitAnchor(tok: string): [string, string] {
  const m = [...tok.matchAll(/[A-Z](?:['′])?/gu)].map((x) => x[0]);
  return [m[0] ?? '', m[1] ?? ''];
}
