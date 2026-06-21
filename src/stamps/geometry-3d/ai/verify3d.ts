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
