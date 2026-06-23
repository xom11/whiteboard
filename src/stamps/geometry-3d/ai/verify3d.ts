import type { State } from '../../../core/scene';
import { constraintToWorld, planeConstructionWorld } from '../../../core/scene/kinds/constraint3d-math';
import { planeFrame, signedDistance, type Vec3 } from './crossSectionGeometry';

function ptWorld(state: State, id: string): Vec3 {
  return constraintToWorld((state.objects[id].attrs as any).constraint, state) as Vec3;
}
function planeWorld3(state: State, planeId: string): [Vec3, Vec3, Vec3] {
  const a = (state.objects[planeId].attrs as any);
  if (a.construction) { const w = planeConstructionWorld(a.construction, state); return [w.p1, w.p2, w.p3]; }
  return [ptWorld(state, a.p1), ptWorld(state, a.p2), ptWorld(state, a.p3)];
}

/**
 * Kiểm tra tính hợp lệ hình học của scene 3D:
 * 1. Không có chu trình tham chiếu (constraintToWorld ném nếu đệ quy quá sâu).
 * 2. Toạ độ hữu hạn.
 * 3. Với điểm midpoint: w ≈ trung bình p1 + p2.
 * (Missing-ref được phát hiện bởi constraintToWorld ném khi id không tồn tại.)
 */
