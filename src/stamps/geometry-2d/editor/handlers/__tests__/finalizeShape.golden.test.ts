// finalizeShape.golden.test.ts
//
// Lưới an toàn Mức 3 (issue #45): đóng băng dispatched actions của finalizeShape
// cho từng tool (1 scenario/tool ~44 tool). Vị trí pick chọn sao cho nhánh hình
// học xác định (tangent on/outside/inside; arc3 non-collinear; pointOn onCircle;
// intersect lineLine/lineCircle/circleCircle). Refactor Phase 5 PHẢI giữ snapshot.
import { finalizeShape } from '../finalizeShape';
import type { HandlerCtx } from '../ctx';
import type { ToolDef } from '../../tools';

type Pick = { id: string; cls: 1 | 2 | 3; x?: number; y?: number; center?: { x: number; y: number; r: number } };

function mkCtx(picks: Pick[]): { ctx: HandlerCtx; dispatched: any[] } {
  const dispatched: any[] = [];
  const jxgByPick = picks.map((p) => {
    const o: any = { elementClass: p.cls, X: () => p.x ?? 0, Y: () => p.y ?? 0 };
    if (p.center) (o.center = { X: () => p.center!.x, Y: () => p.center!.y }), (o.Radius = () => p.center!.r);
    return o;
  });
  const posById: Record<string, { x: number; y: number }> = {};
  picks.forEach((p) => {
    posById[p.id] = { x: p.x ?? 0, y: p.y ?? 0 };
  });
  const ctx = {
    pendingRef: { current: jxgByPick },
    pendingIdsRef: { current: picks.map((p) => p.id) },
    store: {
      getState: () => ({ counter: 0, objects: {}, order: [], meta: { domain: '2d', version: 1 } }),
      dispatch: (a: any) => dispatched.push(a),
    },
    nextLabel: (kind: string) => `${kind}_label`,
    jxgFromSceneId: (id: string) => {
      const p = posById[id];
      return p ? { X: () => p.x, Y: () => p.y } : null;
    },
    flashWarn: jest.fn(),
    refreshPreview: jest.fn(),
    findNearestPointJxg: jest.fn(),
    emitTransform: jest.fn(),
    setPendingCount: jest.fn(),
    clearPending: jest.fn(),
    pendingTransformRef: { current: null },
    jxgIdToSceneId: jest.fn(),
    toast: jest.fn(),
  } as unknown as HandlerCtx;
  return { ctx, dispatched };
}

function td(key: string, extra: Partial<ToolDef> = {}): ToolDef {
  return { key, label: '', hint: '', icon: null as any, group: 'construct', needs: 2, ...extra } as ToolDef;
}

