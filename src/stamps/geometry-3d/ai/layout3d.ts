import type { SolidFlavor, BaseVariant, ApexVariant } from './intent';

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
}): SolidLayout {
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
