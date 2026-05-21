// Pure preview-shape factory cho 2D editor — không component state, không
// React. Dùng bởi MiniBoard.tsx `refreshPreview` mỗi khi user thay đổi
// pending picks. Mirror legacy live-preview (commit ce78521), tách khỏi
// MiniBoard.tsx để giảm size component file.

import { safeJsx } from '../../shared/safeJsx';
import { objKind, type ToolDef } from './tools';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JxgObj = any;

const PREVIEW_STYLE: Record<string, unknown> = {
  strokeColor: '#3b82f6',
  strokeWidth: 1.5,
  strokeOpacity: 0.65,
  dash: 2,
  fixed: true,
  highlight: false,
  withLabel: false,
};

const CIRCLE_PREVIEW_STYLE: Record<string, unknown> = {
  ...PREVIEW_STYLE,
  fillColor: 'none',
  fillOpacity: 0,
};

/**
 * Build transient JSXGraph object để live-preview shape user đang dựng. Trả
 * `null` khi:
 *   - Tool không phải shape-tool (vd select/move).
 *   - Số pick chưa đủ cho preview cụ thể.
 *   - Pick types không hợp lệ với tool (vd perpendicular cần line input).
 *
 * Tất cả create calls wrap trong safeJsx để swallow exception từ JSXGraph
 * khi state stale (vd board destroyed giữa chừng).
 */
export function buildPreviewShape(
  board: JxgObj,
  toolDef: ToolDef,
  picks: JxgObj[],
  phantom: JxgObj,
): JxgObj {
  if (!board) return null;
  return safeJsx<JxgObj>('preview.buildPreviewShape', () => {
    switch (toolDef.key) {
      case 'segment':
      case 'midpoint':
      case 'distance':
        return board.create('segment', [picks[0], phantom], PREVIEW_STYLE);
      case 'line':
        return board.create('line', [picks[0], phantom], PREVIEW_STYLE);
      case 'ray':
        return board.create('line', [picks[0], phantom], {
          ...PREVIEW_STYLE,
          straightFirst: false,
          straightLast: true,
        });
      case 'vector':
        return board.create('arrow', [picks[0], phantom], PREVIEW_STYLE);
      case 'circleCenter':
        return board.create('circle', [picks[0], phantom], CIRCLE_PREVIEW_STYLE);
      case 'circle3':
        if (picks.length === 1) return board.create('circle', [picks[0], phantom], CIRCLE_PREVIEW_STYLE);
        if (picks.length === 2) {
          return board.create('circumcircle', [picks[0], picks[1], phantom], CIRCLE_PREVIEW_STYLE);
        }
        return null;
      case 'angle':
        if (picks.length === 1) return board.create('segment', [picks[0], phantom], PREVIEW_STYLE);
        if (picks.length === 2) {
          return board.create('angle', [picks[0], picks[1], phantom], {
            ...PREVIEW_STYLE,
            radius: 1,
            fillColor: '#22c55e',
            fillOpacity: 0.15,
          });
        }
        return null;
      case 'perpBisector':
        return board.create('segment', [picks[0], phantom], PREVIEW_STYLE);
      case 'angleBisector':
        if (picks.length === 1) return board.create('segment', [picks[0], phantom], PREVIEW_STYLE);
        if (picks.length === 2) return board.create('bisector', [picks[0], picks[1], phantom], PREVIEW_STYLE);
        return null;
      case 'perpendicular':
      case 'parallel':
      case 'tangent': {
        if (picks.length !== 1) return null;
        const k = objKind(picks[0]);
        if (k === 'line' && toolDef.key !== 'tangent') {
          return board.create(toolDef.key, [picks[0], phantom], PREVIEW_STYLE);
        }
        if (k === 'circle' && toolDef.key === 'tangent') {
          const glider = board.create('glider', [phantom.X(), phantom.Y(), picks[0]], {
            visible: false,
            withLabel: false,
          });
          return board.create('tangent', [glider], PREVIEW_STYLE);
        }
        return null;
      }
      default:
        return null;
    }
  }, null);
}

/**
 * Tạo phantom point (invisible, fixed) làm endpoint kéo theo cursor cho
 * live-preview. Trả `null` nếu board không sẵn sàng (mock/test path).
 */
export function createPhantomPoint(board: JxgObj): JxgObj {
  if (!board) return null;
  return safeJsx<JxgObj>('preview.createPhantomPoint', () => board.create('point', [0, 0], {
    visible: false,
    fixed: true,
    withLabel: false,
    name: '',
  }), null);
}
