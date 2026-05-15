// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type JxgObj = any;

export type DefKind = 'point' | 'segment' | 'line' | 'ray' | 'arrow' | 'circleCenter' | 'circle3';

export interface DefiningPointsResult {
  kind: DefKind;
  points: JxgObj[];
  attrs: Record<string, unknown>;
}

const LINE_LIKE = new Set(['line', 'segment', 'arrow']);

function copyVisAttrs(obj: JxgObj): Record<string, unknown> {
  const v = obj?.visProp ?? {};
  const pick = (k: string) => v?.[k];
  const out: Record<string, unknown> = {};
  const mapping: Array<[string, string]> = [
    ['strokecolor', 'strokeColor'],
    ['strokewidth', 'strokeWidth'],
    ['strokeopacity', 'strokeOpacity'],
    ['dash', 'dash'],
    ['fillcolor', 'fillColor'],
    ['fillopacity', 'fillOpacity'],
  ];
  for (const [from, to] of mapping) {
    const val = pick(from);
    if (val !== undefined) out[to] = val;
  }
  return out;
}

export function getDefiningPoints(obj: JxgObj): DefiningPointsResult | null {
  if (!obj) return null;
  const e = (obj.elType ?? obj.type ?? '').toString().toLowerCase();
  if (e === 'point' || e === 'glider' || e === 'midpoint') {
    return { kind: 'point', points: [obj], attrs: copyVisAttrs(obj) };
  }
  if (LINE_LIKE.has(e) && obj.point1 && obj.point2) {
    const kind: DefKind = e === 'segment' ? 'segment' : e === 'arrow' ? 'arrow' : 'line';
    return { kind, points: [obj.point1, obj.point2], attrs: copyVisAttrs(obj) };
  }
  if (e === 'circle' && obj.center && obj.point2) {
    return { kind: 'circleCenter', points: [obj.center, obj.point2], attrs: copyVisAttrs(obj) };
  }
  if (e === 'circumcircle' && obj.point1 && obj.point2 && obj.point3) {
    return {
      kind: 'circle3',
      points: [obj.point1, obj.point2, obj.point3],
      attrs: copyVisAttrs(obj),
    };
  }
  return null;
}

export type TransformInput =
  | { kind: 'translate'; vectorPoints: [JxgObj, JxgObj] }
  | { kind: 'rotate'; center: JxgObj; angleDeg: number }
  | { kind: 'reflectLine'; line: JxgObj }
  | { kind: 'reflectPoint'; center: JxgObj }
  | { kind: 'dilate'; center: JxgObj; k: number };

export interface TransformSpec {
  params: unknown[];
  attrs: { type: 'translate' | 'rotate' | 'reflect' | 'scale' };
  /**
   * Khi `chain` được set, finalizeTransformCreate dựng từng transform trong chain
   * (theo thứ tự) rồi pass mảng vào `board.create('point', [src, [t1, t2, t3]])`.
   * Dùng cho `dilate` (scale-quanh-điểm) vì JSXGraph 'scale' không nhận center.
   */
  chain?: Array<{ params: unknown[]; attrs: { type: 'translate' | 'rotate' | 'reflect' | 'scale' } }>;
}

export function buildTransformSpec(input: TransformInput): TransformSpec {
  switch (input.kind) {
    case 'translate': {
      // Literal dx/dy (không phải callback) để serialize qua JSON.stringify được.
      // Trade-off: transformed object không cập nhật khi user kéo điểm vector — chấp nhận.
      const [a, b] = input.vectorPoints;
      const dx = b.X() - a.X();
      const dy = b.Y() - a.Y();
      return { params: [dx, dy], attrs: { type: 'translate' } };
    }
    case 'rotate':
      return {
        params: [(input.angleDeg * Math.PI) / 180, input.center],
        attrs: { type: 'rotate' },
      };
    case 'reflectLine':
      return { params: [input.line], attrs: { type: 'reflect' } };
    case 'reflectPoint':
      // JSXGraph 'scale' chỉ nhận 2 tham số (sx, sy) và scale quanh gốc toạ độ —
      // tham số center thứ 3 bị lờ → trước đây sai. Đối xứng qua điểm = quay 180°
      // quanh điểm đó. Dùng 'rotate' (params [angle, center]) để chuẩn.
      return { params: [Math.PI, input.center], attrs: { type: 'rotate' } };
    case 'dilate':
      // JSXGraph 'scale' chỉ nhận đúng 2 tham số (sx, sy) và scale quanh gốc toạ độ —
      // tham số center thứ 3 làm constructor throw. Dilate quanh điểm c bằng tỷ số k
      // = compose 3 phép: T(-c) → S(k,k) → T(+c). Sinh ra chain (mảng spec) thay vì
      // 1 spec đơn; consumer (finalizeTransformCreate) tự nhận biết.
      return {
        params: [],
        attrs: { type: 'scale' },
        chain: [
          { params: [-input.center.X(), -input.center.Y()], attrs: { type: 'translate' as const } },
          { params: [input.k, input.k], attrs: { type: 'scale' as const } },
          { params: [input.center.X(), input.center.Y()], attrs: { type: 'translate' as const } },
        ],
      };
  }
}
