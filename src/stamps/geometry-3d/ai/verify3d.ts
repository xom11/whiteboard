import type { State } from '../../../core/scene';
import { constraintToWorld } from '../../../core/scene/kinds/constraint3d-math';

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
  }

  return { ok: issues.length === 0, issues };
}
