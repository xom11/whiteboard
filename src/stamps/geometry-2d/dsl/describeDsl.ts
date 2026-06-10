// src/stamps/geometry-2d/dsl/describeDsl.ts
//
// DSL-style description tiếng Việt cho tab Đối tượng (issue #41). Reuse
// serializeObject để đảm bảo mô tả khớp với DSL hỗ trợ; out-of-DSL object
// fallback về `kindDef.describe()` qua getKind, kèm suffix "(không hỗ trợ DSL)"
// để rõ ràng cho user.

import type { SceneObject, State } from '../../../core/scene/types';
import { getKind } from '../../../core/scene/registry';
import type { DslPointT, DslShapeT } from './schema';
import { serializeObject } from './serialize';

function describeEntity(e: DslPointT | DslShapeT): string {
  switch (e.kind) {
    case 'free':         return `${e.name} = (${e.x}, ${e.y})`;
    case 'midpoint':     return `${e.name} = trung điểm ${e.p1}${e.p2}`;
    case 'onSegment':    return `${e.name} ∈ đoạn ${e.segmentId} (t = ${e.t})`;
    case 'onLine':       return `${e.name} ∈ đường ${e.lineId} (t = ${e.t})`;
    case 'onCircle':     return `${e.name} ∈ đường tròn ${e.circleId} (θ = ${e.theta})`;
    case 'perpFoot':     return `${e.name} = chân vuông góc từ ${e.from} xuống ${e.onLine}`;
    case 'circumcenter': return `${e.name} = tâm ngoại tiếp ${e.vertices.join('')}`;
    case 'incenter':     return `${e.name} = tâm nội tiếp ${e.vertices.join('')}`;
    case 'centroid':     return `${e.name} = trọng tâm ${e.vertices.join('')}`;
    case 'orthocenter':  return `${e.name} = trực tâm ${e.vertices.join('')}`;
    case 'intersection': {
      const branch = 'branch' in e && e.branch !== undefined ? ` (nhánh ${e.branch})` : '';
      return `${e.name} = ${e.ref1} ∩ ${e.ref2}${branch}`;
    }
    case 'segment':       return `${e.name} = đoạn ${e.p1}${e.p2}`;
    case 'line':          return `${e.name} = đường thẳng ${e.p1}${e.p2}`;
    case 'ray':           return `${e.name} = tia ${e.origin}${e.through}`;
    case 'polygon':       return `${e.name} = đa giác ${e.vertices.join('')}`;
    case 'perpendicular': return `${e.name} ⟂ ${e.toLine} qua ${e.throughPoint}`;
    case 'parallel':      return `${e.name} ∥ ${e.toLine} qua ${e.throughPoint}`;
    case 'perpBisector':  return `${e.name} = trung trực ${e.p1}${e.p2}`;
    case 'angleBisector': return `${e.name} = phân giác ∠${e.p1}${e.vertex}${e.p2}`;
    case 'lineThrough':   return `${e.name} = đường qua ${e.points.join('')}`;
    case 'radicalAxis':   return `${e.name} = trục đẳng phương ${e.circle1} & ${e.circle2}`;
    case 'tangent': {
      const branch = 'branch' in e && e.branch !== undefined ? ` (nhánh ${e.branch})` : '';
      return `${e.name} = tiếp tuyến ${e.toCircle} qua ${e.throughPoint}${branch}`;
    }
    case 'circleCP':      return `${e.name} = (${e.center}; ${e.center}${e.surfacePoint})`;
    case 'circle3':       return `${e.name} = đường tròn qua ${e.p1}${e.p2}${e.p3}`;
    case 'circleDiameter': return `${e.name} = đường tròn đường kính ${e.p1}${e.p2}`;
    // NEW Tier 4+5
    case 'secondIntersection':  return `${e.name} = giao thứ hai của ${e.line} và ${e.circle} (khác ${e.other})`;
    case 'circleIntersection':  return `${e.name} = giao ${e.c1} ∩ ${e.c2} (nhánh ${e.which})`;
    case 'circleSecondIntersection': return `${e.name} = giao thứ hai ${e.c1} ∩ ${e.c2} (khác ${e.exclude})`;
    case 'tangencyPoint':       return `${e.name} = tiếp điểm của ${e.circle} trên ${e.onLine}`;
    case 'tangentPointExt':     return `${e.name} = tiếp điểm từ ${e.from} lên ${e.circle} (nhánh ${e.which})`;
    case 'circleCR':            return `${e.name} = đường tròn (${e.center}; r=${e.radius})`;
    case 'incircle':            return `${e.name} = đường tròn nội tiếp ${e.vertices.join('')}`;
    case 'excircle':            return `${e.name} = đường tròn bàng tiếp ${e.vertices.join('')} đối diện ${e.opposite}`;
    // Cụm A
    case 'arcMidpoint':   return `${e.name} = trung điểm cung ${e.a}${e.b} (${e.containing ? 'chứa' : 'không chứa'} ${e.containing ?? e.notContaining}) trên ${e.circle}`;
    case 'excenter':      return `${e.name} = tâm bàng tiếp ${e.vertices.join('')} đối diện ${e.opposite}`;
    case 'reflectPoint':  return `${e.name} = đối xứng ${e.of} qua điểm ${e.through}`;
    case 'reflectLine':   return `${e.name} = đối xứng ${e.of} qua đường ${e.through}`;
    // Cụm B
    case 'pointAtDistance': {
      const d = e.distance;
      const distStr = d.kind === 'circleRadius' ? `r(${d.circle})`
        : d.kind === 'segmentLength' ? `|${d.p1}${d.p2}|`
        : `${d.value}`;
      return `${e.name} = điểm trên tia ${e.from}${e.through} cách ${e.through} một khoảng ${distStr}`;
    }
    case 'onPerpBisector': return `${e.name} = điểm trên trung trực ${e.p1}${e.p2}`;
    default: {
      const _exhaust: never = e;
      void _exhaust;
      return '';
    }
  }
}

/**
 * Mô tả DSL-style cho 1 SceneObject. Dùng cho `ObjectListPanel.renderRow`.
 *
 * - Object trong miền DSL → mô tả Việt ngắn gọn (vd "M = trung điểm BC").
 * - Object ngoài miền DSL → fallback `kindDef.describe()` + suffix
 *   "(không hỗ trợ DSL)" để user biết object này không export sang DSL được.
 */
export function describeDsl(obj: SceneObject, state: State): string {
  const r = serializeObject(obj, state);
  if (r.ok) return describeEntity(r.entity);

  // Fallback — dùng describe từ scene kind registry. Mặc định "(không hỗ trợ DSL)"
  // để user thấy rõ giới hạn.
  let base: string;
  try {
    base = getKind(obj.kind).describe(obj, state);
  } catch {
    base = `${obj.kind} ${obj.label}`;
  }
  return `${base} (không hỗ trợ DSL)`;
}