// Scenario table — 1 entry/tool. Vị trí chọn sao cho nhánh hình học xác định
// (tangent outside/on/inside; arc3 non-collinear; parametric đọc X/Y).
const SCENARIOS: { name: string; picks: Pick[]; tool: ToolDef; clickXY?: { x: number; y: number } }[] = [
  { name: 'segment', picks: [{ id: 'A', cls: 1 }, { id: 'B', cls: 1 }], tool: td('segment') },
  { name: 'line', picks: [{ id: 'A', cls: 1 }, { id: 'B', cls: 1 }], tool: td('line') },
  { name: 'perpendicular', picks: [{ id: 'A', cls: 1 }, { id: 'l1', cls: 2 }], tool: td('perpendicular', { accepts: ['point', 'line'] }) },
  { name: 'parallel', picks: [{ id: 'A', cls: 1 }, { id: 'l1', cls: 2 }], tool: td('parallel', { accepts: ['point', 'line'] }) },
  { name: 'perpBisector', picks: [{ id: 'A', cls: 1 }, { id: 'B', cls: 1 }], tool: td('perpBisector') },
  { name: 'angleBisector-3pt', picks: [{ id: 'A', cls: 1 }, { id: 'V', cls: 1 }, { id: 'B', cls: 1 }], tool: td('angleBisector', { needs: 3 }) },
  { name: 'angleBisector-2line', picks: [{ id: 'L1', cls: 2 }, { id: 'L2', cls: 2 }], tool: td('angleBisector', { needs: 3 }) },
  { name: 'tangent-on', picks: [{ id: 'P', cls: 1, x: 5, y: 0 }, { id: 'O', cls: 3, center: { x: 0, y: 0, r: 5 } }], tool: td('tangent') },
  { name: 'tangent-outside', picks: [{ id: 'P', cls: 1, x: 10, y: 0 }, { id: 'O', cls: 3, center: { x: 0, y: 0, r: 5 } }], tool: td('tangent') },
  { name: 'tangent-inside', picks: [{ id: 'P', cls: 1, x: 1, y: 0 }, { id: 'O', cls: 3, center: { x: 0, y: 0, r: 5 } }], tool: td('tangent') },
  { name: 'ray', picks: [{ id: 'A', cls: 1 }, { id: 'B', cls: 1 }], tool: td('ray') },
  { name: 'vector', picks: [{ id: 'A', cls: 1 }, { id: 'B', cls: 1 }], tool: td('vector') },
  { name: 'circleCenter', picks: [{ id: 'O', cls: 1 }, { id: 'A', cls: 1 }], tool: td('circleCenter') },
  { name: 'circle3', picks: [{ id: 'A', cls: 1 }, { id: 'B', cls: 1 }, { id: 'C', cls: 1 }], tool: td('circle3', { needs: 3 }) },
  { name: 'semicircle', picks: [{ id: 'A', cls: 1 }, { id: 'B', cls: 1 }], tool: td('semicircle') },
  { name: 'arcCenter', picks: [{ id: 'O', cls: 1 }, { id: 'A', cls: 1 }, { id: 'B', cls: 1 }], tool: td('arcCenter', { needs: 3 }) },
  { name: 'arc3', picks: [{ id: 'A', cls: 1, x: 0, y: 0 }, { id: 'B', cls: 1, x: 1, y: 1 }, { id: 'C', cls: 1, x: 2, y: 0 }], tool: td('arc3', { needs: 3 }) },
  { name: 'sectorCenter', picks: [{ id: 'O', cls: 1 }, { id: 'A', cls: 1 }, { id: 'B', cls: 1 }], tool: td('sectorCenter', { needs: 3 }) },
  { name: 'midpoint', picks: [{ id: 'A', cls: 1 }, { id: 'B', cls: 1 }], tool: td('midpoint') },
  { name: 'perpFoot', picks: [{ id: 'A', cls: 1 }, { id: 'l1', cls: 2 }], tool: td('perpFoot', { accepts: ['point', 'line'] }) },
  { name: 'centroid', picks: [{ id: 'A', cls: 1 }, { id: 'B', cls: 1 }, { id: 'C', cls: 1 }], tool: td('centroid', { needs: 3 }) },
  { name: 'circumcenter', picks: [{ id: 'A', cls: 1 }, { id: 'B', cls: 1 }, { id: 'C', cls: 1 }], tool: td('circumcenter', { needs: 3 }) },
  { name: 'incenter', picks: [{ id: 'A', cls: 1 }, { id: 'B', cls: 1 }, { id: 'C', cls: 1 }], tool: td('incenter', { needs: 3 }) },
  { name: 'orthocenter', picks: [{ id: 'A', cls: 1 }, { id: 'B', cls: 1 }, { id: 'C', cls: 1 }], tool: td('orthocenter', { needs: 3 }) },
  { name: 'angle', picks: [{ id: 'A', cls: 1 }, { id: 'V', cls: 1 }, { id: 'B', cls: 1 }], tool: td('angle', { needs: 3 }) },
  { name: 'distance', picks: [{ id: 'A', cls: 1 }, { id: 'B', cls: 1 }], tool: td('distance') },
  { name: 'intersect-lineLine', picks: [{ id: 'l1', cls: 2 }, { id: 'l2', cls: 2 }], tool: td('intersect') },
  { name: 'intersect-lineCircle', picks: [{ id: 'l1', cls: 2 }, { id: 'O', cls: 3 }], tool: td('intersect') },
  { name: 'intersect-circleCircle', picks: [{ id: 'O1', cls: 3 }, { id: 'O2', cls: 3 }], tool: td('intersect') },
  { name: 'square', picks: [{ id: 'A', cls: 1 }, { id: 'B', cls: 1 }], tool: td('square') },
  { name: 'rectangle', picks: [{ id: 'A', cls: 1, x: 0, y: 0 }, { id: 'B', cls: 1, x: 4, y: 0 }, { id: 'C', cls: 1, x: 4, y: 3 }], tool: td('rectangle', { needs: 3 }) },
  { name: 'rhombus', picks: [{ id: 'A', cls: 1, x: 0, y: 0 }, { id: 'B', cls: 1, x: 4, y: 0 }, { id: 'C', cls: 1, x: 6, y: 2 }], tool: td('rhombus', { needs: 3 }) },
  { name: 'parallelogram', picks: [{ id: 'A', cls: 1 }, { id: 'B', cls: 1 }, { id: 'C', cls: 1 }], tool: td('parallelogram', { needs: 3 }) },
  { name: 'isoTrapezoid', picks: [{ id: 'A', cls: 1 }, { id: 'B', cls: 1 }, { id: 'C', cls: 1 }], tool: td('isoTrapezoid', { needs: 3 }) },
  { name: 'isoTriangle', picks: [{ id: 'A', cls: 1, x: 0, y: 0 }, { id: 'B', cls: 1, x: 4, y: 0 }, { id: 'C', cls: 1, x: 2, y: 3 }], tool: td('isoTriangle', { needs: 3 }) },
  { name: 'rightTriangle', picks: [{ id: 'R', cls: 1, x: 0, y: 0 }, { id: 'P1', cls: 1, x: 4, y: 0 }, { id: 'P2', cls: 1, x: 0, y: 3 }], tool: td('rightTriangle', { needs: 3 }) },
  { name: 'excenter', picks: [{ id: 'A', cls: 1 }, { id: 'B', cls: 1 }, { id: 'C', cls: 1 }], tool: td('excenter', { needs: 3 }) },
  { name: 'tangencyPoint', picks: [{ id: 'O', cls: 3 }, { id: 'l1', cls: 2 }], tool: td('tangencyPoint', { accepts: ['circle', 'line'] }) },
  { name: 'secondIntersection', picks: [{ id: 'l1', cls: 2 }, { id: 'O', cls: 3 }, { id: 'P', cls: 1 }], tool: td('secondIntersection', { needs: 3 }) },
  { name: 'arcMidpoint', picks: [{ id: 'O', cls: 3 }, { id: 'A', cls: 1 }, { id: 'B', cls: 1 }, { id: 'C', cls: 1 }], tool: td('arcMidpoint', { needs: 4 }) },
  { name: 'circleIntersection', picks: [{ id: 'O1', cls: 3 }, { id: 'O2', cls: 3 }], tool: td('circleIntersection') },
  { name: 'tangentPointExt', picks: [{ id: 'P', cls: 1 }, { id: 'O', cls: 3 }], tool: td('tangentPointExt') },
  { name: 'incircle', picks: [{ id: 'A', cls: 1 }, { id: 'B', cls: 1 }, { id: 'C', cls: 1 }], tool: td('incircle', { needs: 3 }) },
  { name: 'excircle', picks: [{ id: 'A', cls: 1 }, { id: 'B', cls: 1 }, { id: 'C', cls: 1 }], tool: td('excircle', { needs: 3 }) },
  { name: 'pointOn-circle', picks: [{ id: 'O', cls: 3, center: { x: 0, y: 0, r: 5 } }], tool: td('pointOn', { needs: 1 }), clickXY: { x: 5, y: 0 } },
];

describe('finalizeShape — golden (behavior-preserving Mức 3)', () => {
  for (const sc of SCENARIOS) {
    test(sc.name, () => {
      const { ctx, dispatched } = mkCtx(sc.picks);
      finalizeShape(ctx, sc.tool, sc.clickXY);
      expect(dispatched).toMatchSnapshot();
    });
  }
});