export function verifyFigure3d(state: State): { ok: boolean; issues: string[] } {
  const issues: string[] = [];

  for (const obj of Object.values(state.objects)) {
    if (obj.kind !== 'point3d') continue;

    const c = (obj.attrs as any).constraint as { kind: string; [k: string]: any };

    // Kiểm tra toạ độ + chu trình (constraintToWorld ném nếu ref không tồn tại hoặc đệ quy)
    let w: [number, number, number];
    try {
      w = constraintToWorld(c as any, state);
    } catch (e) {
      issues.push(`${obj.label}: ${(e as Error).message}`);
      continue;
    }

    if (!w.every((n) => Number.isFinite(n))) {
      issues.push(`${obj.label}: toạ độ không hữu hạn`);
      continue;
    }

    // Kiểm tra riêng midpoint: w ≈ avg(p1, p2)
    if (c.kind === 'midpoint') {
      try {
        const p1Obj = state.objects[c.p1];
        const p2Obj = state.objects[c.p2];
        if (p1Obj && p2Obj) {
          const a = constraintToWorld((p1Obj.attrs as any).constraint, state);
          const b = constraintToWorld((p2Obj.attrs as any).constraint, state);
          for (let k = 0; k < 3; k++) {
            if (Math.abs(w[k] - (a[k] + b[k]) / 2) > 1e-6) {
              issues.push(`${obj.label}: midpoint sai (axis ${k})`);
            }
          }
        }
      } catch (e) {
        issues.push(`${obj.label}: midpoint check lỗi — ${(e as Error).message}`);
      }
    }

    // Kiểm tra intersectionLinePlane: điểm nằm trên mặt + param t∈[0,1]
    if (c.kind === 'intersectionLinePlane') {
      try {
        const [q1, q2, q3] = planeWorld3(state, c.plane);
        const f = planeFrame(q1, q2, q3);
        if (Math.abs(signedDistance(w, f)) > 1e-6) {
          issues.push(`${obj.label || obj.id}: giao điểm không nằm trên mặt`);
        }
        const dA = signedDistance(ptWorld(state, c.a), f);
        const dB = signedDistance(ptWorld(state, c.b), f);
        const t = dA / (dA - dB);
        if (!Number.isFinite(t) || t < -1e-6 || t > 1 + 1e-6) {
          issues.push(`${obj.label || obj.id}: giao điểm ngoài cạnh (t=${t})`);
        }
      } catch (e) {
        issues.push(`${obj.label || obj.id}: intersectionLinePlane check lỗi — ${(e as Error).message}`);
      }
    }

    // Kiểm tra perpFootPlane: chân ⊥ nằm trên mặt + (foot−from) ∥ pháp tuyến
    if (c.kind === 'perpFootPlane') {
      try {
        const [q1, q2, q3] = planeWorld3(state, c.plane);
        const f = planeFrame(q1, q2, q3);
        if (Math.abs(signedDistance(w, f)) > 1e-6) {
          issues.push(`${obj.label || obj.id}: chân ⊥ không nằm trên mặt`);
        }
        const from = ptWorld(state, c.from);
        const d: [number, number, number] = [w[0] - from[0], w[1] - from[1], w[2] - from[2]];
        const cr: [number, number, number] = [
          d[1] * f.normal[2] - d[2] * f.normal[1],
          d[2] * f.normal[0] - d[0] * f.normal[2],
          d[0] * f.normal[1] - d[1] * f.normal[0],
        ];
        if (Math.hypot(cr[0], cr[1], cr[2]) > 1e-6) {
          issues.push(`${obj.label || obj.id}: đoạn ⊥ không song song pháp tuyến`);
        }
      } catch (e) {
        issues.push(`${obj.label || obj.id}: perpFootPlane check lỗi — ${(e as Error).message}`);
      }
    }

    // Kiểm tra perpFootLine: (foot−from)·(b−a) ≈ 0 + chân nằm trên đường AB
    if (c.kind === 'perpFootLine') {
      try {
        const A = ptWorld(state, c.a);
        const B = ptWorld(state, c.b);
        const from = ptWorld(state, c.from);
        const ab: [number, number, number] = [B[0] - A[0], B[1] - A[1], B[2] - A[2]];
        const fh: [number, number, number] = [w[0] - from[0], w[1] - from[1], w[2] - from[2]];
        const perpDot = fh[0] * ab[0] + fh[1] * ab[1] + fh[2] * ab[2];
        if (Math.abs(perpDot) > 1e-6) {
          issues.push(`${obj.label || obj.id}: chân ⊥ trên đường không vuông góc`);
        }
        // Kiểm tra collinearity: (w−A) × (b−a) ≈ 0 (chân phải nằm trên đường AB)
        const wa: [number, number, number] = [w[0] - A[0], w[1] - A[1], w[2] - A[2]];
        const cr: [number, number, number] = [
          wa[1] * ab[2] - wa[2] * ab[1],
          wa[2] * ab[0] - wa[0] * ab[2],
          wa[0] * ab[1] - wa[1] * ab[0],
        ];
        if (Math.hypot(cr[0], cr[1], cr[2]) > 1e-6) {
          issues.push(`${obj.label || obj.id}: chân ⊥ không nằm trên đường`);
        }
      } catch (e) {
        issues.push(`${obj.label || obj.id}: perpFootLine check lỗi — ${(e as Error).message}`);
      }
    }

    // Kiểm tra circumsphereCenter: tâm cách đều mọi đỉnh
    if (c.kind === 'circumsphereCenter') {
      try {
        const P = (c.vertices as string[]).map((id) => ptWorld(state, id));
        if (P.length >= 2) {
          // Bound sanity: đỉnh near-coplanar → solve3 ra tâm khổng lồ (radii spread lọt
          // tol tương đối). Canonical layout luôn trong [-3,3]³ ⟹ tâm hợp lệ |coord|≲5.
          if (!w.every((n) => Math.abs(n) < 1e3)) {
            issues.push(`${obj.label || obj.id}: tâm mặt cầu ngoài khung hợp lệ`);
          }
          const r0 = Math.hypot(w[0] - P[0][0], w[1] - P[0][1], w[2] - P[0][2]);
          const tol = 1e-6 * Math.max(1, r0);
          for (const p of P) {
            const ri = Math.hypot(w[0] - p[0], w[1] - p[1], w[2] - p[2]);
            if (Math.abs(ri - r0) > tol) { issues.push(`${obj.label || obj.id}: tâm mặt cầu không cách đều đỉnh`); break; }
          }
        }
      } catch (e) {
        issues.push(`${obj.label || obj.id}: circumsphereCenter check lỗi — ${(e as Error).message}`);
      }
    }

    // Kiểm pyramidInsphereCenter: tâm trên trục chóp (collinear apex-G-tâm) + cách đều đáy/mặt bên
    if (c.kind === 'pyramidInsphereCenter') {
      try {
        const S = ptWorld(state, c.apex);
        const base = (c.vertices as string[]).map((id) => ptWorld(state, id));
        if (base.length >= 3) {
          const G: Vec3 = [0, 0, 0];
          for (const p of base) { G[0] += p[0]; G[1] += p[1]; G[2] += p[2]; }
          G[0] /= base.length; G[1] /= base.length; G[2] /= base.length;
          const pg: Vec3 = [w[0] - G[0], w[1] - G[1], w[2] - G[2]];
          const sg: Vec3 = [S[0] - G[0], S[1] - G[1], S[2] - G[2]];
          const cr: Vec3 = [pg[1] * sg[2] - pg[2] * sg[1], pg[2] * sg[0] - pg[0] * sg[2], pg[0] * sg[1] - pg[1] * sg[0]];
          if (Math.hypot(cr[0], cr[1], cr[2]) > 1e-6) issues.push(`${obj.label || obj.id}: tâm cầu nội tiếp không trên trục chóp`);
          const fb = planeFrame(base[0], base[1], base[2]);
          const dBase = Math.abs(signedDistance(w, fb));
          for (let i = 0; i < base.length; i++) {
            const lf = planeFrame(S, base[i], base[(i + 1) % base.length]);
            if (Math.abs(Math.abs(signedDistance(w, lf)) - dBase) > 1e-6 * Math.max(1, dBase)) {
              issues.push(`${obj.label || obj.id}: mặt cầu nội tiếp chóp không tiếp xúc đều đáy/mặt bên`); break;
            }
          }
        }
      } catch (e) {
        issues.push(`${obj.label || obj.id}: pyramidInsphereCenter check lỗi — ${(e as Error).message}`);
      }
    }

    // Kiểm faceCircumcenter: trong mặt + cách đều 3 đỉnh
    if (c.kind === 'faceCircumcenter') {
      try {
        const P = (c.vertices as string[]).map((id) => ptWorld(state, id));
        if (P.length >= 3) {
          const f = planeFrame(P[0], P[1], P[2]);
          if (Math.abs(signedDistance(w, f)) > 1e-6) issues.push(`${obj.label || obj.id}: tâm ngoại tiếp không nằm trên mặt`);
          const r0 = Math.hypot(w[0] - P[0][0], w[1] - P[0][1], w[2] - P[0][2]);
          const tol = 1e-6 * Math.max(1, r0);
          for (const p of P) {
            if (Math.abs(Math.hypot(w[0] - p[0], w[1] - p[1], w[2] - p[2]) - r0) > tol) {
              issues.push(`${obj.label || obj.id}: tâm ngoại tiếp không cách đều đỉnh`); break;
            }
          }
        }
      } catch (e) {
        issues.push(`${obj.label || obj.id}: faceCircumcenter check lỗi — ${(e as Error).message}`);
      }
    }

    // Kiểm pointAboveFace: w−base ∥ pháp tuyến mặt (trên trục ⊥ mặt) + |w−base| = dist(apex, mặt-phẳng)
    if (c.kind === 'pointAboveFace') {
      try {
        const G = ptWorld(state, c.base);
        const P = (c.vertices as string[]).map((id) => ptWorld(state, id));
        const S = ptWorld(state, c.apex);
        if (P.length >= 3) {
          const f = planeFrame(P[0], P[1], P[2]);
          const d: Vec3 = [w[0] - G[0], w[1] - G[1], w[2] - G[2]];
          const cx: Vec3 = [
            d[1] * f.normal[2] - d[2] * f.normal[1],
            d[2] * f.normal[0] - d[0] * f.normal[2],
            d[0] * f.normal[1] - d[1] * f.normal[0],
          ];
          const dlen = Math.hypot(d[0], d[1], d[2]);
          if (Math.hypot(cx[0], cx[1], cx[2]) > 1e-6 * Math.max(1, dlen)) {
            issues.push(`${obj.label || obj.id}: pointAboveFace không trên trục ⊥ mặt`);
          }
          const hExp = Math.abs(signedDistance(S, f));
          if (Math.abs(dlen - hExp) > 1e-6 * Math.max(1, hExp)) {
            issues.push(`${obj.label || obj.id}: pointAboveFace sai chiều cao`);
          }
        }
      } catch (e) {
        issues.push(`${obj.label || obj.id}: pointAboveFace check lỗi — ${(e as Error).message}`);
      }
    }
  }

  // Kiểm tra sphere3d: bán kính = |surface − center| hữu hạn > 0
  for (const obj of Object.values(state.objects)) {
    if (obj.kind !== 'sphere3d') continue;
    try {
      const a = obj.attrs as any;
      const center = ptWorld(state, a.center);
      const surface = ptWorld(state, a.surfacePoint);
      const R = Math.hypot(surface[0] - center[0], surface[1] - center[1], surface[2] - center[2]);
      if (!Number.isFinite(R) || R <= 1e-9) issues.push(`${obj.label || obj.id}: mặt cầu bán kính ≤ 0`);
    } catch (e) {
      issues.push(`${obj.label || obj.id}: sphere3d check lỗi — ${(e as Error).message}`);
    }
  }

  // Kiểm tra cone3d: radius>0 + trục (apex−baseCenter) không suy biến
  for (const obj of Object.values(state.objects)) {
    if (obj.kind !== 'cone3d') continue;
    try {
      const a = obj.attrs as any;
      const bc = ptWorld(state, a.baseCenter);
      const ap = ptWorld(state, a.apex);
      const h = Math.hypot(ap[0] - bc[0], ap[1] - bc[1], ap[2] - bc[2]);
      if (!(a.radius > 0) || !Number.isFinite(h) || h <= 1e-9) issues.push(`${obj.label || obj.id}: khối nón suy biến`);
    } catch (e) {
      issues.push(`${obj.label || obj.id}: cone3d check lỗi — ${(e as Error).message}`);
    }
  }

  // Kiểm tra cylinder3d: radius>0 + trục (topCenter−baseCenter) không suy biến
  for (const obj of Object.values(state.objects)) {
    if (obj.kind !== 'cylinder3d') continue;
    try {
      const a = obj.attrs as any;
      const bc = ptWorld(state, a.baseCenter);
      const tc = ptWorld(state, a.topCenter);
      const h = Math.hypot(tc[0] - bc[0], tc[1] - bc[1], tc[2] - bc[2]);
      if (!(a.radius > 0) || !Number.isFinite(h) || h <= 1e-9) issues.push(`${obj.label || obj.id}: khối trụ suy biến`);
    } catch (e) {
      issues.push(`${obj.label || obj.id}: cylinder3d check lỗi — ${(e as Error).message}`);
    }
  }

  // Kiểm tra polygon3d: ≥3 đỉnh + đồng phẳng
  for (const obj of Object.values(state.objects)) {
    if (obj.kind !== 'polygon3d') continue;
    const vids = (obj.attrs as any).vertices as string[];
    if (!vids || vids.length < 3) { issues.push(`${obj.label || obj.id}: đa giác < 3 đỉnh`); continue; }
    try {
      const ws = vids.map((id) => ptWorld(state, id));
      // Prefer the cutting plane frame when available (avoids near-collinear first-3-vertex degenerate normal).
      let f: ReturnType<typeof planeFrame>;
      const ilpVertex = vids.find((id) => {
        const c = (state.objects[id]?.attrs as any)?.constraint;
        return c?.kind === 'intersectionLinePlane';
      });
      if (ilpVertex) {
        const cPlane = ((state.objects[ilpVertex].attrs as any).constraint as { plane: string }).plane;
        const [q1, q2, q3] = planeWorld3(state, cPlane);
        f = planeFrame(q1, q2, q3);
      } else {
        f = planeFrame(ws[0], ws[1], ws[2]);
      }
      for (const wv of ws) {
        if (Math.abs(signedDistance(wv, f)) > 1e-5) { issues.push(`${obj.label || obj.id}: đa giác không phẳng`); break; }
      }
    } catch (e) {
      issues.push(`${obj.label || obj.id}: polygon check lỗi — ${(e as Error).message}`);
    }
  }

  return { ok: issues.length === 0, issues };
}
